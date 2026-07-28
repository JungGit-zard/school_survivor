// 계정 삭제 오케스트레이션(Google 정책의 "계정 및 데이터 삭제" 요구를 충족).
//
// 순서는 고정이다: 랭킹 엔트리 제거(best-effort) → users/{uid} 문서 삭제(실패 시 중단)
// → Firebase Auth 계정 삭제. Auth를 먼저 지우면 이후 DB 쓰기가 unauthenticated로
// 실패해 데이터가 고아로 남으므로 절대 순서를 바꾸지 않는다.
//
// 한계(숨기지 않는다): 랭킹 엔트리는 "오늘 daily + 이번 주 weekly" 버킷만 지울 수
// 있다. 과거 기간의 periodKey/시즌 ID는 클라이언트가 열거할 방법이 없어(규칙이 list
// 권한을 주지 않음) 삭제되지 않는다 — firebaseRanking.js의 deleteRankingEntriesForUser
// 주석 참조.
import { createFirebaseAuthClient } from './firebaseAuth.js'
import { deleteFirebaseProgressDocument, FirebaseProgressError } from './firebaseProgress.js'
import { deleteRankingEntriesForUser } from './firebaseRanking.js'
import { resetRuntimeRefs } from './refs.js'

export async function deleteAccountAndData(user) {
  if (!user?.uid) {
    return { ok: false, reason: 'unauthenticated', message: '로그인 세션이 없습니다. 다시 로그인한 뒤 시도해 주세요.' }
  }

  // 1) 랭킹 엔트리 제거 — best-effort. 실패해도 다음 단계로 진행하되 결과에 남긴다.
  const ranking = await deleteRankingEntriesForUser(user).catch((error) => ({
    attempted: 0,
    deleted: [],
    failed: [],
    error: getErrorMessage(error),
  }))

  // 2) users/{uid} 문서 삭제 — 실패하면 여기서 중단한다(Auth를 지우지 않는다).
  // 데이터가 남은 채 Auth만 지우면 다음 로그인 없이는 복구 불가능한 고아 데이터가 된다.
  try {
    await deleteFirebaseProgressDocument(user)
  } catch (error) {
    return {
      ok: false,
      reason: classifyProgressDeleteError(error),
      message: getErrorMessage(error),
      ranking,
    }
  }

  // 3) Firebase Auth 계정 삭제.
  let authClient
  try {
    authClient = await createFirebaseAuthClient()
  } catch (error) {
    return { ok: false, reason: 'unknown', message: getErrorMessage(error), ranking }
  }
  if (!authClient?.configured) {
    return { ok: false, reason: 'unknown', message: 'Firebase auth가 설정되지 않았습니다.', ranking }
  }
  try {
    await authClient.deleteAccount()
  } catch (error) {
    return { ok: false, reason: classifyAuthDeleteError(error), message: getErrorMessage(error), ranking }
  }

  // 4) 로컬 런타임 정리 — 기존 리셋 경로를 재사용한다(best-effort, 실패해도 삭제 자체는 성공).
  try {
    resetRuntimeRefs()
  } catch {
    // no-op
  }

  return { ok: true, ranking }
}

// 웹(팝업) 재인증만 구현한다. Capacitor 네이티브 셸에서는 firebaseAuth.js의
// reauthenticateWithGoogle이 그대로 에러를 던지므로 false로 흡수한다(UI는
// "로그아웃 후 재로그인 → 재시도"를 안내해야 한다 — firebaseAuth.js 주석 참조).
export async function reauthenticateForDeletion() {
  try {
    const client = await createFirebaseAuthClient()
    if (!client?.configured) return false
    await client.reauthenticateWithGoogle()
    return true
  } catch {
    return false
  }
}

function classifyProgressDeleteError(error) {
  if (error instanceof FirebaseProgressError && error.code === 'unauthenticated') return 'unauthenticated'
  return 'progressDeleteFailed'
}

function classifyAuthDeleteError(error) {
  const code = typeof error?.code === 'string' ? error.code : ''
  if (code === 'auth/requires-recent-login') return 'reauthRequired'
  if (code === 'auth/user-token-expired' || code === 'auth/invalid-user-token' || code === 'auth/user-mismatch') {
    return 'reauthRequired'
  }
  if (code.startsWith('auth/network') || code === 'unavailable') return 'network'
  return 'unknown'
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message
  return String(error ?? 'Unknown error')
}

// 이용약관 / 개인정보처리방침 동의 기록의 정본 구현.
//
// 동의 기록은 users/{uid}.consent(firebaseProgress.js 런타임의 최상위 형제 노드)에
// 저장되며, 이 파일이 유일한 판단 창구다. 로컬 저장소(localStorage/sessionStorage)는
// 이 프로젝트에서 진행도 데이터에 치명적 오류로 규정되어 있으므로 사용하지 않는다.
//
// 버전 상수는 legalDocuments.js를 단일 출처로 삼는다 — 문서가 개정되어 버전이 오르면
// needsConsent가 자동으로 다시 게이트를 연다.
import { TERMS_VERSION, PRIVACY_VERSION } from './legalDocuments.js'
import {
  isFirebaseProgressHydrated,
  readFirebasePlayerConsent,
  writeFirebasePlayerConsent,
  requestCloudProgressSave,
} from './firebaseProgress.js'

export function needsConsent(user) {
  // 하이드레이트 여부를 모르면 동의 여부도 모른다. 여기서 false를 반환하면 미동의
  // 상태를 "동의 완료"로 오판해 게이트가 조용히 열리지 않고 통과해버린다 — 안전한
  // 쪽(동의 필요)으로 판단한다.
  if (!isFirebaseProgressHydrated(user)) return true

  const consent = safeReadConsent()
  if (!consent) return true

  const termsVersion = Number(consent.terms?.version)
  const privacyVersion = Number(consent.privacy?.version)
  if (!Number.isFinite(termsVersion) || termsVersion < TERMS_VERSION) return true
  if (!Number.isFinite(privacyVersion) || privacyVersion < PRIVACY_VERSION) return true
  return false
}

export async function recordConsent(user) {
  const now = new Date().toISOString()
  const consent = {
    terms: { version: TERMS_VERSION, acceptedAt: now },
    privacy: { version: PRIVACY_VERSION, acceptedAt: now },
  }

  try {
    writeFirebasePlayerConsent(consent)
  } catch {
    return false
  }

  let saved = false
  try {
    saved = await requestCloudProgressSave(user)
  } catch {
    saved = false
  }

  if (saved) return true

  // 원격 저장이 실패한 채로 런타임에 동의 기록을 남기면, 다음 로그인 때는 이미
  // 동의한 것으로 오판되어 다시 묻지 않으면서도 실제로는 저장되지 않은 상태가 된다.
  // 저장 안 된 동의를 저장된 것처럼 남기지 않도록 롤백한다.
  try {
    writeFirebasePlayerConsent(null)
  } catch {
    // 롤백 실패는 무시 — 어차피 하이드레이트가 깨진 상태라 다음 판단은 안전 측(true)이다.
  }
  return false
}

export function readConsent(user) {
  if (!isFirebaseProgressHydrated(user)) return null
  return safeReadConsent()
}

export function _resetForTests() {
  // consent.js 자체는 모듈 로컬 상태를 갖지 않는다(모든 상태는 firebaseProgress.js
  // 런타임에 산다). 계약 시그니처 보존과 과거 스캡폴드 호환을 위해 남겨 둔다.
}

function safeReadConsent() {
  try {
    return readFirebasePlayerConsent()
  } catch {
    return null
  }
}

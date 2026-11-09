// Rosari wardrobe outfit ownership. Same shape as weaponUnlocks.js.
//
// 저장 정본: 로그인 계정 users/{uid}/progress.outfitUnlocks/{outfitId} = 1 (default는 저장하지 않는다).
// 게스트: 이 모듈의 메모리 Set만 (새로고침하면 사라진다). localStorage·IndexedDB는 절대 쓰지 않는다.
//   게스트 _onRunEnd 판정 입력은 "이번 판 하나"뿐이라, 보유 목록을 판마다 다시 계산하지 않고
//   합집합으로 쌓는다 (Stage 1 탈출 다음 판에서 죽어도 동복이 남는다, balanceqa §3-3).
// 로그인했지만 계정 진행도가 아직 오지 않았으면 default만 보유로 본다 (무기 해금과 같은 규칙).
import { DEFAULT_OUTFIT_ID, evaluateOutfitUnlocks, isAccountUnlockableOutfitId, isOutfitId, isOutfitReleased } from './outfitCatalog.js'
import {
  _seedHydratedFirebaseProgressForTests,
  getFirebaseProgressRuntimeSnapshot,
  isFirebaseProgressHydrated,
  readFirebasePlayerProgressOrDefault,
  updateFirebasePlayerProgress,
} from './firebaseProgress.js'
import { loadGuestSessionSettings, loadTitleSettings } from './titleSettings.js'

let guestSessionOutfitUnlocks = new Set()
// 게스트 판정 입력 누적 (판 하나씩 들어오는 stageNClears를 세션 동안 모은다).
// 그래야 졸업(Stage 1~4 모두 탈출)을 같은 세션의 여러 판에 걸쳐 모을 수 있다. 메모리만.
let guestSessionClearRecords = {}

function accumulateGuestRecords(records) {
  for (const [key, value] of Object.entries(records ?? {})) {
    if (!/^stage\d+Clears$/.test(key) || typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    guestSessionClearRecords[key] = (guestSessionClearRecords[key] ?? 0) + value
  }
  return { ...guestSessionClearRecords }
}

function isGuestSession() {
  return !isFirebaseProgressHydrated() && !getFirebaseProgressRuntimeSnapshot().uid
}

function readRaw() {
  return readFirebasePlayerProgressOrDefault().outfitUnlocks ?? {}
}

function updateRaw(mutator) {
  updateFirebasePlayerProgress((progress) => {
    const raw = { ...(progress.outfitUnlocks ?? {}) }
    mutator(raw)
    progress.outfitUnlocks = raw
    return progress
  })
}

export function isOutfitUnlocked(id) {
  if (!isOutfitId(id)) return false
  if (id === DEFAULT_OUTFIT_ID) return true
  if (isFirebaseProgressHydrated()) return readRaw()[id] === 1
  if (isGuestSession()) return guestSessionOutfitUnlocks.has(id)
  return false
}

// 저장할 곳이 없으면(로그인 + 미수화) 아무것도 하지 않는다. 쓰기가 일어났으면 true.
export function setOutfitUnlocked(id) {
  if (!isAccountUnlockableOutfitId(id)) return false
  if (isFirebaseProgressHydrated()) {
    if (readRaw()[id] === 1) return false
    updateRaw((raw) => { raw[id] = 1 })
    return true
  }
  if (isGuestSession()) {
    if (guestSessionOutfitUnlocks.has(id)) return false
    guestSessionOutfitUnlocks.add(id)
    return true
  }
  return false
}

// 저장된(또는 게스트 메모리) 해금 id. default 제외.
export function getAllUnlockedOutfits() {
  const out = new Set()
  if (isFirebaseProgressHydrated()) {
    for (const [id, v] of Object.entries(readRaw())) {
      if (isAccountUnlockableOutfitId(id) && v === 1) out.add(id)
    }
    return out
  }
  if (isGuestSession()) return new Set(guestSessionOutfitUnlocks)
  return out
}

// 옷장이 그리는 보유 목록. default 포함.
export function getOwnedOutfitIds() {
  return new Set([DEFAULT_OUTFIT_ID, ...getAllUnlockedOutfits()])
}

// 판 결과(evalInput = 누적 기록 + 이번 판)로 새 옷을 지급하고, 이번에 처음 얻은 id를 돌려준다.
// 게스트는 메모리 합집합, 로그인 계정은 progress.outfitUnlocks (다음 진행도 저장에 실린다).
export function grantOutfitUnlocksFromRecords(records) {
  const already = getAllUnlockedOutfits()
  const granted = []
  const input = isGuestSession() ? accumulateGuestRecords(records) : records
  for (const id of evaluateOutfitUnlocks(input)) {
    if (!isAccountUnlockableOutfitId(id) || already.has(id)) continue
    if (setOutfitUnlocked(id)) granted.push(id)
  }
  return granted
}

// 로그인·진행도 불러오기 직후 소급 지급 (reloadPersistentProgress / resetGame).
// 기록을 읽기만 하고 고치지 않는다. 소급 지급은 알림을 띄우지 않는다(D-5) — 반환값은 테스트·진단용.
// 동복 보호(D-2): 저장된 playerOutfit이 'winter'인 계정은 Stage 1 탈출 기록이 없어도 winter 보유.
export function syncOutfitUnlocksFromRecords(records) {
  if (!isFirebaseProgressHydrated()) return []
  const granted = grantOutfitUnlocksFromRecords(records)
  if (loadTitleSettings().playerOutfit === 'winter' && setOutfitUnlocked('winter')) granted.push('winter')
  return granted
}

// 저장된 옷 선택. titleSettings.loadPlayerOutfit과 같은 출처 규칙
// (수화된 계정 → 계정 설정, 게스트 → 이번 탭 메모리, 로그인했지만 미수화 → default).
function loadSavedOutfitId() {
  if (isFirebaseProgressHydrated()) return loadTitleSettings().playerOutfit
  if (getFirebaseProgressRuntimeSnapshot().uid) return DEFAULT_OUTFIT_ID
  return loadGuestSessionSettings().playerOutfit
}

// 판 시작 때 입는 옷 = 저장된 옷이 보유 목록에 있고 외형이 준비된 옷이면 그 옷, 아니면 default.
// 저장값은 덮어쓰지 않는다 (T-04). 스토어 runOutfitId와 Player.jsx 외형이 이 값 하나를 같이 쓴다.
export function resolveRunOutfitId() {
  const saved = loadSavedOutfitId()
  return isOutfitId(saved) && isOutfitReleased(saved) && isOutfitUnlocked(saved) ? saved : DEFAULT_OUTFIT_ID
}

export function _resetGuestOutfitUnlocksForTests() {
  guestSessionOutfitUnlocks = new Set()
  guestSessionClearRecords = {}
}

export function _resetForTests() {
  _resetGuestOutfitUnlocksForTests()
  _seedHydratedFirebaseProgressForTests()
  updateFirebasePlayerProgress((progress) => {
    progress.outfitUnlocks = {}
    return progress
  })
}

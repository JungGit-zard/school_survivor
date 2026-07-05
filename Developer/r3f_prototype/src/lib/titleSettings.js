// 게임 환경 설정(진동/연출 줄이기/무기 전체 해금 치트)의 영구 저장 계층.
// 타이틀 화면과 로비 설정 모달이 공유한다(단일 저장 소스).
import { getAllWeaponIds, isStarter } from './weaponCatalog.js'
import { setUnlocked as setWeaponUnlocked } from './weaponUnlocks.js'

export const SETTINGS_STORAGE_KEY = 'school_survivor:titleSettings'

export const DEFAULT_SETTINGS = {
  vibration: true,
  reducedEffects: false,
  unlockAllWeaponsCheat: false,
}

export function loadTitleSettings() {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS

    const parsed = JSON.parse(raw)
    return {
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : DEFAULT_SETTINGS.vibration,
      reducedEffects: typeof parsed.reducedEffects === 'boolean' ? parsed.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
      unlockAllWeaponsCheat: typeof parsed.unlockAllWeaponsCheat === 'boolean' ? parsed.unlockAllWeaponsCheat : DEFAULT_SETTINGS.unlockAllWeaponsCheat,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveTitleSettings(settings) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

// 연출 줄이기 상태를 document 루트에 반영 (전역 시각 톤 조정).
export function applyReducedEffects(reducedEffects) {
  if (typeof document === 'undefined') return
  if (reducedEffects) {
    document.documentElement.dataset.reducedEffects = 'true'
  } else {
    document.documentElement.removeAttribute('data-reduced-effects')
  }
}

// 게임 피드백 진동. 진동 설정이 켜져 있고 기기가 vibrate를 지원할 때만 울린다(데스크톱은 무시).
export function vibrateFeedback(pattern = 18) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (!loadTitleSettings().vibration) return
  navigator.vibrate(pattern)
}

export function unlockAllNonStarterWeapons() {
  for (const id of getAllWeaponIds()) {
    if (!isStarter(id)) setWeaponUnlocked(id)
  }
}

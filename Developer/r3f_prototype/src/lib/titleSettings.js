// Player title/settings runtime layer.
// Durable player settings live only in Firebase users/{uid}. Admin/dev config remains separate.
import { readFirebasePlayerProgress, updateFirebasePlayerProgress } from './firebaseProgress.js'
import { detectInitialLocale, isSupportedLocale, setLocale } from './i18n.js'
import { setScientificNotation } from './numberFormat.js'

export const SETTINGS_STORAGE_KEY = 'school_survivor:titleSettings'

export const DEFAULT_SETTINGS = {
  vibration: true,
  reducedEffects: false,
  hitCameraShake: true,
  // 무한 모드에서 점수가 끝없이 자란다. 켜면 3.6e5처럼 짧게 적는다.
  scientificNotation: false,
  // 계정에 저장된 언어가 없으면 브라우저 언어를 그대로 쓴다.
  language: null,
  unlockAllWeaponsCheat: false,
  unlockAllStagesCheat: false,
}

export function loadTitleSettings() {
  const settings = readFirebasePlayerProgress().titleSettings ?? DEFAULT_SETTINGS
  return {
    language: isSupportedLocale(settings.language) ? settings.language : DEFAULT_SETTINGS.language,
    vibration: typeof settings.vibration === 'boolean' ? settings.vibration : DEFAULT_SETTINGS.vibration,
    reducedEffects: typeof settings.reducedEffects === 'boolean' ? settings.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
    hitCameraShake: typeof settings.hitCameraShake === 'boolean' ? settings.hitCameraShake : DEFAULT_SETTINGS.hitCameraShake,
    unlockAllWeaponsCheat: typeof settings.unlockAllWeaponsCheat === 'boolean'
      ? settings.unlockAllWeaponsCheat
      : DEFAULT_SETTINGS.unlockAllWeaponsCheat,
    unlockAllStagesCheat: typeof settings.unlockAllStagesCheat === 'boolean'
      ? settings.unlockAllStagesCheat
      : DEFAULT_SETTINGS.unlockAllStagesCheat,
  }
}

export function saveTitleSettings(settings) {
  updateFirebasePlayerProgress((progress) => {
    progress.titleSettings = {
      ...loadTitleSettings(),
      ...settings,
    }
    return progress
  })
}

// 계정에 저장된 언어를 런타임에 적용한다. 저장값이 없으면 브라우저 언어로 되돌린다.
export function applyLanguage(language) {
  setLocale(isSupportedLocale(language) ? language : detectInitialLocale())
}

export function applyReducedEffects(reducedEffects) {
  if (typeof document === 'undefined') return
  if (reducedEffects) {
    document.documentElement.dataset.reducedEffects = 'true'
  } else {
    document.documentElement.removeAttribute('data-reduced-effects')
  }
}

export function applyHitCameraShake(hitCameraShake) {
  if (typeof document === 'undefined') return
  if (hitCameraShake === false) {
    document.documentElement.dataset.hitCameraShake = 'false'
  } else {
    document.documentElement.removeAttribute('data-hit-camera-shake')
  }
}

export function applyScientificNotation(scientific) {
  setScientificNotation(scientific === true)
}

export function vibrateFeedback(pattern = 18) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (!loadTitleSettings().vibration) return
  navigator.vibrate(pattern)
}

export async function unlockAllNonStarterWeapons() {
  const [{ getAllWeaponIds, isStarter }, { setUnlocked: setWeaponUnlocked }] = await Promise.all([
    import('./weaponCatalog.js'),
    import('./weaponUnlocks.js'),
  ])
  for (const id of getAllWeaponIds()) {
    if (!isStarter(id)) setWeaponUnlocked(id)
  }
}

export function unlockAllStagesForDevCheat() {
  saveTitleSettings({ unlockAllStagesCheat: true })
}

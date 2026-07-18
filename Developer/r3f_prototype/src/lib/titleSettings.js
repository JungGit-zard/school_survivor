// Player title/settings runtime layer.
// Durable player settings live only in Firebase users/{uid}. Admin/dev config remains separate.
import { getAllWeaponIds, isStarter } from './weaponCatalog.js'
import { setUnlocked as setWeaponUnlocked } from './weaponUnlocks.js'
import { readFirebasePlayerProgress, updateFirebasePlayerProgress } from './firebaseProgress.js'

export const SETTINGS_STORAGE_KEY = 'school_survivor:titleSettings'

export const DEFAULT_SETTINGS = {
  vibration: true,
  reducedEffects: false,
  unlockAllWeaponsCheat: false,
}

export function loadTitleSettings() {
  const settings = readFirebasePlayerProgress().titleSettings ?? DEFAULT_SETTINGS
  return {
    vibration: typeof settings.vibration === 'boolean' ? settings.vibration : DEFAULT_SETTINGS.vibration,
    reducedEffects: typeof settings.reducedEffects === 'boolean' ? settings.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
    unlockAllWeaponsCheat: typeof settings.unlockAllWeaponsCheat === 'boolean'
      ? settings.unlockAllWeaponsCheat
      : DEFAULT_SETTINGS.unlockAllWeaponsCheat,
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

export function applyReducedEffects(reducedEffects) {
  if (typeof document === 'undefined') return
  if (reducedEffects) {
    document.documentElement.dataset.reducedEffects = 'true'
  } else {
    document.documentElement.removeAttribute('data-reduced-effects')
  }
}

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

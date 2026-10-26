// Player title/settings runtime layer.
// Durable player settings live only in Firebase users/{uid}. Admin/dev config remains separate.
import { getFirebaseProgressRuntimeSnapshot, isFirebaseProgressHydrated, readFirebasePlayerProgressOrDefault, requestCloudProgressSave, updateFirebasePlayerProgress } from './firebaseProgress.js'
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

// 게스트 설정은 이번 접속(탭) 메모리에만 둔다. 영구 저장은 Firebase users/{uid}뿐이라
// localStorage에는 쓰지 않는다. 새로고침하면 사라지는 것이 정책이다.
let guestSessionSettings = {}

export function loadGuestSessionSettings() {
  return { ...DEFAULT_SETTINGS, ...guestSessionSettings }
}

export function saveGuestSessionSettings(patch) {
  if (!patch || typeof patch !== 'object') return
  guestSessionSettings = { ...guestSessionSettings, ...patch }
}

export function _resetGuestSessionSettingsForTests() {
  guestSessionSettings = {}
}

export function loadTitleSettings() {
  const settings = readFirebasePlayerProgressOrDefault().titleSettings ?? DEFAULT_SETTINGS
  return {
    ...(settings.playerAppearance === 'v9' || settings.playerAppearance === 'legacy'
      ? { playerAppearance: settings.playerAppearance } : {}),
    // Rosari wardrobe outfit: separate axis from playerAppearance. Unknown values are dropped (=> 'default').
    ...(settings.playerOutfit === 'default' || settings.playerOutfit === 'winter'
      ? { playerOutfit: settings.playerOutfit } : {}),
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

// Rosari wardrobe outfit (titleSettings.playerOutfit). Separate axis from playerAppearance.
// Ids mirror src/lib/rosariOutfits.js; absent or unknown => 'default'.
export const PLAYER_OUTFIT_IDS = Object.freeze(['default', 'winter'])
export const DEFAULT_PLAYER_OUTFIT = 'default'
const isPlayerOutfit = (value) => PLAYER_OUTFIT_IDS.includes(value)

// Same source rule as Player.jsx appearance: hydrated account => account setting,
// guest => this tab's session memory, signed-in but not yet hydrated => default.
export function loadPlayerOutfit() {
  if (isFirebaseProgressHydrated()) {
    const outfit = loadTitleSettings().playerOutfit
    return isPlayerOutfit(outfit) ? outfit : DEFAULT_PLAYER_OUTFIT
  }
  if (getFirebaseProgressRuntimeSnapshot().uid) return DEFAULT_PLAYER_OUTFIT
  const outfit = loadGuestSessionSettings().playerOutfit
  return isPlayerOutfit(outfit) ? outfit : DEFAULT_PLAYER_OUTFIT
}

// Resolves true when the choice is stored where it belongs (account cloud save or guest
// session memory), false when it could not be stored (unknown id, account not hydrated,
// cloud save rejected/failed).
export async function savePlayerOutfit(playerOutfit) {
  if (!isPlayerOutfit(playerOutfit)) return false
  if (isFirebaseProgressHydrated()) {
    const uid = getFirebaseProgressRuntimeSnapshot().uid
    const previous = readFirebasePlayerProgressOrDefault().titleSettings?.playerOutfit
    saveTitleSettings({ playerOutfit })
    let saved = false
    try { saved = (await requestCloudProgressSave()) === true } catch { saved = false }
    // A rejected/failed save must not leave the unsaved value in the runtime: every later
    // whole-progress save would carry it again (and be rejected again if Rules refuse it).
    if (!saved && isFirebaseProgressHydrated() && getFirebaseProgressRuntimeSnapshot().uid === uid) {
      updateFirebasePlayerProgress((progress) => {
        const { playerOutfit: _unsaved, ...rest } = progress.titleSettings ?? {}
        progress.titleSettings = isPlayerOutfit(previous) ? { ...rest, playerOutfit: previous } : rest
        return progress
      })
    }
    return saved
  }
  if (getFirebaseProgressRuntimeSnapshot().uid) return false
  saveGuestSessionSettings({ playerOutfit })
  return true
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
  // Remote account settings are only readable after the authenticated snapshot is applied.
  if (!isFirebaseProgressHydrated()) return
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

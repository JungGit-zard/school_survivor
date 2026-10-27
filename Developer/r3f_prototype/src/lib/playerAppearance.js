// Canonical list of savable `titleSettings.playerAppearance` values.
// Three places used to repeat these literals (database.rules.json, firebaseProgress
// normalizeTitleSettings, titleSettings loadTitleSettings); any one of them missing a
// value silently drops the save. JS reads this constant; database.rules.json cannot
// import JS, so firebaseProgressRules.test.js asserts the rule matches this list.
export const PLAYER_APPEARANCE_VALUES = Object.freeze(['v9', 'legacy', 'rosari'])

// The fallback when an account never chose one. Player.jsx and LobbySettingsModal's
// DEFAULT_APPEARANCE both repeated this literal; import it from here instead.
export const DEFAULT_PLAYER_APPEARANCE = 'v9'

export function isPlayerAppearance(value) {
  return PLAYER_APPEARANCE_VALUES.includes(value)
}

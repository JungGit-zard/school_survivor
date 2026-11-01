// Canonical list of savable Rosari wardrobe outfit ids (`titleSettings.playerOutfit`,
// `progress.outfitUnlocks/{id}`, ranking entry `outfitId`).
// Leaf module on purpose: titleSettings.js imports firebaseProgress.js, so the id list
// cannot live in titleSettings.js without an import cycle. Every JS allow-list reads this
// constant; database.rules.json cannot import JS, so databaseRules.test.js and
// firebaseProgressRules.test.js assert the rule strings match this list exactly.
// A rule that is missing an id silently rejects the whole progress save or the whole
// six-bucket ranking write, so deploy the rules before any client that emits a new id.
export const PLAYER_OUTFIT_IDS = Object.freeze(['default', 'winter', 'raincoat', 'gym', 'apron', 'grad'])

export const DEFAULT_PLAYER_OUTFIT = 'default'

// `default` is always owned and never stored under progress.outfitUnlocks.
export const UNLOCKABLE_OUTFIT_IDS = Object.freeze(PLAYER_OUTFIT_IDS.filter((id) => id !== DEFAULT_PLAYER_OUTFIT))

export function isPlayerOutfitId(value) {
  return typeof value === 'string' && PLAYER_OUTFIT_IDS.includes(value)
}

// Rosari outfit display text. Reads outfitCatalog.js only (names, unlock labels, ability
// descriptors) and turns them into locale strings. No numbers or conditions live here, so the
// wardrobe, the feature table, the result card and the pause line can never drift from the catalog.
import { OUTFIT_ABILITY_NONE_KEY, getOutfit, getOutfitAbilities } from './outfitCatalog.js'
import { t } from './i18n.js'

export function outfitName(id) {
  return t(getOutfit(id).nameKey)
}

export function outfitUnlockText(id) {
  const { unlock } = getOutfit(id)
  if (!unlock.labelKey) return t('outfit.unlock.always')
  return t(unlock.labelKey, unlock.labelParams)
}

// [{ stat, positive, text }] — upside first, then downside. default → [].
export function outfitAbilityLines(id) {
  return getOutfitAbilities(id).map((ability) => ({
    stat: ability.stat,
    positive: ability.positive,
    text: t(ability.labelKey, { v: ability.display }),
  }))
}

// "받는 피해 -8% / 이동속도 -4%" or "능력 없음" for the default uniform.
export function outfitEffectSummary(id) {
  const lines = outfitAbilityLines(id)
  if (lines.length === 0) return t(OUTFIT_ABILITY_NONE_KEY)
  return lines.map((line) => line.text).join(' / ')
}

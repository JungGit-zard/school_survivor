// Outfit i18n coverage: every key the catalog and the outfit UI read exists in ko, en and ja,
// and the display helpers turn catalog descriptors into the expected text.
import { afterEach, describe, expect, it } from 'vitest'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'
import { OUTFIT_ABILITY_NONE_KEY, OUTFIT_IDS, getOutfit, getOutfitAbilities } from './outfitCatalog.js'
import { outfitAbilityLines, outfitEffectSummary, outfitName, outfitUnlockText } from './outfitDisplay.js'
import { getLocale, setLocale } from './i18n.js'

const HANGUL = /[가-힣]/
const original = getLocale()
afterEach(() => setLocale(original))

const UI_KEYS = [
  'outfit.unlock.always', 'outfit.locked', 'outfit.owned', 'outfit.lockedBadge', 'outfit.pro', 'outfit.con',
  'outfit.lockedAria', 'outfit.guestSaveHint', 'outfit.newUnlock.title', 'outfit.newUnlock.body', 'outfit.wearing',
  'outfit.saveFailed', 'outfit.wardrobe.title', 'outfit.wardrobe.dialogAria', 'outfit.wardrobe.closeAria',
  'outfit.wardrobe.listAria', 'outfit.table.open', 'outfit.table.title', 'outfit.table.closeAria',
  'outfit.table.colOutfit', 'outfit.table.colUnlock', 'outfit.table.colEffect', 'outfit.pauseLine',
]

function catalogKeys() {
  const keys = new Set([OUTFIT_ABILITY_NONE_KEY])
  for (const id of OUTFIT_IDS) {
    const outfit = getOutfit(id)
    keys.add(outfit.nameKey)
    if (outfit.unlock.labelKey) keys.add(outfit.unlock.labelKey)
    for (const ability of getOutfitAbilities(id)) keys.add(ability.labelKey)
  }
  // All six stat labels, even ones no current outfit uses yet.
  for (const stat of ['damageTaken', 'projectileDamage', 'moveSpeed', 'maxHp', 'xp', 'lunchHeal']) keys.add(`outfit.ability.${stat}`)
  return [...keys]
}

describe('outfit i18n keys', () => {
  it('every catalog and UI key exists in ko, en and ja, with no Korean left in en/ja', () => {
    const problems = []
    for (const key of [...catalogKeys(), ...UI_KEYS]) {
      for (const [name, dict] of Object.entries({ ko, en, ja })) {
        if (typeof dict[key] !== 'string' || dict[key] === '') problems.push(`${name}: missing ${key}`)
        else if (name !== 'ko' && HANGUL.test(dict[key])) problems.push(`${name}: Korean in ${key}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('en and ja define exactly the outfit keys ko defines', () => {
    const outfitKeys = (dict) => Object.keys(dict).filter((key) => key.startsWith('outfit.')).sort()
    expect(outfitKeys(en)).toEqual(outfitKeys(ko))
    expect(outfitKeys(ja)).toEqual(outfitKeys(ko))
  })

  it('Rosari room screen keys exist in ko, en and ja, with no Korean left in en/ja', () => {
    const roomKeys = (dict) => Object.keys(dict).filter((key) => key.startsWith('rosariRoom.')).sort()
    expect(roomKeys(ko).length).toBeGreaterThan(0)
    expect(roomKeys(en)).toEqual(roomKeys(ko))
    expect(roomKeys(ja)).toEqual(roomKeys(ko))
    for (const key of roomKeys(ko)) {
      expect(HANGUL.test(en[key]), `en ${key}`).toBe(false)
      expect(HANGUL.test(ja[key]), `ja ${key}`).toBe(false)
    }
  })

  it('has no brand names in the outfit copy', () => {
    const text = [ko, en, ja].flatMap((dict) => Object.entries(dict).filter(([k]) => k.startsWith('outfit.')).map(([, v]) => v)).join(' ')
    expect(text).not.toMatch(/nike|adidas|puma|uniqlo|starbucks|tesla/i)
  })
})

describe('outfit display helpers', () => {
  it('formats names, conditions and ability lines from the catalog', () => {
    setLocale('ko')
    expect(outfitName('apron')).toBe('급식 당번복')
    expect(outfitUnlockText('default')).toBe('처음부터 있어요')
    expect(outfitUnlockText('raincoat')).toBe('Stage 2 탈출 1회')
    expect(outfitUnlockText('grad')).toBe('Stage 1~4 모두 탈출')
    expect(outfitAbilityLines('raincoat')).toEqual([
      { stat: 'projectileDamageMult', positive: true, text: '투사체 피해 -30%' },
      { stat: 'maxHpDelta', positive: false, text: '최대 체력 -6' },
    ])
    expect(outfitEffectSummary('apron')).toBe('급식 회복 +30% / 얻는 경험치 -5%')
    expect(outfitEffectSummary('default')).toBe('능력 없음')
    expect(outfitName('not-an-outfit')).toBe('학교 교복')
  })

  it('switches language', () => {
    setLocale('en')
    expect(outfitEffectSummary('grad')).toBe('XP gain +8% / Damage taken +8%')
    expect(outfitUnlockText('winter')).toBe('Escape Stage 1')
    setLocale('ja')
    expect(outfitEffectSummary('gym')).toBe('移動速度 +6% / 最大HP -12')
  })
})

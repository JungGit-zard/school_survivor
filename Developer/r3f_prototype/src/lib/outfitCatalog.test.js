import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OUTFIT_ID,
  ENEMY_PROJECTILE_DAMAGE_SOURCE,
  NEUTRAL_OUTFIT_STATS,
  OUTFIT_CATALOG,
  OUTFIT_IDS,
  applyOutfitDamageTaken,
  applyOutfitXpCarry,
  evaluateOutfitUnlocks,
  getLunchHealAmount,
  getOutfit,
  getOutfitAbilities,
  getOutfitStats,
  isOutfitId,
  isOutfitReleased,
  isOutfitUnlockedByRecords,
  listOutfits,
} from './outfitCatalog.js'
import { PLAYER_OUTFIT_IDS } from './playerOutfitIds.js'
import { ROSARI_OUTFITS } from './rosariOutfits.js'

const rules = JSON.parse(readFileSync(fileURLToPath(new URL('../../database.rules.json', import.meta.url)), 'utf8'))
const quotedIds = (expr) => [...expr.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1])

// Stage 5·6 클리어 의상은 2026-11-08 외형(rosariOutfits.js 임시안)이 생겨 공개됐다. 숨김 의상 없음.
const UNRELEASED_OUTFIT_IDS = []

describe('Stage 5·6 clear outfits (spec56 B §9, C-9-4)', () => {
  it('prefect: Stage 5 escape, max HP +10 / move speed x0.95', () => {
    expect(OUTFIT_CATALOG.prefect).toMatchObject({ id: 'prefect', order: 6, nameKey: 'outfit.prefect.name' })
    expect(OUTFIT_CATALOG.prefect.unlock).toMatchObject({ type: 'stageClears', recordKeys: ['stage5Clears'], labelKey: 'outfit.unlock.stageClear', labelParams: { n: 5 } })
    expect(getOutfitStats('prefect')).toEqual({ ...NEUTRAL_OUTFIT_STATS, maxHpDelta: 10, speedMult: 0.95 })
    expect(getOutfitAbilities('prefect').map((a) => [a.stat, a.display, a.positive])).toEqual([
      ['maxHpDelta', '+10', true],
      ['speedMult', '-5', false],
    ])
  })

  it('sportsDay: Stage 6 escape, max HP +10 / move speed -3%', () => {
    expect(OUTFIT_CATALOG.sportsDay).toMatchObject({ id: 'sportsDay', order: 7, nameKey: 'outfit.sportsDay.name' })
    expect(OUTFIT_CATALOG.sportsDay.unlock).toMatchObject({ type: 'stageClears', recordKeys: ['stage6Clears'], labelParams: { n: 6 } })
    expect(getOutfitStats('sportsDay')).toEqual({ ...NEUTRAL_OUTFIT_STATS, maxHpDelta: 10, speedMult: 0.97 })
    expect(getOutfitAbilities('sportsDay').map((a) => [a.stat, a.display, a.positive])).toEqual([
      ['maxHpDelta', '+10', true],
      ['speedMult', '-3', false],
    ])
  })

  it('the records unlock them, and with their looks in place they are listed and granted', () => {
    expect(isOutfitUnlockedByRecords('prefect', { stage5Clears: 0 })).toBe(false)
    expect(isOutfitUnlockedByRecords('prefect', { stage5Clears: 1 })).toBe(true)
    expect(isOutfitUnlockedByRecords('sportsDay', { stage6Clears: 1 })).toBe(true)
    expect(isOutfitUnlockedByRecords('sportsDay', { stage5Clears: 1 })).toBe(false)
    for (const id of ['prefect', 'sportsDay']) {
      expect(isOutfitReleased(id), id).toBe(true)
      expect(listOutfits().some((outfit) => outfit.id === id), id).toBe(true)
    }
    const granted = evaluateOutfitUnlocks({ stage5Clears: 3, stage6Clears: 2 })
    expect(granted.has('prefect')).toBe(true)
    expect(granted.has('sportsDay')).toBe(true)
    expect(evaluateOutfitUnlocks({ stage5Clears: 1 }).has('sportsDay')).toBe(false)
    // grad stays Stage 1~4 only; Stage 5·6 clears add nothing to it.
    expect(evaluateOutfitUnlocks({ stage5Clears: 1, stage6Clears: 1 }).has('grad')).toBe(false)
  })

  it('released outfits report isOutfitReleased true; unknown ids false', () => {
    for (const id of ['default', 'winter', 'raincoat', 'gym', 'apron', 'grad', 'prefect', 'sportsDay']) expect(isOutfitReleased(id), id).toBe(true)
    expect(isOutfitReleased('labcoat')).toBe(false)
  })
})

describe('T-01 outfit id list is one list everywhere', () => {
  it('catalog ids = PLAYER_OUTFIT_IDS = ROSARI_OUTFITS (visual-ready) ids', () => {
    expect([...OUTFIT_IDS]).toEqual(['default', 'winter', 'raincoat', 'gym', 'apron', 'grad', 'prefect', 'sportsDay'])
    expect([...OUTFIT_IDS]).toEqual([...PLAYER_OUTFIT_IDS])
    expect(Object.keys(OUTFIT_CATALOG).sort()).toEqual([...OUTFIT_IDS].sort())
    const visualReadyIds = listOutfits().map((outfit) => outfit.id)
    // 옷장에 보이는 옷 = 외형(ROSARI_OUTFITS)이 있는 옷. 외형이 생기면 visualReady를 켜야 이 단언이 다시 맞는다.
    expect(visualReadyIds).toEqual(OUTFIT_IDS.filter((id) => !UNRELEASED_OUTFIT_IDS.includes(id)))
    expect(ROSARI_OUTFITS.map((outfit) => outfit.id).sort()).toEqual([...visualReadyIds].sort())
    expect(listOutfits({ includeHidden: true }).map((outfit) => outfit.id)).toEqual([...OUTFIT_IDS])
  })

  it('catalog ids = RTDB rule allow-lists (outfitUnlocks without default)', () => {
    const progress = rules.rules.users.$uid.progress
    const unlockRule = progress.outfitUnlocks.$outfitId['.validate']
    expect(quotedIds(unlockRule).sort()).toEqual(OUTFIT_IDS.filter((id) => id !== DEFAULT_OUTFIT_ID).sort())
    const outfitRule = JSON.stringify(progress.titleSettings)
    for (const id of OUTFIT_IDS) expect(outfitRule).toContain(`'${id}'`)
  })

  it('every outfit has an i18n name key, order and the release flags', () => {
    OUTFIT_IDS.forEach((id, index) => {
      const outfit = OUTFIT_CATALOG[id]
      expect(outfit.id).toBe(id)
      expect(outfit.nameKey).toBe(`outfit.${id}.name`)
      expect(outfit.order).toBe(index)
      expect(outfit.visualReady).toBe(!UNRELEASED_OUTFIT_IDS.includes(id))
      expect(outfit.available).toBe(true)
    })
  })

  it('unknown ids fall back to default', () => {
    expect(isOutfitId('labcoat')).toBe(false)
    expect(isOutfitId('__proto__')).toBe(false)
    expect(getOutfit('labcoat').id).toBe(DEFAULT_OUTFIT_ID)
    expect(getOutfitStats(undefined)).toEqual(NEUTRAL_OUTFIT_STATS)
  })
})

describe('§2 ability numbers (balanceqa-corrected)', () => {
  it('matches the spec table exactly', () => {
    expect(getOutfitStats('default')).toEqual(NEUTRAL_OUTFIT_STATS)
    expect(getOutfitStats('winter')).toMatchObject({ damageTakenMult: 0.92, speedMult: 0.96 })
    expect(getOutfitStats('raincoat')).toMatchObject({ projectileDamageMult: 0.7, maxHpDelta: -6 })
    expect(getOutfitStats('gym')).toMatchObject({ speedMult: 1.06, maxHpDelta: -12 })
    expect(getOutfitStats('apron')).toMatchObject({ lunchHealMult: 1.3, xpMult: 0.95 })
    expect(getOutfitStats('grad')).toMatchObject({ xpMult: 1.08, damageTakenMult: 1.08 })
  })

  it('6-a: every non-default outfit has exactly one pro and one con; default has none', () => {
    expect(getOutfitAbilities('default')).toEqual([])
    for (const id of OUTFIT_IDS.filter((value) => value !== DEFAULT_OUTFIT_ID)) {
      const abilities = getOutfitAbilities(id)
      expect(abilities).toHaveLength(2)
      expect(abilities[0].positive).toBe(true)
      expect(abilities[1].positive).toBe(false)
    }
  })

  it('exposes display descriptors for the wardrobe feature table', () => {
    expect(getOutfitAbilities('winter')).toEqual([
      { stat: 'damageTakenMult', labelKey: 'outfit.ability.damageTaken', value: -8, unit: '%', display: '-8', positive: true },
      { stat: 'speedMult', labelKey: 'outfit.ability.moveSpeed', value: -4, unit: '%', display: '-4', positive: false },
    ])
    expect(getOutfitAbilities('gym').map((a) => [a.labelKey, a.display, a.positive])).toEqual([
      ['outfit.ability.moveSpeed', '+6', true],
      ['outfit.ability.maxHp', '-12', false],
    ])
    expect(getOutfitAbilities('raincoat').map((a) => a.display)).toEqual(['-30', '-6'])
    expect(getOutfitAbilities('apron').map((a) => [a.labelKey, a.display])).toEqual([
      ['outfit.ability.lunchHeal', '+30'],
      ['outfit.ability.xp', '-5'],
    ])
    expect(getOutfitAbilities('grad').map((a) => [a.labelKey, a.display, a.positive])).toEqual([
      ['outfit.ability.xp', '+8', true],
      ['outfit.ability.damageTaken', '+8', false],
    ])
  })

  it('6-c: no outfit touches hitbox, magnet, weapon damage or cooldown', () => {
    for (const id of OUTFIT_IDS) {
      expect(Object.keys(getOutfitStats(id)).sort()).toEqual(Object.keys(NEUTRAL_OUTFIT_STATS).sort())
    }
  })

  it('unlock descriptors carry the i18n label key and params', () => {
    expect(OUTFIT_CATALOG.default.unlock.type).toBe('always')
    expect(OUTFIT_CATALOG.raincoat.unlock).toMatchObject({ type: 'stageClears', recordKeys: ['stage2Clears'], labelKey: 'outfit.unlock.stageClear', labelParams: { n: 2 } })
    expect(OUTFIT_CATALOG.grad.unlock).toMatchObject({
      recordKeys: ['stage1Clears', 'stage2Clears', 'stage3Clears', 'stage4Clears'],
      labelKey: 'outfit.unlock.stagesClear',
      labelParams: { from: 1, to: 4 },
    })
  })
})

describe('T-02 evaluateOutfitUnlocks', () => {
  it('empty / missing input owns only default', () => {
    expect([...evaluateOutfitUnlocks({})]).toEqual(['default'])
    expect([...evaluateOutfitUnlocks(undefined)]).toEqual(['default'])
    expect([...evaluateOutfitUnlocks(null)]).toEqual(['default'])
  })

  it('0 clears unlocks nothing, 1 or many unlocks the stage outfit', () => {
    expect(evaluateOutfitUnlocks({ stage1Clears: 0 }).has('winter')).toBe(false)
    expect(evaluateOutfitUnlocks({ stage1Clears: 1 }).has('winter')).toBe(true)
    expect(evaluateOutfitUnlocks({ stage1Clears: 37 }).has('winter')).toBe(true)
    expect([...evaluateOutfitUnlocks({ stage2Clears: 1, stage3Clears: 2, stage4Clears: 3 })].sort())
      .toEqual(['apron', 'default', 'gym', 'raincoat'])
  })

  it('non-numeric values never unlock', () => {
    for (const bad of ['1', true, NaN, Infinity, { n: 1 }, [1]]) {
      expect(evaluateOutfitUnlocks({ stage1Clears: bad }).has('winter')).toBe(false)
    }
  })

  it('grad needs Stage 1~4 all escaped (stage5Clears is not a condition)', () => {
    expect(evaluateOutfitUnlocks({ stage1Clears: 1, stage2Clears: 1, stage3Clears: 1 }).has('grad')).toBe(false)
    expect(evaluateOutfitUnlocks({ stage5Clears: 9 }).has('grad')).toBe(false)
    expect(evaluateOutfitUnlocks({ stage1Clears: 1, stage2Clears: 1, stage3Clears: 1, stage4Clears: 1 }).has('grad')).toBe(true)
  })

  it('boss defeats alone do not unlock outfits', () => {
    expect([...evaluateOutfitUnlocks({ stage1BossDefeats: 3, stage2BossDefeats: 3 })]).toEqual(['default'])
  })
})

describe('ability formulas', () => {
  it('T-06 damage multipliers', () => {
    expect(applyOutfitDamageTaken(8, 'default')).toBe(8)
    expect(applyOutfitDamageTaken(8, 'winter')).toBeCloseTo(7.36, 10)
    expect(applyOutfitDamageTaken(8, 'grad')).toBeCloseTo(8.64, 10)
    expect(applyOutfitDamageTaken(8, 'raincoat', ENEMY_PROJECTILE_DAMAGE_SOURCE)).toBeCloseTo(5.6, 10)
    expect(applyOutfitDamageTaken(8, 'raincoat')).toBe(8)
    expect(applyOutfitDamageTaken(8, 'raincoat', 'contact')).toBe(8)
  })

  it('T-08 lunch heal: milk 8→10, tray 14→18 for apron, unchanged otherwise', () => {
    expect(getLunchHealAmount(8, 'apron')).toBe(10)
    expect(getLunchHealAmount(14, 'apron')).toBe(18)
    for (const id of ['default', 'winter', 'raincoat', 'gym', 'grad']) {
      expect(getLunchHealAmount(8, id)).toBe(8)
      expect(getLunchHealAmount(14, id)).toBe(14)
    }
  })

  it('T-06b XP carry: grad 25×4 = 108, apron 25×4 = 95, default unchanged', () => {
    const run = (id, amount, count) => {
      let total = 0
      let carry = 0
      for (let i = 0; i < count; i += 1) {
        const result = applyOutfitXpCarry(amount, carry, id)
        total += result.gained
        carry = result.carry
      }
      return total
    }
    expect(run('grad', 4, 25)).toBe(108)
    expect(run('apron', 4, 25)).toBe(95)
    expect(run('default', 4, 25)).toBe(100)
    expect(applyOutfitXpCarry(7, 0.25, 'default')).toEqual({ gained: 7, carry: 0.25 })
  })

  it('P-7 carry drift stays within 1 over 10000 gains', () => {
    for (const id of ['grad', 'apron']) {
      const mult = getOutfitStats(id).xpMult
      let total = 0
      let carry = 0
      let raw = 0
      for (let i = 0; i < 10_000; i += 1) {
        const base = [4, 5, 8, 10, 15][i % 5]
        raw += base
        const result = applyOutfitXpCarry(base, carry, id)
        total += result.gained
        carry = result.carry
      }
      expect(Math.abs(total - Math.round(raw * mult))).toBeLessThanOrEqual(1)
    }
  })
})

// Player-facing tumbler durability: card text in all 3 locales and the in-world wear tint.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import en from './locales/en.js'
import ja from './locales/ja.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { UPGRADE_EFFECTS } from './upgrades.js'
import { TUMBLER_WEAR_TINT_START, tumblerWearTint } from './tumblerDurability.js'

const hudSource = readFileSync(new URL('../components/HUD.jsx', import.meta.url), 'utf8')
const tumblerSource = readFileSync(new URL('../components/Weapons/Tumbler.jsx', import.meta.url), 'utf8')
const base = WEAPON_CATALOG.tumbler.base
const TUMBLER_CARDS = ['tumblerDamage', 'tumblerPower', 'tumblerCount', 'tumblerCrit']

function koDesc(key) {
  const line = hudSource.split('\n').find((text) => text.includes(`{ key: '${key}',`))
  if (!line) throw new Error(`no ko card line for ${key}`)
  return line.slice(line.indexOf("desc: '") + 7, line.lastIndexOf("'"))
}

describe('tumbler durability text', () => {
  it('every tumbler card gives the same durability bonus the text shows', () => {
    for (const key of TUMBLER_CARDS) expect(UPGRADE_EFFECTS[key].bonus).toEqual({ stat: 'durability', step: 10 })
  })

  it('the base description names durability and the recharge time in ko/en/ja', () => {
    const seconds = String(base.rechargeMs / 1000)
    const ko = koDesc('acquireTumbler')
    expect(ko).toContain(`내구력 ${base.durability}`)
    expect(ko).toContain(`${seconds}초`)
    expect(en['up.acquireTumbler.desc']).toContain(`${base.durability} durability`)
    expect(en['up.acquireTumbler.desc']).toContain(`${seconds}s`)
    expect(ja['up.acquireTumbler.desc']).toContain(`耐久力${base.durability}`)
    expect(ja['up.acquireTumbler.desc']).toContain(`${seconds}秒`)
  })

  it.each(TUMBLER_CARDS)('%s card line shows +10 durability in ko/en/ja', (key) => {
    const step = UPGRADE_EFFECTS[key].bonus.step
    expect(koDesc(key)).toContain(`내구력 +${step}`)
    expect(en[`up.${key}.desc`]).toContain(`+${step} durability`)
    expect(ja[`up.${key}.desc`]).toContain(`耐久力 +${step}`)
  })
})

describe('tumbler wear tint', () => {
  it('stays at the original color until remaining durability drops below 30%', () => {
    expect(TUMBLER_WEAR_TINT_START).toBe(0.3)
    expect(tumblerWearTint(0, 40)).toBe(0)
    expect(tumblerWearTint(28, 40)).toBe(0) // 30% left
    expect(tumblerWearTint(31, 40)).toBeCloseTo(0.25, 6) // 22.5% left
    expect(tumblerWearTint(34, 40)).toBeCloseTo(0.5, 6) // 15% left
    expect(tumblerWearTint(39, 40)).toBeCloseTo(1 - (1 / 40) / 0.3, 6)
    expect(tumblerWearTint(40, 40)).toBe(1)
  })

  it('follows the current max durability (a level-up card adds margin)', () => {
    expect(tumblerWearTint(31, 40)).toBeGreaterThan(0)
    expect(tumblerWearTint(31, 50)).toBe(0)
  })

  it('treats bad input as no tint', () => {
    expect(tumblerWearTint(10, 0)).toBe(0)
    expect(tumblerWearTint(10, Number.NaN)).toBe(0)
    expect(tumblerWearTint(Number.NaN, 40)).toBe(0)
  })

  it('the orbit paints the body from the remaining durability without allocating per frame', () => {
    expect(tumblerSource).toContain('tumblerWearTint(durabilityUsedRef.current[i], w.durability)')
    expect(tumblerSource).toContain('material.color.lerpColors(TUMBLER_BODY_COLOR, TUMBLER_WORN_COLOR, tint)')
    const frame = tumblerSource.slice(tumblerSource.indexOf('// 내구력 색 신호'), tumblerSource.indexOf('// ponytail: 텀블러는 항상 활성'))
    expect(frame.length).toBeGreaterThan(0)
    expect(frame).not.toMatch(/new THREE\.|new Float|new Array/)
  })
})

import { describe, it, expect } from 'vitest'
import {
  PASSIVE_CATALOG,
  getMvpPassiveIds,
  getPriceFor,
  isValidPassiveId,
  formatEffectLabel,
  getPassiveEffect,
  clampPassiveLevel,
  BASE_PRICES,
} from './passiveCatalog.js'

describe('passiveCatalog', () => {
  it('8종 전부 enabled:true, maxLevel 5~10, 한국어 라벨이 있다', () => {
    for (const id of ['magnet', 'moveSpeed', 'maxHp', 'might', 'growth', 'armor', 'cooldown', 'greed']) {
      const e = PASSIVE_CATALOG[id]
      expect(e.enabled).toBe(true)
      expect(e.maxLevel).toBeGreaterThanOrEqual(5)
      expect(e.maxLevel).toBeLessThanOrEqual(10)
      expect(e.label.length).toBeGreaterThan(0)
    }
  })

  it('BASE_PRICES가 최대 maxLevel을 덮고, 모든 레벨 가격이 null 아닌 4자리 이하 정수다', () => {
    const maxLevel = Math.max(...Object.values(PASSIVE_CATALOG).map((e) => e.maxLevel))
    expect(BASE_PRICES.length).toBeGreaterThanOrEqual(maxLevel)
    for (const id of Object.keys(PASSIVE_CATALOG)) {
      for (let lv = 1; lv <= PASSIVE_CATALOG[id].maxLevel; lv += 1) {
        const price = getPriceFor(id, lv)
        expect(Number.isInteger(price)).toBe(true)
        expect(price).toBeGreaterThan(0)
        expect(price).toBeLessThan(10000)
      }
    }
  })

  it('가격 공식이 기획대로 계산된다', () => {
    expect(getPriceFor('magnet', 1)).toBe(4)
    expect(getPriceFor('magnet', 10)).toBe(24)
    expect(getPriceFor('might', 1)).toBe(5)
    expect(getPriceFor('might', 10)).toBe(30)
    expect(getPriceFor('armor', 6)).toBe(18)
  })

  it('maxLevel 초과 / 음수 / 미지정 id는 null을 반환한다', () => {
    expect(getPriceFor('magnet', 11)).toBeNull()
    expect(getPriceFor('armor', 7)).toBeNull()
    expect(getPriceFor('magnet', 0)).toBeNull()
    expect(getPriceFor('bogus', 1)).toBeNull()
  })

  it('getMvpPassiveIds는 기존 5종 순서 뒤에 신규 3종을 붙여 반환한다', () => {
    expect(getMvpPassiveIds()).toEqual(['magnet', 'moveSpeed', 'maxHp', 'might', 'growth', 'armor', 'cooldown', 'greed'])
  })

  it('getPassiveEffect는 perLevel × 레벨이고, 저장값은 [0, maxLevel]로 자른다', () => {
    expect(getPassiveEffect({ might: 5 }, 'might')).toBe(20)
    expect(getPassiveEffect({ maxHp: 10 }, 'maxHp')).toBe(80)
    expect(getPassiveEffect({ armor: 99 }, 'armor')).toBe(6)
    expect(getPassiveEffect({ greed: -3 }, 'greed')).toBe(0)
    expect(getPassiveEffect({}, 'cooldown')).toBe(0)
    expect(clampPassiveLevel('magnet', 'x')).toBe(0)
  })

  it('isValidPassiveId는 카탈로그에 있는 키만 true', () => {
    expect(isValidPassiveId('magnet')).toBe(true)
    expect(isValidPassiveId('armor')).toBe(true)
    expect(isValidPassiveId('bogus')).toBe(false)
  })

  it('formatEffectLabel: Lv.0이면 다음 효과만, 중간이면 현재→다음, 최대면 현재만', () => {
    expect(formatEffectLabel('magnet', 0)).toBe('회수 반경 +2.7%')
    expect(formatEffectLabel('magnet', 1)).toBe('회수 반경 +2.7% → +5.4%')
    expect(formatEffectLabel('magnet', 10)).toBe('회수 반경 +27%')
    expect(formatEffectLabel('maxHp', 2)).toBe('체력 +16 → +24')
    expect(formatEffectLabel('armor', 6)).toBe('방어력 +6')
  })
})

import { describe, it, expect } from 'vitest'
import {
  PASSIVE_CATALOG,
  getMvpPassiveIds,
  getPriceFor,
  isValidPassiveId,
  formatEffectLabel,
} from './passiveCatalog.js'

describe('passiveCatalog', () => {
  it('MVP 5종은 enabled:true, maxLevel:3, 한국어 라벨이 모두 있다', () => {
    const mvp = ['magnet', 'moveSpeed', 'maxHp', 'might', 'growth']
    for (const id of mvp) {
      const e = PASSIVE_CATALOG[id]
      expect(e.enabled).toBe(true)
      expect(e.maxLevel).toBe(3)
      expect(typeof e.label).toBe('string')
      expect(e.label.length).toBeGreaterThan(0)
    }
  })

  it('2차 패시브 armor / cooldown / greed는 enabled:false로 등록되어 있다', () => {
    for (const id of ['armor', 'cooldown', 'greed']) {
      expect(PASSIVE_CATALOG[id].enabled).toBe(false)
    }
  })

  it('가격 공식이 기획대로 계산된다', () => {
    expect(getPriceFor('magnet', 1)).toBe(20)
    expect(getPriceFor('magnet', 2)).toBe(45)
    expect(getPriceFor('magnet', 3)).toBe(90)
    expect(getPriceFor('moveSpeed', 1)).toBe(22)
    expect(getPriceFor('might', 1)).toBe(25)
    expect(getPriceFor('growth', 1)).toBe(22)
    expect(getPriceFor('maxHp', 1)).toBe(20)
  })

  it('maxLevel 초과 / 음수 / 미지정 id는 null을 반환한다', () => {
    expect(getPriceFor('magnet', 4)).toBeNull()
    expect(getPriceFor('magnet', 0)).toBeNull()
    expect(getPriceFor('bogus', 1)).toBeNull()
  })

  it('getMvpPassiveIds는 기획 순서대로 5종을 반환한다', () => {
    expect(getMvpPassiveIds()).toEqual(['magnet', 'moveSpeed', 'maxHp', 'might', 'growth'])
  })

  it('isValidPassiveId는 카탈로그에 있는 키만 true', () => {
    expect(isValidPassiveId('magnet')).toBe(true)
    expect(isValidPassiveId('armor')).toBe(true)
    expect(isValidPassiveId('bogus')).toBe(false)
  })

  it('formatEffectLabel: Lv.0이면 다음 효과만, 중간이면 현재→다음, 최대면 현재만', () => {
    expect(formatEffectLabel('magnet', 0)).toBe('회수 반경 +8%')
    expect(formatEffectLabel('magnet', 1)).toBe('회수 반경 +8% → +16%')
    expect(formatEffectLabel('magnet', 3)).toBe('회수 반경 +24%')
  })
})

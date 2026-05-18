// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { STORAGE_KEY, getLevel, getAllLevels, purchase, _resetForTests } from './passiveUpgrades.js'

describe('passiveUpgrades storage layer', () => {
  beforeEach(() => {
    _resetForTests()
  })

  it('빈 저장소에서 getAllLevels()는 모든 카탈로그 키를 0으로 채워 반환한다', () => {
    const all = getAllLevels()
    expect(all.magnet).toBe(0)
    expect(all.moveSpeed).toBe(0)
    expect(all.maxHp).toBe(0)
    expect(all.might).toBe(0)
    expect(all.growth).toBe(0)
    expect(all.armor).toBe(0)
  })

  it('purchase 성공 시 저장 후 round-trip된다', () => {
    const r = purchase('magnet', 30)
    expect(r.ok).toBe(true)
    expect(r.nextLevel).toBe(1)
    expect(r.price).toBe(20)
    expect(r.nextGold).toBe(10)
    expect(getLevel('magnet')).toBe(1)
  })

  it('코인 부족이면 ok:false, 저장 변경 없음', () => {
    const r = purchase('magnet', 19)
    expect(r).toMatchObject({ ok: false, reason: 'insufficient', price: 20 })
    expect(getLevel('magnet')).toBe(0)
  })

  it('Lv.3까지만 구매 가능하고 4번째는 maxLevel로 차단된다', () => {
    expect(purchase('magnet', 9999).ok).toBe(true)
    expect(purchase('magnet', 9999).ok).toBe(true)
    expect(purchase('magnet', 9999).ok).toBe(true)
    const r = purchase('magnet', 9999)
    expect(r).toMatchObject({ ok: false, reason: 'maxLevel' })
    expect(getLevel('magnet')).toBe(3)
  })

  it('2차 패시브(armor/cooldown/greed)는 disabled로 차단된다', () => {
    expect(purchase('armor', 9999)).toMatchObject({ ok: false, reason: 'disabled' })
    expect(purchase('cooldown', 9999)).toMatchObject({ ok: false, reason: 'disabled' })
    expect(purchase('greed', 9999)).toMatchObject({ ok: false, reason: 'disabled' })
  })

  it('미지정 id는 unknownId로 차단된다', () => {
    expect(purchase('bogus', 9999)).toMatchObject({ ok: false, reason: 'unknownId' })
  })

  it('미지정 키는 보존하되 getLevel/getAllLevels에는 노출하지 않는다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ magnet: 1, futureKey: 5 }))
    expect(getLevel('futureKey')).toBe(0)
    expect(getAllLevels().futureKey).toBeUndefined()

    purchase('magnet', 9999)
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(raw.futureKey).toBe(5)
    expect(raw.magnet).toBe(2)
  })

  it('잘못된 JSON은 모두 0으로 처리하고 예외를 던지지 않는다', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(() => getAllLevels()).not.toThrow()
    expect(getAllLevels().magnet).toBe(0)
  })
})

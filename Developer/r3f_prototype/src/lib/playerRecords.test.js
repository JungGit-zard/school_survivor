// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  RECORD_KEYS,
  load,
  getRecord,
  incrementRecord,
  setBestIfHigher,
  snapshot,
  _resetForTests,
} from './playerRecords.js'

describe('playerRecords storage layer', () => {
  beforeEach(() => {
    _resetForTests()
  })

  it('빈 저장소에서 load()는 10키 모두 0으로 반환한다', () => {
    const all = load()
    for (const k of RECORD_KEYS) {
      expect(all[k]).toBe(0)
    }
  })

  it('incrementRecord는 카탈로그 키만 갱신한다', () => {
    incrementRecord('totalKills', 5)
    expect(getRecord('totalKills')).toBe(5)
    incrementRecord('totalKills', 3)
    expect(getRecord('totalKills')).toBe(8)
  })

  it('incrementRecord는 미지정 키를 무시한다', () => {
    incrementRecord('bogusKey', 100)
    expect(getRecord('bogusKey')).toBe(0)
    expect(load()).not.toHaveProperty('bogusKey')
  })

  it('setBestIfHigher는 더 큰 값만 저장한다', () => {
    setBestIfHigher('bestSurvivalSeconds', 90)
    setBestIfHigher('bestSurvivalSeconds', 80)
    expect(getRecord('bestSurvivalSeconds')).toBe(90)
    setBestIfHigher('bestSurvivalSeconds', 120)
    expect(getRecord('bestSurvivalSeconds')).toBe(120)
  })

  it('snapshot은 본 런 카운터를 정확히 누적한다 + totalRuns +1', () => {
    snapshot({ runKills: 50, runGold: 30, runLevelUps: 7, runSurvivalSeconds: 240 })
    const s = load()
    expect(s.totalRuns).toBe(1)
    expect(s.totalKills).toBe(50)
    expect(s.totalGold).toBe(30)
    expect(s.totalLevelUps).toBe(7)
    expect(s.totalSurvivalSeconds).toBe(240)
  })

  it('snapshot 두 번 호출은 합산된다', () => {
    snapshot({ runKills: 10, runGold: 5, runLevelUps: 2, runSurvivalSeconds: 60 })
    snapshot({ runKills: 20, runGold: 8, runLevelUps: 3, runSurvivalSeconds: 90 })
    const s = load()
    expect(s.totalRuns).toBe(2)
    expect(s.totalKills).toBe(30)
    expect(s.totalGold).toBe(13)
    expect(s.totalLevelUps).toBe(5)
    expect(s.totalSurvivalSeconds).toBe(150)
  })

  it('미지정 키를 disk에 보존하되 load/getRecord에는 노출하지 않는다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ totalKills: 3, futureKey: 7 }))
    expect(getRecord('futureKey')).toBe(0)
    expect(load().futureKey).toBeUndefined()

    incrementRecord('totalKills', 1)
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(raw.futureKey).toBe(7)
    expect(raw.totalKills).toBe(4)
  })

  it('잘못된 JSON은 모두 0으로 처리하고 예외를 던지지 않는다', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(() => load()).not.toThrow()
    expect(load().totalKills).toBe(0)
  })

  it('snapshot은 음수 입력을 0으로 clamp한다', () => {
    snapshot({ runKills: -10, runGold: -5, runLevelUps: -2, runSurvivalSeconds: -30 })
    const s = load()
    expect(s.totalRuns).toBe(1)
    expect(s.totalKills).toBe(0)
    expect(s.totalGold).toBe(0)
  })
})

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  CRITICAL_SHAKE_MAX_STRENGTH,
  CRITICAL_SHAKE_NORMAL_DURATION_MS,
  CRITICAL_SHAKE_NORMAL_X_RATIO,
  CRITICAL_SHAKE_STRONG_DURATION_MS,
  CRITICAL_SHAKE_STRONG_X_RATIO,
  createCriticalScreenShakeFrame,
  emitCriticalScreenShake,
  isCriticalScreenShakeReduced,
  resetCriticalScreenShakeForTest,
  sampleCriticalScreenShake,
} from './criticalScreenShake.js'

function frameAt(nowMs) {
  return sampleCriticalScreenShake(createCriticalScreenShakeFrame(), nowMs)
}

afterEach(() => {
  resetCriticalScreenShakeForTest()
  delete document.documentElement.dataset.reducedEffects
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined })
})

describe('critical screen shake runtime', () => {
  it('normal crit은 즉시 펄스 후 90ms 안에 감쇠하고 끝난다', () => {
    expect(emitCriticalScreenShake(4, 0, false, 1, 1000)).toBe(true)
    expect(frameAt(1000).horizontal).toBeCloseTo(CRITICAL_SHAKE_NORMAL_X_RATIO)
    expect(Math.abs(frameAt(1030).horizontal)).toBeLessThan(CRITICAL_SHAKE_NORMAL_X_RATIO)
    expect(frameAt(1000 + CRITICAL_SHAKE_NORMAL_DURATION_MS).active).toBe(false)
    expect(frameAt(1000 + CRITICAL_SHAKE_NORMAL_DURATION_MS).horizontal).toBe(0)
  })

  it('strong crit은 강한 진폭으로 140ms 동안 유지된다', () => {
    expect(emitCriticalScreenShake(1, 0, true, 1, 0)).toBe(true)
    expect(frameAt(0).horizontal).toBeCloseTo(CRITICAL_SHAKE_STRONG_X_RATIO)
    expect(frameAt(CRITICAL_SHAKE_STRONG_DURATION_MS - 1).active).toBe(true)
    expect(frameAt(CRITICAL_SHAKE_STRONG_DURATION_MS).active).toBe(false)
  })

  it('80ms coalesce 창에서는 가장 강한 요청만 남기고 시작 시각을 연장하지 않는다', () => {
    expect(emitCriticalScreenShake(1, 0, false, 1, 0)).toBe(true)
    expect(emitCriticalScreenShake(0, 1, false, 1, 40)).toBe(false)
    expect(emitCriticalScreenShake(0, 1, true, 1, 50)).toBe(true)
    expect(frameAt(139).active).toBe(true)
    expect(frameAt(140).active).toBe(false)
  })

  it('140ms cooldown에서는 새 요청을 무시하고 종료 직후에만 다시 시작한다', () => {
    expect(emitCriticalScreenShake(0, 0, false, 1, 0)).toBe(true)
    expect(frameAt(90).active).toBe(false)
    expect(emitCriticalScreenShake(0, 0, false, 1, 100)).toBe(false)
    expect(emitCriticalScreenShake(0, 0, false, 1, 140)).toBe(true)
  })

  it('요청 strength는 최대 1.25배로 제한한다', () => {
    expect(emitCriticalScreenShake(1, 0, false, 999, 0)).toBe(true)
    expect(frameAt(0).horizontal).toBeCloseTo(CRITICAL_SHAKE_NORMAL_X_RATIO * CRITICAL_SHAKE_MAX_STRENGTH)
  })

  it('0·NaN impact는 결정론적 +X fallback으로 안전하게 처리한다', () => {
    expect(emitCriticalScreenShake(Number.NaN, 0, false, 1, 0)).toBe(true)
    const frame = frameAt(0)
    expect(frame.impactX).toBe(1)
    expect(frame.impactZ).toBe(0)
    expect(Number.isFinite(frame.horizontal)).toBe(true)
  })

  it('reducedEffects와 prefers-reduced-motion에서는 이벤트와 샘플을 모두 끈다', () => {
    document.documentElement.dataset.reducedEffects = 'true'
    expect(isCriticalScreenShakeReduced()).toBe(true)
    expect(emitCriticalScreenShake(0, 0, false, 1, 0)).toBe(false)
    expect(frameAt(0).active).toBe(false)

    delete document.documentElement.dataset.reducedEffects
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    })
    expect(isCriticalScreenShakeReduced()).toBe(true)
    expect(emitCriticalScreenShake(0, 0, false, 1, 1)).toBe(false)
  })

  it('matchMedia는 최초 1회만 조회하고 reset 뒤 교체된 테스트 환경을 다시 읽는다', () => {
    let firstCalls = 0
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => { firstCalls += 1; return { matches: false } },
    })
    expect(isCriticalScreenShakeReduced()).toBe(false)
    expect(isCriticalScreenShakeReduced()).toBe(false)
    expect(firstCalls).toBe(1)

    resetCriticalScreenShakeForTest()
    let replacementCalls = 0
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => { replacementCalls += 1; return { matches: true } },
    })
    expect(isCriticalScreenShakeReduced()).toBe(true)
    expect(replacementCalls).toBe(1)
  })

  it('동작 줄이기를 켜면 활성 impulse를 취소하고 해제해도 재개하지 않는다', () => {
    expect(emitCriticalScreenShake(1, 0, false, 1, 0)).toBe(true)
    document.documentElement.dataset.reducedEffects = 'true'
    expect(frameAt(20).active).toBe(false)
    delete document.documentElement.dataset.reducedEffects
    expect(frameAt(30).active).toBe(false)
    // 기존 140ms cooldown은 여전히 유지된다.
    expect(emitCriticalScreenShake(1, 0, false, 1, 100)).toBe(false)
  })

  it('reset은 서로 다른 게임/테스트 런의 흔들림 상태를 격리한다', () => {
    emitCriticalScreenShake(0, 0, false, 1, 0)
    resetCriticalScreenShakeForTest()
    expect(frameAt(0).active).toBe(false)
    expect(emitCriticalScreenShake(0, 0, false, 1, 0)).toBe(true)
  })

  it('10,000개 rapid crit 요청도 단일 상태만 유지하며 첫 이벤트만 수용한다', () => {
    let accepted = 0
    for (let index = 0; index < 10_000; index += 1) {
      if (emitCriticalScreenShake(index % 2, 0, false, 1, 5000)) accepted += 1
    }
    expect(accepted).toBe(1)
    expect(frameAt(5000).active).toBe(true)
    expect(frameAt(5140).active).toBe(false)
  })
})

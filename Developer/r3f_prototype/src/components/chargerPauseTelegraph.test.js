import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MAX_PAUSABLE_FRAME_DELTA_SEC,
  RESUME_FRAME_DELTA_SEC,
  advancePausableElapsed,
  consumePausableRemaining,
  getGameplayFrameDeltaMs,
  getPausableFrameDeltaMs,
} from '../lib/pausableStateTimer.js'
import { GAMEPLAY_FIXED_STEP, MAX_GAMEPLAY_FRAME_DELTA } from '../lib/gameplayFrameTime.js'
import { ENEMY_STATS } from './Enemy.jsx'

const ENEMY_SOURCE = fs.readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
const TIMER_SOURCE = fs.readFileSync(new URL('../lib/pausableStateTimer.js', import.meta.url), 'utf8')

const FRAME_SEC = 1 / 60
const FRAME_MS = FRAME_SEC * 1000
const RESUME_MS = RESUME_FRAME_DELTA_SEC * 1000
const WARN_MS = 800

// Enemy.jsx의 프레임 루프를 그대로 재현한다.
//   · playing이 아니면 useFrame이 일찍 return → 누적 0, 그리고 wasPlayingRef=false
//   · 재개 첫 프레임은 고정 스텝 한 칸만 인정(정지 길이가 delta로 들어오므로)
//   · 그 뒤 프레임은 레포 계약 상한(0.5s)까지 실제 delta를 그대로 쓴다
// 비교군(wallClock)은 고치기 전 구현이다: performance.now() 기준 절대 타임스탬프.
function simulateWarn({ warnDurationMs, framesBeforePause, pauseWallClockMs, frameSec = FRAME_SEC }) {
  let elapsedMs = 0
  let wallClockMs = 0

  for (let frame = 0; frame < framesBeforePause; frame += 1) {
    wallClockMs += frameSec * 1000
    elapsedMs = advancePausableElapsed(elapsedMs, frameSec, false)
  }
  const pausedElapsedMs = elapsedMs

  // 일시정지: 벽시계만 흐른다. 프레임 콜백은 일찍 return하므로 elapsedMs는 그대로.
  wallClockMs += pauseWallClockMs

  // 재개 첫 프레임: raw delta는 정지 길이만큼 거대하지만 resumed=true라 한 칸만 인정된다.
  const resumeRawDeltaSec = pauseWallClockMs / 1000
  const fixedRemainingMs = warnDurationMs - advancePausableElapsed(elapsedMs, resumeRawDeltaSec, true)
  const wallClockRemainingMs = warnDurationMs - wallClockMs

  return { fixedRemainingMs, wallClockRemainingMs, pausedElapsedMs }
}

describe('돌진 예고 — pause가 경고 시간을 건너뛰지 않는다 (soundmini 결함 C)', () => {
  it('돌진 좀비의 warn/charge/stun 수치가 바뀌지 않았다', () => {
    const chargers = [ENEMY_STATS.E05, ENEMY_STATS.B01].filter((stats) => stats?.charger)
    expect(chargers.length).toBeGreaterThan(0)
    expect(ENEMY_SOURCE).toContain('warnDuration: 800, stunDuration: 1200, chargeDuration: 2200')
    expect(ENEMY_SOURCE).toContain('chefPhase2: { charger: true, chargeSpeed: 1.4, warnDist: 6.0, warnDuration: 800, stunDuration: 1200, chargeDuration: 2200 }')
  })

  // 남은 예고(400ms)보다 긴 정지만 고르면 옛 벽시계 방식은 반드시 예고를 통째로 삼킨다.
  it.each([500, 1_000, 30_000, 600_000])(
    '임의 길이(%ims)의 벽시계 정지가 남은 예고를 줄이지 않는다',
    (pauseWallClockMs) => {
      const framesBeforePause = Math.round(400 / FRAME_MS)
      const { fixedRemainingMs, wallClockRemainingMs } = simulateWarn({
        warnDurationMs: WARN_MS,
        framesBeforePause,
        pauseWallClockMs,
      })

      // 고친 뒤: 재개 첫 프레임은 고정 스텝 한 칸(16.67ms)만 소비한다 → 약 383ms 남는다.
      expect(fixedRemainingMs).toBeGreaterThan(300)
      expect(fixedRemainingMs).toBeCloseTo(400 - RESUME_MS, 6)

      // 고치기 전: 벽시계가 정지 중에도 흘러 남은 예고가 0 이하 = 예고 없이 즉시 돌진.
      expect(wallClockRemainingMs).toBeLessThanOrEqual(0)
      expect(fixedRemainingMs).toBeGreaterThan(wallClockRemainingMs)
    },
  )

  it('짧은 정지에서도 고친 방식이 벽시계보다 예고를 더 남긴다', () => {
    const { fixedRemainingMs, wallClockRemainingMs } = simulateWarn({
      warnDurationMs: WARN_MS,
      framesBeforePause: Math.round(400 / FRAME_MS),
      pauseWallClockMs: 100,
    })
    expect(wallClockRemainingMs).toBeCloseTo(300, 6)
    expect(fixedRemainingMs).toBeGreaterThan(wallClockRemainingMs)
  })

  it('정지하지 않으면 예고가 warnDuration 직후 한 프레임 안에 끝난다 — 길어지지 않는다', () => {
    let elapsedMs = 0
    let frames = 0
    while (elapsedMs < WARN_MS) {
      elapsedMs = advancePausableElapsed(elapsedMs, FRAME_SEC)
      frames += 1
    }
    expect(frames).toBeGreaterThanOrEqual(48)
    expect(frames).toBeLessThanOrEqual(49)
    expect(elapsedMs).toBeGreaterThanOrEqual(WARN_MS)
    expect(elapsedMs - WARN_MS).toBeLessThan(FRAME_MS)
  })

  it('넉백 잔량도 같은 모델을 쓴다 — 정지로 넉백이 소멸하지 않는다', () => {
    const knockbackMs = 160
    let remaining = consumePausableRemaining(knockbackMs, FRAME_SEC)
    expect(remaining).toBeCloseTo(knockbackMs - FRAME_MS, 6)
    // 10분 정지 뒤 재개 프레임은 한 칸만 깎는다.
    const afterLongPause = consumePausableRemaining(remaining, 600, true)
    expect(afterLongPause).toBeGreaterThan(0)
    expect(afterLongPause).toBeCloseTo(remaining - RESUME_MS, 6)
  })

  it('접촉 피해 쿨다운 잔량이 정지로 사라지지 않는다 (피해 즉시 발생 방지)', () => {
    const COOLDOWN_MS = 500
    let remaining = consumePausableRemaining(COOLDOWN_MS, FRAME_SEC)
    expect(remaining).toBeCloseTo(COOLDOWN_MS - FRAME_MS, 6)
    const afterLongPause = consumePausableRemaining(remaining, 600, true)
    expect(afterLongPause).toBeGreaterThan(400)
    // 고치기 전 벽시계 방식이었다면 600초가 통째로 지나 쿨다운이 끝나 있었다.
    expect(COOLDOWN_MS - (FRAME_MS + 600_000)).toBeLessThan(0)
  })
})

describe('프레임 delta 상한이 레포 계약(0.5s)과 일치한다', () => {
  it('상한 정본을 gameplayFrameTime.js에서 가져온다', () => {
    expect(MAX_PAUSABLE_FRAME_DELTA_SEC).toBe(MAX_GAMEPLAY_FRAME_DELTA)
    expect(MAX_PAUSABLE_FRAME_DELTA_SEC).toBe(0.5)
    expect(RESUME_FRAME_DELTA_SEC).toBe(GAMEPLAY_FIXED_STEP)
    // 자체 상한값을 다시 정의하지 않는다 — 1/30 리터럴이 돌아오면 저fps가 깨진다.
    expect(TIMER_SOURCE).toContain("from './gameplayFrameTime.js'")
    expect(TIMER_SOURCE).not.toContain('MAX_PAUSABLE_FRAME_DELTA_SEC = 1 / 30')
  })

  it('상한과 비정상 입력 처리', () => {
    expect(getPausableFrameDeltaMs(FRAME_SEC)).toBeCloseTo(FRAME_MS, 9)
    expect(getPausableFrameDeltaMs(600)).toBeCloseTo(MAX_GAMEPLAY_FRAME_DELTA * 1000, 9)
    expect(getGameplayFrameDeltaMs(600, true)).toBeCloseTo(RESUME_MS, 9)
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined, null]) {
      const value = getPausableFrameDeltaMs(bad)
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
    expect(getPausableFrameDeltaMs(Number.POSITIVE_INFINITY)).toBe(0)
  })

  // 핵심 회귀 잠금: 저fps에서 공칭 지속이 보존돼야 한다.
  it.each([
    [60, 1 / 60],
    [30, 1 / 30],
    [20, 1 / 20],
    [15, 1 / 15],
    [10, 1 / 10],
    [5, 1 / 5],
  ])('%ifps에서도 warn 800ms가 실시간 800ms에 끝난다', (_fps, deltaSec) => {
    let elapsedMs = 0
    let realMs = 0
    while (elapsedMs < WARN_MS) {
      elapsedMs = advancePausableElapsed(elapsedMs, deltaSec)
      realMs += deltaSec * 1000
    }
    // delta가 0.5s 계약 상한 아래이므로 게임시간 == 실시간이다.
    expect(elapsedMs).toBeCloseTo(realMs, 6)
    expect(realMs).toBeGreaterThanOrEqual(WARN_MS)
    expect(realMs - WARN_MS).toBeLessThan(deltaSec * 1000)
  })

  it.each([
    [2200, 'charge'],
    [1200, 'stun'],
    [1000, '격노 윈드업'],
    [900, '마틸다 웃음'],
    [500, '접촉 쿨다운'],
  ])('%ims(%s) 공칭 지속도 20fps에서 보존된다', (durationMs) => {
    const deltaSec = 1 / 20
    let elapsedMs = 0
    let realMs = 0
    while (elapsedMs < durationMs) {
      elapsedMs = advancePausableElapsed(elapsedMs, deltaSec)
      realMs += deltaSec * 1000
    }
    expect(realMs - durationMs).toBeLessThan(deltaSec * 1000)
  })

  it('1/30s 상한이었다면 20fps에서 예고가 1200ms로 늘어났다 (1차 수정의 회귀 대조군)', () => {
    const deltaSec = 1 / 20
    let elapsedMs = 0
    let realMs = 0
    while (elapsedMs < WARN_MS) {
      elapsedMs += Math.min(deltaSec, 1 / 30) * 1000 // 폐기된 1/30s 상한
      realMs += deltaSec * 1000
    }
    // 실시간 1200ms = 공칭 800ms의 1.5배. 15fps면 2배가 된다.
    expect(realMs).toBeCloseTo(1200, 0)
    expect(realMs / WARN_MS).toBeCloseTo(1.5, 2)
  })
})

describe('돌진 예고 — 벽시계 패턴이 소스에서 사라졌다', () => {
  it('돌진 상태기계가 절대 타임스탬프 대신 누적 경과를 쓴다', () => {
    expect(ENEMY_SOURCE).toContain('const frameDeltaMs = getGameplayFrameDeltaMs(delta, resumedFrame)')
    expect(ENEMY_SOURCE).toContain('chargeStateElapsedRef.current += frameDeltaMs')
    expect(ENEMY_SOURCE).toContain('chargeStateElapsedRef.current >= active.warnDuration')
    expect(ENEMY_SOURCE).toContain('chargeStateElapsedRef.current > (active.chargeDuration ?? 1200)')
    expect(ENEMY_SOURCE).toContain('chargeStateElapsedRef.current >= active.stunDuration')
    expect(ENEMY_SOURCE).not.toContain('stateTimer')
    expect(ENEMY_SOURCE).not.toMatch(/now - \w*[Ss]tateTimer/)
  })

  it('재개 첫 프레임을 식별해 pause를 막는다 (상한으로 막지 않는다)', () => {
    expect(ENEMY_SOURCE).toContain('const resumedFrame = !wasPlayingRef.current')
    expect(ENEMY_SOURCE).toContain("if (phase !== 'playing') wasPlayingRef.current = false")
    expect(ENEMY_SOURCE).toContain('wasPlayingRef.current = true')
  })

  it('넉백이 벽시계 기한 대신 잔량을 쓴다', () => {
    expect(ENEMY_SOURCE).toContain('knockbackRemainingRef.current = knockback.durationMs')
    expect(ENEMY_SOURCE).toContain('knockbackRemainingRef.current -= frameDeltaMs')
    expect(ENEMY_SOURCE).toContain('if (knockbackRemainingRef.current > 0) {')
    expect(ENEMY_SOURCE).not.toContain('knockbackUntilRef')
    expect(ENEMY_SOURCE).not.toContain('performance.now() + knockback.durationMs')
  })

  it('슬롯 재사용 시 이전 좀비의 상태 경과·넉백 잔량이 넘어오지 않는다', () => {
    expect(ENEMY_SOURCE).toContain('chargeStateElapsedRef.current = 0\n    knockbackRemainingRef.current = 0')
  })
})

describe('나머지 같은 계열 벽시계 타이머도 게임시간으로 통일됐다', () => {
  it('접촉 피해 500ms 쿨다운이 잔량 차감이고 두 경로가 같은 시계를 쓴다', () => {
    expect(ENEMY_SOURCE).toContain('if (contactDamageCooldownRef.current > 0) contactDamageCooldownRef.current -= frameDeltaMs')
    expect(ENEMY_SOURCE).toContain('if (contactDamageCooldownRef.current <= 0) {\n        contactDamageCooldownRef.current = 500')
    expect(ENEMY_SOURCE).toContain('contactDamageCooldownRef.current<=0){damagePlayer(stats.damage);contactDamageCooldownRef.current=500}')
    expect(ENEMY_SOURCE).not.toContain('lastContactDmgRef')
    expect(ENEMY_SOURCE.match(/contactDamageCooldownRef\.current\s*=\s*500/g)).toHaveLength(2)
  })

  it('E04/B04 발사 게이트가 벽시계 대신 게임시간 나이를 쓴다', () => {
    expect(ENEMY_SOURCE).toContain('enemyAgeMsRef.current += frameDeltaMs')
    expect(ENEMY_SOURCE).toContain('fireArgs.ageMs = enemyAgeMsRef.current')
    expect(ENEMY_SOURCE).toContain('fireArgs.nowMs = enemyAgeMsRef.current')
    expect(ENEMY_SOURCE).toContain('lastFireRef.current = enemyAgeMsRef.current')
    expect(ENEMY_SOURCE).not.toContain('spawnedAtRef')
  })

  it('마틸다 웃음과 B04 격노 윈드업이 같은 프레임 delta를 쓴다', () => {
    expect(ENEMY_SOURCE).toContain('matildaLaughRemainingRef.current -= frameDeltaMs')
    expect(ENEMY_SOURCE).not.toContain('matildaLaughRemainingRef.current -= delta * 1000')
    expect(ENEMY_SOURCE).toContain('chefTelegraphElapsedRef.current += frameDeltaMs')
    expect(ENEMY_SOURCE).toContain('chefArgs.telegraphElapsedMs = chefTelegraphElapsedRef.current')
    expect(ENEMY_SOURCE).not.toContain('chefTelegraphStartRef')
  })

  it('프레임 루프에 벽시계가 한 곳도 남지 않았다', () => {
    const loopStart = ENEMY_SOURCE.indexOf('useFrame((_, delta) => {')
    expect(loopStart).toBeGreaterThan(-1)
    const loopCode = ENEMY_SOURCE
      .slice(loopStart)
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n')
    expect(loopCode).not.toContain('performance.now()')
    expect(loopCode).not.toContain('Date.now()')
  })

  it('슬롯 재사용 시 접촉 쿨다운·발사 시각·나이가 모두 0으로 초기화된다', () => {
    expect(ENEMY_SOURCE).toContain(
      'wasPlayingRef.current = false\n'
      + '    chargeStateElapsedRef.current = 0\n'
      + '    knockbackRemainingRef.current = 0\n'
      + '    contactDamageCooldownRef.current = 0\n'
      + '    lastFireRef.current = 0',
    )
    expect(ENEMY_SOURCE).toContain('enemyAgeMsRef.current = 0')
  })
})

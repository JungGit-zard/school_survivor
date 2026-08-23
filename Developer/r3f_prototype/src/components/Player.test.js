import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { advancePlayerStep, resolvePlayerHitKnockback } from './Player.jsx'

describe('player hit knockback', () => {
  it('pushes the player backward from the last facing direction at a stable speed', () => {
    expect(resolvePlayerHitKnockback({ x: 3, z: 4 })).toEqual({ x: -2.4, y: 0, z: -3.2 })
    expect(resolvePlayerHitKnockback({ x: 0, z: 0 })).toEqual({ x: 0, y: 0, z: -4 })
  })

  it('uses the shared fixed-step clock for knockback, facing, and invulnerability timers', () => {
    const source = readFileSync(new URL('./Player.jsx', import.meta.url), 'utf8')
    expect(source).toContain("import { createGameplayFixedStepClock, runGameplayFixedSteps } from '../lib/gameplayFrameTime.js'")
    expect(source).toContain('runGameplayFixedSteps(gameplayClockRef.current, delta, (dt) =>')
    expect(source).toContain('knockbackRemainingMs.current - dt * 1000')
    expect(source).toContain('Math.min(1, dt * TURN_SPEED)')
    expect(source).toContain('invTimer.current += dt * 1000')
  })

  it('renders a token-driven green heal pulse above the player visual', () => {
    const source = readFileSync(new URL('./Player.jsx', import.meta.url), 'utf8')
    expect(source).toContain('function PlayerHealEffect')
    expect(source).toContain('<PlayerHealEffect token={healFlashToken} />')
    expect(source).toContain('<torusGeometry args={[0.32, 0.018, 8, 32]} />')
    expect(source).toContain('color="#8cffae"')
  })
})

describe('player footsteps', () => {
  const BASE_SPEED = 3      // useGameStore BASE_PLAYER.speed
  const DT = 1 / 60

  // 고정 스텝 루프를 그대로 흉내내서, 1초 동안 실제로 몇 발이 울리는지 센다.
  function countSteps({ seconds, moving, speed = BASE_SPEED }) {
    const state = { distance: 1.5 }
    let steps = 0
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      if (advancePlayerStep(state, typeof moving === 'function' ? moving(i) : moving, speed, DT)) steps++
    }
    return steps
  }

  // 걷기 시작하는 순간 한 발(디딤발)이 먼저 울리고, 그 뒤로 보폭마다 한 발씩이다.
  // 따라서 정상 보행 박자는 (총 발소리 - 첫 디딤발) / 초.
  const cadencePerSecond = (seconds, speed) => (countSteps({ seconds, moving: true, speed }) - 1) / seconds

  it('rings exactly twice a second while walking at the base speed', () => {
    expect(cadencePerSecond(10, BASE_SPEED)).toBe(2)
    expect(cadencePerSecond(60, BASE_SPEED)).toBe(2)
    // 걷기 시작 즉시 첫 발이 울린다(반 보 기다리지 않는다).
    expect(countSteps({ seconds: 1, moving: true })).toBe(3)
  })

  it('keeps the stride distance fixed, so speed upgrades quicken the cadence', () => {
    // 이동속도 +30%(moveSpeed 10레벨)면 걸음도 30% 빨라진다: 2.0 → 2.6보/초.
    // 3*1.3은 부동소수 경계라 매 보폭이 문턱에 정확히 걸린다. 긴 창으로 재고 근사 비교한다.
    expect(cadencePerSecond(100, BASE_SPEED * 1.3)).toBeCloseTo(2.6, 1)
    expect(cadencePerSecond(10, BASE_SPEED * 2)).toBe(4)
    // 정상 보행 간격은 어떤 속도에서도 POLYPHONY_COOLDOWN.playerStep(140ms)보다 성기다.
    // 즉 쿨다운은 조이스틱 연타만 막고 정상 걸음은 한 발도 잡아먹지 않는다.
    expect(1000 / cadencePerSecond(10, BASE_SPEED * 2)).toBeGreaterThan(140)
  })

  it('never rings while standing still', () => {
    expect(countSteps({ seconds: 10, moving: false })).toBe(0)
    expect(countSteps({ seconds: 10, moving: true, speed: 0 })).toBe(0)
  })

  it('stops ringing the moment the player stops, and resumes on the next move', () => {
    const state = { distance: 1.5 }
    // 걷는 중: 첫 프레임에 곧바로 한 발.
    expect(advancePlayerStep(state, true, BASE_SPEED, DT)).toBe(true)
    // 멈춤: 아무리 오래 서 있어도 무음.
    for (let i = 0; i < 600; i++) expect(advancePlayerStep(state, false, BASE_SPEED, DT)).toBe(false)
    // 다시 출발: 반 보 기다리지 않고 즉시 울린다.
    expect(advancePlayerStep(state, true, BASE_SPEED, DT)).toBe(true)
  })

  it('stays silent during knockback, because movingRef is forced false there', () => {
    const source = readFileSync(new URL('./Player.jsx', import.meta.url), 'utf8')
    expect(source).toContain('movingRef.current = false')
    expect(source).toContain('advancePlayerStep(stepState.current, movingRef.current, speed, dt)')
  })

  it('emits the registered playerStep sound quietly with rate jitter', () => {
    const source = readFileSync(new URL('./Player.jsx', import.meta.url), 'utf8')
    expect(source).toContain("emitSfx({ id: 'playerStep', volume: PLAYER_STEP_VOLUME, rate: 0.92 + Math.random() * 0.16 })")
    // 발소리는 배경이라 코드베이스의 어떤 emit보다도 조용해야 한다(최저 기존값 0.18).
    expect(source).toContain('const PLAYER_STEP_VOLUME = 0.15')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { playerPos, playerFacing, bagSwingState, enemyBodies, joystickDir } from '../lib/refs.js'
import { advanceRuntimeTime, getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { subscribeSfx } from '../lib/sfxEvents.js'

describe('useGameStore XP and reset behavior', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('큰 XP를 한 번에 얻어도 필요한 만큼 레벨업을 큐에 쌓는다', () => {
    useGameStore.getState().gainXp(40)
    const state = useGameStore.getState()

    expect(state.player.level).toBe(5)
    expect(state.player.xp).toBe(2)
    expect(state.player.xpToNext).toBe(22)
    expect(state.pendingLevelUps).toBe(4)
    expect(state.phase).toBe('levelup')
  })

  it('레벨업 선택을 할 때 pending 레벨업을 하나씩 소비한다', () => {
    useGameStore.getState().gainXp(40)
    useGameStore.getState().applyUpgrade('maxHealth')
    const state = useGameStore.getState()

    expect(state.player.maxHp).toBe(120)
    expect(state.pendingLevelUps).toBe(3)
    expect(state.phase).toBe('levelup')
  })

  it('resetGame은 store와 런타임 refs를 함께 초기화한다', () => {
    playerPos.set(9, 0, 9)
    playerFacing.set(1, 0, 0)
    bagSwingState.active = true
    bagSwingState.progress = 0.5
    bagSwingState.lastFired = 1234
    enemyBodies.set(1, { _enemyDead: false })
    joystickDir.x = 1
    joystickDir.z = -1
    joystickDir.active = true

    useGameStore.getState().resetGame()

    expect(playerPos.toArray()).toEqual([0, 0, 0])
    expect(playerFacing.toArray()).toEqual([0, 0, 1])
    expect(bagSwingState.active).toBe(false)
    expect(bagSwingState.progress).toBe(0)
    expect(bagSwingState.lastFired).toBe(-Infinity)
    expect(enemyBodies.size).toBe(0)
    expect(joystickDir).toEqual({ x: 0, z: 0, active: false })
    expect(getRuntimeElapsedMs()).toBe(0)
  })

  it('생존 마일스톤은 한 번만 골드를 지급한다', () => {
    useGameStore.getState().tickTime(60_000)
    useGameStore.getState().checkSurvivalMilestone()
    useGameStore.getState().checkSurvivalMilestone()

    const state = useGameStore.getState()
    expect(state.goldSession).toBe(1)
    expect(state.survivalMilestonesHit).toEqual([48_000])
    expect(state.recentMilestone.label).toBe('초반 생존 보너스')
  })

  it('자동 일시정지는 출처를 기록하고 이어하기에서 해제한다', () => {
    useGameStore.getState().pauseGame('auto')

    expect(useGameStore.getState().phase).toBe('paused')
    expect(useGameStore.getState().pauseSource).toBe('auto')

    useGameStore.getState().resumeGame()

    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState().pauseSource).toBeNull()
  })
})

describe('runtime elapsed time publication', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('publishes runtime time for the HUD at most once per 100ms', () => {
    advanceRuntimeTime(99)
    expect(useGameStore.getState().publishRuntimeElapsedMs()).toBe(false)
    expect(useGameStore.getState().elapsedMs).toBe(0)

    advanceRuntimeTime(1)
    expect(useGameStore.getState().publishRuntimeElapsedMs()).toBe(true)
    expect(useGameStore.getState().elapsedMs).toBe(100)
    expect(useGameStore.getState().publishRuntimeElapsedMs()).toBe(false)
  })

  it('keeps legacy tickTime callers synchronized with runtime time', () => {
    useGameStore.getState().tickTime(60_000)

    expect(useGameStore.getState().elapsedMs).toBe(60_000)
    expect(getRuntimeElapsedMs()).toBe(60_000)
  })

  it('records final-boss defeat without granting a pre-portal score bonus when the HUD snapshot lags', () => {
    useGameStore.setState({ elapsedMs: 59_999, bossAliveCount: 1, phase: 'playing' })
    advanceRuntimeTime(60_050)
    useGameStore.getState().recordBossDefeat()

    expect(useGameStore.getState().bossDefeated).toBe(true)
    expect(useGameStore.getState().bossBonus).toBe(0)
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('records final-boss defeat and plays its jingle once while duplicate reports are harmless', () => {
    const sfx = []
    const unsubscribe = subscribeSfx((event) => sfx.push(event.id))
    try {
      useGameStore.setState({ elapsedMs: 192_000, bossAliveCount: 1, phase: 'playing' })

      expect(useGameStore.getState().recordBossDefeat()).toBe(true)
      expect(useGameStore.getState()).toMatchObject({ phase: 'playing', bossAliveCount: 0, bossDefeated: true, bossBonus: 0 })

      expect(useGameStore.getState().recordBossDefeat()).toBe(false)
      expect(useGameStore.getState().bossBonus).toBe(0)
      expect(sfx.filter((id) => id === 'bossClearJingle')).toHaveLength(1)
    } finally {
      unsubscribe()
    }
  })

  it('applies the boss-clear bonus only for the 240s portal-clear path, never for boss-kill gameover', () => {
    useGameStore.setState({ elapsedMs: 192_000, bossAliveCount: 1, phase: 'playing' })
    advanceRuntimeTime(192_000)
    useGameStore.getState().recordBossDefeat()
    const player = useGameStore.getState().player
    useGameStore.setState({ player: { ...player, hp: 1 } })
    useGameStore.getState().damagePlayer(1, { ignoreInvulnerability: true })
    expect(useGameStore.getState().bossBonus).toBe(0)

    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ elapsedMs: 192_000, bossAliveCount: 1, phase: 'playing' })
    advanceRuntimeTime(192_000)
    useGameStore.getState().recordBossDefeat()
    advanceRuntimeTime(48_000)
    useGameStore.getState().clearStage()

    expect(useGameStore.getState()).toMatchObject({ phase: 'cleared', bossDefeated: true, bossBonus: 54 })
  })
})

describe('DEV E2E invincibility state', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('defaults to false and resetGame always clears it', () => {
    expect(useGameStore.getState().e2eInvincible).toBe(false)

    useGameStore.setState({ e2eInvincible: true })
    useGameStore.getState().resetGame()

    expect(useGameStore.getState().e2eInvincible).toBe(false)
  })

  it('blocks both normal and ignoreInvulnerability damage while enabled', () => {
    const initialHp = useGameStore.getState().player.hp
    useGameStore.setState({ e2eInvincible: true })

    useGameStore.getState().damagePlayer(30)
    useGameStore.getState().damagePlayer(initialHp * 3, { ignoreInvulnerability: true })

    expect(useGameStore.getState().player.hp).toBe(initialHp)
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('keeps normal damage behavior when the explicit flag is absent', () => {
    const initialHp = useGameStore.getState().player.hp

    useGameStore.getState().damagePlayer(10)

    expect(useGameStore.getState().player.hp).toBe(initialHp - 10)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { playerPos, playerFacing, bagSwingState, enemyBodies, joystickDir } from '../lib/refs.js'

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
  })
})

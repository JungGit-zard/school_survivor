// @vitest-environment jsdom
// 신 지정 사양(2026-08-09) 최소 검증.
//  S1 즉사: 마틸다 접촉은 플레이어 능력·무적프레임과 무관하게 즉사한다.
//  S2 체력: 마틸다 HP = 스폰 시점 플레이어 DPS × 1800초.
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../store/useGameStore.js'
import { _seedHydratedFirebaseProgressForTests, _setFirebaseProgressClientForTests } from './firebaseProgress.js'
import { MATILDA_ATTACK_SECONDS, estimatePlayerDps, matildaHpFromWeapons } from './playerDpsEstimate.js'

describe('마틸다 S1 즉사', () => {
  beforeEach(() => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()
  })

  it('최대 체력이 아무리 높아도 접촉 한 번에 즉사한다', () => {
    useGameStore.setState((state) => ({
      phase: 'playing',
      player: { ...state.player, maxHp: 999_999, hp: 999_999, invulnerable: false },
    }))

    useGameStore.getState().killPlayer('matilda')

    const state = useGameStore.getState()
    expect(state.player.hp).toBe(0)
    expect(state.phase).toBe('gameover')
    expect(state.deathCause).toBe('matilda')
  })

  it('무적프레임 중에도 즉사한다 (damagePlayer는 무효화되는 같은 상황에서)', () => {
    useGameStore.setState((state) => ({
      phase: 'playing',
      player: { ...state.player, maxHp: 500, hp: 500, invulnerable: true },
    }))

    // 대조군: 일반 피해는 무적프레임에 막혀 체력이 그대로다.
    useGameStore.getState().damagePlayer(120)
    expect(useGameStore.getState().player.hp).toBe(500)
    expect(useGameStore.getState().phase).toBe('playing')

    // 마틸다 즉사는 같은 무적 상태를 관통한다.
    useGameStore.getState().killPlayer('matilda')

    const state = useGameStore.getState()
    expect(state.player.hp).toBe(0)
    expect(state.phase).toBe('gameover')
    expect(state.deathCause).toBe('matilda')
  })
})

describe('마틸다 S2 체력 = DPS × 1800초', () => {
  it('30분 상수는 1800초다', () => {
    expect(MATILDA_ATTACK_SECONDS).toBe(1800)
  })

  it('활성 무기 DPS 합산의 1800배를 HP로 준다', () => {
    // damage 10, cooldown 500ms → 초당 2회 → 20 DPS. 비활성 무기는 합산 제외.
    const weapons = {
      live: { active: true, damage: 10, cooldown: 500 },
      dormant: { active: false, damage: 999, cooldown: 100 },
    }

    expect(estimatePlayerDps(weapons)).toBe(20)
    expect(matildaHpFromWeapons(weapons)).toBe(20 * MATILDA_ATTACK_SECONDS)
    expect(matildaHpFromWeapons(weapons)).toBe(36_000)
  })

  it('궤도형(hitsPerSecond)·다중타격·기대 치명타를 반영한다', () => {
    // damage 6 × count 2 × 2.5타/초 = 30, 기대 치명타 배율 1 + 0.1×(1.5-1) = 1.05
    const weapons = {
      orbital: { active: true, damage: 6, count: 2, hitsPerSecond: 2.5, critChance: 0.1, critMultiplier: 1.5 },
    }

    expect(estimatePlayerDps(weapons)).toBeCloseTo(31.5, 10)
    expect(matildaHpFromWeapons(weapons)).toBeCloseTo(31.5 * 1800, 6)
  })

  it('실제 런 시작 무기 구성에서도 유한한 양수 HP가 나온다', () => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()

    const hp = matildaHpFromWeapons(useGameStore.getState().weapons)

    expect(Number.isFinite(hp)).toBe(true)
    expect(hp).toBeGreaterThan(0)
  })
})

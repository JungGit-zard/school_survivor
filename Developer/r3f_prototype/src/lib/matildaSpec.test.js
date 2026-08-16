// @vitest-environment jsdom
// 신 지정 사양(2026-08-09) 최소 검증.
//  S1 즉사: 마틸다 접촉은 플레이어 능력·무적프레임과 무관하게 즉사한다.
//  S2 체력: 마틸다 HP = 스폰 시점 플레이어 DPS × 1800초.
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../store/useGameStore.js'
import { _seedHydratedFirebaseProgressForTests, _setFirebaseProgressClientForTests } from './firebaseProgress.js'
import { MATILDA_ATTACK_SECONDS, estimatePlayerDps, matildaHpFromWeapons } from './playerDpsEstimate.js'
import { WEAPON_CATALOG, getAllWeaponIds } from './weaponCatalog.js'

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

  it('궤도형(hitsPerSecond)·기대 치명타를 반영하되 count는 단일 대상에 곱하지 않는다', () => {
    // damage 6 × 2.5타/초 = 15, 기대 치명타 배율 1 + 0.1×(1.5-1) = 1.05 → 15.75.
    // 2026-08-15: 예전에는 여기에 count 2를 더 곱해 31.5를 기대했다. 하지만 궤도체를 늘려도
    // weaponTargeting.js의 break와 적별 lastHit 게이트 때문에 "한 적이 받는" 타격률은
    // hitsPerSecond로 고정된다 — count는 더 많은 적으로 퍼질 뿐 단일 대상 DPS를 올리지 않는다.
    // 마틸다는 단일 대상이라 이 곱셈이 그대로 HP 과대계상이 됐다.
    const weapons = {
      orbital: { active: true, damage: 6, count: 2, hitsPerSecond: 2.5, critChance: 0.1, critMultiplier: 1.5 },
    }

    expect(estimatePlayerDps(weapons)).toBeCloseTo(15.75, 10)
    expect(matildaHpFromWeapons(weapons)).toBeCloseTo(15.75 * 1800, 6)
  })

  // 회귀 방어(2026-08-15): 단일 대상 DPS는 퍼짐 계열 스탯에 반응하면 안 된다.
  it('projectileCount·count·strikeCount는 단일 대상 DPS를 바꾸지 않는다', () => {
    const plain = { active: true, damage: 10, cooldown: 500 }
    const spread = { ...plain, projectileCount: 4, count: 3, strikeCount: 3 }

    expect(estimatePlayerDps({ w: spread })).toBe(estimatePlayerDps({ w: plain }))
  })

  it('실제 런 시작 무기 구성에서도 유한한 양수 HP가 나온다', () => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()

    const hp = matildaHpFromWeapons(useGameStore.getState().weapons)

    expect(Number.isFinite(hp)).toBe(true)
    expect(hp).toBeGreaterThan(0)
  })

  // 회귀 방어(2026-08-15): 스토어가 카탈로그 damage를 양자화 없이 그대로 실어야 한다.
  // 예전에는 Math.round(x*10)/10을 걸어 studentLantern 0.15가 0.2로, chibiko 1.25가 1.3으로
  // 올라붙었고, 랜턴은 공격력 패시브를 만렙까지 찍어도 위력이 전혀 오르지 않았다.
  it('강화 없는 초기 무기 damage가 카탈로그 선언값과 정확히 같다', () => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()

    const weapons = useGameStore.getState().weapons
    const mismatched = getAllWeaponIds()
      .filter((id) => (WEAPON_CATALOG[id].base.damage ?? 0) !== (weapons[id]?.damage ?? 0))

    expect(mismatched).toEqual([])
  })
})

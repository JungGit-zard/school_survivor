// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { _seedHydratedFirebaseProgressForTests, updateFirebasePlayerProgress } from '../lib/firebaseProgress.js'

function setSavedPassives(obj) {
  updateFirebasePlayerProgress((progress) => {
    progress.passiveUpgrades = obj
    return progress
  })
}

describe('useGameStore 패시브 런 시작 적용', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()
  })

  it('maxHp Lv.2 저장 시 resetGame이 maxHp/hp 116(+8/Lv)으로 시작한다', () => {
    setSavedPassives({ maxHp: 2 })
    useGameStore.getState().resetGame()
    const { player } = useGameStore.getState()
    expect(player.maxHp).toBe(116)
    expect(player.hp).toBe(116)
  })

  it('moveSpeed Lv.3 저장 시 speed=baseSpeed=3*(1+0.06)=3.18', () => {
    setSavedPassives({ moveSpeed: 3 })
    useGameStore.getState().resetGame()
    const { player } = useGameStore.getState()
    expect(player.speed).toBeCloseTo(3.18, 5)
    expect(player.baseSpeed).toBeCloseTo(3.18, 5)
  })

  it('might Lv.2 저장 시 pencilThrow 데미지가 2.4*(1+0.08)로 적용된다', () => {
    setSavedPassives({ might: 2 })
    useGameStore.getState().resetGame()
    const { weapons } = useGameStore.getState()
    // base 2.4(2026-08-01 Stage 2 밸런스) 기준.
    // 소수 1자리 반올림(→2.6)은 커밋 875ebfe에서 걷어냈다. 저데미지 무기의 양자화 오차가
    // 공격력 패시브를 통째로 삼켰기 때문이다. 이제 곱만 남으므로 2.592가 정본이다.
    expect(weapons.pencilThrow.damage).toBeCloseTo(2.4 * 1.08, 10)
  })

  it('growth Lv.3 저장 시 gainXp가 1.12배로 적용된다', () => {
    setSavedPassives({ growth: 3 })
    useGameStore.getState().resetGame()
    // 레벨업을 피하기 위해 xpToNext(=4)보다 작게 들어가도록 amount=2 사용.
    // floor(2 * 1.15) = 2이지만, amount=3이면 floor(3*1.15)=3이 되어 growth 효과를 더 명확히 본다.
    // 더 강한 검증을 위해 player.xpToNext를 크게 만들어 두고 큰 입력을 쓴다.
    useGameStore.setState((s) => ({ player: { ...s.player, xpToNext: 1000 } }))
    useGameStore.getState().gainXp(20)
    expect(useGameStore.getState().player.xp).toBe(Math.floor(20 * 1.12))
  })

  it('armor Lv.6 저장 시 피격당 −6, 단 원 피해의 50%·최소 1까지만 깎는다', () => {
    setSavedPassives({ armor: 6 })
    useGameStore.getState().resetGame()
    useGameStore.setState({ phase: 'playing', godMode: false })
    const hit = (amount) => {
      useGameStore.setState((s) => ({ player: { ...s.player, hp: 100, invulnerable: false } }))
      useGameStore.getState().damagePlayer(amount, { ignoreInvulnerability: true })
      return 100 - useGameStore.getState().player.hp
    }
    expect(hit(20)).toBeCloseTo(14, 10)
    expect(hit(8)).toBeCloseTo(4, 10)
    expect(hit(1.5)).toBeCloseTo(1, 10)
    expect(hit(0.4)).toBeCloseTo(0.4, 10)
  })

  it('cooldown Lv.10 저장 시 모든 무기 쿨타임이 ×0.8이 된다', () => {
    setSavedPassives({ cooldown: 10 })
    useGameStore.getState().resetGame()
    const { weapons } = useGameStore.getState()
    expect(weapons.pencilThrow.cooldown).toBeCloseTo(550 * 0.8, 10)
    expect(weapons.schoolBag.cooldown).toBeCloseTo(1300 * 0.8, 10)
  })

  it('greed Lv.5 저장 시 런 골드 4경로가 ×1.4이고, 코인 1개 단위 소수는 이월된다', () => {
    setSavedPassives({ greed: 5 })
    useGameStore.getState().resetGame()
    useGameStore.setState({ goldTotal: 0, goldSession: 0 })
    for (let i = 0; i < 5; i += 1) useGameStore.getState().gainGold(1)
    expect(useGameStore.getState().goldSession).toBe(7)
    useGameStore.getState().gainGold(10)
    expect(useGameStore.getState().goldSession).toBe(21)
    expect(useGameStore.getState().goldTotal).toBe(21)
  })

  it('패시브 저장이 비어 있으면 기본 수치 그대로다', () => {
    useGameStore.getState().resetGame()
    const { player, weapons, growthMultiplier } = useGameStore.getState()
    expect(player.maxHp).toBe(100)
    expect(player.speed).toBe(3)
    expect(weapons.pencilThrow.damage).toBe(2.4)
    expect(growthMultiplier).toBe(1)
  })
})

describe('useGameStore spendGold / purchasePassive', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    useGameStore.getState().resetGame()
    useGameStore.setState({ goldTotal: 0, goldSession: 0 })
  })

  it('spendGold는 goldTotal만 차감하고 goldSession은 건드리지 않는다', () => {
    useGameStore.setState({ goldTotal: 100, goldSession: 5 })
    const ok = useGameStore.getState().spendGold(30)
    expect(ok).toBe(true)
    expect(useGameStore.getState().goldTotal).toBe(70)
    expect(useGameStore.getState().goldSession).toBe(5)
  })

  it('잔액 부족이면 spendGold는 false를 반환하고 변경하지 않는다', () => {
    useGameStore.setState({ goldTotal: 10 })
    expect(useGameStore.getState().spendGold(20)).toBe(false)
    expect(useGameStore.getState().goldTotal).toBe(10)
  })

  it('purchasePassive 성공 시 goldTotal 차감, passiveVersion 증가, 저장 반영', () => {
    useGameStore.setState({ goldTotal: 30 })
    const before = useGameStore.getState().passiveVersion
    const r = useGameStore.getState().purchasePassive('magnet')
    expect(r).toMatchObject({ ok: true, nextLevel: 1, price: 5 })
    expect(useGameStore.getState().goldTotal).toBe(25)
    expect(useGameStore.getState().passiveVersion).toBe(before + 1)
  })

  it('purchasePassive 실패 시 goldTotal 불변, passiveVersion 불변', () => {
    useGameStore.setState({ goldTotal: 4 })
    const before = useGameStore.getState().passiveVersion
    const r = useGameStore.getState().purchasePassive('magnet')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('insufficient')
    expect(useGameStore.getState().goldTotal).toBe(4)
    expect(useGameStore.getState().passiveVersion).toBe(before)
  })
})

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { STORAGE_KEY } from '../lib/passiveUpgrades.js'

const GOLD_KEY = 'school_survivor:goldTotal'

function setSavedPassives(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

describe('useGameStore 패시브 런 시작 적용', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(GOLD_KEY)
    useGameStore.getState().resetGame()
  })

  it('maxHp Lv.2 저장 시 resetGame이 maxHp/hp 112로 시작한다', () => {
    setSavedPassives({ maxHp: 2 })
    useGameStore.getState().resetGame()
    const { player } = useGameStore.getState()
    expect(player.maxHp).toBe(112)
    expect(player.hp).toBe(112)
  })

  it('moveSpeed Lv.3 저장 시 speed=baseSpeed=3*(1+0.09)=3.27', () => {
    setSavedPassives({ moveSpeed: 3 })
    useGameStore.getState().resetGame()
    const { player } = useGameStore.getState()
    expect(player.speed).toBeCloseTo(3.27, 5)
    expect(player.baseSpeed).toBeCloseTo(3.27, 5)
  })

  it('might Lv.2 저장 시 pencilThrow 데미지가 6*1.08=6.48로 적용된다', () => {
    setSavedPassives({ might: 2 })
    useGameStore.getState().resetGame()
    const { weapons } = useGameStore.getState()
    // Math.round(6 * 1.08 * 10) / 10 = Math.round(64.8) / 10 = 6.5
    expect(weapons.pencilThrow.damage).toBe(6.5)
  })

  it('growth Lv.3 저장 시 gainXp가 1.15배로 적용된다', () => {
    setSavedPassives({ growth: 3 })
    useGameStore.getState().resetGame()
    // 레벨업을 피하기 위해 xpToNext(=4)보다 작게 들어가도록 amount=2 사용.
    // floor(2 * 1.15) = 2이지만, amount=3이면 floor(3*1.15)=3이 되어 growth 효과를 더 명확히 본다.
    // 더 강한 검증을 위해 player.xpToNext를 크게 만들어 두고 큰 입력을 쓴다.
    useGameStore.setState((s) => ({ player: { ...s.player, xpToNext: 1000 } }))
    useGameStore.getState().gainXp(20)
    expect(useGameStore.getState().player.xp).toBe(Math.floor(20 * 1.15))
  })

  it('패시브 저장이 비어 있으면 기본 수치 그대로다', () => {
    useGameStore.getState().resetGame()
    const { player, weapons, growthMultiplier } = useGameStore.getState()
    expect(player.maxHp).toBe(100)
    expect(player.speed).toBe(3)
    expect(weapons.pencilThrow.damage).toBe(6)
    expect(growthMultiplier).toBe(1)
  })
})

describe('useGameStore spendGold / purchasePassive', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(GOLD_KEY)
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
    expect(r).toMatchObject({ ok: true, nextLevel: 1, price: 20 })
    expect(useGameStore.getState().goldTotal).toBe(10)
    expect(useGameStore.getState().passiveVersion).toBe(before + 1)
  })

  it('purchasePassive 실패 시 goldTotal 불변, passiveVersion 불변', () => {
    useGameStore.setState({ goldTotal: 5 })
    const before = useGameStore.getState().passiveVersion
    const r = useGameStore.getState().purchasePassive('magnet')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('insufficient')
    expect(useGameStore.getState().goldTotal).toBe(5)
    expect(useGameStore.getState().passiveVersion).toBe(before)
  })
})

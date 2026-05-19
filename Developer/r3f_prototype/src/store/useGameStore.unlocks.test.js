// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { STORAGE_KEY as RECORDS_KEY, _resetForTests as _resetRecords } from '../lib/playerRecords.js'
import { STORAGE_KEY as UNLOCKS_KEY, _resetForTests as _resetUnlocks } from '../lib/weaponUnlocks.js'

describe('useGameStore run-end unlock evaluator', () => {
  beforeEach(() => {
    _resetRecords()
    _resetUnlocks()
    localStorage.removeItem('school_survivor:goldTotal')
    localStorage.removeItem('school_survivor:passiveUpgrades')
    useGameStore.getState().resetGame()
    useGameStore.setState({
      runKills: 0,
      runLevelUps: 0,
      goldSession: 0,
      newlyUnlockedWeaponIds: [],
      elapsedMs: 0,
    })
  })

  it('runKills 80 후 _onRunEnd("gameover") → compassBlade 해금 + newlyUnlockedWeaponIds', () => {
    useGameStore.setState({ runKills: 80 })
    useGameStore.getState()._onRunEnd('gameover')
    const s = useGameStore.getState()
    expect(s.newlyUnlockedWeaponIds).toContain('compassBlade')
    // disk에도 반영
    const unlocks = JSON.parse(localStorage.getItem(UNLOCKS_KEY))
    expect(unlocks.compassBlade).toBe(1)
  })

  it('starter 무기는 newlyUnlockedWeaponIds에 절대 들어가지 않는다', () => {
    useGameStore.getState()._onRunEnd('gameover')
    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    expect(ids).not.toContain('pencilThrow')
    expect(ids).not.toContain('schoolBag')
  })

  it('이미 해금된 무기는 다음 런에서 newlyUnlockedWeaponIds에 포함되지 않는다', () => {
    useGameStore.setState({ runKills: 200 })
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('compassBlade')

    // 다음 런
    useGameStore.getState().resetGame()
    useGameStore.setState({ runKills: 0 })
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).not.toContain('compassBlade')
  })

  it('빈 런 → diff 빈 배열', () => {
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toEqual([])
  })

  it('5분 클리어 → stage1Clears 누적 +1', () => {
    useGameStore.setState({ elapsedMs: 300_000 })
    useGameStore.getState()._onRunEnd('cleared')
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY))
    expect(records.stage1Clears).toBe(1)
  })

  it('gameover phase는 stage1Clears 누적 안 함', () => {
    useGameStore.setState({ elapsedMs: 200_000 })
    useGameStore.getState()._onRunEnd('gameover')
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY))
    expect(records.stage1Clears).toBeUndefined()
  })

  it('snapshot은 평가 후에 적용된다 (더블카운트 방지)', () => {
    // runKills=80 으로 1차 평가 → compassBlade 해금 (runKills 분기로)
    // 평가 후 snapshot에서 totalKills=80 누적
    useGameStore.setState({ runKills: 80, goldSession: 30, runLevelUps: 5, elapsedMs: 240_000 })
    useGameStore.getState()._onRunEnd('gameover')
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY))
    expect(records.totalKills).toBe(80)
    expect(records.totalGold).toBe(30)
    expect(records.totalLevelUps).toBe(5)
    expect(records.totalSurvivalSeconds).toBe(240)
    expect(records.totalRuns).toBe(1)
    expect(records.bestSurvivalSeconds).toBe(240)
  })

  it('umbrellaGuard: runSurvivalSeconds:90 → 해금', () => {
    useGameStore.setState({ elapsedMs: 90_000 })
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('umbrellaGuard')
  })

  it('eraserBomb: goldSession:80 → 해금', () => {
    useGameStore.setState({ goldSession: 80 })
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('eraserBomb')
  })

  it('두 무기 동시 해금', () => {
    useGameStore.setState({ runKills: 80, goldSession: 80 })
    useGameStore.getState()._onRunEnd('gameover')
    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    expect(ids).toContain('compassBlade')
    expect(ids).toContain('eraserBomb')
  })

  it('resetGame은 newlyUnlockedWeaponIds를 비운다', () => {
    useGameStore.setState({ newlyUnlockedWeaponIds: ['compassBlade'] })
    useGameStore.getState().resetGame()
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toEqual([])
  })

  it('recordKill로 runKills 증가, resetGame으로 0 reset', () => {
    useGameStore.getState().recordKill()
    useGameStore.getState().recordKill()
    useGameStore.getState().recordKill()
    expect(useGameStore.getState().runKills).toBe(3)
    useGameStore.getState().resetGame()
    expect(useGameStore.getState().runKills).toBe(0)
  })

  // Phase 3 리뷰가 잡은 false-witness 정정: ordering 회귀를 실제로 잡는 테스트.
  // cumulative-only 분기를 가진 starlink가 임계 직전 pre-seed 상태에서 본 런만으로
  // 임계를 넘기는 시나리오. snapshot이 평가보다 먼저 일어나면 starlink가 잘못 unlock된다.
  it('평가→snapshot 순서 회귀: pre-seed totalKills:4920 + runKills:80 → starlink는 unlock 안 됨', () => {
    // totalKills 4920 pre-seed
    localStorage.setItem(
      'school_survivor:playerRecords',
      JSON.stringify({ totalKills: 4920 })
    )
    useGameStore.setState({ runKills: 80 })
    useGameStore.getState()._onRunEnd('gameover')

    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    // 정답 순서면: 평가 시 totalKills는 아직 4920 → starlink(5000 필요) 미달.
    expect(ids).not.toContain('starlink')
    // compassBlade는 runKills:80 분기로 unlock.
    expect(ids).toContain('compassBlade')

    // 그리고 snapshot은 평가 후 실행되어 totalKills를 5000으로 올렸어야 한다.
    const records = JSON.parse(localStorage.getItem('school_survivor:playerRecords'))
    expect(records.totalKills).toBe(5000)
  })

  it('newlyUnlockedWeaponIds는 frozen 배열이라 외부에서 mutate 불가', () => {
    useGameStore.setState({ runKills: 80 })
    useGameStore.getState()._onRunEnd('gameover')
    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    expect(Object.isFrozen(ids)).toBe(true)
  })

  it('recordBossKill은 cumulative bossKills를 즉시 누적', () => {
    useGameStore.getState().recordBossKill()
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY))
    expect(records.bossKills).toBe(1)
  })

  it('gainXp의 level-up 분기에서 runLevelUps 증가', () => {
    useGameStore.getState().gainXp(40) // 4번 레벨업
    expect(useGameStore.getState().runLevelUps).toBe(4)
  })

  it('damagePlayer HP≤0 분기는 _onRunEnd를 호출한다', () => {
    useGameStore.setState({ runKills: 80 })
    useGameStore.getState().damagePlayer(99999)
    expect(useGameStore.getState().phase).toBe('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('compassBlade')
  })

  it('clearStage는 _onRunEnd를 호출한다', () => {
    useGameStore.setState({ runKills: 80 })
    useGameStore.getState().clearStage()
    expect(useGameStore.getState().phase).toBe('cleared')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('compassBlade')
  })
})

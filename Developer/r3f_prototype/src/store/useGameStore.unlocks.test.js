// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { load as loadPlayerRecords, _resetForTests as _resetRecords } from '../lib/playerRecords.js'
import { getAllUnlocked, _resetForTests as _resetUnlocks } from '../lib/weaponUnlocks.js'
import { _seedHydratedFirebaseProgressForTests, _setFirebaseProgressClientForTests } from '../lib/firebaseProgress.js'

describe('useGameStore run-end unlock evaluator', () => {
  beforeEach(() => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    _resetRecords()
    _resetUnlocks()
    useGameStore.getState().resetGame()
    useGameStore.setState({
      runKills: 0,
      runLevelUps: 0,
      goldSession: 0,
      newlyUnlockedWeaponIds: [],
      elapsedMs: 0,
    })
  })

  it('누적 200처치를 넘긴 런 종료 → compassBlade 해금 + newlyUnlockedWeaponIds', () => {
    useGameStore.setState({ runKills: 200 })
    useGameStore.getState()._onRunEnd('gameover')
    const s = useGameStore.getState()
    expect(s.newlyUnlockedWeaponIds).toContain('compassBlade')
    // Firebase hydrate 정본에도 반영
    expect(getAllUnlocked()).toContain('compassBlade')
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

  it('4분 클리어 → stage1Clears 누적 +1', () => {
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState()._onRunEnd('cleared')
    const records = loadPlayerRecords()
    expect(records.stage1Clears).toBe(1)
  })

  it('Stage 2 clear increments stage2Clears without touching stage1Clears', () => {
    useGameStore.getState().resetGame('stage2')
    useGameStore.setState({ elapsedMs: 240_000 })

    useGameStore.getState()._onRunEnd('cleared')

    const records = loadPlayerRecords()
    expect(records.stage2Clears).toBe(1)
    expect(records.stage2BestSurvivalSec).toBe(240)
    expect(records.stage1Clears).toBe(0)
  })

  it('portal clear records Stage 1 then starts Stage 2 automatically', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ elapsedMs: 240_000, runKills: 80, goldSession: 12 })
    const beforeKey = useGameStore.getState().gameKey

    expect(useGameStore.getState().clearStageAndStartNext()).toBe(true)

    const s = useGameStore.getState()
    expect(s).toMatchObject({
      currentStageId: 'stage2',
      phase: 'playing',
      elapsedMs: 0,
      escapePortalActive: false,
      runKills: 0,
      goldSession: 0,
    })
    expect(s.gameKey).toBe(beforeKey + 1)
    const records = loadPlayerRecords()
    expect(records.stage1Clears).toBe(1)
    expect(records.bestSurvivalSeconds).toBe(240)
    expect(records.totalKills).toBe(80)
    expect(records.totalGold).toBe(12)
  })

  it('portal clear on final stage stays on the cleared result', () => {
    // stage4가 최종 스테이지(getNextStageId('stage4') === null) — 포탈 클리어 시 다음으로 넘어가지 않는다.
    useGameStore.getState().resetGame('stage4')
    useGameStore.setState({ elapsedMs: 240_000 })
    const beforeKey = useGameStore.getState().gameKey

    expect(useGameStore.getState().clearStageAndStartNext()).toBe(false)

    const s = useGameStore.getState()
    expect(s).toMatchObject({
      currentStageId: 'stage4',
      phase: 'cleared',
      elapsedMs: 240_000,
    })
    expect(s.gameKey).toBe(beforeKey)
    const records = loadPlayerRecords()
    expect(records.stage4Clears).toBe(1)
  })

  it('Stage 1 run at or after 180 seconds counts toward Stage 2 unlock progress', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ elapsedMs: 180_000 })

    useGameStore.getState()._onRunEnd('gameover')

    const records = loadPlayerRecords()
    expect(records.stage1Survival180Runs).toBe(1)
  })

  it('gameover phase는 stage1Clears 누적 안 함', () => {
    useGameStore.setState({ elapsedMs: 200_000 })
    useGameStore.getState()._onRunEnd('gameover')
    const records = loadPlayerRecords()
    expect(records.stage1Clears).toBe(0)
  })

  it('snapshot은 평가 후에 적용된다 (더블카운트 방지)', () => {
    // 누적 200처치를 만드는 런은 평가 시점에 한 번만 반영한다.
    useGameStore.setState({ runKills: 200, goldSession: 30, runLevelUps: 5, elapsedMs: 240_000 })
    useGameStore.getState()._onRunEnd('gameover')
    const records = loadPlayerRecords()
    expect(records.totalKills).toBe(200)
    expect(records.totalGold).toBe(30)
    expect(records.totalLevelUps).toBe(5)
    expect(records.totalSurvivalSeconds).toBe(240)
    expect(records.totalRuns).toBe(1)
    expect(records.bestSurvivalSeconds).toBe(240)
  })

  it('umbrellaGuard: totalSurvivalSeconds:300 → 해금', () => {
    useGameStore.setState({ elapsedMs: 300_000 })
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('umbrellaGuard')
  })

  it('eraserBomb: totalGold:160 → 해금', () => {
    useGameStore.setState({ goldSession: 160 })
    useGameStore.getState()._onRunEnd('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('eraserBomb')
  })

  it('두 무기 동시 해금', () => {
    useGameStore.setState({ runKills: 200, goldSession: 160 })
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

  it('평가→snapshot 순서: pre-seed totalKills:2400 + runKills:100 → starlink를 한 번 해금', () => {
    // Firebase hydrate 스냅샷에 totalKills 2400 pre-seed
    _seedHydratedFirebaseProgressForTests({ uid: 'unlock-order-user' }, {
      schemaVersion: 1,
      profile: { uid: 'unlock-order-user', displayName: '', nickname: '' },
      progress: { records: { totalKills: 2400 } },
    })
    useGameStore.setState({ runKills: 100 })
    useGameStore.getState()._onRunEnd('gameover')

    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    // 이번 런 포함 평가에서 정확히 2500에 도달해 starlink를 해금한다.
    expect(ids).toContain('starlink')
    expect(ids).toContain('compassBlade')

    // snapshot은 평가 후 실행되어 totalKills를 2500으로 올린다.
    const records = loadPlayerRecords()
    expect(records.totalKills).toBe(2500)
  })

  it('newlyUnlockedWeaponIds는 frozen 배열이라 외부에서 mutate 불가', () => {
    useGameStore.setState({ runKills: 200 })
    useGameStore.getState()._onRunEnd('gameover')
    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    expect(Object.isFrozen(ids)).toBe(true)
  })

  it('recordBossKill은 cumulative bossKills를 즉시 누적', () => {
    useGameStore.getState().recordBossKill()
    const records = loadPlayerRecords()
    expect(records.bossKills).toBe(1)
  })

  it('gainXp의 level-up 분기에서 runLevelUps 증가', () => {
    useGameStore.getState().gainXp(40) // 관문 9,13,17 소진 → 3번 레벨업
    expect(useGameStore.getState().runLevelUps).toBe(3)
  })

  it('damagePlayer HP≤0 분기는 _onRunEnd를 호출한다', () => {
    useGameStore.setState({ runKills: 200 })
    useGameStore.getState().damagePlayer(99999)
    expect(useGameStore.getState().phase).toBe('gameover')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('compassBlade')
  })

  it('clearStage는 _onRunEnd를 호출한다', () => {
    useGameStore.setState({ runKills: 200 })
    useGameStore.getState().clearStage()
    expect(useGameStore.getState().phase).toBe('cleared')
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('compassBlade')
  })
})

describe('보스 격퇴 보너스와 포탈 클리어 분리', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests()
    _resetRecords()
    _resetUnlocks()
    useGameStore.getState().resetGame('stage3')
    useGameStore.setState({ elapsedMs: 150_000 })
  })

  it('다중 보스는 모두 처치할 때까지 카운트만 줄이고, 마지막 처치도 playing을 유지한다', () => {
    useGameStore.getState().spawnBoss()
    useGameStore.getState().spawnBoss()
    expect(useGameStore.getState().bossAliveCount).toBe(2)
    expect(useGameStore.getState().bossSpawned).toBe(true)

    // 첫 보스 처치 — 아직 한 기 생존 → 카운트만 감소.
    useGameStore.getState().recordBossDefeat()
    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState().bossAliveCount).toBe(1)
    expect(useGameStore.getState().bossBonus).toBe(0)

    // 마지막 보스 처치 — 보너스만 기록하고 포탈 전까지 계속 플레이.
    useGameStore.getState().recordBossDefeat()
    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState().bossAliveCount).toBe(0)
    expect(useGameStore.getState()).toMatchObject({ bossDefeated: true, bossBonus: 0 })
  })

  it('단일 보스도 격퇴 후 playing을 유지하고, 포탈이 런 종료를 처리한다', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().spawnBoss()
    expect(useGameStore.getState().bossAliveCount).toBe(1)

    useGameStore.getState().recordBossDefeat()
    expect(useGameStore.getState().phase).toBe('playing')
    expect(useGameStore.getState()).toMatchObject({ bossDefeated: true, bossBonus: 0 })

    expect(loadPlayerRecords().totalRuns).toBe(0)
    expect(useGameStore.getState().clearStageAndStartNext()).toBe(true)
    expect(loadPlayerRecords()).toMatchObject({ stage1Clears: 1, totalRuns: 1 })
  })

  it('resetGame은 bossAliveCount를 0으로 되돌린다', () => {
    useGameStore.getState().spawnBoss()
    useGameStore.getState().spawnBoss()
    expect(useGameStore.getState().bossAliveCount).toBe(2)
    useGameStore.getState().resetGame('stage3')
    expect(useGameStore.getState().bossAliveCount).toBe(0)
    expect(useGameStore.getState().bossDefeated).toBe(false)
    expect(useGameStore.getState().bossSpawned).toBe(false)
  })
})

describe('useGameStore weapon unlock acknowledgement', () => {
  it('clears only the pending new-unlock notice without changing entitlement', () => {
    useGameStore.setState({ newlyUnlockedWeaponIds: Object.freeze(['compassBlade']) })

    useGameStore.getState().acknowledgeNewWeaponUnlocks()

    const ids = useGameStore.getState().newlyUnlockedWeaponIds
    expect(ids).toEqual([])
    expect(Object.isFrozen(ids)).toBe(true)
  })
})

describe('useGameStore unavailable Firebase progress', () => {
  it('continues reset and run-end in memory without hydrated-only getters', async () => {
    const { _resetFirebaseProgressForTests } = await import('../lib/firebaseProgress.js')
    _resetFirebaseProgressForTests()

    expect(() => useGameStore.getState().resetGame('stage1')).not.toThrow()
    useGameStore.setState({ runKills: 200, elapsedMs: 180_000 })
    expect(() => useGameStore.getState()._onRunEnd('gameover')).not.toThrow()
    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('compassBlade')
  })
})

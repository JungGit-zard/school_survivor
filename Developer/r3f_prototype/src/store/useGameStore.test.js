import { describe, it, expect, beforeEach, vi } from 'vitest'

// 랭킹 제출만 가짜로 바꾼다. describeSubmission은 실제 구현을 그대로 써야 스토어가 결과를
// 올바르게 접는지 검증된다(둘 다 가짜면 매핑이 틀려도 테스트가 통과한다).
const ranking = vi.hoisted(() => ({ submitRun: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: ranking.submitRun,
}))

import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { playerPos, playerFacing, bagSwingState, enemyBodies, joystickDir } from '../lib/refs.js'
import { advanceRuntimeTime, getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { subscribeSfx } from '../lib/sfxEvents.js'
import { getBossSpawnSec } from '../lib/burstEvents.js'
import { _resetForTests as resetWeaponUnlocksForTests, setUnlocked } from '../lib/weaponUnlocks.js'

describe('useGameStore XP and reset behavior', () => {
  beforeEach(() => {
    resetWeaponUnlocksForTests()
    useGameStore.getState().resetGame()
  })

  // 곡선 정본이 start 4 / growth 1.24에서 start 9 / growth 1.12로 바뀌었다(초반 XP 스노볼 제거).
  // 관문 9,13,17,22 → 40 XP면 9+13+17=39를 쓰고 xp 1이 남아 레벨4, 다음 관문은 22.
  it('큰 XP를 한 번에 얻어도 필요한 만큼 레벨업을 큐에 쌓는다', () => {
    useGameStore.getState().gainXp(40)
    const state = useGameStore.getState()

    expect(state.player.level).toBe(4)
    expect(state.player.xp).toBe(1)
    expect(state.player.xpToNext).toBe(22)
    expect(state.pendingLevelUps).toBe(3)
    expect(state.phase).toBe('levelup')
  })

  it('레벨업 선택을 할 때 pending 레벨업을 하나씩 소비한다', () => {
    useGameStore.getState().gainXp(40)
    useGameStore.getState().applyUpgrade('maxHealth')
    const state = useGameStore.getState()

    expect(state.player.maxHp).toBe(107)
    expect(state.pendingLevelUps).toBe(2)
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

  it('stores the deterministic boss spawn second from the explicit stage burst table', () => {
    expect(useGameStore.getState().bossSpawnSec).toBe(getBossSpawnSec('stage1'))

    useGameStore.getState().resetGame('stage2')
    expect(useGameStore.getState().bossSpawnSec).toBe(getBossSpawnSec('stage2'))
  })

  it('normalizes an invalid reset stage before selecting the runtime start position', () => {
    useGameStore.getState().resetGame('not-a-stage')

    expect(useGameStore.getState().currentStageId).toBe('stage1')
    expect(playerPos.toArray()).toEqual([0, 0, 0])
  })

  it('queues prerequisite follow-up cards for this run only and consumes only the displayed keys', () => {
    setUnlocked('chibiko')
    useGameStore.setState((state) => ({ player: { ...state.player, level: 8 } }))

    useGameStore.getState().applyUpgrade('acquireChibiko')
    useGameStore.getState().applyUpgrade('acquireBoxCutter')

    expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys)
      .toEqual(['acquireHanako', 'acquireBikittyCutter'])

    useGameStore.setState({ phase: 'levelup', levelUpChoiceSerial: 8 })
    useGameStore.getState().consumeGuaranteedUpgradeChoices(['acquireHanako'], 8)
    expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys)
      .toEqual(['acquireBikittyCutter'])

    useGameStore.getState().consumeGuaranteedUpgradeChoices(['acquireBikittyCutter'], 7)
    expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys)
      .toEqual(['acquireBikittyCutter'])

    useGameStore.getState().resetGame()
    expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys).toEqual([])
  })

  it('applyUpgrade는 10개 보유 상한에서 새 계정 해금 무기를 즉시 활성화하지 않고 교체 대기를 연다', () => {
    setUnlocked('starlink')
    const activeAtCap = ['pencilThrow', 'schoolBag', 'boxCutter', 'tumbler', 'scienceFlask', 'bell', 'stunGun', 'onigiri', 'guidedMissile', 'compassBlade']
    useGameStore.setState((state) => ({
      player: { ...state.player, level: 8 },
      phase: 'levelup',
      pendingLevelUps: 1,
      weapons: Object.fromEntries(Object.entries(state.weapons).map(([id, weapon]) => [
        id,
        {
          ...weapon,
          active: activeAtCap.includes(id),
          level: activeAtCap.includes(id) ? 1 : weapon.level,
        },
      ])),
    }))

    useGameStore.getState().applyUpgrade('acquireStarlink')
    expect(useGameStore.getState().weapons.starlink.active).toBe(false)
    expect(useGameStore.getState().pendingWeaponReplacement).toEqual({
      upgradeKey: 'acquireStarlink',
      weaponId: 'starlink',
    })
    expect(useGameStore.getState().phase).toBe('levelup')

    const beforeDamage = useGameStore.getState().weapons.pencilThrow.damage
    useGameStore.getState().cancelWeaponReplacement()
    useGameStore.getState().applyUpgrade('pencilDamage')
    expect(useGameStore.getState().weapons.pencilThrow.damage).toBeCloseTo(beforeDamage + 1.2, 10)
  })

  it('무기 교체 확정은 선택한 기존 무기를 초기화하고 신규 무기를 Lv.1로 넣은 뒤 레벨업을 소비한다', () => {
    setUnlocked('starlink')
    const activeAtCap = ['pencilThrow', 'schoolBag', 'boxCutter', 'tumbler', 'scienceFlask', 'bell', 'stunGun', 'onigiri', 'guidedMissile', 'compassBlade']
    useGameStore.setState((state) => ({
      player: { ...state.player, level: 8 },
      phase: 'levelup',
      pendingLevelUps: 1,
      weapons: Object.fromEntries(Object.entries(state.weapons).map(([id, weapon]) => [
        id,
        id === 'schoolBag'
          ? { ...weapon, active: true, level: 4, damage: 99, range: 2 }
          : { ...weapon, active: activeAtCap.includes(id), level: activeAtCap.includes(id) ? 1 : weapon.level },
      ])),
    }))

    useGameStore.getState().applyUpgrade('acquireStarlink')
    expect(useGameStore.getState().confirmWeaponReplacement('schoolBag')).toBe(true)

    const state = useGameStore.getState()
    expect(state.weapons.schoolBag).toMatchObject({ active: false, level: 0 })
    expect(state.weapons.schoolBag.damage).not.toBe(99)
    expect(state.weapons.schoolBag.range).not.toBe(2)
    expect(state.weapons.starlink).toMatchObject({ active: true, level: 1 })
    expect(Object.values(state.weapons).filter((weapon) => weapon.active)).toHaveLength(10)
    expect(state.pendingWeaponReplacement).toBeNull()
    expect(state.pendingLevelUps).toBe(0)
    expect(state.phase).toBe('playing')
  })

  it('무기 교체 취소는 기존 10개를 유지하고 레벨업 선택 상태로 돌아간다', () => {
    setUnlocked('starlink')
    const activeAtCap = ['pencilThrow', 'schoolBag', 'boxCutter', 'tumbler', 'scienceFlask', 'bell', 'stunGun', 'onigiri', 'guidedMissile', 'compassBlade']
    useGameStore.setState((state) => ({
      player: { ...state.player, level: 8 },
      phase: 'levelup',
      pendingLevelUps: 1,
      weapons: Object.fromEntries(Object.entries(state.weapons).map(([id, weapon]) => [
        id,
        { ...weapon, active: activeAtCap.includes(id), level: activeAtCap.includes(id) ? 1 : weapon.level },
      ])),
    }))
    const beforeWeapons = useGameStore.getState().weapons

    useGameStore.getState().applyUpgrade('acquireStarlink')
    expect(useGameStore.getState().cancelWeaponReplacement()).toBe(true)

    expect(useGameStore.getState().weapons).toEqual(beforeWeapons)
    expect(useGameStore.getState().pendingWeaponReplacement).toBeNull()
    expect(useGameStore.getState().pendingLevelUps).toBe(1)
    expect(useGameStore.getState().phase).toBe('levelup')
  })

  it('신규 무기 폐기는 기존 10개를 유지하고 레벨업을 소비한다', () => {
    setUnlocked('starlink')
    const activeAtCap = ['pencilThrow', 'schoolBag', 'boxCutter', 'tumbler', 'scienceFlask', 'bell', 'stunGun', 'onigiri', 'guidedMissile', 'compassBlade']
    useGameStore.setState((state) => ({
      player: { ...state.player, level: 8 },
      phase: 'levelup',
      pendingLevelUps: 1,
      weapons: Object.fromEntries(Object.entries(state.weapons).map(([id, weapon]) => [
        id,
        { ...weapon, active: activeAtCap.includes(id), level: activeAtCap.includes(id) ? 1 : weapon.level },
      ])),
    }))
    const beforeWeapons = useGameStore.getState().weapons

    useGameStore.getState().applyUpgrade('acquireStarlink')
    expect(useGameStore.getState().discardPendingWeapon()).toBe(true)

    expect(useGameStore.getState().weapons).toEqual(beforeWeapons)
    expect(useGameStore.getState().pendingWeaponReplacement).toBeNull()
    expect(useGameStore.getState().pendingLevelUps).toBe(0)
    expect(useGameStore.getState().phase).toBe('playing')
  })

  it('applyUpgrade는 최소 레벨과 계정 해금을 재확인해 새 무기 획득 우회를 막는다', () => {
    setUnlocked('starlink')
    useGameStore.setState((state) => ({ player: { ...state.player, level: 2 } }))
    useGameStore.getState().applyUpgrade('acquireStarlink')
    expect(useGameStore.getState().weapons.starlink.active).toBe(false)

    useGameStore.setState((state) => ({ player: { ...state.player, level: 8 } }))
    useGameStore.getState().applyUpgrade('acquireCompassBlade')
    expect(useGameStore.getState().weapons.compassBlade.active).toBe(false)
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

  it('healPlayer는 실제 HP가 회복될 때만 힐 이펙트 토큰을 올린다', () => {
    const player = useGameStore.getState().player
    useGameStore.setState({ player: { ...player, hp: 60, maxHp: 100, healFlashToken: 0 } })

    useGameStore.getState().healPlayer(15)
    expect(useGameStore.getState().player).toMatchObject({ hp: 75, healFlashToken: 1 })

    useGameStore.getState().healPlayer(99)
    expect(useGameStore.getState().player).toMatchObject({ hp: 100, healFlashToken: 2 })

    useGameStore.getState().healPlayer(5)
    expect(useGameStore.getState().player).toMatchObject({ hp: 100, healFlashToken: 2 })
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

  it('pays the boss bonus only on a portal clear, never on a boss-kill gameover', () => {
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

    // base 240 + 탈출 보너스 15%(36) = 276, 보스 보너스는 그 20% = 55.
    expect(useGameStore.getState()).toMatchObject({ phase: 'cleared', bossDefeated: true, bossBonus: 55 })
  })
})

// 2026-08-29: "최고기록을 갱신했는데 랭킹 보드가 비어 있다"의 절반은 스토어가 제출 결과를
// 통째로 버리고 있었기 때문이다(submitRun(...).catch(() => {})). 결과를 상태로 남기지 않으면
// 실패는 console.warn에서 끝나고 플레이어는 원인을 알 방법이 없다.
describe('랭킹 제출 결과가 스토어 상태로 남는다', () => {
  beforeEach(() => {
    ranking.submitRun.mockReset()
    useGameStore.setState({ rankingSubmission: null })
  })

  const run = { stageId: 'stage2', score: 415, timeMs: 295_499, cleared: false }

  it('제출 중에는 pending, 새 최고점이 기록되면 recorded로 바뀐다', async () => {
    let resolveSubmit
    ranking.submitRun.mockReturnValue(new Promise((resolve) => { resolveSubmit = resolve }))

    const done = useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)
    // 보드가 열려 있는 동안 제출이 아직 왕복 중일 수 있다. 이때 "기록 없음"만 보이면
    // 플레이어는 기록이 유실된 줄 안다 — pending이 그 구간을 메운다.
    expect(useGameStore.getState().rankingSubmission).toMatchObject({ status: 'pending', ...run })

    resolveSubmit({ written: ['stage/stage2/daily'], skipped: [], failed: [] })
    await done

    expect(useGameStore.getState().rankingSubmission).toMatchObject({ status: 'recorded', score: 415 })
  })

  it('전부 스킵(기존 최고점이 더 높음)은 실패가 아니라 notBest로 남는다', async () => {
    ranking.submitRun.mockResolvedValue({ written: [], skipped: ['a', 'b'], failed: [] })

    await useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)

    expect(useGameStore.getState().rankingSubmission.status).toBe('notBest')
  })

  it('규칙 거부는 failed/rejected로 남아 화면이 읽을 수 있다', async () => {
    ranking.submitRun.mockResolvedValue({ written: [], skipped: [], failed: ['a'], failureKind: 'rejected' })

    await useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)

    expect(useGameStore.getState().rankingSubmission).toMatchObject({ status: 'failed', reason: 'rejected' })
  })

  it('시즌 밖 제출은 failed가 아니라 notSubmitted/seasonOff로 구분된다', async () => {
    ranking.submitRun.mockResolvedValue({ written: [], skipped: [], failed: [], reason: 'seasonOff' })

    await useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)

    expect(useGameStore.getState().rankingSubmission).toMatchObject({ status: 'notSubmitted', reason: 'seasonOff' })
  })

  it('submitRun이 통째로 throw해도 게임은 멈추지 않고 network 실패로만 남는다', async () => {
    ranking.submitRun.mockRejectedValue(new Error('boom'))

    await expect(useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)).resolves.toBeUndefined()

    expect(useGameStore.getState().rankingSubmission).toMatchObject({ status: 'failed', reason: 'network' })
  })

  it('재시도는 실패한 제출에만 동작하고, 성공/스킵은 다시 쏘지 않는다', async () => {
    ranking.submitRun.mockResolvedValue({ written: [], skipped: [], failed: ['a'], failureKind: 'network' })
    await useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)

    // 재시도할 유저가 없으면 signedOut으로 갈아끼우고 서버를 두드리지 않는다.
    expect(await useGameStore.getState().retryRankingSubmission()).toBe(false)
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
    expect(useGameStore.getState().rankingSubmission).toMatchObject({ status: 'notSubmitted', reason: 'signedOut' })

    // 성공 상태에서는 재시도 자체가 no-op이다.
    useGameStore.setState({ rankingSubmission: { ...run, status: 'recorded' } })
    expect(await useGameStore.getState().retryRankingSubmission()).toBe(false)
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
  })

  it('재시도는 원래 런의 점수와 스테이지를 그대로 다시 보낸다', async () => {
    ranking.submitRun.mockResolvedValue({ written: [], skipped: [], failed: ['a'], failureKind: 'network' })
    await useGameStore.getState().submitRunToRanking({ uid: 'me' }, run)

    useAuthStore.setState({ user: { uid: 'me' } })
    ranking.submitRun.mockResolvedValue({ written: ['a'], skipped: [], failed: [] })
    expect(await useGameStore.getState().retryRankingSubmission()).toBe(true)

    expect(ranking.submitRun).toHaveBeenLastCalledWith({ uid: 'me' }, run)
    expect(useGameStore.getState().rankingSubmission.status).toBe('recorded')
    useAuthStore.setState({ user: null })
  })

  // 진행도가 하이드레이트되지 않은 런은 랭킹 제출을 통째로 건너뛴다. 예전에는 그 사실이
  // 어디에도 남지 않아 "기록을 세웠는데 보드가 비었다"의 원인 후보로 떠오르지도 못했다.
  it('진행도 미하이드레이트 런은 progressUnavailable로 남는다 — 침묵하지 않는다', () => {
    // 로그인은 시켜둔다. 그래야 signedOut이 아니라 progressUnavailable에 걸리는 걸 확인할 수 있다 —
    // 둘 다 아니면 어느 쪽 사유로 멈췄는지 이 테스트가 구분하지 못한다.
    useAuthStore.setState({ user: { uid: 'me' } })
    _resetFirebaseProgressForTests()
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ elapsedMs: 60_000, phase: 'playing' })
    advanceRuntimeTime(60_000)

    useGameStore.getState()._onRunEnd('gameover')

    expect(ranking.submitRun).not.toHaveBeenCalled()
    expect(useGameStore.getState().rankingSubmission).toMatchObject({
      status: 'notSubmitted',
      reason: 'progressUnavailable',
    })
    useAuthStore.setState({ user: null })
    _seedHydratedFirebaseProgressForTests()
  })
})

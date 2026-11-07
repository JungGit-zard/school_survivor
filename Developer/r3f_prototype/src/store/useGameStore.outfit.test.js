// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../lib/firebaseRanking.js', () => ({ prepareRankingSubmission: r => r, submitRun: async () => ({ status: 'skipped' }), describeSubmission: () => ({}), retryPendingRankings: async () => ({ written: [], skipped: [], failed: [] }) }))
import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  applyCloudProgressSnapshot,
  buildCloudProgressSnapshot,
  readFirebasePlayerProgress,
  updateFirebasePlayerProgress,
} from '../lib/firebaseProgress.js'
import { _resetGuestSessionSettingsForTests, saveGuestSessionSettings, saveTitleSettings } from '../lib/titleSettings.js'
import { _resetGuestOutfitUnlocksForTests, getOwnedOutfitIds, setOutfitUnlocked } from '../lib/outfitUnlocks.js'
import { WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { useAuthStore } from './useAuthStore.js'
import { buildInitialPlayer, useGameStore } from './useGameStore.js'

let sequence = 0
let remoteWrites = 0

function signIn({ records = {}, outfitUnlocks = {}, titleSettings = {} } = {}) {
  const user = { uid: `outfit-synthetic-${++sequence}` }
  _resetFirebaseProgressForTests()
  applyCloudProgressSnapshot({ progress: { records, outfitUnlocks, titleSettings } }, user)
  let remote = buildCloudProgressSnapshot()
  _setFirebaseProgressClientForTests({
    load: async () => structuredClone(remote),
    transaction: async (_path, mutate) => {
      remoteWrites += 1
      const next = mutate(structuredClone(remote))
      if (next === undefined) return { committed: false }
      remote = structuredClone(next)
      return { committed: true, snapshot: { val: () => structuredClone(remote) } }
    },
  })
  useAuthStore.setState({ user, status: 'signedIn' })
}

function startRun(stageId = 'stage1', outfitId = null) {
  if (outfitId) {
    if (outfitId !== 'default') setOutfitUnlocked(outfitId)
    saveTitleSettings({ playerOutfit: outfitId })
  }
  expect(useGameStore.getState().resetGame(stageId)).not.toBe(false)
  return useGameStore.getState()
}

beforeEach(() => {
  remoteWrites = 0
  _resetGuestSessionSettingsForTests()
  _resetGuestOutfitUnlocksForTests()
  signIn()
})

describe('T-05 buildInitialPlayer', () => {
  it('applies maxHpDelta and speedMult to hp, maxHp, speed and baseSpeed', () => {
    expect(buildInitialPlayer({}, 'default')).toMatchObject({ hp: 100, maxHp: 100, speed: 3, baseSpeed: 3 })
    const gym = buildInitialPlayer({}, 'gym')
    expect(gym.maxHp).toBe(88)
    expect(gym.hp).toBe(88)
    expect(gym.speed).toBeCloseTo(3.18, 10)
    expect(gym.baseSpeed).toBeCloseTo(3.18, 10)
    expect(buildInitialPlayer({}, 'winter').speed).toBeCloseTo(2.88, 10)
    expect(buildInitialPlayer({}, 'raincoat')).toMatchObject({ hp: 94, maxHp: 94, speed: 3 })
  })

  it('combines with permanent passives Lv3', () => {
    const gym = buildInitialPlayer({ maxHp: 3, moveSpeed: 3 }, 'gym')
    // 패시브 Lv3 = 체력 +24, 이속 +6% (2026-11-07 메타 패시브 확장 계수)
    expect(gym.maxHp).toBe(112)
    expect(gym.speed).toBeCloseTo(3 * 1.06 * 1.06, 10)
    expect(buildInitialPlayer({ maxHp: 3 }, 'raincoat').maxHp).toBe(118)
  })

  it('R-2: refuses to build without an outfit', () => {
    expect(() => buildInitialPlayer({})).toThrow()
  })
})

describe('run outfit lock (runOutfitId)', () => {
  it('T-04: saved but locked outfit plays as default; saved value kept', () => {
    saveTitleSettings({ playerOutfit: 'gym' })
    const s = startRun('stage1')
    expect(s.runOutfitId).toBe('default')
    expect(s.player.maxHp).toBe(100)
    expect(readFirebasePlayerProgress().titleSettings.playerOutfit).toBe('gym')
  })

  it('T-03: legacy winter wearer keeps winter with 0 clears (granted on run start)', () => {
    signIn({ titleSettings: { playerOutfit: 'winter' } })
    const s = startRun('stage1')
    expect(s.runOutfitId).toBe('winter')
    expect(getOwnedOutfitIds().has('winter')).toBe(true)
    expect(s.player.speed).toBeCloseTo(2.88, 10)
  })

  it('retroactive grant on reloadPersistentProgress', () => {
    signIn({ records: { stage3Clears: 1 } })
    expect(useGameStore.getState().reloadPersistentProgress()).toBe(true)
    expect(getOwnedOutfitIds().has('gym')).toBe(true)
  })

  it('T-07: resetPassiveUpgrades, reloadPersistentProgress, restart and continuation keep the outfit', () => {
    let s = startRun('stage1', 'gym')
    expect(s.runOutfitId).toBe('gym')
    expect(s.player.maxHp).toBe(88)

    useGameStore.getState().resetPassiveUpgrades()
    expect(useGameStore.getState().player.maxHp).toBe(88)

    useGameStore.getState().reloadPersistentProgress()
    expect(useGameStore.getState().player.maxHp).toBe(88)
    expect(useGameStore.getState().player.speed).toBeCloseTo(3.18, 10)

    s = startRun('stage1')
    expect(s.runOutfitId).toBe('gym')
    expect(s.player.maxHp).toBe(88)

    // "다음 스테이지 계속": boss + escape, then continue
    useGameStore.setState({ elapsedMs: 240_000, bossDefeated: true })
    useGameStore.getState().clearStage()
    // the saved choice changing in between must not swap the outfit inside the same run
    saveTitleSettings({ playerOutfit: 'default' })
    expect(useGameStore.getState().resetGame('stage2', { preserveQuestJourney: true, preserveContinuousScore: true, unlockedByRunBossDefeat: true })).not.toBe(false)
    s = useGameStore.getState()
    expect(s.currentStageId).toBe('stage2')
    expect(s.runOutfitId).toBe('gym')
    expect(s.player.maxHp).toBe(88)
  })
})

describe('T-06 damagePlayer outfit multipliers', () => {
  const hit = (outfitId, amount, options) => {
    startRun('stage1', outfitId)
    useGameStore.setState((s) => ({ player: { ...s.player, hp: 100, maxHp: 100, invulnerable: false } }))
    useGameStore.getState().damagePlayer(amount, options)
    return 100 - useGameStore.getState().player.hp
  }

  it('default 8 → 8, winter 8 → 7.36, grad 8 → 8.64', () => {
    expect(hit('default', 8)).toBe(8)
    expect(hit('winter', 8)).toBeCloseTo(7.36, 10)
    expect(hit('grad', 8)).toBeCloseTo(8.64, 10)
  })

  it('raincoat: projectile 8 → 5.6, contact 8 → 8', () => {
    expect(hit('raincoat', 8, { source: 'enemyProjectile' })).toBeCloseTo(5.6, 10)
    expect(hit('raincoat', 8)).toBe(8)
    expect(hit('raincoat', 8, { source: 'contact' })).toBe(8)
    // winter's damageTakenMult also applies to projectiles
    expect(hit('winter', 8, { source: 'enemyProjectile' })).toBeCloseTo(7.36, 10)
  })

  it('invulnerability still blocks before the multiplier', () => {
    startRun('stage1', 'grad')
    useGameStore.setState((s) => ({ player: { ...s.player, invulnerable: true } }))
    useGameStore.getState().damagePlayer(8)
    expect(useGameStore.getState().player.hp).toBe(useGameStore.getState().player.maxHp)
  })

  it('outfit multiplier applies before inucon absorbs', () => {
    startRun('stage1', 'grad')
    useGameStore.setState((s) => ({
      weapons: { ...s.weapons, inucon: { ...s.weapons.inucon, active: true } },
      inucon: { hp: 5, maxHp: s.player.maxHp * 0.2, fainted: false, respawnAtMs: null },
      player: { ...s.player, hp: 100, maxHp: 100, invulnerable: false },
    }))
    useGameStore.getState().damagePlayer(10)
    const s = useGameStore.getState()
    expect(s.inucon.hp).toBe(0)
    expect(100 - s.player.hp).toBeCloseTo(10.8 - 5, 10)
  })
})

describe('T-06b gainXp carry', () => {
  const gain = (outfitId, amount, count) => {
    startRun('stage1', outfitId)
    useGameStore.setState((s) => ({ player: { ...s.player, xp: 0, xpToNext: 1e9, level: 1 }, growthMultiplier: 1 }))
    for (let i = 0; i < count; i += 1) useGameStore.getState().gainXp(amount)
    return useGameStore.getState().player.xp
  }

  it('grad 25×4 = 108, apron 25×4 = 95, default 100', () => {
    expect(gain('grad', 4, 25)).toBe(108)
    expect(gain('apron', 4, 25)).toBe(95)
    expect(gain('default', 4, 25)).toBe(100)
  })

  it('default keeps the exact old floor(amount × growthMultiplier) path', () => {
    startRun('stage1')
    useGameStore.setState((s) => ({ player: { ...s.player, xp: 0, xpToNext: 1e9 }, growthMultiplier: 1.05 }))
    for (let i = 0; i < 10; i += 1) useGameStore.getState().gainXp(4)
    expect(useGameStore.getState().player.xp).toBe(40)
    expect(useGameStore.getState().xpCarry).toBe(0)
  })

  it('carry resets at run start', () => {
    gain('grad', 4, 3)
    expect(useGameStore.getState().xpCarry).not.toBe(0)
    startRun('stage1')
    expect(useGameStore.getState().xpCarry).toBe(0)
  })
})

describe('T-06c Matilda dash base follows outfit speed', () => {
  it('chargeSpeed / player.speed stays 1.4 for every outfit (Enemies.jsx chargeSpeed: player.speed * 1.4)', () => {
    for (const id of ['default', 'winter', 'gym']) {
      const s = startRun('stage1', id)
      const chargeSpeed = s.player.speed * 1.4
      expect(chargeSpeed / s.player.speed).toBeCloseTo(1.4, 12)
    }
  })
})

describe('moveSpeed passive does not speed up Matilda dash', () => {
  it('player.speed / moveSpeedPassiveMult equals the no-passive speed', () => {
    const plain = buildInitialPlayer({}, 'default')
    const boosted = buildInitialPlayer({ moveSpeed: 10 }, 'default')
    expect(boosted.speed).toBeGreaterThan(plain.speed)
    expect(boosted.speed / boosted.moveSpeedPassiveMult).toBeCloseTo(plain.speed, 12)
  })
})

describe('T-09 speed card cap = baseSpeed(with outfit) × 1.8', () => {
  it.each([['gym', 3 * 1.06 * 1.8], ['winter', 3 * 0.96 * 1.8], ['default', 5.4]])('%s caps at %f', (id, cap) => {
    startRun('stage1', id)
    for (let i = 0; i < 60; i += 1) {
      useGameStore.setState({ phase: 'levelup', pendingLevelUps: 1 })
      useGameStore.getState().applyUpgrade('moveSpeed')
    }
    expect(useGameStore.getState().player.speed).toBeCloseTo(cap, 10)
  })
})

describe('T-10 Matilda contact is instant death for every outfit', () => {
  it.each(['default', 'winter', 'raincoat', 'gym', 'apron', 'grad'])('%s', (id) => {
    startRun('stage1', id)
    useGameStore.setState((s) => ({ player: { ...s.player, invulnerable: true } }))
    useGameStore.getState().killPlayer('matilda')
    const s = useGameStore.getState()
    expect(s.player.hp).toBe(0)
    expect(s.phase).toBe('gameover')
    expect(s.deathCause).toBe('matilda')
  })
})

describe('A-7 weapons are outfit-independent', () => {
  it('every weapon damage/cooldown is identical across outfits (missiles included)', () => {
    const snapshot = () => Object.fromEntries(Object.entries(useGameStore.getState().weapons).map(([k, w]) => [k, [w.damage, w.cooldown]]))
    startRun('stage1')
    const base = snapshot()
    expect(base.guidedMissile).toBeDefined()
    expect(base.sharkMissile).toBeDefined()
    for (const id of ['winter', 'raincoat', 'gym', 'apron', 'grad']) {
      startRun('stage1', id)
      expect(snapshot()).toEqual(base)
    }
    expect(Object.keys(base).sort()).toEqual(Object.keys(WEAPON_CATALOG).sort())
  })
})

describe('T-13 newlyUnlockedOutfitIds on run end', () => {
  it('cleared fills it once; the next clear does not repeat it', () => {
    startRun('stage1')
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().clearStage()
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual(['winter'])
    expect(readFirebasePlayerProgress().outfitUnlocks).toEqual({ winter: 1 })

    startRun('stage1')
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual([])
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().clearStage()
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual([])
  })

  it('gameover and quit leave it empty', () => {
    startRun('stage1')
    useGameStore.getState().damagePlayer(99_999)
    expect(useGameStore.getState().phase).toBe('gameover')
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual([])

    startRun('stage1')
    useGameStore.getState()._onRunEnd('quit')
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual([])
  })

  it('acknowledgeNewOutfitUnlocks clears the card', () => {
    startRun('stage1')
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().clearStage()
    useGameStore.getState().acknowledgeNewOutfitUnlocks()
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual([])
  })
})

describe('T-12 guest session', () => {
  beforeEach(() => {
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests({
      load: async () => { remoteWrites += 1; return null },
      save: async () => { remoteWrites += 1 },
      transaction: async () => { remoteWrites += 1; return { committed: false } },
    })
    useAuthStore.setState({ user: null, status: 'signedOut' })
    remoteWrites = 0
  })

  it('unlocks in memory, wears it next run, never writes an account, forgets on reload', async () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().clearStage()
    expect(useGameStore.getState().newlyUnlockedOutfitIds).toEqual(['winter'])

    // next run dies: winter must survive (session union)
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().damagePlayer(99_999)
    expect(getOwnedOutfitIds().has('winter')).toBe(true)

    saveGuestSessionSettings({ playerOutfit: 'winter' })
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().runOutfitId).toBe('winter')

    await Promise.resolve()
    expect(remoteWrites).toBe(0)

    _resetGuestOutfitUnlocksForTests() // page reload drops module memory
    _resetGuestSessionSettingsForTests()
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().runOutfitId).toBe('default')
    expect([...getOwnedOutfitIds()]).toEqual(['default'])
  })
})

describe('no browser storage', () => {
  it('outfit flow never touches localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    startRun('stage1', 'gym')
    useGameStore.setState({ elapsedMs: 240_000 })
    useGameStore.getState().clearStage()
    expect(spy.mock.calls.filter(([key]) => /outfit/i.test(String(key)))).toEqual([])
    spy.mockRestore()
  })
})

describe('progress persistence', () => {
  it('unlocks ride the next cloud progress save', () => {
    updateFirebasePlayerProgress((p) => { p.records.stage4Clears = 1 })
    useGameStore.getState().reloadPersistentProgress()
    expect(buildCloudProgressSnapshot().progress.outfitUnlocks).toEqual({ apron: 1 })
  })
})

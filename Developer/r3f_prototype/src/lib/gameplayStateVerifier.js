import { MAX_OWNED_WEAPONS, UPGRADE_EFFECTS, isUpgradeAvailable } from './upgrades.js'
import { getRuntimeBurstEventsForStage } from './burstEvents.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { useGameStore } from '../store/useGameStore.js'

export const STATE_VERIFIER_STAGES = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4'])

const VALID_PHASES = new Set(['playing', 'paused', 'levelup', 'gameover', 'cleared'])
const NON_NUMERIC_WEAPON_FIELDS = new Set(['label', 'active', 'singleTargetProjectiles', 'chibikoBoostApplied'])

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(random, array) {
  return array[Math.floor(random() * array.length)]
}

function digestNumber(hash, value) {
  let v = Number.isFinite(value) ? Math.floor(value * 1000) : 0x7fffffff
  hash ^= v >>> 0
  hash = Math.imul(hash, 16777619) >>> 0
  return hash
}

function digestString(hash, value) {
  const text = String(value)
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

function digestState(hash, state) {
  hash = digestString(hash, state.currentStageId)
  hash = digestString(hash, state.phase)
  hash = digestString(hash, state.pauseSource ?? 'null')
  hash = digestNumber(hash, state.gameKey)
  hash = digestNumber(hash, state.elapsedMs)
  hash = digestNumber(hash, state.player.hp)
  hash = digestNumber(hash, state.player.maxHp)
  hash = digestNumber(hash, state.player.level)
  hash = digestNumber(hash, state.player.xp)
  hash = digestNumber(hash, state.player.xpToNext)
  hash = digestNumber(hash, state.goldSession)
  hash = digestNumber(hash, state.runKills)
  hash = digestNumber(hash, state.runLevelUps)
  hash = digestNumber(hash, state.pendingLevelUps)
  hash = digestNumber(hash, Object.values(state.weapons).filter((weapon) => weapon.active).length)
  hash = digestNumber(hash, state.survivalMilestonesHit.length)
  hash = digestNumber(hash, state.missionKillKeys.length)
  hash = digestNumber(hash, state.missionEventKeys.length)
  return hash >>> 0
}

function createLocalStorageGuard() {
  let touches = 0
  const target = globalThis
  const hadOwn = Object.prototype.hasOwnProperty.call(target, 'localStorage')
  const previous = Object.getOwnPropertyDescriptor(target, 'localStorage')
  const guardedStorage = new Proxy({}, {
    get() { touches += 1; return () => { touches += 1; return null } },
    set() { touches += 1; return false },
  })
  try {
    Object.defineProperty(target, 'localStorage', {
      configurable: true,
      get() { touches += 1; return guardedStorage },
      set() { touches += 1 },
    })
  } catch {
    throw new Error('Cannot install browser-storage access guard')
  }
  return {
    getTouches: () => touches,
    restore: () => {
      if (hadOwn && previous) Object.defineProperty(target, 'localStorage', previous)
      else {
        try { delete target.localStorage } catch { /* ignore non-configurable host */ }
      }
    },
  }
}

function snapshotForFailure(state) {
  return {
    stageId: state.currentStageId,
    phase: state.phase,
    pauseSource: state.pauseSource,
    gameKey: state.gameKey,
    player: {
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      level: state.player.level,
      xp: state.player.xp,
      xpToNext: state.player.xpToNext,
      speed: state.player.speed,
    },
    pendingLevelUps: state.pendingLevelUps,
    pendingWeaponReplacement: state.pendingWeaponReplacement,
    activeWeapons: Object.entries(state.weapons).filter(([, weapon]) => weapon.active).map(([id, weapon]) => `${id}:Lv${weapon.level}`),
    goldSession: state.goldSession,
    runKills: state.runKills,
    runLevelUps: state.runLevelUps,
    survivalMilestonesHit: [...state.survivalMilestonesHit],
  }
}

function fail(reason, runIndex, seed, stageId, stepIndex, action, state) {
  return {
    reason,
    runIndex,
    seed,
    stageId,
    stepIndex,
    action,
    snapshot: snapshotForFailure(state),
    reproduction: { seed, runIndex, stepIndex, note: 'Replay with the original maxActionsPerRun; shortening preceding runs changes the random sequence.' },
  }
}

function checkInvariants({ runIndex, seed, stageId, stepIndex, action, localStorageTouches }) {
  const state = useGameStore.getState()
  if (localStorageTouches > 0) return fail(`localStorage 접근 ${localStorageTouches}회`, runIndex, seed, stageId, stepIndex, action, state)
  if (!VALID_PHASES.has(state.phase)) return fail(`알 수 없는 phase '${state.phase}'`, runIndex, seed, stageId, stepIndex, action, state)
  if (!STATE_VERIFIER_STAGES.includes(state.currentStageId)) return fail(`알 수 없는 stage '${state.currentStageId}'`, runIndex, seed, stageId, stepIndex, action, state)
  const player = state.player
  if (!Number.isFinite(player.hp) || !Number.isFinite(player.maxHp) || player.maxHp <= 0 || player.hp < 0 || player.hp > player.maxHp) {
    return fail(`플레이어 HP 불변식 위반 ${player.hp}/${player.maxHp}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  if (!Number.isInteger(player.level) || player.level < 1) {
    return fail(`플레이어 레벨 범위 이탈 ${player.level}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  if (!Number.isFinite(player.xp) || !Number.isFinite(player.xpToNext) || player.xp < 0 || player.xpToNext <= 0 || player.xp >= player.xpToNext) {
    return fail(`XP 불변식 위반 ${player.xp}/${player.xpToNext}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  if (state.pendingLevelUps < 0 || !Number.isInteger(state.pendingLevelUps)) {
    return fail(`pendingLevelUps 비정상 ${state.pendingLevelUps}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  if (state.bossAliveCount < 0 || !Number.isInteger(state.bossAliveCount)) {
    return fail(`bossAliveCount 비정상 ${state.bossAliveCount}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  const activeWeapons = Object.entries(state.weapons).filter(([, weapon]) => weapon.active)
  if (activeWeapons.length > MAX_OWNED_WEAPONS) {
    return fail(`활성 무기 ${activeWeapons.length}개 > ${MAX_OWNED_WEAPONS}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  for (const [id, weapon] of Object.entries(state.weapons)) {
    if (!WEAPON_CATALOG[id]) return fail(`카탈로그에 없는 무기 ${id}`, runIndex, seed, stageId, stepIndex, action, state)
    if (!Number.isInteger(weapon.level) || weapon.level < 0 || weapon.level > 5) {
      return fail(`${id} 레벨 범위 이탈 ${weapon.level}`, runIndex, seed, stageId, stepIndex, action, state)
    }
    if (weapon.active && weapon.level < 1) return fail(`${id} 활성인데 레벨 ${weapon.level}`, runIndex, seed, stageId, stepIndex, action, state)
    for (const [field, value] of Object.entries(weapon)) {
      if (NON_NUMERIC_WEAPON_FIELDS.has(field)) continue
      if (!Number.isFinite(value)) return fail(`${id}.${field} 비수치값 ${JSON.stringify(value)}`, runIndex, seed, stageId, stepIndex, action, state)
    }
  }
  if (state.missionKillKeys.length > 512) return fail(`missionKillKeys 상한 초과 ${state.missionKillKeys.length}`, runIndex, seed, stageId, stepIndex, action, state)
  if (!Number.isFinite(state.goldSession) || !Number.isFinite(state.goldTotal) || state.goldSession < 0 || state.goldTotal < 0) return fail('Invalid gold value', runIndex, seed, stageId, stepIndex, action, state)
  if (state.phase === 'gameover' && player.hp !== 0) return fail('Gameover with nonzero HP', runIndex, seed, stageId, stepIndex, action, state)
  if (state.phase === 'levelup' && state.pendingLevelUps < 1) return fail('Levelup without pending choice', runIndex, seed, stageId, stepIndex, action, state)
  for (const key of ['missionKillKeys', 'missionEventKeys', 'survivalMilestonesHit']) {
    if (new Set(state[key]).size !== state[key].length) return fail(`Duplicate ${key}`, runIndex, seed, stageId, stepIndex, action, state)
  }
  return null
}

function chooseAvailableUpgrade(random) {
  const state = useGameStore.getState()
  const available = Object.keys(UPGRADE_EFFECTS).filter((key) => {
    const effect = UPGRADE_EFFECTS[key]
    return effect && isUpgradeAvailable(effect, state.player.level, state.weapons, state.player)
  })
  return available.length ? pick(random, available) : null
}

function runAction(action, random, stageId, stats) {
  const store = useGameStore.getState()
  switch (action) {
    case 'tick': {
      const deltaMs = 250 + Math.floor(random() * 29750)
      store.tickTime(deltaMs)
      store.publishRuntimeElapsedMs()
      store.checkSurvivalMilestone()
      return deltaMs
    }
    case 'xp': {
      if (store.phase !== 'playing') return 0
      const amount = 1 + Math.floor(random() * 240)
      store.gainXp(amount)
      if (useGameStore.getState().phase === 'levelup') stats.levelUps += 1
      return amount
    }
    case 'upgrade': {
      const current = useGameStore.getState()
      if (current.pendingWeaponReplacement) {
        if (random() < 0.5) {
          current.discardPendingWeapon()
          stats.replacementsDiscarded += 1
          return 1
        }
        const discard = Object.entries(current.weapons).find(([, weapon]) => weapon.active)?.[0]
        if (discard && current.confirmWeaponReplacement(discard)) stats.replacementsConfirmed += 1
        else current.cancelWeaponReplacement()
        return 1
      }
      if (current.phase !== 'levelup') return 0
      const key = chooseAvailableUpgrade(random)
      if (key) stats.upgradesApplied += 1
      current.applyUpgrade(key ?? 'missing-upgrade-key')
      return key ?? 'fallback'
    }
    case 'damage': {
      if (store.phase !== 'playing') return 0
      const amount = 4 + Math.floor(random() * 48)
      store.damagePlayer(amount, { ignoreInvulnerability: random() < 0.15, source: 'state-verifier' })
      if (useGameStore.getState().phase === 'gameover') stats.gameovers += 1
      return amount
    }
    case 'heal': {
      store.healPlayer(3 + Math.floor(random() * 20), { silent: true })
      return 1
    }
    case 'boss': {
      if (store.phase !== 'playing') return 0
      store.spawnBoss()
      if (random() < 0.7) store.recordBossDefeat()
      return 1
    }
    case 'portal': {
      if (store.phase !== 'playing') return 0
      store.activateEscapePortal()
      if (random() < 0.45) {
        const before = useGameStore.getState().currentStageId
        if (random() < 0.65) {
          if (store.clearStageAndStartNext()) stats.nextStageTransitions += 1
          else stats.clears += 1
        } else {
          store.clearStage()
          stats.clears += 1
        }
        return before
      }
      return 1
    }
    case 'pause': {
      if (store.phase === 'playing') store.pauseGame(random() < 0.5 ? 'manual' : 'auto')
      else if (store.phase === 'paused') store.resumeGame()
      return 1
    }
    case 'mission': {
      const state = useGameStore.getState()
      state.recordKill()
      state.recordMissionEnemyKill({
        enemyType: pick(random, ['E01', 'E02', 'E03', 'E05', 'E06', 'E07']),
        stageId: state.currentStageId,
        weaponKey: pick(random, Object.keys(WEAPON_CATALOG)),
        gameKey: state.gameKey,
        killKey: `${state.gameKey}:${stageId}:${Math.floor(random() * 1000000)}`,
      })
      return 1
    }
    default:
      return 0
  }
}

function buildActionDeck(stageId) {
  const burstEvents = getRuntimeBurstEventsForStage(stageId)
  const bossWeight = burstEvents.some((event) => /^B0/.test(event.type)) ? 2 : 1
  return ['tick', 'tick', 'xp', 'xp', 'upgrade', 'damage', 'heal', 'portal', 'pause', 'mission', ...Array.from({ length: bossWeight }, () => 'boss')]
}

// Only the dedicated Vitest file supplies isolated storage, feedback and runtime
// boundaries. Never import or run this harness from the game/Studio UI.
export function runGameplayStateVerifier({ runs = 20000, seed = 1, maxActionsPerRun = 36, runtimeBoundary } = {}) {
  if (!import.meta.env?.VITEST || typeof window !== 'undefined') throw new Error('Headless Vitest process required')
  if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(maxActionsPerRun) || maxActionsPerRun < 1 || !Number.isInteger(seed)) {
    throw new TypeError('runs/maxActionsPerRun must be positive integers and seed must be an integer')
  }
  if (!runtimeBoundary?.snapshot || !runtimeBoundary?.restore) throw new Error('Isolated runtime snapshot/restore boundary required')
  const random = mulberry32(seed)
  const originalState = useGameStore.getState()
  const originalRuntime = runtimeBoundary.snapshot()
  const guard = createLocalStorageGuard()
  const stats = {
    stage1Runs: 0,
    stage2Runs: 0,
    stage3Runs: 0,
    stage4Runs: 0,
    levelUps: 0,
    upgradesApplied: 0,
    replacementsConfirmed: 0,
    replacementsDiscarded: 0,
    gameovers: 0,
    clears: 0,
    nextStageTransitions: 0,
    localStorageTouches: 0,
    actions: 0,
  }
  let digest = 2166136261 >>> 0
  let failure = null
  let completedRuns = 0

  try {
    for (let runIndex = 0; runIndex < runs && !failure; runIndex += 1) {
      const stageId = STATE_VERIFIER_STAGES[runIndex % STATE_VERIFIER_STAGES.length]
      stats[`${stageId}Runs`] += 1
      useGameStore.getState().resetGame(stageId)
      const deck = buildActionDeck(stageId)
      let ended = false
      for (let stepIndex = 0; stepIndex < maxActionsPerRun && !failure; stepIndex += 1) {
        let action = pick(random, deck)
        const stateBefore = useGameStore.getState()
        if (stateBefore.phase === 'gameover' || stateBefore.phase === 'cleared') {
          ended = true
          action = 'ended'
        } else if (stateBefore.phase === 'levelup') {
          action = 'upgrade'
        } else if (stepIndex === maxActionsPerRun - 1 && !ended && random() < 0.25) {
          action = 'portal'
        }
        if (action !== 'ended') runAction(action, random, stageId, stats)
        stats.actions += action !== 'ended' ? 1 : 0
        const stateAfter = useGameStore.getState()
        if (!Number.isFinite(stateAfter.elapsedMs) || stateAfter.elapsedMs < 0) {
          failure = fail(`Invalid elapsedMs ${stateAfter.elapsedMs}`, runIndex, seed, stageId, stepIndex, action, stateAfter)
          break
        }
        stats.localStorageTouches = guard.getTouches()
        failure = checkInvariants({ runIndex, seed, stageId, stepIndex, action, localStorageTouches: stats.localStorageTouches })
        digest = digestState(digest, stateAfter)
      }
      completedRuns = runIndex + 1
    }
  } finally {
    guard.restore()
    useGameStore.setState(originalState, true)
    runtimeBoundary.restore(originalRuntime)
  }

  return {
    ok: !failure,
    failure,
    runs: completedRuns,
    seed,
    maxActionsPerRun,
    digest: digest.toString(16).padStart(8, '0'),
    stats,
  }
}

export function formatGameplayStateFailure(failure) {
  if (!failure) return ''
  return JSON.stringify(failure, null, 2)
}

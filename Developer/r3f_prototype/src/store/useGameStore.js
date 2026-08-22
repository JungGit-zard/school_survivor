import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { UPGRADE_EFFECTS, applyChibikoAllWeaponBoost, applyUpgradeWithChibikoBoost } from '../lib/upgrades.js'
import { resetRuntimeRefs, playerPos } from '../lib/refs.js'
import { t } from '../lib/i18n.js'
import { getAllLevels, purchase as purchasePassiveStorage, resetAllLevels as resetPassiveStorage } from '../lib/passiveUpgrades.js'
import {
  applyWeaponPermanentUpgradesToBaseWeapon,
  getChibikoAllWeaponBoost,
  purchaseWeaponPermanentUpgrade as purchaseWeaponPermanentUpgradeStorage,
} from '../lib/weaponPermanentUpgrades.js'
import {
  applyBossPassiveMovementSpeed,
  applyBossPassiveMaxHp,
  applyBossPassiveDamageToBaseWeapon,
  normalizeBossPassiveUnlocks,
  unlockBossPassiveItem,
} from '../lib/bossPassiveItems.js'
import { setMagnetMultiplier } from '../lib/pickup.js'
import {
  incrementRecord as incrementPlayerRecord,
  setBestIfHigher as setBestPlayerRecord,
  snapshot as snapshotPlayerRecords,
  load as loadPlayerRecords,
} from '../lib/playerRecords.js'
import { evaluateUnlocks, isStarter, WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { getAllUnlocked, setUnlocked as setWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { DEFAULT_STAGE_ID, getNextStageId, getStageConfig } from '../lib/stageConfig.js'
import { getBossSpawnSec } from '../lib/burstEvents.js'
import { getAdminBalanceConfig } from '../lib/adminConfig.js'
import { vibrateFeedback } from '../lib/titleSettings.js'
import {
  claimFirebaseMissionReward,
  consumeFirebaseProgressSaveWarning,
  getFirebaseProgressRuntimeSnapshot,
  isFirebaseProgressConfigured,
  isFirebaseProgressHydrated,
  readFirebaseMissionProgress,
  recordPlayActivity,
  requestCloudProgressSave,
  saveFirebaseMissionProgress,
  updateFirebaseMissionProgress,
  readFirebasePlayerProgress,
  updateFirebasePlayerProgress,
} from '../lib/firebaseProgress.js'
import {
  createMissionProgressState,
  reconcileMissionProgress,
  reduceMissionEvent,
} from '../lib/missionProgress.js'
import { getApprovedMissionRewardAllowlist, MISSION_BY_ID } from '../lib/missionCatalog.js'
import { submitRun } from '../lib/firebaseRanking.js'
import { isProjectMaster } from '../lib/projectAdmin.js'
import { useAuthStore } from './useAuthStore.js'
import { getBossClearBonus, getRankingScore, getRankingScorePolicy } from '../lib/rankingScorePolicy.js'
import { logDamageTaken } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitDamageNumber, DAMAGE_NUMBER_COLORS } from '../lib/damageNumbers.js'
import {
  advanceRuntimeTime,
  getRuntimeElapsedMs,
  isRuntimeTimePublishDue,
  markRuntimeTimePublished,
  setRuntimeElapsedMs,
} from '../lib/gameRuntimeTime.js'
import { createStageQuestProgress, getQuestDefinition } from '../lib/quests.js'
import { XP_TO_NEXT_START, nextXpThreshold } from '../lib/xpCurve.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

const FOLLOWUP_GUARANTEED_UPGRADE_BY_PREREQUISITE = Object.freeze({
  chibiko: 'acquireHanako',
  boxCutter: 'acquireBikittyCutter',
})

const MAX_MISSION_KILL_KEYS = 512

const BASE_PLAYER = {
  hp: 100, maxHp: 100,
  speed: 3, baseSpeed: 3,
  level: 1, xp: 0, xpToNext: XP_TO_NEXT_START,
  invulnerable: false,
  hitFlashToken: 0,
  healFlashToken: 0,
}

function buildInitialPlayer(levels, bossPassiveUnlocks = {}) {
  const adminBalance = getAdminBalanceConfig()
  const maxHp = BASE_PLAYER.maxHp + 6 * (levels.maxHp ?? 0) + adminBalance.player.maxHpBonus
  const speed = BASE_PLAYER.speed * (1 + 0.03 * (levels.moveSpeed ?? 0)) * adminBalance.player.speedMultiplier
  return applyBossPassiveMaxHp(applyBossPassiveMovementSpeed({
    ...BASE_PLAYER,
    hp: maxHp,
    maxHp,
    speed,
    baseSpeed: speed,
  }, bossPassiveUnlocks), bossPassiveUnlocks)
}

// WEAPON_CATALOG가 무기 base 스탯의 단일 진실이다. starter 무기는 startsActive:true로 시작,
// 나머지는 unlock 카드가 fire될 때 비로소 weapons[key].active = true로 활성화.
// might passive multiplier는 모든 무기에 동일 적용.
function buildInitialWeapons(levels, { applyPermanent = true, bossPassiveUnlocks = {} } = {}) {
  const mightMult = 1 + 0.04 * (levels.might ?? 0)
  const out = {}
  for (const [key, entry] of Object.entries(WEAPON_CATALOG)) {
    const permanentBase = applyPermanent ? applyWeaponPermanentUpgradesToBaseWeapon(key, entry.base) : entry.base
    const passiveBase = applyBossPassiveDamageToBaseWeapon(key, permanentBase, bossPassiveUnlocks)
    const baseDamage = passiveBase?.damage ?? 0
    out[key] = {
      ...passiveBase,
      label: entry.label,
      level: entry.startsActive ? 1 : 0,
      active: !!entry.startsActive,
      // 소수 1자리 반올림을 걷어냈다(2026-08-15). 저데미지 무기에서 양자화 오차가 치명적이었다:
      // studentLantern 0.15는 0.2로 올라붙어 공격력 패시브를 3레벨 다 찍어도(×1.12 → 0.168 → 0.2)
      // 위력이 0% 오르지 않았고, chibiko 1.25는 1.3이 돼 +12%가 +7.7%로 깎였다.
      damage: baseDamage * mightMult,
    }
  }
  return out
}

function applyBossPassiveDamageToRuntimeWeapons(weapons, bossPassiveUnlocks) {
  const nextWeapons = { ...weapons }
  for (const key of Object.keys(nextWeapons)) {
    nextWeapons[key] = applyBossPassiveDamageToBaseWeapon(key, nextWeapons[key], bossPassiveUnlocks)
  }
  return nextWeapons
}

function buildGrowthMultiplier(levels) {
  return 1 + 0.05 * (levels.growth ?? 0)
}

function applyMagnetPassive(levels) {
  const lvl = levels.magnet ?? 0
  setMagnetMultiplier(lvl === 0 ? 0 : 1 + 0.08 * lvl)
}

const GOLD_STORAGE_KEY = 'school_survivor:goldTotal'

export const SURVIVAL_MILESTONES = [
  { atMs: 48_000, gold: 1, label: '초반 생존 보너스' },
  { atMs: 144_000, gold: 3, label: '중반 돌파 보너스' },
  { atMs: 192_000, gold: 4, label: '보스 조우 보너스' },
  { atMs: 240_000, gold: 8, label: '학교 탈출 보너스' },
]

function loadGoldTotal() {
  if (!isFirebaseProgressHydrated()) return 0
  return readFirebasePlayerProgress().goldTotal ?? 0
}

function saveGoldTotal(value) {
  if (!isFirebaseProgressHydrated()) return false
  updateFirebasePlayerProgress((progress) => {
    progress.goldTotal = Math.max(0, Math.floor(Number(value) || 0))
    return progress
  })
  return true
}

function syncStoredWeaponUnlocksFromRecords() {
  if (!isFirebaseProgressHydrated()) return
  const nextUnlocked = evaluateUnlocks(loadPlayerRecords())
  const prevUnlocked = getAllUnlocked()
  for (const id of nextUnlocked) {
    if (isStarter(id)) continue
    if (prevUnlocked.has(id)) continue
    setWeaponUnlocked(id)
  }
}

function loadRuntimePassiveLevels() {
  return isFirebaseProgressHydrated() ? getAllLevels() : EMPTY_PASSIVE_LEVELS
}

function loadBossPassiveUnlocks() {
  if (!isFirebaseProgressHydrated()) return {}
  return normalizeBossPassiveUnlocks(readFirebasePlayerProgress().bossPassiveUnlocks)
}

function saveRuntimeProgress() {
  const uidAtRequest = getFirebaseProgressRuntimeSnapshot().uid
  if (!uidAtRequest || !isFirebaseProgressConfigured() || !isFirebaseProgressHydrated({ uid: uidAtRequest })) return
  const markCurrentAccountWarning = () => {
    if (isFirebaseProgressHydrated({ uid: uidAtRequest })) {
      useGameStore.setState({ progressSaveWarning: 'save-failed' })
    }
  }
  void requestCloudProgressSave().then((saved) => {
    if (saved) return
    if (consumeFirebaseProgressSaveWarning() === 'save-failed') markCurrentAccountWarning()
  }).catch(markCurrentAccountWarning)
}

function recordRuntimePlayActivity(stageId) {
  if (isFirebaseProgressHydrated()) recordPlayActivity(stageId)
}

function vibrateRuntimeFeedback(pattern) {
  if (isFirebaseProgressHydrated()) vibrateFeedback(pattern)
}

function finishLevelupState(s) {
  const pendingLevelUps = Math.max(0, (s.pendingLevelUps ?? 0) - 1)
  return {
    pendingLevelUps,
    levelUpChoiceSerial: (s.levelUpChoiceSerial ?? 0) + 1,
    phase: pendingLevelUps > 0 ? 'levelup' : 'playing',
  }
}

function matchesQuestItemSource(quest, sourceId) {
  const target = quest.itemTarget
  const placements = getStageObjectPlacements(quest.stageId)
  const allowedTypes = [target.type, ...(target.fallbackTypes ?? [])]
  if (sourceId === `${quest.id}:fallback`) {
    return !placements.some(({ id, type }) => id === target.placementId || allowedTypes.includes(type))
  }
  if (target.placementId === sourceId) return true
  const placement = placements.find(({ id }) => id === sourceId)
  return allowedTypes.includes(placement?.type)
}

function matchesQuestCompletionSource(quest, sourceId) {
  const placementId = quest.completion.placementId
  return sourceId === placementId
    || (quest.stageId === 'stage2' && sourceId.startsWith(`${placementId}-copy-`))
}

// 스테이지1 스토리 인트로 내레이션 3줄. 화면 탭마다 다음 줄, 마지막 탭에 플레이 시작.
export const STAGE1_INTRO_IDS = Object.freeze([
  'intro.stage1.001',
  'intro.stage1.002',
  'intro.stage1.003',
])

const EMPTY_PASSIVE_LEVELS = Object.freeze({})
applyMagnetPassive(EMPTY_PASSIVE_LEVELS)

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    player:      buildInitialPlayer(EMPTY_PASSIVE_LEVELS),
    weapons:     buildInitialWeapons(EMPTY_PASSIVE_LEVELS, { applyPermanent: false }),
    bossPassiveUnlocks: {},
    growthMultiplier: buildGrowthMultiplier(EMPTY_PASSIVE_LEVELS),
    passiveVersion: 0,
    phase:       'playing',   // 'playing' | 'paused' | 'levelup' | 'gameover' | 'cleared'
    pauseSource: null,        // 'manual' | 'auto' | 'dialogue' | null
    studentDialogue: null,    // null | { dialogueId, reward?, subjectType, subjectName } — 조사 결과
    introDialogue: null,      // null | { index } — 스테이지1 스토리 인트로 대화창 상태
    elapsedMs:   0,
    // 런 시작 시각(ms). 런당 결정적 runId의 안정 토큰 — 종료 이벤트가 2회 발화해도
    // 같은 runId를 만들어 서버 dedup으로 이중가산을 막는다(M6).
    runStartedAt: Date.now(),
    currentStageId: DEFAULT_STAGE_ID,
    bossSpawnSec: getBossSpawnSec(DEFAULT_STAGE_ID),
    bossSpawned: false,
    // 현재 생존 중인 보스 수. 스폰마다 증가하고 처치마다 감소한다.
    // 마지막 보스 처치는 보너스 성취일 뿐, 스테이지 클리어와 런 종료는 포탈 진입만 담당한다.
    bossAliveCount: 0,
    // 마지막 보스 처치 사실. 점수 보너스는 포탈 클리어 시에만 확정한다.
    bossDefeated: false,
    escapePortalActive: false,
    matildaSpawned: false,
    deathCause: null,
    bossBonus: 0,
    godMode: false,
    gameKey:     0,
    goldSession: 0,
    goldTotal:   0,
    runKills:    0,
    runLevelUps: 0,
    newlyUnlockedWeaponIds: [],
    progressSaveWarning: null,
    survivalMilestonesHit: [],
    recentMilestone: null,
    pendingLevelUps: 0,
    levelUpChoiceSerial: 0,
    levelUpAcquireExposureKeys: [],
    levelUpAcquireExposureSerial: -1,
    pendingGuaranteedUpgradeChoiceKeys: [],
    questProgress: createStageQuestProgress(DEFAULT_STAGE_ID),
    questJourneyCompletedIds: [],
    questToast: null,
    newQuestItemIds: [],
    questCollectedSourceIds: [],
    // 미션은 로그인 여부와 무관하게 런타임 메모리에서만 집계한다. 영구 저장은 Firebase hydrate 뒤
    // run-end batch에서만 시도하며, 실패해도 이 메모리 상태와 게임 플레이는 유지한다.
    missionProgress: createMissionProgressState(),
    missionSyncState: 'memory',
    missionEventKeys: [],
    missionKillKeys: [],
    missionSpecialEnemySpawns: [],

    // Public/test compatibility only. Game's frame loop advances the mutable runtime
    // clock directly and the UI snapshot is published at 10Hz from Game's effect.
    tickTime: (deltaMs) => {
      const currentElapsedMs = getRuntimeElapsedMs(get().elapsedMs)
      setRuntimeElapsedMs(currentElapsedMs)
      const elapsedMs = advanceRuntimeTime(deltaMs)
      markRuntimeTimePublished(elapsedMs)
      set({ elapsedMs })
    },

    // This is intentionally called from Game's useEffect interval, never useFrame.
    publishRuntimeElapsedMs: () => {
      const storeElapsedMs = get().elapsedMs
      if (!isRuntimeTimePublishDue(storeElapsedMs)) return false
      const elapsedMs = getRuntimeElapsedMs(storeElapsedMs)
      markRuntimeTimePublished(elapsedMs)
      set({ elapsedMs })
      return true
    },

    // 플레이어 피해
    damagePlayer: (amount, { ignoreInvulnerability = false, source = null } = {}) => {
      const { player, phase, godMode } = get()
      if (phase !== 'playing') return
      if (godMode) {
        if (isProjectMaster(useAuthStore.getState().user)) return
        set({ godMode: false })
      }
      if (player.invulnerable && !ignoreInvulnerability) return
      const hp = Math.max(0, player.hp - amount)
      logDamageTaken(amount, hp)
      // 플레이어 머리 위에 빨간 데미지 숫자(실제 피해 적용 시에만 — 무적 리턴은 위에서 이미 처리됨).
      emitDamageNumber({
        x: playerPos.x,
        y: 1.4,
        z: playerPos.z,
        amount,
        colorHex: DAMAGE_NUMBER_COLORS.player,
      })
      if (hp <= 0) {
        set({ player: { ...player, hp }, phase: 'gameover', pauseSource: null, deathCause: source })
        emitSfx({ id: 'playerDeath' })
        vibrateRuntimeFeedback([40, 60, 40])
        get()._onRunEnd('gameover')
        return
      }
      emitSfx({ id: 'playerHit' })
      vibrateRuntimeFeedback(18)
      set({ player: { ...player, hp, invulnerable: true, hitFlashToken: player.hitFlashToken + 1 } })
      // 무적 해제는 Player.jsx의 useFrame에서 처리한다. setTimeout을 쓰지 않는다.
    },

    // 마틸다 즉사 전용. 신 지정 사양 S1: 마틸다 몸에 닿으면 플레이어 능력(최대 체력·
    // 체력 강화·피해 감소)과 무관하게 즉시 사망하며, 무적프레임(invulnerable)도 관통한다.
    // damagePlayer를 큰 수로 호출하지 않고 별도 경로를 쓰는 이유:
    //  - damagePlayer는 invulnerable에서 early return 한다(과거 이 때문에 무적 520ms가
    //    마틸다 접촉 쿨다운 500ms를 덮어 즉사가 무효화되는 버그가 있었다).
    //  - 데미지 숫자 연출에 Infinity 같은 값이 뜨는 것도 막는다.
    killPlayer: (source = null) => {
      const { player, phase, godMode } = get()
      if (phase !== 'playing') return
      if (godMode) {
        if (isProjectMaster(useAuthStore.getState().user)) return
        set({ godMode: false })
      }
      set({ player: { ...player, hp: 0 }, phase: 'gameover', pauseSource: null, deathCause: source })
      emitSfx({ id: 'playerDeath' })
      vibrateRuntimeFeedback([40, 60, 40])
      get()._onRunEnd('gameover')
    },

    endInvulnerable: () => set((s) => ({ player: { ...s.player, invulnerable: false } })),

    setGodMode: (enabled) => {
      if (enabled !== true) {
        set({ godMode: false })
        return true
      }
      if (!isProjectMaster(useAuthStore.getState().user)) {
        set({ godMode: false })
        return false
      }
      set({ godMode: true })
      return true
    },

    healPlayer: (amount) => set((s) => {
      if (!Number.isFinite(amount) || amount <= 0) return s
      const hp = Math.min(s.player.maxHp, s.player.hp + amount)
      const healed = hp > s.player.hp
      if (healed) emitSfx({ id: 'playerHeal', volume: 0.34 })
      return {
        player: {
          ...s.player,
          hp,
          healFlashToken: healed ? (s.player.healFlashToken ?? 0) + 1 : (s.player.healFlashToken ?? 0),
        },
      }
    }),

    // 경험치와 레벨업
    gainXp: (amount) => {
      const { player, pendingLevelUps, growthMultiplier, runLevelUps } = get()
      let { xp, xpToNext, level } = player
      xp += Math.floor(amount * growthMultiplier)
      let gainedLevelUps = 0
      while (xp >= xpToNext) {
        xp -= xpToNext
        level += 1
        gainedLevelUps += 1
        xpToNext = nextXpThreshold(xpToNext)
      }
      if (gainedLevelUps > 0) {
        emitSfx({ id: 'levelUp' })
        set({
          player: { ...player, xp, xpToNext, level },
          pendingLevelUps: pendingLevelUps + gainedLevelUps,
          runLevelUps: runLevelUps + gainedLevelUps,
          phase: 'levelup',
        })
        return
      }
      set({ player: { ...player, xp } })
    },

    // 본 런 처치 카운터 +1. 인자 없는 단순 signature — per-type 카운터가 필요해지면 그때 분기 추가.
    recordKill: () => set((s) => ({ runKills: s.runKills + 1 })),

    // 보스 처치는 mid-run에 즉시 cumulative에 누적한다. B01/B02 패시브는 Firebase 준비 전에도
    // 현재 메모리 런에서 즉시 해금·적용되며, 저장 실패가 플레이를 막지 않는다.
    recordBossKill: (bossId) => {
      const state = get()
      const bossPassiveItemId = bossId === 'B01'
        ? 'b01SetSquare'
        : bossId === 'B02'
          ? 'b02CorridorPass'
          : bossId === 'B03'
            ? 'b03GymWhistle'
            : bossId === 'B04'
              ? 'b04ServingLadle'
          : null
      const nextBossPassiveUnlocks = bossPassiveItemId
        ? unlockBossPassiveItem(state.bossPassiveUnlocks, bossPassiveItemId)
        : state.bossPassiveUnlocks
      const unlockedNow = bossPassiveItemId != null
        && nextBossPassiveUnlocks[bossPassiveItemId] !== state.bossPassiveUnlocks[bossPassiveItemId]

      if (unlockedNow) {
        set({
          bossPassiveUnlocks: nextBossPassiveUnlocks,
          weapons: applyBossPassiveDamageToRuntimeWeapons(state.weapons, nextBossPassiveUnlocks),
          player: applyBossPassiveMaxHp(applyBossPassiveMovementSpeed(state.player, nextBossPassiveUnlocks), nextBossPassiveUnlocks),
        })
      }
      if (!isFirebaseProgressHydrated()) return
      incrementPlayerRecord('bossKills', 1)
      if (unlockedNow) {
        updateFirebasePlayerProgress((progress) => {
          progress.bossPassiveUnlocks = nextBossPassiveUnlocks
          return progress
        })
        void requestCloudProgressSave()
      }
    },

    hydrateMissionProgress: () => {
      const result = readFirebaseMissionProgress()
      if (!result.ok) {
        set({ missionSyncState: result.reason })
        return result
      }
      const missionProgress = reconcileMissionProgress(result.missions)
      set({ missionProgress, missionSyncState: 'hydrated' })
      return { ok: true, missions: missionProgress }
    },

    recordMissionEvent: (event) => {
      const missionProgress = reduceMissionEvent(get().missionProgress, event)
      set({ missionProgress })
      return missionProgress
    },

    // 같은 런에서 프레임 경로가 겹쳐도 조사 상호작용은 한 번만 미션에 반영한다.
    recordMissionEventOnce: (eventKey, event) => {
      if (typeof eventKey !== 'string' || !eventKey || get().missionEventKeys.includes(eventKey)) return false
      set((s) => ({ missionEventKeys: [...s.missionEventKeys, eventKey] }))
      get().recordMissionEvent(event)
      return true
    },

    // 풀 재사용/특수 적 제거 경로가 겹쳐도 같은 적의 처치는 런마다 한 번만 집계한다.
    recordMissionEnemyKill: ({ enemyType, stageId, weaponKey, bossId, gameKey, killKey } = {}) => {
      const state = get()
      if (gameKey !== state.gameKey || stageId !== state.currentStageId || typeof killKey !== 'string' || !killKey) return false
      if (state.missionKillKeys.includes(killKey)) return false
      set((s) => ({ missionKillKeys: [...s.missionKillKeys, killKey].slice(-MAX_MISSION_KILL_KEYS) }))
      get().recordMissionEvent({ type: 'enemy_killed', stageId, enemyType, weaponKey })
      if (bossId) get().recordMissionEvent({ type: 'boss_killed', bossId })
      return true
    },

    // 특수 적 생존 미션은 실제 버스트 생성 시각을 런 메모리에만 보관하고, 종료 시 최대 생존시간으로 합산한다.
    recordMissionSpecialEnemySpawn: ({ enemyType, stageId, gameKey, spawnSec }) => {
      if (!['E03', 'RZT', 'RZG', 'RZL', 'RZC'].includes(enemyType) || stageId !== get().currentStageId || gameKey !== get().gameKey) return false
      const second = Math.floor(Number(spawnSec))
      if (!Number.isFinite(second) || second < 0) return false
      const spawnKey = `${gameKey}:${stageId}:${enemyType}:${second}`
      if (get().missionSpecialEnemySpawns.some((spawn) => spawn.key === spawnKey)) return false
      set((s) => ({
        missionSpecialEnemySpawns: [...s.missionSpecialEnemySpawns, { key: spawnKey, enemyType, stageId, gameKey, spawnSec: second }],
      }))
      return true
    },

    setPinnedMissionIds: (missionIds) => {
      const pinnedMissionIds = []
      for (const missionId of Array.isArray(missionIds) ? missionIds : []) {
        if (!MISSION_BY_ID[missionId] || pinnedMissionIds.includes(missionId)) continue
        pinnedMissionIds.push(missionId)
        if (pinnedMissionIds.length === 2) break
      }
      set((s) => ({ missionProgress: { ...s.missionProgress, pinnedMissionIds } }))
      return pinnedMissionIds
    },

    togglePinnedMission: (missionId) => {
      if (!MISSION_BY_ID[missionId]) return false
      const pinnedMissionIds = get().missionProgress.pinnedMissionIds
      if (pinnedMissionIds.includes(missionId)) {
        get().setPinnedMissionIds(pinnedMissionIds.filter((id) => id !== missionId))
        return true
      }
      if (pinnedMissionIds.length >= 2) return false
      get().setPinnedMissionIds([...pinnedMissionIds, missionId])
      return true
    },

    saveMissionProgress: async () => {
      const user = useAuthStore.getState().user
      if (!user?.uid) return { ok: false, saved: false, reason: 'unauthenticated' }
      const missionProgress = get().missionProgress
      const updated = updateFirebaseMissionProgress(() => missionProgress)
      if (!updated.ok) {
        set({ missionSyncState: updated.reason })
        return { ok: false, saved: false, reason: updated.reason }
      }
      const result = await saveFirebaseMissionProgress(user)
      set({ missionSyncState: result.ok ? 'saved' : result.reason })
      return result
    },

    claimMissionReward: async (missionId) => {
      const user = useAuthStore.getState().user
      const rewardAllowlist = getApprovedMissionRewardAllowlist()
      if (Object.keys(rewardAllowlist).length === 0) {
        return { ok: false, committed: false, reason: 'reward-not-approved' }
      }
      const result = await claimFirebaseMissionReward({ user, missionId, rewardAllowlist })
      if (result.missions) set({ missionProgress: reconcileMissionProgress(result.missions) })
      set({ missionSyncState: result.ok ? 'claimed' : result.reason })
      return result
    },

    // 결과창 진입 1회: 본 런 카운터를 평가 → diff → unlock 저장 → store 알림 → cumulative snapshot.
    // 호출 사이트: damagePlayer HP≤0 분기, clearStage.
    // 순서가 정확성을 결정: 평가는 snapshot 전, 합본에 본 런 카운터 포함, snapshot은 평가 후.
    _onRunEnd: (phaseName) => {
      const s = get()
      const elapsedMs = getRuntimeElapsedMs(s.elapsedMs)
      const runSurvivalSeconds = Math.floor(elapsedMs / 1000)
      const stage = getStageConfig(s.currentStageId)

      // 1. 합본 (snapshot 전). bossKills는 mid-run에 이미 cumulative에 들어 있음.
      const progressReady = isFirebaseProgressHydrated()
      const evalInput = {
        ...(progressReady ? loadPlayerRecords() : {}),
        runKills: s.runKills,
        runGold: s.goldSession,
        runLevelUps: s.runLevelUps,
        runSurvivalSeconds,
      }
      evalInput.totalRuns = (evalInput.totalRuns ?? 0) + 1
      evalInput.totalKills = (evalInput.totalKills ?? 0) + Math.max(0, Math.floor(s.runKills))
      evalInput.totalGold = (evalInput.totalGold ?? 0) + Math.max(0, Math.floor(s.goldSession))
      evalInput.totalLevelUps = (evalInput.totalLevelUps ?? 0) + Math.max(0, Math.floor(s.runLevelUps))
      evalInput.totalSurvivalSeconds = (evalInput.totalSurvivalSeconds ?? 0) + runSurvivalSeconds
      if (phaseName === 'cleared') {
        evalInput[stage.clearRecordKey] = (evalInput[stage.clearRecordKey] ?? 0) + 1
      }

      // 미션은 여기서만 run-end batch로 저장한다. component/frame/pickup별 Firebase 쓰기는 없다.
      get().recordMissionEvent({ type: 'survival_updated', stageId: s.currentStageId, value: runSurvivalSeconds })
      if (phaseName === 'cleared') get().recordMissionEvent({ type: 'stage_cleared', stageId: s.currentStageId })
      for (const spawn of s.missionSpecialEnemySpawns) {
        if (spawn.stageId !== s.currentStageId) continue
        const survivedAfterSpawnSec = runSurvivalSeconds - spawn.spawnSec
        if (survivedAfterSpawnSec > 0) {
          get().recordMissionEvent({
            type: 'special_enemy_survival',
            enemyType: spawn.enemyType,
            value: survivedAfterSpawnSec,
          })
        }
      }

      // 2. 평가 → diff (starter 제외, 이미 unlock된 것 제외)
      const nextUnlocked = evaluateUnlocks(evalInput)
      const prevUnlocked = progressReady ? getAllUnlocked() : new Set()
      const diff = []
      for (const id of nextUnlocked) {
        if (isStarter(id)) continue
        if (prevUnlocked.has(id)) continue
        diff.push(id)
      }
      if (progressReady) diff.forEach((id) => setWeaponUnlocked(id))

      if (!progressReady) {
        if (phaseName === 'gameover') emitSfx({ id: 'gameOver' })
        set({ newlyUnlockedWeaponIds: Object.freeze(diff) })
        void get().saveMissionProgress()
        return
      }

      // 3. 평가 후 누적 snapshot
      snapshotPlayerRecords({
        runKills: s.runKills,
        runGold: s.goldSession,
        runLevelUps: s.runLevelUps,
        runSurvivalSeconds,
      })
      // stage1.bestRecordKey === 'bestSurvivalSeconds' 이므로 stage별 키만 기록하면 충분하다.
      // 글로벌 bestSurvivalSeconds는 stage2 종료 시에도 함께 갱신해야 하므로 두 줄 유지하되
      // stage1에서 동일 키 이중 기록되던 버그를 키 비교로 방지.
      if (stage.bestRecordKey !== 'bestSurvivalSeconds') {
        setBestPlayerRecord('bestSurvivalSeconds', runSurvivalSeconds)
      }
      setBestPlayerRecord(stage.bestRecordKey, runSurvivalSeconds)
      if (s.currentStageId === 'stage1' && runSurvivalSeconds >= 180) {
        incrementPlayerRecord('stage1Survival180Runs', 1)
      }
      if (phaseName === 'cleared') incrementPlayerRecord(stage.clearRecordKey, 1)
      if (phaseName === 'gameover') emitSfx({ id: 'gameOver' })

      set({ newlyUnlockedWeaponIds: Object.freeze(diff) })
      saveRuntimeProgress()
      void get().saveMissionProgress()

      // 랭킹 제출 — 로그인 상태 + Firebase 설정 시에만 동작 (실패해도 게임에 영향 없음).
      const cleared = phaseName === 'cleared'
      const policy = getRankingScorePolicy()
      const bossBonus = getBossClearBonus({
        stageId: s.currentStageId,
        survivalSeconds: runSurvivalSeconds,
        cleared,
        bossDefeated: s.bossDefeated,
      }, policy)
      if (s.bossBonus !== bossBonus) set({ bossBonus })
      const user = useAuthStore.getState().user
      if (user) {
        const score = getRankingScore({ stageId: s.currentStageId, survivalSeconds: runSurvivalSeconds, cleared, bossBonus }, policy)
        // 런당 결정적 runId(M6): 같은 런의 종료가 2회 발화해도 동일 id → 서버 dedup으로 이중가산 방지.
        // uid/stageId는 영숫자, runStartedAt은 숫자라 정규식 ^[A-Za-z0-9_-]{12,80}$를 통과한다.
        const runId = `${user.uid}_${s.currentStageId}_${s.runStartedAt ?? 0}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80)
        submitRun(user, { stageId: s.currentStageId, score, timeMs: elapsedMs, cleared, runId }).catch(() => {})
      }
    },

    acknowledgeNewWeaponUnlocks: () => {
      set({ newlyUnlockedWeaponIds: Object.freeze([]) })
    },

    dismissProgressSaveWarning: () => set({ progressSaveWarning: null }),

    gainGold: (amount) => {
      if (!amount) return
      const { goldSession, goldTotal } = get()
      const nextTotal = goldTotal + amount
      saveGoldTotal(nextTotal)
      set({ goldSession: goldSession + amount, goldTotal: nextTotal })
      saveRuntimeProgress()
    },

    spendGold: (amount) => {
      if (!amount || amount < 0) return false
      const { goldTotal } = get()
      if (goldTotal < amount) return false
      const nextTotal = goldTotal - amount
      saveGoldTotal(nextTotal)
      set({ goldTotal: nextTotal })
      saveRuntimeProgress()
      return true
    },

    purchasePassive: (id) => {
      if (!isFirebaseProgressHydrated()) return { ok: false, reason: 'progressUnavailable' }
      const { goldTotal } = get()
      const result = purchasePassiveStorage(id, goldTotal)
      if (!result.ok) return result
      saveGoldTotal(result.nextGold)
      set((s) => ({ goldTotal: result.nextGold, passiveVersion: s.passiveVersion + 1 }))
      saveRuntimeProgress()
      return result
    },

    purchaseWeaponPermanentUpgrade: (id) => {
      if (!isFirebaseProgressHydrated()) return { ok: false, reason: 'progressUnavailable' }
      const { goldTotal } = get()
      const result = purchaseWeaponPermanentUpgradeStorage(id, goldTotal)
      if (!result.ok) return result
      saveGoldTotal(result.nextGold)
      const levels = getAllLevels()
      set((s) => ({
        goldTotal: result.nextGold,
        weapons: buildInitialWeapons(levels, { bossPassiveUnlocks: s.bossPassiveUnlocks }),
        passiveVersion: s.passiveVersion + 1,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
      }))
      saveRuntimeProgress()
      return result
    },

    resetPassiveUpgrades: () => {
      if (!isFirebaseProgressHydrated()) return false
      resetPassiveStorage()
      const levels = getAllLevels()
      applyMagnetPassive(levels)
      set((s) => ({
        player: buildInitialPlayer(levels, s.bossPassiveUnlocks),
        weapons: buildInitialWeapons(levels, { bossPassiveUnlocks: s.bossPassiveUnlocks }),
        growthMultiplier: buildGrowthMultiplier(levels),
        passiveVersion: s.passiveVersion + 1,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
      }))
      saveRuntimeProgress()
      return true
    },

    reloadPersistentProgress: () => {
      if (!isFirebaseProgressHydrated()) return false
      const levels = getAllLevels()
      const bossPassiveUnlocks = loadBossPassiveUnlocks()
      applyMagnetPassive(levels)
      syncStoredWeaponUnlocksFromRecords()
      set((s) => ({
        goldTotal: loadGoldTotal(),
        player: buildInitialPlayer(levels, bossPassiveUnlocks),
        weapons: buildInitialWeapons(levels, { bossPassiveUnlocks }),
        bossPassiveUnlocks,
        growthMultiplier: buildGrowthMultiplier(levels),
        passiveVersion: s.passiveVersion + 1,
        progressSaveWarning: consumeFirebaseProgressSaveWarning(),
      }))
      get().hydrateMissionProgress()
      return true
    },

    checkSurvivalMilestone: (elapsedOverrideMs) => {
      const s = get()
      const elapsedMs = Number.isFinite(elapsedOverrideMs)
        ? elapsedOverrideMs
        : getRuntimeElapsedMs(s.elapsedMs)
      const milestones = getStageConfig(s.currentStageId).survivalMilestones ?? SURVIVAL_MILESTONES
      const earned = milestones.filter(
        (milestone) => elapsedMs >= milestone.atMs && !s.survivalMilestonesHit.includes(milestone.atMs),
      )
      if (earned.length === 0) return
      emitSfx({ id: 'milestoneGold' })
      const gold = earned.reduce((sum, milestone) => sum + milestone.gold, 0)
      const nextTotal = s.goldTotal + gold
      saveGoldTotal(nextTotal)
      set({
        goldSession: s.goldSession + gold,
        goldTotal: nextTotal,
        survivalMilestonesHit: [
          ...s.survivalMilestonesHit,
          ...earned.map((milestone) => milestone.atMs),
        ],
        recentMilestone: earned[earned.length - 1],
      })
      saveRuntimeProgress()
    },

    clearMilestone: () => set({ recentMilestone: null }),

    resumeFromLevelup: () => set((s) => finishLevelupState(s)),

    pauseGame: (source = 'manual') => set((s) => {
      if (s.phase !== 'playing') return {}
      return { phase: 'paused', pauseSource: source }
    }),

    startQuest: (questId) => {
      const s = get()
      const quest = getQuestDefinition(questId)
      const progress = s.questProgress?.[questId]
      if (s.phase !== 'playing' || !quest || quest.stageId !== s.currentStageId
        || progress?.status !== 'undiscovered') return false
      set({
        questProgress: {
          ...s.questProgress,
          [questId]: { ...progress, status: 'active' },
        },
        questToast: { type: 'started', questId },
      })
      return true
    },

    collectQuestItem: (questId, sourceId) => {
      const s = get()
      const quest = getQuestDefinition(questId)
      const progress = s.questProgress?.[questId]
      const sourceKey = `${questId}:${sourceId}`
      if (s.phase !== 'playing' || !quest || quest.stageId !== s.currentStageId || progress?.status !== 'active'
        || s.questCollectedSourceIds.includes(sourceKey)
        || !matchesQuestItemSource(quest, sourceId)) return false
      set({
        questProgress: {
          ...s.questProgress,
          [questId]: { ...progress, status: 'item-acquired', itemHeld: true },
        },
        questCollectedSourceIds: [...s.questCollectedSourceIds, sourceKey],
        newQuestItemIds: [...s.newQuestItemIds, quest.item.id],
        questToast: { type: 'item', questId },
      })
      return true
    },

    completeQuest: (questId, sourceId) => {
      const s = get()
      const quest = getQuestDefinition(questId)
      const progress = s.questProgress?.[questId]
      if (s.phase !== 'playing' || !quest || quest.stageId !== s.currentStageId || progress?.status !== 'item-acquired'
        || !matchesQuestCompletionSource(quest, sourceId)) return false
      const gold = quest.rewardGold
      const goldTotal = s.goldTotal + gold
      saveGoldTotal(goldTotal)
      set({
        questProgress: {
          ...s.questProgress,
          [questId]: { ...progress, status: 'completed', itemHeld: false },
        },
        questJourneyCompletedIds: [...s.questJourneyCompletedIds, questId],
        newQuestItemIds: s.newQuestItemIds.filter((itemId) => itemId !== quest.item.id),
        goldSession: s.goldSession + gold,
        goldTotal,
        questToast: { type: 'completed', questId },
      })
      get().recordMissionEvent({ type: 'quest_completed' })
      saveRuntimeProgress()
      return true
    },

    clearQuestToast: () => set({ questToast: null }),

    markQuestInventorySeen: () => set({ newQuestItemIds: [] }),

    toggleQuestInventory: () => set((s) => {
      if (s.phase === 'playing') return { phase: 'paused', pauseSource: 'quest' }
      if (s.phase === 'paused' && s.pauseSource === 'quest') return { phase: 'playing', pauseSource: null }
      return {}
    }),

    closeQuestInventory: () => set((s) => (
      s.phase === 'paused' && s.pauseSource === 'quest'
        ? { phase: 'playing', pauseSource: null }
        : {}
    )),

    resumeGame: () => set((s) => {
      if (s.phase !== 'paused') return {}
      return { phase: 'playing', pauseSource: null }
    }),

    // 쓰러진 학생 대화: playing일 때만 대화용으로 일시정지(pauseSource='dialogue')한다.
    // 일반 일시정지 메뉴와 구분하기 위해 pauseSource로 분기 — HUD가 이 값으로 오버레이를 나눈다.
    openStudentDialogue: (dialogueId, reward = null, subject = {}) => set((s) => {
      if (s.phase !== 'playing') return {}
      return {
        phase: 'paused',
        pauseSource: 'dialogue',
        studentDialogue: {
          dialogueId: typeof dialogueId === 'string' && dialogueId ? dialogueId : 'dialogue.unavailable',
          reward,
          subjectType: subject.subjectType ?? 'student',
          subjectName: subject.subjectName ?? t('hud.tiredStudent', null, '지친학생'),
        },
      }
    }),

    // 대화용 일시정지일 때만 재개한다. 조사 보상은 이 시점에 한 번만 지급한다.
    closeStudentDialogue: () => set((s) => {
      if (s.pauseSource !== 'dialogue') return {}
      const reward = s.studentDialogue?.reward

      if (reward?.type === 'gold') {
        const goldTotal = s.goldTotal + reward.amount
        saveGoldTotal(goldTotal)
        emitSfx({ id: 'coinCollect' })
        return {
          phase: 'playing',
          pauseSource: null,
          studentDialogue: null,
          goldSession: s.goldSession + reward.amount,
          goldTotal,
        }
      }

      if (reward?.type === 'upgrade') {
        emitSfx({ id: 'levelUp' })
        return {
          phase: 'levelup',
          pauseSource: null,
          studentDialogue: null,
          pendingLevelUps: s.pendingLevelUps + 1,
          levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
        }
      }

      return { phase: 'playing', pauseSource: null, studentDialogue: null }
    }),

    // 스테이지1 스토리 인트로 시작: 게임을 멈추고(pauseSource='intro') 첫 대사를 띄운다.
    // pauseSource는 'dialogue'와 구분해 'intro'로 두어 HUD가 일반 일시정지 UI를 숨긴다.
    startStage1Intro: () => set({ phase: 'paused', pauseSource: 'intro', introDialogue: { index: 0 } }),

    // 인트로 탭 진행: 다음 대사로. 마지막 대사에서 탭하면 대화창을 닫고 플레이를 시작한다.
    advanceIntro: () => set((s) => {
      if (!s.introDialogue) return {}
      const next = s.introDialogue.index + 1
      if (next >= STAGE1_INTRO_IDS.length) {
        return { phase: 'playing', pauseSource: null, introDialogue: null }
      }
      return { introDialogue: { index: next } }
    }),

    quitPausedRun: () => {
      const s = get()
      if (s.phase !== 'paused') return false
      set({ phase: 'gameover', pauseSource: null })
      get()._onRunEnd('quit')
      return true
    },

    togglePause: () => set((s) => {
      if (s.phase === 'playing') return { phase: 'paused', pauseSource: 'manual' }
      if (s.phase === 'paused') return { phase: 'playing', pauseSource: null }
      return {}
    }),

    consumeGuaranteedUpgradeChoices: (keys, choiceSerial) => set((s) => {
      if (s.phase !== 'levelup' || s.levelUpChoiceSerial !== choiceSerial || !Array.isArray(keys)) return {}
      const displayed = new Set(keys)
      const remaining = s.pendingGuaranteedUpgradeChoiceKeys.filter((key) => !displayed.has(key))
      return remaining.length === s.pendingGuaranteedUpgradeChoiceKeys.length
        ? {}
        : { pendingGuaranteedUpgradeChoiceKeys: remaining }
    }),

    discardUnavailableGuaranteedUpgradeChoices: (keys, choiceSerial) => set((s) => {
      if (s.phase !== 'levelup' || s.levelUpChoiceSerial !== choiceSerial || !Array.isArray(keys)) return {}
      const unavailable = new Set(keys)
      const remaining = s.pendingGuaranteedUpgradeChoiceKeys.filter((key) => !unavailable.has(key))
      return remaining.length === s.pendingGuaranteedUpgradeChoiceKeys.length
        ? {}
        : { pendingGuaranteedUpgradeChoiceKeys: remaining }
    }),

    // HUD가 helper가 계산한 노출 ledger를 화면당 한 번만 기록한다.
    // 같은 levelUpChoiceSerial에서는 이미 고정된 choices를 다시 계산하지 않는다.
    recordLevelupAcquireExposure: (keys, choiceSerial) => set((s) => {
      if (s.phase !== 'levelup' || s.levelUpChoiceSerial !== choiceSerial || s.levelUpAcquireExposureSerial === choiceSerial || !Array.isArray(keys)) return {}
      return {
        levelUpAcquireExposureKeys: [...new Set(keys.filter((key) => typeof key === 'string'))],
        levelUpAcquireExposureSerial: choiceSerial,
      }
    }),

    applyUpgrade: (key) => {
      const effect = UPGRADE_EFFECTS[key]

      const recordUpgradeMissionState = () => {
        const state = get()
        get().recordMissionEvent({ type: 'upgrade_selected' })
        get().recordMissionEvent({
          type: 'weapon_state',
          weaponLevel: effect?.weapon ? state.weapons[effect.weapon]?.level : 0,
          activeWeaponCount: Object.values(state.weapons).filter((weapon) => weapon.active).length,
        })
      }

      if (effect?.kind === 'player') {
        if (key === 'moveSpeed') {
          set((s) => ({
            player: { ...s.player, speed: Math.min(s.player.baseSpeed * 1.8, s.player.speed * 1.1) },
            ...finishLevelupState(s),
          }))
        } else if (key === 'maxHealth') {
          set((s) => ({
            player: {
              ...s.player,
              maxHp: s.player.maxHp + 20 * (s.player.bossPassiveMaxHpMultiplier ?? 1),
              hp: s.player.hp + 20 * (s.player.bossPassiveMaxHpMultiplier ?? 1),
            },
            ...finishLevelupState(s),
          }))
        } else {
          set((s) => finishLevelupState(s))
        }
        recordUpgradeMissionState()
        return
      }

      if (!effect) { set((s) => finishLevelupState(s)); return }

      const { weapons } = get()
      const wpn = weapons[effect.weapon]
      set((s) => {
        const chibikoWasActive = s.weapons.chibiko?.active === true
        const acquiringChibiko = effect.kind === 'acquire' && effect.weapon === 'chibiko'
        const guaranteedFollowupKey = effect.kind === 'acquire' && !s.weapons[effect.weapon]?.active
          ? FOLLOWUP_GUARANTEED_UPGRADE_BY_PREREQUISITE[effect.weapon]
          : null
        const pendingGuaranteedUpgradeChoiceKeys = guaranteedFollowupKey
          && !s.pendingGuaranteedUpgradeChoiceKeys.includes(guaranteedFollowupKey)
          ? [...s.pendingGuaranteedUpgradeChoiceKeys, guaranteedFollowupKey]
          : s.pendingGuaranteedUpgradeChoiceKeys
        const boost = getChibikoAllWeaponBoost(s.weapons.chibiko?.permanentUpgradeLevel ?? 0)
        const passiveMultiplier = effect.kind === 'damage' ? (wpn.bossPassiveDamageMultiplier ?? 1) : 1
        const upgraded = applyUpgradeWithChibikoBoost(
          wpn,
          passiveMultiplier === 1 ? effect : { ...effect, dmg: effect.dmg * passiveMultiplier },
          boost,
        )

        if (acquiringChibiko) {
          return {
            weapons: Object.fromEntries(Object.entries({ ...s.weapons, chibiko: upgraded }).map(([id, weapon]) => [
              id,
              id === 'chibiko' || !weapon.active ? weapon : applyChibikoAllWeaponBoost(weapon, boost),
            ])),
            pendingGuaranteedUpgradeChoiceKeys,
            ...finishLevelupState(s),
          }
        }

        return {
          weapons: {
            ...s.weapons,
            [effect.weapon]: chibikoWasActive && effect.kind === 'acquire'
              ? applyChibikoAllWeaponBoost(upgraded, boost)
              : upgraded,
          },
          pendingGuaranteedUpgradeChoiceKeys,
          ...finishLevelupState(s),
        }
      })
      recordUpgradeMissionState()
    },

    cheatAcquireWeapon: (id) => {
      if (!WEAPON_CATALOG[id]) return false
      set((s) => {
        const wpn = s.weapons[id]
        if (!wpn) return {}
        const acquired = { ...wpn, active: true, level: Math.max(1, wpn.level ?? 0) }
        const acquiringChibiko = id === 'chibiko' && !s.weapons.chibiko?.active
        const chibikoActive = s.weapons.chibiko?.active || acquiringChibiko
        const boost = getChibikoAllWeaponBoost(s.weapons.chibiko?.permanentUpgradeLevel ?? 0)
        if (acquiringChibiko) {
          return {
            weapons: Object.fromEntries(Object.entries({ ...s.weapons, [id]: acquired }).map(([weaponId, weapon]) => [
              weaponId,
              weaponId === 'chibiko' || !weapon.active ? weapon : applyChibikoAllWeaponBoost(weapon, boost),
            ])),
          }
        }
        return {
          weapons: {
            ...s.weapons,
            [id]: chibikoActive && id !== 'chibiko' ? applyChibikoAllWeaponBoost(acquired, boost) : acquired,
          },
        }
      })
      return true
    },

    // 보스 — 스폰마다 생존 보스 수 +1(더블 보스는 두 번 호출). bossSpawned는 최초 등장 표식(HUD 경고 해제 등).
    spawnBoss: () => set((s) => ({ bossSpawned: true, bossAliveCount: s.bossAliveCount + 1 })),

    activateEscapePortal: () => set({ escapePortalActive: true }),
    spawnMatilda: () => set({ matildaSpawned: true }),

    // 보스 처치 시 호출(Enemy.jsx). 마지막 생존 보스에서는 처치 사실과 징글만 기록한다.
    // 스테이지 클리어/런 종료는 하지 않으며, 점수 보너스는 포탈 클리어에서만 확정한다.
    // bossAliveCount=0 가드가 중복 기록과 징글을 막는다.
    recordBossDefeat: () => {
      const s = get()
      if (s.phase !== 'playing' || s.bossAliveCount <= 0) return false
      const remaining = Math.max(0, s.bossAliveCount - 1)
      if (remaining > 0) {
        set({ bossAliveCount: remaining })
        return true
      }
      set({ bossAliveCount: 0, bossDefeated: true })
      emitSfx({ id: 'bossClearJingle' })
      return true
    },

    clearStage: () => {
      set({ phase: 'cleared', pauseSource: null })
      emitSfx({ id: 'stageClear' })
      get()._onRunEnd('cleared')
    },

    clearStageAndStartNext: () => {
      const s = get()
      if (s.phase !== 'playing') return false
      const nextStageId = getNextStageId(s.currentStageId)
      if (!nextStageId) {
        get().clearStage()
        return false
      }
      emitSfx({ id: 'stageClear' })
      get()._onRunEnd('cleared')
      get().resetGame(nextStageId, { preserveQuestJourney: true })
      return true
    },

    // 게임 리셋. gameKey를 올려 Physics 트리를 새로 마운트한다.
    resetGame: (stageId = DEFAULT_STAGE_ID, { preserveQuestJourney = false } = {}) => {
      resetRuntimeRefs()
      const progressReady = isFirebaseProgressHydrated()
      const levels = loadRuntimePassiveLevels()
      const bossPassiveUnlocks = progressReady ? loadBossPassiveUnlocks() : get().bossPassiveUnlocks
      const nextStageId = getStageConfig(stageId).id
      applyMagnetPassive(levels)
      syncStoredWeaponUnlocksFromRecords()
      set((s) => ({
        player:      buildInitialPlayer(levels, bossPassiveUnlocks),
        weapons:     buildInitialWeapons(levels, { applyPermanent: progressReady, bossPassiveUnlocks }),
        bossPassiveUnlocks,
        growthMultiplier: buildGrowthMultiplier(levels),
        phase:       'playing',
        pauseSource: null,
        studentDialogue: null,
        introDialogue: null,
        elapsedMs:   0,
        runStartedAt: Date.now(),
        currentStageId: nextStageId,
        bossSpawnSec: getBossSpawnSec(nextStageId),
        bossSpawned: false,
        bossAliveCount: 0,
        bossDefeated: false,
        escapePortalActive: false,
        matildaSpawned: false,
        deathCause: null,
        bossBonus: 0,
        godMode: false,
        gameKey:     s.gameKey + 1,
        goldSession: 0,
        runKills:    0,
        runLevelUps: 0,
        newlyUnlockedWeaponIds: [],
        survivalMilestonesHit: [],
        recentMilestone: null,
        pendingLevelUps: 0,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
        levelUpAcquireExposureKeys: [],
        levelUpAcquireExposureSerial: -1,
        pendingGuaranteedUpgradeChoiceKeys: [],
        questProgress: createStageQuestProgress(nextStageId),
        questJourneyCompletedIds: preserveQuestJourney ? s.questJourneyCompletedIds : [],
        questToast: null,
        newQuestItemIds: [],
        questCollectedSourceIds: [],
        missionEventKeys: [],
        missionKillKeys: [],
        missionSpecialEnemySpawns: [],
      }))
      get().recordMissionEvent({ type: 'stage_started', stageId: nextStageId })
      recordRuntimePlayActivity(nextStageId)
      saveRuntimeProgress()
    },
  }))
)

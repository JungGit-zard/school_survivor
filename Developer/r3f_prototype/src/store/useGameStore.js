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
import { setMagnetMultiplier } from '../lib/pickup.js'
import {
  incrementRecord as incrementPlayerRecord,
  setBestIfHigher as setBestPlayerRecord,
  snapshot as snapshotPlayerRecords,
  load as loadPlayerRecords,
} from '../lib/playerRecords.js'
import { evaluateUnlocks, isStarter, WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { getAllUnlocked, setUnlocked as setWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { DEFAULT_STAGE_ID, getNextStageId, getStageConfig, rollBossSpawnSec } from '../lib/stageConfig.js'
import { getAdminBalanceConfig } from '../lib/adminConfig.js'
import { vibrateFeedback } from '../lib/titleSettings.js'
import { recordPlayActivity, requestCloudProgressSave, readFirebasePlayerProgress, updateFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { submitRun } from '../lib/firebaseRanking.js'
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
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

const BASE_PLAYER = {
  hp: 100, maxHp: 100,
  speed: 3, baseSpeed: 3,
  level: 1, xp: 0, xpToNext: 4,
  invulnerable: false,
  hitFlashToken: 0,
}

function buildInitialPlayer(levels) {
  const adminBalance = getAdminBalanceConfig()
  const maxHp = BASE_PLAYER.maxHp + 6 * (levels.maxHp ?? 0) + adminBalance.player.maxHpBonus
  const speed = BASE_PLAYER.speed * (1 + 0.03 * (levels.moveSpeed ?? 0)) * adminBalance.player.speedMultiplier
  return {
    ...BASE_PLAYER,
    hp: maxHp,
    maxHp,
    speed,
    baseSpeed: speed,
  }
}

// WEAPON_CATALOG가 무기 base 스탯의 단일 진실이다. starter 무기는 startsActive:true로 시작,
// 나머지는 unlock 카드가 fire될 때 비로소 weapons[key].active = true로 활성화.
// might passive multiplier는 모든 무기에 동일 적용.
function buildInitialWeapons(levels, { applyPermanent = true } = {}) {
  const mightMult = 1 + 0.04 * (levels.might ?? 0)
  const out = {}
  for (const [key, entry] of Object.entries(WEAPON_CATALOG)) {
    const permanentBase = applyPermanent ? applyWeaponPermanentUpgradesToBaseWeapon(key, entry.base) : entry.base
    const baseDamage = permanentBase?.damage ?? 0
    out[key] = {
      ...permanentBase,
      label: entry.label,
      level: entry.startsActive ? 1 : 0,
      active: !!entry.startsActive,
      damage: Math.round(baseDamage * mightMult * 10) / 10,
    }
  }
  return out
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
  return readFirebasePlayerProgress().goldTotal ?? 0
}

function saveGoldTotal(value) {
  updateFirebasePlayerProgress((progress) => {
    progress.goldTotal = Math.max(0, Math.floor(Number(value) || 0))
    return progress
  })
}

function syncStoredWeaponUnlocksFromRecords() {
  const nextUnlocked = evaluateUnlocks(loadPlayerRecords())
  const prevUnlocked = getAllUnlocked()
  for (const id of nextUnlocked) {
    if (isStarter(id)) continue
    if (prevUnlocked.has(id)) continue
    setWeaponUnlocked(id)
  }
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
export const STAGE1_INTRO_LINES = [
  '공부가 하기싫은 학생들의 마음은 그들을 좀비로 만들었다…',
  '일하기 싫은 교사들도 마찬가지로 좀비화 하였다.',
  '난 여기서 빠져나가야겠어, 여긴… 좀비학교다!',
]

const EMPTY_PASSIVE_LEVELS = Object.freeze({})
applyMagnetPassive(EMPTY_PASSIVE_LEVELS)

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    player:      buildInitialPlayer(EMPTY_PASSIVE_LEVELS),
    weapons:     buildInitialWeapons(EMPTY_PASSIVE_LEVELS, { applyPermanent: false }),
    growthMultiplier: buildGrowthMultiplier(EMPTY_PASSIVE_LEVELS),
    passiveVersion: 0,
    phase:       'playing',   // 'playing' | 'paused' | 'levelup' | 'gameover' | 'cleared'
    pauseSource: null,        // 'manual' | 'auto' | 'dialogue' | null
    studentDialogue: null,    // null | { line, reward?, subjectType, subjectName } — 조사 결과
    introDialogue: null,      // null | { index } — 스테이지1 스토리 인트로 대화창 상태
    elapsedMs:   0,
    // 런 시작 시각(ms). 런당 결정적 runId의 안정 토큰 — 종료 이벤트가 2회 발화해도
    // 같은 runId를 만들어 서버 dedup으로 이중가산을 막는다(M6).
    runStartedAt: Date.now(),
    currentStageId: DEFAULT_STAGE_ID,
    e2eInvincible: false,
    bossSpawnSec: rollBossSpawnSec(),
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
    gameKey:     0,
    goldSession: 0,
    goldTotal:   0,
    runKills:    0,
    runLevelUps: 0,
    newlyUnlockedWeaponIds: [],
    survivalMilestonesHit: [],
    recentMilestone: null,
    pendingLevelUps: 0,
    levelUpChoiceSerial: 0,
    questProgress: createStageQuestProgress(DEFAULT_STAGE_ID),
    questJourneyCompletedIds: [],
    questToast: null,
    newQuestItemIds: [],
    questCollectedSourceIds: [],

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
      const { player, phase, e2eInvincible } = get()
      if (phase !== 'playing') return
      if (e2eInvincible) return
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
        vibrateFeedback([40, 60, 40])
        get()._onRunEnd('gameover')
        return
      }
      emitSfx({ id: 'playerHit' })
      vibrateFeedback(18)
      set({ player: { ...player, hp, invulnerable: true, hitFlashToken: player.hitFlashToken + 1 } })
      // 무적 해제는 Player.jsx의 useFrame에서 처리한다. setTimeout을 쓰지 않는다.
    },

    endInvulnerable: () => set((s) => ({ player: { ...s.player, invulnerable: false } })),

    healPlayer: (amount) => set((s) => ({
      player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + amount) },
    })),

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
        xpToNext = Math.ceil(xpToNext * 1.24 + 2)
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

    // 보스 처치는 mid-run에 즉시 cumulative에 누적. B01은 한 런에 1회 이하이므로 안전.
    recordBossKill: () => {
      incrementPlayerRecord('bossKills', 1)
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
      const evalInput = {
        ...loadPlayerRecords(),
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

      // 2. 평가 → diff (starter 제외, 이미 unlock된 것 제외)
      const nextUnlocked = evaluateUnlocks(evalInput)
      const prevUnlocked = getAllUnlocked()
      const diff = []
      for (const id of nextUnlocked) {
        if (isStarter(id)) continue
        if (prevUnlocked.has(id)) continue
        diff.push(id)
      }
      diff.forEach((id) => setWeaponUnlocked(id))

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
      requestCloudProgressSave()

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

    gainGold: (amount) => {
      if (!amount) return
      const { goldSession, goldTotal } = get()
      const nextTotal = goldTotal + amount
      saveGoldTotal(nextTotal)
      set({ goldSession: goldSession + amount, goldTotal: nextTotal })
      requestCloudProgressSave()
    },

    spendGold: (amount) => {
      if (!amount || amount < 0) return false
      const { goldTotal } = get()
      if (goldTotal < amount) return false
      const nextTotal = goldTotal - amount
      saveGoldTotal(nextTotal)
      set({ goldTotal: nextTotal })
      requestCloudProgressSave()
      return true
    },

    purchasePassive: (id) => {
      const { goldTotal } = get()
      const result = purchasePassiveStorage(id, goldTotal)
      if (!result.ok) return result
      saveGoldTotal(result.nextGold)
      set((s) => ({ goldTotal: result.nextGold, passiveVersion: s.passiveVersion + 1 }))
      requestCloudProgressSave()
      return result
    },

    purchaseWeaponPermanentUpgrade: (id) => {
      const { goldTotal } = get()
      const result = purchaseWeaponPermanentUpgradeStorage(id, goldTotal)
      if (!result.ok) return result
      saveGoldTotal(result.nextGold)
      const levels = getAllLevels()
      set((s) => ({
        goldTotal: result.nextGold,
        weapons: buildInitialWeapons(levels),
        passiveVersion: s.passiveVersion + 1,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
      }))
      requestCloudProgressSave()
      return result
    },

    resetPassiveUpgrades: () => {
      resetPassiveStorage()
      const levels = getAllLevels()
      applyMagnetPassive(levels)
      set((s) => ({
        player: buildInitialPlayer(levels),
        weapons: buildInitialWeapons(levels),
        growthMultiplier: buildGrowthMultiplier(levels),
        passiveVersion: s.passiveVersion + 1,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
      }))
      requestCloudProgressSave()
    },

    reloadPersistentProgress: () => {
      const levels = getAllLevels()
      applyMagnetPassive(levels)
      syncStoredWeaponUnlocksFromRecords()
      set((s) => ({
        goldTotal: loadGoldTotal(),
        player: buildInitialPlayer(levels),
        weapons: buildInitialWeapons(levels),
        growthMultiplier: buildGrowthMultiplier(levels),
        passiveVersion: s.passiveVersion + 1,
      }))
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
      requestCloudProgressSave()
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
      requestCloudProgressSave()
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
    openStudentDialogue: (line, reward = null, subject = {}) => set((s) => {
      if (s.phase !== 'playing') return {}
      return {
        phase: 'paused',
        pauseSource: 'dialogue',
        studentDialogue: {
          line,
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
      if (next >= STAGE1_INTRO_LINES.length) {
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

    applyUpgrade: (key) => {
      const effect = UPGRADE_EFFECTS[key]

      if (effect?.kind === 'player') {
        if (key === 'moveSpeed') {
          set((s) => ({
            player: { ...s.player, speed: Math.min(s.player.baseSpeed * 1.8, s.player.speed * 1.1) },
            ...finishLevelupState(s),
          }))
        } else if (key === 'maxHealth') {
          set((s) => ({
            player: { ...s.player, maxHp: s.player.maxHp + 20, hp: s.player.hp + 20 },
            ...finishLevelupState(s),
          }))
        } else {
          set((s) => finishLevelupState(s))
        }
        return
      }

      if (!effect) { set((s) => finishLevelupState(s)); return }

      const { weapons } = get()
      const wpn = weapons[effect.weapon]
      set((s) => {
        const chibikoWasActive = s.weapons.chibiko?.active === true
        const acquiringChibiko = effect.kind === 'acquire' && effect.weapon === 'chibiko'
        const boost = getChibikoAllWeaponBoost(s.weapons.chibiko?.permanentUpgradeLevel)
        const upgraded = applyUpgradeWithChibikoBoost(wpn, effect, boost)

        if (acquiringChibiko) {
          return {
            weapons: Object.fromEntries(Object.entries({ ...s.weapons, chibiko: upgraded }).map(([id, weapon]) => [
              id,
              id === 'chibiko' || !weapon.active ? weapon : applyChibikoAllWeaponBoost(weapon, boost),
            ])),
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
          ...finishLevelupState(s),
        }
      })
    },

    cheatAcquireWeapon: (id) => {
      if (!WEAPON_CATALOG[id]) return false
      set((s) => {
        const wpn = s.weapons[id]
        if (!wpn) return {}
        const acquired = { ...wpn, active: true, level: Math.max(1, wpn.level ?? 0) }
        const acquiringChibiko = id === 'chibiko' && !s.weapons.chibiko?.active
        const chibikoActive = s.weapons.chibiko?.active || acquiringChibiko
        const boost = getChibikoAllWeaponBoost(s.weapons.chibiko?.permanentUpgradeLevel)
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
      const levels = getAllLevels()
      const nextStageId = getStageConfig(stageId).id
      applyMagnetPassive(levels)
      syncStoredWeaponUnlocksFromRecords()
      set((s) => ({
        player:      buildInitialPlayer(levels),
        weapons:     buildInitialWeapons(levels),
        growthMultiplier: buildGrowthMultiplier(levels),
        phase:       'playing',
        pauseSource: null,
        studentDialogue: null,
        introDialogue: null,
        elapsedMs:   0,
        runStartedAt: Date.now(),
        currentStageId: nextStageId,
        e2eInvincible: false,
        bossSpawnSec: rollBossSpawnSec(),
        bossSpawned: false,
        bossAliveCount: 0,
        bossDefeated: false,
        escapePortalActive: false,
        matildaSpawned: false,
        deathCause: null,
        bossBonus: 0,
        gameKey:     s.gameKey + 1,
        goldSession: 0,
        runKills:    0,
        runLevelUps: 0,
        newlyUnlockedWeaponIds: [],
        survivalMilestonesHit: [],
        recentMilestone: null,
        pendingLevelUps: 0,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
        questProgress: createStageQuestProgress(nextStageId),
        questJourneyCompletedIds: preserveQuestJourney ? s.questJourneyCompletedIds : [],
        questToast: null,
        newQuestItemIds: [],
        questCollectedSourceIds: [],
      }))
      recordPlayActivity(nextStageId)
      requestCloudProgressSave()
    },
  }))
)

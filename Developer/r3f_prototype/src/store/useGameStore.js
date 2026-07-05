import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { UPGRADE_EFFECTS, applyUpgradeToWeapon } from '../lib/upgrades.js'
import { resetRuntimeRefs } from '../lib/refs.js'
import { getAllLevels, purchase as purchasePassiveStorage, resetAllLevels as resetPassiveStorage } from '../lib/passiveUpgrades.js'
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
import { getAdminBalanceConfig } from '../lib/adminConfig.js'
import { requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { submitRun } from '../lib/firebaseRanking.js'
import { useAuthStore } from './useAuthStore.js'
import { getRankingScore, getRankingScorePolicy, STAGE_BONUS, CLEAR_BONUS } from '../lib/rankingScorePolicy.js'
import { logDamageTaken } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'

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
function buildInitialWeapons(levels) {
  const mightMult = 1 + 0.04 * (levels.might ?? 0)
  const out = {}
  for (const [key, entry] of Object.entries(WEAPON_CATALOG)) {
    const baseDamage = entry.base?.damage ?? 0
    out[key] = {
      ...entry.base,
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
  if (typeof localStorage === 'undefined') return 0
  const raw = localStorage.getItem(GOLD_STORAGE_KEY)
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function saveGoldTotal(value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GOLD_STORAGE_KEY, String(value))
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

const _initialLevels = getAllLevels()
applyMagnetPassive(_initialLevels)
syncStoredWeaponUnlocksFromRecords()

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    player:      buildInitialPlayer(_initialLevels),
    weapons:     buildInitialWeapons(_initialLevels),
    growthMultiplier: buildGrowthMultiplier(_initialLevels),
    passiveVersion: 0,
    phase:       'playing',   // 'playing' | 'paused' | 'levelup' | 'gameover' | 'cleared'
    pauseSource: null,        // 'manual' | 'auto' | null
    elapsedMs:   0,
    currentStageId: DEFAULT_STAGE_ID,
    bossSpawned: false,
    escapePortalActive: false,
    matildaSpawned: false,
    bossBonus: 0,
    gameKey:     0,
    goldSession: 0,
    goldTotal:   loadGoldTotal(),
    runKills:    0,
    runLevelUps: 0,
    newlyUnlockedWeaponIds: [],
    survivalMilestonesHit: [],
    recentMilestone: null,
    pendingLevelUps: 0,
    levelUpChoiceSerial: 0,

    // 타이머
    tickTime: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),

    // 플레이어 피해
    damagePlayer: (amount) => {
      const { player, phase } = get()
      if (phase !== 'playing') return
      if (player.invulnerable) return
      const hp = Math.max(0, player.hp - amount)
      logDamageTaken(amount, hp)
      if (hp <= 0) {
        set({ player: { ...player, hp }, phase: 'gameover', pauseSource: null })
        emitSfx({ id: 'playerDeath' })
        get()._onRunEnd('gameover')
        return
      }
      emitSfx({ id: 'playerHit' })
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
      const runSurvivalSeconds = Math.floor(s.elapsedMs / 1000)
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
      const user = useAuthStore.getState().user
      if (user) {
        const policy = getRankingScorePolicy()
        const score = getRankingScore({ stageId: s.currentStageId, survivalSeconds: runSurvivalSeconds, cleared, bossBonus: s.bossBonus }, policy)
        submitRun(user, { stageId: s.currentStageId, score, timeMs: s.elapsedMs, cleared }).catch(() => {})
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

    checkSurvivalMilestone: () => {
      const s = get()
      const milestones = getStageConfig(s.currentStageId).survivalMilestones ?? SURVIVAL_MILESTONES
      const earned = milestones.filter(
        (milestone) => s.elapsedMs >= milestone.atMs && !s.survivalMilestonesHit.includes(milestone.atMs),
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

    resumeGame: () => set((s) => {
      if (s.phase !== 'paused') return {}
      return { phase: 'playing', pauseSource: null }
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
      set((s) => ({
        weapons: { ...s.weapons, [effect.weapon]: applyUpgradeToWeapon(wpn, effect) },
        ...finishLevelupState(s),
      }))
    },

    cheatAcquireWeapon: (id) => {
      if (!WEAPON_CATALOG[id]) return false
      set((s) => {
        const wpn = s.weapons[id]
        if (!wpn) return {}
        return {
          weapons: {
            ...s.weapons,
            [id]: { ...wpn, active: true, level: Math.max(1, wpn.level ?? 0) },
          },
        }
      })
      return true
    },

    // 보스
    spawnBoss: () => set({ bossSpawned: true }),

    activateEscapePortal: () => set({ escapePortalActive: true }),
    spawnMatilda: () => set({ matildaSpawned: true }),

    // B01 격퇴 시 호출 — 그 시점 총점의 20%를 bossBonus로 저장 후 클리어
    clearStageWithBossBonus: () => {
      const s = get()
      if (s.phase !== 'playing') return
      const policy = getRankingScorePolicy()
      const survivalSec = Math.floor(s.elapsedMs / 1000)
      const stageBonus = policy.stageBonus?.[s.currentStageId] ?? STAGE_BONUS[s.currentStageId] ?? 0
      const clearBonus = policy.clearBonus ?? CLEAR_BONUS
      const baseScore = survivalSec + stageBonus + clearBonus
      const bonus = Math.floor(baseScore * 0.2)
      set({ bossBonus: bonus, phase: 'cleared', pauseSource: null })
      emitSfx({ id: 'bossClearJingle' })
      get()._onRunEnd('cleared')
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
      get().resetGame(nextStageId)
      return true
    },

    // 게임 리셋. gameKey를 올려 Physics 트리를 새로 마운트한다.
    resetGame: (stageId = DEFAULT_STAGE_ID) => {
      resetRuntimeRefs()
      const levels = getAllLevels()
      applyMagnetPassive(levels)
      syncStoredWeaponUnlocksFromRecords()
      set((s) => ({
        player:      buildInitialPlayer(levels),
        weapons:     buildInitialWeapons(levels),
        growthMultiplier: buildGrowthMultiplier(levels),
        phase:       'playing',
        pauseSource: null,
        elapsedMs:   0,
        currentStageId: getStageConfig(stageId).id,
        bossSpawned: false,
        escapePortalActive: false,
        matildaSpawned: false,
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
      }))
    },
  }))
)

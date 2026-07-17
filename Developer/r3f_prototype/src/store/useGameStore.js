import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { UPGRADE_EFFECTS, applyUpgradeToWeapon } from '../lib/upgrades.js'
import { resetRuntimeRefs, playerPos } from '../lib/refs.js'
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
import { vibrateFeedback } from '../lib/titleSettings.js'
import { recordPlayActivity, requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { submitRun } from '../lib/firebaseRanking.js'
import { useAuthStore } from './useAuthStore.js'
import { getRankingScore, getRankingScorePolicy, STAGE_BONUS, CLEAR_BONUS } from '../lib/rankingScorePolicy.js'
import { logDamageTaken } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitDamageNumber, DAMAGE_NUMBER_COLORS } from '../lib/damageNumbers.js'

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

// 스테이지1 스토리 인트로 내레이션 3줄. 화면 탭마다 다음 줄, 마지막 탭에 플레이 시작.
export const STAGE1_INTRO_LINES = [
  '공부가 하기싫은 학생들의 마음은 그들을 좀비로 만들었다…',
  '일하기 싫은 교사들도 마찬가지로 좀비화 하였다.',
  '난 여기서 빠져나가야겠어, 여긴… 좀비학교다!',
]

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
    pauseSource: null,        // 'manual' | 'auto' | 'dialogue' | null
    studentDialogue: null,    // null | { line, reward? } — 쓰러진 학생 조사 결과
    introDialogue: null,      // null | { index } — 스테이지1 스토리 인트로 대화창 상태
    elapsedMs:   0,
    currentStageId: DEFAULT_STAGE_ID,
    bossSpawned: false,
    // 현재 생존 중인 보스 수. 더블 보스(stage3) 클리어 게이팅에 쓴다 — 마지막 보스 처치 시에만 클리어.
    // 단일 보스(stage1/2)는 spawnBoss 1회 → 1, 처치 시 0 → 즉시 클리어(기존 거동 불변).
    bossAliveCount: 0,
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
    damagePlayer: (amount, { ignoreInvulnerability = false } = {}) => {
      const { player, phase } = get()
      if (phase !== 'playing') return
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
        set({ player: { ...player, hp }, phase: 'gameover', pauseSource: null })
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

    // 쓰러진 학생 대화: playing일 때만 대화용으로 일시정지(pauseSource='dialogue')한다.
    // 일반 일시정지 메뉴와 구분하기 위해 pauseSource로 분기 — HUD가 이 값으로 오버레이를 나눈다.
    openStudentDialogue: (line, reward = null) => set((s) => {
      if (s.phase !== 'playing') return {}
      return { phase: 'paused', pauseSource: 'dialogue', studentDialogue: { line, reward } }
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

    // 보스 — 스폰마다 생존 보스 수 +1(더블 보스는 두 번 호출). bossSpawned는 최초 등장 표식(HUD 경고 해제 등).
    spawnBoss: () => set((s) => ({ bossSpawned: true, bossAliveCount: s.bossAliveCount + 1 })),

    activateEscapePortal: () => set({ escapePortalActive: true }),
    spawnMatilda: () => set({ matildaSpawned: true }),

    // 보스 격퇴 시 호출(Enemy.jsx). 그 시점 총점의 20%를 bossBonus로 저장 후 클리어.
    // 더블 보스(stage3): 아직 살아있는 보스가 남으면 클리어를 미루고 카운트만 감소 —
    // 마지막 보스를 처치해 bossAliveCount가 0이 될 때만 실제 클리어/보너스를 진행한다.
    clearStageWithBossBonus: () => {
      const s = get()
      if (s.phase !== 'playing') return
      const remaining = Math.max(0, s.bossAliveCount - 1)
      if (remaining > 0) {
        set({ bossAliveCount: remaining })
        return
      }
      set({ bossAliveCount: 0 })
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
        currentStageId: nextStageId,
        bossSpawned: false,
        bossAliveCount: 0,
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
      recordPlayActivity(nextStageId)
      requestCloudProgressSave()
    },
  }))
)

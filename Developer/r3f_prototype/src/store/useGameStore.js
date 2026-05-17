import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { UPGRADE_EFFECTS, applyUpgradeToWeapon } from '../lib/upgrades.js'
import { resetRuntimeRefs } from '../lib/refs.js'
import { getAllLevels, purchase as purchasePassiveStorage } from '../lib/passiveUpgrades.js'
import { setMagnetMultiplier } from '../lib/pickup.js'

const BASE_PLAYER = {
  hp: 100, maxHp: 100,
  speed: 3, baseSpeed: 3,
  level: 1, xp: 0, xpToNext: 4,
  invulnerable: false,
}

function buildInitialPlayer(levels) {
  const maxHp = BASE_PLAYER.maxHp + 6 * (levels.maxHp ?? 0)
  const speed = BASE_PLAYER.speed * (1 + 0.03 * (levels.moveSpeed ?? 0))
  return {
    ...BASE_PLAYER,
    hp: maxHp,
    maxHp,
    speed,
    baseSpeed: speed,
  }
}

function buildInitialWeapons(levels) {
  const mightMult = 1 + 0.04 * (levels.might ?? 0)
  const out = {}
  for (const [key, w] of Object.entries(BASE_WEAPONS)) {
    out[key] = { ...w, damage: Math.round(w.damage * mightMult * 10) / 10 }
  }
  return out
}

function buildGrowthMultiplier(levels) {
  return 1 + 0.05 * (levels.growth ?? 0)
}

function applyMagnetPassive(levels) {
  setMagnetMultiplier(1 + 0.08 * (levels.magnet ?? 0))
}

const GOLD_STORAGE_KEY = 'school_survivor:goldTotal'

export const SURVIVAL_MILESTONES = [
  { atMs: 60_000, gold: 1, label: '1분 생존 보너스' },
  { atMs: 180_000, gold: 3, label: '3분 돌파 보너스' },
  { atMs: 240_000, gold: 4, label: '보스 조우 보너스' },
  { atMs: 300_000, gold: 8, label: '학교 탈출 보너스' },
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

const BASE_WEAPONS = {
  pencilThrow:   { label: '연필', level: 1, damage: 8,  cooldown: 1100, lastFired: 0, projectileCount: 1, pierce: 0, speed: 12, range: 22, active: true },
  schoolBag:     { label: '30cm 자', level: 0, damage: 12, cooldown: 1300, range: 0.633, triggerRange: 1.0, swingMs: 260, active: false },
  tumbler:       { label: '텀블러', level: 0, damage: 4,  radius: 1.0, hitsPerSecond: 2.5, orbitSpeed: 2.8, count: 1, active: false },
  scienceFlask:  { label: '과학 플라스크', level: 0, damage: 30, cooldown: 2800, radius: 1.6, range: 2, active: false },
  bell:          { label: '벨', level: 0, damage: 10, cooldown: 4500, lastFired: 0, directions: 8, speed: 10, radius: 1.7, active: false },
  stunGun:       { label: '전기', level: 0, damage: 18, cooldown: 3000, lastFired: 0, chainCount: 2, active: false },
  onigiri:       { label: '오니기리', level: 0, damage: 14, cooldown: 2000, bounces: 4, bounceRange: 4.5, range: 18, active: false },
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

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    player:      buildInitialPlayer(_initialLevels),
    weapons:     buildInitialWeapons(_initialLevels),
    growthMultiplier: buildGrowthMultiplier(_initialLevels),
    passiveVersion: 0,
    phase:       'playing',   // 'playing' | 'paused' | 'levelup' | 'gameover' | 'cleared'
    pauseSource: null,        // 'manual' | 'auto' | null
    elapsedMs:   0,
    bossSpawned: false,
    gameKey:     0,
    goldSession: 0,
    goldTotal:   loadGoldTotal(),
    survivalMilestonesHit: [],
    recentMilestone: null,
    pendingLevelUps: 0,
    levelUpChoiceSerial: 0,

    // 타이머
    tickTime: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),

    // 플레이어 피해
    damagePlayer: (amount) => {
      const { player } = get()
      if (player.invulnerable) return
      const hp = Math.max(0, player.hp - amount)
      if (hp <= 0) { set({ player: { ...player, hp }, phase: 'gameover', pauseSource: null }); return }
      set({ player: { ...player, hp, invulnerable: true } })
      // 무적 해제는 Player.jsx의 useFrame에서 처리한다. setTimeout을 쓰지 않는다.
    },

    endInvulnerable: () => set((s) => ({ player: { ...s.player, invulnerable: false } })),

    healPlayer: (amount) => set((s) => ({
      player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + amount) },
    })),

    // 경험치와 레벨업
    gainXp: (amount) => {
      const { player, pendingLevelUps, growthMultiplier } = get()
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
        set({
          player: { ...player, xp, xpToNext, level },
          pendingLevelUps: pendingLevelUps + gainedLevelUps,
          phase: 'levelup',
        })
        return
      }
      set({ player: { ...player, xp } })
    },

    gainGold: (amount) => {
      if (!amount) return
      const { goldSession, goldTotal } = get()
      const nextTotal = goldTotal + amount
      saveGoldTotal(nextTotal)
      set({ goldSession: goldSession + amount, goldTotal: nextTotal })
    },

    spendGold: (amount) => {
      if (!amount || amount < 0) return false
      const { goldTotal } = get()
      if (goldTotal < amount) return false
      const nextTotal = goldTotal - amount
      saveGoldTotal(nextTotal)
      set({ goldTotal: nextTotal })
      return true
    },

    purchasePassive: (id) => {
      const { goldTotal } = get()
      const result = purchasePassiveStorage(id, goldTotal)
      if (!result.ok) return result
      saveGoldTotal(result.nextGold)
      set((s) => ({ goldTotal: result.nextGold, passiveVersion: s.passiveVersion + 1 }))
      return result
    },

    checkSurvivalMilestone: () => {
      const s = get()
      const earned = SURVIVAL_MILESTONES.filter(
        (milestone) => s.elapsedMs >= milestone.atMs && !s.survivalMilestonesHit.includes(milestone.atMs),
      )
      if (earned.length === 0) return

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

    // 보스
    spawnBoss: () => set({ bossSpawned: true }),
    clearStage: () => set({ phase: 'cleared', pauseSource: null }),

    // 게임 리셋. gameKey를 올려 Physics 트리를 새로 마운트한다.
    resetGame: () => {
      resetRuntimeRefs()
      const levels = getAllLevels()
      applyMagnetPassive(levels)
      set((s) => ({
        player:      buildInitialPlayer(levels),
        weapons:     buildInitialWeapons(levels),
        growthMultiplier: buildGrowthMultiplier(levels),
        phase:       'playing',
        pauseSource: null,
        elapsedMs:   0,
        bossSpawned: false,
        gameKey:     s.gameKey + 1,
        goldSession: 0,
        survivalMilestonesHit: [],
        recentMilestone: null,
        pendingLevelUps: 0,
        levelUpChoiceSerial: s.levelUpChoiceSerial + 1,
      }))
    },
  }))
)

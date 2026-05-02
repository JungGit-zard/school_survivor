import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const INITIAL_PLAYER = {
  hp: 100, maxHp: 100,
  speed: 3, baseSpeed: 3,
  level: 1, xp: 0, xpToNext: 6,
  invulnerable: false,
}

const INITIAL_WEAPONS = {
  pencilThrow: { label: '연필', damage: 9, cooldown: 900, lastFired: 0, projectileCount: 1, pierce: 0, speed: 12, range: 22, active: true },
  schoolBag:   { label: '30센치 자 휘두르기', damage: 22, cooldown: 1000, range: 0.95, triggerRange: 1.0, swingMs: 260, active: true },
  tumbler:     { label: '텀블러', damage: 10, radius: 1.0, hitsPerSecond: 3.5, orbitSpeed: 2.8, count: 1, active: true },
  scienceFlask:{ label: '과학 삼각플라스크', damage: 32, cooldown: 2600, radius: 1.6, range: 2, active: false },
  bell:        { label: '벨', damage: 14, cooldown: 4200, lastFired: 0, directions: 8, speed: 10, active: false },
  stunGun:     { label: '전기', damage: 22, cooldown: 2800, lastFired: 0, chainCount: 2, active: false },
}

INITIAL_WEAPONS.schoolBag.range = 0.633
INITIAL_WEAPONS.schoolBag.triggerRange = 1.0
INITIAL_WEAPONS.bell.radius = 1.7

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    player:      { ...INITIAL_PLAYER },
    weapons:     { ...INITIAL_WEAPONS },
    phase:       'playing',   // 'playing' | 'paused' | 'levelup' | 'gameover' | 'cleared'
    elapsedMs:   0,
    bossSpawned: false,
    gameKey:     0,

    // ── 타이머 ────────────────────────────────────────────────────────
    tickTime: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),

    // ── 플레이어 피해 ──────────────────────────────────────────────────
    damagePlayer: (amount) => {
      const { player } = get()
      if (player.invulnerable) return
      const hp = Math.max(0, player.hp - amount)
      if (hp <= 0) { set({ player: { ...player, hp }, phase: 'gameover' }); return }
      set({ player: { ...player, hp, invulnerable: true } })
      // 무적 해제는 Player.jsx의 useFrame에서 처리 (setTimeout 제거)
    },

    endInvulnerable: () => set((s) => ({ player: { ...s.player, invulnerable: false } })),

    healPlayer: (amount) => set((s) => ({
      player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + amount) },
    })),

    // ── 경험치 / 레벨업 ───────────────────────────────────────────────
    gainXp: (amount) => {
      const { player } = get()
      let { xp, xpToNext, level } = player
      xp += amount
      if (xp >= xpToNext) {
        xp -= xpToNext
        level += 1
        xpToNext = Math.ceil(xpToNext * 1.24 + 2)
        set({ player: { ...player, xp, xpToNext, level }, phase: 'levelup' })
      } else {
        set({ player: { ...player, xp } })
      }
    },

    resumeFromLevelup: () => set({ phase: 'playing' }),

    togglePause: () => set((s) => {
      if (s.phase === 'playing') return { phase: 'paused' }
      if (s.phase === 'paused') return { phase: 'playing' }
      return {}
    }),

    // ── 업그레이드 적용 ───────────────────────────────────────────────
    applyUpgrade: (key) => {
      const { player, weapons } = get()
      const w = { ...weapons }
      if (key === 'pencilDamage')  w.pencilThrow = { ...w.pencilThrow, damage: w.pencilThrow.damage + 3 }
      if (key === 'pencilCount')   w.pencilThrow = { ...w.pencilThrow, projectileCount: Math.min(4, (w.pencilThrow.projectileCount ?? 1) + 1) }
      if (key === 'pencilPierce')  w.pencilThrow = { ...w.pencilThrow, pierce: Math.min(3, w.pencilThrow.pierce + 1) }
      if (key === 'bagDamage')     w.schoolBag   = { ...w.schoolBag,   damage: w.schoolBag.damage + 8 }
      if (key === 'bagRadius')     w.schoolBag   = { ...w.schoolBag,   range: Math.min(1.067, w.schoolBag.range + 0.08) }
      if (key === 'tumblerCount')  w.tumbler     = { ...w.tumbler,     count: Math.min(3, (w.tumbler.count ?? 1) + 1) }
      if (key === 'tumblerDamage') w.tumbler     = { ...w.tumbler,     damage: w.tumbler.damage + 4 }
      if (key === 'unlockFlask')   w.scienceFlask = { ...w.scienceFlask, active: true }
      if (key === 'flaskDamage')   w.scienceFlask = { ...w.scienceFlask, damage: w.scienceFlask.damage + 10 }
      if (key === 'flaskRadius')   w.scienceFlask = { ...w.scienceFlask, radius: Math.min(2.4, w.scienceFlask.radius + 0.18) }
      if (key === 'unlockBell')    w.bell        = { ...w.bell,        active: true }
      if (key === 'bellDamage')    w.bell        = { ...w.bell,        damage: w.bell.damage + 5 }
      if (key === 'unlockStun')    w.stunGun     = { ...w.stunGun,     active: true }
      if (key === 'stunChain')     w.stunGun     = { ...w.stunGun,     chainCount: Math.min(4, w.stunGun.chainCount + 1) }
      if (key === 'moveSpeed')     set({ player: { ...player, speed: Math.min(player.baseSpeed * 1.8, player.speed * 1.1) } })
      if (key === 'maxHealth')     set({ player: { ...player, maxHp: player.maxHp + 20, hp: player.hp + 20 } })
      set({ weapons: w, phase: 'playing' })
    },

    // ── 보스 ──────────────────────────────────────────────────────────
    spawnBoss: () => set({ bossSpawned: true }),
    clearStage: () => set({ phase: 'cleared' }),

    // ── 게임 리셋 (gameKey 증가로 Physics 트리 재마운트) ───────────────
    resetGame: () => set((s) => ({
      player:      { ...INITIAL_PLAYER },
      weapons:     { ...INITIAL_WEAPONS },
      phase:       'playing',
      elapsedMs:   0,
      bossSpawned: false,
      gameKey:     s.gameKey + 1,
    })),
  }))
)

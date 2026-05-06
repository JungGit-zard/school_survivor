import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const INITIAL_PLAYER = {
  hp: 100, maxHp: 100,
  speed: 3, baseSpeed: 3,
  level: 1, xp: 0, xpToNext: 6,
  invulnerable: false,
}

// 2026-05-06 재밸런싱: "몇 방에 죽는가" 데미지 공식 + 5분 세션 5단계 성장 (Stage1 replan).
// 각 무기 Lv.1 기준값. level 필드는 1~5, applyUpgrade에서 단계적으로 증가.
const INITIAL_WEAPONS = {
  pencilThrow:   { label: '연필', level: 1, damage: 8,  cooldown: 1100, lastFired: 0, projectileCount: 1, pierce: 0, speed: 12, range: 22, active: true },
  schoolBag:     { label: '30cm 자', level: 0, damage: 12, cooldown: 1300, range: 0.633, triggerRange: 1.0, swingMs: 260, active: false },
  tumbler:       { label: '텀블러', level: 0, damage: 4,  radius: 1.0, hitsPerSecond: 2.5, orbitSpeed: 2.8, count: 1, active: false },
  scienceFlask:  { label: '과학 플라스크', level: 0, damage: 30, cooldown: 2800, radius: 1.6, range: 2, active: false },
  bell:          { label: '벨', level: 0, damage: 10, cooldown: 4500, lastFired: 0, directions: 8, speed: 10, radius: 1.7, active: false },
  stunGun:       { label: '전기', level: 0, damage: 18, cooldown: 3000, lastFired: 0, chainCount: 2, active: false },
  guidedMissile: { label: '보조배터리', level: 0, damage: 18, cooldown: 4200, radius: 1.6, range: 22, count: 1, active: false },
  starlink:      { label: '고장난 스타링크', level: 0, damage: 22, cooldown: 4000, radius: 1.2, strikeCount: 1, active: false },
  onigiri:       { label: '오니기리', level: 0, damage: 14, cooldown: 2000, bounces: 4, bounceRange: 4.5, range: 18, active: false },
}

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    player:      { ...INITIAL_PLAYER },
    weapons:     { ...INITIAL_WEAPONS },
    phase:       'playing',   // 'playing' | 'paused' | 'levelup' | 'gameover' | 'cleared'
    elapsedMs:   0,
    bossSpawned: false,
    gameKey:     0,

    // ?? ??대㉧ ????????????????????????????????????????????????????????
    tickTime: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),

    // ?? ?뚮젅?댁뼱 ?쇳빐 ??????????????????????????????????????????????????
    damagePlayer: (amount) => {
      const { player } = get()
      if (player.invulnerable) return
      const hp = Math.max(0, player.hp - amount)
      if (hp <= 0) { set({ player: { ...player, hp }, phase: 'gameover' }); return }
      set({ player: { ...player, hp, invulnerable: true } })
      // 臾댁쟻 ?댁젣??Player.jsx??useFrame?먯꽌 泥섎━ (setTimeout ?쒓굅)
    },

    endInvulnerable: () => set((s) => ({ player: { ...s.player, invulnerable: false } })),

    healPlayer: (amount) => set((s) => ({
      player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + amount) },
    })),

    // ?? 寃쏀뿕移?/ ?덈꺼?????????????????????????????????????????????????
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

    // ?? ?낃렇?덉씠???곸슜 ???????????????????????????????????????????????
    applyUpgrade: (key) => {
      const { player, weapons } = get()
      const w = { ...weapons }
      // 2026-05-06 재밸런싱: Lv.1 → Lv.5 점증
      if (key === 'pencilDamage')  w.pencilThrow = { ...w.pencilThrow, damage: w.pencilThrow.damage + 3, level: Math.min(5, (w.pencilThrow.level ?? 1) + 1) }
      if (key === 'pencilCount')   w.pencilThrow = { ...w.pencilThrow, projectileCount: Math.min(4, (w.pencilThrow.projectileCount ?? 1) + 1) }
      if (key === 'pencilPierce')  w.pencilThrow = { ...w.pencilThrow, pierce: Math.min(3, w.pencilThrow.pierce + 1) }
      if (key === 'unlockBag')     w.schoolBag   = { ...w.schoolBag,   active: true, level: 1 }
      if (key === 'bagDamage')     w.schoolBag   = { ...w.schoolBag,   damage: w.schoolBag.damage + 5, level: Math.min(5, (w.schoolBag.level ?? 1) + 1) }
      if (key === 'bagRadius')     w.schoolBag   = { ...w.schoolBag,   range: Math.min(1.067, w.schoolBag.range + 0.08) }
      if (key === 'unlockTumbler') w.tumbler     = { ...w.tumbler,     active: true, level: 1 }
      if (key === 'tumblerCount')  w.tumbler     = { ...w.tumbler,     count: Math.min(3, (w.tumbler.count ?? 1) + 1) }
      if (key === 'tumblerDamage') w.tumbler     = { ...w.tumbler,     damage: w.tumbler.damage + 2, level: Math.min(5, (w.tumbler.level ?? 1) + 1) }
      if (key === 'unlockFlask')   w.scienceFlask = { ...w.scienceFlask, active: true, level: 1 }
      if (key === 'flaskDamage')   w.scienceFlask = { ...w.scienceFlask, damage: w.scienceFlask.damage + 8, level: Math.min(5, (w.scienceFlask.level ?? 1) + 1) }
      if (key === 'flaskRadius')   w.scienceFlask = { ...w.scienceFlask, radius: Math.min(2.4, w.scienceFlask.radius + 0.18) }
      if (key === 'unlockBell')    w.bell        = { ...w.bell,        active: true, level: 1 }
      if (key === 'bellDamage')    w.bell        = { ...w.bell,        damage: w.bell.damage + 4, level: Math.min(5, (w.bell.level ?? 1) + 1) }
      if (key === 'unlockStun')       w.stunGun       = { ...w.stunGun,       active: true, level: 1 }
      if (key === 'stunDamage')       w.stunGun       = { ...w.stunGun,       damage: w.stunGun.damage + 5, level: Math.min(5, (w.stunGun.level ?? 1) + 1) }
      if (key === 'stunChain')        w.stunGun       = { ...w.stunGun,       chainCount: Math.min(4, w.stunGun.chainCount + 1) }
      if (key === 'unlockMissile')    w.guidedMissile = { ...w.guidedMissile, active: true, level: 1 }
      if (key === 'missileDamage')    w.guidedMissile = { ...w.guidedMissile, damage: w.guidedMissile.damage + 6, level: Math.min(5, (w.guidedMissile.level ?? 1) + 1) }
      if (key === 'missileCount')     w.guidedMissile = { ...w.guidedMissile, count: Math.min(2, (w.guidedMissile.count ?? 1) + 1) }
      if (key === 'unlockStarlink')   w.starlink      = { ...w.starlink,      active: true, level: 1 }
      if (key === 'starlinkDamage')   w.starlink      = { ...w.starlink,      damage: w.starlink.damage + 7, level: Math.min(5, (w.starlink.level ?? 1) + 1) }
      if (key === 'starlinkCount')    w.starlink      = { ...w.starlink,      strikeCount: Math.min(6, (w.starlink.strikeCount ?? 1) + 1) }
      if (key === 'unlockOnigiri')    w.onigiri       = { ...w.onigiri,       active: true, level: 1 }
      if (key === 'onigiiriBounce')   w.onigiri       = { ...w.onigiri,       bounces: Math.min(7, (w.onigiri.bounces ?? 4) + 1) }
      if (key === 'onigiiriDamage')   w.onigiri       = { ...w.onigiri,       damage: w.onigiri.damage + 5, level: Math.min(5, (w.onigiri.level ?? 1) + 1) }
      if (key === 'moveSpeed')     set({ player: { ...player, speed: Math.min(player.baseSpeed * 1.8, player.speed * 1.1) } })
      if (key === 'maxHealth')     set({ player: { ...player, maxHp: player.maxHp + 20, hp: player.hp + 20 } })
      set({ weapons: w, phase: 'playing' })
    },

    // ?? 蹂댁뒪 ??????????????????????????????????????????????????????????
    spawnBoss: () => set({ bossSpawned: true }),
    clearStage: () => set({ phase: 'cleared' }),

    // ?? 寃뚯엫 由ъ뀑 (gameKey 利앷?濡?Physics ?몃━ ?щ쭏?댄듃) ???????????????
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

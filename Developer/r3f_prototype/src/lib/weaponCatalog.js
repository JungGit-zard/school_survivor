// 12종 무기의 단일 진실 카탈로그.
// 7종 base는 useGameStore.js의 BASE_WEAPONS와 정확히 동일한 base 스탯.
// 2종 복원(guidedMissile, starlink)과 3종 신규(compassBlade, umbrellaGuard, eraserBomb)는
// 본 플랜에서 카탈로그에 먼저 등록만 하고 컴포넌트·카드 효과 wiring은 U5-U7에서 처리한다.

// Sentinel for weapons that are always unlocked.
export const STARTER = 'starter'

export const WEAPON_CATALOG = {
  // ─── Starter 7종 (Lv.1 base 스탯은 현재 BASE_WEAPONS와 1:1 동일해야 한다) ───
  pencilThrow: {
    id: 'pencilThrow',
    label: '연필',
    base: { damage: 5, cooldown: 1100, lastFired: 0, projectileCount: 1, pierce: 0, speed: 12, range: 22 },
    unlockConditions: STARTER,
    minLevelToAppear: 1,
    startsActive: true,
  },
  schoolBag: {
    id: 'schoolBag',
    label: '30cm 자',
    base: { damage: 12, cooldown: 1300, range: 0.633, triggerRange: 1.0, swingMs: 260 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  boxCutter: {
    id: 'boxCutter',
    label: '커터칼',
    base: { damage: 24, cooldown: 1100, range: 1.275, width: 0.22, slashMs: 240, knockback: 1.8 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  tumbler: {
    id: 'tumbler',
    label: '텀블러',
    base: { damage: 4, radius: 1.0, hitsPerSecond: 2.5, orbitSpeed: 2.8, count: 1 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  scienceFlask: {
    id: 'scienceFlask',
    label: '과학 플라스크',
    base: { damage: 30, cooldown: 2800, radius: 1.6, range: 2 },
    unlockConditions: STARTER,
    minLevelToAppear: 4,
  },
  bell: {
    id: 'bell',
    label: '벨',
    base: { damage: 10, cooldown: 4500, lastFired: 0, directions: 8, speed: 10, radius: 1.7 },
    unlockConditions: STARTER,
    minLevelToAppear: 4,
  },
  stunGun: {
    id: 'stunGun',
    label: '전기',
    base: { damage: 18, cooldown: 3000, lastFired: 0, chainCount: 2 },
    unlockConditions: STARTER,
    minLevelToAppear: 6,
  },
  onigiri: {
    id: 'onigiri',
    label: '오니기리',
    base: { damage: 14, cooldown: 5000, bounces: 1, bounceRange: 4.5, range: 18 },
    unlockConditions: STARTER,
    minLevelToAppear: 8,
  },

  // ─── 복원 2종 (1차 9종 정본에 포함, 코드 일시 제거 상태 — U5/U6에서 컴포넌트 추가) ───
  guidedMissile: {
    id: 'guidedMissile',
    label: '보조배터리 미사일',
    base: { damage: 16, cooldown: 4000, lastFired: 0, range: 22, radius: 1.6 },
    // 1차안 (메타프로그레션 정본 도입 시 확정).
    unlockConditions: [{ type: 'totalRuns', value: 5 }],
    minLevelToAppear: 4,
  },
  starlink: {
    id: 'starlink',
    label: '고장난 스타링크',
    base: { damage: 28, cooldown: 3800, lastFired: 0, strikeCenter: 5, strikeRadius: 1.2, strikeCount: 1 },
    // 1차안.
    unlockConditions: [
      { type: 'totalRuns', value: 10 },
      { type: 'totalKills', value: 5000 },
    ],
    minLevelToAppear: 8,
  },

  // ─── 신규 3종 (정본 확장 — U7에서 컴포넌트 추가) ───
  // 정본 스탯: weapon_expansion_unlock_plan_2026-05-10.md §5-1~5-3
  compassBlade: {
    id: 'compassBlade',
    label: '나침반 칼날',
    base: { damage: 7, radius: 1.15, hitsPerSecond: 2.5, count: 1, orbitSpeed: 3.4 },
    // 실력 OR 누적.
    unlockConditions: [
      { type: 'runKills', value: 80 },
      { type: 'totalKills', value: 200 },
    ],
    minLevelToAppear: 3,
  },
  umbrellaGuard: {
    id: 'umbrellaGuard',
    label: '우산 방어막',
    base: {
      damage: 12,
      cooldown: 3600,
      radius: 1.25,
      spinDurationMs: 1200,
      knockback: 'strong',
      knockbackMs: 220,
    },
    unlockConditions: [
      { type: 'runSurvivalSeconds', value: 90 },
      { type: 'totalSurvivalSeconds', value: 300 },
    ],
    minLevelToAppear: 3,
  },
  eraserBomb: {
    id: 'eraserBomb',
    label: '지우개 폭탄',
    base: { damage: 26, cooldown: 3000, lastFired: 0, radius: 1.35, range: 6 },
    unlockConditions: [
      { type: 'runGold', value: 80 },
      { type: 'totalGold', value: 200 },
    ],
    minLevelToAppear: 4,
  },
}

const ALL_IDS = Object.keys(WEAPON_CATALOG)
const STARTER_IDS = ALL_IDS.filter((id) => WEAPON_CATALOG[id].unlockConditions === STARTER)
const STARTER_SET = new Set(STARTER_IDS)

export function getAllWeaponIds() {
  return [...ALL_IDS]
}

export function getStarterIds() {
  return [...STARTER_IDS]
}

export function isStarter(id) {
  return STARTER_SET.has(id)
}

export function isValidWeaponId(id) {
  return Object.prototype.hasOwnProperty.call(WEAPON_CATALOG, id)
}

// evalInput: cumulative + per-run records 합본. e.g. {totalKills, totalRuns, runKills, runSurvivalSeconds, ...}.
// 반환: 해금된 무기 ID Set (starter 포함).
export function evaluateUnlocks(evalInput) {
  const out = new Set(STARTER_IDS)
  const records = evalInput && typeof evalInput === 'object' ? evalInput : {}
  for (const id of ALL_IDS) {
    if (out.has(id)) continue
    const entry = WEAPON_CATALOG[id]
    const conds = entry.unlockConditions
    if (conds === STARTER) {
      out.add(id)
      continue
    }
    if (!Array.isArray(conds)) continue
    for (const cond of conds) {
      if (!cond || typeof cond.type !== 'string') continue
      const v = Number(records[cond.type])
      if (Number.isFinite(v) && v >= Number(cond.value)) {
        out.add(id)
        break
      }
    }
  }
  return out
}

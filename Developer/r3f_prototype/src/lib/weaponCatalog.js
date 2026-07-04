// 14종 무기의 단일 진실 카탈로그 (9 starter + 복원 2 + 신규 3).
// starter 9종 base는 buildInitialWeapons(useGameStore.js)가 그대로 사용하는 base 스탯.
// 복원 2종(guidedMissile, starlink)·신규 3종(compassBlade, umbrellaGuard, eraserBomb)은
// 컴포넌트·카드 효과 wiring까지 완료된 상태다.

// Sentinel for weapons that are always unlocked.
export const STARTER = 'starter'

export const WEAPON_CATALOG = {
  // ─── Starter 8종 (Lv.1 base 스탯은 buildInitialWeapons가 그대로 사용한다) ───
  pencilThrow: {
    id: 'pencilThrow',
    label: '연필',
    // damage 5→6: E01(HP 8) 2발 킬 유지하되 여유 확보. pierce 0→1: 1열 관통으로 초반 군집 대응.
    base: { damage: 6, cooldown: 1100, lastFired: 0, projectileCount: 1, pierce: 1, speed: 12, range: 22 },
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
    // 공격력 24 = '30cm 자'(12)의 2배. 사거리 1.4 = 초기값(0.7)의 2배로 확장.
    // 쿨다운 650 = '30cm 자'(1300)의 절반 (기획 정본 2026-07-04).
    base: { damage: 24, cooldown: 650, range: 1.4, width: 0.18, knockback: 1.8 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  tumbler: {
    id: 'tumbler',
    label: '텀블러',
    // 기본 위력 1.5배(4→6). 레벨업 가중치(tumblerDamage +2/레벨)는 가산식이라 이 6 위에 더해진다(6→8→10…).
    base: { damage: 6, radius: 1.0, hitsPerSecond: 2.5, orbitSpeed: 2.8, count: 1 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  scienceFlask: {
    id: 'scienceFlask',
    label: '과학 플라스크',
    // 리워크(2026-07-04): 범위폭탄 → 화학 웅덩이 존 무기.
    // 착탄 폭발 데미지는 직전(15)의 절반 7.5, 대신 깨진 자리에 웅덩이 존 생성.
    // zoneRadius 1.4 = E01(녹색좀비) 9마리 3×3 밀집 대형(간격 ~0.8, 한 변 ~2.8) 커버.
    // zoneDurationMs: 1레벨 5초, 레벨업마다 +1초 (upgrades.js flask 효과의 bonus).
    // zoneTickDamage: 연필 레벨1 데미지 — 카탈로그 선언 직후 pencilThrow.base.damage 주입.
    base: { damage: 7.5, cooldown: 8400, radius: 1.6, range: 2, zoneRadius: 1.4, zoneDurationMs: 5000 },
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
    base: { damage: 21, cooldown: 5000, bounces: 2, bounceRange: 4.5, range: 18 },
    unlockConditions: STARTER,
    minLevelToAppear: 8,
  },
  chibiko: {
    id: 'chibiko',
    label: '치비코',
    base: { damage: 5, cooldown: 1100, lastFired: 0, range: 22, speed: 12, followDistance: 0.72, sideOffset: -0.28 },
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
  sharkMissile: {
    id: 'sharkMissile',
    label: '상어미사일',
    base: {
      // 기획 정본: 레벨1 공격력 = 보조배터리 미사일(guidedMissile 16)의 1.3배
      damage: 20.8,
      cooldown: 7000,
      lastFired: 0,
      range: 28,
      radius: 1.8,
      speed: 8.5,
      retargetIntervalMs: 300,
    },
    unlockConditions: [
      { type: 'stage1Clears', value: 1 },
      { type: 'totalRuns', value: 8 },
    ],
    minLevelToAppear: 8,
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
    base: { damage: 26, cooldown: 6000, lastFired: 0, radius: 1.35, range: 12 },
    unlockConditions: [
      { type: 'runGold', value: 80 },
      { type: 'totalGold', value: 200 },
    ],
    minLevelToAppear: 4,
  },
  studentLantern: {
    id: 'studentLantern',
    label: '학생용 랜턴',
    // 신무기(2026-07-04): 전방을 빛으로 비추는 지속 무기. 빛이 켜진 durationMs 동안
    // 전방 빛 상자 안 모든 적이 1초(hitIntervalMs)마다 피해를 받는다.
    // - durationMs 1레벨 3초 → 3타 (점등 즉시 1타 + 이후 1초 간격). 레벨업마다 +1초=+1타.
    // - 빛 범위 1.9×1.9 = E01(녹색좀비) 2마리 깊이 × 2마리 폭 (간격 ~0.8 밀집 기준).
    // - damage: 연필 레벨1의 1.5배 — 카탈로그 선언 직후 주입.
    // - cooldown 8000은 점등 시작 기준: Lv1 3초 점등/5초 소등 → Lv5 7초 점등/1초 소등.
    base: { damage: 9, cooldown: 8000, lastFired: 0, durationMs: 3000, hitIntervalMs: 1000, lightLength: 2.6, lightWidth: 1.8, lightBaseWidth: 0.35 },
    unlockConditions: [
      { type: 'stage1Clears', value: 1 },
      { type: 'totalRuns', value: 5 },
    ],
    minLevelToAppear: 5,
  },
}

// 플라스크 웅덩이 틱 데미지 = 연필 레벨1 데미지 (기획 정본: 단일 출처 참조)
WEAPON_CATALOG.scienceFlask.base.zoneTickDamage = WEAPON_CATALOG.pencilThrow.base.damage
// 학생용 랜턴 위력 = 연필 레벨1의 1.5배 (기획 정본: 단일 출처 참조)
WEAPON_CATALOG.studentLantern.base.damage = WEAPON_CATALOG.pencilThrow.base.damage * 1.5

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

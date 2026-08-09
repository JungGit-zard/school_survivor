// 17종 무기의 단일 진실 카탈로그 (10 starter + 복원 2 + 신규 3).
// starter 10종 base는 buildInitialWeapons(useGameStore.js)가 그대로 사용하는 base 스탯.
// 복원 2종(guidedMissile, starlink)·신규 3종(compassBlade, umbrellaGuard, eraserBomb)은
// 컴포넌트·카드 효과 wiring까지 완료된 상태다.

// Sentinel for weapons that are always unlocked.
import { PENCIL_FIRE_RANGE_WORLD_UNITS } from './gameplayUnits.js'

export const STARTER = 'starter'

export const WEAPON_CATALOG = {
  // ─── Starter 8종 (Lv.1 base 스탯은 buildInitialWeapons가 그대로 사용한다) ───
  pencilThrow: {
    id: 'pencilThrow',
    label: '연필',
    // damage 3→1.5: 연필 직접 피해를 다시 절반으로 조정. pierce 0→1: 1열 관통으로 초반 군집 대응.
    // cooldown 1100→550: 발사속도 2배 전체 적용 (2026-07-22). base가 유일 출처라 전 스테이지·전 레벨 반영.
    // 2026-08-01 Stage 2 초반 밸런스: damage 1.5→2.4.
    // 2026-08-02 사용자 확정: 공격력만 유지하고 cooldown 450→550, pierce 2→1 롤백.
    // 단일 대상 DPS 2.73 → 4.36. 발사 속도와 관통은 변경 전 값을 유지한다.
    // projectileCount는 1 유지 — 레벨업 성장 여지를 남긴다.
    base: { damage: 2.4, cooldown: 550, lastFired: 0, projectileCount: 1, pierce: 1, speed: 12, range: PENCIL_FIRE_RANGE_WORLD_UNITS, critChance: 0.08, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 1,
    startsActive: true,
  },
  schoolBag: {
    id: 'schoolBag',
    label: '30cm 자',
    base: { damage: 12, cooldown: 1300, range: 0.633, triggerRange: 1.0, swingMs: 260, critChance: 0.07, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  boxCutter: {
    id: 'boxCutter',
    label: '커터칼',
    // 공격력 24 = '30cm 자'(12)의 2배. 사거리 1.4 = 초기값(0.7)의 2배로 확장.
    // 기본 초기 쿨다운 650ms의 5배 = 3250ms(3.25초), 2026-07-26
    base: { damage: 24, cooldown: 3250, range: 1.4, width: 0.18, knockback: 1.8, critChance: 0.25, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 2,
  },
  tumbler: {
    id: 'tumbler',
    label: '텀블러',
    // 기본 위력 1.5배(4→6). 레벨업 가중치(tumblerDamage +2/레벨)는 가산식이라 이 6 위에 더해진다(6→8→10…).
    base: { damage: 6, radius: 1.0, hitsPerSecond: 2.5, orbitSpeed: 2.8, count: 1, critChance: 0.04, critMultiplier: 1.5 },
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
    base: { damage: 7.5, cooldown: 8400, radius: 1.6, range: 2, zoneRadius: 1.4, zoneDurationMs: 5000, critChance: 0.03, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 4,
  },
  bell: {
    id: 'bell',
    label: '벨',
    base: { damage: 10, cooldown: 4500, lastFired: 0, directions: 8, speed: 10, radius: 1.7, critChance: 0.05, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 4,
  },
  stunGun: {
    id: 'stunGun',
    label: '전기',
    base: { damage: 18, cooldown: 3000, lastFired: 0, chainCount: 2, critChance: 0.06, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 6,
  },
  onigiri: {
    id: 'onigiri',
    label: '오니기리',
    base: { damage: 21, cooldown: 5000, bounces: 6, bounceRange: 4.5, range: 18, critChance: 0.08, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 8,
  },
  chibiko: {
    id: 'chibiko',
    label: '치비코',
    base: { damage: 1.25, cooldown: 1100, lastFired: 0, range: 22, speed: 12, followDistance: 0.72, sideOffset: -0.28, critChance: 0.05, critMultiplier: 1.5 },
    unlockConditions: STARTER,
    minLevelToAppear: 8,
  },
  hanako: {
    id: 'hanako',
    label: '하나코',
    base: { healIntervalMs: 20000, healPercent: 0.05, followDistance: 1.44 },
    unlockConditions: STARTER,
  },
  // ─── 복원 2종 (1차 9종 정본에 포함, 코드 일시 제거 상태 — U5/U6에서 컴포넌트 추가) ───
  guidedMissile: {
    id: 'guidedMissile',
    label: '보조배터리 미사일',
    base: { damage: 16, cooldown: 4000, lastFired: 0, range: 7.34, radius: 1.6 },
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
    base: { damage: 28, cooldown: 3800, lastFired: 0, strikeCenter: 5, strikeRadius: 1.2, strikeCount: 1, critChance: 0.07, critMultiplier: 1.5 },
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
    label: '오리요강',
    base: { damage: 7, radius: 1.15, hitsPerSecond: 2.5, count: 1, orbitSpeed: 3.4, critChance: 0.05, critMultiplier: 1.5 },
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
    base: { damage: 0.6, cooldown: 8000, lastFired: 0, durationMs: 3000, hitIntervalMs: 300, lightLength: 2.08, lightWidth: 3.6, lightBaseWidth: 0.35, critChance: 0.03, critMultiplier: 1.5 },
    unlockConditions: [
      { type: 'stage1Clears', value: 1 },
      { type: 'totalRuns', value: 5 },
    ],
    minLevelToAppear: 5,
  },

  // ─── 발전형 1종 (커터칼 발전형) ───
  // 정본 기획: Planner/game_contents/weapons/slash_evolution_weapon_concepts_2026-08-09.md §1
  // 「바이키티 커터칼」 — 커터칼(boxCutter)을 런 중 보유해야만 카드가 뜬다(upgrades.js
  // acquireBikittyCutter.requiresActiveWeapon). 계정 해금 게이트는 쓰지 않으므로
  // unlockConditions는 하나코와 같은 STARTER 취급이고, 실제 등장 조건은 카드 쪽이 전부다.
  //
  // 동작 루프: 벨 때마다 날이 한 칸(segment) 나와 사거리·위력이 오르고, 8단째(segment 7)
  // 타격에서 날이 부러져 전방 90° 부채꼴 산탄을 한 번 뿌린 뒤 reloadMs 동안 무장해제된다.
  //
  // 검산(치명타 제외):
  //   8타 위력 배수 합 = 8 + 0.12 × (0+1+…+7) = 11.36
  //   사이클 총 피해   = 18 × 11.36 + 30 = 234.48
  //   사이클 시간      = 8 × 2400ms + 1200ms = 20400ms
  //   단일 대상 DPS    = 234.48 / 20.4 ≈ 11.49  (커터칼 7.4의 1.55배, 30cm 자 9.2의 1.25배)
  bikittyCutter: {
    id: 'bikittyCutter',
    label: '바이키티 커터칼',
    base: {
      damage: 18, cooldown: 2400, range: 1.0, width: 0.18,
      knockback: 1.8, critChance: 0.25, critMultiplier: 1.5,
      segments: 8,             // 부러지기까지 타격 수
      segmentRangeStep: 0.18,  // 단수당 사거리 + (최대 1.0 + 0.18×7 = 2.26)
      segmentDamageStep: 0.12, // 단수당 위력 +12% (가산)
      snapDamage: 30,          // 부러짐 산탄 1회 피해
      snapPellets: 8,          // 시각 연출용 파편 개수 — 피해 계산에는 쓰지 않는다
      snapArcDeg: 90,          // 전방 부채꼴 각도
      snapRange: 3.2,
      reloadMs: 1200,          // 부러진 뒤 추가 무장해제 시간(쿨다운 위에 가산)
    },
    unlockConditions: STARTER,
    minLevelToAppear: 6,
  },
}

// 예전에는 플라스크 틱 데미지와 랜턴 위력을 pencilThrow.base.damage에서 직접 파생시켰다.
// 2026-08-01 Stage 2 초반 밸런스 작업에서 연필만 1.5 → 2.4로 올리면서 그 사슬을 끊었다.
// 그대로 두면 손대지 않기로 한 두 무기가 전 스테이지에서 +60%로 함께 올라간다.
// 두 값은 연필 상향 직전의 수치에 고정하며, 이후 연필 수치와 독립적으로 조정한다.
const PENCIL_DERIVED_DAMAGE_BASELINE = 1.5
// 플라스크 웅덩이 틱 데미지 (구 정본: 연필 레벨1 데미지)
WEAPON_CATALOG.scienceFlask.base.zoneTickDamage = PENCIL_DERIVED_DAMAGE_BASELINE
// 학생용 랜턴 위력 (구 정본: 연필 레벨1의 1/10)
WEAPON_CATALOG.studentLantern.base.damage = PENCIL_DERIVED_DAMAGE_BASELINE * 0.1

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

// 무기 20종의 단일 진실 카탈로그.
//   - 기본 계정 해금 4종: pencilThrow, schoolBag, boxCutter, tumbler.
//   - 기록 조건 계정 해금 13종.
//   - 런 중 조합 발견 3종: hanako, bikittyCutter, lineDraw (계정 플래그 대상 아님).
// 20종 전부 컴포넌트(components/Weapons/index.js)·카드 효과(upgrades.js) wiring이 끝나 있다.
// base 스탯은 buildInitialWeapons(useGameStore.js)가 그대로 가져다 쓴다 — 여기가 유일한 출처이므로
// 게임 쪽에 같은 수치를 리터럴로 또 적지 마라(하나코 힐 수치가 그렇게 이중 정본이 됐었다).

// Sentinel for weapons that are always unlocked.
import { PENCIL_FIRE_RANGE_WORLD_UNITS } from './gameplayUnits.js'
import { TUMBLER_SUSTAINED_MULTIPLIER } from './tumblerFalloff.js'

export const STARTER = 'starter'

export const WEAPON_CATALOG = {
  // ─── 기본군 4종 (Lv.1 base 스탯은 buildInitialWeapons가 그대로 사용한다) ───
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
    // sustainedDamageMultiplier: 연속 타격 감쇠(2026-08-17, lib/tumblerFalloff.js)의 주기 평균 0.80.
    // damage 자체는 깎지 않는다 — 첫 타는 100%다. 이 필드는 "오래 버티는 단일 대상에게
    // 실제로 꽂히는 지속 화력"을 DPS 추정기(playerDpsEstimate.js)에 알려주기 위한 것으로,
    // 없으면 마틸다 HP(= 스폰 시점 플레이어 DPS × 1800초)가 텀블러 몫만큼 부당하게 부푼다.
    base: { damage: 6, radius: 1.0, hitsPerSecond: 2.5, orbitSpeed: 2.8, count: 1, critChance: 0.04, critMultiplier: 1.5, sustainedDamageMultiplier: TUMBLER_SUSTAINED_MULTIPLIER },
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
    unlockConditions: [{ type: 'totalRuns', value: 2 }],
    minLevelToAppear: 4,
  },
  bell: {
    id: 'bell',
    label: '벨',
    // 2026-08-15 하위권 상향: cooldown 4500 → 3200. 벨은 단일 대상 DPS 2.28로 주력 무기
    // 15종 중 최하위였고, 최상위(텀블러 15.30)와의 격차가 6.7배였다. 3200이면 3.20으로
    // 올라 격차가 4.8배가 된다. damage 10은 유지 — 8방향 충격파 한 발의 위력은 그대로다.
    base: { damage: 10, cooldown: 3200, lastFired: 0, directions: 8, speed: 10, radius: 1.7, critChance: 0.05, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'stage1Clears', value: 1 }],
    minLevelToAppear: 4,
  },
  stunGun: {
    id: 'stunGun',
    label: '전기',
    base: { damage: 18, cooldown: 3000, lastFired: 0, chainCount: 2, critChance: 0.06, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'stage2Clears', value: 1 }],
    minLevelToAppear: 6,
  },
  onigiri: {
    id: 'onigiri',
    label: '오니기리',
    base: { damage: 21, cooldown: 5000, bounces: 6, bounceRange: 4.5, range: 18, critChance: 0.08, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'totalKills', value: 700 }],
    minLevelToAppear: 6,
  },
  chibiko: {
    id: 'chibiko',
    label: '치비코',
    base: { damage: 1.25, cooldown: 1100, lastFired: 0, range: 22, speed: 12, followDistance: 0.72, sideOffset: -0.28, critChance: 0.05, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'totalRuns', value: 3 }],
    minLevelToAppear: 8,
  },
  hanako: {
    id: 'hanako',
    label: '하나코',
    base: { healIntervalMs: 20000, healPercent: 0.05, followDistance: 1.44 },
    // 하나코는 치비코 보유 중에만 발견하는 런 중 조합 카드다.
    unlockConditions: null,
  },
  inucon: {
    id: 'inucon',
    label: '이누콘',
    // 치비코/하나코 계열 동반자. 장착 즉시 주인공 뒤를 따라다니며 붙은 좀비를 물고 끌어내고,
    // 10초마다 최대 HP의 10%를 회복한다. damage 0 유틸 무기라 레벨업은 끌어내기/회복 수치만 키운다.
    base: { damage: 0, healIntervalMs: 10000, healPercent: 0.10, followDistance: 1.08, pushRadius: 0.85, knockback: 2.8, knockbackMs: 180, contactPulseIntervalMs: 250 },
    unlockConditions: [{ type: 'bossKills', value: 3 }],
    minLevelToAppear: 8,
  },
  // ─── 복원 2종 (1차 9종 정본에 포함, 코드 일시 제거 상태 — U5/U6에서 컴포넌트 추가) ───
  guidedMissile: {
    id: 'guidedMissile',
    label: '보조배터리 미사일',
    // 2026-08-22 사용자 요청: 재사용대기시간을 기존 4000ms의 1.5배로 증가.
    base: { damage: 16, cooldown: 6000, lastFired: 0, range: 7.34, radius: 1.6 },
    unlockConditions: [{ type: 'bossKills', value: 1 }],
    minLevelToAppear: 4,
  },
  sharkMissile: {
    id: 'sharkMissile',
    label: '상어미사일',
    base: {
      // 기획 정본: 레벨1 공격력 = 보조배터리 미사일(guidedMissile 16)의 1.3배
      damage: 20.8,
      // 2026-08-15 역전 제거: cooldown 7000 → 4200. 상어미사일은 보조배터리 미사일(16/4000)의
      // 상위 해금인데 쿨다운이 1.75배라 단일 대상 DPS가 2.97 < 4.00으로 뒤집혀 있었다.
      // 4200이면 20.8/4.2 = 4.95로 기본 미사일의 1.24배 — 카탈로그가 약속한 "1.3배 위력"에
      // 맞고, 발사 간격은 여전히 더 느려서 '무거운 한 방' 정체성도 남는다.
      cooldown: 4200,
      lastFired: 0,
      range: 28,
      radius: 1.8,
      speed: 8.5,
      retargetIntervalMs: 300,
    },
    unlockConditions: [{ type: 'stage2Clears', value: 1 }],
    minLevelToAppear: 8,
  },
  starlink: {
    id: 'starlink',
    label: '고장난 스타링크',
    base: { damage: 28, cooldown: 3800, lastFired: 0, strikeCenter: 5, strikeRadius: 1.2, strikeCount: 1, critChance: 0.07, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'totalKills', value: 2500 }],
    minLevelToAppear: 8,
  },

  // ─── 신규 3종 (정본 확장 — U7에서 컴포넌트 추가) ───
  // 정본 스탯: weapon_expansion_unlock_plan_2026-05-10.md §5-1~5-3
  compassBlade: {
    id: 'compassBlade',
    label: '오리요강',
    // 2026-08-15 격차 완화: hitsPerSecond 2.5 → 2.0. Lv1 단일 대상 DPS 17.94 → 14.35.
    // 예전에는 해금 무기 Lv1이 나머지 17종의 만렙을 전부 앞섰다 — 이제 30cm 자·커터칼·
    // 텀블러·스타링크·바이키티·선긋기의 만렙이 이 값을 넘는다.
    //
    // 2026-08-18 사용자 확정 사양: "오리요강은 텀블러보다 낮은 공격력으로 유지하다가 폭발이
    // 가미된 것". damage 7 → 5. 두 해석 모두에서 텀블러 아래로 내려간다:
    //   타격당  5   < 텀블러 6
    //   타격 화력  5 × 2.0 = 10.0/s < 텀블러 6 × 2.5 × 0.8(감쇠) = 12.0/s
    // 요강의 값어치는 단일 대상 화력이 아니라 3스택마다 터지는 9타일 폭발(30, 치명타 없음)이다.
    // 그 폭발까지 포함한 사이클 실화력은 (3×5×1.025 + 30) / 4.5초 = 10.08/s로 여전히
    // 텀블러 12.24 아래다 — 폭발을 더해도 역전되지 않는다(lib/compassBlade.js 사이클 상수).
    base: { damage: 5, radius: 1.15, hitsPerSecond: 2.0, count: 1, orbitSpeed: 3.4, critChance: 0.05, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'totalKills', value: 200 }],
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
      // 예전엔 'strong'이라는 문자열이었다. 19종 중 유일한 비숫자 스탯이라 컴포넌트가 읽지 않고
      // 3.0을 하드코딩해 우회했고, gameplaySoak의 유한수 검사도 문자열은 그냥 통과시켰다.
      // 지금까지 실제로 적용되던 값 그대로 숫자 3.0으로 고정한다(동작 변화 없음).
      knockback: 3.0,
      knockbackMs: 220,
    },
    unlockConditions: [{ type: 'totalSurvivalSeconds', value: 300 }],
    minLevelToAppear: 3,
  },
  eraserBomb: {
    id: 'eraserBomb',
    label: '지우개 폭탄',
    base: { damage: 26, cooldown: 6000, lastFired: 0, radius: 1.35, range: 12 },
    unlockConditions: [{ type: 'totalGold', value: 160 }],
    minLevelToAppear: 4,
  },
  studentLantern: {
    id: 'studentLantern',
    label: '학생용 랜턴',
    // 신무기(2026-07-04): 전방을 빛으로 비추는 지속 무기. 빛이 켜진 durationMs 동안
    // 전방 빛 상자 안 모든 적이 0.3초(hitIntervalMs)마다 피해를 받는다.
    // - durationMs 1레벨 3초 → 10타. 레벨업마다 +1초 = +3.33타.
    //   (2026-08-15 정정: 주석은 "1초 간격 3타"라고 적혀 있었지만 데이터는 hitIntervalMs 300이고
    //    구현·DPS 추정기 모두 300을 따른다. 실제로 돌아가는 값인 데이터 쪽으로 문서를 맞춘다.)
    // - 빛 범위 1.9×1.9 = E01(녹색좀비) 2마리 깊이 × 2마리 폭 (간격 ~0.8 밀집 기준).
    // - damage 0.15 = 연필 상향 직전 수치(1.5)의 1/10. 예전에는 여기 base에 0.6을 써두고
    //   카탈로그 선언 직후 0.15로 덮어써서, 리터럴 0.6은 아무 데도 안 쓰이는 죽은 값이었다
    //   (주석도 "1.5배"와 "1/10"로 서로 모순이었다). 실제로 적용되던 0.15만 남긴다.
    // - cooldown 8000은 점등 시작 기준: Lv1 3초 점등/5초 소등 → Lv5 7초 점등/1초 소등.
    base: { damage: 0.15, cooldown: 8000, lastFired: 0, durationMs: 3000, hitIntervalMs: 300, lightLength: 2.08, lightWidth: 3.6, lightBaseWidth: 0.35, critChance: 0.03, critMultiplier: 1.5 },
    unlockConditions: [{ type: 'stage3Clears', value: 1 }],
    minLevelToAppear: 5,
  },

  // ─── 발전형 1종 (커터칼 발전형) ───
  // 정본 기획: Planner/game_contents/weapons/slash_evolution_weapon_concepts_2026-08-09.md §1
  // 「바이키티 커터칼」 — 커터칼(boxCutter)을 런 중 보유해야만 카드가 뜬다(upgrades.js
  // acquireBikittyCutter.requiresActiveWeapon). 계정 해금 게이트는 쓰지 않으므로
  // 계정 해금 없이 커터칼 보유 중에만 발견하는 런 중 조합 카드다.
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
      // snapPellets는 없다. "시각 연출용 파편 개수"라고 선언돼 있었지만 부러짐 연출은
      // SFX와 부채꼴 피해뿐이라 파편을 그리는 코드가 아예 없었다. 파편 VFX를 만들 때 되살린다.
      snapArcDeg: 90,          // 전방 부채꼴 각도
      snapRange: 3.2,
      reloadMs: 1200,          // 부러진 뒤 추가 무장해제 시간(쿨다운 위에 가산)
    },
    unlockConditions: null,
    minLevelToAppear: 6,
  },
  lineDraw: {
    id: 'lineDraw',
    label: '선긋기',
    // 30cm 자 + 커터칼을 런 중 둘 다 보유해야만 획득 카드가 뜬다(upgrades.js requiresActiveWeapons).
    // 자를 대고 그은 직선이라 밀리지 않는다 → knockback 0, 관통 무제한.
    base: {
      damage: 20, cooldown: 4200,
      range: 6.0, width: 0.22,
      // 기획 초안의 pierce: Infinity를 999로 낮췄다. 초안값 그대로 두면 gameplaySoak.js:208의
      // "무기 스탯은 전부 유한수" 불변식이 카드 획득 즉시 터진다(실측: seed 1, frame 225에서
      // "무기 lineDraw pierce 비유한값"). JSON.stringify도 Infinity를 null로 떨어뜨린다.
      // 실질 차이는 없다 — 선분 전체를 훑는 판정이라 이 값을 소비하는 코드 자체가 없고,
      // 한 프레임에 살아있는 적 상한은 MAX_ENEMIES(150)다.
      pierce: 999, knockback: 0,
      critChance: 0.35, critMultiplier: 2.0,  // 커터칼 0.25/1.5 계승·강화
      lineDurationMs: 2000,      // 그은 자리에 남는 절단선 지속
      lineCrossDamage: 14,       // 절단선을 가로지를 때만 1회
      lineCrossCooldownMs: 600,  // 같은 적 재절단 간격
    },
    unlockConditions: null,
    minLevelToAppear: 8,
  },
}

// 예전에는 플라스크 틱 데미지와 랜턴 위력을 pencilThrow.base.damage에서 직접 파생시켰다.
// 2026-08-01 Stage 2 초반 밸런스 작업에서 연필만 1.5 → 2.4로 올리면서 그 사슬을 끊었다.
// 그대로 두면 손대지 않기로 한 두 무기가 전 스테이지에서 +60%로 함께 올라간다.
// 두 값은 연필 상향 직전의 수치에 고정하며, 이후 연필 수치와 독립적으로 조정한다.
const PENCIL_DERIVED_DAMAGE_BASELINE = 1.5
// 플라스크 웅덩이 틱 데미지 (구 정본: 연필 레벨1 데미지)
WEAPON_CATALOG.scienceFlask.base.zoneTickDamage = PENCIL_DERIVED_DAMAGE_BASELINE
// 랜턴 위력(구 정본: 연필 레벨1의 1/10 = 0.15)은 studentLantern.base.damage에 직접 적어둔다.
// 여기서 덮어쓰면 base 리터럴이 죽은 값이 되어 카탈로그를 읽는 사람이 틀린 수치를 믿게 된다.

const ALL_IDS = Object.keys(WEAPON_CATALOG)
const STARTER_IDS = ALL_IDS.filter((id) => WEAPON_CATALOG[id].unlockConditions === STARTER)
const STARTER_SET = new Set(STARTER_IDS)
export const RUNTIME_COMBINATION_WEAPON_IDS = Object.freeze(['hanako', 'bikittyCutter', 'lineDraw'])
const RUNTIME_COMBINATION_SET = new Set(RUNTIME_COMBINATION_WEAPON_IDS)
const ACCOUNT_UNLOCKABLE_IDS = ALL_IDS.filter((id) => !RUNTIME_COMBINATION_SET.has(id))

export function getAllWeaponIds() {
  return [...ALL_IDS]
}

export function getStarterIds() {
  return [...STARTER_IDS]
}

// Firebase weaponUnlocks에 영구 권리로 저장할 수 있는 무기 목록이다.
// 하나코·바이키티 커터칼·선긋기는 이번 런의 조합 조건으로만 나타난다.
export function getAccountUnlockableWeaponIds() {
  return [...ACCOUNT_UNLOCKABLE_IDS]
}

export function isStarter(id) {
  return STARTER_SET.has(id)
}

export function isRuntimeCombinationWeapon(id) {
  return RUNTIME_COMBINATION_SET.has(id)
}

export function isAccountUnlockable(id) {
  return Object.prototype.hasOwnProperty.call(WEAPON_CATALOG, id) && !isRuntimeCombinationWeapon(id)
}

export function isValidWeaponId(id) {
  return Object.prototype.hasOwnProperty.call(WEAPON_CATALOG, id)
}

// evalInput: cumulative + per-run records 합본. e.g. {totalKills, totalRuns, runKills, runSurvivalSeconds, ...}.
// 반환: 계정 해금된 무기 ID Set (기본군 포함, 런 중 조합 3종 제외).
export function evaluateUnlocks(evalInput) {
  const out = new Set(STARTER_IDS)
  const records = evalInput && typeof evalInput === 'object' ? evalInput : {}
  for (const id of ALL_IDS) {
    if (out.has(id)) continue
    if (!isAccountUnlockable(id)) continue
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

// Stage 5 보스 B10 「교감 좀비」 데이터 정본 (2026-11-08 스펙 Part B §6).
//
// 왜 expansionContent.js DATA.bosses에 넣지 않는가:
//   ENEMY_TYPE_NAMES(enemyEntityPool.js)가 확장 행을 typeCode 17~36 자리에 펼치므로, 확장 보스 행이 하나
//   늘면 Track B(37~48)·투사체(49~74)가 전부 한 칸씩 밀린다. 그래서 B10은 이 모듈에 따로 두고
//   typeCode는 다음 빈 번호(75)를 쓴다. 공격 런타임은 확장 런타임(stepExpansionAttack)을 재사용한다 —
//   그 배선(EXPANSION_BOSSES ?? AUTHORED_ATTACK_BOSSES 합성 조회)은 2차 작업(§6-5)이다.
//
// HP는 확장 경로(절대값)가 아니라 B01~B04와 같은 경로다: ENEMY_STATS.B10.hp 1,563 × STAGE_HP_MULTIPLIER.stage5
//   (1.2^4 = 2.0736) = 3,241.04 → 3,241 = S4 B04 실효 2,592 × 1.25. 보스 사다리 1,150 → 1,380 → 1,794 → 2,592 → 3,241.
//
// 단위: 거리 = 월드 유닛(u), 1블록 = 4u. 시간 = ms.

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

export const B10_TYPE_CODE = 75
export const B10_BASE_HP = 1563

// 소환 트리거(hpRatio). 직전 프레임 > t ≥ 현재일 때 각 1회. P1(100~50%) 1회, P2(≤50%) 2회.
export const B10_SUMMON_HP_TRIGGERS = Object.freeze([0.85, 0.5, 0.25])
// 회당 E57 1 + E51 1 + E54 1 → 실효 145 + 17 + 66 = 228 HP. 최대 3회 = 684.
export const B10_SUMMON_TYPES = Object.freeze(['E57', 'E51', 'E54'])
export const STAGE5_B10_SUMMON_FIXED_HP = 684

export const AUTHORED_ATTACK_BOSSES = deepFreeze({
  B10: {
    id: 'B10',
    typeCode: B10_TYPE_CODE,
    nameKo: '교감 좀비',
    stageId: 'stage5',
    hp: B10_BASE_HP,
    speedUnitsPerSec: 0.5225,
    speedBlocksPerSec: 0.130625,
    contactDamage: 22,
    scale: 2,
    contactDistUnits: 0.36,
    contactDistBlocks: 0.09,
    xp: 0,
    studioItemId: 'zombie-b10',
    modelKey: 'stage5-b10',
    silhouette: '결재판을 든 정장 차림, 한 손에 큰 결재 도장, 옆구리에 출석부',
    enrageHpRatio: 0.5,
    enrageTransitionMs: 1500,
    firstAttackDelayMs: 2500,
    // stepExpansionAttack가 patternIndex % 2로 p1 → p2 → p1 … 고정 교대한다.
    patterns: [
      {
        id: 'b10_p1',
        nameKo: '결재 도장',
        windupMs: 1300,
        activeMs: 300,
        recoveryMs: 900,
        cooldownMs: 5000,
        phase2CooldownMs: 4000,
        rangeUnits: 1.6,      // 반지름 1.6u = 0.4블록
        rangeBlocks: 0.4,
        widthUnits: 0,
        widthBlocks: 0,
        damage: 18,
        maxHitsPerTarget: 1,
        shape: 'disk',
        origin: 'player_snapshot',
        targetLockedAtWindupStart: true,
      },
      {
        id: 'b10_p2',
        nameKo: '출석부 휘두르기',
        windupMs: 1000,
        activeMs: 250,
        recoveryMs: 900,
        cooldownMs: 5000,
        phase2CooldownMs: 4000,
        rangeUnits: 3.2,      // 반지름 3.2u = 0.8블록
        rangeBlocks: 0.8,
        widthUnits: 0,
        widthBlocks: 0,
        damage: 20,
        maxHitsPerTarget: 1,
        shape: 'sector',
        angleDeg: 120,        // 부채꼴 전체 폭(expansionAuthoredPolygons 규약)
        origin: 'boss_snapshot',
        targetLockedAtWindupStart: true,
      },
    ],
    summon: {
      id: 'b10_summon',
      nameKo: '교무회의 소집',
      hpTriggers: B10_SUMMON_HP_TRIGGERS,
      types: B10_SUMMON_TYPES,
      ringRadius: 2.5,        // 2.5u = 0.625블록, 보스 중심 120° 균등각
      stopMs: 800,
    },
  },
})

// Enemy.jsx ENEMY_STATS에 병합되는 스탯(B01~B04와 같은 모양).
export const STAGE5_BOSS_STATS = deepFreeze({
  B10: { hp: B10_BASE_HP, speed: 0.5225, damage: 22, scale: 2.0, xp: 0, contactDist: 0.36, authoredAttackBoss: true },
})

export function isAuthoredAttackBoss(type) {
  return Object.hasOwn(AUTHORED_ATTACK_BOSSES, type)
}

export function getAuthoredAttackBoss(type) {
  return AUTHORED_ATTACK_BOSSES[type] ?? null
}

// 소환 트리거 상태. fired[i] = 그 트리거가 이미 실행됐는지, crossed[i] = HP가 그 선을 넘었는지.
export function createB10SummonState() {
  return { crossed: B10_SUMMON_HP_TRIGGERS.map(() => false), fired: B10_SUMMON_HP_TRIGGERS.map(() => false), firedCount: 0 }
}

// 이번 프레임에 실행할 소환 횟수를 돌려준다(순수 함수 + state 갱신).
//   - 직전 hpRatio > t ≥ 현재 hpRatio이면 그 트리거가 "넘었다"로 기록된다(한 프레임에 여럿 넘어도 전부).
//   - 격노 선(enrageHpRatio 0.5) 이하 트리거는 전환 정지 1,500ms가 끝난 프레임(enrageDone)까지 미룬다.
//     0.5를 넘는 순간 격노 전환이 시작되므로, 그 아래 트리거가 정지 중에 먼저 나가지 않게 한다.
//   - 트리거마다 정확히 1회, 총 3회 상한.
export function stepB10SummonTriggers(state, prevRatio, ratio, enrageDone) {
  if (!state || !Number.isFinite(prevRatio) || !Number.isFinite(ratio)) return 0
  const enrageRatio = AUTHORED_ATTACK_BOSSES.B10.enrageHpRatio
  let count = 0
  for (let i = 0; i < B10_SUMMON_HP_TRIGGERS.length; i += 1) {
    const t = B10_SUMMON_HP_TRIGGERS[i]
    if (!state.crossed[i] && prevRatio > t && t >= ratio) state.crossed[i] = true
    if (!state.crossed[i] || state.fired[i]) continue
    if (t <= enrageRatio && enrageDone !== true) continue
    state.fired[i] = true
    state.firedCount += 1
    count += 1
  }
  return count
}

// 패턴·소환 오디오 id. soundmini가 SOUND_MAP에 넣기 전까지는 sfxRegistry가 모르는 id라 조용히 무시된다
// (sfxRegistry: `if (!SOUND_MAP[id]) return`, emitSfx는 절대 throw하지 않는다).
export const B10_SFX = Object.freeze({ b10_p1: 'b10StampSlam', b10_p2: 'b10LedgerSwing', summon: 'b10MeetingBell' })

// 교무회의 소집 3기 위치: 보스 중심 반지름 2.5u 링, 120° 간격, 첫 자리는 플레이어 반대쪽(보스 등 뒤).
// 각도 규약은 formationSpawnPositions와 같다(x = sin, z = cos).
export function b10SummonRingPositions(bossX, bossZ, playerX, playerZ, radius = AUTHORED_ATTACK_BOSSES.B10.summon.ringRadius) {
  const dx = bossX - playerX
  const dz = bossZ - playerZ
  const start = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dx, dz) : 0
  return B10_SUMMON_TYPES.map((type, index) => {
    const angle = start + (index * Math.PI * 2) / B10_SUMMON_TYPES.length
    return { type, x: bossX + Math.sin(angle) * radius, z: bossZ + Math.cos(angle) * radius }
  })
}

// 격노 전환 정지(1,500ms)가 끝났는가 — stepB10SummonTriggers의 enrageDone 입력.
export function isB10EnrageTransitionDone(attackState) {
  return Boolean(attackState?.enraged) && !(attackState.enrageRemainingMs > 0)
}

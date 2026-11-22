// Stage 5 B10 「교감 좀비」 / Stage 6 B05 「교장 선생님 좀비」 Kenney Mini 보스 몸 표 (Terry 2026-11-21 "둘 다 안 A"). threemini.
//
// 그림만 바꾼다. HP·속도·크기(ENEMY_STATS.scale)·접촉 거리·공격 시간/범위·소환은 이 표를 읽지 않는다
// (lib/stage5ViceBoss.js, lib/expansionContent.js 그대로).
//
// 몸: assets/models/kenney_mini/mini_zombies_kenney.glb 안에 이미 있는 Kenney Mini Characters(CC0) 몸을 쓴다
//   B10 = male-a(동그란 안경 남자), B05 = male-d(정장 + 빨간 넥타이). GLB는 다시 굽지 않는다(바이트 동일).
// 색: Mini 좀비와 같은 UV 칸 옮기기. 새 색 칸을 만들지 않고 GLB에 이미 구운 MINI_PALETTE_SLOTS만 쓴다.
// 소품: lib/miniBossProps.data.js(Blender 빌드에서 뽑은 원본 절차 소품, 파트 지오메트리에 합침 → 드로콜 0 추가).
// 얼굴: 절차적 SDF 셰이더(E07 표준). Kenney 눈·입 조각은 피부색 칸으로 지운다.
// 미리보기·비교: Developer/agent_room/boss_remodel_20261121/ (안 B 보관 포함).

// 보스 비율: 머리는 그대로 두고 몸통·팔·다리를 키운다(굽기가 아니라 런타임 1회 빌드 때 적용).
const BOSS_PART_SCALE = Object.freeze({
  B10: Object.freeze({ torso: [1.3, 1.25, 1.25], armL: [1.2, 1.2, 1.2], armR: [1.2, 1.2, 1.2], legL: [1.2, 1.35, 1.2], legR: [1.2, 1.35, 1.2] }),
  B05: Object.freeze({ torso: [1.35, 1.25, 1.3], armL: [1.2, 1.2, 1.2], armR: [1.2, 1.2, 1.2], legL: [1.25, 1.35, 1.25], legR: [1.25, 1.35, 1.25] }),
})

// 포즈 = 팔·몸통의 추가 회전(three XYZ, 라디안). 팔은 이미 쉬는 자세(MINI_ARM_REST_TILT)로 내려 둔 상태 기준이다.
// 값은 Blender 미리보기(스크립트 scripts/mini_boss/)와 같은 숫자다.
export const MINI_BOSS_POSES = Object.freeze({
  B10: Object.freeze({
    // 평상: 도장을 앞으로 내려 들고 걷는다(Mini는 머리가 커서 어깨에 메면 도장이 머리에 가려진다. 땅에 닿지 않게 앞으로 0.8).
    normal: Object.freeze({ armL: [-0.55, 0, 0], armR: [-0.8, 0, -0.15], torso: [0.04, 0, 0] }),
    // b10_p1 결재 도장 windup: 도장을 머리 위로.
    warn: Object.freeze({ armL: [-0.7, 0, 0], armR: [3.25, 0, 0.75], torso: [-0.12, 0, 0] }),
    // b10_p2 출석부 휘두르기 windup: 출석부를 뒤로 젖힌다.
    ledger: Object.freeze({ armL: [1.25, 0, -0.35], armR: [-0.8, 0, -0.15], torso: [0.08, 0, 0] }),
    // 교무회의 소집·격노 전환 정지: 두 팔 앞으로, 탁상 종.
    stun: Object.freeze({ armL: [-1.35, 0, 0.5], armR: [-1.05, 0, -0.5], torso: [0.18, 0, 0] }),
  }),
  B05: Object.freeze({
    // 평상: 손마이크를 입가에.
    normal: Object.freeze({ armL: [0.35, 0, 0], armR: [-1.2217, 0, 0.1], torso: [0, 0, 0] }),
    // 훈화 고리·교가 제창 windup(게임은 두 공격 모두 'warn'을 준다): 마이크 + 왼팔 들어 지휘.
    warn: Object.freeze({ armL: [-2.6, 0, -0.6], armR: [-1.2217, 0, 0.1], torso: [0, 0, 0] }),
    // 'charge'(현재 B05에는 오지 않음 — 들어오면 마이크에 몸을 기울인 자세).
    lean: Object.freeze({ armL: [-0.4, 0, 0], armR: [-1.2217, 0, 0.1], torso: [0, 0, 0] }),
    // 격노 전환·정지: 두 팔 위 + 호루라기.
    stun: Object.freeze({ armL: [-2.9, 0, -0.5], armR: [-2.9, 0, 0.5], torso: [0, 0, 0] }),
    // 교가 제창(b05_p2) 몸 연출(Terry 2026-11-22 "공격순간 보스의 몸 움직임을 좀 넣어"): 지휘 마지막 큰 박자.
    // chantWindup = 타격 직전 최대 준비(두 팔 머리 위로 더 젖히고 몸을 뒤로), chantStrike = 타격 순간(두 팔 앞아래로 내려치며 몸 숙임).
    // 두 팔을 V자로 바깥·앞으로 벌린다. 팔은 쉬는 기울기(ARM_TILT)가 먼저 걸려 있어, 들어 올릴 때 왼팔 z가 +면 바깥, −면 머리 뒤 안쪽이다
    // (기존 warn 왼팔 z −0.6이 Mini 큰 머리 뒤로 숨던 이유). Blender 미리보기로 확인(F:/ezs-work/backup/boss7_ult_20261122/).
    chantWindup: Object.freeze({ armL: [-2.5, 0, 0.55], armR: [-2.4, 0, -0.55], torso: [-0.2, 0, 0] }),
    chantStrike: Object.freeze({ armL: [-0.45, 0, -0.2], armR: [-0.6, 0, 0.15], torso: [0.34, 0, 0] }),
  }),
})

// ── Stage 6 B05 「교가 제창」(b05_p2) 타격 몸 연출 곡선 ─────────────────────────────────────────────
// 그림만이다. 입력은 게임이 이미 가진 공격 스냅샷의 elapsedMs/windupMs/activeMs(읽기 전용) — 타이밍·피해·범위는 바꾸지 않는다.
// 타격 순간 = elapsedMs === windupMs(피해 판정이 active로 들어가는 바로 그 시각). strike 곡선은 이 순간 정확히 1(최대)이다.
//   준비(anticipation): windup 35% 지점부터 타격 lead 직전까지 0→1로 부드럽게 — 팔을 더 치켜들고 몸을 뒤로 젖힌다.
//   내려치기(strike): 타격 strikeLeadMs 전부터 가속(제곱)해 타격 순간 1, 이후 strikeDecayMs 동안 부드럽게 0(기울기 0에서 출발 → 잠깐 머문다).
//   가중(weight): windup 첫 blendInMs 동안 0→1(평소 자세에서 이어받기), 감쇠가 끝나면 0(평소 자세로 돌려주기).
// 스쿼시: 준비 때 위로 늘이고(stretch), 타격 때 아래로 눌린다(squash). 발바닥 높이는 MiniBossModel이 그대로 붙인다.
export const B05_CHANT_STRIKE = Object.freeze({
  patternId: 'b05_p2',
  blendInMs: 220,
  anticipationStart: 0.35,
  strikeLeadMs: 110,
  strikeDecayMs: 760,
  stretchY: 0.05,
  stretchXZ: -0.03,
  squashY: -0.11,
  squashXZ: 0.07,
})
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t) }

/** 곡선 값만(0~1): anticipation, strike, weight. 타격 뒤 감쇠(strikeDecayMs)가 active 350ms를 덮으므로 activeMs는 받지 않는다. out을 넘기면 그 객체를 채운다(프레임마다 새 객체를 만들지 않는다). */
export function b05ChantStrikeCurve(elapsedMs, windupMs, out = { anticipation: 0, strike: 0, weight: 0 }) {
  const C = B05_CHANT_STRIKE
  out.anticipation = 0; out.strike = 0; out.weight = 0
  if (!Number.isFinite(elapsedMs) || !(windupMs > 0) || elapsedMs < 0) return out
  const impact = windupMs
  const lead = Math.min(C.strikeLeadMs, windupMs * 0.25)
  if (elapsedMs >= impact + C.strikeDecayMs) return out
  out.weight = elapsedMs < impact ? smooth01(elapsedMs / Math.min(C.blendInMs, windupMs * 0.3)) : 1
  const anticStart = windupMs * C.anticipationStart
  out.anticipation = elapsedMs < impact ? smooth01((elapsedMs - anticStart) / Math.max(1, impact - lead - anticStart)) : 1
  if (elapsedMs < impact - lead) out.strike = 0
  else if (elapsedMs < impact) { const u = (elapsedMs - (impact - lead)) / lead; out.strike = u * u }
  else out.strike = 1 - smooth01((elapsedMs - impact) / C.strikeDecayMs)
  return out
}

const lerp = (a, b, t) => a + (b - a) * t
const B05_CHANT_POSE_KEYS = Object.freeze(['armL', 'armR', 'torso'])
/**
 * 곡선 → 절대 자세(팔·몸통 회전 + 스쿼시). 타격 전: (warn + 준비) → strike 보간, 타격 후: normal ← strike 보간.
 * out = { weight, armL:[3], armR:[3], torso:[3], scaleY, scaleXZ } 를 채운다. MiniBossModel이 lerp(부드럽게 따라가는 평소 자세, 이 자세, weight).
 */
export function b05ChantStrikePose(elapsedMs, windupMs, out = createB05ChantStrikePose()) {
  const c = b05ChantStrikeCurve(elapsedMs, windupMs, out.curve)
  const P = MINI_BOSS_POSES.B05, C = B05_CHANT_STRIKE
  const before = elapsedMs < windupMs
  for (let k = 0; k < B05_CHANT_POSE_KEYS.length; k += 1) {
    const key = B05_CHANT_POSE_KEYS[k]
    for (let i = 0; i < 3; i += 1) {
      const from = before ? lerp(P.warn[key][i], P.chantWindup[key][i], c.anticipation) : P.normal[key][i]
      out[key][i] = lerp(from, P.chantStrike[key][i], c.strike)
    }
  }
  const stretch = before ? c.anticipation * (1 - c.strike) : 0
  out.scaleY = 1 + C.stretchY * stretch + C.squashY * c.strike
  out.scaleXZ = 1 + C.stretchXZ * stretch + C.squashXZ * c.strike
  out.weight = c.weight
  return out
}
export function createB05ChantStrikePose() {
  return { weight: 0, armL: [0, 0, 0], armR: [0, 0, 0], torso: [0, 0, 0], scaleY: 1, scaleXZ: 1, curve: { anticipation: 0, strike: 0, weight: 0 } }
}

export const MINI_BOSS_VISUALS = Object.freeze({
  B10: Object.freeze({
    id: 'B10',
    studioItemId: 'zombie-b10',
    body: 'male-a',
    skin: 'zPale',
    skinParts: Object.freeze(['head', 'torso', 'armL', 'armR']),
    eye: 'zPale',
    // 셔츠 → 흰 소매, 안경테 → 검정, 머리카락 → 피부(벗어진 정수리), 바지 → 차콜, 신발 → 갈색, 입 조각 지움
    recolor: Object.freeze({ r2c9: 'white', r3c5: 'shadowBlack', r3c7: 'zPale', r1c1: 'suitCharcoal', r3c1: 'apronBrown', mouth: 'zPale' }),
    // 몸통 셔츠 칸 → 남색 조끼, 허리 → 검정 벨트, 다리의 피부 칸(양말) → 차콜
    partRecolor: Object.freeze({
      torso: Object.freeze({ r2c1: 'shadowBlack', r2c9: 'conductorNavy' }),
      legL: Object.freeze({ r2c3: 'suitCharcoal' }),
      legR: Object.freeze({ r2c3: 'suitCharcoal' }),
    }),
    splits: Object.freeze([]),
    partScale: BOSS_PART_SCALE.B10,
    face: 'tired',
    // Kenney 단위 → 기존 B10 메시 단위(EnemyVisual 그룹 0.888 안). 키를 기존 보스(약 1.86 월드)와 같게.
    fit: 2.6158,
    // 기존 B10 메시의 발바닥 높이(신발 밑창 −0.835). 새 몸 발바닥을 같은 높이에 둔다 → 땅 접지 그대로.
    legacyFootY: -0.835,
    poseFor(animPhase) {
      if (animPhase === 'warn' || animPhase === 'special') return MINI_BOSS_POSES.B10.warn
      if (animPhase === 'charge') return MINI_BOSS_POSES.B10.ledger
      if (animPhase === 'stun') return MINI_BOSS_POSES.B10.stun
      return MINI_BOSS_POSES.B10.normal
    },
  }),
  B05: Object.freeze({
    id: 'B05',
    studioItemId: 'zombie-b05',
    body: 'male-d',
    skin: 'zPale',
    skinParts: null,
    eye: 'zPale',
    // 정장 → 차콜, 넥타이 → 빨강, 입 조각 지움
    recolor: Object.freeze({ r3c7: 'suitCharcoal', r2c15: 'teamRed', mouth: 'zPale' }),
    partRecolor: Object.freeze({ torso: Object.freeze({ r3c15: 'white' }) }),
    // 머리카락 칸(r2c1)을 삼각형 높이로 나눈다: 정수리·앞머리 윗부분 = 피부(대머리), 옆·뒤 = 흰머리.
    // 기준은 모델 좌표(Kenney 단위, 머리 상자 y 0.343~0.661).
    splits: Object.freeze([
      Object.freeze({ part: 'head', cell: 'r2c1', when: Object.freeze([Object.freeze({ minY: 0.6 }), Object.freeze({ minY: 0.5, minZ: 0.1 })]), then: 'zPale', otherwise: 'white' }),
    ]),
    partScale: BOSS_PART_SCALE.B05,
    face: 'stern',
    fit: 2.2359,
    legacyFootY: -0.665,
    poseFor(animPhase) {
      if (animPhase === 'warn' || animPhase === 'special') return MINI_BOSS_POSES.B05.warn
      if (animPhase === 'charge') return MINI_BOSS_POSES.B05.lean
      if (animPhase === 'stun') return MINI_BOSS_POSES.B05.stun
      return MINI_BOSS_POSES.B05.normal
    },
  }),
})

export const MINI_BOSS_TYPES = Object.freeze(Object.keys(MINI_BOSS_VISUALS))
export function isMiniBossType(type) { return Object.hasOwn(MINI_BOSS_VISUALS, type) }
export function getMiniBossVisual(type) { return MINI_BOSS_VISUALS[type] ?? null }

// 삼각형 하나의 새 칸(없으면 null). 우선순위: 높이 나누기 > 파트별 > 공통 > 피부 > 눈 — Blender 빌드와 같다.
export function miniBossCellTarget(visual, part, cell, centroid, skinCell) {
  for (const s of visual.splits) {
    if (s.part !== part || s.cell !== cell) continue
    const hit = s.when.some((c) => (c.minY === undefined || centroid[1] > c.minY) && (c.minZ === undefined || centroid[2] > c.minZ))
    return hit ? s.then : s.otherwise
  }
  const partMap = visual.partRecolor[part]
  if (partMap && partMap[cell]) return partMap[cell]
  if (visual.recolor[cell]) return visual.recolor[cell]
  if (skinCell && cell === skinCell && (!visual.skinParts || visual.skinParts.includes(part))) return visual.skin
  if (cell === 'eye') return visual.eye
  return null
}

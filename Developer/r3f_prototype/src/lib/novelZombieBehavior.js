// Track B — 2026-10-25 승인된 신규 일반 좀비 12종(E34~E45)의 행동 런타임 정본.
// 설계 정본: Planner/stage_zombie_original_concepts_20261025.md (스테이지당 3종).
//
// 이 모듈은 순수 함수다. React/Three/Rapier/저장소/오디오에 의존하지 않으며 프레임 경로에서
// 객체를 새로 만들지 않는다(호출자가 재사용 out 객체를 넘긴다).
//
// 왜 별도 모듈인가: 기존 12종은 "팔레트 + scale + 역할 플래그"만 달랐다. 이번 12종은 정의 자체가
// 예고(telegraph) → 공격 → 회복 로직의 차이라, 타입별 상태기계를 enemySimulation.js의 거대한
// step 루프 안에 인라인으로 늘리면 읽을 수 없게 된다.
//
// 불변식(기획 문서 §수용 기준에서 그대로 옮긴 것):
//  1. 12종 전부 근접 전용이다. 투사체·바닥 잔류 장판·충격파·식판/음식 효과를 만들지 않는다.
//  2. 피해는 ATTACK 단계에서만, 그리고 그 단계 안의 damageFrom 비율 이후에만 발생한다.
//     예고(TELEGRAPH) 단계에서는 어떤 경우에도 damage가 0이다.
//  3. 공격 방향은 예고가 끝나는 순간 1회 확정되고(runDirX/runDirZ에 저장) 그 뒤로 추적하지 않는다.
//     따라서 예고를 읽고 옆으로 비키면 반드시 빈 방향이 남는다 — 점프·대시·전용 기술을 요구하지 않는다.
//  4. 스윕형(E40/E43)의 호(arc)는 360°가 아니라 최대 104°다. 반대쪽은 항상 열려 있다.
//  5. 2026-10-25 추가(BLOCKER-1): 각 종의 공격은 자기 trigger 거리에서 정지한 플레이어에게 반드시
//     닿아야 한다. 이 불변식이 없어서 12종 중 7종이 영구히 피해 0이었다 — 접근은 trigger에서 멈추는데
//     공격의 횡(접선) 성분이 지배적이면 경로가 플레이어를 d·sinθ만큼 비껴가고(θ = 공격 방향이 플레이어
//     방향에서 벌어진 각), 주기마다 같은 거리로 되돌아와 고정점에서 영원히 맴돌았다. 실효 명중 반경은
//     contactDist + reach뿐이므로 설계 조건은 `trigger · sinθ ≤ contactDist + reach`다.
//     novelZombieBehavior.test.js의 "정지 플레이어 60초 누적 피해 > 0"이 이 불변식을 못박는다.
//
// 거리 단위는 전부 월드 유닛이다. 1 블록 = 4 유닛. (예: reach 0.95u = 0.2375블록)

export const NOVEL_TYPE_MIN = 37
export const NOVEL_TYPE_MAX = 48

// 기존 상태 코드(enemySimulation.js): 1 CHASE / 2 WARN / 3 CHARGE / 4 STUN / 5 COIN_LURE / 6 COIN_FLEE.
// 7~13은 이번 12종 전용이다. ZombieInstanceLayer의 phase()는 2/3/4만 보므로 충돌하지 않는다.
// ALT 접미사는 "이번 주기는 반대쪽(어깨/팔/회전 방향)"을 뜻한다 — 교대형이 별도 풀 칼럼 없이
// 좌우를 번갈아 쓰게 하는 장치다. RECOVER와 RECOVER_ALT를 나눠 둔 이유도 같다(다음 주기 극성 기억).
export const ENEMY_STATE_NOVEL_APPROACH = 7
export const ENEMY_STATE_NOVEL_TELEGRAPH = 8
export const ENEMY_STATE_NOVEL_ATTACK = 9
export const ENEMY_STATE_NOVEL_RECOVER = 10
export const ENEMY_STATE_NOVEL_TELEGRAPH_ALT = 11
export const ENEMY_STATE_NOVEL_ATTACK_ALT = 12
export const ENEMY_STATE_NOVEL_RECOVER_ALT = 13

const DEG = Math.PI / 180

const base = {
  approach: 'direct',
  approachMul: 1,
  approachAngleDeg: 0,
  orbitRadius: 0,
  telegraphMove: 'hold',
  telegraphDriftMul: 0,
  telegraphBackSpeed: 0,
  telegraphYawOffsetDeg: 0,
  leanToPlayerMotion: false,
  lockDirAtTelegraphStart: false,
  attack: 'commitDash',
  attackAngleDeg: 0,
  attackSpeed: 2,
  inwardMul: 0,
  damageFrom: 0,
  reach: 0.12,
  reachAlt: 0,
  coneDeg: 0,
  coneAltDeg: 0,
  sweepFromDeg: 0,
  sweepToDeg: 0,
  sweepTolDeg: 0,
  sweepTolAltDeg: 0,
  retreatSpeed: 0,
  awayMul: 0,
  returnAngleDeg: 0,
  stepSpeed: 0,
  sidestepSpeed: 0,
  alternates: false,
}

/**
 * 타입코드 → 행동 파라미터. 키는 ENEMY_TYPE_CODES와 1:1이며 Level_Mini가 소유한다.
 * 비주얼(ZombieMesh/ZombieInstanceLayer)은 이 표를 읽지 않고 pool.state만 읽는다.
 */
export const NOVEL_BEHAVIORS = Object.freeze({
  // ── Stage 1 — 교실의 책상 사이 생존 (근접만, 원거리 0) ──────────────────────
  // E34 박자접기형: 옆으로 몸을 세워 접근 → 상체를 좁히는 정지 예고 → 좁아진 쪽으로 짧은 사선 어깨밀기.
  // 차저(E05)와 다른 점: 예고 중 가속하지 않고, 공격이 220ms 단발이며 직선이 아니라 ±38° 사선이다.
  37: Object.freeze({ ...base, id: 'E34', name: '박자접기형',
    approach: 'sideOn', approachAngleDeg: 55, trigger: 1.3,
    telegraphMs: 420, telegraphMove: 'hold',
    attack: 'commitDash', attackMs: 220, attackAngleDeg: 38, attackSpeed: 3.0, reach: 0.10,
    recoveryMs: 360, cooldownMs: 260, alternates: true }),
  // E35 모서리비껴형: 한쪽 어깨를 앞세워 접근 → 어깨가 바뀌며 몸통 정면이 회전(예고) → 선회로 옆을 스쳐 지나감.
  // E01/E02의 지속 추격과 달리 플레이어 정면을 유지하지 않는다. 지나간 자리에 아무것도 남기지 않는다.
  // inwardMul 0.22 → 1.6 (2026-10-25 BLOCKER-1): 0.22는 선회가 거의 순수 접선이라 trigger 1.6u에서
  // 플레이어를 1.49u 비껴갔다(불변식 5 위반). 1.6이면 선회 방향이 플레이어 방향에서 32° 벌어진 채
  // 몸이 플레이어를 통과해 지나간다 — '스쳐 지나감'은 그대로고 닿기는 한다.
  38: Object.freeze({ ...base, id: 'E35', name: '모서리비껴형',
    approach: 'shoulderLed', approachAngleDeg: 22, trigger: 1.6,
    telegraphMs: 300, telegraphMove: 'drift', telegraphDriftMul: 0.3,
    attack: 'pivotPass', attackMs: 520, attackSpeed: 2.4, inwardMul: 1.6, reach: 0.14,
    recoveryMs: 280, cooldownMs: 200, alternates: true }),
  // E36 반걸음되짚기형: 접근 중 한 발을 뒤로 빼며 몸을 세운다(= 예고가 후퇴다) → 빼기 전 발자국 방향으로 되짚는다.
  // 공격 방향은 "후퇴를 시작한 순간"의 플레이어 방향이다(lockDirAtTelegraphStart). 후퇴 중 추적하지 않으므로
  // 플레이어가 옆으로 움직이면 되짚는 선이 빈다 — "안전한 정지로 오해하지 말라"는 대응이 성립한다.
  39: Object.freeze({ ...base, id: 'E36', name: '반걸음되짚기형',
    approach: 'direct', trigger: 1.4,
    telegraphMs: 440, telegraphMove: 'back', telegraphBackSpeed: 0.9, lockDirAtTelegraphStart: true,
    attack: 'commitDash', attackMs: 260, attackAngleDeg: 0, attackSpeed: 2.6, reach: 0.10,
    recoveryMs: 420, cooldownMs: 300, alternates: false }),

  // ── Stage 2 — 길게 뻗은 복도에서 방향 읽기 ─────────────────────────────────
  // E37 빗금엇갈림형: 복도 축으로 정렬 접근 → 머리와 흉곽이 어긋난 '꼬인 축' 정지 예고(yaw는 -62°쪽을 가리킨다)
  //   → 실제 횡단은 교차하는 반대 사선(+62°) 한 방향으로 고정. 지그재그 연속 추격이 아니다.
  // attackAngleDeg 62 → 22 (2026-10-25 BLOCKER-1): 62°는 돌진선이 플레이어를 trigger·sin62 = 2.30u
  // 비껴가 정지 플레이어에게도 영구히 닿지 않았다. 반복 돌진의 수렴 거리는 travel/(2cos θ)이고
  // 그 지점의 비껴감이 명중 반경 0.44u 이하여야 하므로 travel·tan θ ≤ 2·(contactDist + reach),
  // 즉 1.80·tan θ ≤ 0.88 → θ ≤ 26°. 여유를 두어 22°로 둔다. '엇갈림'은 예고 yaw(-62°)와
  // 실제 돌진(+22°)이 84° 어긋난다는 데서 그대로 성립한다.
  40: Object.freeze({ ...base, id: 'E37', name: '빗금엇갈림형',
    approach: 'axisAlign', trigger: 2.6,
    telegraphMs: 520, telegraphMove: 'hold', telegraphYawOffsetDeg: -62,
    attack: 'commitDash', attackMs: 620, attackAngleDeg: 22, attackSpeed: 2.9, reach: 0.12,
    recoveryMs: 320, cooldownMs: 260, alternates: true }),
  // E38 빈칸반응형: 정면 접근 → 플레이어의 직전 이동 방향으로 머리를 기울여 '읽었음'을 표시(예고)
  //   → 그 반대편으로 짧게 옆 이동(피해 없음) → 그 다음 정면으로 가까워지며 접촉.
  // E04의 거리 유지·옆걸음·투사체를 전혀 쓰지 않는다. 피해는 공격 단계의 50% 이후에만 발생한다.
  41: Object.freeze({ ...base, id: 'E38', name: '빈칸반응형',
    approach: 'direct', trigger: 1.9,
    telegraphMs: 380, telegraphMove: 'hold', leanToPlayerMotion: true,
    // sidestepSpeed 2.2 → 1.4 (2026-10-25 BLOCKER-1): 옆 이동이 0.572u라 뒤이은 '정면 밀기'가
    // 확정 방향선 위에서 그만큼 평행 이탈해 명중 반경 0.42u를 영구히 벗어났다(거리와 무관한 구조적 빗나감).
    // 이탈량 = sidestepSpeed · attackMs · damageFrom ≤ contactDist + reach가 조건이다 → 1.4·0.52·0.5 = 0.364u.
    attack: 'reactSidestepPush', attackMs: 520, sidestepSpeed: 1.4, attackSpeed: 2.6, damageFrom: 0.5, reach: 0.10,
    recoveryMs: 300, cooldownMs: 240, alternates: false }),
  // E39 선끝접기형: 복도 중심축 접근 → 상체가 낮아지고 한 팔이 몸통 아래로 접힌다(600ms, 세트 최장 예고)
  //   → 접힌 쪽으로만 몸을 틀어 닿는다. 접히지 않은 쪽이 그대로 열린 통로다(벽/봉쇄/붙잡기 없음).
  // attackAngleDeg 58 → 40 (2026-10-25, Balance_QA_Mini 지시): 피해는 나지만 정지 플레이어 상대
  // 첫 명중이 12.3초(시작거리 2u)~20.0초(6u)라 초반이 사실상 무해했다 — 58° 돌진은 주기당 거리를
  // 조금씩만 좁혀 수렴점 travel/(2cos θ) = 0.62u에 닿기까지 12초가 걸렸다.
  // 40°는 첫 명중을 4.6초(2u)/12.3초(6u)로 당기면서 trigger 2.0과 600ms 최장 예고를 그대로 둔다.
  // 위험대는 변하지 않는다(149.5° / 안전호 210.5°) — 몸이 지나는 통로의 폭은 각도와 무관하고 회전만 한다.
  // E34(38°)와 같은 대역이라 "접힌 쪽으로 몸을 틀어 닿는다"는 정체성도 유지된다.
  42: Object.freeze({ ...base, id: 'E39', name: '선끝접기형',
    approach: 'axisAlign', trigger: 2.0,
    telegraphMs: 600, telegraphMove: 'hold',
    attack: 'commitDash', attackMs: 300, attackAngleDeg: 40, attackSpeed: 2.2, reach: 0.16,
    recoveryMs: 360, cooldownMs: 300, alternates: true }),

  // ── Stage 3 — 체육관의 원형·리듬 압박 ──────────────────────────────────────
  // E40 중심축비틀기형: 발을 고정하고(이동 0) 상체만 비틀어 유지(예고) → 비틀림이 풀리는 방향으로 좁은 팔 스윕.
  // 스윕은 +70°에서 -20°까지 90°만 지나가고 허용 오차 26°다 → 호 바깥은 전부 안전하다.
  // 제자리 회전이라 돌진 가속이 없고, 광역 충격파도 아니다(팔이 실제로 지나가는 각도만 판정).
  // trigger 1.7 → 1.35 (2026-10-25 BLOCKER-1): 제자리 스윕은 공격 중 이동이 0이므로 trigger가
  // 실효 명중 반경(contactDist 0.453 + reach 0.95 = 1.403u)보다 크면 구조적으로 영원히 닿지 않는다.
  43: Object.freeze({ ...base, id: 'E40', name: '중심축비틀기형',
    approach: 'direct', approachMul: 0.85, trigger: 1.35,
    telegraphMs: 560, telegraphMove: 'plant',
    attack: 'plantedSweep', attackMs: 420, sweepFromDeg: 70, sweepToDeg: -20, sweepTolDeg: 26, reach: 0.95,
    recoveryMs: 520, cooldownMs: 340, alternates: true }),
  // E41 쌍박자교대형: 낮은 팔(reach 0.52 / 좁은 40° 콘)과 높은 팔(reach 0.30 / 넓은 70° 콘)이
  //   서로 다른 높이에서 번갈아 나온다. 거두는 회복(460ms)이 끝나야 다음 팔이 나가므로 연속 타격이 아니다.
  //   정지 방어·패리를 요구하지 않는다 — 첫 타격 반대쪽으로 옆 이동하면 비는 구조다.
  44: Object.freeze({ ...base, id: 'E41', name: '쌍박자교대형',
    approach: 'direct', trigger: 1.5,
    telegraphMs: 340, telegraphMove: 'hold',
    attack: 'reach', attackMs: 240, attackSpeed: 1.1, reach: 0.52, reachAlt: 0.30, coneDeg: 40, coneAltDeg: 70,
    recoveryMs: 460, cooldownMs: 220, alternates: true }),
  // E42 반원발맞춤형: 반지름 1.2u 곡선 걸음으로 옆자리를 잡다가 발을 모아 방향 고정(예고)
  //   → 짧은 반원 궤적으로 몸을 돌려 접촉. 화면 횡단 스프린트(RZC/RZL)도, 급가속 추격도 아니다.
  // orbitRadius 2.6→1.2 / trigger 3.0→1.6 / inwardMul 0.7→1.6 (2026-10-25 BLOCKER-1):
  // orbit 접근은 거리를 orbitRadius로 '유지'하므로 trigger가 orbitRadius보다 커야 예고가 걸리고,
  // 동시에 trigger가 호의 실효 명중 거리 안이어야 한다. 2.6u 궤도 + 3.0u trigger + 접선 지배(0.7)는
  // 두 조건을 모두 깨서 1.04u 고정점에서 영원히 맴돌았다. 궤도를 1.2u로 좁히고 호를 안쪽으로
  // 더 감는다(접선/안쪽 = 1:1.6, 플레이어 방향에서 32°) — '반원 발맞춤'의 곡선 걸음은 유지된다.
  45: Object.freeze({ ...base, id: 'E42', name: '반원발맞춤형',
    approach: 'orbit', orbitRadius: 1.2, approachMul: 0.9, trigger: 1.6,
    telegraphMs: 460, telegraphMove: 'plant',
    attack: 'arcStep', attackMs: 560, attackSpeed: 2.1, inwardMul: 1.6, reach: 0.14,
    recoveryMs: 320, cooldownMs: 260, alternates: true }),

  // ── Stage 4 — 급식실의 분기와 재배치 ───────────────────────────────────────
  // E43 엇높이교차형: 느리게(0.7×) 접근 → 공격할 팔을 수평 높이로 들어올려 예고
  //   → 낮은 교차(reach 0.70 / 오차 22°)와 높은 교차(reach 0.46 / 오차 30°)가 분리된 두 방향 스윕으로 교대.
  //   E40과 달리 몸 앞을 가로지르는 교차(+52°→-52°)이고, 두 공격 사이 회복(480ms)이 선명하다.
  //   오차 상한의 근거: 교차 104° + 오차×2가 180°를 넘으면 반구 전체가 덮여 "안전한 이동 방향"이
  //   사라진다(기획 대응 조건 위반). 낮은 교차 148°, 높은 교차 164°로 양쪽 모두 열린 방향을 남긴다.
  // trigger 1.6 → 0.9 (2026-10-25 BLOCKER-1): E40과 같은 제자리 스윕이라 trigger가 실효 명중 반경을
  // 넘으면 영구히 닿지 않는다. 낮은 교차 0.480+0.70 = 1.18u, 높은 교차 0.480+0.46 = 0.94u이고
  // 두 극성이 모두 닿아야 하므로 더 짧은 쪽(0.94u) 안인 0.9u를 쓴다.
  46: Object.freeze({ ...base, id: 'E43', name: '엇높이교차형',
    approach: 'direct', approachMul: 0.7, trigger: 0.9,
    telegraphMs: 420, telegraphMove: 'plant',
    attack: 'crossSweep', attackMs: 360, sweepFromDeg: 52, sweepToDeg: -52, sweepTolDeg: 22, sweepTolAltDeg: 30,
    reach: 0.70, reachAlt: 0.46,
    recoveryMs: 480, cooldownMs: 280, alternates: true }),
  // E44 발맞춤후퇴형: 두 발을 같은 선에 모으고 어깨가 옆을 향한다(예고) → 뒤가 아니라 '옆으로' 한 걸음 물러난다
  //   (공격 단계 전반 40%, 피해 없음) → 틀었던 방향에서 사선(-20°)으로 짧게 재접근하며 접촉.
  //   후퇴선과 재접근선이 다른 방향이라 뒤쫓아 같은 선에 들어가면 맞고, 열린 쪽으로 재배치하면 빈다.
  // returnAngleDeg 40→20 / awayMul 0.4→0.15 (2026-10-25): 후퇴선과 재접근선이 서로 크게 벌어져
  // 몸이 지나는 통로가 넓었다 — 1°×0.05u 래스터(r > contactDist+reach) 측정 위험대 224° / 안전호 136°로
  // 12종 중 유일하게 반구를 넘었다(E43을 196°→162°로 좁힌 것과 같은 기준: novelZombieBehavior.js §4 주석).
  // 재접근 사선을 20°로 세우고 후퇴의 후방 성분을 0.15로 줄이면 171° / 189°다. 후방 성분 축소는
  // 기획의 "뒤가 아니라 옆으로 물러난다"에 오히려 더 가깝다.
  47: Object.freeze({ ...base, id: 'E44', name: '발맞춤후퇴형',
    approach: 'direct', trigger: 1.8,
    telegraphMs: 400, telegraphMove: 'plant',
    attack: 'sideRetreatReturn', attackMs: 640, retreatSpeed: 2.0, awayMul: 0.15, returnAngleDeg: 20,
    attackSpeed: 2.4, damageFrom: 0.4, reach: 0.12,
    recoveryMs: 300, cooldownMs: 240, alternates: true }),
  // E45 무게중심넘김형: 상체를 한쪽으로 기울여 무게중심을 옮긴다(예고) → 기울인 쪽 다리를 들어 반대쪽에 발을 놓고
  //   (전반 50%, 피해 없음) → 새 발을 축으로 반대 방향으로 상체를 넘겨 접촉.
  //   먼저 기운 쪽에 머물면 발이 놓인 뒤 그쪽이 비고, 발이 놓인 반대쪽 열린 공간이 안전하다.
  // 2026-10-25 BLOCKER-1: 넘김 구간의 접선 성분 부호가 디딤 구간과 같아서(아래 weightShift 참조)
  // 몸이 한쪽으로만 계속 벌어지며 1.02u 고정점에 갇혔다 — 자기 주석의 "반대 방향으로 넘김"과도 어긋났다.
  // 부호를 바로잡은 뒤 stepSpeed 1.6→2.0 / inwardMul 1.0→2.2 / damageFrom 0.35→0.5로 조정했다:
  // 디딤을 더 분명히 하고 넘김을 안쪽으로 세워 위험대를 229°에서 155°(안전호 205°)로 내린다.
  48: Object.freeze({ ...base, id: 'E45', name: '무게중심넘김형',
    approach: 'direct', trigger: 1.5,
    telegraphMs: 480, telegraphMove: 'plant',
    attack: 'weightShift', attackMs: 560, stepSpeed: 2.0, attackSpeed: 2.0, inwardMul: 2.2,
    damageFrom: 0.5, reach: 0.12,
    recoveryMs: 400, cooldownMs: 260, alternates: true }),
})

export function isNovelZombieType(typeCode) {
  return typeCode >= NOVEL_TYPE_MIN && typeCode <= NOVEL_TYPE_MAX && NOVEL_BEHAVIORS[typeCode] !== undefined
}

export function novelZombieBehavior(typeCode) {
  return NOVEL_BEHAVIORS[typeCode] ?? null
}

export function isNovelTelegraphState(state) {
  return state === ENEMY_STATE_NOVEL_TELEGRAPH || state === ENEMY_STATE_NOVEL_TELEGRAPH_ALT
}

export function isNovelAttackState(state) {
  return state === ENEMY_STATE_NOVEL_ATTACK || state === ENEMY_STATE_NOVEL_ATTACK_ALT
}

export function createNovelBehaviorResult() {
  return { velocityX: 0, velocityZ: 0, damage: 0, moving: false, hasYaw: false, yaw: 0, state: 0 }
}

function wrapAngle(angle) {
  let a = angle
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/** 피해 판정 1: 몸통 접촉형. 접촉 거리 + reach 안이면 닿는다(방향 무관, 몸이 지나가는 공격들). */
function bodyContactHit(distance, contactDist, reach) {
  return distance <= contactDist + reach
}

/** 피해 판정 2: 콘(cone)형. 확정 방향 기준 ±half 안에서만 닿는다(내민 팔). */
function coneHit(distance, contactDist, reach, bearing, facing, halfAngle) {
  if (distance > contactDist + reach) return false
  return Math.abs(wrapAngle(bearing - facing)) <= halfAngle
}

/** 피해 판정 3: 스윕형. t에 따라 움직이는 팔 각도와 플레이어 방위각이 tol 안에서 겹칠 때만 닿는다. */
function sweepHit(distance, contactDist, reach, bearing, facing, sign, fromDeg, toDeg, tolDeg, t) {
  if (distance > contactDist + reach) return false
  const armAngle = facing + sign * (fromDeg + (toDeg - fromDeg) * t) * DEG
  return Math.abs(wrapAngle(bearing - armAngle)) <= tolDeg * DEG
}

/**
 * 접선 + 안쪽을 섞는 공격(pivotPass/arcStep/weightShift)의 정규화 계수.
 * dirX/dirZ가 단위벡터라 (접선 1 : 안쪽 inwardMul) 합벡터의 길이는 sqrt(1 + inwardMul²)다.
 * 이걸 나누지 않으면 inwardMul을 올릴 때마다 돌진 속도와 이동 거리가 같이 부풀어, 안쪽으로 감는
 * 조정이 "더 빠르고 더 멀리 가는" 부작용을 동반한다. 나눠 두면 attackSpeed가 실제 속도(u/s)다.
 */
function blendNorm(attackSpeed, inwardMul) {
  return attackSpeed / Math.sqrt(1 + inwardMul * inwardMul)
}

function rotatedX(x, z, angle) {
  return x * Math.cos(angle) - z * Math.sin(angle)
}

function rotatedZ(x, z, angle) {
  return x * Math.sin(angle) + z * Math.cos(angle)
}

function polarity(state) {
  return state === ENEMY_STATE_NOVEL_TELEGRAPH_ALT
    || state === ENEMY_STATE_NOVEL_ATTACK_ALT
    || state === ENEMY_STATE_NOVEL_RECOVER_ALT ? -1 : 1
}

/**
 * 한 슬롯의 1프레임 행동을 진행한다.
 *
 * @param pool  EnemyEntityPool
 * @param index 슬롯 index
 * @param a     { playerX, playerZ, posX, posZ, distance, nx, nz, speed, contactDist, damage,
 *                playerMoveX, playerMoveY(미사용), playerMoveZ, hitReady }
 *              nx/nz = 플레이어 방향 단위벡터. playerMoveX/Z = 플레이어의 최근 이동 단위벡터(없으면 0).
 *              hitReady = pool.hitCooldown[index] <= 0.
 * @param out   createNovelBehaviorResult()로 만든 재사용 객체
 */
export function stepNovelZombieBehavior(pool, index, a, out) {
  out.velocityX = 0
  out.velocityZ = 0
  out.damage = 0
  out.moving = false
  out.hasYaw = false
  out.yaw = 0

  const type = pool.type[index]
  const p = NOVEL_BEHAVIORS[type]
  if (!p) {
    out.state = ENEMY_STATE_NOVEL_APPROACH
    return out
  }

  let state = pool.state[index]
  if (state < ENEMY_STATE_NOVEL_APPROACH || state > ENEMY_STATE_NOVEL_RECOVER_ALT) {
    // 풀 슬롯 재사용·일시정지·재시작 뒤 남은 값이 섞이지 않게 항상 APPROACH에서 다시 시작한다.
    state = ENEMY_STATE_NOVEL_APPROACH
    pool.state[index] = state
    pool.stateTimer[index] = 0
    pool.runDirX[index] = 1
    pool.runDirZ[index] = 0
  }

  const { distance, nx, nz, speed, contactDist } = a

  // ── 상태 전이 ─────────────────────────────────────────────────────────────
  if (state === ENEMY_STATE_NOVEL_APPROACH) {
    if (distance <= p.trigger && pool.attackCooldown[index] <= 0) {
      // 직전 주기가 primary였으면 다음은 ALT. 교대하지 않는 타입은 항상 primary다.
      state = ENEMY_STATE_NOVEL_TELEGRAPH
      pool.state[index] = state
      pool.stateTimer[index] = p.telegraphMs
      if (p.lockDirAtTelegraphStart) {
        pool.runDirX[index] = nx || 1
        pool.runDirZ[index] = nz
      }
    }
  } else if (state === ENEMY_STATE_NOVEL_RECOVER || state === ENEMY_STATE_NOVEL_RECOVER_ALT) {
    if (pool.stateTimer[index] <= 0) {
      const nextAlt = p.alternates && state === ENEMY_STATE_NOVEL_RECOVER
      if (distance <= p.trigger && pool.attackCooldown[index] <= 0) {
        state = nextAlt ? ENEMY_STATE_NOVEL_TELEGRAPH_ALT : ENEMY_STATE_NOVEL_TELEGRAPH
        pool.state[index] = state
        pool.stateTimer[index] = p.telegraphMs
        if (p.lockDirAtTelegraphStart) {
          pool.runDirX[index] = nx || 1
          pool.runDirZ[index] = nz
        }
      } else {
        // 멀어졌으면 접근으로 복귀하되 교대 극성은 다음 예고 진입에서 primary로 리셋한다.
        state = ENEMY_STATE_NOVEL_APPROACH
        pool.state[index] = state
      }
    }
  }

  if (isNovelTelegraphState(state) && pool.stateTimer[index] <= 0) {
    const alt = state === ENEMY_STATE_NOVEL_TELEGRAPH_ALT
    state = alt ? ENEMY_STATE_NOVEL_ATTACK_ALT : ENEMY_STATE_NOVEL_ATTACK
    pool.state[index] = state
    pool.stateTimer[index] = p.attackMs
    if (!p.lockDirAtTelegraphStart) {
      // 예고가 끝나는 이 1프레임에 방향을 확정하고, 공격 중에는 다시 추적하지 않는다.
      pool.runDirX[index] = nx || 1
      pool.runDirZ[index] = nz
    }
  }

  if (isNovelAttackState(state) && pool.stateTimer[index] <= 0) {
    state = state === ENEMY_STATE_NOVEL_ATTACK_ALT ? ENEMY_STATE_NOVEL_RECOVER_ALT : ENEMY_STATE_NOVEL_RECOVER
    pool.state[index] = state
    pool.stateTimer[index] = p.recoveryMs
    pool.attackCooldown[index] = p.cooldownMs
  }

  out.state = state
  const sign = polarity(state)
  const dirX = pool.runDirX[index]
  const dirZ = pool.runDirZ[index]
  const facing = Math.atan2(dirX, dirZ)
  const bearing = Math.atan2(nx, nz)
  const alt = sign < 0

  // ── 단계별 이동/피해 ──────────────────────────────────────────────────────
  if (state === ENEMY_STATE_NOVEL_APPROACH) {
    const mul = p.approachMul
    if (p.approach === 'sideOn' || p.approach === 'shoulderLed') {
      // 몸을 옆으로/어깨를 앞세워 세운 접근. 플레이어 방향을 각도만큼 틀어 들어가므로 정면 직진이 아니다.
      const side = ((index + pool.generation[index]) & 1) === 0 ? 1 : -1
      const angle = side * p.approachAngleDeg * DEG
      out.velocityX = rotatedX(nx, nz, angle) * speed * mul
      out.velocityZ = rotatedZ(nx, nz, angle) * speed * mul
      out.moving = true
    } else if (p.approach === 'axisAlign') {
      // 복도 축(Z)을 먼저 맞추고 나서 X를 좁힌다. 정면 추격선이 아니라 축 정렬 접근이다.
      const dz = a.playerZ - a.posZ
      const dx = a.playerX - a.posX
      if (Math.abs(dz) > 0.6) {
        out.velocityZ = Math.sign(dz) * speed * mul
        out.velocityX = dx * 0.25 * speed * mul
      } else {
        out.velocityX = Math.sign(dx || 1) * speed * mul
        out.velocityZ = dz * 0.5 * speed * mul
      }
      out.moving = true
    } else if (p.approach === 'orbit') {
      // 일정한 곡선 걸음으로 옆자리를 잡는다. radius보다 멀면 안쪽으로, 가까우면 바깥으로 섞는다.
      //
      // ⚠ 여기를 blendNorm으로 정규화하지 않은 것은 의도다(2026-10-25, Balance_QA_Mini 확인).
      // (접선 1 : 안쪽 inward) 합벡터라 |inward| = 1인 먼 거리에서 실효 속도가 √2배로 부푼다 —
      // 공격 쪽(blendNorm)과 달리 이쪽은 그 부푼 값을 전제로 조율돼 있다. 정규화만 넣으면
      // E42의 먼 거리 접근이 0.738 → 0.522 u/s로 29% 느려지고 첫 명중이 11.1초 → 14.5초가 된다
      // (실제 스폰은 맵 외곽이라 시작거리 6u가 현실값이다). 그건 E39가 "초반 사실상 무해"로
      // 판정돼 58°→40°로 고쳐진 12.3초보다 더 나쁘다. 바꾸려면 approachMul을 0.9 → 1.27로
      // 함께 올려 먼 거리 속도를 보존해라 — 둘 중 하나만 손대면 E42가 조용히 무해해진다.
      const side = ((index + pool.generation[index]) & 1) === 0 ? 1 : -1
      const radial = distance - p.orbitRadius
      const tangentX = -nz * side
      const tangentZ = nx * side
      const inward = Math.max(-1, Math.min(1, radial))
      out.velocityX = (tangentX + nx * inward) * speed * mul
      out.velocityZ = (tangentZ + nz * inward) * speed * mul
      out.moving = true
    } else {
      out.velocityX = nx * speed * mul
      out.velocityZ = nz * speed * mul
      out.moving = true
    }
  } else if (isNovelTelegraphState(state)) {
    // 예고 중에는 어떤 경로로도 damage를 쓰지 않는다(불변식 2).
    if (p.telegraphMove === 'drift') {
      out.velocityX = nx * speed * p.telegraphDriftMul
      out.velocityZ = nz * speed * p.telegraphDriftMul
      out.moving = true
    } else if (p.telegraphMove === 'back') {
      out.velocityX = -nx * p.telegraphBackSpeed
      out.velocityZ = -nz * p.telegraphBackSpeed
      out.moving = true
    }
    // 'hold'/'plant'는 제자리. 예고 포즈가 읽히도록 yaw를 고정한다.
    out.hasYaw = true
    if (p.leanToPlayerMotion && (a.playerMoveX !== 0 || a.playerMoveZ !== 0)) {
      // 플레이어의 직전 이동 방향으로 머리를 먼저 기울인다 = "읽었다"는 신호.
      out.yaw = Math.atan2(a.playerMoveX, a.playerMoveZ)
    } else {
      out.yaw = bearing + p.telegraphYawOffsetDeg * DEG * sign
    }
  } else if (isNovelAttackState(state)) {
    const t = p.attackMs > 0 ? 1 - Math.max(0, pool.stateTimer[index]) / p.attackMs : 1
    const reach = alt && p.reachAlt > 0 ? p.reachAlt : p.reach
    let hit = false

    if (p.attack === 'commitDash') {
      const angle = sign * p.attackAngleDeg * DEG
      out.velocityX = rotatedX(dirX, dirZ, angle) * p.attackSpeed
      out.velocityZ = rotatedZ(dirX, dirZ, angle) * p.attackSpeed
      out.moving = true
      hit = bodyContactHit(distance, contactDist, reach)
    } else if (p.attack === 'pivotPass') {
      // 회전 이동. 몸이 플레이어를 통과해 지나간다 — 멈춰 서서 미는 게 아니다(충격파·밀어내기 없음).
      const pivotSpeed = blendNorm(p.attackSpeed, p.inwardMul)
      out.velocityX = (-dirZ * sign + dirX * p.inwardMul) * pivotSpeed
      out.velocityZ = (dirX * sign + dirZ * p.inwardMul) * pivotSpeed
      out.moving = true
      hit = bodyContactHit(distance, contactDist, reach)
    } else if (p.attack === 'reactSidestepPush') {
      if (t < p.damageFrom) {
        // 전반: 플레이어가 움직인 방향의 반대편으로 옆 이동. 이 구간은 피해가 없다.
        const mx = a.playerMoveX
        const mz = a.playerMoveZ
        const hasMove = mx !== 0 || mz !== 0
        const sx = hasMove ? -mx : -dirZ
        const sz = hasMove ? -mz : dirX
        out.velocityX = sx * p.sidestepSpeed
        out.velocityZ = sz * p.sidestepSpeed
      } else {
        out.velocityX = dirX * p.attackSpeed
        out.velocityZ = dirZ * p.attackSpeed
        hit = bodyContactHit(distance, contactDist, reach)
      }
      out.moving = true
    } else if (p.attack === 'plantedSweep') {
      // 발이 고정된 제자리 스윕. 이동하지 않으므로 돌진이 아니다.
      hit = sweepHit(distance, contactDist, reach, bearing, facing, sign,
        p.sweepFromDeg, p.sweepToDeg, p.sweepTolDeg, t)
    } else if (p.attack === 'reach') {
      out.velocityX = dirX * p.attackSpeed
      out.velocityZ = dirZ * p.attackSpeed
      out.moving = true
      const cone = (alt && p.coneAltDeg > 0 ? p.coneAltDeg : p.coneDeg) * DEG * 0.5
      hit = coneHit(distance, contactDist, reach, bearing, facing, cone)
    } else if (p.attack === 'arcStep') {
      const arcSpeed = blendNorm(p.attackSpeed, p.inwardMul)
      out.velocityX = (-dirZ * sign + dirX * p.inwardMul) * arcSpeed
      out.velocityZ = (dirX * sign + dirZ * p.inwardMul) * arcSpeed
      out.moving = true
      hit = bodyContactHit(distance, contactDist, reach)
    } else if (p.attack === 'crossSweep') {
      const tol = alt && p.sweepTolAltDeg > 0 ? p.sweepTolAltDeg : p.sweepTolDeg
      hit = sweepHit(distance, contactDist, reach, bearing, facing, sign,
        p.sweepFromDeg, p.sweepToDeg, tol, t)
    } else if (p.attack === 'sideRetreatReturn') {
      if (t < p.damageFrom) {
        // 옆으로 물러나는 전반. 후퇴 중에는 공격하지 않는다(기획 §11 공격 패턴).
        out.velocityX = (-dirZ * sign - dirX * p.awayMul) * p.retreatSpeed
        out.velocityZ = (dirX * sign - dirZ * p.awayMul) * p.retreatSpeed
      } else {
        const angle = -sign * p.returnAngleDeg * DEG
        out.velocityX = rotatedX(dirX, dirZ, angle) * p.attackSpeed
        out.velocityZ = rotatedZ(dirX, dirZ, angle) * p.attackSpeed
        hit = bodyContactHit(distance, contactDist, reach)
      }
      out.moving = true
    } else if (p.attack === 'weightShift') {
      if (t < p.damageFrom) {
        // 기울인 쪽(sign)의 반대편(-sign)에 발을 놓는 구간. 발이 놓이기 전에는 판정이 없다.
        out.velocityX = -(-dirZ * sign) * p.stepSpeed
        out.velocityZ = -(dirX * sign) * p.stepSpeed
      } else {
        // 새 발을 축으로 상체가 넘어오는 구간 — 접선 + 안쪽.
        // 접선 부호는 디딤(위 분기, -sign쪽)의 반대인 +sign쪽이어야 한다. 2026-10-25까지는 둘이 같은
        // 부호여서 몸이 한쪽으로만 계속 벌어졌고(기획 "반대 방향으로 상체를 넘겨" 위반) 정지 플레이어에게
        // 영구히 닿지 않았다.
        const shiftSpeed = blendNorm(p.attackSpeed, p.inwardMul)
        out.velocityX = (-dirZ * sign + dirX * p.inwardMul) * shiftSpeed
        out.velocityZ = (dirX * sign + dirZ * p.inwardMul) * shiftSpeed
        hit = bodyContactHit(distance, contactDist, reach)
      }
      out.moving = true
    }

    if (hit && a.hitReady && t >= p.damageFrom) out.damage = a.damage
    out.hasYaw = true
    out.yaw = facing
  } else {
    // 회복: 중심을 되찾는다. 이동하지 않고 공격 판정도 없다.
    out.hasYaw = true
    out.yaw = facing
  }

  return out
}

// 신규 투사체 좀비 15종(E46~E60, typeCode 49~63)의 수치·행동 런타임 정본. Level_Mini 소유.
// 비주얼 정본: lib/projectileZombieVisuals.js(상태 코드 14~17, 예고 길이 telegraphMs).
// 설계 원안: Developer/agent_room/zombie_15_design_20261031.md (v2.1). 2026-11-04 Terry 지시
// "투사체 15종도 게임에 넣어"에 맞춰 원안을 단순화했다 — 15개의 개별 상태기계가 아니라
// 이동 모드 4개 + 발사 패턴 8개를 파라미터로 고르는 공용 경로 하나다.
//
// 순수 함수 모듈이다. React/Three/Rapier/저장소/오디오에 의존하지 않고 프레임 경로에서 객체를 만들지 않는다.
//
// 불변식(테스트가 못박는다):
//  1. 예고(TELEGRAPH)는 항상 visuals의 telegraphMs 길이이고, 방향·착탄점은 발사 최소 500ms 전에 확정된다.
//     예외 없이 확정 뒤에는 바뀌지 않는다(종이비행기 탄의 약유도는 탄의 성질이지 조준이 아니다).
//  2. 예고 중에는 이동하지 않는다(서 있는 과녁). 예고·발사·회복 중 접촉 피해는 매복 숨김 상태에서만 꺼진다.
//  3. 예고가 시작되면 반드시 발사한다(커밋). 사수가 예고 중 죽으면 발사하지 않는다(이벤트가 슬롯 세대를 확인).
//  4. 예고는 사수가 화면 안(각 변 0.5u 안쪽)일 때만 시작한다.
//  5. 플레이어를 맞힐 수 있는 신규 탄 수가 스테이지 상한(평시 14 / 보스 구간 6) 이상이면 예고를 시작하지 않는다.
//     보스 구간에 E04처럼 완전히 끄지 않는 이유: 스1·2·3·5의 보스 구간(150~210초)이 60초라 그 구간에
//     처음 나온 종이 한 발도 못 쏘고 "그냥 걷는 좀비"가 되기 때문이다. 대신 동시 탄 수를 크게 줄인다.
//
// 거리 단위는 월드 유닛이다. 1 블록 = 4 유닛. 플레이어 이동속도 3.0u/s.
import {
  PROJECTILE_ZOMBIE_FIRST_TYPE_CODE,
  PROJECTILE_ZOMBIE_LAST_TYPE_CODE,
  PROJECTILE_ZOMBIE_STATE,
  PROJECTILE_ZOMBIE_TYPES,
  PROJECTILE_ZOMBIE_VISUALS,
} from './projectileZombieVisuals.js'
import { SHOT_KIND, SHOT_MOTION, createShotSpec } from './projectileZombieShotPool.js'

export const PZ_STATE = PROJECTILE_ZOMBIE_STATE
export const PZ_TYPE_MIN = PROJECTILE_ZOMBIE_FIRST_TYPE_CODE
export const PZ_TYPE_MAX = PROJECTILE_ZOMBIE_LAST_TYPE_CODE
export const PZ_MIN_LOCK_TO_FIRE_MS = 500
export const PZ_SCREEN_INSET = 0.5
export const PZ_SHOT_CAP = 14
export const PZ_SHOT_CAP_BOSS = 6

const DEG = Math.PI / 180

// ── 수치 ─────────────────────────────────────────────────────────────────────
// hp/xp는 burstEvents.js에서 이 종이 자리를 넘겨받은 host 타입과 같다(총 HP·XP 불변 원칙, E34~E45와 같다).
//   hp 8 ← E01 · hp 10 ← E03 · hp 16 ← E07 · hp 32 ← E04 · hp 70 ← E02/E05
// damage는 몸 접촉 피해다(투사체 피해는 아래 행동표 shot.damage). E04(접촉 없음)와 달리 이 15종은
// 몸으로도 닿지만, 대부분 거리를 두는 종이라 실제 접촉은 드물다.
// Enemy.jsx(ENEMY_STATS)와 enemySimulation.js(ENEMY_RUNTIME_*)가 둘 다 이 표를 import한다 — 복사본이 없다.
export const PROJECTILE_ZOMBIE_STATS = Object.freeze({
  E46: Object.freeze({ hp: 8,  speed: 0.60, damage: 6,  scale: 0.95, xp: 4,  contactDist: 0.26, projectileZombie: true }),
  E47: Object.freeze({ hp: 16, speed: 0.62, damage: 6,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
  E48: Object.freeze({ hp: 16, speed: 0.58, damage: 7,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
  E49: Object.freeze({ hp: 70, speed: 0.46, damage: 10, scale: 1.15, xp: 15, contactDist: 0.32, projectileZombie: true }),
  E50: Object.freeze({ hp: 16, speed: 0.66, damage: 8,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
  E51: Object.freeze({ hp: 8,  speed: 0.56, damage: 6,  scale: 0.95, xp: 4,  contactDist: 0.26, projectileZombie: true }),
  E52: Object.freeze({ hp: 32, speed: 0.60, damage: 8,  scale: 1.00, xp: 10, contactDist: 0.26, projectileZombie: true }),
  E53: Object.freeze({ hp: 10, speed: 0.66, damage: 5,  scale: 0.92, xp: 5,  contactDist: 0.24, projectileZombie: true }),
  E54: Object.freeze({ hp: 32, speed: 0.50, damage: 6,  scale: 1.05, xp: 10, contactDist: 0.28, projectileZombie: true }),
  E55: Object.freeze({ hp: 70, speed: 0.50, damage: 8,  scale: 1.10, xp: 15, contactDist: 0.30, projectileZombie: true }),
  E56: Object.freeze({ hp: 70, speed: 0.48, damage: 6,  scale: 1.10, xp: 15, contactDist: 0.30, projectileZombie: true }),
  E57: Object.freeze({ hp: 70, speed: 0.42, damage: 10, scale: 1.15, xp: 15, contactDist: 0.32, projectileZombie: true }),
  E58: Object.freeze({ hp: 8,  speed: 0.70, damage: 5,  scale: 0.90, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E59: Object.freeze({ hp: 70, speed: 0.44, damage: 10, scale: 1.20, xp: 15, contactDist: 0.34, projectileZombie: true }),
  E60: Object.freeze({ hp: 16, speed: 0.60, damage: 8,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
})

// ── 행동표 ───────────────────────────────────────────────────────────────────
// move:   kite(거리 유지·옆걸음) | dash(붙었다 빠지기) | ambush(바닥에 숨어 기어오다 튀어나옴) | support(뒤에 머묾)
// aim:    lockStart(예고 시작에 확정) | lockLate(예고 끝 lockLeftMs 전까지 추적 후 확정)
// target: dir(방향만) | player(예고 시작 시 플레이어 위치) | ahead(사수 앞 aheadU 지점)
// volley: single | spread(count, spreadDeg) | salvo(count, intervalMs) | radial(count) | heal
// telegraphDecal: none | line(lengthU) | ring(radiusU, 착탄점) | self(radiusU, 사수 발밑)
const base = Object.freeze({
  move: 'kite', prefDist: 4.5, minDist: 2.5, fireRange: 6.0, minFireDist: 1.5,
  aim: 'lockStart', lockLeftMs: PZ_MIN_LOCK_TO_FIRE_MS, target: 'dir', aheadU: 0,
  volley: 'single', count: 1, spreadDeg: 0, intervalMs: 0,
  telegraphDecal: 'none', decalSize: 0,
  firstDelayMs: 1200, cooldownMs: 3000, recoverMs: 400, recoverMove: 'hold',
  ambushRange: 0, creepMul: 0.55,
  heal: null,
})

function shot(overrides) {
  return Object.freeze({ ...createShotSpec(), ...overrides })
}

// 2026-11-04 Balance_QA 튜닝(런타임 프로브 600판/스테이지, b2c8ec88 대비 사망률 +3pp 이내 기준):
//   스4가 29.2% → 37.3%(+8.1pp)로 밴드를 넘었다. 탄 피해를 0으로 둔 대조 실행이 28.3%라 원인은 탄 피해다.
//   E47 탄 6→4 · E50 탄 8→4, 쿨 3400→5200 · E57 탄 6→4 · E58 탄 5→3, 쿨 2400→3200 · E59 탄 10→6.
//   스5는 감속을 프로브에 반영하면 17.8%(+5.5pp)라 E53 쿨 3000→4800, E60 탄 6→4.
//   예고 길이·사거리·HP·XP·스폰 시각은 그대로다.
export const PROJECTILE_ZOMBIE_BEHAVIORS = Object.freeze({
  // E46 지우개튕김: 지우개를 던지면 화면 가장자리·벽에서 최대 2번 튕겨 되돌아온다(룬트레이서식). 조준선 예고.
  49: Object.freeze({ ...base, id: 'E46', name: '지우개튕김',
    prefDist: 4.5, minDist: 2.5, fireRange: 6.0, telegraphDecal: 'line', decalSize: 3.0,
    cooldownMs: 2800,
    shot: shot({ kind: SHOT_KIND.ERASER, motion: SHOT_MOTION.BOUNCE, bounces: 2, speed: 2.6, damage: 7, lifeMs: 3000, hitRadius: 0.11 }) }),
  // E47 종이비행기: 느린 종이비행기가 초당 45°까지 플레이어 쪽으로 휘어 온다(누적 90°에서 직진 고정).
  //   직각으로 꺾으면 떨어진다. 위험도가 가장 낮은 사수.
  50: Object.freeze({ ...base, id: 'E47', name: '종이비행기',
    prefDist: 4.5, minDist: 3.0, fireRange: 6.0, telegraphDecal: 'line', decalSize: 2.0,
    cooldownMs: 3000,
    shot: shot({ kind: SHOT_KIND.PAPER_PLANE, motion: SHOT_MOTION.HOMING, speed: 1.6, damage: 4, lifeMs: 4200, hitRadius: 0.12,
      p0: 45 * DEG, p1: 90 * DEG }) }),
  // E48 부메랑자: 자를 던지면 4u 나갔다가 같은 선으로 되돌아온다. 던진 뒤 1.6초 서서 기다린다(취약 구간).
  //   v=3.6, 감속 1.62u/s² → 정지 거리 4.0u(1블록), 2.2초 뒤 귀환 시작. 그래서 4.0u 안에서만 던진다.
  51: Object.freeze({ ...base, id: 'E48', name: '부메랑자',
    prefDist: 3.5, minDist: 2.0, fireRange: 4.0, telegraphDecal: 'line', decalSize: 4.0,
    cooldownMs: 3600, recoverMs: 1600,
    shot: shot({ kind: SHOT_KIND.RULER, motion: SHOT_MOTION.RETURN, speed: 3.6, damage: 9, lifeMs: 4400, hitRadius: 0.12,
      p0: 1.62 }) }),
  // E49 양동이청소: 예고 시작 때의 플레이어 자리에 물을 포물선으로 던진다. 착지점 원이 예고부터 보이고
  //   (확정→착지 1.6초), 착지하면 반경 0.9u 물웅덩이가 4초 남아 안에서 이동속도 −35%. 피해 0.
  52: Object.freeze({ ...base, id: 'E49', name: '양동이청소',
    prefDist: 4.0, minDist: 2.0, fireRange: 6.0, target: 'player', telegraphDecal: 'ring', decalSize: 0.9,
    cooldownMs: 5000, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.WATER_BLOB, motion: SHOT_MOTION.LOB, speed: 1, damage: 0, lifeMs: 5000, hitRadius: 0,
      p2: 1100, p3: 0.9, endZoneKind: SHOT_KIND.ZONE_WATER, endZoneRadius: 0.9, endZoneMs: 4000, endZoneSlow: 0.65 }) }),
  // E50 배구스파이크: 예고 시작 때 플레이어 자리로 스파이크. 착지점 원(0.8u) 확정 후 1.4초 뒤 착지 피해 4,
  //   같은 방향으로 1.4u 한 번 더 튄다(두 번째 착지점 원은 첫 착지 순간부터 0.54초 보인다).
  53: Object.freeze({ ...base, id: 'E50', name: '배구스파이크',
    prefDist: 4.5, minDist: 2.5, fireRange: 6.5, target: 'player', telegraphDecal: 'ring', decalSize: 0.8,
    cooldownMs: 5200,
    shot: shot({ kind: SHOT_KIND.VOLLEYBALL, motion: SHOT_MOTION.LOB, speed: 1, damage: 4, lifeMs: 4000, hitRadius: 0,
      p2: 900, p3: 0.8, p4: 1.4, bounces: 1 }) }),
  // E51 합창지휘: 지휘봉을 들었다 내리면 음표 3개가 0.3초 간격으로 같은 선을 따라 물결치며(진폭 0.5u) 날아온다.
  54: Object.freeze({ ...base, id: 'E51', name: '합창지휘',
    prefDist: 5.0, minDist: 3.0, fireRange: 6.5, volley: 'salvo', count: 3, intervalMs: 300,
    telegraphDecal: 'line', decalSize: 2.5, cooldownMs: 3200,
    shot: shot({ kind: SHOT_KIND.MUSIC_NOTE, motion: SHOT_MOTION.SINE, speed: 1.8, damage: 5, lifeMs: 3900, hitRadius: 0.11,
      p0: 0.5, p1: 2 * Math.PI * 1.2 }) }),
  // E52 플라스크분열: 플라스크가 1.36초(약 3u) 날아간 뒤 ±25° 세 갈래로 갈라진다. 분열 지점 표식이 예고부터 보인다.
  //   아주 가까이 붙으면 본체만, 아주 멀면 파편이 닿지 않는다.
  55: Object.freeze({ ...base, id: 'E52', name: '플라스크분열',
    prefDist: 4.5, minDist: 3.0, fireRange: 5.5, target: 'ahead', aheadU: 3.0, telegraphDecal: 'ring', decalSize: 0.35,
    cooldownMs: 3200,
    shot: shot({ kind: SHOT_KIND.FLASK, motion: SHOT_MOTION.SPLIT, speed: 2.2, damage: 5, lifeMs: 3000, hitRadius: 0.12,
      p0: 1360, p1: 3, p2: 25 * DEG, p3: 2.6, p4: 1000 }) }),
  // E53 물감뿌림: 빠르게 2.8u까지 붙어 서서 부채꼴(±15°) 물감 3발(사거리 3.0u) → 맞으면 1.2초 −20%, 탄이 끝난 자리에
  //   작은 물감 자국(0.45u, 2.5초, −25%)이 남는다 → 뒤로 1초 빠진다.
  56: Object.freeze({ ...base, id: 'E53', name: '물감뿌림',
    move: 'dash', prefDist: 2.8, minDist: 1.2, fireRange: 3.0, minFireDist: 1.0,
    volley: 'spread', count: 3, spreadDeg: 15, telegraphDecal: 'line', decalSize: 2.8,
    cooldownMs: 4800, recoverMs: 1000, recoverMove: 'retreat',
    shot: shot({ kind: SHOT_KIND.PAINT, motion: SHOT_MOTION.STRAIGHT, speed: 3.2, damage: 4, lifeMs: 950, hitRadius: 0.1,
      hitSlowMul: 0.8, hitSlowMs: 1200, endZoneKind: SHOT_KIND.ZONE_PAINT, endZoneRadius: 0.45, endZoneMs: 2500, endZoneSlow: 0.75 }) }),
  // E54 확성기방송: 0.8초 예고 뒤 ±30° 부채꼴로 느린 음파 5발(15° 간격, 사거리 5.8u). 3u 거리에서 탄 사이 틈이 0.8u라
  //   사이로 빠지거나 부채꼴 밖으로 나가면 된다.
  57: Object.freeze({ ...base, id: 'E54', name: '확성기방송',
    prefDist: 4.5, minDist: 2.0, fireRange: 5.5, volley: 'spread', count: 5, spreadDeg: 30,
    telegraphDecal: 'line', decalSize: 3.5, cooldownMs: 3800, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.SOUND_WAVE, motion: SHOT_MOTION.STRAIGHT, speed: 1.6, damage: 4, lifeMs: 3600, hitRadius: 0.14 }) }),
  // E55 강속구 야구부: 1.1초 와인드업. 앞 0.6초는 조준선이 플레이어를 따라가고, 남은 0.5초에 확정·깜빡인 뒤
  //   6u/s 강속구(피해 14). 최소 3.5u 밖에서만 던진다 → 확정부터 맞기까지 최소 0.5 + 0.58 = 1.08초.
  58: Object.freeze({ ...base, id: 'E55', name: '강속구 야구부',
    prefDist: 5.0, minDist: 3.5, fireRange: 6.5, minFireDist: 3.5, aim: 'lockLate', lockLeftMs: 500,
    telegraphDecal: 'line', decalSize: 6.0, cooldownMs: 4000, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.BASEBALL, motion: SHOT_MOTION.STRAIGHT, speed: 6.0, damage: 14, lifeMs: 1500, hitRadius: 0.08 }) }),
  // E56 보건실: 공격하지 않는 지원형. 무리 뒤(5u)에 머물다 주변(2.5u)에 다친 아군이 있으면 0.5초 예고 뒤
  //   연두 회복 파동. 아군마다 최대 체력의 20%(최대 6) 회복, 한 기가 평생 줄 수 있는 회복 총량 36.
  //   보스·마틸다·거대(E06)·크루·코인·다른 보건실은 회복하지 않는다.
  59: Object.freeze({ ...base, id: 'E56', name: '보건실',
    move: 'support', prefDist: 5.0, minDist: 3.5, fireRange: 9.0, minFireDist: 0, volley: 'heal',
    telegraphDecal: 'self', decalSize: 2.5, cooldownMs: 4500, recoverMs: 500,
    heal: Object.freeze({ radius: 2.5, ratio: 0.2, maxPerTarget: 6, lifeBudget: 36 }),
    shot: null }),
  // E57 출석부 생활지도: 조준선을 긋고 출석 카드 3장을 0.18초 간격으로 같은 선에 날린다. 옆으로 한 걸음이면 전부 빈다.
  60: Object.freeze({ ...base, id: 'E57', name: '출석부 생활지도',
    prefDist: 4.0, minDist: 2.0, fireRange: 5.5, volley: 'salvo', count: 3, intervalMs: 180,
    // cooldown 3200 → 4200 / damage 7 → 6 (2026-11-04 런타임 프로브): hp 70(스3 실효 101)이라 오래 살아남아
    //   스3 사망이 8/24 → 12/24로 늘었다. 카드 3장 일제사격은 그대로 두고 빈도와 1장 피해만 줄인다.
    telegraphDecal: 'line', decalSize: 5.0, cooldownMs: 4200, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.ATTENDANCE_CARD, motion: SHOT_MOTION.STRAIGHT, speed: 3.0, damage: 4, lifeMs: 2000, hitRadius: 0.10 }) }),
  // E58 줄넘기 매복: 바닥에 웅크려(몸이 반쯤 가라앉음) 천천히 기어 온다. 2.8u 안에 들어오면 일어서며 0.5초 예고 →
  //   줄이 7u/s로 3u까지 뻗었다 되감긴다(피해 3 + 0.8초 −30%). 공격 뒤 다시 숨는다.
  61: Object.freeze({ ...base, id: 'E58', name: '줄넘기 매복',
    move: 'ambush', ambushRange: 2.8, fireRange: 2.8, minFireDist: 0.6, telegraphDecal: 'line', decalSize: 3.0,
    cooldownMs: 3200, recoverMs: 900,
    shot: shot({ kind: SHOT_KIND.JUMP_ROPE, motion: SHOT_MOTION.RETURN, speed: 7.0, damage: 3, lifeMs: 1700, hitRadius: 0.14,
      p0: 8.17, hitSlowMul: 0.7, hitSlowMs: 800 }) }),
  // E59 우유당번: 예고 시작 때의 플레이어 자리까지 우유갑을 굴려 멈추고, 0.7초 깜빡인 뒤 반경 0.7u로 터진다(피해 6).
  //   멈출 자리의 원이 예고부터 보인다(4u 거리면 확정→폭발 0.5 + 2.0 + 0.7 = 3.2초). 감속은 발사 때 거리로 정한다.
  62: Object.freeze({ ...base, id: 'E59', name: '우유당번',
    prefDist: 4.0, minDist: 2.0, fireRange: 5.5, target: 'player', telegraphDecal: 'ring', decalSize: 0.7,
    cooldownMs: 4200, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.MILK_CARTON, motion: SHOT_MOTION.FUSE, speed: 4.0, damage: 6, lifeMs: 4500, hitRadius: 0.12,
      p0: 4.0, p1: 700, p2: 0.7 }) }),
  // E60 배수구잠복: 바닥에 숨어 기어 오다 2.6u 안에서 솟아오르며(발밑 원 0.5초) 6방향 물줄기(한 줄기는 플레이어 쪽).
  //   2.6u 거리에서 물줄기 사이 틈이 2.7u라 옆으로 1.4u만 비키면 사이에 선다. 쏜 뒤 다시 숨는다.
  63: Object.freeze({ ...base, id: 'E60', name: '배수구잠복',
    move: 'ambush', ambushRange: 2.6, fireRange: 2.6, minFireDist: 0, volley: 'radial', count: 6,
    telegraphDecal: 'self', decalSize: 0.6, cooldownMs: 3200, recoverMs: 800,
    shot: shot({ kind: SHOT_KIND.DRAIN_WATER, motion: SHOT_MOTION.STRAIGHT, speed: 2.4, damage: 4, lifeMs: 1600, hitRadius: 0.11 }) }),
})

export function isProjectileZombieType(typeCode) {
  return typeCode >= PZ_TYPE_MIN && typeCode <= PZ_TYPE_MAX && PROJECTILE_ZOMBIE_BEHAVIORS[typeCode] !== undefined
}

export function projectileZombieBehavior(typeCode) {
  return PROJECTILE_ZOMBIE_BEHAVIORS[typeCode] ?? null
}

export function projectileZombieTelegraphMs(typeCode) {
  const id = PROJECTILE_ZOMBIE_TYPES[typeCode - PZ_TYPE_MIN]
  return PROJECTILE_ZOMBIE_VISUALS[id]?.telegraphMs ?? 500
}

/** 한 번의 공격이 화면에 올리는 "맞을 수 있는" 탄 수. 상한 판정에 쓴다. */
export function projectileZombieShotCost(typeCode) {
  const p = PROJECTILE_ZOMBIE_BEHAVIORS[typeCode]
  if (!p || !p.shot) return 0
  if (p.shot.motion === SHOT_MOTION.SPLIT) return Math.round(p.shot.p1)
  return p.volley === 'single' ? 1 : p.count
}

export function isProjectileZombieHidden(pool, index) {
  const p = PROJECTILE_ZOMBIE_BEHAVIORS[pool.type[index]]
  return Boolean(p && p.move === 'ambush' && pool.state[index] === PZ_STATE.APPROACH)
}

// 매복형 숨김 깊이. 몸 높이(대략 visualScale × 0.333 × 1.3)의 약 60%를 바닥 아래로 내린다 — 머리만 보인다.
export function ambushSinkDepth(visualScale) {
  return (Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 1) * 0.333 * 0.8
}

// ── 회복(E56) ────────────────────────────────────────────────────────────────
// 회복하지 않는 타입: 0, E06(6), 크루(7/8/13/14), 보스(9~12, 32~36), 코인(16), 확장(17~31), 보건실 자신(59).
export function isHealableTypeCode(typeCode) {
  if (typeCode === 59) return false
  return typeCode === 1 || typeCode === 2 || typeCode === 3 || typeCode === 4 || typeCode === 5 || typeCode === 15
    || (typeCode >= 37 && typeCode <= 63)
}

const healBudget = new Float32Array(256)
const healGeneration = new Uint16Array(256)

function remainingHealBudget(pool, index, lifeBudget) {
  const gen = pool.generation[index]
  if (healGeneration[index] !== gen) {
    healGeneration[index] = gen
    healBudget[index] = lifeBudget
  }
  return healBudget[index]
}

/** 회복할 대상이 있는지(예고 진입 조건). */
export function hasDamagedAllyNear(pool, index, radius) {
  const x = pool.posX[index]
  const z = pool.posZ[index]
  const r2 = radius * radius
  for (let i = 0; i <= pool.highestActive; i += 1) {
    if (i === index || !pool.active[i] || !isHealableTypeCode(pool.type[i])) continue
    if (!(pool.hp[i] < pool.maxHp[i])) continue
    const dx = pool.posX[i] - x
    const dz = pool.posZ[i] - z
    if (dx * dx + dz * dz <= r2) return true
  }
  return false
}

/** 회복 파동 1회. 실제로 회복한 총량을 돌려준다. */
export function applyProjectileZombieHeal(pool, index, heal) {
  if (!heal) return 0
  let budget = remainingHealBudget(pool, index, heal.lifeBudget)
  if (!(budget > 0)) return 0
  const x = pool.posX[index]
  const z = pool.posZ[index]
  const r2 = heal.radius * heal.radius
  let total = 0
  for (let i = 0; i <= pool.highestActive && budget > 0; i += 1) {
    if (i === index || !pool.active[i] || !isHealableTypeCode(pool.type[i])) continue
    const missing = pool.maxHp[i] - pool.hp[i]
    if (!(missing > 0) || !(pool.hp[i] > 0)) continue
    const dx = pool.posX[i] - x
    const dz = pool.posZ[i] - z
    if (dx * dx + dz * dz > r2) continue
    const amount = Math.min(missing, pool.maxHp[i] * heal.ratio, heal.maxPerTarget, budget)
    pool.hp[i] += amount
    budget -= amount
    total += amount
  }
  healBudget[index] = budget
  return total
}

// ── 1프레임 행동 ──────────────────────────────────────────────────────────────
export function createProjectileZombieResult() {
  return { velocityX: 0, velocityZ: 0, moving: false, hasYaw: false, yaw: 0, damage: 0, state: 0, telegraph: 0, fire: 0, cost: 0 }
}

const GOLDEN = 0.6180339887498949
function phaseFraction(index) {
  return ((Math.floor(index) >>> 0) * GOLDEN) % 1
}

function onScreen(a, x, z) {
  const b = a.screenBounds
  if (!b || !Number.isFinite(b.minX) || !Number.isFinite(b.maxX) || !Number.isFinite(b.minZ) || !Number.isFinite(b.maxZ)) return true
  return x >= b.minX + PZ_SCREEN_INSET && x <= b.maxX - PZ_SCREEN_INSET && z >= b.minZ + PZ_SCREEN_INSET && z <= b.maxZ - PZ_SCREEN_INSET
}

function lockAim(pool, index, p, a) {
  // 플레이어와 겹친 0벡터일 때만 기본 방향(+z)을 쓴다. `nx || 1`로 쓰면 nx = 0(정확히 위·아래)일 때
  // (1, nz)라는 45° 사선이 되어 정지 목표를 비껴간다.
  const len = Math.hypot(a.nx, a.nz)
  pool.runDirX[index] = len > 1e-8 ? a.nx / len : 0
  pool.runDirZ[index] = len > 1e-8 ? a.nz / len : 1
  if (p.target === 'player') {
    pool.homeX[index] = a.playerX
    pool.homeZ[index] = a.playerZ
  } else if (p.target === 'ahead') {
    pool.homeX[index] = a.posX + pool.runDirX[index] * p.aheadU
    pool.homeZ[index] = a.posZ + pool.runDirZ[index] * p.aheadU
  } else {
    pool.homeX[index] = a.posX
    pool.homeZ[index] = a.posZ
  }
}

/**
 * @param pool  EnemyEntityPool
 * @param a     { playerX, playerZ, posX, posZ, distance, nx, nz, speed, contactDist, damage, hitReady,
 *                screenBounds, shotBudget }
 *              shotBudget = 이번 프레임에 새로 예약할 수 있는 탄 수(상한 − 비행 중 − 예고 중 예약분).
 * @param out   createProjectileZombieResult()
 */
export function stepProjectileZombieBehavior(pool, index, a, out) {
  out.velocityX = 0
  out.velocityZ = 0
  out.moving = false
  out.hasYaw = false
  out.yaw = 0
  out.damage = 0
  out.telegraph = 0
  out.fire = 0
  out.cost = 0

  const type = pool.type[index]
  const p = PROJECTILE_ZOMBIE_BEHAVIORS[type]
  if (!p) {
    out.state = PZ_STATE.APPROACH
    return out
  }

  let state = pool.state[index]
  if (state < PZ_STATE.APPROACH || state > PZ_STATE.RECOVER) {
    // 슬롯 재사용·재시작 뒤 남은 값이 섞이지 않게 APPROACH에서 다시 시작한다.
    // 첫 공격 시각을 슬롯별로 흩어 같은 종 N기가 같은 프레임에 쏘지 않게 한다(Math.random 미사용).
    state = PZ_STATE.APPROACH
    pool.state[index] = state
    pool.stateTimer[index] = 0
    pool.runDirX[index] = 1
    pool.runDirZ[index] = 0
    pool.attackCooldown[index] = p.firstDelayMs + phaseFraction(index) * p.cooldownMs * 0.5
    // 매복형 숨김 높이의 기준점(스폰 높이)을 기억해 둔다. lastContactY는 이 15종에서 다른 용도가 없다.
    pool.lastContactY[index] = pool.posY[index]
    pool.knockbackY[index] = 0
    // 회복 총량은 스폰마다 새로 채운다(세대만 보면 프로브가 세대를 1로 되돌릴 때 앞 판 값이 남는다).
    if (p.heal) {
      healGeneration[index] = pool.generation[index]
      healBudget[index] = p.heal.lifeBudget
    }
  }

  const { distance, nx, nz, speed } = a
  const telegraphMs = projectileZombieTelegraphMs(type)
  const cost = projectileZombieShotCost(type)

  // ── 상태 전이 ─────────────────────────────────────────────────────────────
  if (state === PZ_STATE.APPROACH && pool.attackCooldown[index] <= 0) {
    const inRange = p.move === 'ambush'
      ? distance <= p.ambushRange
      : distance <= p.fireRange && distance >= p.minFireDist
    const ready = inRange && onScreen(a, a.posX, a.posZ)
      && (cost === 0 || a.shotBudget >= cost)
      && (!p.heal || hasDamagedAllyNear(pool, index, p.heal.radius))
    if (ready) {
      state = PZ_STATE.TELEGRAPH
      pool.state[index] = state
      pool.stateTimer[index] = telegraphMs
      pool.knockbackY[index] = 0 // 이번 공격에서 발사한 탄 수(일제사격 진행도)
      lockAim(pool, index, p, a)
      out.cost = cost
      if (p.aim === 'lockStart') out.telegraph = 1
    }
  } else if (state === PZ_STATE.TELEGRAPH) {
    if (p.aim === 'lockLate' && pool.stateTimer[index] > p.lockLeftMs) {
      // 확정 전 추적 구간. 남은 시간이 lockLeftMs가 되는 프레임에 마지막으로 갱신하고 고정한다.
      lockAim(pool, index, p, a)
      if (pool.stateTimer[index] - a.deltaMs <= p.lockLeftMs) out.telegraph = 1
    }
    if (pool.stateTimer[index] <= 0) {
      state = PZ_STATE.FIRE
      pool.state[index] = state
      const salvoMs = p.volley === 'salvo' ? (p.count - 1) * p.intervalMs : 0
      pool.stateTimer[index] = salvoMs + 120
      pool.knockbackY[index] = 0
    }
  }

  if (state === PZ_STATE.FIRE) {
    const elapsed = (p.volley === 'salvo' ? (p.count - 1) * p.intervalMs : 0) + 120 - pool.stateTimer[index]
    const shots = p.volley === 'salvo' ? p.count : 1
    const fired = pool.knockbackY[index]
    if (fired < shots && elapsed >= fired * p.intervalMs) {
      pool.knockbackY[index] = fired + 1
      if (p.heal) applyProjectileZombieHeal(pool, index, p.heal)
      out.fire = 1
    }
    if (pool.stateTimer[index] <= 0 && pool.knockbackY[index] >= shots) {
      state = PZ_STATE.RECOVER
      pool.state[index] = state
      pool.stateTimer[index] = p.recoverMs
      pool.attackCooldown[index] = p.cooldownMs
    }
  } else if (state === PZ_STATE.RECOVER && pool.stateTimer[index] <= 0) {
    state = PZ_STATE.APPROACH
    pool.state[index] = state
  }

  out.state = state
  const facing = Math.atan2(pool.runDirX[index], pool.runDirZ[index])

  // ── 이동 ──────────────────────────────────────────────────────────────────
  if (state === PZ_STATE.APPROACH) {
    if (p.move === 'ambush') {
      out.velocityX = nx * speed * p.creepMul
      out.velocityZ = nz * speed * p.creepMul
      out.moving = distance > p.ambushRange * 0.6
      if (!out.moving) { out.velocityX = 0; out.velocityZ = 0 }
    } else if (p.move === 'dash') {
      const dash = onScreen(a, a.posX, a.posZ) ? Math.max(speed, 1.6) : speed
      if (distance > p.prefDist) {
        out.velocityX = nx * dash
        out.velocityZ = nz * dash
        out.moving = true
      } else if (distance < p.minDist) {
        out.velocityX = -nx * speed
        out.velocityZ = -nz * speed
        out.moving = true
      }
    } else {
      // kite / support: 멀면 다가가고, 너무 가까우면 물러나고, 그 사이에서는 옆걸음.
      if (distance > p.prefDist) {
        out.velocityX = nx * speed
        out.velocityZ = nz * speed
      } else if (distance < p.minDist) {
        out.velocityX = -nx * speed * 0.85
        out.velocityZ = -nz * speed * 0.85
      } else {
        const side = ((index + pool.generation[index]) & 1) === 0 ? 1 : -1
        out.velocityX = -nz * side * speed * 0.5
        out.velocityZ = nx * side * speed * 0.5
      }
      out.moving = true
    }
  } else if (state === PZ_STATE.RECOVER && p.recoverMove === 'retreat') {
    out.velocityX = -nx * 1.6
    out.velocityZ = -nz * 1.6
    out.moving = true
    out.hasYaw = true
    out.yaw = facing
  } else {
    // 예고·발사·회복(제자리): 확정 방향을 보고 선다.
    out.hasYaw = true
    out.yaw = facing
  }

  // 매복형은 숨어 있는 동안 몸이 바닥 아래로 내려가고 접촉 피해가 없다.
  const hidden = p.move === 'ambush' && state === PZ_STATE.APPROACH
  const baseY = pool.lastContactY[index]
  pool.posY[index] = hidden ? baseY - ambushSinkDepth(pool.visualScale[index]) : baseY
  if (!hidden && a.hitReady && distance <= a.contactDist) out.damage = a.damage

  return out
}

// ── 이벤트 → 탄 생성 ──────────────────────────────────────────────────────────
// 시뮬레이션은 예고 시작(또는 확정)과 발사 순간에 이벤트만 낸다. 여기서 이벤트를 받아 탄/표식을 만든다.
// enemyPool 슬롯이 이미 죽었거나 세대가 다르면 아무것도 만들지 않는다(불변식 3).
const _spec = createShotSpec()

function copySpec(src) {
  for (const key in src) _spec[key] = src[key]
  return _spec
}

export function spawnProjectileZombieTelegraphDecal(shotPool, enemyPool, index, generation) {
  if (!shotPool || !enemyPool || !enemyPool.isIndexGenerationAlive(index, generation)) return false
  const type = enemyPool.type[index]
  const p = PROJECTILE_ZOMBIE_BEHAVIORS[type]
  if (!p || p.telegraphDecal === 'none') return false
  const x = enemyPool.posX[index]
  const z = enemyPool.posZ[index]
  const dirX = enemyPool.runDirX[index]
  const dirZ = enemyPool.runDirZ[index]
  const telegraphMs = projectileZombieTelegraphMs(type)
  // 확정 → 발사까지 남은 시간. lockLate는 lockLeftMs, 나머지는 예고 전체.
  const leadMs = p.aim === 'lockLate' ? p.lockLeftMs : telegraphMs
  if (p.telegraphDecal === 'line') {
    const len = p.decalSize
    return shotPool.spawnDecal(x + dirX * len * 0.5, z + dirZ * len * 0.5, SHOT_KIND.DECAL_AIM_LINE, 0.09, leadMs + 120, len, Math.atan2(dirX, dirZ)) >= 0
  }
  if (p.telegraphDecal === 'self') {
    const kind = p.heal ? SHOT_KIND.DECAL_HEAL : SHOT_KIND.DECAL_MARKER
    return shotPool.spawnDecal(x, z, kind, p.decalSize, leadMs + 200) >= 0
  }
  // ring: 착탄·폭발 예정점. 원은 실제 착지·폭발 순간까지 남긴다.
  const s = p.shot
  let extraMs = 0
  if (s.motion === SHOT_MOTION.LOB) extraMs = s.p2
  else if (s.motion === SHOT_MOTION.SPLIT) extraMs = s.p0
  else if (s.motion === SHOT_MOTION.FUSE) {
    const d = Math.max(1, Math.hypot(enemyPool.homeX[index] - x, enemyPool.homeZ[index] - z))
    extraMs = (2 * d / s.speed) * 1000 + s.p1
  }
  return shotPool.spawnDecal(enemyPool.homeX[index], enemyPool.homeZ[index], SHOT_KIND.DECAL_MARKER, p.decalSize, leadMs + extraMs) >= 0
}

export function spawnProjectileZombieVolley(shotPool, enemyPool, index, generation) {
  if (!shotPool || !enemyPool || !enemyPool.isIndexGenerationAlive(index, generation)) return 0
  const type = enemyPool.type[index]
  const p = PROJECTILE_ZOMBIE_BEHAVIORS[type]
  if (!p) return 0
  const x = enemyPool.posX[index]
  const z = enemyPool.posZ[index]
  if (p.heal) {
    shotPool.spawnDecal(x, z, SHOT_KIND.DECAL_HEAL, p.heal.radius, 450)
    return 0
  }
  const dirX = enemyPool.runDirX[index]
  const dirZ = enemyPool.runDirZ[index]
  const spec = copySpec(p.shot)
  if (spec.motion === SHOT_MOTION.LOB) {
    spec.p0 = enemyPool.homeX[index]
    spec.p1 = enemyPool.homeZ[index]
    return shotPool.spawn(x, z, dirX, dirZ, spec) >= 0 ? 1 : 0
  }
  if (spec.motion === SHOT_MOTION.FUSE) {
    // 예고 시작 때 확정한 지점에서 멈추게 감속을 정한다: a = v² / (2d). 너무 가까우면 1u로 둔다.
    const d = Math.max(1, Math.hypot(enemyPool.homeX[index] - x, enemyPool.homeZ[index] - z))
    spec.p0 = spec.speed * spec.speed / (2 * d)
    return shotPool.spawn(x, z, enemyPool.homeX[index] - x || dirX, enemyPool.homeZ[index] - z || dirZ, spec) >= 0 ? 1 : 0
  }
  let spawned = 0
  if (p.volley === 'spread') {
    const half = p.spreadDeg * DEG
    for (let k = 0; k < p.count; k += 1) {
      const angle = p.count === 1 ? 0 : -half + (2 * half * k) / (p.count - 1)
      const c = Math.cos(angle); const s = Math.sin(angle)
      if (shotPool.spawn(x, z, dirX * c - dirZ * s, dirX * s + dirZ * c, spec) >= 0) spawned += 1
    }
    return spawned
  }
  if (p.volley === 'radial') {
    const start = Math.atan2(dirX, dirZ) // 한 줄기는 확정 방향(플레이어 쪽). 줄기 사이 틈으로 비킨다.
    for (let k = 0; k < p.count; k += 1) {
      const angle = start + (2 * Math.PI * k) / p.count
      if (shotPool.spawn(x, z, Math.sin(angle), Math.cos(angle), spec) >= 0) spawned += 1
    }
    return spawned
  }
  // single / salvo: 확정 방향 그대로.
  return shotPool.spawn(x, z, dirX, dirZ, spec) >= 0 ? 1 : 0
}

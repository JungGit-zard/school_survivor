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
  projectileZombieIndex,
} from './projectileZombieVisuals.js'
import { SHOT_KIND, SHOT_MOTION, createShotSpec } from './projectileZombieShotPool.js'
import { BLOCKY_ZOMBIE_LAST_TYPE_CODE, blockyZombieTelegraphMs, isBlockyZombieTypeCode } from './blockyZombieRoster.js'

export const PZ_STATE = PROJECTILE_ZOMBIE_STATE
export const PZ_TYPE_MIN = PROJECTILE_ZOMBIE_FIRST_TYPE_CODE
// 2026-11-14 블록 좀비 18종(E71~E88 = 76~93, lib/blockyZombieRoster.js)도 이 공용 경로를 탄다. 75(B10)는 행동표에 없어 제외된다.
export const PZ_TYPE_MAX = Math.max(PROJECTILE_ZOMBIE_LAST_TYPE_CODE, BLOCKY_ZOMBIE_LAST_TYPE_CODE)
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
  // 2차 10종(2026-11-07, typeCode 65~74). hp/xp = 버스트 표에서 자리를 넘겨준 host와 같다.
  //   E61 ← E57(70) · E62·E67 ← E05(70) · E63 ← E04(32) · E64·E65 ← E01(8) · E66·E69 ← E07(16) · E68·E70 ← E03(10)
  E61: Object.freeze({ hp: 70, speed: 0.48, damage: 9,  scale: 1.15, xp: 15, contactDist: 0.32, projectileZombie: true }),
  E62: Object.freeze({ hp: 70, speed: 0.52, damage: 8,  scale: 1.10, xp: 15, contactDist: 0.30, projectileZombie: true }),
  E63: Object.freeze({ hp: 32, speed: 0.56, damage: 6,  scale: 1.00, xp: 10, contactDist: 0.26, projectileZombie: true }),
  E64: Object.freeze({ hp: 8,  speed: 0.62, damage: 5,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E65: Object.freeze({ hp: 8,  speed: 0.54, damage: 5,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E66: Object.freeze({ hp: 16, speed: 0.58, damage: 8,  scale: 1.05, xp: 8,  contactDist: 0.28, projectileZombie: true }),
  E67: Object.freeze({ hp: 70, speed: 0.46, damage: 8,  scale: 1.15, xp: 15, contactDist: 0.32, projectileZombie: true }),
  E68: Object.freeze({ hp: 10, speed: 0.56, damage: 6,  scale: 1.00, xp: 5,  contactDist: 0.26, projectileZombie: true }),
  E69: Object.freeze({ hp: 16, speed: 0.58, damage: 6,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
  E70: Object.freeze({ hp: 10, speed: 0.60, damage: 6,  scale: 0.95, xp: 5,  contactDist: 0.24, projectileZombie: true }),
  // 블록 좀비 18종(2026-11-14, typeCode 76~93, Kenney Blocky Characters CC0). hp/xp = 버스트 표에서 자리를 넘겨준 host와 같다.
  //   hp 8 ← E01 · hp 10 ← E03 · hp 16 ← E07 · hp 32 ← E04(E73 해적, 스6) · hp 70 ← E05(E76 오크 하나뿐 — 고체력 종을 더 쌓지 않는다).
  //   빠른 종(E71·E77·E87·E88)은 대신 체력이 낮다.
  E71: Object.freeze({ hp: 8,  speed: 0.68, damage: 6,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E72: Object.freeze({ hp: 16, speed: 0.58, damage: 6,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
  E73: Object.freeze({ hp: 32, speed: 0.54, damage: 7,  scale: 1.05, xp: 10, contactDist: 0.28, projectileZombie: true }),
  E74: Object.freeze({ hp: 8,  speed: 0.58, damage: 5,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E75: Object.freeze({ hp: 16, speed: 0.60, damage: 6,  scale: 1.00, xp: 8,  contactDist: 0.26, projectileZombie: true }),
  E76: Object.freeze({ hp: 70, speed: 0.50, damage: 10, scale: 1.20, xp: 15, contactDist: 0.32, projectileZombie: true }),
  E77: Object.freeze({ hp: 8,  speed: 0.85, damage: 5,  scale: 0.92, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E78: Object.freeze({ hp: 8,  speed: 0.40, damage: 4,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E79: Object.freeze({ hp: 8,  speed: 0.56, damage: 5,  scale: 1.00, xp: 4,  contactDist: 0.26, projectileZombie: true }),
  E80: Object.freeze({ hp: 10, speed: 0.58, damage: 5,  scale: 0.95, xp: 5,  contactDist: 0.24, projectileZombie: true }),
  E81: Object.freeze({ hp: 8,  speed: 0.56, damage: 5,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E82: Object.freeze({ hp: 16, speed: 0.55, damage: 8,  scale: 1.10, xp: 8,  contactDist: 0.30, projectileZombie: true }),
  E83: Object.freeze({ hp: 10, speed: 0.62, damage: 6,  scale: 1.00, xp: 5,  contactDist: 0.26, projectileZombie: true }),
  E84: Object.freeze({ hp: 8,  speed: 0.48, damage: 4,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E85: Object.freeze({ hp: 8,  speed: 0.58, damage: 7,  scale: 1.00, xp: 4,  contactDist: 0.26, projectileZombie: true }),
  E86: Object.freeze({ hp: 8,  speed: 0.46, damage: 4,  scale: 1.00, xp: 4,  contactDist: 0.26, projectileZombie: true }),
  E87: Object.freeze({ hp: 8,  speed: 0.62, damage: 6,  scale: 0.95, xp: 4,  contactDist: 0.24, projectileZombie: true }),
  E88: Object.freeze({ hp: 10, speed: 0.80, damage: 5,  scale: 0.92, xp: 5,  contactDist: 0.24, projectileZombie: true }),
})

// ── 행동표 ───────────────────────────────────────────────────────────────────
// move:   kite(거리 유지·옆걸음) | dash(붙었다 빠지기) | ambush(바닥에 숨어 기어오다 튀어나옴) | support(뒤에 머묾)
// aim:    lockStart(예고 시작에 확정) | lockLate(예고 끝 lockLeftMs 전까지 추적 후 확정)
// target: dir(방향만) | player(예고 시작 시 플레이어 위치) | ahead(사수 앞 aheadU 지점)
// volley: single | spread(count, spreadDeg) | salvo(count, intervalMs) | radial(count) | heal
// telegraphDecal: none | line(lengthU) | ring(radiusU, 착탄점) | self(radiusU, 사수 발밑)
// 2차 10종(2026-11-07)이 더한 것:
//   move:   chase(늘 플레이어 쪽으로 걷는다)
//   volley: charge(몸 돌진, chargeLegs 2면 왕복) | converge(착탄점 둘레 고리에서 가운데로 모이는 탄)
//           | orbit(사수 둘레를 도는 탄) | domino(조준선 위에 차례로 터지는 지뢰) | blink(착탄점으로 순간이동 + 터치 폭발)
//           | split(체력이 반 아래면 둘로 갈라진다) | shield(주변 아군에게 추가 체력 방패)
const base = Object.freeze({
  move: 'kite', prefDist: 4.5, minDist: 2.5, fireRange: 6.0, minFireDist: 1.5,
  aim: 'lockStart', lockLeftMs: PZ_MIN_LOCK_TO_FIRE_MS, target: 'dir', aheadU: 0,
  volley: 'single', count: 1, spreadDeg: 0, intervalMs: 0,
  telegraphDecal: 'none', decalSize: 0,
  firstDelayMs: 1200, cooldownMs: 3000, recoverMs: 400, recoverMove: 'hold',
  ambushRange: 0, creepMul: 0.55,
  heal: null,
  chargeSpeed: 0, chargeMs: 0, chargeLegs: 1, chargeDamage: 0, chargeZone: null,
  ringRadius: 0, orbit: null, domino: null, blink: null, split: null, shield: null,
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

  // ── 2차 10종(2026-11-07). typeCode 64는 E59 미니 예약이라 65부터다. ──────────────────────────────
  // E61 급식판 돌진: 0.8초 웅크린 뒤(조준선 3.8u) 급식판을 앞세워 4.2u/s로 0.9초 일직선 돌진(닿으면 9).
  //   멈춘 자리에 국물이 쏟아져 반경 0.8u 웅덩이가 3초 남는다(안에서 −30%). 돌진 뒤 0.9초 숨을 고른다(취약).
  65: Object.freeze({ ...base, id: 'E61', name: '급식판 돌진',
    prefDist: 3.6, minDist: 2.2, fireRange: 4.2, minFireDist: 1.4,
    volley: 'charge', chargeSpeed: 4.2, chargeMs: 900, chargeLegs: 1, chargeDamage: 9,
    chargeZone: Object.freeze({ kind: SHOT_KIND.ZONE_SOUP, radius: 0.8, ms: 3000, slow: 0.7 }),
    telegraphDecal: 'line', decalSize: 3.8, cooldownMs: 4600, recoverMs: 900, shot: null }),
  // E62 셔틀런: 0.7초 출발 자세 뒤 4.6u/s로 0.65초(3u) 플레이어 쪽으로 달리고, 같은 선으로 곧장 되돌아온다
  //   (몸은 플레이어를 뚫지 못해 부딪히면 그 자리에서 멈췄다가 돌아간다). 선 밖으로 비키면 둘 다 빗나간다.
  //   2.4u 밖에서만 출발한다(balanceqa 2026-11-07): 가까이서 출발하면 앞 다리 초반에 닿은 뒤 접촉 쿨다운이
  //   끝나고 다시 닿아 한 번 돌진에 두 번 맞았다. 2.4u 밖이면 앞 다리 끝에서 한 번 닿고 곧 되돌아간다.
  66: Object.freeze({ ...base, id: 'E62', name: '셔틀런',
    prefDist: 3.0, minDist: 1.8, fireRange: 3.2, minFireDist: 2.4,
    volley: 'charge', chargeSpeed: 4.6, chargeMs: 650, chargeLegs: 2, chargeDamage: 8,
    telegraphDecal: 'line', decalSize: 3.0, cooldownMs: 4200, recoverMs: 700, shot: null }),
  // E63 마이크줄 방송부: 조준선(5u) 뒤 마이크를 줄째 던진다(4.5u/s). 맞으면 피해 3 + 사수 쪽으로 1.4u 끌려간다(0.25초).
  67: Object.freeze({ ...base, id: 'E63', name: '마이크줄',
    prefDist: 4.5, minDist: 2.6, fireRange: 5.0, minFireDist: 2.0,
    telegraphDecal: 'line', decalSize: 5.0, cooldownMs: 4400, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.MIC_CORD, motion: SHOT_MOTION.STRAIGHT, speed: 4.5, damage: 3, lifeMs: 1150, hitRadius: 0.12,
      impulseU: -1.4, impulseMs: 250 }) }),
  // E64 분필가루: 예고 시작 때 플레이어 자리에 칠판지우개 가루를 포물선으로 턴다(착지점 원 1.0u, 확정→착지 1.4초).
  //   착지 피해는 없고 반경 1.0u 가루 구름이 3.5초 남아 안에 있으면 0.7초마다 2. 감속은 없다 — 지나가는 건 괜찮고 머무는 게 위험하다.
  68: Object.freeze({ ...base, id: 'E64', name: '분필가루',
    prefDist: 4.0, minDist: 2.2, fireRange: 5.5, target: 'player', telegraphDecal: 'ring', decalSize: 1.0,
    cooldownMs: 5600, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.CHALK_BOMB, motion: SHOT_MOTION.LOB, speed: 1, damage: 0, lifeMs: 3000, hitRadius: 0,
      p2: 900, p3: 1.0, endZoneKind: SHOT_KIND.ZONE_CHALK, endZoneRadius: 1.0, endZoneMs: 3500, endZoneSlow: 1,
      endZoneDamage: 2, endZoneTickMs: 700 }) }),
  // E65 시험감독: 예고 시작 때 플레이어 자리를 반경 2.4u 고리로 감싼다(0.7초). 고리 위 6장의 시험지가 2.0u/s로
  //   가운데로 모인다(1.2초). 바퀴살 하나는 사수 쪽 선 위라, 조준선과 직각으로(옆으로) 걸어 나가면 바퀴살 사이 틈이다.
  69: Object.freeze({ ...base, id: 'E65', name: '시험감독',
    prefDist: 5.0, minDist: 3.0, fireRange: 6.5, minFireDist: 2.5, target: 'player',
    volley: 'converge', count: 6, ringRadius: 2.4, telegraphDecal: 'ring', decalSize: 2.4,
    cooldownMs: 5400, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.EXAM_PAPER, motion: SHOT_MOTION.STRAIGHT, speed: 2.0, damage: 3, lifeMs: 1300, hitRadius: 0.11 }) }),
  // E66 플라나리아 생물부: 공격 없이 쫓아온다. 체력이 절반 이하가 되면 0.5초 몸을 비튼 뒤 둘로 갈라진다
  //   (지금 체력 그대로 한 마리 더, 둘 다 0.82배 크기). 갈라진 개체는 다시 갈라지지 않는다.
  70: Object.freeze({ ...base, id: 'E66', name: '플라나리아',
    move: 'chase', fireRange: 99, minFireDist: 0, volley: 'split',
    split: Object.freeze({ hpRatio: 0.5, scaleMul: 0.82, offsetU: 0.4 }),
    telegraphDecal: 'self', decalSize: 0.5, firstDelayMs: 0, cooldownMs: 1000, recoverMs: 300, shot: null }),
  // E67 학생회 방패: 공격하지 않는 지원형. 무리 뒤(4.5u)에 머물다 주변(2.6u)에 방패 없는 아군이 있으면 0.5초 예고 뒤
  //   파란 방패 파동. 아군 최대 3기에게 추가 체력 +5(최대 체력도 +5), 한 아군은 한 번만, 한 기의 평생 총량 20.
  //   보스·마틸다·거대·크루·코인·보건실·다른 방패는 받지 않는다.
  71: Object.freeze({ ...base, id: 'E67', name: '학생회 방패',
    move: 'support', prefDist: 4.5, minDist: 3.0, fireRange: 9.0, minFireDist: 0, volley: 'shield',
    shield: Object.freeze({ radius: 2.6, armor: 5, maxTargets: 3, lifeBudget: 20 }),
    telegraphDecal: 'self', decalSize: 2.6, cooldownMs: 5200, recoverMs: 500, shot: null }),
  // E68 지구본: 1.8u까지 다가와 0.6초 지구본을 돌린 뒤 자기 둘레(반경 1.1u)에 지구본 3개를 띄운다.
  //   지구본은 1.8초 동안 초당 0.75바퀴 돌다가 접선 방향으로 튕겨 나간다(2.4u/s). 도는 동안 사수는 제자리에 선다.
  72: Object.freeze({ ...base, id: 'E68', name: '지구본',
    move: 'dash', prefDist: 2.0, minDist: 1.0, fireRange: 2.4, minFireDist: 0, volley: 'orbit', count: 3,
    orbit: Object.freeze({ radius: 1.1, turnsPerSec: 0.75, orbitMs: 1800 }),
    telegraphDecal: 'self', decalSize: 1.1, cooldownMs: 5200, recoverMs: 1800,
    shot: shot({ kind: SHOT_KIND.GLOBE, motion: SHOT_MOTION.ORBIT, speed: 2.4, damage: 3, lifeMs: 3000, hitRadius: 0.14 }) }),
  // E69 도미노: 조준선(4.8u)을 긋고 그 위에 도미노 5장을 세운다(1.2u부터 0.9u 간격). 0.6초 뒤 가까운 것부터
  //   0.16초 간격으로 차례로 쓰러지며 반경 0.45u로 터진다(피해 4). 선에서 옆으로 한 걸음이면 전부 빗나간다.
  73: Object.freeze({ ...base, id: 'E69', name: '도미노',
    prefDist: 4.0, minDist: 2.0, fireRange: 4.8, minFireDist: 1.2, volley: 'domino', count: 5,
    domino: Object.freeze({ startU: 1.2, stepU: 0.9, fuseMs: 600, stepMs: 160, radius: 0.45 }),
    telegraphDecal: 'line', decalSize: 4.8, cooldownMs: 4800, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.DOMINO, motion: SHOT_MOTION.FUSE, speed: 0, damage: 4, lifeMs: 2000, hitRadius: 0.1 }) }),
  // E70 숨바꼭질 술래: 예고 시작 때 플레이어 자리에 원(0.75u)을 찍고 0.9초 숫자를 센다. 그 자리로 순간이동한 뒤
  //   0.4초 뒤 술래 터치가 터진다(피해 6). 원이 보이는 1.3초 안에 원 밖으로 나가면 된다.
  74: Object.freeze({ ...base, id: 'E70', name: '숨바꼭질 술래',
    prefDist: 4.0, minDist: 2.0, fireRange: 5.0, minFireDist: 1.5, target: 'player', volley: 'blink', count: 1,
    blink: Object.freeze({ fuseMs: 400, radius: 0.75 }),
    telegraphDecal: 'ring', decalSize: 0.75, cooldownMs: 5600, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.TAG_MARK, motion: SHOT_MOTION.FUSE, speed: 0, damage: 6, lifeMs: 1200, hitRadius: 0.1 }) }),

  // ── 블록 좀비 18종(2026-11-14, typeCode 76~93, lib/blockyZombieRoster.js). ─────────────────────────
  // Terry "난이도보다 구현이 우선". 새 행동 체계를 만들지 않고 위 원형(돌진·순간이동·부채꼴·연발·포물선·회복·방패)을
  // 다른 수치로 다시 쓴다. 근접형은 move 'chase'(늘 다가온다) + 짧은 몸 돌진(0.35~0.7초)이라 돌진 한 번에 접촉 쿨다운
  // (500ms) 안쪽으로 한 번만 닿는다. 스1에 들어가는 셋(E77·E78·E82)은 탄이 없다(스1 원거리 금지).
  // E71 학예회 닌자: E70 술래 문법. 예고 시작 때 플레이어 자리에 원(0.7u)을 찍고 0.9초 웅크렸다가 그 자리로 순간이동,
  //   0.45초 뒤 수리검 터치(피해 6). 원이 보이는 1.35초 안에 원 밖으로 나가면 된다.
  76: Object.freeze({ ...base, id: 'E71', name: '학예회 닌자',
    prefDist: 4.0, minDist: 2.0, fireRange: 5.0, minFireDist: 1.5, target: 'player', volley: 'blink', count: 1,
    blink: Object.freeze({ fuseMs: 450, radius: 0.7 }),
    telegraphDecal: 'ring', decalSize: 0.7, cooldownMs: 6000, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.TAG_MARK, motion: SHOT_MOTION.FUSE, speed: 0, damage: 6, lifeMs: 1200, hitRadius: 0.1 }) }),
  // E72 교통지도: E54 확성기 문법을 줄였다. 0.7초 호루라기 예고 뒤 ±20° 부채꼴 음파 3발(사거리 5.4u).
  77: Object.freeze({ ...base, id: 'E72', name: '교통지도',
    prefDist: 4.5, minDist: 2.2, fireRange: 5.5, volley: 'spread', count: 3, spreadDeg: 20,
    telegraphDecal: 'line', decalSize: 3.5, cooldownMs: 4400, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.SOUND_WAVE, motion: SHOT_MOTION.STRAIGHT, speed: 1.8, damage: 4, lifeMs: 3000, hitRadius: 0.13 }) }),
  // E73 해적 분장: E50 배구 문법. 예고 시작 때 플레이어 자리로 "대포알" 공을 포물선으로 던진다(착지점 원 0.8u, 1초 비행, 피해 5, 튀지 않음).
  78: Object.freeze({ ...base, id: 'E73', name: '해적 분장',
    prefDist: 4.5, minDist: 2.5, fireRange: 6.0, target: 'player', telegraphDecal: 'ring', decalSize: 0.8,
    cooldownMs: 5000, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.VOLLEYBALL, motion: SHOT_MOTION.LOB, speed: 1, damage: 5, lifeMs: 3500, hitRadius: 0,
      p2: 1000, p3: 0.8, p4: 0, bounces: 0 }) }),
  // E74 로봇부 번개: E57 연발 문법. 조준선 뒤 0.22초 간격 직선탄 3발(피해 3). 옆으로 한 걸음이면 전부 빈다.
  79: Object.freeze({ ...base, id: 'E74', name: '로봇부 번개',
    prefDist: 4.5, minDist: 2.5, fireRange: 5.5, volley: 'salvo', count: 3, intervalMs: 220,
    telegraphDecal: 'line', decalSize: 4.5, cooldownMs: 4400, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.BASEBALL, motion: SHOT_MOTION.STRAIGHT, speed: 3.2, damage: 3, lifeMs: 1800, hitRadius: 0.09 }) }),
  // E75 로봇부 하트: E62 셔틀런 문법. 0.7초 웅크린 뒤 4.2u/s로 0.6초 달리고 같은 선으로 되돌아온다(닿으면 7).
  //   2.4u 밖에서만 출발한다(E62와 같은 이유 — 한 번 돌진에 두 번 맞지 않게). 사거리는 E62처럼 머무는 거리(3.0)보다 길다.
  80: Object.freeze({ ...base, id: 'E75', name: '로봇부 하트',
    prefDist: 3.0, minDist: 1.8, fireRange: 3.2, minFireDist: 2.4,
    volley: 'charge', chargeSpeed: 4.2, chargeMs: 600, chargeLegs: 2, chargeDamage: 7,
    telegraphDecal: 'line', decalSize: 2.6, cooldownMs: 4400, recoverMs: 700, shot: null }),
  // E76 연극부 오크: E05 돌진의 오크판. 늘 다가오다 3.8u 안에서 0.8초 웅크린 뒤 4.6u/s로 0.7초 돌진(닿으면 11), 1초 숨을 고른다(취약).
  //   유일한 hp 70 종이다(고체력 종을 더 쌓지 않는다).
  81: Object.freeze({ ...base, id: 'E76', name: '연극부 오크',
    move: 'chase', fireRange: 3.8, minFireDist: 1.6,
    volley: 'charge', chargeSpeed: 4.6, chargeMs: 700, chargeLegs: 1, chargeDamage: 11,
    telegraphDecal: 'line', decalSize: 3.2, cooldownMs: 4400, recoverMs: 1000, shot: null }),
  // E77 충돌실험 인형: 빠르게 쫓아오다 2.8u 안에서 0.5초 뒤 4.8u/s로 0.45초 들이받고, 1.4초 옆으로 굴러 넘어져 있다(취약).
  82: Object.freeze({ ...base, id: 'E77', name: '충돌실험 인형',
    move: 'chase', fireRange: 2.8, minFireDist: 1.0,
    volley: 'charge', chargeSpeed: 4.8, chargeMs: 450, chargeLegs: 1, chargeDamage: 6,
    telegraphDecal: 'line', decalSize: 2.2, cooldownMs: 3600, recoverMs: 1400, shot: null }),
  // E78 텃밭 할아버지: E67 방패 문법의 느린 지원형. 무리 뒤에 머물다 주변(2.4u) 아군 최대 3기에게 추가 체력 +4(평생 16).
  83: Object.freeze({ ...base, id: 'E78', name: '텃밭 할아버지',
    move: 'support', prefDist: 5.0, minDist: 3.5, fireRange: 9.0, minFireDist: 0, volley: 'shield',
    shield: Object.freeze({ radius: 2.4, armor: 4, maxTargets: 3, lifeBudget: 16 }),
    telegraphDecal: 'self', decalSize: 2.4, cooldownMs: 6000, recoverMs: 600, shot: null }),
  // E79 학부모회장: 명함 2장을 0.2초 간격으로 같은 선에 날린다(피해 4).
  84: Object.freeze({ ...base, id: 'E79', name: '학부모회장',
    prefDist: 4.2, minDist: 2.2, fireRange: 5.5, volley: 'salvo', count: 2, intervalMs: 200,
    telegraphDecal: 'line', decalSize: 5.0, cooldownMs: 4000, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.ATTENDANCE_CARD, motion: SHOT_MOTION.STRAIGHT, speed: 3.2, damage: 4, lifeMs: 1800, hitRadius: 0.10 }) }),
  // E80 축제 부채: 부채를 휘둘러 ±25° 부채꼴 종이 바람 3장(피해 4, 사거리 4.8u).
  85: Object.freeze({ ...base, id: 'E80', name: '축제 부채',
    prefDist: 4.0, minDist: 2.2, fireRange: 5.0, volley: 'spread', count: 3, spreadDeg: 25,
    telegraphDecal: 'line', decalSize: 3.0, cooldownMs: 4200, recoverMs: 600,
    shot: shot({ kind: SHOT_KIND.EXAM_PAPER, motion: SHOT_MOTION.STRAIGHT, speed: 2.2, damage: 4, lifeMs: 2200, hitRadius: 0.11 }) }),
  // E81 PC방 게이머: 3점사. 0.7초 조준 뒤 0.12초 간격 직선탄 3발(피해 3). 2u 밖에서만 쏜다.
  86: Object.freeze({ ...base, id: 'E81', name: 'PC방 게이머',
    prefDist: 4.8, minDist: 2.8, fireRange: 6.0, minFireDist: 2.0, volley: 'salvo', count: 3, intervalMs: 120,
    telegraphDecal: 'line', decalSize: 5.5, cooldownMs: 4600, recoverMs: 500,
    shot: shot({ kind: SHOT_KIND.ERASER, motion: SHOT_MOTION.STRAIGHT, speed: 3.0, damage: 3, lifeMs: 1900, hitRadius: 0.10 }) }),
  // E82 씨름부: 늘 다가오다 2.2u 안에서 0.6초 두 팔을 들었다가 3.6u/s로 0.4초 몸통 박치기(닿으면 9).
  87: Object.freeze({ ...base, id: 'E82', name: '씨름부',
    move: 'chase', fireRange: 2.2, minFireDist: 0.6,
    volley: 'charge', chargeSpeed: 3.6, chargeMs: 400, chargeLegs: 1, chargeDamage: 9,
    telegraphDecal: 'line', decalSize: 1.6, cooldownMs: 3400, recoverMs: 800, shot: null }),
  // E83 응원단장: 늘 다가오다 2u 안에서 0.5초 다리를 뒤로 뺐다가 4u/s로 0.35초 날아차기(닿으면 7).
  88: Object.freeze({ ...base, id: 'E83', name: '응원단장',
    move: 'chase', fireRange: 2.0, minFireDist: 0.5,
    volley: 'charge', chargeSpeed: 4.0, chargeMs: 350, chargeLegs: 1, chargeDamage: 7,
    telegraphDecal: 'line', decalSize: 1.5, cooldownMs: 3000, recoverMs: 600, shot: null }),
  // E84 영양사: E56 보건실 문법. 무리 뒤에 머물다 다친 아군(2.4u)을 최대 체력의 20%(최대 5) 회복, 평생 30.
  89: Object.freeze({ ...base, id: 'E84', name: '영양사',
    move: 'support', prefDist: 5.0, minDist: 3.5, fireRange: 9.0, minFireDist: 0, volley: 'heal',
    telegraphDecal: 'self', decalSize: 2.4, cooldownMs: 5000, recoverMs: 500,
    heal: Object.freeze({ radius: 2.4, ratio: 0.2, maxPerTarget: 5, lifeBudget: 30 }),
    shot: null }),
  // E85 매점 아저씨: 늘 다가오다 2.1u 안에서 0.55초 주먹을 당겼다가 3.8u/s로 0.38초 내지른다(닿으면 8).
  90: Object.freeze({ ...base, id: 'E85', name: '매점 아저씨',
    move: 'chase', fireRange: 2.1, minFireDist: 0.5,
    volley: 'charge', chargeSpeed: 3.8, chargeMs: 380, chargeLegs: 1, chargeDamage: 8,
    telegraphDecal: 'line', decalSize: 1.6, cooldownMs: 3200, recoverMs: 700, shot: null }),
  // E86 장학사: 도장 방패. 주변(2.8u) 아군 최대 4기에게 추가 체력 +3(평생 18).
  91: Object.freeze({ ...base, id: 'E86', name: '장학사',
    move: 'support', prefDist: 4.8, minDist: 3.2, fireRange: 9.0, minFireDist: 0, volley: 'shield',
    shield: Object.freeze({ radius: 2.8, armor: 3, maxTargets: 4, lifeBudget: 18 }),
    telegraphDecal: 'self', decalSize: 2.8, cooldownMs: 5600, recoverMs: 500, shot: null }),
  // E87 오리엔티어링부: E53 문법의 빠른 접근(화면 안 1.6u/s 대시)으로 1.6u까지 붙어 4.4u/s로 0.38초 찌르고(닿으면 7) 뒤로 빠진다.
  92: Object.freeze({ ...base, id: 'E87', name: '오리엔티어링부',
    move: 'dash', prefDist: 1.6, minDist: 0.6, fireRange: 2.4, minFireDist: 0.8,
    volley: 'charge', chargeSpeed: 4.4, chargeMs: 380, chargeLegs: 1, chargeDamage: 7,
    telegraphDecal: 'line', decalSize: 1.7, cooldownMs: 3400, recoverMs: 900, recoverMove: 'retreat', shot: null }),
  // E88 육상부: 빠르게 쫓아오다 2.6u 안에서 0.5초 출발 자세 뒤 5u/s로 0.3초 스타트 대시(닿으면 6). 1.2u 밖에서만 출발한다.
  93: Object.freeze({ ...base, id: 'E88', name: '육상부',
    move: 'chase', fireRange: 2.6, minFireDist: 1.2,
    volley: 'charge', chargeSpeed: 5.0, chargeMs: 300, chargeLegs: 1, chargeDamage: 6,
    telegraphDecal: 'line', decalSize: 1.5, cooldownMs: 3600, recoverMs: 800, shot: null }),
})

export function isProjectileZombieType(typeCode) {
  return typeCode >= PZ_TYPE_MIN && typeCode <= PZ_TYPE_MAX && PROJECTILE_ZOMBIE_BEHAVIORS[typeCode] !== undefined
}

export function projectileZombieBehavior(typeCode) {
  return PROJECTILE_ZOMBIE_BEHAVIORS[typeCode] ?? null
}

export function projectileZombieTelegraphMs(typeCode) {
  if (isBlockyZombieTypeCode(typeCode)) return blockyZombieTelegraphMs(typeCode)
  const id = PROJECTILE_ZOMBIE_TYPES[projectileZombieIndex(typeCode) - 1]
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
// 회복하지 않는 타입: 0, E06(6), 크루(7/8/13/14), 보스(9~12, 32~36), 코인(16), 확장(17~31), 보건실 자신(59),
// 예약 64, 학생회 방패(71). 2차 10종(65~74)은 나머지 전부 회복·방패 대상이다.
// 블록 좀비(76~93)도 대상이다. 단 지원형 셋(83 텃밭 할아버지·89 영양사·91 장학사)은 서로를 키우지 않게 뺀다. 75(B10)는 보스다.
export function isHealableTypeCode(typeCode) {
  if (typeCode === 59 || typeCode === 71 || typeCode === 83 || typeCode === 89 || typeCode === 91) return false
  return typeCode === 1 || typeCode === 2 || typeCode === 3 || typeCode === 4 || typeCode === 5 || typeCode === 15
    || (typeCode >= 37 && typeCode <= 63) || (typeCode >= 65 && typeCode <= 74) || isBlockyZombieTypeCode(typeCode)
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

// ── 방패(E67) ────────────────────────────────────────────────────────────────
// 아군 슬롯이 방패를 받은 세대. 같은 개체는 한 번만 받는다(슬롯 재사용은 세대가 달라 자동 해제).
const shieldedGeneration = new Uint16Array(256)

function isUnshieldedAlly(pool, i) {
  return pool.active[i] && isHealableTypeCode(pool.type[i]) && shieldedGeneration[i] !== pool.generation[i] && pool.hp[i] > 0
}

/** 방패를 줄 대상이 있는지(예고 진입 조건). */
export function hasUnshieldedAllyNear(pool, index, radius) {
  const x = pool.posX[index]
  const z = pool.posZ[index]
  const r2 = radius * radius
  for (let i = 0; i <= pool.highestActive; i += 1) {
    if (i === index || !isUnshieldedAlly(pool, i)) continue
    const dx = pool.posX[i] - x
    const dz = pool.posZ[i] - z
    if (dx * dx + dz * dz <= r2) return true
  }
  return false
}

/** 방패 파동 1회. 실제로 더한 추가 체력 총량을 돌려준다. */
export function applyProjectileZombieShield(pool, index, shield) {
  if (!shield) return 0
  let budget = remainingHealBudget(pool, index, shield.lifeBudget)
  if (!(budget > 0)) return 0
  const x = pool.posX[index]
  const z = pool.posZ[index]
  const r2 = shield.radius * shield.radius
  let total = 0
  let targets = 0
  for (let i = 0; i <= pool.highestActive && budget > 0 && targets < shield.maxTargets; i += 1) {
    if (i === index || !isUnshieldedAlly(pool, i)) continue
    const dx = pool.posX[i] - x
    const dz = pool.posZ[i] - z
    if (dx * dx + dz * dz > r2) continue
    const amount = Math.min(shield.armor, budget)
    pool.maxHp[i] += amount
    pool.hp[i] += amount
    shieldedGeneration[i] = pool.generation[i]
    budget -= amount
    total += amount
    targets += 1
  }
  healBudget[index] = budget
  return total
}

export function isProjectileZombieShielded(pool, index) {
  return Boolean(pool.active[index]) && shieldedGeneration[index] === pool.generation[index]
}

// ── 분열(E66) ────────────────────────────────────────────────────────────────
// 이미 갈라진(또는 갈라져 나온) 개체의 세대. 다시 갈라지지 않는다.
const splitGeneration = new Uint16Array(256)

/**
 * 판(런)이 새로 시작될 때 회복 예산·방패 표시·분열 표시를 비운다. 이 표들은 슬롯 세대로 개체를 구분하는데,
 * 런타임 프로브는 판마다 세대를 1로 되돌리므로(stageRuntimeProbe 결정론) 지우지 않으면 앞 판 표시가
 * 다음 판 같은 슬롯에 남아 같은 시드 두 판이 갈라진다. refs.resetRuntimeRefs()가 부른다.
 */
export function resetProjectileZombieBehaviorState() {
  healBudget.fill(0)
  healGeneration.fill(0)
  shieldedGeneration.fill(0)
  splitGeneration.fill(0)
}

export function hasProjectileZombieSplit(pool, index) {
  return splitGeneration[index] === pool.generation[index]
}

function splitReady(pool, index, split) {
  return !hasProjectileZombieSplit(pool, index) && pool.maxHp[index] > 0 && pool.hp[index] > 0
    && pool.hp[index] <= pool.maxHp[index] * split.hpRatio
}

const _twinHandle = { index: -1, generation: 0 }
const _twinSource = {
  type: 0, x: 0, y: 0, z: 0, hp: 1, maxHp: 1, visualScale: 1, runDirX: 1, runDirZ: 0, yaw: 0, spawnTimer: 1000,
}

/** 분열 1회: 원본과 같은 체력의 쌍둥이를 옆에 세운다. 둘 다 작아지고 다시 갈라지지 않는다. */
export function spawnProjectileZombieSplitTwin(enemyPool, index, split) {
  if (!split || hasProjectileZombieSplit(enemyPool, index)) return false
  splitGeneration[index] = enemyPool.generation[index]
  const hp = Math.max(1, enemyPool.hp[index])
  const maxHp = Math.max(hp, enemyPool.maxHp[index] * split.hpRatio)
  enemyPool.maxHp[index] = maxHp
  enemyPool.hp[index] = Math.min(enemyPool.hp[index], maxHp)
  enemyPool.visualScale[index] *= split.scaleMul
  const dirX = enemyPool.runDirX[index]
  const dirZ = enemyPool.runDirZ[index]
  const len = Math.hypot(dirX, dirZ) || 1
  _twinSource.type = enemyPool.type[index]
  _twinSource.x = enemyPool.posX[index] - (dirZ / len) * split.offsetU
  _twinSource.z = enemyPool.posZ[index] + (dirX / len) * split.offsetU
  // 매복형이 아니라 posY가 곧 기준 높이다.
  _twinSource.y = enemyPool.posY[index]
  _twinSource.hp = hp
  _twinSource.maxHp = maxHp
  _twinSource.visualScale = enemyPool.visualScale[index]
  _twinSource.runDirX = dirX
  _twinSource.runDirZ = dirZ
  _twinSource.yaw = enemyPool.yaw[index]
  if (!enemyPool.spawnInto(_twinHandle, _twinSource)) return false
  splitGeneration[_twinHandle.index] = _twinHandle.generation
  return true
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
    // 분열형은 공격 주기가 없어(체력 조건) 위상을 흩지 않는다 — 흩으면 슬롯에 따라 분열이 늦어진다.
    pool.attackCooldown[index] = p.firstDelayMs + (p.split ? 0 : phaseFraction(index) * p.cooldownMs * 0.5)
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
    const inRange = p.split
      ? splitReady(pool, index, p.split)
      : p.move === 'ambush'
        ? distance <= p.ambushRange
        : distance <= p.fireRange && distance >= p.minFireDist
    const ready = inRange && onScreen(a, a.posX, a.posZ)
      && (cost === 0 || a.shotBudget >= cost)
      && (!p.heal || hasDamagedAllyNear(pool, index, p.heal.radius))
      && (!p.shield || hasUnshieldedAllyNear(pool, index, p.shield.radius))
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
      pool.stateTimer[index] = fireStateMs(p)
      pool.knockbackY[index] = 0
    }
  }

  if (state === PZ_STATE.FIRE) {
    const elapsed = fireStateMs(p) - pool.stateTimer[index]
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
  let charging = false
  if (state === PZ_STATE.FIRE && p.volley === 'charge') {
    // 몸 돌진: 확정 방향으로 chargeMs 달린다. 왕복(chargeLegs 2)이면 같은 선으로 되돌아온다.
    const elapsed = fireStateMs(p) - pool.stateTimer[index]
    const back = p.chargeLegs > 1 && elapsed >= p.chargeMs
    const sign = back ? -1 : 1
    out.velocityX = pool.runDirX[index] * p.chargeSpeed * sign
    out.velocityZ = pool.runDirZ[index] * p.chargeSpeed * sign
    out.moving = true
    out.hasYaw = true
    out.yaw = back ? facing + Math.PI : facing
    charging = true
  } else if (state === PZ_STATE.APPROACH) {
    if (p.move === 'chase') {
      out.velocityX = nx * speed
      out.velocityZ = nz * speed
      out.moving = true
    } else if (p.move === 'ambush') {
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
  if (!hidden && a.hitReady && distance <= a.contactDist) out.damage = charging && p.chargeDamage > 0 ? p.chargeDamage : a.damage

  return out
}

// 발사 상태 길이: 일제사격은 마지막 발까지, 돌진은 다리 수만큼, 나머지는 120ms.
function fireStateMs(p) {
  if (p.volley === 'charge') return p.chargeMs * p.chargeLegs
  return (p.volley === 'salvo' ? (p.count - 1) * p.intervalMs : 0) + 120
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
    const kind = p.heal ? SHOT_KIND.DECAL_HEAL : p.shield ? SHOT_KIND.DECAL_SHIELD : SHOT_KIND.DECAL_MARKER
    return shotPool.spawnDecal(x, z, kind, p.decalSize, leadMs + 200) >= 0
  }
  // ring: 착탄·폭발 예정점. 원은 실제 착지·폭발 순간까지 남긴다.
  const s = p.shot
  let extraMs = 0
  if (p.blink) extraMs = p.blink.fuseMs
  else if (p.volley === 'converge') extraMs = (p.ringRadius / s.speed) * 1000
  else if (s.motion === SHOT_MOTION.LOB) extraMs = s.p2
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
  if (p.shield) {
    applyProjectileZombieShield(enemyPool, index, p.shield)
    shotPool.spawnDecal(x, z, SHOT_KIND.DECAL_SHIELD, p.shield.radius, 450)
    return 0
  }
  if (p.split) {
    spawnProjectileZombieSplitTwin(enemyPool, index, p.split)
    return 0
  }
  const dirX = enemyPool.runDirX[index]
  const dirZ = enemyPool.runDirZ[index]
  if (p.volley === 'charge') {
    // 편도 돌진의 멈출 자리에 국물 웅덩이. 몸이 장애물에 막혀 일찍 서도 표식은 계획한 자리에 남는다.
    const z0 = p.chargeZone
    if (z0 && p.chargeLegs === 1) {
      const len = p.chargeSpeed * p.chargeMs / 1000
      shotPool.spawnDecal(x + dirX * len, z + dirZ * len, z0.kind, z0.radius, p.chargeMs + z0.ms, 0, 0, z0.slow)
    }
    return 0
  }
  const spec = copySpec(p.shot)
  if (p.volley === 'converge') {
    // 확정 착탄점 둘레 고리에서 가운데로. 바퀴살 하나를 사수 쪽 선에 맞춰(0°) 두면 6장일 때
    // 조준선의 직각(90°) 방향이 바퀴살 사이 틈이 된다 — "옆으로 비키면 빠진다"가 늘 성립한다.
    const cx = enemyPool.homeX[index]
    const cz = enemyPool.homeZ[index]
    const start = Math.atan2(dirX, dirZ)
    let spawned = 0
    for (let k = 0; k < p.count; k += 1) {
      const angle = start + (2 * Math.PI * k) / p.count
      const sx = Math.sin(angle); const cz2 = Math.cos(angle)
      if (shotPool.spawn(cx + sx * p.ringRadius, cz + cz2 * p.ringRadius, -sx, -cz2, spec) >= 0) spawned += 1
    }
    return spawned
  }
  if (p.volley === 'orbit') {
    const o = p.orbit
    const omega = 2 * Math.PI * o.turnsPerSec * (((index + enemyPool.generation[index]) & 1) === 0 ? 1 : -1)
    spec.p0 = o.radius; spec.p1 = omega; spec.p2 = o.orbitMs
    // 플레이어 쪽(확정 방향)에는 지구본을 띄우지 않는다 — 생기자마자 맞는 일이 없게 반 칸 비낀다.
    const start = Math.atan2(dirX, dirZ) + Math.PI / p.count
    let spawned = 0
    for (let k = 0; k < p.count; k += 1) {
      const angle = start + (2 * Math.PI * k) / p.count
      spec.p3 = angle
      const slot = shotPool.spawn(x + Math.sin(angle) * o.radius, z + Math.cos(angle) * o.radius, Math.cos(angle), -Math.sin(angle), spec)
      if (slot >= 0) {
        // 공전 중심은 사수 자리다(spawn은 발사 지점을 base로 잡는다).
        shotPool.baseX[slot] = x
        shotPool.baseZ[slot] = z
        spawned += 1
      }
    }
    return spawned
  }
  if (p.volley === 'domino') {
    const d = p.domino
    let spawned = 0
    for (let k = 0; k < p.count; k += 1) {
      const along = d.startU + k * d.stepU
      const fuse = d.fuseMs + k * d.stepMs
      spec.p0 = 0; spec.p1 = fuse; spec.p2 = d.radius; spec.p3 = 0
      spec.lifeMs = fuse + 200
      const px = x + dirX * along
      const pz = z + dirZ * along
      if (shotPool.spawn(px, pz, dirX, dirZ, spec) >= 0) {
        shotPool.spawnDecal(px, pz, SHOT_KIND.DECAL_MARKER, d.radius, fuse)
        spawned += 1
      }
    }
    return spawned
  }
  if (p.volley === 'blink') {
    // 확정한 자리로 순간이동하고, 그 자리에서 fuseMs 뒤 터치가 터진다.
    const tx = enemyPool.homeX[index]
    const tz = enemyPool.homeZ[index]
    enemyPool.posX[index] = tx
    enemyPool.posZ[index] = tz
    if (typeof enemyPool.markSpatialChanged === 'function') enemyPool.markSpatialChanged()
    spec.p0 = 0; spec.p1 = p.blink.fuseMs; spec.p2 = p.blink.radius; spec.p3 = 0
    return shotPool.spawn(tx, tz, dirX, dirZ, spec) >= 0 ? 1 : 0
  }
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

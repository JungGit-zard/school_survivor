// 신규 투사체 좀비 15종(E46~E60)의 탄·바닥 표식 고정 슬롯 풀. 렌더/물리/저장소에 의존하지 않는다.
//
// 왜 E04 풀(enemyProjectilePool.js)과 따로 두나:
//  1. E04 kind 0은 "정본, 색·크기·거동 변경 금지"다. 그 풀의 step에 궤적 분기를 끼우면 E04 판정 반경
//     (상수 0.09)이 슬롯별 Float32 값으로 바뀌는 것만으로도 명중 프레임이 미세하게 갈라질 수 있다.
//  2. E04 발사 게이트(isE04FireAllowed)는 `enemyProjectilePool.activeCount < 6`이다. 같은 풀을 쓰면
//     신규 탄 몇 발만으로 E04가 쏘지 못하게 된다.
// 피해 경로(onHit → damagePlayer, ENEMY_PROJECTILE_DAMAGE_SOURCE)와 렌더 레이어(PooledEnemyProjectileLayer)는
// E04와 같은 것을 쓴다. 이 풀은 "탄의 궤적 종류"만 더한다.
//
// 거리 단위는 월드 유닛. 1 블록 = 4 유닛.
import { PLAYER_CONTACT_HALF_EXTENT } from './enemyProjectilePool.js'

export const MAX_PROJECTILE_ZOMBIE_SHOTS = 48

// 궤적 종류(motion). 0~6은 플레이어를 맞히는 탄, 7은 바닥 지대(감속), 8은 순수 표식(판정 없음).
export const SHOT_MOTION = Object.freeze({
  STRAIGHT: 0, // 직진
  HOMING: 1, // 약유도: 초당 p0 rad, 누적 p1 rad까지 플레이어 쪽으로 꺾는다(종이비행기)
  BOUNCE: 2, // 화면 가장자리(룬트레이서식)·맵 벽에서 반사, bounces회
  RETURN: 3, // 부메랑: 발사 반대 방향 가속 p0 → 멈췄다가 되돌아온다(부메랑자, 줄넘기)
  SINE: 4, // 진행 방향 직각으로 진폭 p0, 각속도 p1로 흔들린다(합창 음표)
  LOB: 5, // 포물선: 목표 (p0,p1)에 p2 ms 뒤 착지, 착지 반경 p3 안이면 피해. bounces>0이면 p4 u 더 튄다
  SPLIT: 6, // p0 ms 뒤 p1갈래(±p2 rad)로 갈라지고 파편 속도 p3, 수명 p4 ms(플라스크)
  FUSE: 7, // 감속 p0 u/s²로 멈춘 뒤 p1 ms 깜빡이고 반경 p2로 폭발(우유)
  ZONE: 8, // 바닥 지대: 반경 p0 안이면 감속 p1(배수). 피해 없음, 접촉해도 사라지지 않는다
  DECAL: 9, // 표식: 판정 없음. 반경 p0, 길이 p1(0이면 원), yaw p2
  // 2차 10종(2026-11-07). 위 번호는 그대로 두고 뒤에만 붙인다.
  ORBIT: 10, // 발사 지점(base) 둘레를 반경 p0, 각속도 p1 rad/s로 p2 ms 돈 뒤 접선 방향으로 날아간다(지구본). 시작 각 p3
})

// 탄 kind id. 3D 아티스트가 kind별로 고유 메시를 붙일 수 있게 종별로 하나씩 고정한다(재배열 금지).
// 16~30 = E46~E60 탄, 31~35 = 공용 바닥 표식/지대. E04 풀의 0~4와 겹치지 않게 16부터 쓴다.
export const PROJECTILE_ZOMBIE_SHOT_KIND_BASE = 16
export const SHOT_KIND = Object.freeze({
  ERASER: 16, // E46 분홍 지우개
  PAPER_PLANE: 17, // E47 종이비행기
  RULER: 18, // E48 자 부메랑
  WATER_BLOB: 19, // E49 물 덩어리(포물선)
  VOLLEYBALL: 20, // E50 배구공
  MUSIC_NOTE: 21, // E51 음표
  FLASK: 22, // E52 플라스크(분열 파편도 같은 kind)
  PAINT: 23, // E53 물감 방울
  SOUND_WAVE: 24, // E54 음파
  BASEBALL: 25, // E55 야구공
  HEAL_CAPSULE: 26, // E56 예약(현재 회복은 지대 표식으로만 보인다)
  ATTENDANCE_CARD: 27, // E57 출석 카드
  JUMP_ROPE: 28, // E58 줄 끝
  MILK_CARTON: 29, // E59 우유갑(퓨즈)
  DRAIN_WATER: 30, // E60 하수 물줄기
  DECAL_MARKER: 31, // 착탄·폭발 예정 원(주황)
  DECAL_AIM_LINE: 32, // 조준선(빨강)
  ZONE_WATER: 33, // 물 웅덩이(파랑, 감속)
  ZONE_PAINT: 34, // 물감 자국(보라, 감속)
  DECAL_HEAL: 35, // 회복 파동(연두)
  // 36~44 = 2차 10종(E61~E70) 탄·지대·표식(2026-11-07). 재배열 금지.
  MIC_CORD: 36, // E63 마이크 줄 끝(맞으면 사수 쪽으로 끌려간다)
  CHALK_BOMB: 37, // E64 분필가루 덩어리(포물선)
  EXAM_PAPER: 38, // E65 시험지(바깥 고리에서 가운데로 모인다)
  GLOBE: 39, // E68 지구본(사수 둘레를 돌다 튕겨 나간다)
  DOMINO: 40, // E69 도미노 패(줄지어 차례로 쓰러지며 터진다)
  TAG_MARK: 41, // E70 술래 터치(순간이동한 자리에서 터진다)
  ZONE_SOUP: 42, // E61 쏟아진 국물(감속)
  ZONE_CHALK: 43, // E64 분필가루 구름(지속 피해)
  DECAL_SHIELD: 44, // E67 방패 파동(파랑)
})
export const SHOT_KIND_MIN = PROJECTILE_ZOMBIE_SHOT_KIND_BASE
export const SHOT_KIND_MAX = SHOT_KIND.DECAL_SHIELD

// 아티스트·렌더러용 키와 임시 색. 지금은 E04 구체를 kind별 색으로만 칠한다.
export const SHOT_KIND_INFO = Object.freeze({
  16: { key: 'eraser', color: 0xf4a3b5, size: 1.25 },
  17: { key: 'paperPlane', color: 0xffffff, size: 1.35 },
  18: { key: 'rulerBoomerang', color: 0xe7e2c8, size: 1.4 },
  19: { key: 'waterBlob', color: 0x8fd3f0, size: 1.5 },
  20: { key: 'volleyball', color: 0xf6f1de, size: 1.7 },
  21: { key: 'musicNote', color: 0xff6fb0, size: 1.2 },
  22: { key: 'flask', color: 0x9bf04a, size: 1.3 },
  23: { key: 'paint', color: 0xb05cff, size: 1.1 },
  24: { key: 'soundWave', color: 0xf0c23a, size: 1.4 },
  25: { key: 'baseball', color: 0xffffff, size: 1.0 },
  26: { key: 'healCapsule', color: 0x7cf07c, size: 1.2 },
  27: { key: 'attendanceCard', color: 0xf4e8c8, size: 1.2 },
  28: { key: 'jumpRope', color: 0xf2d23a, size: 1.3 },
  29: { key: 'milkCarton', color: 0xfafaf6, size: 1.5 },
  30: { key: 'drainWater', color: 0x5f8f7a, size: 1.15 },
  31: { key: 'decalMarker', color: 0xff8a2a, size: 1 },
  32: { key: 'decalAimLine', color: 0xff3b3b, size: 1 },
  33: { key: 'zoneWater', color: 0x4fb3ff, size: 1 },
  34: { key: 'zonePaint', color: 0xa64dff, size: 1 },
  35: { key: 'decalHeal', color: 0x7cf07c, size: 1 },
  36: { key: 'micCord', color: 0x2a2a2a, size: 1.3 },
  37: { key: 'chalkBomb', color: 0xf2f2ee, size: 1.4 },
  38: { key: 'examPaper', color: 0xf6f4ec, size: 1.25 },
  39: { key: 'globe', color: 0x3b8fe0, size: 1.5 },
  40: { key: 'domino', color: 0x111111, size: 1.3 },
  41: { key: 'tagMark', color: 0xff5a5a, size: 1.4 },
  42: { key: 'zoneSoup', color: 0xf0a040, size: 1 },
  43: { key: 'zoneChalk', color: 0xe8e8e0, size: 1 },
  44: { key: 'decalShield', color: 0x4fc3ff, size: 1 },
})

export function isShotDecalMotion(motion) {
  return motion === SHOT_MOTION.ZONE || motion === SHOT_MOTION.DECAL
}

const LOB_PEAK = 1.4
// 탄 비행 높이(월드 y). 로자리 무기 '종이비행기'(lib/paperPlane.js)도 같은 높이로 난다.
export const SHOT_HEIGHT = 0.45
const MIN_SLOW_MUL = 0.5

function finite(value) {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value))
}

/** 플레이어 감속 상태. 가장 강한(배수가 가장 작은) 1개만 적용한다. */
export function createPlayerSlowState() {
  return { mul: 1, ms: 0 }
}

export function applyPlayerSlow(state, mul, ms) {
  if (!state || !(ms > 0) || !(mul > 0) || mul >= 1) return false
  const clamped = Math.max(MIN_SLOW_MUL, mul)
  if (state.ms <= 0 || clamped < state.mul) state.mul = clamped
  state.ms = Math.max(state.ms, ms)
  return true
}

/**
 * 플레이어 끌림·밀림(E63 마이크 줄). 속도(u/s) 벡터와 남은 시간. 가장 최근 것 하나만 적용한다.
 * Player.jsx가 이동 속도에 더한다. 끌림이 걸린 피격은 일반 피격 넉백을 걸지 않는다(끌림이 그 피격의 넉백이다).
 * 외부 넉백(도지 몸통) 중에는 그 넉백이 우선이다.
 */
export function createPlayerImpulseState() {
  return { vx: 0, vz: 0, ms: 0 }
}

export function applyPlayerImpulse(state, vx, vz, ms) {
  if (!state || !(ms > 0) || !finite(vx) || !finite(vz)) return false
  state.vx = vx
  state.vz = vz
  state.ms = ms
  return true
}

/** 이번 스텝에 더할 속도를 out에 쓰고, 적용 중이면 true. */
export function consumePlayerImpulse(state, dtMs, out) {
  if (!state || !(state.ms > 0)) return false
  out.x = state.vx
  out.z = state.vz
  state.ms = Math.max(0, state.ms - (dtMs > 0 ? dtMs : 0))
  // 250ms에서 1/60초 스텝을 15번 빼면 3.6e-14ms가 남아 16번째 스텝까지 끌렸다(1.4u → 1.49u). 부동소수 찌꺼기는 끝난 것으로 본다.
  if (state.ms <= 1e-6) { state.ms = 0; state.vx = 0; state.vz = 0 }
  return true
}

/** Player.jsx가 매 고정 스텝 읽는다. 시간이 다 되면 배수가 1로 돌아온다. */
export function consumePlayerSlow(state, dtMs) {
  if (!state || state.ms <= 0) return 1
  const mul = state.mul
  state.ms = Math.max(0, state.ms - (dtMs > 0 ? dtMs : 0))
  if (state.ms <= 0) state.mul = 1
  return mul
}

/**
 * HOMING(약유도, E47 종이비행기) 한 스텝 선회. 속도 (vx, vz)를 목표 방향 (toX, toZ) 쪽으로
 * 초당 turnRate rad까지, 남은 선회 예산 budget rad 안에서만 꺾는다. 외적 부호로 회전 방향만 정한다.
 * 꺾었으면 새 속도를 out.x/out.z에 쓰고 쓴 예산(rad)을 돌려준다. 꺾지 않았으면 0을 돌려주고 out은 그대로다.
 * 좀비 탄(아래 step)과 로자리 무기 종이비행기(lib/paperPlane.js)가 이 함수 하나를 같이 쓴다.
 */
export function steerHomingVelocity(vx, vz, toX, toZ, turnRate, budget, dt, out) {
  const cross = vx * toZ - vz * toX
  const dot = vx * toX + vz * toZ
  const want = Math.abs(Math.atan2(cross, dot))
  const turn = Math.min(turnRate * dt, budget, want) * (cross >= 0 ? 1 : -1)
  if (turn === 0) return 0
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  // three.js 좌표(x, z) 평면에서 cross>0이면 +turn 회전이 목표 쪽이다.
  out.x = vx * c - vz * s
  out.z = vx * s + vz * c
  return Math.abs(turn)
}
const _steer = { x: 0, z: 0 }

// spawn 스펙의 기본값. 호출자는 바꿀 필드만 넘긴다(프레임 경로에서는 재사용 객체를 넘긴다).
export function createShotSpec() {
  return {
    kind: SHOT_KIND.ERASER, motion: SHOT_MOTION.STRAIGHT, speed: 2, damage: 0, lifeMs: 2000, hitRadius: 0.1,
    p0: 0, p1: 0, p2: 0, p3: 0, p4: 0, bounces: 0,
    hitSlowMul: 1, hitSlowMs: 0,
    endZoneKind: 0, endZoneRadius: 0, endZoneMs: 0, endZoneSlow: 1,
    // 2차 10종: 지대 지속 피해(tickMs마다 damage), 명중 시 플레이어 끌림/밀림(impulseU < 0 = 사수 쪽으로 끌림).
    endZoneDamage: 0, endZoneTickMs: 0, impulseU: 0, impulseMs: 0,
  }
}

export class ProjectileZombieShotPool {
  constructor(capacity = MAX_PROJECTILE_ZOMBIE_SHOTS) {
    this.capacity = capacity
    this.active = new Uint8Array(capacity)
    this.generation = new Uint16Array(capacity)
    this.kind = new Uint8Array(capacity)
    this.motion = new Uint8Array(capacity)
    this.bounces = new Uint8Array(capacity)
    this.posX = new Float32Array(capacity)
    this.posY = new Float32Array(capacity)
    this.posZ = new Float32Array(capacity)
    this.velX = new Float32Array(capacity)
    this.velZ = new Float32Array(capacity)
    this.baseX = new Float32Array(capacity)
    this.baseZ = new Float32Array(capacity)
    this.ageMs = new Float32Array(capacity)
    this.lifeMs = new Float32Array(capacity)
    this.damage = new Float32Array(capacity)
    this.hitRadius = new Float32Array(capacity)
    this.p0 = new Float32Array(capacity)
    this.p1 = new Float32Array(capacity)
    this.p2 = new Float32Array(capacity)
    this.p3 = new Float32Array(capacity)
    this.p4 = new Float32Array(capacity)
    this.hitSlowMul = new Float32Array(capacity)
    this.hitSlowMs = new Float32Array(capacity)
    this.endZoneKind = new Uint8Array(capacity)
    this.endZoneRadius = new Float32Array(capacity)
    this.endZoneMs = new Float32Array(capacity)
    this.endZoneSlow = new Float32Array(capacity)
    this.endZoneDamage = new Float32Array(capacity)
    this.endZoneTickMs = new Float32Array(capacity)
    this.impulseU = new Float32Array(capacity)
    this.impulseMs = new Float32Array(capacity)
    this._freeNext = new Int16Array(capacity)
    this._freeHead = 0
    this._activeCount = 0
    this._hitCount = 0
    this._spec = createShotSpec()
    for (let i = 0; i < capacity; i += 1) {
      this.generation[i] = 1
      this._freeNext[i] = i + 1 < capacity ? i + 1 : -1
    }
  }

  get activeCount() { return this._activeCount }
  get freeCount() { return this.capacity - this._activeCount }

  /** 플레이어를 맞힐 수 있는 탄 수(표식·지대 제외). 사수 상한은 이 값을 본다. */
  get hostileCount() { return this._hitCount }

  spawn(x, z, dirX, dirZ, spec) {
    if (this._freeHead < 0 || !spec || !finite(x) || !finite(z) || !finite(dirX) || !finite(dirZ)) return -1
    const len = Math.hypot(dirX, dirZ)
    const decal = isShotDecalMotion(spec.motion)
    if (!decal && !(len > 1e-8)) return -1
    const i = this._freeHead
    this._freeHead = this._freeNext[i]
    this._freeNext[i] = -1
    this.active[i] = 1
    this.kind[i] = spec.kind
    this.motion[i] = spec.motion
    this.bounces[i] = spec.bounces | 0
    this.posX[i] = x
    this.posY[i] = decal ? 0.02 : SHOT_HEIGHT
    this.posZ[i] = z
    const ux = len > 1e-8 ? dirX / len : 0
    const uz = len > 1e-8 ? dirZ / len : 1
    this.velX[i] = ux * (spec.speed || 0)
    this.velZ[i] = uz * (spec.speed || 0)
    this.baseX[i] = x
    this.baseZ[i] = z
    this.ageMs[i] = 0
    this.lifeMs[i] = spec.lifeMs
    this.damage[i] = spec.damage > 0 ? spec.damage : 0
    this.hitRadius[i] = spec.hitRadius
    this.p0[i] = spec.p0; this.p1[i] = spec.p1; this.p2[i] = spec.p2; this.p3[i] = spec.p3; this.p4[i] = spec.p4
    this.hitSlowMul[i] = spec.hitSlowMul
    this.hitSlowMs[i] = spec.hitSlowMs
    this.endZoneKind[i] = spec.endZoneKind
    this.endZoneRadius[i] = spec.endZoneRadius
    this.endZoneMs[i] = spec.endZoneMs
    this.endZoneSlow[i] = spec.endZoneSlow
    this.endZoneDamage[i] = spec.endZoneDamage > 0 ? spec.endZoneDamage : 0
    this.endZoneTickMs[i] = spec.endZoneTickMs > 0 ? spec.endZoneTickMs : 0
    this.impulseU[i] = finite(spec.impulseU) ? spec.impulseU : 0
    this.impulseMs[i] = spec.impulseMs > 0 ? spec.impulseMs : 0
    if (spec.motion === SHOT_MOTION.RETURN) {
      // 발사 방향 단위벡터를 기억해 두고 그 반대로 가속한다.
      this.p1[i] = ux
      this.p2[i] = uz
    }
    this._activeCount += 1
    if (!decal) this._hitCount += 1
    return i
  }

  /** 바닥 표식/지대 1개. kind = SHOT_KIND.DECAL_* / ZONE_*. */
  spawnDecal(x, z, kind, radius, lifeMs, lengthU = 0, yaw = 0, slowMul = 1, zoneDamage = 0, zoneTickMs = 0) {
    const s = this._spec
    const hurts = zoneDamage > 0 && zoneTickMs > 0
    const zone = slowMul < 1 || hurts
    s.kind = kind; s.motion = zone ? SHOT_MOTION.ZONE : SHOT_MOTION.DECAL; s.speed = 0; s.damage = hurts ? zoneDamage : 0
    s.lifeMs = lifeMs; s.hitRadius = 0
    // 지대: p1 = 감속 배수(1이면 감속 없음), p3 = 마지막 피해 시각, p4 = 피해 간격.
    s.p0 = radius; s.p1 = zone ? Math.min(1, slowMul) : lengthU; s.p2 = yaw; s.p3 = 0; s.p4 = hurts ? zoneTickMs : 0; s.bounces = 0
    s.hitSlowMul = 1; s.hitSlowMs = 0; s.endZoneKind = 0; s.endZoneRadius = 0; s.endZoneMs = 0; s.endZoneSlow = 1
    s.endZoneDamage = 0; s.endZoneTickMs = 0; s.impulseU = 0; s.impulseMs = 0
    return this.spawn(x, z, 0, 1, s)
  }

  despawnIndex(i) {
    if (i < 0 || i >= this.capacity || !this.active[i]) return false
    if (!isShotDecalMotion(this.motion[i])) this._hitCount -= 1
    this.active[i] = 0
    this.posX[i] = 0; this.posY[i] = 0; this.posZ[i] = 0
    this.velX[i] = 0; this.velZ[i] = 0
    this.ageMs[i] = 0; this.damage[i] = 0
    this._activeCount -= 1
    this.generation[i] = this.generation[i] === 0xffff ? 1 : this.generation[i] + 1
    this._freeNext[i] = this._freeHead
    this._freeHead = i
    return true
  }

  _spawnEndZone(i) {
    if (!this.endZoneKind[i] || !(this.endZoneMs[i] > 0)) return
    this.spawnDecal(this.posX[i], this.posZ[i], this.endZoneKind[i], this.endZoneRadius[i], this.endZoneMs[i], 0, 0, this.endZoneSlow[i], this.endZoneDamage[i], this.endZoneTickMs[i])
  }

  _blast(i, x, z, radius, playerX, playerZ, onHit, slowState) {
    const dx = x - playerX
    const dz = z - playerZ
    const reach = radius + PLAYER_CONTACT_HALF_EXTENT
    if (dx * dx + dz * dz <= reach * reach) {
      if (this.damage[i] > 0 && onHit) onHit(i, this.generation[i], this.damage[i])
      if (this.hitSlowMs[i] > 0) applyPlayerSlow(slowState, this.hitSlowMul[i], this.hitSlowMs[i])
    }
  }

  /**
   * @param bounds 화면 영역 {minX,maxX,minZ,maxZ}(반사용, 선택)
   * @param slowState createPlayerSlowState() 결과(선택)
   * @param arena {halfX, halfZ} 맵 반폭(반사용, 선택)
   * @param impulseState createPlayerImpulseState() 결과(선택, E63 끌림)
   */
  step(delta, playerX, playerZ, onHit, bounds = null, slowState = null, arena = null, impulseState = null) {
    if (!finite(delta) || delta < 0 || !finite(playerX) || !finite(playerZ)) return false
    const dt = Math.min(delta, 1 / 30)
    const dtMs = dt * 1000
    const reachBase = PLAYER_CONTACT_HALF_EXTENT
    this._impulseState = impulseState
    for (let i = 0; i < this.capacity; i += 1) {
      if (!this.active[i]) continue
      const motion = this.motion[i]
      this.ageMs[i] += dtMs
      const age = this.ageMs[i]

      if (motion === SHOT_MOTION.DECAL) {
        if (age >= this.lifeMs[i]) this.despawnIndex(i)
        continue
      }
      if (motion === SHOT_MOTION.ZONE) {
        const dx = this.posX[i] - playerX
        const dz = this.posZ[i] - playerZ
        const r = this.p0[i] + reachBase
        if (dx * dx + dz * dz <= r * r) {
          if (this.p1[i] < 1) applyPlayerSlow(slowState, this.p1[i], 180)
          // 지속 피해 지대(E64 분필가루): 안에 있으면 최대 p4 ms마다 한 번. 타이머는 구름이 생길 때 시작하므로
          // 첫 피해는 생긴 뒤 p4 ms부터이고, 그 뒤에 들어서면 바로 맞는다(들어선 시점 기준 유예는 없다).
          if (this.damage[i] > 0 && this.p4[i] > 0 && age - this.p3[i] >= this.p4[i]) {
            this.p3[i] = age
            if (onHit) onHit(i, this.generation[i], this.damage[i])
          }
        }
        if (age >= this.lifeMs[i]) this.despawnIndex(i)
        continue
      }

      if (motion === SHOT_MOTION.ORBIT) {
        if (age < this.p2[i]) {
          const angle = this.p3[i] + this.p1[i] * age / 1000
          this.posX[i] = this.baseX[i] + Math.sin(angle) * this.p0[i]
          this.posZ[i] = this.baseZ[i] + Math.cos(angle) * this.p0[i]
          this._contact(i, playerX, playerZ, onHit, slowState)
          if (this.active[i] && age >= this.lifeMs[i]) this.despawnIndex(i)
          continue
        }
        // 공전이 끝나면 그 순간의 접선 방향으로 직진한다.
        const angle = this.p3[i] + this.p1[i] * this.p2[i] / 1000
        const sign = this.p1[i] >= 0 ? 1 : -1
        const speed = Math.hypot(this.velX[i], this.velZ[i])
        this.velX[i] = Math.cos(angle) * sign * speed
        this.velZ[i] = -Math.sin(angle) * sign * speed
        this.motion[i] = SHOT_MOTION.STRAIGHT
      }

      if (motion === SHOT_MOTION.LOB) {
        const flight = this.p2[i] > 0 ? this.p2[i] : 1000
        const t = Math.min(1, age / flight)
        this.posX[i] = this.baseX[i] + (this.p0[i] - this.baseX[i]) * t
        this.posZ[i] = this.baseZ[i] + (this.p1[i] - this.baseZ[i]) * t
        this.posY[i] = 0.3 + 4 * LOB_PEAK * t * (1 - t)
        if (t >= 1) {
          // 착지 순간에만 판정한다. 공중에서는 플레이어를 통과한다.
          this._blast(i, this.p0[i], this.p1[i], this.p3[i], playerX, playerZ, onHit, slowState)
          this._spawnEndZone(i)
          if (this.bounces[i] > 0 && this.p4[i] > 0) {
            // 같은 방향으로 한 번 더 튄다. 다음 착지점 표식은 이 순간부터 보인다.
            const dirX = this.p0[i] - this.baseX[i]
            const dirZ = this.p1[i] - this.baseZ[i]
            const len = Math.hypot(dirX, dirZ) || 1
            this.bounces[i] -= 1
            this.baseX[i] = this.p0[i]
            this.baseZ[i] = this.p1[i]
            this.p0[i] = this.baseX[i] + dirX / len * this.p4[i]
            this.p1[i] = this.baseZ[i] + dirZ / len * this.p4[i]
            this.p2[i] = Math.max(450, flight * 0.6)
            this.ageMs[i] = 0
            this.spawnDecal(this.p0[i], this.p1[i], SHOT_KIND.DECAL_MARKER, this.p3[i], this.p2[i])
          } else {
            this.despawnIndex(i)
          }
        }
        continue
      }

      if (motion === SHOT_MOTION.FUSE) {
        const speed = Math.hypot(this.velX[i], this.velZ[i])
        if (speed > 1e-4) {
          const next = Math.max(0, speed - this.p0[i] * dt)
          const k = next / speed
          this.velX[i] *= k
          this.velZ[i] *= k
          this.posX[i] += this.velX[i] * dt
          this.posZ[i] += this.velZ[i] * dt
          if (next <= 1e-4) { this.velX[i] = 0; this.velZ[i] = 0; this.p3[i] = age }
          this._contact(i, playerX, playerZ, onHit, slowState)
        } else if (age - this.p3[i] >= this.p1[i]) {
          this._blast(i, this.posX[i], this.posZ[i], this.p2[i], playerX, playerZ, onHit, slowState)
          this.despawnIndex(i)
        }
        if (this.active[i] && age >= this.lifeMs[i]) this.despawnIndex(i)
        continue
      }

      if (motion === SHOT_MOTION.HOMING && this.p1[i] > 0) {
        // 남은 선회 예산(p1) 안에서 플레이어 쪽으로 초당 p0 rad까지 꺾는다.
        const used = steerHomingVelocity(this.velX[i], this.velZ[i], playerX - this.posX[i], playerZ - this.posZ[i], this.p0[i], this.p1[i], dt, _steer)
        if (used !== 0) {
          this.velX[i] = _steer.x
          this.velZ[i] = _steer.z
          this.p1[i] -= used
        }
      } else if (motion === SHOT_MOTION.RETURN) {
        this.velX[i] -= this.p1[i] * this.p0[i] * dt
        this.velZ[i] -= this.p2[i] * this.p0[i] * dt
      } else if (motion === SHOT_MOTION.SPLIT && age >= this.p0[i]) {
        this._split(i)
        continue
      }

      if (motion === SHOT_MOTION.SINE) {
        this.baseX[i] += this.velX[i] * dt
        this.baseZ[i] += this.velZ[i] * dt
        const speed = Math.hypot(this.velX[i], this.velZ[i]) || 1
        const off = this.p0[i] * Math.sin(this.p1[i] * age / 1000)
        this.posX[i] = this.baseX[i] + (-this.velZ[i] / speed) * off
        this.posZ[i] = this.baseZ[i] + (this.velX[i] / speed) * off
      } else {
        this.posX[i] += this.velX[i] * dt
        this.posZ[i] += this.velZ[i] * dt
      }

      if (motion === SHOT_MOTION.BOUNCE && this.bounces[i] > 0) this._reflect(i, bounds, arena)

      this._contact(i, playerX, playerZ, onHit, slowState)
      if (this.active[i] && age >= this.lifeMs[i]) {
        this._spawnEndZone(i)
        this.despawnIndex(i)
      }
    }
    return true
  }

  _contact(i, playerX, playerZ, onHit, slowState) {
    const dx = this.posX[i] - playerX
    const dz = this.posZ[i] - playerZ
    const r = this.hitRadius[i] + PLAYER_CONTACT_HALF_EXTENT
    if (dx * dx + dz * dz > r * r) return false
    // onHit은 피해가 실제로 들어갔으면 true를 돌려준다(Enemies.jsx → damagePlayer). 무적이면 false.
    const landed = this.damage[i] > 0 && onHit ? onHit(i, this.generation[i], this.damage[i]) : false
    if (this.hitSlowMs[i] > 0) applyPlayerSlow(slowState, this.hitSlowMul[i], this.hitSlowMs[i])
    // 끌림·밀림(E63)은 피해가 들어간 명중에만 건다. 무적 중에 맞으면 피해도 끌림도 없다.
    if (landed && this.impulseU[i] !== 0 && this.impulseMs[i] > 0) this._impulse(i, playerX, playerZ)
    this.despawnIndex(i)
    return true
  }

  // impulseU < 0: 발사 지점(사수 자리) 쪽으로 |impulseU| u 끌어당긴다. > 0: 탄 진행 방향으로 민다.
  _impulse(i, playerX, playerZ) {
    let dirX; let dirZ
    if (this.impulseU[i] < 0) { dirX = this.baseX[i] - playerX; dirZ = this.baseZ[i] - playerZ } else { dirX = this.velX[i]; dirZ = this.velZ[i] }
    const len = Math.hypot(dirX, dirZ)
    if (!(len > 1e-6)) return
    const speed = Math.abs(this.impulseU[i]) / (this.impulseMs[i] / 1000)
    applyPlayerImpulse(this._impulseState, dirX / len * speed, dirZ / len * speed, this.impulseMs[i])
  }

  _reflect(i, bounds, arena) {
    let minX = -Infinity; let maxX = Infinity; let minZ = -Infinity; let maxZ = Infinity
    if (bounds && finite(bounds.minX) && finite(bounds.maxX) && bounds.minX < bounds.maxX) { minX = bounds.minX; maxX = bounds.maxX }
    if (bounds && finite(bounds.minZ) && finite(bounds.maxZ) && bounds.minZ < bounds.maxZ) { minZ = bounds.minZ; maxZ = bounds.maxZ }
    if (arena && arena.halfX > 0) { minX = Math.max(minX, -arena.halfX); maxX = Math.min(maxX, arena.halfX) }
    if (arena && arena.halfZ > 0) { minZ = Math.max(minZ, -arena.halfZ); maxZ = Math.min(maxZ, arena.halfZ) }
    let reflected = false
    if ((this.posX[i] < minX && this.velX[i] < 0) || (this.posX[i] > maxX && this.velX[i] > 0)) { this.velX[i] = -this.velX[i]; reflected = true }
    if ((this.posZ[i] < minZ && this.velZ[i] < 0) || (this.posZ[i] > maxZ && this.velZ[i] > 0)) { this.velZ[i] = -this.velZ[i]; reflected = true }
    if (reflected) this.bounces[i] -= 1
  }

  _split(i) {
    // 본체 슬롯을 파편 하나로 넘겨 쓰고 나머지는 빈 슬롯에서 받는다(빈 슬롯이 없으면 그 파편만 생략).
    const count = Math.max(1, Math.round(this.p1[i]))
    const spread = this.p2[i]
    const childSpeed = this.p3[i]
    const childLife = this.p4[i]
    const speed = Math.hypot(this.velX[i], this.velZ[i]) || 1
    const ux = this.velX[i] / speed
    const uz = this.velZ[i] / speed
    const s = this._spec
    s.kind = this.kind[i]; s.motion = SHOT_MOTION.STRAIGHT; s.speed = childSpeed; s.damage = this.damage[i]
    s.lifeMs = childLife; s.hitRadius = this.hitRadius[i] * 0.8
    s.p0 = 0; s.p1 = 0; s.p2 = 0; s.p3 = 0; s.p4 = 0; s.bounces = 0
    s.hitSlowMul = 1; s.hitSlowMs = 0; s.endZoneKind = 0; s.endZoneRadius = 0; s.endZoneMs = 0; s.endZoneSlow = 1
    s.endZoneDamage = 0; s.endZoneTickMs = 0; s.impulseU = 0; s.impulseMs = 0
    const x = this.posX[i]
    const z = this.posZ[i]
    for (let k = 1; k < count; k += 1) {
      const angle = count === 1 ? 0 : -spread + (2 * spread * k) / (count - 1)
      const c = Math.cos(angle); const sn = Math.sin(angle)
      this.spawn(x, z, ux * c - uz * sn, ux * sn + uz * c, s)
    }
    // 본체 = 첫 파편(-spread).
    const c = Math.cos(-spread); const sn = Math.sin(-spread)
    this.motion[i] = SHOT_MOTION.STRAIGHT
    this.velX[i] = (ux * c - uz * sn) * childSpeed
    this.velZ[i] = (ux * sn + uz * c) * childSpeed
    this.ageMs[i] = 0
    this.lifeMs[i] = childLife
    this.hitRadius[i] = this.hitRadius[i] * 0.8
  }

  reset() {
    this._freeHead = -1
    this._activeCount = 0
    this._hitCount = 0
    for (let i = this.capacity - 1; i >= 0; i -= 1) {
      this.active[i] = 0
      this.posX[i] = 0; this.posY[i] = 0; this.posZ[i] = 0
      this.velX[i] = 0; this.velZ[i] = 0
      this.ageMs[i] = 0; this.damage[i] = 0
      this.generation[i] = this.generation[i] === 0xffff ? 1 : this.generation[i] + 1
      this._freeNext[i] = this._freeHead
      this._freeHead = i
    }
  }
}

export function createProjectileZombieShotPool(capacity) {
  return new ProjectileZombieShotPool(capacity)
}

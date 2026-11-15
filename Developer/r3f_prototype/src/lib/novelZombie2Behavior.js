// 신규 좀비 2차 세트(E89~E106) 1차 구현분의 행동 런타임 정본. Level_Mini 소유.
// 데이터: lib/novelZombie2Content.js · 치프 계층: lib/stageChiefContent.js · 비주얼: lib/novelZombie2Visuals.js.
//
// 1차(wave 1) 8종 중 6종이 여기서 돈다:
//   E89 반장(치프, Stage 1) — "차렷! 경례!": 반경 안 일반 좀비를 동결시켰다가 확정 방향으로 동시 돌진시킨다.
//   E93 그림자밟기(Stage 2) — 늘 "2초 전 플레이어 위치"로 걷는다.
//   E96 드리블(Stage 3)    — 전역 0.5초 박자: 걸음·걸음·예고·돌진. 같은 종 전원이 같은 박에 움직인다.
//   E99 압력밥솥(Stage 4)  — 죽은 자리에 1.2초 예고 뒤 r 1.4u 폭발(피해 12, 플레이어만).
//   E103 커피 셔틀(Stage 5) — 아군 뒤에 머물며 일반 좀비 1기에 "카페인"(이동 ×1.35, 5초).
//   E105 2인3각(Stage 6)    — 두 몸이 하나처럼 움직이다 한쪽이 죽으면 남은 쪽이 2초 넘어진다.
// 나머지 2종(E94 대걸레 rootline, E97 뜀틀 hop)은 확장 공격 런타임(stepExpansionAttack)을 그대로 쓴다.
//
// 불변식(테스트가 못박는다):
//  1. 예고(TELEGRAPH, 상태 8) 중에는 이 종의 피해가 0이다 — 접촉 피해도 끈다(noContact).
//  2. 공격 방향·위치는 예고가 시작/끝나는 순간 1회 확정되고 그 뒤로 추적하지 않는다 → 옆으로 비키면 빈 자리가 남는다.
//  3. 버프·지휘 대상은 일반 잡몹뿐이다: 마틸다·보스(풀 밖)·치프·E08(코인)·런 크루는 절대 대상이 아니다.
//  4. 로사리 투사체를 막거나 반사·흡수하지 않는다(이 모듈은 투사체를 전혀 다루지 않는다).
//  5. 프레임 경로에서 객체를 새로 만들지 않는다(예고 스냅샷 생성은 상태 전이 때 1회).
//  6. Math.random()을 쓰지 않는다(시뮬레이션 패리티).
//
// 거리 단위 = 월드 유닛(u), 1블록 = 4u. 시간 = 게임 시간 ms(일시정지 중 진행하지 않는다).
import { MAX_ENEMIES } from './enemyEntityPool.js'
import { NOVEL2_TYPE_CODES } from './novelZombie2Content.js'
import { isChiefTypeCode } from './stageChiefContent.js'
import { advanceExpansionSnapshot, emitExpansionHazardSnapshot, expansionAttackSnapshots, expansionChannelFree } from './expansionAttackRuntime.js'

export const N2_STATE_APPROACH = 7
export const N2_STATE_TELEGRAPH = 8
export const N2_STATE_ATTACK = 9
export const N2_STATE_RECOVER = 10
export const N2_STATE_STUN = 4
// 지휘받은 일반 좀비의 상태(기존 E05 경고/돌진 코드 재사용 → 풀 렌더러의 경고 포즈·"GO!" 큐가 그대로 붙는다).
export const N2_COMMAND_STATE_FREEZE = 2
export const N2_COMMAND_STATE_LUNGE = 3

const CODE = NOVEL2_TYPE_CODES
export const E89_CODE = CODE.E89
export const E93_CODE = CODE.E93
export const E96_CODE = CODE.E96
export const E99_CODE = CODE.E99
export const E103_CODE = CODE.E103
export const E105_CODE = CODE.E105

// ── E89 반장 좀비 "차렷! 경례!" ─────────────────────────────────────────────
export const E89_COMMAND = Object.freeze({
  triggerDistance: 5.5,   // 플레이어가 이 거리(1.375블록) 안
  radius: 4.0,            // 지휘 반경(1.0블록)
  telegraphMs: 1200,      // "차렷!" 노란 원
  freezeMs: 800,          // 동결(이때 방향 확정)
  lungeMs: 400,
  lungeSpeed: 4.0,        // 4u/s × 0.4s = 1.6u(0.4블록)
  recoverMs: 1000,        // 인사
  cooldownMs: 7000,
  firstDelayMs: 3000,
  maxCommanded: 8,
})
// 지휘 가능한 타입 = 단순 추격 잡몹(E01·E02·E03·E06·E07). 자기 상태기계가 있는 종(E05·신형·투사체·확장)은 넣지 않는다.
const COMMANDABLE_CODES = new Set([1, 2, 3, 6, 15])
export function isCommandableTypeCode(typeCode) {
  return COMMANDABLE_CODES.has(typeCode)
}

// ── E93 그림자밟기 ───────────────────────────────────────────────────────────
export const E93_SHADOW = Object.freeze({
  sampleMs: 100,
  capacity: 40,           // 4초분
  lagMs: 2000,            // 2초 전 위치
  catchUpDistance: 1.5,
  catchUpSpeed: 1.6,
  arriveDistance: 0.05,
})

// ── E96 드리블(전역 메트로놈) ────────────────────────────────────────────────
// 박 0 = 돌진, 1·2 = 걸음, 3 = 예고. 예고(박 3) 시작에 방향을 확정한다.
export const E96_DRIBBLE = Object.freeze({
  beatMs: 500,
  stepMs: 250,
  stepSpeed: 2.0,         // 0.5u/박
  lungeSpeed: 2.4,        // 2.4u/s × 0.5s = 1.2u(0.3블록)
})

// ── E99 압력밥솥(사망 폭발) ──────────────────────────────────────────────────
export const E99_BURST_PATTERN = Object.freeze({
  id: 'e99_burst', shape: 'disk', rangeUnits: 1.4, widthUnits: 0,
  windupMs: 1200, activeMs: 200, recoveryMs: 200, damage: 12, maxHitsPerTarget: 1,
})
export const E99_MAX_BURSTS = 2

// ── E103 커피 셔틀 ────────────────────────────────────────────────────────────
export const E103_COFFEE = Object.freeze({
  minDist: 4, maxDist: 6,
  pickRadius: 4,
  telegraphMs: 800,
  recoverMs: 400,
  cooldownMs: 6000,
  firstDelayMs: 1500,
  buffMs: 5000,
  buffSpeedMul: 1.35,
  maxBuffed: 4,
})
// 커피를 받을 수 있는 타입 = 일반 잡몹. 치프·E08(16)·런 크루(7,8,13,14)·자기 자신(E103)은 제외. 마틸다·보스는 풀에 없다.
const BUFFABLE_BASE_CODES = new Set([1, 2, 3, 4, 5, 6, 15])
export function isBuffableTypeCode(typeCode) {
  if (!Number.isInteger(typeCode) || typeCode <= 0) return false
  if (typeCode === 16 || typeCode === 7 || typeCode === 8 || typeCode === 13 || typeCode === 14) return false
  if (isChiefTypeCode(typeCode) || typeCode === E103_CODE) return false
  if (BUFFABLE_BASE_CODES.has(typeCode)) return true
  // 확장 일반(17~31), Track B(37~48), 투사체 좀비(49~74, 64 예약 제외), 블록 좀비(76~93), 2차 일반(94~111 중 치프 아닌 것).
  return (typeCode >= 17 && typeCode <= 31) || (typeCode >= 37 && typeCode <= 74 && typeCode !== 64)
    || (typeCode >= 76 && typeCode <= 111)
}

// ── E105 2인3각 ───────────────────────────────────────────────────────────────
export const E105_PAIR = Object.freeze({
  spacing: 0.6,
  regroupDistance: 1.2,
  walkMs: 400,
  pauseMs: 200,
  tripMs: 2000,
  soloSpeed: 0.45,
  springGain: 3.0,
})

const COMMAND_TELEGRAPH_KEY_PREFIX = 'novel2:e89:'
const COFFEE_TELEGRAPH_KEY_PREFIX = 'novel2:e103:'
const BURST_KEY_PREFIX = 'novel2:e99:'

export function createNovel2Result() {
  return { velocityX: 0, velocityZ: 0, moving: false, preserveFacing: false, noContact: false, hasYaw: false, yaw: 0 }
}

function resetResult(out) {
  out.velocityX = 0; out.velocityZ = 0; out.moving = false; out.preserveFacing = false; out.noContact = false; out.hasYaw = false; out.yaw = 0
  return out
}

function slotAlive(pool, index, generation) {
  return index >= 0 && index < pool.active.length && pool.active[index] === 1 && pool.generation[index] === generation
}

/**
 * 시뮬레이션 런타임 1개당 1개. 슬롯별 보조 상태(지휘·버프·짝)와 전역 시계(메트로놈·플레이어 경로·폭발)를 갖는다.
 * 슬롯 세대(generation)가 바뀌면 그 슬롯의 보조 상태는 자동으로 무효가 된다.
 */
export class Novel2Runtime {
  constructor(capacity = MAX_ENEMIES) {
    this.capacity = capacity
    this.slotGen = new Int32Array(capacity).fill(-1)
    // 지휘(E89) — 지휘받은 일반 좀비 쪽에 기록한다.
    this.cmdPhase = new Uint8Array(capacity)        // 0 없음 / 1 동결 / 2 돌진
    this.cmdMs = new Float32Array(capacity)
    this.cmdDirX = new Float32Array(capacity)
    this.cmdDirZ = new Float32Array(capacity)
    this.cmdOwner = new Int16Array(capacity).fill(-1)
    this.cmdOwnerGen = new Int32Array(capacity)
    // 반장 자신의 예고 중심(예고 시작에 고정)과 예고 스냅샷 키.
    this.chiefCenterX = new Float32Array(capacity)
    this.chiefCenterZ = new Float32Array(capacity)
    // 커피(E103) — 받은 쪽에 기록한다.
    this.buffMs = new Float32Array(capacity)
    // 커피 셔틀 자신의 목표(예고 시작에 고정).
    this.coffeeTarget = new Int16Array(capacity).fill(-1)
    this.coffeeTargetGen = new Int32Array(capacity)
    // 2인3각(E105) 짝.
    this.partner = new Int16Array(capacity).fill(-1)
    this.partnerGen = new Int32Array(capacity)
    this.wasPaired = new Uint8Array(capacity)
    this.solo = new Uint8Array(capacity)
    // 전역 시계.
    this.clockMs = 0
    // 플레이어 경로(E93): 0.1초 간격 링버퍼.
    this.pathX = new Float32Array(E93_SHADOW.capacity)
    this.pathZ = new Float32Array(E93_SHADOW.capacity)
    this.pathHead = 0
    this.pathCount = 0
    this.pathAccMs = 0
    // 폭발(E99) 진행 목록과 예고 스냅샷 키.
    this.bursts = []
    this.ownedKeys = new Set()
    // 시각 전용 예고(E89 지휘 원·E103 커피 선): 키 → 주인 슬롯. 주인이 예고 중에 죽으면 다음 스텝에 지운다.
    this.telegraphOwners = new Map()
    this.seq = 0
    this.stageId = null
    this.halfX = 0
    this.halfZ = 0
    this.playerX = 0
    this.playerZ = 0
  }

  reset() {
    this.slotGen.fill(-1)
    this.cmdPhase.fill(0); this.cmdMs.fill(0); this.cmdOwner.fill(-1)
    this.buffMs.fill(0)
    this.coffeeTarget.fill(-1)
    this.partner.fill(-1); this.wasPaired.fill(0); this.solo.fill(0)
    this.clockMs = 0
    this.pathHead = 0; this.pathCount = 0; this.pathAccMs = 0
    this.bursts.length = 0
    for (const key of this.ownedKeys) expansionAttackSnapshots.delete(key)
    this.ownedKeys.clear()
    this.telegraphOwners.clear()
  }

  _claimSlot(pool, index) {
    const generation = pool.generation[index]
    if (this.slotGen[index] === generation) return
    this.slotGen[index] = generation
    this.cmdPhase[index] = 0; this.cmdMs[index] = 0; this.cmdOwner[index] = -1
    this.buffMs[index] = 0
    this.coffeeTarget[index] = -1
    this.partner[index] = -1; this.wasPaired[index] = 0; this.solo[index] = 0
    this.chiefCenterX[index] = 0; this.chiefCenterZ[index] = 0
  }

  _addSnapshot(snapshot, pool = null, ownerIndex = -1) {
    expansionAttackSnapshots.set(snapshot.key, snapshot)
    this.ownedKeys.add(snapshot.key)
    if (pool && ownerIndex >= 0) this.telegraphOwners.set(snapshot.key, { index: ownerIndex, generation: pool.generation[ownerIndex] })
    return snapshot
  }

  _removeSnapshot(key) {
    expansionAttackSnapshots.delete(key)
    this.ownedKeys.delete(key)
    this.telegraphOwners.delete(key)
  }

  _cleanupOrphanTelegraphs(pool) {
    for (const [key, owner] of this.telegraphOwners) {
      if (!slotAlive(pool, owner.index, owner.generation) || !expansionAttackSnapshots.has(key)) this._removeSnapshot(key)
    }
  }

  _recordPlayer(playerX, playerZ, deltaMs) {
    this.pathAccMs += deltaMs
    if (this.pathCount === 0) this.pathAccMs = E93_SHADOW.sampleMs
    while (this.pathAccMs >= E93_SHADOW.sampleMs) {
      this.pathAccMs -= E93_SHADOW.sampleMs
      this.pathX[this.pathHead] = playerX
      this.pathZ[this.pathHead] = playerZ
      this.pathHead = (this.pathHead + 1) % E93_SHADOW.capacity
      if (this.pathCount < E93_SHADOW.capacity) this.pathCount += 1
    }
  }

  /** 2초 전 플레이어 위치(기록이 모자라면 가장 오래된 기록, 기록이 없으면 현재 위치). */
  shadowTargetInto(out, playerX, playerZ) {
    if (this.pathCount === 0) { out.x = playerX; out.z = playerZ; return out }
    const back = Math.min(this.pathCount - 1, Math.round(E93_SHADOW.lagMs / E93_SHADOW.sampleMs))
    const slot = (this.pathHead - 1 - back + E93_SHADOW.capacity * 2) % E93_SHADOW.capacity
    out.x = this.pathX[slot]
    out.z = this.pathZ[slot]
    return out
  }

  /** E96 박 번호(0 돌진, 1·2 걸음, 3 예고)와 박 안 경과 ms. */
  beatIndex() {
    return Math.floor(this.clockMs / E96_DRIBBLE.beatMs) % 4
  }

  beatElapsedMs() {
    return this.clockMs % E96_DRIBBLE.beatMs
  }

  /**
   * 스텝 머리말: 시계·경로·버프 타이머·짝 연결·폭발 진행. 피해가 나면 onDamage(damage, x, z)를 부른다.
   */
  beginStep(pool, context, deltaMs, onDamage) {
    this.clockMs += deltaMs
    this.stageId = context.stageId ?? this.stageId
    this.halfX = context.halfX
    this.halfZ = context.halfZ
    this.playerX = context.playerX
    this.playerZ = context.playerZ
    this._recordPlayer(context.playerX, context.playerZ, deltaMs)
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1) continue
      this._claimSlot(pool, index)
      if (this.buffMs[index] > 0) this.buffMs[index] = Math.max(0, this.buffMs[index] - deltaMs)
    }
    this._linkPairs(pool, highest)
    this._cleanupOrphanTelegraphs(pool)
    this._stepBursts(context.playerX, context.playerZ, deltaMs, onDamage)
  }

  _linkPairs(pool, highest) {
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1 || pool.type[index] !== E105_CODE || this.partner[index] >= 0 || this.wasPaired[index]) continue
      let best = -1
      let bestDist = Infinity
      for (let other = 0; other <= highest; other += 1) {
        if (other === index || pool.active[other] !== 1 || pool.type[other] !== E105_CODE) continue
        if (this.slotGen[other] !== pool.generation[other] || this.partner[other] >= 0 || this.wasPaired[other]) continue
        const dist = Math.hypot(pool.posX[other] - pool.posX[index], pool.posZ[other] - pool.posZ[index])
        if (dist < bestDist) { bestDist = dist; best = other }
      }
      if (best < 0) continue
      this.partner[index] = best; this.partnerGen[index] = pool.generation[best]; this.wasPaired[index] = 1
      this.partner[best] = index; this.partnerGen[best] = pool.generation[index]; this.wasPaired[best] = 1
    }
  }

  _stepBursts(playerX, playerZ, deltaMs, onDamage) {
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i]
      // 판 리셋(clearExpansionAttacks)으로 맵에서 지워진 폭발은 더 진행하지도, 피해를 주지도 않는다.
      if (expansionAttackSnapshots.get(burst.key) !== burst) {
        this.ownedKeys.delete(burst.key)
        this.bursts.splice(i, 1)
        continue
      }
      const damage = advanceExpansionSnapshot(burst, { deltaMs, playerX, playerZ })
      if (damage > 0 && onDamage) onDamage(damage, burst.originXZ[0], burst.originXZ[1])
      if (burst.elapsedMs >= burst.windupMs + burst.activeMs + burst.recoveryMs) {
        this._removeSnapshot(burst.key)
        this.bursts.splice(i, 1)
      }
    }
  }

  /** E99이 죽은 자리에 폭발 예고. 상한·채널·탈출 인증에 걸리면 피해 없는 김(=아무것도 안 함)으로 끝난다. */
  queueDeathBurst(x, z) {
    if (!Number.isFinite(x + z) || this.bursts.length >= E99_MAX_BURSTS || !expansionChannelFree()) return null
    const key = `${BURST_KEY_PREFIX}${++this.seq}`
    const snapshot = emitExpansionHazardSnapshot({
      hazardId: 'E99', pattern: E99_BURST_PATTERN, originXZ: [x, z], key,
      playerX: this.playerX, playerZ: this.playerZ, stageId: this.stageId ?? 'stage4',
      halfX: this.halfX > 0 ? this.halfX : 9.36, halfZ: this.halfZ > 0 ? this.halfZ : 16,
    })
    if (!snapshot) return null
    // 해저드 스테핑(Stage 6 훈화 경로)이 두 번 진행시키지 않도록 hazard 표식을 내리고 이 런타임이 소유한다.
    snapshot.hazard = false
    snapshot.novel2 = true
    this.ownedKeys.add(key)
    this.bursts.push(snapshot)
    return snapshot
  }

  /** 지휘받은 개체면 이번 프레임 이동을 대신 정하고 true. 반장이 죽으면 즉시 풀린다. */
  stepCommanded(pool, index, deltaMs, out) {
    const phase = this.cmdPhase[index]
    if (phase === 0) return false
    resetResult(out)
    const owner = this.cmdOwner[index]
    if (owner < 0 || !slotAlive(pool, owner, this.cmdOwnerGen[index])) {
      this._releaseCommand(pool, index)
      return false
    }
    this.cmdMs[index] -= deltaMs
    out.preserveFacing = true
    if (phase === 1) {
      pool.state[index] = N2_COMMAND_STATE_FREEZE
      if (this.cmdMs[index] <= 0) {
        this.cmdPhase[index] = 2
        this.cmdMs[index] += E89_COMMAND.lungeMs
        pool.state[index] = N2_COMMAND_STATE_LUNGE
      }
    }
    if (this.cmdPhase[index] === 2) {
      if (this.cmdMs[index] <= 0) {
        this._releaseCommand(pool, index)
        return false
      }
      out.velocityX = this.cmdDirX[index] * E89_COMMAND.lungeSpeed
      out.velocityZ = this.cmdDirZ[index] * E89_COMMAND.lungeSpeed
      out.moving = true
      out.hasYaw = true
      out.yaw = Math.atan2(this.cmdDirX[index], this.cmdDirZ[index])
    }
    return true
  }

  _releaseCommand(pool, index) {
    this.cmdPhase[index] = 0
    this.cmdMs[index] = 0
    this.cmdOwner[index] = -1
    pool.state[index] = 1
  }

  isCommanded(index) {
    return this.cmdPhase[index] !== 0
  }

  speedMultiplier(index) {
    return this.buffMs[index] > 0 ? E103_COFFEE.buffSpeedMul : 1
  }

  countBuffed(pool) {
    let count = 0
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) if (pool.active[index] === 1 && this.buffMs[index] > 0) count += 1
    return count
  }

  /** 행동 디스패치. a = { playerX, playerZ, posX, posZ, distance, nx, nz, speed, deltaMs }. */
  step(pool, index, a, out) {
    resetResult(out)
    const type = pool.type[index]
    if (type === E89_CODE) return this._stepE89(pool, index, a, out)
    if (type === E93_CODE) return this._stepE93(pool, index, a, out)
    if (type === E96_CODE) return this._stepE96(pool, index, a, out)
    if (type === E103_CODE) return this._stepE103(pool, index, a, out)
    if (type === E105_CODE) return this._stepE105(pool, index, a, out)
    // E99(평범한 추격 — 특이점은 사망 시 폭발)과 확장 행동형(E94/E97의 접근)은 단순 추격.
    out.velocityX = a.nx * a.speed
    out.velocityZ = a.nz * a.speed
    out.moving = true
    pool.state[index] = N2_STATE_APPROACH
    return out
  }

  _chase(a, out, speed) {
    out.velocityX = a.nx * speed
    out.velocityZ = a.nz * speed
    out.moving = speed > 0
    return out
  }

  // ── E89 ─────────────────────────────────────────────────────────────────────
  _stepE89(pool, index, a, out) {
    const C = E89_COMMAND
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    if (state === N2_STATE_APPROACH) {
      pool.state[index] = N2_STATE_APPROACH
      const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= C.firstDelayMs && a.distance <= C.triggerDistance
      if (ready && expansionChannelFree() && this._countCommandable(pool, index, pool.posX[index], pool.posZ[index]) > 0) {
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.telegraphMs
        this.chiefCenterX[index] = pool.posX[index]
        this.chiefCenterZ[index] = pool.posZ[index]
        this._addSnapshot(makeZeroDamageSnapshot(`${COMMAND_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`, 'E89', 'e89_command',
          'disk', pool.posX[index], pool.posZ[index], C.radius, 0, C.telegraphMs, 0, 0), pool, index)
        out.noContact = true
        out.preserveFacing = true
        return out
      }
      return this._chase(a, out, a.speed)
    }
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      this._advanceOwnedSnapshot(`${COMMAND_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`, a.deltaMs)
      if (pool.stateTimer[index] > 0) return out
      this._removeSnapshot(`${COMMAND_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`)
      this._issueCommand(pool, index, a.playerX, a.playerZ)
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = C.freezeMs + C.lungeMs + C.recoverMs
      pool.attackCooldown[index] = C.cooldownMs
      return out
    }
    // RECOVER(인사): 정지.
    out.preserveFacing = true
    if (pool.stateTimer[index] <= 0) pool.state[index] = N2_STATE_APPROACH
    return out
  }

  _countCommandable(pool, chiefIndex, cx, cz) {
    let count = 0
    const r2 = E89_COMMAND.radius * E89_COMMAND.radius
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (index === chiefIndex || pool.active[index] !== 1 || !COMMANDABLE_CODES.has(pool.type[index]) || this.cmdPhase[index] !== 0) continue
      const dx = pool.posX[index] - cx
      const dz = pool.posZ[index] - cz
      if (dx * dx + dz * dz <= r2) count += 1
    }
    return count
  }

  _issueCommand(pool, chiefIndex, playerX, playerZ) {
    const cx = this.chiefCenterX[chiefIndex]
    const cz = this.chiefCenterZ[chiefIndex]
    const r2 = E89_COMMAND.radius * E89_COMMAND.radius
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    let issued = 0
    for (let index = 0; index <= highest && issued < E89_COMMAND.maxCommanded; index += 1) {
      if (index === chiefIndex || pool.active[index] !== 1 || !COMMANDABLE_CODES.has(pool.type[index]) || this.cmdPhase[index] !== 0) continue
      const dx = pool.posX[index] - cx
      const dz = pool.posZ[index] - cz
      if (dx * dx + dz * dz > r2) continue
      this._claimSlot(pool, index)
      const px = playerX - pool.posX[index]
      const pz = playerZ - pool.posZ[index]
      const len = Math.hypot(px, pz)
      this.cmdDirX[index] = len > 1e-6 ? px / len : 0
      this.cmdDirZ[index] = len > 1e-6 ? pz / len : 1
      this.cmdPhase[index] = 1
      this.cmdMs[index] = E89_COMMAND.freezeMs
      this.cmdOwner[index] = chiefIndex
      this.cmdOwnerGen[index] = pool.generation[chiefIndex]
      pool.state[index] = N2_COMMAND_STATE_FREEZE
      issued += 1
    }
    return issued
  }

  _advanceOwnedSnapshot(key, deltaMs) {
    const snapshot = expansionAttackSnapshots.get(key)
    if (snapshot) advanceExpansionSnapshot(snapshot, { deltaMs, playerX: this.playerX, playerZ: this.playerZ })
  }

  // ── E93 ─────────────────────────────────────────────────────────────────────
  _stepE93(pool, index, a, out) {
    pool.state[index] = N2_STATE_APPROACH
    const target = this.shadowTargetInto(this._shadowScratch ??= { x: 0, z: 0 }, a.playerX, a.playerZ)
    const dx = target.x - a.posX
    const dz = target.z - a.posZ
    const dist = Math.hypot(dx, dz)
    if (dist <= E93_SHADOW.arriveDistance) return out
    const speed = dist > E93_SHADOW.catchUpDistance ? E93_SHADOW.catchUpSpeed : a.speed
    const step = Math.min(speed, dist / Math.max(1e-6, a.deltaMs / 1000))
    out.velocityX = dx / dist * step
    out.velocityZ = dz / dist * step
    out.moving = true
    return out
  }

  // ── E96 ─────────────────────────────────────────────────────────────────────
  _stepE96(pool, index, a, out) {
    const D = E96_DRIBBLE
    const beat = this.beatIndex()
    const prev = pool.state[index]
    if (beat === 3) {
      if (prev !== N2_STATE_TELEGRAPH) {
        // 예고 시작 = 방향 확정(그 뒤로 추적하지 않는다).
        pool.runDirX[index] = a.distance > 1e-6 ? a.nx : 0
        pool.runDirZ[index] = a.distance > 1e-6 ? a.nz : 1
      }
      pool.state[index] = N2_STATE_TELEGRAPH
      out.noContact = true
      out.preserveFacing = true
      return out
    }
    if (beat === 0 && (prev === N2_STATE_TELEGRAPH || prev === N2_STATE_ATTACK)) {
      pool.state[index] = N2_STATE_ATTACK
      out.velocityX = pool.runDirX[index] * D.lungeSpeed
      out.velocityZ = pool.runDirZ[index] * D.lungeSpeed
      out.moving = true
      out.preserveFacing = true
      out.hasYaw = true
      out.yaw = Math.atan2(pool.runDirX[index], pool.runDirZ[index])
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    if (this.beatElapsedMs() < D.stepMs) return this._chase(a, out, D.stepSpeed)
    return out
  }

  // ── E103 ─────────────────────────────────────────────────────────────────────
  _stepE103(pool, index, a, out) {
    const C = E103_COFFEE
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      const key = `${COFFEE_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`
      this._advanceOwnedSnapshot(key, a.deltaMs)
      if (pool.stateTimer[index] > 0) return out
      this._removeSnapshot(key)
      const target = this.coffeeTarget[index]
      if (target >= 0 && slotAlive(pool, target, this.coffeeTargetGen[index]) && isBuffableTypeCode(pool.type[target])
        && this.countBuffed(pool) < C.maxBuffed) {
        this._claimSlot(pool, target)
        this.buffMs[target] = C.buffMs
      }
      this.coffeeTarget[index] = -1
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = C.recoverMs
      pool.attackCooldown[index] = C.cooldownMs
      return out
    }
    if (state === N2_STATE_RECOVER) {
      out.preserveFacing = true
      if (pool.stateTimer[index] <= 0) pool.state[index] = N2_STATE_APPROACH
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    if (pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= C.firstDelayMs && expansionChannelFree()
      && this.countBuffed(pool) < C.maxBuffed) {
      const target = this.pickCoffeeTarget(pool, index)
      if (target >= 0) {
        this.coffeeTarget[index] = target
        this.coffeeTargetGen[index] = pool.generation[target]
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.telegraphMs
        const dx = pool.posX[target] - a.posX
        const dz = pool.posZ[target] - a.posZ
        const len = Math.hypot(dx, dz) || 1
        const snapshot = makeZeroDamageSnapshot(`${COFFEE_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`, 'E103', 'e103_coffee',
          'line', a.posX, a.posZ, Math.max(0.3, len), 0.3, C.telegraphMs, 0, 0)
        snapshot.yaw = Math.atan2(dx / len, dz / len)
        snapshot.directionXZ = [dx / len, dz / len]
        this._addSnapshot(snapshot, pool, index)
        out.noContact = true
        out.preserveFacing = true
        return out
      }
    }
    // 지원형 이동: 플레이어와 4~6u를 유지하고, 그 사이에서는 천천히 옆걸음.
    if (a.distance < C.minDist) {
      out.velocityX = -a.nx * a.speed; out.velocityZ = -a.nz * a.speed; out.moving = true
    } else if (a.distance > C.maxDist) {
      out.velocityX = a.nx * a.speed; out.velocityZ = a.nz * a.speed; out.moving = true
    } else {
      const side = (index & 1) === 0 ? 1 : -1
      out.velocityX = -a.nz * a.speed * 0.5 * side; out.velocityZ = a.nx * a.speed * 0.5 * side; out.moving = true
    }
    return out
  }

  /** 셔틀 반경 4u 안에서 가장 가까운, 아직 커피를 안 받은 일반 좀비. 없으면 -1. */
  pickCoffeeTarget(pool, shuttleIndex) {
    const r2 = E103_COFFEE.pickRadius * E103_COFFEE.pickRadius
    const x = pool.posX[shuttleIndex]
    const z = pool.posZ[shuttleIndex]
    let best = -1
    let bestD2 = Infinity
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (index === shuttleIndex || pool.active[index] !== 1 || !isBuffableTypeCode(pool.type[index])) continue
      if (this.slotGen[index] === pool.generation[index] && this.buffMs[index] > 0) continue
      const dx = pool.posX[index] - x
      const dz = pool.posZ[index] - z
      const d2 = dx * dx + dz * dz
      if (d2 <= r2 && d2 < bestD2) { bestD2 = d2; best = index }
    }
    return best
  }

  // ── E105 ─────────────────────────────────────────────────────────────────────
  _stepE105(pool, index, a, out) {
    const P = E105_PAIR
    const partner = this.partner[index]
    const partnerAlive = partner >= 0 && slotAlive(pool, partner, this.partnerGen[index])
    if (this.wasPaired[index] && !partnerAlive && !this.solo[index]) {
      // 짝을 잃은 첫 프레임: 넘어진다(기절 2초) → 이후 혼자 느리게.
      this.solo[index] = 1
      this.partner[index] = -1
      pool.state[index] = N2_STATE_STUN
      pool.stateTimer[index] = P.tripMs
    }
    if (pool.state[index] === N2_STATE_STUN) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_APPROACH
    }
    pool.state[index] = N2_STATE_APPROACH
    if (!partnerAlive) return this._chase(a, out, P.soloSpeed)
    const ox = pool.posX[partner]
    const oz = pool.posZ[partner]
    const pdx = ox - a.posX
    const pdz = oz - a.posZ
    const pdist = Math.hypot(pdx, pdz)
    if (pdist > P.regroupDistance) {
      // 흩어진 채 스폰됐으면 먼저 짝에게 간다.
      out.velocityX = pdx / pdist * a.speed
      out.velocityZ = pdz / pdist * a.speed
      out.moving = true
      return out
    }
    // 하나-둘: 0.4초 걷고 0.2초 멈춘다(두 몸이 같은 시계).
    const cycle = this.clockMs % (P.walkMs + P.pauseMs)
    if (cycle >= P.walkMs) return out
    const cx = (a.posX + ox) * 0.5
    const cz = (a.posZ + oz) * 0.5
    const hx = a.playerX - cx
    const hz = a.playerZ - cz
    const hl = Math.hypot(hx, hz) || 1
    const ux = hx / hl
    const uz = hz / hl
    // 진행 방향의 옆으로 0.3u씩 갈라 선다(낮은 슬롯이 왼쪽).
    const side = index < partner ? -1 : 1
    const wantX = cx - uz * side * P.spacing * 0.5
    const wantZ = cz + ux * side * P.spacing * 0.5
    out.velocityX = ux * a.speed + (wantX - a.posX) * P.springGain
    out.velocityZ = uz * a.speed + (wantZ - a.posZ) * P.springGain
    out.moving = true
    out.hasYaw = true
    out.yaw = Math.atan2(ux, uz)
    return out
  }
}

/** 피해 0 예고 스냅샷(시각 전용). 확장 텔레그래프 레이어가 노란 채움으로 그린다. 탈출 인증이 필요 없다(피해가 없다). */
export function makeZeroDamageSnapshot(key, type, patternId, shape, x, z, rangeUnits, widthUnits, windupMs, activeMs, recoveryMs) {
  return {
    id: patternId, patternId, type, key, attackId: key, sourceEntityId: key, shape,
    originXZ: [x, z], sourceXZ: [x, z], targetXZ: [x, z], directionXZ: [0, 1], yaw: 0,
    rangeUnits, widthUnits, windupMs, activeMs, recoveryMs, damage: 0, maxHitsPerTarget: 0,
    phase: 'windup', elapsedMs: 0, hit: false, novel2: true, zeroDamage: true,
  }
}

export function createNovel2Runtime(capacity) {
  return new Novel2Runtime(capacity)
}

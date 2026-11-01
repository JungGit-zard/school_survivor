// 정화된 학생(purified student) 사망 연출 풀. 좀비가 부서진 뒤 바닥에 주저앉아 머리를 흔드는
// 학생이 잠깐 보였다 사라진다(Terry 2026-10-31: 좀비가 학생으로 정화되었음을 암시).
// 순수 시각 연출이다: 충돌·게임플레이·XP 젬·픽업과 무관하다.
// 고정 SoA 링 풀이라 스폰·갱신 모두 무할당이다. React/Three/Firebase/storage 의존이 없다.

export const PURIFIED_STUDENT_CAPACITY = 24
// 부서짐(EnemyDeathCollapse 780ms)이 흩어진 뒤 나타난다.
export const PURIFIED_STUDENT_DELAY_MS = 320
export const PURIFIED_STUDENT_FADE_IN_MS = 140
export const PURIFIED_STUDENT_VISIBLE_MS = 820
export const PURIFIED_STUDENT_FADE_OUT_MS = 300
export const PURIFIED_STUDENT_LIFETIME_MS = PURIFIED_STUDENT_DELAY_MS + PURIFIED_STUDENT_VISIBLE_MS
// 포화 시 가장 오래된 슬롯을 재활용하되, 아직 잘 보이는 중(이 나이 미만)이면 스폰을 건너뛴다.
export const PURIFIED_STUDENT_RECYCLE_MIN_AGE_MS = PURIFIED_STUDENT_LIFETIME_MS - PURIFIED_STUDENT_FADE_OUT_MS
// 프레임이 이보다 느리면(약 20fps 미만) 새 연출을 만들지 않는다.
export const PURIFIED_STUDENT_BUSY_FRAME_MS = 50

const UNIFORM_LIGHTEN = 0.12

function mixHex(hex, toward, t) {
  const r = (hex >> 16) & 255; const g = (hex >> 8) & 255; const b = hex & 255
  const tr = (toward >> 16) & 255; const tg = (toward >> 8) & 255; const tb = toward & 255
  return (Math.round(r + (tr - r) * t) << 16) | (Math.round(g + (tg - g) * t) << 8) | Math.round(b + (tb - b) * t)
}

// 교복 색: 좀비 몸통(상의) 팔레트를 약간 밝혀 상의로, 하의는 팔레트 bottom 또는 상의를 어둡게.
export function purifiedUniformColors(palette, out) {
  const body = Number.isFinite(palette?.body) ? palette.body : 0x4a7a2c
  out[0] = mixHex(body, 0xffffff, UNIFORM_LIGHTEN)
  out[1] = Number.isFinite(palette?.bottom) ? palette.bottom : mixHex(body, 0x101018, 0.55)
  return out
}

export function createPurifiedStudentPool(capacity = PURIFIED_STUDENT_CAPACITY) {
  return {
    capacity,
    active: new Uint8Array(capacity),
    age: new Float32Array(capacity),
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    z: new Float32Array(capacity),
    scale: new Float32Array(capacity),
    yaw: new Float32Array(capacity),
    phase: new Float32Array(capacity),
    top: new Uint32Array(capacity),
    bottom: new Uint32Array(capacity),
    activeCount: 0,
    busy: false,
    spawned: 0,
    skipped: 0,
    recycled: 0,
    _seq: 0,
  }
}

const _colors = [0, 0]

// palette = ZOMBIE_PALETTE[type] (body/bottom). 스폰했으면 슬롯 번호, 건너뛰었으면 -1.
export function spawnPurifiedStudent(pool, x, y, z, visualScale, palette) {
  if (pool.busy || !Number.isFinite(x) || !Number.isFinite(z)) { pool.skipped += 1; return -1 }
  let slot = -1
  let oldest = -1
  let oldestAge = -1
  for (let i = 0; i < pool.capacity; i += 1) {
    if (!pool.active[i]) { slot = i; break }
    if (pool.age[i] > oldestAge) { oldestAge = pool.age[i]; oldest = i }
  }
  if (slot < 0) {
    if (oldestAge < PURIFIED_STUDENT_RECYCLE_MIN_AGE_MS) { pool.skipped += 1; return -1 }
    slot = oldest
    pool.recycled += 1
  } else {
    pool.activeCount += 1
  }
  const seq = pool._seq = (pool._seq + 1) % 9973
  pool.active[slot] = 1
  pool.age[slot] = 0
  pool.x[slot] = x
  pool.y[slot] = Number.isFinite(y) ? y : 0
  pool.z[slot] = z
  pool.scale[slot] = Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 1
  // 대체로 카메라(+Z) 쪽을 보며 앉는다. 결정론적 변주(Math.random 없음).
  pool.yaw[slot] = ((seq * 0.6180339887) % 1 - 0.5) * 1.1
  pool.phase[slot] = (seq * 2.399963) % 6.2831853
  purifiedUniformColors(palette, _colors)
  pool.top[slot] = _colors[0]
  pool.bottom[slot] = _colors[1]
  pool.spawned += 1
  return slot
}

export function advancePurifiedStudents(pool, deltaMs) {
  const step = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0
  pool.busy = step > PURIFIED_STUDENT_BUSY_FRAME_MS
  for (let i = 0; i < pool.capacity; i += 1) {
    if (!pool.active[i]) continue
    pool.age[i] += step
    if (pool.age[i] >= PURIFIED_STUDENT_LIFETIME_MS) { pool.active[i] = 0; pool.activeCount -= 1 }
  }
}

export function resetPurifiedStudents(pool) {
  pool.active.fill(0); pool.age.fill(0); pool.activeCount = 0; pool.busy = false
}

// 0..1. 지연 구간에는 0(아직 부서지는 중).
export function getPurifiedStudentOpacity(ageMs) {
  const t = ageMs - PURIFIED_STUDENT_DELAY_MS
  if (t <= 0) return 0
  if (t < PURIFIED_STUDENT_FADE_IN_MS) return t / PURIFIED_STUDENT_FADE_IN_MS
  const fadeStart = PURIFIED_STUDENT_VISIBLE_MS - PURIFIED_STUDENT_FADE_OUT_MS
  if (t < fadeStart) return 1
  return Math.max(0, 1 - (t - fadeStart) / PURIFIED_STUDENT_FADE_OUT_MS)
}

// 멍하게 머리를 흔든다: 처음엔 크게, 점점 잦아든다(라디안, z축 기울기와 y축 도리질).
export function getPurifiedStudentHeadShake(ageMs, phase, out) {
  const t = Math.max(0, ageMs - PURIFIED_STUDENT_DELAY_MS) / 1000
  const decay = 0.45 + 0.55 * Math.exp(-t * 2.2)
  out[0] = Math.sin(t * 13 + phase) * 0.30 * decay
  out[1] = Math.sin(t * 7.5 + phase * 0.5) * 0.35 * decay
  return out
}

// 게임 전역 단일 풀. Enemies.jsx 사망 경로가 넣고 PurifiedStudentLayer가 그린다.
export const purifiedStudentPool = createPurifiedStudentPool()

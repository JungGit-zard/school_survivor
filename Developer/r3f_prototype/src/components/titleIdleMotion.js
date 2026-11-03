// 2026-11-03 타이틀 Stage 2: 타이틀 군중의 "손으로 만든 듯한" 대기 동작.
// 규칙: 캐릭터마다 자기 박자(주기 1.6–3.2s, 위상 제각각, 작은 진폭) — 절대 동기화하지 않는다.
// 절대법칙(STUDIO_GAME_TITLE_CHARACTER_ABSOLUTE_LAW): 타이틀 전용 동작은 완성된 Studio 캐릭터 바깥
// 래퍼 그룹에만 건다. 그래서 여기서는 래퍼 그룹의 position/rotation/scale만 쓰고 모델 내부 파츠는 만지지 않는다.
// 래퍼의 기본값은 항등(0/0/1)이라 기존 위치·포즈 위에 더해질 뿐이다.

// 결정적 의사난수(mulberry32) — 새로고침마다 같은 엇박자, 테스트·스크린샷도 안정적이다.
function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const TITLE_IDLE_PERIOD_MIN = 1.6
export const TITLE_IDLE_PERIOD_MAX = 3.2
const TAU = Math.PI * 2

// kind: zombie | boss | dog | critter | player. glance: 가끔 로자리 쪽으로 몸을 기울여 쳐다보는 좀비.
const TITLE_IDLE_ACTOR_DEFS = [
  { id: 'player', kind: 'player' },
  { id: 'bossB02', kind: 'boss' },
  { id: 'bossB03', kind: 'boss' },
  { id: 'bossB01', kind: 'boss' },
  { id: 'zombieE03Far', kind: 'zombie' },
  { id: 'zombieE02Far', kind: 'zombie' },
  { id: 'zombieE01', kind: 'zombie', glance: -1 },
  { id: 'zombieE02', kind: 'zombie', glance: 1 },
  { id: 'zombieE03', kind: 'zombie', glance: -1 },
  { id: 'matilda', kind: 'zombie' },
  { id: 'dogeTwist', kind: 'dog' },
  { id: 'dogeDisco', kind: 'dog' },
  { id: 'duck', kind: 'critter' },
  { id: 'chibiko', kind: 'critter' },
]

function buildActors() {
  const rand = seededRandom(0x5c4001)
  const count = TITLE_IDLE_ACTOR_DEFS.length
  // 주기는 범위를 고르게 나눈 칸에서 하나씩 뽑아 서로 겹치지 않게 하고, 순서는 섞는다.
  const slots = TITLE_IDLE_ACTOR_DEFS.map((_, i) => i)
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  const span = (TITLE_IDLE_PERIOD_MAX - TITLE_IDLE_PERIOD_MIN) / count
  return TITLE_IDLE_ACTOR_DEFS.map((def, i) => {
    const period = TITLE_IDLE_PERIOD_MIN + span * (slots[i] + 0.15 + rand() * 0.7)
    return {
      ...def,
      period,
      phase: rand() * TAU,
      // 두 번째 축은 다른 주기(무리수비 근처)라 움직임이 반복돼 보이지 않는다.
      period2: period * (1.37 + rand() * 0.3),
      phase2: rand() * TAU,
      // 가끔 일어나는 사건(쳐다보기·어깨 들썩·고개 갸웃·깡충)의 주기와 시작 시점.
      eventCycle: 5.5 + rand() * 4.5,
      eventOffset: rand() * 10,
      eventHold: 1 + rand(),
      amp: 0.85 + rand() * 0.3,
    }
  })
}

export const TITLE_IDLE_ACTORS = buildActors()
// critter 쪼기 포락선용 재사용 객체 — 프레임마다 객체를 만들지 않는다.
const PECK_SCRATCH = { eventCycle: 1, eventOffset: 0, eventHold: 0.12 }
export const TITLE_IDLE_ACTOR_BY_ID = Object.fromEntries(TITLE_IDLE_ACTORS.map((actor) => [actor.id, actor]))

function smooth01(x) {
  const c = x < 0 ? 0 : x > 1 ? 1 : x
  return c * c * (3 - 2 * c)
}

// 사건 포락선: ease-in → hold → ease-out, 나머지 구간은 0.
function eventEnvelope(actor, t, easeIn, easeOut) {
  const local = ((t + actor.eventOffset) % actor.eventCycle + actor.eventCycle) % actor.eventCycle
  const holdEnd = easeIn + actor.eventHold
  if (local < easeIn) return smooth01(local / easeIn)
  if (local < holdEnd) return 1
  if (local < holdEnd + easeOut) return 1 - smooth01((local - holdEnd) / easeOut)
  return 0
}

// 짧은 사건(깡충·쪼기) 포락선: 0→1→0 한 번.
function pulseEnvelope(actor, t, duration) {
  const local = ((t + actor.eventOffset) % actor.eventCycle + actor.eventCycle) % actor.eventCycle
  if (local >= duration) return 0
  return Math.sin((local / duration) * Math.PI)
}

export function resetTitleIdleOffsets(out) {
  out.x = 0; out.y = 0; out.z = 0
  out.rx = 0; out.ry = 0; out.rz = 0
  out.sx = 1; out.sy = 1; out.sz = 1
  return out
}

export function createTitleIdleOffsets() {
  return resetTitleIdleOffsets({})
}

// 순수 함수: actor와 시각 t로 래퍼 오프셋을 out에 쓴다(할당 없음).
export function computeTitleIdleOffsets(actor, t, out) {
  resetTitleIdleOffsets(out)
  const w = TAU / actor.period
  const w2 = TAU / actor.period2
  const s1 = Math.sin(t * w + actor.phase)
  const s2 = Math.sin(t * w2 + actor.phase2)
  const a = actor.amp

  switch (actor.kind) {
    case 'player': {
      // 숨쉬기: y ≤ 0.02, 세로 스케일 ≤ 1.5%.
      const breath = (s1 + 1) * 0.5
      out.y = breath * 0.02
      out.sy = 1 + breath * 0.015
      out.sx = out.sz = 1 - breath * 0.004
      break
    }
    case 'boss': {
      // 무거운 숨: 몸통 스케일 1→1.02, 느린 주기(주기 ×1.25). 가끔 어깨 들썩(살짝 들리고 앞으로 숙임).
      const breath = (Math.sin(t * w * 0.8 + actor.phase) + 1) * 0.5
      const heave = pulseEnvelope(actor, t, 0.9)
      out.sx = out.sz = 1 + breath * 0.012
      out.sy = 1 + breath * 0.02 + heave * 0.012
      out.y = heave * 0.04
      out.rx = heave * 0.05
      out.rz = s2 * 0.012 * a
      break
    }
    case 'zombie': {
      // 느린 좌우 흔들림 + 두 배 박자의 작은 끄덕임(몸 전체 — 머리 파츠는 Studio 정본이라 만지지 않는다).
      out.rz = s1 * 0.045 * a
      out.x = s1 * 0.015 * a
      out.y = Math.abs(Math.sin(t * w + actor.phase)) * 0.018 * a
      out.rx = s2 * 0.03 * a
      if (actor.glance) {
        // 가끔 로자리 쪽으로 몸을 돌려 기울여 본다: ease-in 0.5s → hold 1–2s → ease-out 0.6s.
        const look = eventEnvelope(actor, t, 0.5, 0.6)
        out.ry += look * 0.14 * actor.glance
        out.rx += look * 0.08
        out.rz += look * 0.05 * actor.glance
      }
      break
    }
    case 'dog': {
      // 가끔 고개(몸) 갸웃 + 꼬리 쪽 엉덩이 살랑(작은 yaw 흔들림).
      const tilt = eventEnvelope(actor, t, 0.35, 0.45)
      out.rz = tilt * 0.12 * (actor.phase > Math.PI ? 1 : -1)
      out.ry = s1 * 0.05 * a
      out.y = Math.max(0, s2) * 0.012
      break
    }
    case 'critter': {
      // 몇 초마다 작은 깡충 + 앞으로 콕 쪼기.
      const hop = pulseEnvelope(actor, t, 0.38)
      PECK_SCRATCH.eventCycle = actor.eventCycle
      PECK_SCRATCH.eventOffset = actor.eventOffset + actor.eventCycle * 0.5
      const peck = eventEnvelope(PECK_SCRATCH, t, 0.12, 0.18)
      out.y = hop * 0.07
      out.rx = peck * 0.22
      out.rz = s1 * 0.025 * a
      out.sy = 1 - hop * 0.04 + Math.max(0, -s1) * 0.01
      break
    }
    default:
      break
  }
  return out
}

export function applyTitleIdleOffsets(node, out) {
  if (!node) return
  node.position.set(out.x, out.y, out.z)
  node.rotation.set(out.rx, out.ry, out.rz)
  node.scale.set(out.sx, out.sy, out.sz)
}

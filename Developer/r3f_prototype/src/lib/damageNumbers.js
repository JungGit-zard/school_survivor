// 데미지 숫자 플로팅 표시 전용 이벤트 버스 + 순수 헬퍼.
// 게임플레이 코드는 emitDamageNumber만 호출하고, DamageNumbersLayer가 풀링·렌더·정리를 책임진다.
// VFX 버스(vfxEvents)와 분리한 이유: 데미지 숫자는 자체 풀(고정 슬롯 재활용) 정책을 쓰므로
// VFXLayer의 MAX_ACTIVE 큐에 섞이면 안 된다.

const listeners = new Set()

// 적 피해는 연노랑(흰색 계열), 플레이어 피해는 빨강.
export const DAMAGE_NUMBER_COLORS = {
  enemy: '#fff4c2',
  player: '#ff5347',
  critical: '#ffb000',
}

// 수명/상승/페이드 파라미터. "아주 작게 · 짧게 떴다 사라짐".
export const DAMAGE_NUMBER_LIFE_MS = 620
export const DAMAGE_NUMBER_RISE = 0.9      // 수명 동안 위로 떠오르는 월드 거리
export const DAMAGE_NUMBER_FADE_START = 0.45 // t가 이 값을 넘으면 페이드 시작

// 게임플레이 → 레이어. y는 대상 머리 위 높이(월드).
export function emitDamageNumber(event) {
  if (listeners.size === 0) return
  listeners.forEach((fn) => fn(event))
}

export function subscribeDamageNumber(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// 표시 문자열. 반올림 후 0 이하면 null(표시 생략).
export function formatDamageAmount(amount) {
  if (!Number.isFinite(amount)) return null
  const rounded = Math.round(amount)
  if (rounded <= 0) return null
  return String(rounded)
}

// 풀에서 슬롯 하나 고르기: 비활성 우선, 없으면 가장 오래된 활성 슬롯 재활용.
export function pickDamageNumberSlot(slots, now = performance.now()) {
  let oldestIdx = 0
  let oldestStart = Infinity
  for (let i = 0; i < slots.length; i += 1) {
    if (!slots[i].active) return i
    if (slots[i].startMs < oldestStart) {
      oldestStart = slots[i].startMs
      oldestIdx = i
    }
  }
  return oldestIdx
}

function clamp01(v) {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

// 슬롯 한 개의 프레임 상태(순수). y(월드 높이), opacity, scale(팝), done 반환.
export function computeDamageNumberFrame(slot, now = performance.now()) {
  const life = slot.life || DAMAGE_NUMBER_LIFE_MS
  const age = now - slot.startMs
  const t = clamp01(age / life)
  const done = age >= life
  // 상승: ease-out(초반 빠르게, 후반 느리게)
  const rise = DAMAGE_NUMBER_RISE * (1 - (1 - t) * (1 - t))
  const y = (slot.y0 ?? 0) + rise
  // 페이드: FADE_START 전까지 불투명, 이후 선형 감쇠
  const opacity = t < DAMAGE_NUMBER_FADE_START
    ? 1
    : clamp01(1 - (t - DAMAGE_NUMBER_FADE_START) / (1 - DAMAGE_NUMBER_FADE_START))
  // 팝: 처음 아주 잠깐 살짝 커졌다 원래 크기로.
  const pop = 1 + 0.35 * Math.max(0, 1 - t / 0.16)
  return { t, y, opacity, scale: pop, done }
}

// 겹침 완화용 소량 랜덤 오프셋.
export function damageNumberJitter() {
  return { x: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.24 }
}

// reducedEffects 설정 시 데미지 숫자 생략(기존 가드 패턴과 동일).
export function damageNumbersEnabled() {
  if (typeof document === 'undefined') return true
  return document.documentElement?.dataset?.reducedEffects !== 'true'
}

export function getBellSonicRingConfigs() {
  return [
    { shape: 'ring', geometry: 'torus', scaleOffset: 0, opacityMult: 1 },
    { shape: 'ring', geometry: 'torus', scaleOffset: 0.16, opacityMult: 0.78 },
    { shape: 'ring', geometry: 'torus', scaleOffset: 0.32, opacityMult: 0.56 },
    { shape: 'ring', geometry: 'torus', scaleOffset: 0.48, opacityMult: 0.34 },
  ]
}

// 벨 이펙트 그래픽만 1.5배 확대 (2026-07-04 기획).
// 공격 판정(applyRadialDamage의 radius)은 건드리지 않는다 — 순수 시각 배율.
export const BELL_VISUAL_SCALE = 1.5

// 음표 이펙트 수명(ms). 링(520ms)보다 길게 떠올랐다 사라진다.
export const BELL_NOTE_LIFETIME_MS = 780

// 펄스 1회당 떠오르는 2D 음표 스펙. 순수 함수 — 테스트 시임.
// variant: 'single'(♪) | 'double'(♫) 교대. angle은 원 둘레에 고르게 + 지터.
export function createBellNoteSpecs(count = 3, random = Math.random) {
  const specs = []
  for (let i = 0; i < count; i++) {
    specs.push({
      variant: i % 2 === 0 ? 'single' : 'double',
      angle: (i / count) * Math.PI * 2 + random() * 0.9,
      dist: 0.35 + random() * 0.3,       // 벨 주변 시작 반경
      riseHeight: 0.85 + random() * 0.3, // 수명 동안 떠오르는 높이
      swayPhase: random() * Math.PI * 2, // 좌우 흔들림 위상
      scale: 0.5 + random() * 0.2,
      delayMs: i * 90,                   // 순차 등장
    })
  }
  return specs
}

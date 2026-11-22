// 공격 예고(바닥 경고) 공용 팔레트 — three 의존 없는 순수 모듈(시뮬레이션·풀 lib에서도 import 가능).
// 2026-11-22 Terry "모든 공격궤도 표시자는 채도를 낮추고 끝에 블러를 넣어 세련되게 표시할 것".
// 모든 경고 색은 이 파일 한 곳에서 나온다. 원래(네온) 색을 TELEGRAPH_SOURCE_COLORS에 두고, 같은 규칙
// muteTelegraphColor로 한 번에 누른다. 각 사이트는 TELEGRAPH_PALETTE의 역할 이름만 쓴다(사이트마다 색 리터럴을 두지 않는다).
// 가장자리 번짐 지오메트리는 lib/telegraphStyle.js(이 파일을 다시 내보낸다).

// ── 색 ──────────────────────────────────────────────────────────────────────
// 채도 ×0.7, 명도는 0.45 쪽으로 30% 당긴다(네온이 빠지고 살짝 차분해진다). 채도가 빠진 만큼 바닥과의 대비(ΔE)가 줄어드므로
// 불투명도는 ×1.3(상한 0.92)으로 보정한다 — 잔디·나무·타일·트랙·포장 6종 바닥 근사색에서 대비 평균이 이전과 같고(1.05배)
// 가장 나쁜 경우(나무 바닥 위 주황 착탄 원)도 이전의 0.78배다. 근거: F:/ezs-work/backup/telegraph_style_20261122/.
export const TELEGRAPH_MUTE = Object.freeze({ saturationScale: 0.7, lightnessTarget: 0.45, lightnessPull: 0.3 })
export const TELEGRAPH_OPACITY = Object.freeze({ gain: 1.3, max: 0.92 })
/** 예전 불투명도 → 채도를 낮춘 색에 맞춘 불투명도(×gain, 상한 max). */
export function telegraphOpacity(base) {
  return Math.min(TELEGRAPH_OPACITY.max, Math.round(base * TELEGRAPH_OPACITY.gain * 1000) / 1000)
}

function hexToRgb(hex) {
  const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}
function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`
}
// sRGB 값 그대로의 HSL(색공간 변환 없음 — 디자이너가 고른 hex와 같은 공간에서 누른다).
export function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q
  const k = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [k(h + 1 / 3), k(h), k(h - 1 / 3)]
}
/** 네온 경고색 → 채도를 낮춘 경고색('#rrggbb'). 색상(hue)은 그대로라 빨강은 빨강, 노랑은 노랑으로 읽힌다. */
export function muteTelegraphColor(hex) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex))
  const M = TELEGRAPH_MUTE
  return rgbToHex(...hslToRgb(h, s * M.saturationScale, l + (M.lightnessTarget - l) * M.lightnessPull))
}

// 원래 색(2026-11-22 이전 각 사이트의 리터럴). 역할 이름 = 사이트·상태.
export const TELEGRAPH_SOURCE_COLORS = Object.freeze({
  caution: '#f5ce69', // 확장 보스·확장 적 windup(노랑)
  strike: '#f88578', // 확장 보스·확장 적 active
  danger: '#e5333d', // 2차 신규 좀비 피해 예고 windup(빨강)
  dangerStrike: '#c8102e', // 2차 신규 좀비 피해 예고 active
  stamp: '#d7263d', // B10 결재 도장 무늬
  blockade: '#22cbd2', // B02 복도 봉쇄선 예고
  blockadeActive: '#24edf0', // B02 봉쇄선 활성
  blockadeDone: '#0d6570', // B02 봉쇄선 종료
  shuttle: '#f5b83d', // B03 왕복달리기 레인 예고
  shuttleOutbound: '#ffd34e', // B03 가는 길
  shuttleReturn: '#e6a81f', // B03 돌아오는 길
  shuttleStun: '#c99a43', // B03 기절(안전)
  soup: '#f4ad32', // B04 국물 대폭발 예고
  soupBlast: '#ff6b1f', // B04 폭발
  cauldron: '#ffe576', // Stage 4 압력솥 끓는 중
  cauldronFire: '#ff6b24', // Stage 4 압력솥 분출
  impactMarker: '#ff8a2a', // 투사체 좀비 착탄 예정 원
  aimLine: '#ff3b3b', // 투사체 좀비 조준선
})
export const TELEGRAPH_PALETTE = Object.freeze(Object.fromEntries(
  Object.entries(TELEGRAPH_SOURCE_COLORS).map(([role, hex]) => [role, muteTelegraphColor(hex)]),
))
/** 팔레트 색을 0xrrggbb 숫자로(InstancedMesh setColorAt·THREE.Color.setHex용). */
export function telegraphHex(role) {
  return parseInt(TELEGRAPH_PALETTE[role].slice(1), 16)
}
/** 팔레트에 없는 임의 색(예: 이벤트가 넘긴 돌진 화살표 색 — VFXLayer ChargeWarningLine)을 같은 규칙으로 누른 숫자. */
export function mutedTelegraphHex(color) {
  return parseInt(muteTelegraphColor(color).slice(1), 16)
}

import { useEffect, useState } from 'react'
import { subscribeB10StampImpact } from '../lib/b10StampImpact.js'
import { B10_STAMP_DECAL } from './expansion/expansionTelegraphs.js'

// Stage 5 B10 교감 좀비 「결재 도장」 타격 순간 화면 도장 자국(2026-11-22 Terry:
// "보스 도장찍기 필살기는 찍히는 순간 도장 그래픽을 화면에 표시").
// - 신호: lib/b10StampImpact.js (스냅샷이 active로 넘어간 첫 프레임 = 피해 판정·바닥 決 데칼·도장 SFX와 같은 프레임).
// - 모양: 바닥 데칼(getB10StampTexture)과 같은 빨강 이중 원 + "決". SVG 필터로 거친 인주 테두리·얼룩.
// - 동작: 1.3 → 1.0 쾅(살짝 떨림) → 잠깐 유지 → 0.7s 페이드. 전부 CSS 애니메이션, 게임을 멈추지 않는다.
// - 자리: 화면 가로 가운데, 세로 38%(플레이어 바로 위). 상단 HUD 띠·조이스틱보다 DOM 앞(아래 층)에 둔다.
// - pointer-events 없음, 포커스·스크린리더 대상 아님(장식).
export const B10_STAMP_IMPACT_OVERLAY = Object.freeze({
  inMs: 140,
  holdMs: 220,
  fadeMs: 700,
  totalMs: 140 + 220 + 700,
  startScale: 1.3,
  color: B10_STAMP_DECAL.color,
  glyph: '決',
})

const O = B10_STAMP_IMPACT_OVERLAY
const pct = (ms) => `${((ms / O.totalMs) * 100).toFixed(1)}%`

// 쾅: 0→inMs 동안 1.3→0.96(눌림)→1.0, 눌린 직후 2~3px 떨림. holdMs 유지 뒤 fadeMs 동안 사라진다.
// 움직임 줄이기(OS 설정 · data-reduced-effects)에서는 크기·떨림 없이 나타났다 사라지기만 한다.
const STAMP_CSS = `
@keyframes b10StampImpactThump {
  0% { transform: scale(${O.startScale}) rotate(-9deg); opacity: 0 }
  ${pct(50)} { opacity: 1 }
  ${pct(O.inMs)} { transform: scale(0.96) rotate(-9deg) translate(0, 0); opacity: 1 }
  ${pct(O.inMs + 40)} { transform: scale(1) rotate(-9deg) translate(2px, -1px) }
  ${pct(O.inMs + 80)} { transform: scale(1) rotate(-9deg) translate(-2px, 1px) }
  ${pct(O.inMs + 120)} { transform: scale(1) rotate(-9deg) translate(0, 0) }
  ${pct(O.inMs + O.holdMs)} { transform: scale(1) rotate(-9deg); opacity: 1 }
  100% { transform: scale(1) rotate(-9deg); opacity: 0 }
}
@keyframes b10StampImpactCalm {
  0% { transform: rotate(-9deg); opacity: 1 }
  ${pct(O.inMs + O.holdMs)} { transform: rotate(-9deg); opacity: 1 }
  100% { transform: rotate(-9deg); opacity: 0 }
}
.b10-stamp-impact { animation: b10StampImpactThump ${O.totalMs}ms ease-out both }
@media (prefers-reduced-motion: reduce) { .b10-stamp-impact { animation-name: b10StampImpactCalm } }
:root[data-reduced-effects="true"] .b10-stamp-impact { animation-name: b10StampImpactCalm }
`

export function B10StampMark({ size = '100%' }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" focusable="false" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {/* 거친 인주: 가장자리 미세 요동(displacement) + 큰 얼룩으로 잉크가 덜 묻은 자리. */}
        <filter id="b10-stamp-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" result="blotch" />
          <feColorMatrix in="blotch" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.15" result="inkMask" />
          <feComposite in="rough" in2="inkMask" operator="in" />
        </filter>
      </defs>
      <g filter="url(#b10-stamp-ink)" fill="none" stroke={O.color}>
        <circle cx="100" cy="100" r="86" strokeWidth="13" />
        <circle cx="100" cy="100" r="68" strokeWidth="4" />
        <text
          x="100"
          y="104"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="serif"
          fontWeight="700"
          fontSize="96"
          fill={O.color}
          stroke="none"
        >
          {O.glyph}
        </text>
      </g>
    </svg>
  )
}

export default function B10StampImpactOverlay({ gameKey, phase }) {
  const [impact, setImpact] = useState(null)

  useEffect(() => subscribeB10StampImpact((event) => {
    if (event.gameKey !== gameKey) return
    setImpact({ id: event.version })
  }), [gameKey])

  // 재시작(gameKey 변경) 시 이전 판 자국을 즉시 지운다.
  useEffect(() => { setImpact(null) }, [gameKey])

  // 페이드가 끝나면 DOM에서 뺀다. 연속 타격이면 새 id로 다시 찍힌다(키 리마운트 = 애니메이션 재시작).
  useEffect(() => {
    if (!impact) return undefined
    const timer = window.setTimeout(() => setImpact((current) => (current?.id === impact.id ? null : current)), O.totalMs)
    return () => window.clearTimeout(timer)
  }, [impact])

  if (!impact || (phase !== 'playing' && phase !== 'paused')) return null
  return (
    <div data-testid="b10-stamp-impact-overlay" aria-hidden="true" style={wrapStyle}>
      <style>{STAMP_CSS}</style>
      <div key={impact.id} data-testid="b10-stamp-impact" data-impact-id={impact.id} className="b10-stamp-impact" style={markStyle}>
        <B10StampMark />
      </div>
    </div>
  )
}

// HUD 루트는 container-type: size라 cqw/cqh가 게임 프레임 기준이다. 세로 화면 360px 폭 → 약 166px.
const STAMP_SIZE = 'min(46cqw, 30cqh, 210px)'
const wrapStyle = {
  position: 'absolute',
  left: '50%',
  top: '38%',
  width: STAMP_SIZE,
  height: STAMP_SIZE,
  transform: 'translate(-50%, -50%)',
  opacity: 0.92,
  pointerEvents: 'none',
}
const markStyle = {
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  willChange: 'transform, opacity',
}

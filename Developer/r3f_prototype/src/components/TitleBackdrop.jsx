import { useEffect, useState } from 'react'
import { sunnyPalette as P } from '../lib/uiStyle.js'

// 2026-11-03 타이틀 Stage 1(Terry): "맑은 방과후 학교" 배경. 3D 캔버스 뒤에 깔리는 평면 SVG 한 장 +
// 천천히 흐르는 구름 3개. 이미지 파일 없이 인라인 SVG만 쓴다. 외곽선은 화면 크기와 무관하게
// 같은 굵기(non-scaling-stroke)라 손으로 그린 한 장처럼 보인다. 로고·상표 문구는 넣지 않는다.
const STROKE = {
  stroke: P.line,
  strokeWidth: 2.5,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
  vectorEffect: 'non-scaling-stroke',
}

// 위층 창: 64 + i*34. 아래층은 가운데(현관) 자리를 비운다.
const UPPER_WINDOWS = [0, 1, 2, 3, 4, 5, 6]
const LOWER_WINDOWS = [0, 1, 2, 4, 5, 6]
const CURTAINED = new Set(['u1', 'u5', 'l4'])

// 구름: 트랙(프레임 폭)을 통째로 옮겨 화면 왼쪽 밖에서 오른쪽 밖까지 흐른다.
// rest는 움직임 줄이기 설정에서 멈춰 있을 자리다.
export const TITLE_CLOUDS = [
  { id: 'a', top: '7%', width: '34%', duration: 72, delay: -18, rest: '48%' },
  { id: 'b', top: '27%', width: '24%', duration: 54, delay: -40, rest: '112%' },
  { id: 'c', top: '41%', width: '29%', duration: 80, delay: -62, rest: '22%' },
]

// 2026-11-04 타이틀 Stage 3(Terry): 6~10초마다 하나씩 무작위로 벌어지는 작은 배경 이벤트.
// 소리 없음, 글자·로고 없음. 배경 레이어 안에서만 그려져서 로고/START를 가리지 않는다.
export const TITLE_EVENT_TYPES = ['zombiePeek', 'paperPlane', 'bellSwing']
export const TITLE_EVENT_MIN_DELAY = 6000
export const TITLE_EVENT_MAX_DELAY = 10000
// 좀비가 내다볼 창(커튼 없는 창만). 좌표는 학교 그룹(translate 0 -64) 안 기준.
export const TITLE_PEEK_WINDOWS = [
  ...UPPER_WINDOWS.filter((i) => !CURTAINED.has(`u${i}`)).map((i) => ({ x: 64 + i * 34, y: 348 })),
  ...LOWER_WINDOWS.filter((i) => !CURTAINED.has(`l${i}`)).map((i) => ({ x: 64 + i * 34, y: 393 })),
]

// 순수 함수: 다음 이벤트와 대기 시간(ms). 직전 이벤트는 다시 고르지 않는다.
// 움직임 줄이기 설정이면 null(이벤트 없음).
export function pickNextTitleEvent({ previous = null, reducedMotion = false, random = Math.random } = {}) {
  if (reducedMotion) return null
  const pool = TITLE_EVENT_TYPES.filter((t) => t !== previous)
  const type = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
  const span = TITLE_EVENT_MAX_DELAY - TITLE_EVENT_MIN_DELAY
  const delay = TITLE_EVENT_MIN_DELAY + Math.min(span, Math.round(random() * span))
  const windowIndex = Math.min(TITLE_PEEK_WINDOWS.length - 1, Math.floor(random() * TITLE_PEEK_WINDOWS.length))
  return { type, delay, windowIndex }
}

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}

// setTimeout 하나로 다음 이벤트를 예약한다. 이벤트 길이(최대 5초)가 최소 대기 6초보다 짧아 한 번에 하나만 보인다.
function useTitleAmbientEvent() {
  const [event, setEvent] = useState(null)
  useEffect(() => {
    let timer = null
    let previous = null
    let serial = 0
    const schedule = () => {
      const next = pickNextTitleEvent({ previous, reducedMotion: prefersReducedMotion() })
      if (!next) return
      timer = setTimeout(() => {
        previous = next.type
        serial += 1
        setEvent({ ...next, key: serial })
        schedule()
      }, next.delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])
  return event
}

export const TITLE_BACKDROP_CSS = `
  @keyframes titleZombiePeek {
    0% { transform: translateY(22px); }
    22% { transform: translateY(3px); }
    34% { transform: translateY(4px) rotate(-6deg); }
    52% { transform: translateY(3px) rotate(5deg); }
    70% { transform: translateY(4px); }
    100% { transform: translateY(22px); }
  }
  @keyframes titlePlaneDrift {
    0% { transform: translate(-50px, 196px) rotate(6deg); }
    25% { transform: translate(60px, 172px) rotate(-7deg); }
    50% { transform: translate(170px, 186px) rotate(6deg); }
    75% { transform: translate(280px, 166px) rotate(-6deg); }
    100% { transform: translate(410px, 180px) rotate(4deg); }
  }
  @keyframes titleBellSwing {
    0% { transform: rotate(0deg); }
    14% { transform: rotate(18deg); }
    32% { transform: rotate(-15deg); }
    50% { transform: rotate(11deg); }
    68% { transform: rotate(-7deg); }
    84% { transform: rotate(3deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes titleBellLines {
    0%, 100% { opacity: 0; }
    12%, 70% { opacity: 0.9; }
  }
  .title-ev-zombie { transform-box: fill-box; transform-origin: 50% 100%; transform: translateY(22px); animation: titleZombiePeek 2.6s ease-in-out both; }
  .title-ev-plane { transform-box: fill-box; transform-origin: center; transform: translate(-50px, 196px); animation: titlePlaneDrift 5s ease-in-out both; }
  .title-ev-bell { transform-box: fill-box; transform-origin: 50% 0%; }
  .title-ev-bell.is-swinging { animation: titleBellSwing 1.6s ease-out both; }
  .title-ev-bell-lines { opacity: 0; }
  .title-ev-bell-lines.is-swinging { animation: titleBellLines 1.6s ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .title-ev-zombie, .title-ev-plane { display: none; }
    .title-ev-bell, .title-ev-bell-lines { animation: none !important; }
  }
  @keyframes titleCloudDrift {
    from { transform: translate3d(0, 0, 0); }
    to { transform: translate3d(140%, 0, 0); }
  }
  .title-cloud-track { animation: titleCloudDrift var(--cloud-duration) linear infinite; animation-delay: var(--cloud-delay); }
  @media (prefers-reduced-motion: reduce) {
    .title-cloud-track { animation: none; transform: translate3d(var(--cloud-rest), 0, 0); }
  }
`

function Cloud({ cloud }) {
  return (
    <div
      className="title-cloud-track"
      data-title-cloud={cloud.id}
      style={{
        ...styles.cloudTrack,
        top: cloud.top,
        '--cloud-duration': `${cloud.duration}s`,
        '--cloud-delay': `${cloud.delay}s`,
        '--cloud-rest': cloud.rest,
      }}
    >
      <svg viewBox="0 0 120 52" style={{ ...styles.cloud, width: cloud.width }} aria-hidden="true" focusable="false">
        <path
          d="M14 44 C4 44 3 31 14 29 C13 17 29 13 36 21 C41 8 62 6 68 19 C76 11 92 14 92 27 C106 25 113 42 101 44 Z"
          fill={P.cream}
          {...STROKE}
        />
      </svg>
    </div>
  )
}

export default function TitleBackdrop() {
  const event = useTitleAmbientEvent()
  const peek = event?.type === 'zombiePeek' ? TITLE_PEEK_WINDOWS[event.windowIndex] : null
  const bellSwinging = event?.type === 'bellSwing'
  return (
    <div data-title-backdrop aria-hidden="true" style={styles.root}>
      <style data-title-backdrop-css>{TITLE_BACKDROP_CSS}</style>
      <svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" style={styles.scene} focusable="false">
        <rect x="-200" y="-200" width="760" height="1040" fill={P.sky} />
        <circle cx="304" cy="226" r="24" fill={P.cream} {...STROKE} />
        {event?.type === 'paperPlane' && <PaperPlane key={event.key} />}

        {/* 학교·운동장: 3D 바닥 지평선(프레임 높이 약 44%) 위로 시계탑·지붕이 보이게 위로 올린다. */}
        <g transform="translate(0 -64)">
        {/* 학교 옆 나무 */}
        <path d="M22 456 L23 424" fill="none" {...STROKE} />
        <path d="M6 428 C-4 412 6 392 20 394 C24 380 44 384 44 398 C56 402 54 424 40 428 Z" fill={P.chalkboard} {...STROKE} />
        <path d="M339 456 L338 430" fill="none" {...STROKE} />
        <path d="M322 434 C312 420 322 404 334 407 C340 395 358 400 356 413 C366 420 360 436 350 435 Z" fill={P.chalkboard} {...STROKE} />

        {/* 시계탑 + 깃발 */}
        <path d="M201 262 L201 226" fill="none" {...STROKE} />
        <path d="M202 228 C210 226 218 233 228 231 L226 243 C217 245 210 239 202 241 Z" fill={P.red} {...STROKE} />
        <path d="M151 333 L150 273 L212 272 L213 333 Z" fill={P.cream} {...STROKE} />
        <path d="M145 275 L181 258 L218 274 Z" fill={P.chalkboard} {...STROKE} />
        <circle cx="181" cy="302" r="15" fill={P.cream} {...STROKE} />
        <path d="M181 302 L181 292 M181 302 L189 306" fill="none" {...STROKE} />

        {/* 본관 */}
        <path d="M50 333 L311 330 L310 456 L49 456 Z" fill={P.cream} {...STROKE} />
        <path d="M43 334 L45 319 L316 317 L318 332 Z" fill={P.chalkboard} {...STROKE} />
        {UPPER_WINDOWS.map((i) => (
          <Window key={`u${i}`} x={64 + i * 34} y={348} curtain={CURTAINED.has(`u${i}`)} />
        ))}
        {LOWER_WINDOWS.map((i) => (
          <Window key={`l${i}`} x={64 + i * 34} y={393} curtain={CURTAINED.has(`l${i}`)} />
        ))}
        {peek && <ZombiePeek key={event.key} x={peek.x} y={peek.y} />}
        <SchoolBell swinging={bellSwinging} swingKey={bellSwinging ? event.key : 0} />
        {/* 현관 */}
        <path d="M163 456 L163 402 L199 401 L199 456" fill={P.chalkboard} {...STROKE} />
        <path d="M181 403 L181 456" fill="none" {...STROKE} />
        {/* 반 팻말 */}
        <g transform="rotate(2 113 340)">
          <rect x="99" y="334" width="28" height="12" rx="2" fill={P.cream} {...STROKE} />
          <text x="113" y="343.6" textAnchor="middle" fontSize="9" fontWeight="800" fill={P.line} fontFamily="'Segoe UI', sans-serif">2-3</text>
        </g>

        {/* 화단 */}
        <path
          d="M28 460 C30 446 44 444 50 450 C56 440 72 442 76 450 C84 441 100 443 104 451 C112 442 128 444 132 451 L158 452 L158 462 L28 462 Z"
          fill={P.chalkboard}
          {...STROKE}
        />
        <path
          d="M204 452 L230 451 C234 443 250 441 256 450 C262 442 278 441 284 450 C292 442 308 443 312 451 C320 444 334 447 334 460 L204 462 Z"
          fill={P.chalkboard}
          {...STROKE}
        />

        {/* 운동장: 칠판색 땅 + 분필 선 */}
        <path d="M-200 458 L560 456 L560 840 L-200 840 Z" fill={P.chalkboard} {...STROKE} />
        <path d="M-10 548 C80 500 280 498 372 546" fill="none" stroke={P.cream} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 9" vectorEffect="non-scaling-stroke" opacity="0.85" />
        <path d="M-10 612 C90 560 270 558 372 608" fill="none" stroke={P.cream} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 9" vectorEffect="non-scaling-stroke" opacity="0.85" />
        </g>
      </svg>
      {TITLE_CLOUDS.map((cloud) => <Cloud key={cloud.id} cloud={cloud} />)}
    </div>
  )
}

function Window({ x, y, curtain }) {
  return (
    <g>
      <rect x={x} y={y} width="24" height="24" rx="1.5" fill={P.sky} {...STROKE} />
      {curtain && <path d={`M${x + 1.5} ${y + 1.5} L${x + 11} ${y + 1.5} C${x + 9} ${y + 9} ${x + 6} ${y + 15} ${x + 1.5} ${y + 22} Z`} fill={P.cream} />}
      <path d={`M${x + 12} ${y} L${x + 12} ${y + 24}`} fill="none" {...STROKE} />
    </g>
  )
}

// 좀비 얼굴: 창 안쪽으로 잘라서(clip) 아래에서 쏙 올라와 갸웃거리다 다시 숨는다.
const ZOMBIE_SKIN = '#a9cf8c'
function ZombiePeek({ x, y }) {
  const id = `title-peek-${x}-${y}`
  const cx = x + 12
  const cy = y + 15
  const thin = { ...STROKE, strokeWidth: 1.4 }
  return (
    <g data-title-event="zombiePeek">
      <clipPath id={id}>
        <rect x={x + 1} y={y + 1} width="22" height="22" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <g className="title-ev-zombie">
          <path d={`M${cx - 9} ${cy + 12} C${cx - 10} ${cy - 2} ${cx - 8} ${cy - 9} ${cx} ${cy - 9} C${cx + 8} ${cy - 9} ${cx + 10} ${cy - 1} ${cx + 9} ${cy + 12} Z`} fill={ZOMBIE_SKIN} {...STROKE} strokeWidth={2} />
          <path d={`M${cx - 5} ${cy - 8} L${cx - 3} ${cy - 11} L${cx - 1} ${cy - 8} M${cx + 2} ${cy - 8} L${cx + 4} ${cy - 10}`} fill="none" {...thin} />
          <circle cx={cx - 3.6} cy={cy - 2} r="2.6" fill={P.cream} {...thin} />
          <circle cx={cx + 3.8} cy={cy - 1.4} r="2" fill={P.cream} {...thin} />
          <circle cx={cx - 3.2} cy={cy - 1.6} r="0.9" fill={P.line} />
          <circle cx={cx + 4.2} cy={cy - 1.1} r="0.8" fill={P.line} />
          <path d={`M${cx - 4} ${cy + 4} L${cx - 2} ${cy + 3} L${cx} ${cy + 4.5} L${cx + 2} ${cy + 3} L${cx + 4} ${cy + 4}`} fill="none" {...thin} />
          <path d={`M${cx + 6} ${cy - 6} L${cx + 6} ${cy - 3} M${cx + 5} ${cy - 5} L${cx + 7} ${cy - 5} M${cx + 5} ${cy - 4} L${cx + 7} ${cy - 4}`} fill="none" {...STROKE} strokeWidth={1} />
        </g>
      </g>
    </g>
  )
}

// 접은 종이비행기: 하늘을 완만한 물결 곡선으로 가로지르고 점선 꼬리를 남긴다.
function PaperPlane() {
  return (
    <g data-title-event="paperPlane" className="title-ev-plane">
      <path d="M0 6 L24 0 L9 9 Z" fill={P.cream} {...STROKE} strokeWidth={2} />
      <path d="M9 9 L24 0 L11 14 Z" fill={P.cream} {...STROKE} strokeWidth={2} />
      <path d="M-4 9 C-10 10 -14 13 -20 12" fill="none" stroke={P.cream} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.9" />
    </g>
  )
}

// 시계탑 왼쪽 벽 받침대의 작은 종. 평소엔 가만히, 이벤트 때 잠깐 흔들리며 움직임 선이 뜬다(소리 없음).
function SchoolBell({ swinging, swingKey }) {
  const cls = swinging ? ' is-swinging' : ''
  return (
    <g data-title-event-bell>
      <path d="M151 287 L138 287 L138 290" fill="none" {...STROKE} strokeWidth={2} />
      <g key={`b${swingKey}`} className={`title-ev-bell${cls}`}>
        <path d="M138 290 L138 292" fill="none" {...STROKE} strokeWidth={2} />
        <path d="M131 304 C131 298 133 292 138 292 C143 292 145 298 145 304 Z" fill={P.orange} {...STROKE} strokeWidth={2} />
        <circle cx="138" cy="306" r="1.8" fill={P.line} />
      </g>
      <g key={`l${swingKey}`} className={`title-ev-bell-lines${cls}`}>
        <path d="M127 292 C124 296 124 301 126 305 M123 290 C119 296 119 303 122 308" fill="none" {...STROKE} strokeWidth={1.6} />
        <path d="M149 292 C152 296 152 301 150 305" fill="none" {...STROKE} strokeWidth={1.6} />
      </g>
    </g>
  )
}

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: P.sky,
    pointerEvents: 'none',
  },
  scene: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
  },
  cloudTrack: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 0,
  },
  cloud: {
    position: 'absolute',
    left: '-36%',
    top: 0,
    display: 'block',
    overflow: 'visible',
  },
}

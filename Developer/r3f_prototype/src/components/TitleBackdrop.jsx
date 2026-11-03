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

export const TITLE_BACKDROP_CSS = `
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
  return (
    <div data-title-backdrop aria-hidden="true" style={styles.root}>
      <style data-title-backdrop-css>{TITLE_BACKDROP_CSS}</style>
      <svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" style={styles.scene} focusable="false">
        <rect x="-200" y="-200" width="760" height="1040" fill={P.sky} />
        <circle cx="304" cy="226" r="24" fill={P.cream} {...STROKE} />

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

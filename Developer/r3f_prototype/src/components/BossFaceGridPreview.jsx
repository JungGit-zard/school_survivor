import { BOSS_FACE_PART_CATEGORIES, DEFAULT_BOSS_FACE_RECIPE, normalizeBossFaceRecipe } from '../lib/bossFaceParts.js'

const CATEGORY_LABELS = Object.fromEntries(BOSS_FACE_PART_CATEGORIES.map((category) => [category.key, category.label]))

const FACE_INK = '#1d1014'
const FACE_ACCENT = '#e35d3d'

function BrowSvg({ id }) {
  if (id === 'brow-angry-slash') return <><path d="M27 38 L43 32" /><path d="M57 32 L73 38" /></>
  if (id === 'brow-worried-roof') return <><path d="M27 35 L42 41" /><path d="M58 41 L73 35" /></>
  if (id === 'brow-flat-deadpan') return <><path d="M27 36 L43 36" /><path d="M57 36 L73 36" /></>
  if (id === 'brow-wiggle-goofy') return <><path d="M25 36 Q31 31 37 36 T47 36" /><path d="M53 36 Q59 31 65 36 T75 36" /></>
  return <><path d="M27 37 Q35 32 43 35" /><path d="M57 35 Q65 32 73 37" /></>
}

function EyeSvg({ id }) {
  if (id === 'eye-happy-arc') return <><path d="M29 48 Q36 42 43 48" /><path d="M57 48 Q64 42 71 48" /></>
  if (id === 'eye-empty-oval') return <><ellipse cx="36" cy="48" rx="7" ry="5" /><ellipse cx="64" cy="48" rx="7" ry="5" /></>
  if (id === 'eye-x-dizzy') return <><path d="M31 43 L41 53 M41 43 L31 53" /><path d="M59 43 L69 53 M69 43 L59 53" /></>
  if (id === 'eye-squint-lines') return <><path d="M29 48 L43 45" /><path d="M57 45 L71 48" /></>
  return <><circle cx="36" cy="48" r="4.6" fill={FACE_INK} /><circle cx="64" cy="48" r="4.6" fill={FACE_INK} /></>
}

function NoseSvg({ id }) {
  if (id === 'nose-dot') return <circle cx="50" cy="59" r="3" fill={FACE_INK} />
  if (id === 'nose-triangle') return <path d="M50 52 L45 65 L56 65 Z" />
  if (id === 'nose-long-line') return <path d="M50 52 L50 66 L56 66" />
  if (id === 'nose-piggy') return <><circle cx="46" cy="60" r="2.5" fill={FACE_INK} /><circle cx="54" cy="60" r="2.5" fill={FACE_INK} /></>
  return <path d="M52 52 Q47 60 45 66 Q51 68 56 65" />
}

function MouthSvg({ id }) {
  if (id === 'mouth-wavy-grin') return <path d="M31 76 Q40 82 49 77 T69 79" />
  if (id === 'mouth-open-o') return <ellipse cx="50" cy="78" rx="8" ry="10" />
  if (id === 'mouth-zigzag') return <path d="M31 75 L40 82 L49 75 L58 82 L69 75" />
  if (id === 'mouth-tiny-frown') return <path d="M39 81 Q50 73 62 81" />
  return <path d="M29 70 Q50 91 72 70" />
}

export default function BossFaceGridPreview({ bossLabel, recipe }) {
  const normalized = normalizeBossFaceRecipe(recipe ?? DEFAULT_BOSS_FACE_RECIPE)
  const rows = Array.from({ length: 9 }, (_, index) => index)
  const columns = Array.from({ length: 11 }, (_, index) => index)

  return (
    <section style={styles.shell} data-testid="boss-face-grid-preview" aria-label="선택한 보스 얼굴면적 그리드 미리보기">
      <div style={styles.header}>
        <strong style={styles.title}>Face Area Grid</strong>
        <span style={styles.boss}>{bossLabel}</span>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label="얼굴 파츠 조합 미리보기" style={styles.svg}>
        <defs>
          <linearGradient id="boss-face-grid-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#a9c88b" />
            <stop offset="1" stopColor="#6f8f63" />
          </linearGradient>
        </defs>
        <rect x="10" y="8" width="80" height="86" rx="18" fill="url(#boss-face-grid-bg)" stroke="#2b3828" strokeWidth="2.4" />
        {columns.map((column) => <line key={`v${column}`} x1={10 + column * 8} y1="8" x2={10 + column * 8} y2="94" stroke="#eaffdd" strokeOpacity="0.28" strokeWidth="0.55" />)}
        {rows.map((row) => <line key={`h${row}`} x1="10" y1={8 + row * 9.5} x2="90" y2={8 + row * 9.5} stroke="#eaffdd" strokeOpacity="0.28" strokeWidth="0.55" />)}
        <g fill="none" stroke={FACE_INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4">
          <BrowSvg id={normalized.brow} />
          <EyeSvg id={normalized.eye} />
          <NoseSvg id={normalized.nose} />
          <MouthSvg id={normalized.mouth} />
        </g>
        <circle cx="23" cy="64" r="3" fill={FACE_ACCENT} opacity="0.38" />
        <circle cx="77" cy="64" r="3" fill={FACE_ACCENT} opacity="0.38" />
      </svg>
      <div style={styles.legend}>
        {Object.entries(normalized).map(([key, value]) => (
          <span key={key} style={styles.legendPill}>{CATEGORY_LABELS[key]}: {value}</span>
        ))}
      </div>
    </section>
  )
}

const styles = {
  shell: {
    display: 'grid',
    gap: 12,
    padding: 10,
    border: '1px solid #805c38',
    borderTop: '3px solid #d3a53f',
    borderRadius: 8,
    background: '#211c14',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    color: '#fff6cf',
    fontSize: 24,
  },
  boss: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#d3a53f',
    fontSize: 20,
  },
  svg: {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 8,
    background: '#10110f',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
  },
  legendPill: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '2px 6px',
    borderRadius: 999,
    background: '#151614',
    color: '#cfd5ca',
    fontSize: 20,
  },
}

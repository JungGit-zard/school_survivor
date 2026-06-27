export const ENEMY_DEATH_COLLAPSE_LIFETIME_MS = 780
export const ENEMY_DEATH_COLLAPSE_FADE_START_MS = 430
export const ENEMY_DEATH_COLLAPSE_STYLES = ['bodyCollapse', 'scatter', 'crumble']
export const SCATTER_COLLAPSE_VARIANTS = ['burst', 'spiral', 'wave']

export const ZOMBIE_COLLAPSE_PARTS = [
  { key: 'head', size: [0.52, 0.48, 0.46], offset: [0, 0.82, 0], color: 'skin', outlineScale: 1.08, mass: 0.8 },
  { key: 'eyeL', size: [0.10, 0.09, 0.06], offset: [-0.12, 0.86, 0.24], color: 'eye', outlineScale: 1.0, mass: 0.12 },
  { key: 'eyeR', size: [0.10, 0.09, 0.06], offset: [0.12, 0.86, 0.24], color: 'eye', outlineScale: 1.0, mass: 0.12 },
  { key: 'body', size: [0.56, 0.58, 0.40], offset: [0, 0.28, 0], color: 'body', outlineScale: 1.09, mass: 1.4 },
  { key: 'armL', size: [0.20, 0.50, 0.20], offset: [-0.40, 0.42, 0.22], rotation: [-1.15, 0, 0.12], color: 'body', outlineScale: 1.05, mass: 0.45 },
  { key: 'handL', size: [0.18, 0.16, 0.18], offset: [-0.40, 0.30, 0.50], color: 'skin', outlineScale: 1.03, mass: 0.22 },
  { key: 'armR', size: [0.20, 0.50, 0.20], offset: [0.40, 0.42, 0.22], rotation: [-1.15, 0, -0.12], color: 'body', outlineScale: 1.05, mass: 0.45 },
  { key: 'handR', size: [0.18, 0.16, 0.18], offset: [0.40, 0.30, 0.50], color: 'skin', outlineScale: 1.03, mass: 0.22 },
  { key: 'legL', size: [0.22, 0.52, 0.26], offset: [-0.15, -0.26, 0], color: 'body', outlineScale: 1.06, mass: 0.55 },
  { key: 'footL', size: [0.24, 0.12, 0.34], offset: [-0.15, -0.57, 0.05], color: 'foot', outlineScale: 1.03, mass: 0.35 },
  { key: 'legR', size: [0.22, 0.52, 0.26], offset: [0.15, -0.26, 0], color: 'body', outlineScale: 1.06, mass: 0.55 },
  { key: 'footR', size: [0.24, 0.12, 0.34], offset: [0.15, -0.57, 0.05], color: 'foot', outlineScale: 1.03, mass: 0.35 },
]

export function seededCollapseNoise(seed) {
  const x = Math.sin(seed * 997.91) * 43758.5453
  return x - Math.floor(x)
}

export function pickEnemyDeathCollapseStyle(roll = Math.random()) {
  const index = Math.min(ENEMY_DEATH_COLLAPSE_STYLES.length - 1, Math.floor(roll * ENEMY_DEATH_COLLAPSE_STYLES.length))
  return ENEMY_DEATH_COLLAPSE_STYLES[index]
}

// 박살 강도 3단계. 막타 위력(killingDamage/maxHp 비중 + 넉백)으로 결정한다.
export const COLLAPSE_INTENSITIES = ['weak', 'medium', 'strong']

// 강도 → 모션 스타일 매핑. 약=제자리 부서짐, 중=몸 무너짐, 강=사방 흩날림.
export const COLLAPSE_INTENSITY_STYLE = {
  weak: 'crumble',
  medium: 'bodyCollapse',
  strong: 'scatter',
}

// 막타 위력 → 'weak' | 'medium' | 'strong'.
// damageRatio: 막타가 최대 HP에서 차지하는 비중(최대 1.5로 캡). knockback: 막타의 원천 넉백(0~약4.8).
export function resolveCollapseIntensity({ killingDamage = 0, maxHp = 1, knockback = 0 } = {}) {
  const damageRatio = Math.min(1.5, killingDamage / Math.max(1, maxHp))
  const knockbackBoost = Math.min(1, Math.max(0, knockback) / 4.5)
  const power = damageRatio * 0.6 + knockbackBoost
  if (power >= 1.1) return 'strong'
  if (power >= 0.5) return 'medium'
  return 'weak'
}

export function collapseStyleForIntensity(intensity) {
  return COLLAPSE_INTENSITY_STYLE[intensity] ?? 'bodyCollapse'
}

// 스타일별 파편 조각 크기 배수. scatter(강)는 가장 세게 흩날리므로 조각을 절반 크기로 줄인다.
export const COLLAPSE_STYLE_PIECE_SCALE = {
  scatter: 0.5,
}

export function collapsePieceScaleForStyle(style) {
  return COLLAPSE_STYLE_PIECE_SCALE[style] ?? 1
}

export function pickScatterCollapseVariant(roll = Math.random()) {
  const index = Math.min(SCATTER_COLLAPSE_VARIANTS.length - 1, Math.floor(roll * SCATTER_COLLAPSE_VARIANTS.length))
  return SCATTER_COLLAPSE_VARIANTS[index]
}

export function scatterCollapseVariantForSeed(seed = 0) {
  return pickScatterCollapseVariant(seededCollapseNoise(seed + 91.7))
}

function normalizeScatterVariant(scatterVariant) {
  return SCATTER_COLLAPSE_VARIANTS.includes(scatterVariant) ? scatterVariant : 'burst'
}

function createScatterMotion({ seed, part, index, scatterVariant = 'burst' }) {
  const n0 = seededCollapseNoise(seed)
  const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  const n3 = seededCollapseNoise(seed + 3)
  const n4 = seededCollapseNoise(seed + 4)
  const variant = normalizeScatterVariant(scatterVariant)
  let angle = n0 * Math.PI * 2
  let speed = 4.0 + n1 * 5.4
  let lift = 1.6 + n2 * 2.3
  let spin = 8.0 + n3 * 10.5
  let delayMs = Math.min(index, 4) * 3
  let distanceScale = 1
  let linearDamping = 1.15
  let spinDamping = 0.75

  if (variant === 'spiral') {
    angle += index * 0.72 + n4 * 0.45
    speed = 3.6 + n1 * 4.8 + (index % 4) * 0.28
    lift = 1.8 + n2 * 1.9
    spin += 2.4
    delayMs = Math.min(index, 8) * 5
    distanceScale = 1.08
    linearDamping = 0.95
    spinDamping = 0.62
  } else if (variant === 'wave') {
    const wave = Math.sin(index * 1.7 + n0 * Math.PI)
    angle += wave * 0.95
    speed = 3.2 + n1 * 3.5 + (index % 3) * 0.65
    lift = 1.2 + n2 * 1.5 + (index % 2) * 0.35
    spin = 6.5 + n3 * 8.0
    delayMs = (index % 6) * 8
    distanceScale = 0.9
    linearDamping = 1.35
    spinDamping = 0.9
  }

  return {
    x: Math.sin(angle) * speed,
    y: lift,
    z: Math.cos(angle) * speed,
    rx: (n2 - 0.5) * spin,
    ry: (n3 - 0.5) * spin,
    rz: (n4 - 0.5) * spin,
    gravity: 0,
    delayMs,
    settleY: -0.06,
    distanceScale,
    linearDamping,
    spinDamping,
    scatterVariant: variant,
  }
}

function createCrumbleMotion({ seed, part, index }) {
  const [ox, oy, oz] = part.offset
  const n0 = seededCollapseNoise(seed)
  const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  const n3 = seededCollapseNoise(seed + 3)
  const n4 = seededCollapseNoise(seed + 4)
  const angle = n0 * Math.PI * 2
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const sideDist = 0.12 + n1 * 0.34 + Math.hypot(ox, oz) * 0.18
  const lift = 0.08 + topBias * 0.42 + n2 * 0.16
  const spin = 3.0 + n3 * 5.2

  return {
    x: Math.sin(angle) * sideDist,
    y: lift,
    z: Math.cos(angle) * sideDist,
    rx: (n2 - 0.5) * spin,
    ry: (n3 - 0.5) * spin,
    rz: (n4 - 0.5) * spin,
    gravity: 12 + topBias * 5 + part.mass * 1.4,
    delayMs: index * 10,
    settleY: -0.14,
  }
}

function createBodyCollapseMotion({ seed, part, index }) {
  const [ox, oy, oz] = part.offset
  const sideLen = Math.hypot(ox, oz) || 1
  const sideX = ox / sideLen
  const sideZ = oz / sideLen
  const n0 = seededCollapseNoise(seed)
  const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  const n3 = seededCollapseNoise(seed + 3)
  const n4 = seededCollapseNoise(seed + 4)
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const limbBias = part.key.includes('arm') || part.key.includes('hand') || part.key.includes('leg') || part.key.includes('foot')

  return {
    x: sideX * (0.45 + n0 * 0.42) + (n1 - 0.5) * 0.22,
    y: 0.14 + topBias * 0.58 + n2 * 0.18,
    z: sideZ * (0.42 + n1 * 0.5) + (n0 - 0.5) * 0.2,
    rx: (n2 - 0.5) * (limbBias ? 8.2 : 5.2),
    ry: (n3 - 0.5) * 6.6,
    rz: (n4 - 0.5) * (limbBias ? 8.2 : 5.4),
    gravity: 8.5 + topBias * 6.5 + part.mass * 1.2,
    delayMs: index * 8,
    settleY: -0.12,
  }
}

export function createCollapseMotion({ seed, part, index, style = 'bodyCollapse', scatterVariant }) {
  if (style === 'scatter') return createScatterMotion({ seed, part, index, scatterVariant })
  if (style === 'crumble') return createCrumbleMotion({ seed, part, index })
  return createBodyCollapseMotion({ seed, part, index })
}

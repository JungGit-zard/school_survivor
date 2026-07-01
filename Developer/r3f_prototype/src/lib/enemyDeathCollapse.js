export const ENEMY_DEATH_COLLAPSE_LIFETIME_MS = 780
export const ENEMY_DEATH_COLLAPSE_FADE_START_MS = 430
export const FAR_SCATTER_FADE_START_MS = 260
export const FAR_SCATTER_FADE_DURATION_MS = 250
// Runtime death pool: 5 fall/sink styles + 5 shatter strengths.
export const ENEMY_DEATH_COLLAPSE_STYLES = [
  'forwardFall',
  'backwardFall',
  'leftFall',
  'rightFall',
  'proneSink',
  'shatter1',
  'shatter2',
  'shatter3',
  'shatter4',
  'shatter5',
]
export const SOFT_FALL_STYLES = ENEMY_DEATH_COLLAPSE_STYLES.slice(0, 5)
export const SCATTER_COLLAPSE_VARIANTS = ['burst', 'spiral', 'wave', 'ring', 'fountain', 'cross', 'halfBurst']

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

let deathStyleBag = []

export function createShuffledDeathStyleBag(random = Math.random) {
  const bag = [...ENEMY_DEATH_COLLAPSE_STYLES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

export function nextEnemyDeathCollapseStyle(random = Math.random) {
  if (deathStyleBag.length === 0) deathStyleBag = createShuffledDeathStyleBag(random)
  return deathStyleBag.pop()
}

export function resetDeathStyleBagForTests() {
  deathStyleBag = []
}


export const COLLAPSE_INTENSITIES = ['weak', 'medium', 'strong']



export function resolveCollapseIntensity({ killingDamage = 0, maxHp = 1, knockback = 0 } = {}) {
  const damageRatio = Math.min(1.5, killingDamage / Math.max(1, maxHp))
  const knockbackBoost = Math.min(1, Math.max(0, knockback) / 4.5)
  const power = damageRatio * 0.6 + knockbackBoost
  if (power >= 1.1) return 'strong'
  if (power >= 0.5) return 'medium'
  return 'weak'
}

export function collapseStyleForIntensity(_intensity, _seed) {
  return nextEnemyDeathCollapseStyle()
}


export const COLLAPSE_STYLE_PIECE_SCALE = {
  shatter1: 0.95,
  shatter2: 0.82,
  shatter3: 0.68,
  shatter4: 0.54,
  shatter5: 0.42,
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


const SCATTER_SPREAD_TIERS = [
  { speedMult: 0.28, liftMult: 0.55, dampMult: 2.2 },  // tight
  { speedMult: 1.00, liftMult: 1.00, dampMult: 1.0 },  // mid
  { speedMult: 2.65, liftMult: 1.70, dampMult: 0.55 }, // wide
]

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
  } else if (variant === 'ring') {
    angle = index * 0.52 + (n0 - 0.5) * 0.24
    speed = 4.7 + n1 * 1.4 + (index % 2) * 0.7
    lift = 1.05 + n2 * 0.7
    spin = 7.4 + n3 * 8.0
    delayMs = (index % 12) * 2
    distanceScale = 1.25
    linearDamping = 0.75
    spinDamping = 0.7
  } else if (variant === 'fountain') {
    angle += (n4 - 0.5) * 0.6
    speed = 3.2 + n1 * 1.7
    lift = 4.3 + n2 * 2.2
    spin += 5.0
    delayMs = Math.min(index, 8) * 4
    distanceScale = 0.68
    linearDamping = 1.05
    spinDamping = 0.55
  } else if (variant === 'cross') {
    angle = (index % 4) * (Math.PI / 2) + (n0 - 0.5) * 0.18
    speed = 4.8 + n1 * 3.2 + (index % 3) * 0.4
    lift = 1.3 + n2 * 1.3
    spin = 8.0 + n3 * 9.0
    delayMs = Math.floor(index / 4) * 6
    distanceScale = 1.12
    linearDamping = 0.85
    spinDamping = 0.7
  }


  const tierRoll = seededCollapseNoise(seed + 11)
  const tierIndex = tierRoll < 0.33 ? 0 : tierRoll < 0.67 ? 1 : 2
  const tier = SCATTER_SPREAD_TIERS[tierIndex]
  speed        *= tier.speedMult
  lift         *= tier.liftMult
  linearDamping *= tier.dampMult


  if (variant === 'halfBurst') {
    speed *= 0.5
    lift  *= 0.85
    linearDamping *= 1.4
    spinDamping   *= 1.2
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
    farFadeStartMs: tierIndex === 2 ? FAR_SCATTER_FADE_START_MS : undefined,
    farFadeDurationMs: tierIndex === 2 ? FAR_SCATTER_FADE_DURATION_MS : undefined,
    scatterVariant: variant,
  }
}

export function resolveCollapsePartOpacity(elapsedMs, motion = {}) {
  const fadeStartMs = motion.fadeStartMs ?? ENEMY_DEATH_COLLAPSE_FADE_START_MS
  const fadeDuration = motion.fadeDurationMs ?? (ENEMY_DEATH_COLLAPSE_LIFETIME_MS - fadeStartMs)
  let opacity = elapsedMs >= fadeStartMs
    ? Math.max(0, 1 - (elapsedMs - fadeStartMs) / fadeDuration)
    : 1

  if (motion.farFadeStartMs !== undefined) {
    const farFadeDuration = motion.farFadeDurationMs ?? FAR_SCATTER_FADE_DURATION_MS
    const farOpacity = Math.max(0, 1 - (elapsedMs - motion.farFadeStartMs) / farFadeDuration)
    opacity = Math.min(opacity, farOpacity)
  }

  return opacity
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

function settleYForSlumpPart(part) {
  if (part.key === 'head' || part.key.startsWith('eye')) return 0.10
  if (part.key === 'body') return -0.04
  if (part.key.includes('arm') || part.key.includes('hand')) return -0.12
  if (part.key.includes('leg')) return -0.30
  if (part.key.includes('foot')) return -0.42
  return -0.12
}

function createSlumpMotion({ seed, part, index }) {
  const [ox, oy, oz] = part.offset
  const n0 = seededCollapseNoise(seed)
  const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  const n3 = seededCollapseNoise(seed + 3)
  const n4 = seededCollapseNoise(seed + 4)
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const limbBias = part.key.includes('arm') || part.key.includes('hand') || part.key.includes('leg') || part.key.includes('foot')
  const foldForward = part.key === 'head' || part.key === 'body'
    ? 0.12 + n1 * 0.10
    : -oz * (0.10 + n1 * 0.08)

  return {
    x: -ox * (0.16 + n0 * 0.13) + (n1 - 0.5) * 0.06,
    y: -(0.46 + topBias * 0.72 + n2 * 0.18),
    z: foldForward + (n0 - 0.5) * 0.06,
    rx: (part.key === 'head' || part.key === 'body' ? 2.6 : 1.0) + (n2 - 0.5) * (limbBias ? 2.8 : 1.4),
    ry: (n3 - 0.5) * 1.2,
    rz: (n4 - 0.5) * (limbBias ? 2.4 : 1.1),
    gravity: 4.4 + topBias * 1.6 + part.mass * 0.45,
    delayMs: Math.min(index, 8) * 6,
    settleY: settleYForSlumpPart(part),
    linearDamping: 3.8,
    spinDamping: 2.6,
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


function createKneelMotion({ seed, part }) {
  const [ox, oy] = part.offset
  const n0 = seededCollapseNoise(seed)
  const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  const n3 = seededCollapseNoise(seed + 3)

  const isLeg  = part.key === 'legL' || part.key === 'legR'
  const isFoot = part.key === 'footL' || part.key === 'footR'
  const isUpper = part.key === 'head' || part.key.startsWith('eye')
  const isBody  = part.key === 'body'
  const isArm   = part.key.includes('arm') || part.key.includes('hand')


  if (isLeg || isFoot) {
    const side = ox >= 0 ? 1 : -1
    return {
      x: side * (0.30 + n0 * 0.15),
      y: -(0.35 + n1 * 0.15),
      z: isFoot ? 0.10 + n0 * 0.08 : 0.04 + n0 * 0.04,
      rx: isLeg ? 1.0 + n2 * 0.5 : 0.3 + n2 * 0.3,
      ry: (n3 - 0.5) * 0.4,
      rz: side * (0.3 + n2 * 0.2),
      gravity: 6 + part.mass * 1.2,
      delayMs: 0,
      settleY: -0.48,
      linearDamping: 5.0,
      spinDamping:   3.5,
    }
  }


  if (isUpper) {
    return {
      x: (n0 - 0.5) * 0.08,
      y: -(0.60 + n1 * 0.20),
      z: 0.15 + n0 * 0.10,
      rx: 2.8 + n2 * 0.8,
      ry: (n3 - 0.5) * 0.8,
      rz: (n2 - 0.5) * 0.6,
      gravity: 8 + part.mass * 1.5,
      delayMs: 80,
      settleY: -0.20,
      linearDamping: 4.2,
      spinDamping:   2.8,
    }
  }


  if (isBody) {
    return {
      x: (n0 - 0.5) * 0.06,
      y: -(0.45 + n1 * 0.15),
      z: 0.08 + n0 * 0.06,
      rx: 1.6 + n2 * 0.5,
      ry: (n3 - 0.5) * 0.5,
      rz: (n2 - 0.5) * 0.4,
      gravity: 7 + part.mass * 1.2,
      delayMs: 40,
      settleY: -0.30,
      linearDamping: 4.8,
      spinDamping:   3.2,
    }
  }


  if (isArm) {
    const side = ox >= 0 ? 1 : -1
    return {
      x: side * (0.12 + n0 * 0.10),
      y: -(0.50 + n1 * 0.18),
      z: 0.10 + n0 * 0.08,
      rx: 1.2 + n2 * 0.6,
      ry: (n3 - 0.5) * 0.6,
      rz: side * (0.2 + n2 * 0.3),
      gravity: 7 + part.mass * 1.0,
      delayMs: 60,
      settleY: -0.38,
      linearDamping: 4.5,
      spinDamping:   3.0,
    }
  }


  return {
    x: (n0 - 0.5) * 0.06, y: -(0.45 + oy * 0.3), z: (n1 - 0.5) * 0.06,
    rx: (n2 - 0.5) * 1.0, ry: (n3 - 0.5) * 0.5, rz: (n2 - 0.5) * 0.5,
    gravity: 7, delayMs: 50, settleY: -0.30, linearDamping: 4.5, spinDamping: 3.0,
  }
}



function createFaceDownMotion({ seed, part, index }) {

  const [ox, oy] = part.offset
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2); const n3 = seededCollapseNoise(seed + 3)
  return {
    x: (n0 - 0.5) * 0.12,
    y: 0.12 + topBias * 0.2,
    z: 1.45 + topBias * 0.95 + n1 * 0.18,
    rx: 4.05 + topBias * 1.25 + (n2 - 0.5) * 0.45,
    ry: (n3 - 0.5) * 0.25,
    rz: (n0 - 0.5) * 0.22,
    gravity: 7.5 + topBias * 3.5,
    delayMs: Math.floor((1 - topBias) * 4) * 7,
    settleY: -0.08,
    linearDamping: 3.5,
    spinDamping: 2.8,
  }
}

function createBackFallMotion({ seed, part, index }) {

  const [ox, oy] = part.offset
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2); const n3 = seededCollapseNoise(seed + 3)
  return {
    x: (n0 - 0.5) * 0.12,
    y: 0.14 + topBias * 0.22,
    z: -(1.45 + topBias * 0.95 + n1 * 0.18),
    rx: -(4.05 + topBias * 1.25 + (n2 - 0.5) * 0.45),
    ry: (n3 - 0.5) * 0.25,
    rz: (n0 - 0.5) * 0.22,
    gravity: 7.5 + topBias * 3.5,
    delayMs: index * 7,
    settleY: -0.10,
    linearDamping: 3.2,
    spinDamping: 2.5,
  }
}

function createSideFallMotion({ seed, part, index, direction }) {

  const [ox, oy] = part.offset
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2); const n3 = seededCollapseNoise(seed + 3)
  return {
    mode: 'sidePivot',
    pivotDirection: direction,
    pivotXOffset: direction * 0.23,
    pivotYOffset: -0.66,
    pivotZOffset: 0.16,
    pivotAngle: 1.52,
    fadeStartMs: 610,
    fadeDurationMs: 150,
    x: direction * (1.45 + topBias * 0.95 + n0 * 0.18),
    y: 0.12 + topBias * 0.18,
    z: (n1 - 0.5) * 0.12,
    rx: (n2 - 0.5) * 0.45,
    ry: (n3 - 0.5) * 0.25,
    rz: direction * (4.05 + topBias * 1.25 + (n0 - 0.5) * 0.45),
    gravity: 7.8 + topBias * 3.5,
    delayMs: index * 6,
    settleY: -0.10,
    linearDamping: 3.0,
    spinDamping: 2.4,
  }
}

function createSpiralDownMotion({ seed, part, index }) {

  const [ox, oy, oz] = part.offset
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2); const n3 = seededCollapseNoise(seed + 3)
  const angle = Math.atan2(ox, oz) + n0 * 0.6
  const radius = 0.15 + Math.hypot(ox, oz) * 0.4 + n1 * 0.1
  return {
    x: Math.sin(angle) * radius,
    y: 0.12 + topBias * 0.28,
    z: Math.cos(angle) * radius,
    rx: (n2 - 0.5) * 3.0,
    ry: (n0 > 0.5 ? 1 : -1) * (6.0 + n1 * 4.0),
    rz: (n3 - 0.5) * 1.5,
    gravity: 8 + topBias * 5,
    delayMs: index * 5,
    settleY: -0.10,
    linearDamping: 2.5,
    spinDamping: 1.2,
  }
}

function createMeltDownMotion({ seed, part, index }) {

  const [ox, oy] = part.offset
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  return {
    x: ox * (0.08 + n0 * 0.06),
    y: -(0.1 + topBias * 0.4),
    z: (n1 - 0.5) * 0.08,
    rx: topBias * 0.8 + (n2 - 0.5) * 0.4,
    ry: (n0 - 0.5) * 0.3,
    rz: (n1 - 0.5) * 0.25,
    gravity: 1.5 + topBias * 1.5,
    delayMs: (1 - topBias) * 6 * index,
    settleY: -0.16,
    linearDamping: 5.5,
    spinDamping: 4.0,
  }
}

function createTripRollMotion({ seed, part, index }) {
  const [ox, oy, oz] = part.offset
  const side = ox >= 0 ? 1 : -1
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  return {
    x: side * (0.45 + n0 * 0.35),
    y: 0.12 + Math.max(0, oy) * 0.18,
    z: 0.35 + oz * 0.5 + n1 * 0.25,
    rx: 2.8 + n2 * 2.8,
    ry: side * (2.0 + n1 * 2.5),
    rz: side * (3.4 + n0 * 2.0),
    gravity: 10 + part.mass * 2.0,
    delayMs: index * 4,
    settleY: -0.12,
    linearDamping: 2.8,
    spinDamping: 1.1,
  }
}

function createPopFallMotion({ seed, part, index }) {
  const [ox, oy, oz] = part.offset
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  const n2 = seededCollapseNoise(seed + 2)
  return {
    x: ox * 0.35 + (n0 - 0.5) * 0.28,
    y: 0.75 + Math.max(0, oy) * 0.55 + n1 * 0.25,
    z: oz * 0.35 + (n2 - 0.5) * 0.28,
    rx: (n2 - 0.5) * 5.5,
    ry: (n0 - 0.5) * 5.0,
    rz: (n1 - 0.5) * 5.0,
    gravity: 15 + part.mass * 3.0,
    delayMs: Math.min(index, 5) * 3,
    settleY: -0.14,
    linearDamping: 3.4,
    spinDamping: 1.7,
  }
}

function createProneSinkMotion({ seed, part, index }) {
  const [ox, oy, oz] = part.offset
  const topBias = Math.max(0, Math.min(1, (oy + 0.6) / 1.5))
  const n0 = seededCollapseNoise(seed); const n1 = seededCollapseNoise(seed + 1)
  return {
    mode: 'proneSink',
    sinkDepth: 0.78,
    fadeStartMs: 520,
    fadeDurationMs: 220,
    x: ox * 0.18 + (n0 - 0.5) * 0.06,
    y: -(0.42 + topBias * 0.72),
    z: 0.38 + oz * 0.25 + topBias * 0.22,
    rx: 3.15 + topBias * 0.9,
    ry: (n1 - 0.5) * 0.25,
    rz: (n0 - 0.5) * 0.18,
    gravity: 2.2 + topBias * 1.4,
    delayMs: 120 + index * 6,
    settleY: -0.48,
    linearDamping: 7.2,
    spinDamping: 5.5,
  }
}

function createShatterStrengthMotion({ seed, part, index, strength }) {
  const motion = createScatterMotion({
    seed,
    part,
    index,
    scatterVariant: ['burst', 'wave', 'spiral', 'ring', 'fountain'][strength - 1] ?? 'burst',
  })
  const spread = [0.28, 0.48, 0.72, 1.05, 1.42][strength - 1] ?? 0.72
  const lift = [0.45, 0.65, 0.9, 1.12, 1.35][strength - 1] ?? 0.9
  return {
    ...motion,
    x: motion.x * spread,
    y: motion.y * lift,
    z: motion.z * spread,
    rx: motion.rx * (0.55 + strength * 0.15),
    ry: motion.ry * (0.55 + strength * 0.15),
    rz: motion.rz * (0.55 + strength * 0.15),
    distanceScale: (motion.distanceScale ?? 1) * spread,
    linearDamping: Math.max(0.55, motion.linearDamping / (0.8 + strength * 0.12)),
  }
}

export function createCollapseMotion({ seed, part, index, style = 'forwardFall' }) {
  if (style === 'shatter1')   return createShatterStrengthMotion({ seed, part, index, strength: 1 })
  if (style === 'shatter2')   return createShatterStrengthMotion({ seed, part, index, strength: 2 })
  if (style === 'shatter3')   return createShatterStrengthMotion({ seed, part, index, strength: 3 })
  if (style === 'shatter4')   return createShatterStrengthMotion({ seed, part, index, strength: 4 })
  if (style === 'shatter5')   return createShatterStrengthMotion({ seed, part, index, strength: 5 })
  if (style === 'forwardFall') return createFaceDownMotion({ seed, part, index })
  if (style === 'backwardFall') return createBackFallMotion({ seed, part, index })
  if (style === 'leftFall')   return createSideFallMotion({ seed, part, index, direction: -1 })
  if (style === 'rightFall')  return createSideFallMotion({ seed, part, index, direction: +1 })
  if (style === 'proneSink')  return createProneSinkMotion({ seed, part, index })
  return createFaceDownMotion({ seed, part, index })
}

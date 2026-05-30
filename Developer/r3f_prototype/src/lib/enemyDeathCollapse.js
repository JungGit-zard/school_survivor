export const ENEMY_DEATH_COLLAPSE_LIFETIME_MS = 780
export const ENEMY_DEATH_COLLAPSE_FADE_START_MS = 430

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

export function createCollapseMotion({ seed, part, index }) {
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

import { isPlayerWeaponSightBlocked } from './weaponTargeting.js'

export function normalizePlanarFacing(facing = { x: 0, z: 1 }) {
  const x = Number(facing.x) || 0
  const z = Number(facing.z) || 0
  const len = Math.hypot(x, z) || 1
  return { x: x / len, z: z / len }
}

export function isPointInBoxCutterStrike({
  origin,
  facing,
  point,
  range = 1.275,
  width = 0.22,
}) {
  if (!origin || !point) return false
  const dir = normalizePlanarFacing(facing)
  const dx = point.x - origin.x
  const dz = point.z - origin.z
  const forward = dx * dir.x + dz * dir.z
  if (forward < 0.12 || forward > range) return false

  const lateral = dx * dir.z - dz * dir.x
  return Math.abs(lateral) <= width / 2
}

export function pickBoxCutterTargets({
  enemies,
  origin,
  facing,
  range = 1.275,
  width = 0.22,
  sightBlocker = isPlayerWeaponSightBlocked,
}) {
  const targets = []
  if (!enemies?.forEach) return targets

  enemies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead || !rb.translation) return
    const t = rb.translation()
    if (!isPointInBoxCutterStrike({ origin, facing, point: t, range, width })) return
    if (sightBlocker(t)) return
    targets.push({ enemyId, rb, x: t.x, z: t.z })
  })

  return targets
}

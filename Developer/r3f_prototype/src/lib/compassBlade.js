export function getCompassBladeOrbitPose({
  elapsedSec,
  index,
  count,
  radius,
  orbitSpeed,
  player,
}) {
  const safeCount = Math.max(1, count ?? 1)
  const safeRadius = radius ?? 1.15
  const safeSpeed = orbitSpeed ?? 3.4
  const angle = elapsedSec * safeSpeed + (Math.PI * 2 * index) / safeCount

  return {
    angle,
    position: {
      x: player.x + Math.sin(angle) * safeRadius,
      y: player.y + 0.16,
      z: player.z + Math.cos(angle) * safeRadius,
    },
    rotation: {
      x: 0,
      y: angle + Math.PI / 2,
      z: 0,
    },
  }
}

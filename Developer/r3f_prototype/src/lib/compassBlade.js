import { ZOMBIE_METER_WORLD_UNITS } from './gameplayUnits.js'

export const COMPASS_BLADE_STACKS_TO_EXPLODE = 5
export const COMPASS_BLADE_RESPAWN_MS = 5000
// 30 고정. 과거엔 scienceFlask base(15)×2 파생이었으나, 플라스크가 웅덩이 존
// 무기로 리워크되며 착탄 데미지가 절반(7.5)이 됨 — 컴퍼스 위력은 리워크 대상이
// 아니므로 파생을 끊고 기존 값을 유지한다 (2026-07-04).
export const COMPASS_BLADE_EXPLOSION_DAMAGE = 30

// 2026-08-17 사용자 확정 사양: 폭발 지점 기준 상하좌우 + 대각선 이웃 타일까지,
// 즉 3×3 = 9 좀비타일이 폭발 범위다. 1 좀비타일 = 1zm = 0.75 world units.
// 피해 판정은 applyRadialDamage → scanRadiusEnemiesInto이며 "적 중심점과 폭심의 거리"를
// 원으로 잰다. 그래서 반경을 1타일(0.75)로 두면 대각선 이웃 타일 중심(√2 zm ≈ 1.061)이
// 원 밖으로 밀려나 사용자가 명시한 "대각선까지"가 깨진다. 9칸 어디에 서 있는 좀비든
// 맞으려면 반경이 √2 타일이어야 한다.
// 이전 값 0.5는 주석("full footprint plus its 8 neighboring directions")이 서술한 3×3을
// 어떤 해석으로도 낼 수 없는 숫자였다 — 1타일(0.75)에도 못 미쳐 사실상 맞은 좀비 한 마리만 덮었다.
export const COMPASS_BLADE_EXPLOSION_RADIUS_ZM = Math.SQRT2
export const COMPASS_BLADE_EXPLOSION_RADIUS = COMPASS_BLADE_EXPLOSION_RADIUS_ZM * ZOMBIE_METER_WORLD_UNITS

// CompassBladeExplosion 비주얼의 바깥 링이 그룹 스케일 1일 때 갖는 로컬 반경.
// ringGeometry args=[0.48, 0.72, 64]의 바깥 반경 0.72 × 링 자체 최대 스케일(0.95 + 1.4).
// 이 링이 폭발의 시각적 가장자리다 — flash(0.5×1.35), burst 구(0.22×2.0), 스파크(≈0.91)는
// 전부 이 안쪽에 있다.
export const COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS = 0.72 * (0.95 + 1.4)

// 폭발 비주얼 그룹 스케일. progress=1(완전 확산)에서 바깥 링의 월드 반경이 피해 반경과
// 정확히 일치한다. radius에 선형이므로 permanentExplosionRadiusMultiplier로 피해 반경이
// 커질 때 비주얼도 같은 비율로 커진다.
export function getCompassBladeExplosionVisualScale(radius, progress) {
  const safeRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  return (safeRadius / COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS) * (0.34 + 0.66 * t)
}

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

export function resolveCompassBladeHitStack({ currentStack = 0, explosionRadiusMultiplier = 1 }) {
  const nextStack = currentStack + 1
  const safeMultiplier = Number.isFinite(explosionRadiusMultiplier) ? Math.max(0, explosionRadiusMultiplier) : 1
  const explosionRadius = COMPASS_BLADE_EXPLOSION_RADIUS * safeMultiplier

  if (nextStack < COMPASS_BLADE_STACKS_TO_EXPLODE) {
    return {
      stack: nextStack,
      exploded: false,
      explosionDamage: 0,
      explosionRadius,
    }
  }

  return {
    stack: 0,
    exploded: true,
    explosionDamage: COMPASS_BLADE_EXPLOSION_DAMAGE,
    explosionRadius,
  }
}

export function getCompassBladeRespawnUntilMs({ exploded, nowMs = 0 }) {
  return exploded ? nowMs + COMPASS_BLADE_RESPAWN_MS : 0
}

export function shouldRenderCompassBladeHitBodies({ active }) {
  return !!active
}

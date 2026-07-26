import { applyRadialDamage } from './weaponTargeting.js'

// 지우개 폭탄과 스타링크 추락이 공유하는 폭발 전투 계약이다.
export function applyEraserBombImpact({ x, z, damage, radius, sightBlocker, ignoreSightBlock, applyDamage = applyRadialDamage }) {
  const impact = {
    x,
    z,
    radius,
    damage,
    knockback: 2.5,
    knockbackMs: 120,
    deathStyleOverride: 'shatter5',
    canCrit: false,
    damageType: 'explosive',
    attackTags: ['radial', 'explosive'],
    ignoreSightBlock: ignoreSightBlock === true,
  }
  if (sightBlocker) impact.sightBlocker = sightBlocker
  return applyDamage(impact)
}

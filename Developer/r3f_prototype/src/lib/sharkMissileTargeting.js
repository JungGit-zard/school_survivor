import { findBestSplashTarget } from './weaponTargeting.js'

export function findSharkMissileClusterTarget({ range, radius }) {
  return findBestSplashTarget(range, radius)
}

// Firebase progress 모듈에 의존하지 않는 무기 해금 v2 이전 계약.
// Backend transaction과 unit test가 이 파일을 직접 import한다.
export const WEAPON_UNLOCK_SCHEMA_VERSION = 2
export const LEGACY_ACCOUNT_ENTITLEMENT_IDS = Object.freeze([
  'scienceFlask', 'bell', 'stunGun', 'onigiri', 'chibiko', 'inucon',
])

export function getLegacyAccountEntitlementIds() {
  return [...LEGACY_ACCOUNT_ENTITLEMENT_IDS]
}

// schemaVersion < 2인 기존 계정에만 적용한다. Firebase 읽기/쓰기는 하지 않는다.
export function mergeLegacyAccountEntitlements(rawUnlocks) {
  const out = rawUnlocks && typeof rawUnlocks === 'object' && !Array.isArray(rawUnlocks)
    ? { ...rawUnlocks }
    : {}
  for (const id of LEGACY_ACCOUNT_ENTITLEMENT_IDS) out[id] = 1
  return out
}

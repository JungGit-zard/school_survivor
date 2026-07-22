export const PROJECT_MASTER_EMAIL = 'zard5388@gmail.com'

export function normalizeProjectAdminEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function getAuthProviderIds(user) {
  const providerIds = new Set()
  const add = (value) => {
    if (typeof value === 'string' && value.trim()) providerIds.add(value.trim())
  }

  for (const providerId of Array.isArray(user?.providerIds) ? user.providerIds : []) add(providerId)
  for (const provider of Array.isArray(user?.providerData) ? user.providerData : []) add(provider?.providerId)
  return [...providerIds]
}

export function isProjectMaster(user) {
  return normalizeProjectAdminEmail(user?.email) === PROJECT_MASTER_EMAIL
    && user?.emailVerified === true
    && getAuthProviderIds(user).includes('google.com')
}

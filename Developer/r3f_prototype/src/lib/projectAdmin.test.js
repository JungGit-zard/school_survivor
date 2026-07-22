import { describe, expect, it } from 'vitest'
import { getAuthProviderIds, isProjectMaster, normalizeProjectAdminEmail } from './projectAdmin.js'

const verifiedGoogleMaster = {
  email: ' zard5388@gmail.com ',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
}

describe('project master authorization', () => {
  it('accepts only the verified exact Google account', () => {
    expect(isProjectMaster(verifiedGoogleMaster)).toBe(true)
    expect(isProjectMaster({ ...verifiedGoogleMaster, email: 'zard5388+admin@gmail.com' })).toBe(false)
    expect(isProjectMaster({ ...verifiedGoogleMaster, email: 'zard5388@gmail.com.evil.test' })).toBe(false)
  })

  it('rejects unverified, non-Google, and E2E-shaped users', () => {
    expect(isProjectMaster({ ...verifiedGoogleMaster, emailVerified: false })).toBe(false)
    expect(isProjectMaster({ ...verifiedGoogleMaster, providerData: [{ providerId: 'password' }] })).toBe(false)
    expect(isProjectMaster({ uid: 'e2e-local-test', email: 'zard5388@gmail.com' })).toBe(false)
  })

  it('uses provider IDs from Firebase provider data or the minimal auth user', () => {
    expect(getAuthProviderIds({ providerIds: ['google.com', 'password'] })).toEqual(['google.com', 'password'])
    expect(isProjectMaster({ ...verifiedGoogleMaster, providerData: [], providerIds: ['google.com'] })).toBe(true)
    expect(normalizeProjectAdminEmail(' ZARD5388@GMAIL.COM ')).toBe('zard5388@gmail.com')
  })
})

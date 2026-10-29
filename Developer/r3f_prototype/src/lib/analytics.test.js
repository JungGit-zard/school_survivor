import { describe, expect, it, vi } from 'vitest'
import { createAnalyticsTracker, isAnalyticsEnabled, sanitizeAnalyticsParams, trackEvent } from './analytics.js'

const ENV = {
  MODE: 'production',
  DEV: false,
  VITE_FIREBASE_API_KEY: 'k',
  VITE_FIREBASE_AUTH_DOMAIN: 'd',
  VITE_FIREBASE_PROJECT_ID: 'p',
  VITE_FIREBASE_APP_ID: 'a',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-TEST',
}
const PROD = { location: { protocol: 'https:', hostname: 'escapezombie.com', pathname: '/' } }
const flush = async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve() }

function fakeModules({ supported = true } = {}) {
  const logEvent = vi.fn()
  const analyticsModule = { isSupported: vi.fn(async () => supported), getAnalytics: vi.fn(() => ({ ga: true })), logEvent }
  const appModule = { getApps: () => [], getApp: vi.fn(), initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })) }
  return { logEvent, analyticsModule, appModule, loadModules: vi.fn(async () => [appModule, analyticsModule]) }
}

describe('isAnalyticsEnabled', () => {
  it('only on a configured https production host', () => {
    expect(isAnalyticsEnabled(ENV, PROD)).toBe(true)
    expect(isAnalyticsEnabled({ ...ENV, MODE: 'test' }, PROD)).toBe(false)
    expect(isAnalyticsEnabled({ ...ENV, VITEST: 'true' }, PROD)).toBe(false)
    expect(isAnalyticsEnabled({ ...ENV, DEV: true }, PROD)).toBe(false)
    expect(isAnalyticsEnabled({ ...ENV, VITE_FIREBASE_MEASUREMENT_ID: '' }, PROD)).toBe(false)
    expect(isAnalyticsEnabled({ ...ENV, VITE_FIREBASE_API_KEY: '' }, PROD)).toBe(false)
    expect(isAnalyticsEnabled(ENV, { location: { protocol: 'https:', hostname: 'localhost', pathname: '/' } })).toBe(false)
    expect(isAnalyticsEnabled(ENV, { location: { protocol: 'http:', hostname: 'escapezombie.com', pathname: '/' } })).toBe(false)
    expect(isAnalyticsEnabled(ENV, { location: { ...PROD.location, pathname: '/graphics-studio' } })).toBe(false)
    expect(isAnalyticsEnabled(ENV, {})).toBe(false)
  })
})

describe('sanitizeAnalyticsParams', () => {
  it('drops identity-like keys and non-primitive values', () => {
    expect(sanitizeAnalyticsParams({ stage_id: 'stage1', score: 12, boss_defeated: true, uid: 'x', email: 'e', displayName: 'n', user_id: 'u', obj: {}, nan: NaN }))
      .toEqual({ stage_id: 'stage1', score: 12, boss_defeated: 1 })
    expect(sanitizeAnalyticsParams(null)).toEqual({})
  })
})

describe('createAnalyticsTracker', () => {
  it('logs through firebase/analytics when enabled, initializing once', async () => {
    const m = fakeModules()
    const { trackEvent: track } = createAnalyticsTracker({ env: ENV, globalScope: PROD, loadModules: m.loadModules })
    track('run_start', { stage_id: 'stage1', mode: 'guest', uid: 'leak' })
    track('run_end', { result: 'dead' })
    await flush()
    expect(m.loadModules).toHaveBeenCalledTimes(1)
    expect(m.analyticsModule.getAnalytics).toHaveBeenCalledTimes(1)
    expect(m.logEvent.mock.calls.map(([, n, p]) => [n, p])).toEqual([
      ['run_start', { stage_id: 'stage1', mode: 'guest' }],
      ['run_end', { result: 'dead' }],
    ])
  })

  it('reuses the existing default Firebase app instead of creating a second one', async () => {
    const m = fakeModules()
    const existing = { name: '[DEFAULT]' }
    m.appModule.getApps = () => [existing]
    m.appModule.getApp.mockReturnValue(existing)
    createAnalyticsTracker({ env: ENV, globalScope: PROD, loadModules: m.loadModules }).trackEvent('x')
    await flush()
    expect(m.appModule.initializeApp).not.toHaveBeenCalled()
    expect(m.analyticsModule.getAnalytics).toHaveBeenCalledWith(existing)
  })

  it('is a no-op when disabled (never loads the SDK)', async () => {
    const m = fakeModules()
    createAnalyticsTracker({ env: { ...ENV, DEV: true }, globalScope: PROD, loadModules: m.loadModules }).trackEvent('run_start')
    await flush()
    expect(m.loadModules).not.toHaveBeenCalled()
  })

  it('is a no-op when the browser is unsupported', async () => {
    const m = fakeModules({ supported: false })
    createAnalyticsTracker({ env: ENV, globalScope: PROD, loadModules: m.loadModules }).trackEvent('run_start')
    await flush()
    expect(m.analyticsModule.getAnalytics).not.toHaveBeenCalled()
    expect(m.logEvent).not.toHaveBeenCalled()
  })

  it('never throws or rejects when the SDK fails', async () => {
    const failingLoad = vi.fn(async () => { throw new Error('blocked by adblock') })
    const { trackEvent: track } = createAnalyticsTracker({ env: ENV, globalScope: PROD, loadModules: failingLoad })
    expect(() => track('run_start', {})).not.toThrow()
    const m = fakeModules()
    m.logEvent.mockImplementation(() => { throw new Error('boom') })
    const t2 = createAnalyticsTracker({ env: ENV, globalScope: PROD, loadModules: m.loadModules })
    expect(() => t2.trackEvent('run_end', {})).not.toThrow()
    await flush()
    expect(() => track(undefined)).not.toThrow()
  })

  it('default trackEvent is a safe no-op under vitest', () => {
    expect(() => trackEvent('run_start', { stage_id: 'stage1' })).not.toThrow()
  })
})

describe('init', () => {
  it('starts GA without logging a custom event, and only when enabled', async () => {
    const m = fakeModules()
    createAnalyticsTracker({ env: ENV, globalScope: PROD, loadModules: m.loadModules }).init()
    await flush()
    expect(m.analyticsModule.getAnalytics).toHaveBeenCalledTimes(1)
    expect(m.logEvent).not.toHaveBeenCalled()
    const off = fakeModules()
    createAnalyticsTracker({ env: { ...ENV, MODE: 'test' }, globalScope: PROD, loadModules: off.loadModules }).init()
    await flush()
    expect(off.loadModules).not.toHaveBeenCalled()
  })
})

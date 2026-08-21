import { describe, expect, it } from 'vitest'
import { isMobileJoystickEnvironment } from './mobileInput.js'

function makeNavigator({ maxTouchPoints, userAgent, platform = '' }) {
  return { maxTouchPoints, userAgent, platform }
}

function makeMatchMedia(matches) {
  return () => ({ matches })
}

describe('isMobileJoystickEnvironment', () => {
  it('rejects desktop browsers even when they are web clients', () => {
    const result = isMobileJoystickEnvironment({
      navigatorObj: makeNavigator({
        maxTouchPoints: 0,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }),
      matchMediaFn: makeMatchMedia(false),
    })

    expect(result).toBe(false)
  })

  it('rejects touch-capable desktop browsers', () => {
    const result = isMobileJoystickEnvironment({
      navigatorObj: makeNavigator({
        maxTouchPoints: 10,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }),
      matchMediaFn: makeMatchMedia(true),
    })

    expect(result).toBe(false)
  })

  it('allows mobile browsers with coarse touch input', () => {
    const result = isMobileJoystickEnvironment({
      navigatorObj: makeNavigator({
        maxTouchPoints: 5,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      }),
      matchMediaFn: makeMatchMedia(true),
    })

    expect(result).toBe(true)
  })

  it('allows iPad desktop-mode Safari as a mobile touch environment', () => {
    const result = isMobileJoystickEnvironment({
      navigatorObj: makeNavigator({
        maxTouchPoints: 5,
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      }),
      matchMediaFn: makeMatchMedia(true),
    })

    expect(result).toBe(true)
  })
})

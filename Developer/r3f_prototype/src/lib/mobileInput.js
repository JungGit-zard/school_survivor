export function isMobileJoystickEnvironment({
  navigatorObj = typeof navigator !== 'undefined' ? navigator : undefined,
  matchMediaFn = typeof window !== 'undefined' ? window.matchMedia?.bind(window) : undefined,
} = {}) {
  if (!navigatorObj || !matchMediaFn) return false

  const hasTouch = Number(navigatorObj.maxTouchPoints ?? 0) > 0
  const hasCoarsePointer = matchMediaFn('(pointer: coarse)')?.matches === true
  const ua = navigatorObj.userAgent || ''
  const platform = navigatorObj.platform || ''
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const ipadDesktopMode = platform === 'MacIntel' && Number(navigatorObj.maxTouchPoints ?? 0) > 1

  return hasTouch && hasCoarsePointer && (mobileUserAgent || ipadDesktopMode)
}

function renderEmergencyBootstrapFailure() {
  const root = document.getElementById('root')
  if (!root) return

  const screen = document.createElement('main')
  screen.setAttribute('role', 'alert')
  screen.setAttribute('aria-live', 'assertive')
  screen.textContent = '게임을 시작하지 못했습니다. 새로고침 후 다시 시도해 주세요.'
  Object.assign(screen.style, {
    minHeight: '100vh', display: 'grid', placeContent: 'center', padding: '24px',
    background: '#0a0a0f', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', textAlign: 'center',
  })
  root.replaceChildren(screen)
}

void import('./lib/rootBootstrap.js')
  .then(({ bootstrapApplication }) => bootstrapApplication())
  .catch(renderEmergencyBootstrapFailure)

// GA4: start after first paint/idle so it never competes with game boot. No-op off production.
function startAnalyticsWhenIdle() {
  void import('./lib/analytics.js').then(({ initAnalytics }) => initAnalytics()).catch(() => {})
}
if (typeof window !== 'undefined') {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(startAnalyticsWhenIdle, { timeout: 5000 })
  else setTimeout(startAnalyticsWhenIdle, 3000)
}

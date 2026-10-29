// GA4 via Firebase Analytics (Terry 2026-10-29: "통계 매우 중요하다 켜고").
// Property 541779330 / measurementId from VITE_FIREBASE_MEASUREMENT_ID.
//
// Contract: trackEvent() is fire-and-forget, never throws, never awaits in the caller, and is a
// no-op in tests, in dev builds, on localhost, on the Graphics Studio route, when Firebase is not
// configured, when measurementId is missing, and when the browser does not support Analytics.
// firebase/analytics is imported lazily so it is not part of the main bundle.
// No PII: params are limited to primitive values, and identity-like keys are dropped.
import { getFirebaseConfig, isFirebaseAuthConfigured, isGraphicsStudioLocation, resolveFirebaseAppForRoute } from './firebaseAuth.js'

const BLOCKED_PARAM_KEY = /(uid|email|name|user|phone|token)/i
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

export function sanitizeAnalyticsParams(params) {
  const out = {}
  if (!params || typeof params !== 'object') return out
  for (const [key, value] of Object.entries(params)) {
    if (BLOCKED_PARAM_KEY.test(key)) continue
    if (typeof value === 'string') out[key] = value.slice(0, 100)
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    else if (typeof value === 'boolean') out[key] = value ? 1 : 0
  }
  return out
}

export function isAnalyticsEnabled(env = getDefaultEnv(), globalScope = getDefaultGlobalScope()) {
  if (env?.MODE === 'test' || env?.VITEST || env?.DEV === true) return false
  const location = globalScope?.location
  if (!location || location.protocol !== 'https:') return false
  if (LOCAL_HOSTNAMES.has(location.hostname)) return false
  if (isGraphicsStudioLocation(location)) return false
  if (!isFirebaseAuthConfigured(env)) return false
  return Boolean(getFirebaseConfig(env, globalScope).measurementId)
}

// Returns { trackEvent }. Dependencies are injectable for tests.
export function createAnalyticsTracker({
  env = getDefaultEnv(),
  globalScope = getDefaultGlobalScope(),
  loadModules = () => Promise.all([import('firebase/app'), import('firebase/analytics')]),
} = {}) {
  let clientPromise = null

  function getClient() {
    if (clientPromise) return clientPromise
    clientPromise = (async () => {
      if (!isAnalyticsEnabled(env, globalScope)) return null
      const [appModule, analyticsModule] = await loadModules()
      if (!(await analyticsModule.isSupported())) return null
      const app = resolveFirebaseAppForRoute(appModule, env, globalScope)
      const analytics = analyticsModule.getAnalytics(app)
      return { analytics, logEvent: analyticsModule.logEvent }
    })().catch(() => null)
    return clientPromise
  }

  function trackEvent(name, params) {
    try {
      if (typeof name !== 'string' || !name) return
      const safeParams = sanitizeAnalyticsParams(params)
      void getClient()
        .then((client) => { if (client) client.logEvent(client.analytics, name, safeParams) })
        .catch(() => {})
    } catch {
      // Analytics must never affect gameplay.
    }
  }

  // Starts GA4 (automatic page_view / session / first_visit) without logging a custom event.
  function init() {
    try { void getClient() } catch { /* never throw */ }
  }

  return { trackEvent, init }
}

let defaultTracker = null

export function trackEvent(name, params) {
  try {
    defaultTracker ??= createAnalyticsTracker()
    defaultTracker.trackEvent(name, params)
  } catch {
    // never throw
  }
}

// Called once after app bootstrap so visitors who never start a run are still counted.
export function initAnalytics() {
  try {
    defaultTracker ??= createAnalyticsTracker()
    defaultTracker.init()
  } catch {
    // never throw
  }
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}

function getDefaultGlobalScope() {
  return typeof window !== 'undefined' ? window : globalThis
}

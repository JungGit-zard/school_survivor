import { Capacitor } from '@capacitor/core'
import { getAuthProviderIds, isProjectMaster } from './projectAdmin.js'

const REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

const OPTIONAL_ENV_KEY_MAP = {
  VITE_FIREBASE_DATABASE_URL: 'databaseURL',
  VITE_FIREBASE_STORAGE_BUCKET: 'storageBucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  VITE_FIREBASE_MEASUREMENT_ID: 'measurementId',
}

export function isFirebaseAuthConfigured(env = getDefaultEnv()) {
  return REQUIRED_ENV_KEYS.every((key) => typeof env[key] === 'string' && env[key].trim().length > 0)
}

export function getFirebaseConfig(env = getDefaultEnv()) {
  const config = {
    apiKey: readEnv(env, 'VITE_FIREBASE_API_KEY'),
    authDomain: readEnv(env, 'VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv(env, 'VITE_FIREBASE_PROJECT_ID'),
    appId: readEnv(env, 'VITE_FIREBASE_APP_ID'),
  }

  for (const [envKey, configKey] of Object.entries(OPTIONAL_ENV_KEY_MAP)) {
    const value = readEnv(env, envKey)
    if (value) config[configKey] = value
  }

  return config
}

export function toAuthUser(user) {
  if (!user) return null
  const authUser = {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    emailVerified: user.emailVerified === true,
    providerIds: getAuthProviderIds(user),
  }
  return { ...authUser, isProjectMaster: isProjectMaster(authUser) }
}

export function shouldUseNativeGoogleSignIn(globalScope = getDefaultGlobalScope(), capacitorBridge = Capacitor) {
  const injectedCapacitor = globalScope?.Capacitor
  const bridge = injectedCapacitor ?? capacitorBridge
  const platform = typeof bridge?.getPlatform === 'function' ? bridge.getPlatform() : ''
  const isNative = typeof bridge?.isNativePlatform === 'function' ? bridge.isNativePlatform() : false

  return isNative || platform === 'android' || platform === 'ios' || globalScope?.location?.protocol === 'capacitor:'
}

export function getLocalFirebaseAuthRedirect(location = getDefaultGlobalScope()?.location, isDevelopment = import.meta.env?.DEV === true) {
  if (!isDevelopment || !location?.href) return null
  const url = new URL(location.href)
  if (url.pathname.startsWith('/graphics-studio')) return null
  if (!['127.0.0.1', '0.0.0.0'].includes(url.hostname)) return null
  url.hostname = 'localhost'
  return url.href
}

export async function createFirebaseAuthClient(env = getDefaultEnv(), globalScope = getDefaultGlobalScope()) {
  if (!isFirebaseAuthConfigured(env)) {
    return {
      configured: false,
      subscribe: (onChange) => {
        onChange(null)
        return () => {}
      },
      signInWithGoogle: async () => {
        throw new Error('Firebase auth is not configured.')
      },
      signOut: async () => {},
    }
  }

  const [{ initializeApp, getApp, getApps }, authModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ])
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig(env))
  await maybeInitAppCheck(app, env)
  const auth = authModule.getAuth(app)
  await setFirebaseAuthMemoryPersistence(authModule, auth)
  const provider = new authModule.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const useNativeGoogle = shouldUseNativeGoogleSignIn(globalScope)

  return {
    configured: true,
    subscribe: (onChange) => {
      const unsubscribe = authModule.onAuthStateChanged(auth, (user) => onChange(toAuthUser(user)))
      return unsubscribe
    },
    signInWithGoogle: async () => {
      if (useNativeGoogle) {
        return signInWithNativeGoogle(authModule, auth)
      }
      const credential = await authModule.signInWithPopup(auth, provider)
      return toAuthUser(credential.user)
    },
    signOut: async () => {
      await authModule.signOut(auth)
      if (useNativeGoogle) {
        await signOutNativeGoogle()
      }
    },
  }
}

export async function setFirebaseAuthMemoryPersistence(authModule, auth) {
  if (typeof authModule?.setPersistence !== 'function' || !authModule?.inMemoryPersistence) {
    throw new Error('Firebase Auth memory-only persistence is unavailable.')
  }
  await authModule.setPersistence(auth, authModule.inMemoryPersistence)
}

// App Check(reCAPTCHA v3)은 site key가 있을 때만 1회 초기화한다.
// 키가 없으면 완전 no-op이라 dev/CI에서 firebase/app-check를 불러오지 않는다.
let appCheckInitialized = false
async function maybeInitAppCheck(app, env) {
  if (appCheckInitialized) return
  const siteKey = readEnv(env, 'VITE_FIREBASE_APPCHECK_KEY')
  if (!siteKey) return
  const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check')
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  appCheckInitialized = true
}

async function signInWithNativeGoogle(authModule, auth) {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true }).catch((error) => {
    throw getNativeGoogleSignInError(error)
  })
  const idToken = result?.credential?.idToken ?? null
  const accessToken = result?.credential?.accessToken ?? null

  if (!idToken && !accessToken) {
    throw new Error('Google native login did not return a Firebase credential.')
  }

  const googleCredential = authModule.GoogleAuthProvider.credential(idToken, accessToken)
  const userCredential = await authModule.signInWithCredential(auth, googleCredential)
  return toAuthUser(userCredential.user)
}

function getNativeGoogleSignInError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (message.includes('default_web_client_id') || message.includes('Resources$NotFoundException')) {
    return new Error('모바일 Google 로그인 설정이 완료되지 않았습니다. Firebase Android google-services.json과 SHA 인증서를 확인하세요.')
  }
  return error instanceof Error ? error : new Error('Mobile Google login failed.')
}

async function signOutNativeGoogle() {
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
    await FirebaseAuthentication.signOut()
  } catch (error) {
    if (typeof console !== 'undefined') console.warn('Native Google sign-out failed.', error)
  }
}

function readEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}

function getDefaultGlobalScope() {
  return typeof window !== 'undefined' ? window : globalThis
}

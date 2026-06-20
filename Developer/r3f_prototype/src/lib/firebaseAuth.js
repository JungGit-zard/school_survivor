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
  return {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
  }
}

export async function createFirebaseAuthClient(env = getDefaultEnv()) {
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
  const auth = authModule.getAuth(app)
  const provider = new authModule.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  return {
    configured: true,
    subscribe: (onChange) => authModule.onAuthStateChanged(auth, (user) => onChange(toAuthUser(user))),
    signInWithGoogle: async () => {
      const credential = await authModule.signInWithPopup(auth, provider)
      return toAuthUser(credential.user)
    },
    signOut: () => authModule.signOut(auth),
  }
}

function readEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}

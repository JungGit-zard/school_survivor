import { isE2EAudioDiagnostics } from './lib/e2eAuth.js'

if (isE2EAudioDiagnostics()) {
  // This branch must stay before all game/Firebase/Studio imports. It only
  // fetches and decodes public audio assets; it never plays or persists data.
  void Promise.all([
    import('react-dom/client'),
    import('./components/AudioDiagnostics.jsx'),
  ]).then(([{ createRoot }, { default: AudioDiagnostics }]) => {
    createRoot(document.getElementById('root')).render(<AudioDiagnostics />)
  })
} else {
  void Promise.all([
    import('./lib/studioLocalStorageGuard.js'),
    import('react-dom/client'),
    import('./App.jsx'),
    import('./lib/firebaseAuth.js'),
  ]).then(([{ installStudioLocalStorageGuard }, { createRoot }, { default: App }, { getLocalFirebaseAuthRedirect }]) => {
    installStudioLocalStorageGuard()
    const authSafeHref = getLocalFirebaseAuthRedirect()
    if (authSafeHref) {
      window.location.replace(authSafeHref)
    } else {
      createRoot(document.getElementById('root')).render(<App />)
    }
  })
}

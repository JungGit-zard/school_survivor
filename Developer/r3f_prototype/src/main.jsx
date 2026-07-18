import { installStudioLocalStorageGuard } from './lib/studioLocalStorageGuard.js'

installStudioLocalStorageGuard()

void Promise.all([
  import('react-dom/client'),
  import('./App.jsx'),
  import('./lib/firebaseAuth.js'),
]).then(([{ createRoot }, { default: App }, { getLocalFirebaseAuthRedirect }]) => {
  const authSafeHref = getLocalFirebaseAuthRedirect()
  if (authSafeHref) {
    window.location.replace(authSafeHref)
  } else {
    createRoot(document.getElementById('root')).render(<App />)
  }
})

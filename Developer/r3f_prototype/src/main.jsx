import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { getLocalFirebaseAuthRedirect } from './lib/firebaseAuth.js'

const authSafeHref = getLocalFirebaseAuthRedirect()
if (authSafeHref) {
  window.location.replace(authSafeHref)
} else {
  createRoot(document.getElementById('root')).render(<App />)
}

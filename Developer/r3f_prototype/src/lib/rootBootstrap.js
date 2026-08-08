function getRoot(documentRef) {
  const existing = documentRef.getElementById('root')
  if (existing) return existing
  if (!documentRef.body) return null
  const root = documentRef.createElement('div')
  root.id = 'root'
  documentRef.body.append(root)
  return root
}

export function renderBootstrapFailure({ documentRef = document, root = getRoot(documentRef), reload = () => window.location.reload() } = {}) {
  if (!root) return false

  const screen = documentRef.createElement('main')
  screen.setAttribute('role', 'alert')
  screen.setAttribute('aria-live', 'assertive')
  screen.dataset.testid = 'root-bootstrap-failure'
  Object.assign(screen.style, {
    minHeight: '100vh', display: 'grid', placeContent: 'center', gap: '16px', padding: '24px',
    background: '#0a0a0f', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', textAlign: 'center',
  })

  const title = documentRef.createElement('h1')
  title.textContent = '게임을 시작하지 못했습니다'
  const message = documentRef.createElement('p')
  message.textContent = '일시적인 로드 오류입니다. 새로고침 후 다시 시도해 주세요.'
  const button = documentRef.createElement('button')
  button.type = 'button'
  button.textContent = '새로고침'
  button.addEventListener('click', reload)
  Object.assign(button.style, {
    justifySelf: 'center', minHeight: '44px', padding: '10px 22px', border: '2px solid #f8fafc',
    borderRadius: '10px', background: '#2b145b', color: '#f8fafc', fontWeight: '800', cursor: 'pointer',
  })

  screen.append(title, message, button)
  root.replaceChildren(screen)
  return true
}

export async function bootstrapApplication({
  documentRef = document,
  root = getRoot(documentRef),
  reload = () => window.location.reload(),
  replaceLocation = (href) => window.location.replace(href),
  loadReact = () => import('react'),
  loadReactDom = () => import('react-dom/client'),
  loadErrorBoundary = () => import('../components/ErrorBoundary.jsx'),
  loadStudioGuard = () => import('./studioLocalStorageGuard.js'),
  loadApp = () => import('../App.jsx'),
  loadFirebaseAuth = () => import('./firebaseAuth.js'),
} = {}) {
  try {
    const [
      { installStudioLocalStorageGuard },
      { createElement },
      { createRoot },
      { default: ErrorBoundary },
      { default: App },
      { getLocalFirebaseAuthRedirect },
    ] = await Promise.all([
      loadStudioGuard(), loadReact(), loadReactDom(), loadErrorBoundary(), loadApp(), loadFirebaseAuth(),
    ])
    installStudioLocalStorageGuard()
    const authSafeHref = getLocalFirebaseAuthRedirect()
    if (authSafeHref) {
      replaceLocation(authSafeHref)
      return { status: 'redirected' }
    }
    createRoot(root).render(createElement(ErrorBoundary, null, createElement(App)))
    return { status: 'mounted-app' }
  } catch (error) {
    renderBootstrapFailure({ documentRef, root, reload })
    return { status: 'failed', error }
  }
}

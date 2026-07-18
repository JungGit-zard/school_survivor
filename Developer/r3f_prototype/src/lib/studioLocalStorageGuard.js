export const FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID = 'fatal-studio-local-storage-dialog'

const FORBIDDEN_STUDIO_STORAGE_PREFIXES = Object.freeze([
  'escape-zombie-school.graphicsStudio',
  'escape-zombie-school.sfxTunings',
  'escape-zombie-school.stageBossPreview',
  'escape-zombie-school.textureDecals',
  'escape-zombie-school.stagePropPlacements',
  'escape-zombie-school.studioGame',
  'escape-zombie-school.firebaseStudio',
])

const INSTALL_MARKER = Symbol.for('escape-zombie-school.studioLocalStorageGuard.installed')
const ORIGINALS_MARKER = Symbol.for('escape-zombie-school.studioLocalStorageGuard.originals')

export class FatalStudioLocalStorageError extends Error {
  constructor(operation, key = null) {
    const keyText = key === null ? '' : ` (${String(key)})`
    super(`Graphics Studio localStorage ${operation} access is forbidden${keyText}. Firebase only.`)
    this.name = 'FatalStudioLocalStorageError'
    this.operation = operation
    this.storageKey = key
  }
}

export function isForbiddenStudioStorageKey(key) {
  const value = String(key ?? '')
  return FORBIDDEN_STUDIO_STORAGE_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function installStudioLocalStorageGuard(scope = globalThis) {
  const StorageConstructor = scope?.Storage
  const prototype = StorageConstructor?.prototype
  if (!prototype || prototype[INSTALL_MARKER]) return false

  const originals = {
    getItem: prototype.getItem,
    setItem: prototype.setItem,
    removeItem: prototype.removeItem,
    clear: prototype.clear,
    key: prototype.key,
  }
  Object.defineProperty(prototype, ORIGINALS_MARKER, {
    configurable: false,
    enumerable: false,
    value: originals,
  })

  prototype.getItem = function guardedGetItem(key) {
    if (isLocalStorageInstance(this, scope) && isForbiddenStudioStorageKey(key)) {
      fatalStudioLocalStorageAccess('getItem', key, scope)
    }
    return originals.getItem.call(this, key)
  }
  prototype.setItem = function guardedSetItem(key, value) {
    if (isLocalStorageInstance(this, scope) && isForbiddenStudioStorageKey(key)) {
      fatalStudioLocalStorageAccess('setItem', key, scope)
    }
    return originals.setItem.call(this, key, value)
  }
  prototype.removeItem = function guardedRemoveItem(key) {
    if (isLocalStorageInstance(this, scope) && isForbiddenStudioStorageKey(key)) {
      fatalStudioLocalStorageAccess('removeItem', key, scope)
    }
    return originals.removeItem.call(this, key)
  }
  prototype.clear = function guardedClear() {
    if (isLocalStorageInstance(this, scope)) {
      fatalStudioLocalStorageAccess('clear', null, scope)
    }
    return originals.clear.call(this)
  }
  Object.defineProperty(prototype, INSTALL_MARKER, {
    configurable: false,
    enumerable: false,
    value: true,
  })
  return true
}

export function fatalStudioLocalStorageAccess(operation, key = null, scope = globalThis) {
  showFatalStudioLocalStorageDialog({ operation, key, document: scope?.document })
  throw new FatalStudioLocalStorageError(operation, key)
}

export function showFatalStudioLocalStorageDialog({ operation, key = null, document = globalThis.document } = {}) {
  if (!document?.createElement) return null
  const existing = document.getElementById(FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID)
  if (existing) return existing

  const dialog = document.createElement('div')
  dialog.id = FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID
  dialog.setAttribute('role', 'alertdialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', `${FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID}-title`)
  dialog.setAttribute('aria-describedby', `${FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID}-message`)
  dialog.tabIndex = -1
  dialog.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:grid',
    'place-items:center',
    'padding:24px',
    'background:rgba(20,0,0,.94)',
    'color:#fff',
    'font-family:system-ui,sans-serif',
  ].join(';')

  const panel = document.createElement('div')
  panel.style.cssText = [
    'width:min(560px,100%)',
    'border:4px solid #ff334f',
    'border-radius:14px',
    'padding:24px',
    'background:#250006',
    'box-shadow:0 24px 80px rgba(0,0,0,.65)',
  ].join(';')

  const title = document.createElement('h1')
  title.id = `${FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID}-title`
  title.textContent = '치명적 오류: 그래픽 스타지오 로컬 저장 차단'
  title.style.cssText = 'margin:0 0 14px;font-size:24px;color:#ff6b7f'

  const message = document.createElement('p')
  message.id = `${FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID}-message`
  const keyText = key === null ? '' : ` 대상 키: ${String(key)}.`
  message.textContent = `금지된 localStorage ${operation} 접근이 감지되었습니다.${keyText} 그래픽 스타지오 데이터는 Firebase에서만 불러오고 저장해야 합니다. 실행을 즉시 중단합니다.`
  message.style.cssText = 'margin:0;line-height:1.65;font-size:16px;font-weight:700'

  panel.append(title, message)
  dialog.append(panel)
  const mount = document.body ?? document.documentElement
  mount?.append(dialog)
  dialog.focus?.()
  return dialog
}

function isLocalStorageInstance(storage, scope) {
  try {
    return storage === scope.localStorage
  } catch {
    return false
  }
}

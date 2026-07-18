// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID,
  installStudioLocalStorageGuard,
  isForbiddenStudioStorageKey,
} from './studioLocalStorageGuard.js'

class FakeStorage {
  constructor() {
    this.values = new Map()
  }

  get length() {
    return this.values.size
  }

  getItem(key) {
    return this.values.get(String(key)) ?? null
  }

  setItem(key, value) {
    this.values.set(String(key), String(value))
  }

  removeItem(key) {
    this.values.delete(String(key))
  }

  clear() {
    this.values.clear()
  }

  key(index) {
    return [...this.values.keys()][index] ?? null
  }
}

function createScope() {
  class ScopedStorage extends FakeStorage {}
  return {
    Storage: ScopedStorage,
    localStorage: new ScopedStorage(),
    sessionStorage: new ScopedStorage(),
    document,
  }
}

describe('Graphics Studio localStorage fatal guard', () => {
  beforeEach(() => {
    document.getElementById(FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID)?.remove()
  })

  it('recognizes every Graphics Studio storage family without blocking game progress keys', () => {
    expect(isForbiddenStudioStorageKey('escape-zombie-school.graphicsStudioTunings.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.graphicsStudioPlayerSourceRevision.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.graphicsStudioResetBaseline.any')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.sfxTunings.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.stageBossPreview.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.textureDecals.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.stagePropPlacements.v3')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.studioGameUrl.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('escape-zombie-school.firebaseStudioOwnerUid.v1')).toBe(true)
    expect(isForbiddenStudioStorageKey('school_survivor:goldTotal')).toBe(false)
  })

  it.each(['getItem', 'setItem', 'removeItem'])(
    'shows an alertdialog before throwing on localStorage.%s',
    (operation) => {
      const scope = createScope()
      installStudioLocalStorageGuard(scope)
      expect(() => {
        if (operation === 'getItem') scope.localStorage.getItem('escape-zombie-school.graphicsStudioTunings.v1')
        if (operation === 'setItem') scope.localStorage.setItem('escape-zombie-school.graphicsStudioTunings.v1', '{}')
        if (operation === 'removeItem') scope.localStorage.removeItem('escape-zombie-school.graphicsStudioTunings.v1')
      }).toThrowError(/Firebase only/i)

      const dialog = document.getElementById(FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID)
      expect(dialog).not.toBeNull()
      expect(dialog.getAttribute('role')).toBe('alertdialog')
      expect(dialog.getAttribute('aria-modal')).toBe('true')
      expect(dialog.textContent).toContain('Firebase')
    },
  )

  it('blocks localStorage.clear but leaves sessionStorage and ordinary game keys alone', () => {
    const scope = createScope()
    installStudioLocalStorageGuard(scope)

    expect(() => scope.localStorage.setItem('school_survivor:goldTotal', '7')).not.toThrow()
    expect(scope.localStorage.getItem('school_survivor:goldTotal')).toBe('7')
    expect(() => scope.sessionStorage.clear()).not.toThrow()
    expect(() => scope.localStorage.clear()).toThrowError(/Firebase only/i)
    expect(document.getElementById(FATAL_STUDIO_LOCAL_STORAGE_DIALOG_ID)).not.toBeNull()
  })
})

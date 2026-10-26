import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cloud = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('./firebaseProgress.js', async (importOriginal) => ({
  ...(await importOriginal()),
  requestCloudProgressSave: (...args) => cloud.save(...args),
}))

import {
  _resetGuestSessionSettingsForTests,
  loadGuestSessionSettings,
  loadPlayerOutfit,
  loadTitleSettings,
  savePlayerOutfit,
  saveTitleSettings,
} from './titleSettings.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
  getFirebaseProgressRuntimeSnapshot,
  setCloudProgressUser,
} from './firebaseProgress.js'

beforeEach(() => {
  _resetFirebaseProgressForTests()
  _resetGuestSessionSettingsForTests()
  cloud.save.mockReset()
  cloud.save.mockResolvedValue(true)
})
afterEach(() => vi.restoreAllMocks())

describe('titleSettings.playerOutfit normalization', () => {
  it('keeps default/winter and drops unknown values from loadTitleSettings', () => {
    _seedHydratedFirebaseProgressForTests()
    for (const playerOutfit of ['default', 'winter']) {
      saveTitleSettings({ playerOutfit })
      expect(loadTitleSettings().playerOutfit).toBe(playerOutfit)
    }
    for (const playerOutfit of ['summer', 'v9', 1, null]) {
      saveTitleSettings({ playerOutfit })
      expect(loadTitleSettings()).not.toHaveProperty('playerOutfit')
      expect(getFirebaseProgressRuntimeSnapshot().progress.titleSettings).not.toHaveProperty('playerOutfit')
      expect(loadPlayerOutfit()).toBe('default')
    }
  })

  it('is independent of playerAppearance', () => {
    _seedHydratedFirebaseProgressForTests()
    saveTitleSettings({ playerAppearance: 'legacy', playerOutfit: 'winter' })
    expect(loadTitleSettings()).toMatchObject({ playerAppearance: 'legacy', playerOutfit: 'winter' })
    saveTitleSettings({ playerAppearance: 'v9' })
    expect(loadTitleSettings().playerOutfit).toBe('winter')
  })
})

describe('player outfit round trip', () => {
  it('account: absent => default; save writes the setting and requests a cloud save', async () => {
    _seedHydratedFirebaseProgressForTests()
    expect(loadPlayerOutfit()).toBe('default')
    await expect(savePlayerOutfit('winter')).resolves.toBe(true)
    expect(cloud.save).toHaveBeenCalledTimes(1)
    expect(getFirebaseProgressRuntimeSnapshot().progress.titleSettings.playerOutfit).toBe('winter')
    expect(loadPlayerOutfit()).toBe('winter')
    await expect(savePlayerOutfit('default')).resolves.toBe(true)
    expect(loadPlayerOutfit()).toBe('default')
  })

  it('account: a failed cloud save rolls the runtime back so later saves do not carry it', async () => {
    _seedHydratedFirebaseProgressForTests()
    cloud.save.mockResolvedValueOnce(false)
    await expect(savePlayerOutfit('winter')).resolves.toBe(false)
    expect(getFirebaseProgressRuntimeSnapshot().progress.titleSettings).not.toHaveProperty('playerOutfit')
    expect(loadPlayerOutfit()).toBe('default')
    await savePlayerOutfit('winter')
    cloud.save.mockRejectedValueOnce(new Error('PERMISSION_DENIED'))
    await expect(savePlayerOutfit('default')).resolves.toBe(false)
    expect(loadPlayerOutfit()).toBe('winter')
  })

  it('rejects unknown ids without touching storage', async () => {
    _seedHydratedFirebaseProgressForTests()
    await expect(savePlayerOutfit('summer')).resolves.toBe(false)
    expect(cloud.save).not.toHaveBeenCalled()
    expect(getFirebaseProgressRuntimeSnapshot().progress.titleSettings).not.toHaveProperty('playerOutfit')
  })

  it('guest: stored in session memory only, no cloud save', async () => {
    expect(loadPlayerOutfit()).toBe('default')
    await expect(savePlayerOutfit('winter')).resolves.toBe(true)
    expect(cloud.save).not.toHaveBeenCalled()
    expect(loadGuestSessionSettings().playerOutfit).toBe('winter')
    expect(loadPlayerOutfit()).toBe('winter')
  })

  it('signed in but not hydrated: default and not stored', async () => {
    setCloudProgressUser({ uid: 'waiting' })
    expect(loadPlayerOutfit()).toBe('default')
    await expect(savePlayerOutfit('winter')).resolves.toBe(false)
    expect(cloud.save).not.toHaveBeenCalled()
    expect(loadGuestSessionSettings()).not.toHaveProperty('playerOutfit')
  })
})

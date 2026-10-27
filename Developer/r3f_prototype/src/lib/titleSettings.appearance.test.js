import { beforeEach, describe, expect, it } from 'vitest'
import { loadTitleSettings, saveTitleSettings } from './titleSettings.js'
import { PLAYER_APPEARANCE_VALUES } from './playerAppearance.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
} from './firebaseProgress.js'

beforeEach(() => {
  _resetFirebaseProgressForTests()
  _seedHydratedFirebaseProgressForTests()
})

describe('account-owned player appearance round trip', () => {
  // Three whitelists guard this value (database.rules.json, normalizeTitleSettings,
  // loadTitleSettings). Any one of them missing a value drops the save silently, and
  // because saveTitleSettings spreads loadTitleSettings() the loss is deterministic:
  // the next save of any other setting erases the appearance it just wrote.
  it.each(['v9', 'legacy', 'rosari'])('saves and reads back %s', (playerAppearance) => {
    expect(PLAYER_APPEARANCE_VALUES).toContain(playerAppearance)
    saveTitleSettings({ playerAppearance })
    expect(loadTitleSettings().playerAppearance).toBe(playerAppearance)
  })

  it('keeps the appearance when an unrelated setting is saved afterwards', () => {
    saveTitleSettings({ playerAppearance: 'rosari' })
    // LobbySettingsModal re-saves the other settings on every change, without appearance.
    saveTitleSettings({ vibration: false })
    saveTitleSettings({ reducedEffects: true })
    const settings = loadTitleSettings()
    expect(settings.playerAppearance).toBe('rosari')
    expect(settings.vibration).toBe(false)
    expect(settings.reducedEffects).toBe(true)
  })

  it('does not introduce an appearance key for accounts that never chose one', () => {
    expect(loadTitleSettings()).not.toHaveProperty('playerAppearance')
    saveTitleSettings({ vibration: true })
    expect(loadTitleSettings()).not.toHaveProperty('playerAppearance')
  })

  it('drops values outside the canonical list instead of persisting them', () => {
    for (const playerAppearance of ['old', 'v8', 'ROSARI', '', 1, true, null]) {
      _resetFirebaseProgressForTests()
      _seedHydratedFirebaseProgressForTests()
      saveTitleSettings({ playerAppearance })
      expect(loadTitleSettings(), String(playerAppearance)).not.toHaveProperty('playerAppearance')
    }
  })
})

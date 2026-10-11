// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import { setCloudProgressUser, _seedHydratedFirebaseProgressForTests, buildCloudProgressSnapshot } from '../lib/firebaseProgress.js'
import { saveTitleSettings } from '../lib/titleSettings.js'
import { useAuthStore } from '../store/useAuthStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

it.each(['loading', 'error'])('opens settings after Google authentication while remote progress is %s', (progressStatus) => {
  const user = { uid: 'isolated-login-recovery-probe' }
  setCloudProgressUser(user)
  useAuthStore.setState({ status: 'signedIn', user, progressStatus })
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    expect(() => act(() => root.render(<LobbySettingsModal onClose={() => {}} />))).not.toThrow()
  } finally {
    act(() => root.unmount())
  }
})

it('loads late remote settings without replacing them with the waiting UI defaults', () => {
  const user = { uid: 'isolated-late-settings-probe' }
  setCloudProgressUser(user)
  useAuthStore.setState({ status: 'signedIn', user, progressStatus: 'loading' })
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    act(() => root.render(<LobbySettingsModal onClose={() => {}} />))
    _seedHydratedFirebaseProgressForTests(user)
    saveTitleSettings({ vibration: false, reducedEffects: true, hitCameraShake: false, playerAppearance: 'legacy' })
    const before = buildCloudProgressSnapshot().progress
    act(() => useAuthStore.setState({ progressStatus: 'ready' }))
    expect(buildCloudProgressSnapshot().progress).toEqual(before)
    expect(container.querySelector('button[aria-label="진동 켜기"]')).not.toBeNull()
  } finally {
    act(() => root.unmount())
  }
})

// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MissionCompleteToast from './MissionCompleteToast.jsx'
import { createMissionProgressState, reconcileMissionProgress, reduceMissionEvent } from '../lib/missionProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

let root
let host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useGameStore.setState({ phase: 'playing', missionSyncState: 'hydrated', missionProgress: reconcileMissionProgress(createMissionProgressState()) })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<MissionCompleteToast hidden={false} />))
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useAuthStore.setState({ user: null })
})

const complete = (event) => act(() => {
  useGameStore.setState((s) => ({ missionProgress: reduceMissionEvent(s.missionProgress, event) }))
})

describe('MissionCompleteToast', () => {
  it('pops once when a visible mission completes for a signed-in player', () => {
    useAuthStore.setState({ user: { uid: 'toast-user' } })
    complete({ type: 'pickup_collected', itemType: 'xpTextbook' })
    expect(host.querySelector('[data-testid="mission-complete-toast"]').textContent).toContain('첫 교과서 줍기')
  })

  it('stays silent for hidden (not yet revealed) missions', () => {
    useAuthStore.setState({ user: { uid: 'toast-user' } })
    complete({ type: 'pickup_collected', itemType: 'goldCoin' })
    expect(host.querySelector('[data-testid="mission-complete-toast"]')).toBeNull()
  })

  it('stays silent for guests', () => {
    complete({ type: 'pickup_collected', itemType: 'xpTextbook' })
    expect(host.querySelector('[data-testid="mission-complete-toast"]')).toBeNull()
  })

  it('stays silent when cloud hydration fills completions in one go', () => {
    useAuthStore.setState({ user: { uid: 'toast-user' } })
    act(() => {
      useGameStore.setState({
        missionSyncState: 'loading-done',
        missionProgress: reconcileMissionProgress(createMissionProgressState({ counters: { 'pickup.xpTextbook.count': 1 } })),
      })
    })
    expect(host.querySelector('[data-testid="mission-complete-toast"]')).toBeNull()
  })
})

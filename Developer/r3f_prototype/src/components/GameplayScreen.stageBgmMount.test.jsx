// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { state } = vi.hoisted(() => ({ state: { gameKey: 12, phase: 'playing', currentStageId: 'stage1' } }))
vi.mock('../store/useGameStore.js', () => ({ useGameStore: (select) => select(state) }))
vi.mock('./Stage1Bgm.jsx', () => ({ default: ({ stageId, phase, gameKey }) => (
  <div data-stage-bgm={stageId} data-phase={phase} data-run={gameKey} />
) }))
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./HUD.jsx', () => ({ default: () => null }))
vi.mock('./VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('../lib/criticalScreenShake.js', () => ({ subscribeWholeScreenCriticalShake: () => () => {} }))
vi.mock('../lib/i18n.js', () => ({ t: (key) => key }))
import GameplayScreen from './GameplayScreen.jsx'

let root
let container
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
})

async function render(isActive) {
  if (!root) {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  }
  await act(async () => { root.render(<GameplayScreen isActive={isActive} />) })
}

describe('retained GameplayScreen audio mount boundary', () => {
  it('unmounts stage audio while the retained game route is hidden even if store phase remains playing', async () => {
    state.currentStageId = 'stage1'
    state.phase = 'playing'
    await render(true)
    expect(container.querySelector('[data-stage-bgm]')?.dataset).toMatchObject({ stageBgm: 'stage1', phase: 'playing', run: '12' })
    await render(false)
    expect(container.querySelector('[data-stage-bgm]')).toBeNull()
    state.currentStageId = 'stage2'
    await render(true)
    expect(container.querySelector('[data-stage-bgm]')?.dataset).toMatchObject({ stageBgm: 'stage2', phase: 'playing', run: '12' })
  })
  it('does not mount stage audio on an initially inactive retained route', async () => {
    state.phase = 'playing'
    await render(false)
    expect(container.querySelector('[data-stage-bgm]')).toBeNull()
  })
})

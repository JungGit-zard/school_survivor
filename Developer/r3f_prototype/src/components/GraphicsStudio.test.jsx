// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import GraphicsStudio from './GraphicsStudio.jsx'
import {
  GRAPHICS_STUDIO_STORAGE_KEY,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
  saveStageBossPreview,
  saveStudioTunings,
  saveTextureDecals,
} from '../lib/graphicsStudioConfig.js'
import { loadSfxTunings, saveSfxTunings } from '../lib/sfxRegistry.js'
import { loadStagePropPlacements, resetStagePropPlacementsCache, saveStagePropPlacements } from '../lib/stagePropPlacements.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'

const cloudMocks = vi.hoisted(() => ({
  hydrate: vi.fn(),
  requestSave: vi.fn(),
  flush: vi.fn(),
  markChange: vi.fn(),
  setUser: vi.fn(),
}))
const authMocks = vi.hoisted(() => ({
  state: {
    status: 'unconfigured',
    user: null,
  },
  initialize: vi.fn(),
  signIn: vi.fn(),
}))

vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: (selector) => selector({
    ...authMocks.state,
    initializeAuth: authMocks.initialize,
    signInWithGoogle: authMocks.signIn,
  }),
}))

vi.mock('../lib/firebaseStudio.js', async (importOriginal) => ({
  ...(await importOriginal()),
  hydrateFirebaseStudio: cloudMocks.hydrate,
  requestFirebaseStudioSave: cloudMocks.requestSave,
  flushFirebaseStudioSave: cloudMocks.flush,
  markFirebaseStudioLocalChange: cloudMocks.markChange,
  setFirebaseStudioUser: cloudMocks.setUser,
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="stage-boss-preview-canvas" />,
}))

vi.mock('../lib/textureDecal.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fileToDecalDataUrl: vi.fn(async () => 'data:image/png;base64,MOCK'),
}))

vi.mock('./GraphicsStudioPreview.jsx', () => ({
  default: ({ selectedItem, tuning, focusedPartTuning, decals, onPartFocus }) => (
    <div
      data-testid="graphics-preview"
      onDoubleClick={(event) => onPartFocus?.(event.shiftKey
        ? { key: '0.2', label: 'Arm', additive: true }
        : { key: '0.1', label: 'Head', additive: false })}
    >
      {selectedItem.id}:{tuning.scale}:{tuning.scaleX}:{tuning.animation}:{focusedPartTuning?.scale ?? 'none'}
      <button
        type="button"
        data-testid="focus-stable-part"
        onClick={() => onPartFocus?.({ key: 'id:sample-head', label: 'b02Head', additive: false, faceAxis: '+z' })}
      />
      <span data-testid="preview-decals">{(decals ?? []).map((decal) => `${decal.partId}:${decal.faceAxis}`).join(',')}</span>
    </div>
  ),
}))

describe('GraphicsStudio', () => {
  let container
  let root

  beforeEach(() => {
    localStorage.clear()
    commitFirebaseStudioRuntime({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
    }, { revision: 1 })
    window.location.hash = ''
    authMocks.state.status = 'unconfigured'
    authMocks.state.user = null
    authMocks.initialize.mockReset().mockResolvedValue(undefined)
    authMocks.signIn.mockReset().mockResolvedValue(null)
    cloudMocks.hydrate.mockReset().mockResolvedValue({ status: 'unconfigured' })
    cloudMocks.requestSave.mockReset()
    cloudMocks.flush.mockReset().mockReturnValue({
      then(resolve) {
        resolve({ status: 'no-pending' })
        return Promise.resolve({ status: 'no-pending' })
      },
    })
    cloudMocks.markChange.mockReset()
    cloudMocks.setUser.mockReset()
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, postMessage: vi.fn() })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    window.location.hash = ''
    resetStagePropPlacementsCache()
    vi.restoreAllMocks()
  })

  it('opens the Map Props tab, adds a prop, and Apply persists a stage override', () => {
    resetStagePropPlacementsCache()
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const propsTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Props')
    expect(propsTab).toBeTruthy()
    act(() => propsTab.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(container.querySelector('[data-testid="stage-prop-editor"]')).toBeTruthy()
    const paletteDesk = container.querySelector('[data-testid="prop-palette-classroomDesk"]')
    expect(paletteDesk).toBeTruthy()

    act(() => paletteDesk.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    const applyButton = container.querySelector('[data-testid="prop-apply"]')
    act(() => applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    const saved = loadStagePropPlacements()
    expect(Array.isArray(saved.stage1)).toBe(true)
    expect(saved.stage1.some((item) => item.type === 'classroomDesk')).toBe(true)
  })

  it('renders the catalog, preview, sliders, and export panel', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    expect(container.textContent).toContain('Graphics Studio')
    expect(container.textContent).toContain('Player')
    expect(container.textContent).toContain('Zombie E01')
    expect(container.textContent).toContain('Matilda')
    expect(container.textContent).toContain('Weapon Model')
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player')
    expect(container.querySelector('[data-testid="studio-stage-boss-preview"]')).toBeTruthy()
    const stageBossLayoutSection = container.querySelector('[data-testid="stage-boss-card-layout-section"]')
    expect(stageBossLayoutSection?.textContent).toContain('Stage Boss Card Layout')
    expect(stageBossLayoutSection?.querySelector('input[name="stageBossPreviewZoom"]')).toBeTruthy()
    expect(stageBossLayoutSection?.querySelector('input[name="stageBossPreviewPanX"]')).toBeTruthy()
    expect(stageBossLayoutSection?.querySelector('input[name="stageBossPreviewPanY"]')).toBeTruthy()
    expect(container.querySelector('input[name="scale"]')).toBeTruthy()
    expect(container.querySelector('input[name="stageBossPreviewZoom"]')).toBeTruthy()
    expect(container.querySelector('input[name="scaleX"]')).toBeTruthy()
    expect(container.querySelector('input[name="scaleY"]')).toBeTruthy()
    expect(container.querySelector('input[name="scaleZ"]')).toBeTruthy()
    expect(container.querySelector('input[name="positionX"]')).toBeTruthy()
    expect(container.querySelector('input[name="positionY"]')).toBeTruthy()
    expect(container.querySelector('input[name="positionZ"]')).toBeTruthy()
    expect(container.querySelector('input[name="rotationX"]')).toBeTruthy()
    expect(container.querySelector('input[name="rotationY"]')).toBeTruthy()
    expect(container.querySelector('input[name="rotationZ"]')).toBeTruthy()
    expect(container.querySelector('input[name="outlineThickness"]')).toBeTruthy()
    expect(container.querySelector('input[name="color"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"graphics-studio"')
  })

  it('opens directly to Matilda from the studio hash', () => {
    window.location.hash = '#enemy-matilda'

    act(() => {
      root.render(<GraphicsStudio />)
    })

    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('enemy-matilda')
    expect(container.textContent).toContain('Enemy / Matilda')
  })

  it('applies transform slider changes to the game immediately', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const scale = container.querySelector('input[name="scale"]')
    const scaleX = container.querySelector('input[name="scaleX"]')
    const rotationZ = container.querySelector('input[name="rotationZ"]')
    act(() => {
      scale.value = '1.45'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
      scaleX.value = '1.25'
      scaleX.dispatchEvent(new Event('input', { bubbles: true }))
      rotationZ.value = '-30'
      rotationZ.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.45)
    expect(loadStudioTunings().player.scaleX).toBe(1.25)
    expect(loadStudioTunings().player.rotationZ).toBe(-30)
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1.45:1.25')
    expect(container.textContent).toContain('Live')

    const applyButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Apply'))
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.45)
    expect(loadStudioTunings().player.scaleX).toBe(1.25)
    expect(loadStudioTunings().player.rotationZ).toBe(-30)
    expect(container.textContent).toContain('Game applied')
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"scale": 1.45')
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"scaleX": 1.25')
  })

  it('connects to a typed game URL and asks that game window to refetch Firebase', async () => {
    const postMessage = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    const gameUrl = container.querySelector('input[name="gameUrl"]')
    act(() => {
      gameUrl.value = 'http://localhost:5173/'
      gameUrl.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const connect = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Connect')
    act(() => {
      connect.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.55'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(window.open).toHaveBeenCalledWith('http://localhost:5173/', 'escape-zombie-school-game')
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: 'escape-zombie-school.studioGameSync.v1' },
      'http://localhost:5173',
    )
  })

  it('hydrates a signed-in user and refreshes preview plus prop editor from cloud', async () => {
    authMocks.state.status = 'signedIn'
    authMocks.state.user = { uid: 'cloud-user' }
    cloudMocks.hydrate.mockImplementation(async () => {
      saveStudioTunings({ player: { scale: 1.81 } })
      saveSfxTunings({ pencilFire: { volume: 0.33 } })
      saveStageBossPreview({ zoom: 146, panX: 0.2, panY: -0.1 })
      saveTextureDecals({})
      saveStagePropPlacements({
        stage1: [{
          id: 'cloud-desk',
          type: 'classroomDesk',
          position: [2, 0, 3],
          rotation: [0, 0, 0],
          scale: 1,
        }],
      })
      return { status: 'remote-applied', revision: 4 }
    })

    await act(async () => {
      root.render(<GraphicsStudio />)
    })

    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1.81')
    expect(authMocks.initialize).toHaveBeenCalledTimes(1)
    expect(cloudMocks.hydrate).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="studio-firebase-status"]').dataset.status).toBe('synced')
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Props')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('[data-testid="prop-marker-cloud-desk"]')).toBeTruthy()
  })

  it('opens the game synchronously, then signs in and posts the hydrated remote state', async () => {
    authMocks.state.status = 'signedOut'
    let resolveSignIn
    authMocks.signIn.mockImplementation(() => new Promise((resolve) => {
      resolveSignIn = resolve
    }))
    cloudMocks.hydrate.mockImplementation(async () => {
      saveStudioTunings({ player: { scale: 1.92 } })
      return { status: 'remote-applied', revision: 8 }
    })
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })
    const connect = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Connect')
    act(() => {
      connect.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(window.open).toHaveBeenCalledTimes(1)
    expect(postMessage).not.toHaveBeenCalled()

    await act(async () => {
      resolveSignIn({ uid: 'connected-user' })
    })

    expect(cloudMocks.flush).toHaveBeenCalledWith(expect.objectContaining({ user: { uid: 'connected-user' } }))
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'escape-zombie-school.studioGameSync.v1' },
      expect.any(String),
    )
  })

  it('keeps local authored state and exposes an offline fallback when cloud hydrate fails', async () => {
    saveStudioTunings({ player: { scale: 1.44 } })
    authMocks.state.status = 'signedIn'
    authMocks.state.user = { uid: 'offline-user' }
    cloudMocks.hydrate.mockResolvedValue({ status: 'read-failed', error: new Error('offline') })

    await act(async () => {
      root.render(<GraphicsStudio />)
    })

    expect(loadStudioTunings().player.scale).toBe(1.44)
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1.44')
    expect(container.querySelector('[data-testid="studio-firebase-status"]').dataset.status).toBe('offline-error')

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.66'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(loadStudioTunings().player.scale).toBe(1.66)
    expect(cloudMocks.requestSave).toHaveBeenCalledWith(expect.objectContaining({
      user: { uid: 'offline-user' },
      onResult: expect.any(Function),
    }))
    expect(cloudMocks.requestSave.mock.lastCall[0]).not.toHaveProperty('datasets')
    expect(container.querySelector('[data-testid="studio-firebase-status"]').dataset.status).toBe('saving')
  })

  it('shows a future-version workspace and never queues edits into it', async () => {
    authMocks.state.status = 'signedIn'
    authMocks.state.user = { uid: 'future-user' }
    cloudMocks.hydrate.mockResolvedValue({ status: 'future-version', schemaVersion: 2 })

    await act(async () => {
      root.render(<GraphicsStudio />)
    })
    expect(container.querySelector('[data-testid="studio-firebase-status"]').dataset.status).toBe('future-version')

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.71'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(cloudMocks.markChange).toHaveBeenCalledWith({ uid: 'future-user' })
    expect(cloudMocks.requestSave).not.toHaveBeenCalled()
  })

  it('waits for the same-user automatic hydrate before Connect reloads remote', async () => {
    authMocks.state.status = 'signedIn'
    authMocks.state.user = { uid: 'cloud-user' }
    let resolveAutoHydrate
    cloudMocks.hydrate
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveAutoHydrate = resolve
      }))
      .mockResolvedValueOnce({ status: 'remote-applied', revision: 2 })
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })
    const connect = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Connect')
    act(() => connect.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(cloudMocks.hydrate).toHaveBeenCalledTimes(1)
    expect(postMessage).not.toHaveBeenCalled()

    await act(async () => {
      resolveAutoHydrate({ status: 'remote-applied', revision: 1 })
    })

    expect(cloudMocks.hydrate).toHaveBeenCalledTimes(2)
    expect(postMessage).toHaveBeenCalled()
  })

  it('queues the full local snapshot after a signed-in hydrated edit', async () => {
    authMocks.state.status = 'signedIn'
    authMocks.state.user = { uid: 'cloud-user' }
    let resolveHydrate
    cloudMocks.hydrate.mockImplementation(() => new Promise((resolve) => {
      resolveHydrate = resolve
    }))

    act(() => {
      root.render(<GraphicsStudio />)
    })
    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.31'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(cloudMocks.markChange).toHaveBeenCalledWith({ uid: 'cloud-user' })
    expect(cloudMocks.requestSave).not.toHaveBeenCalled()

    await act(async () => {
      resolveHydrate({ status: 'local-changed' })
    })
    expect(cloudMocks.requestSave).toHaveBeenCalledTimes(1)
    act(() => {
      scale.value = '1.53'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(cloudMocks.requestSave).toHaveBeenLastCalledWith(expect.objectContaining({
      user: { uid: 'cloud-user' },
      onResult: expect.any(Function),
    }))
    expect(cloudMocks.requestSave.mock.lastCall[0]).not.toHaveProperty('datasets')
    expect(container.querySelector('[data-testid="studio-firebase-status"]').dataset.status).toBe('saving')

    const queuedSave = cloudMocks.requestSave.mock.lastCall[0]
    act(() => queuedSave.onResult({ status: 'write-failed', error: new Error('offline') }))
    expect(loadStudioTunings().player.scale).toBe(1.53)
    expect(container.querySelector('[data-testid="studio-firebase-status"]').dataset.status).toBe('offline-error')
  })

  it('flushes a pending cloud save without clearing retry state on unmount', async () => {
    authMocks.state.status = 'signedIn'
    authMocks.state.user = { uid: 'cloud-user' }
    cloudMocks.hydrate.mockResolvedValue({ status: 'remote-applied', revision: 1 })

    await act(async () => {
      root.render(<GraphicsStudio />)
    })
    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.61'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(cloudMocks.requestSave).toHaveBeenCalled()

    cloudMocks.flush.mockResolvedValue({ status: 'write-failed', error: new Error('offline') })
    await act(async () => {
      root.unmount()
    })
    expect(cloudMocks.flush).toHaveBeenCalledTimes(1)
    expect(cloudMocks.setUser).not.toHaveBeenCalledWith(null)

    root = createRoot(container)
  })

  it('reports a blocked popup for Apply paths that need to open the game', () => {
    window.open.mockReturnValue(null)
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const applyButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Apply')
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Unable to open game window')
  })

  it('opens the game and requests a Firebase refresh when Apply is pressed', async () => {
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    const gameUrl = container.querySelector('input[name="gameUrl"]')
    act(() => {
      gameUrl.value = 'http://localhost:5173/'
      gameUrl.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.48'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Apply')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(window.open).toHaveBeenCalledWith('http://localhost:5173/', 'escape-zombie-school-game')
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: 'escape-zombie-school.studioGameSync.v1' },
      'http://localhost:5173',
    )
    expect(container.textContent).toContain('Game applied')
  })

  it('uses Stage 2 Boss for the stage boss preview and game sync when B02 is selected', () => {
    const postMessage = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Stage 2 Boss'))
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="studio-stage-boss-preview"]').dataset.bossType).toBe('B02')

    const gameUrl = container.querySelector('input[name="gameUrl"]')
    act(() => {
      gameUrl.value = 'http://localhost:5173/'
      gameUrl.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const connect = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Connect')
    act(() => {
      connect.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.62'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStudioTunings()['stage2-boss-v2'].scale).toBe(1.62)
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: 'escape-zombie-school.studioGameSync.v1' },
      'http://localhost:5173',
    )
  })

  it('uses the same Stage Boss Card Layout controls when B04 is selected', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Boss B04'))
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const section = container.querySelector('[data-testid="stage-boss-card-layout-section"]')
    const preview = section.querySelector('[data-testid="studio-stage-boss-preview"]')
    expect(preview.dataset.bossType).toBe('B04')
    expect(section.querySelector('input[name="stageBossPreviewZoom"]')).toBeTruthy()
    expect(section.querySelector('input[name="stageBossPreviewPanX"]')).toBeTruthy()
    expect(section.querySelector('input[name="stageBossPreviewPanY"]')).toBeTruthy()

    const zoom = section.querySelector('input[name="stageBossPreviewZoomValue"]')
    const panX = section.querySelector('input[name="stageBossPreviewPanXValue"]')
    const panY = section.querySelector('input[name="stageBossPreviewPanYValue"]')
    act(() => {
      zoom.value = '132'
      zoom.dispatchEvent(new Event('input', { bubbles: true }))
      panX.value = '0.45'
      panX.dispatchEvent(new Event('input', { bubbles: true }))
      panY.value = '-0.2'
      panY.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStageBossPreview()).toMatchObject({ zoom: 132, panX: 0.45, panY: -0.2 })
    expect(preview.dataset.zoom).toBe('132')
    expect(preview.dataset.panX).toBe('0.45')
    expect(preview.dataset.panY).toBe('-0.2')
  })


  it('applies stage boss preview zoom and pan to the connected game immediately', () => {
    const postMessage = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    const gameUrl = container.querySelector('input[name="gameUrl"]')
    act(() => {
      gameUrl.value = 'http://localhost:5173/'
      gameUrl.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const connect = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Connect')
    act(() => {
      connect.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const zoom = container.querySelector('input[name="stageBossPreviewZoomValue"]')
    const panX = container.querySelector('input[name="stageBossPreviewPanXValue"]')
    act(() => {
      zoom.value = '132'
      zoom.dispatchEvent(new Event('input', { bubbles: true }))
      panX.value = '0.45'
      panX.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStageBossPreview()).toMatchObject({ zoom: 132, panX: 0.45 })
    expect(container.querySelector('[data-testid="studio-stage-boss-preview"]').dataset.zoom).toBe('132')
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: 'escape-zombie-school.studioGameSync.v1' },
      'http://localhost:5173',
    )
  })

  it('clamps out-of-range typed values on blur and restores exactly when the original value is retyped', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const zoom = container.querySelector('input[name="stageBossPreviewZoomValue"]')
    act(() => {
      zoom.focus()
      zoom.value = '0'
      zoom.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      zoom.blur()
    })
    expect(loadStageBossPreview().zoom).toBe(50)
    expect(zoom.value).toBe('50')

    act(() => {
      zoom.focus()
      zoom.value = '110'
      zoom.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      zoom.blur()
    })
    expect(loadStageBossPreview().zoom).toBe(110)
    expect(zoom.value).toBe('110')
  })

  it('applies typed numeric values to the game immediately', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const scale = container.querySelector('input[name="scale"]')
    const scaleValue = container.querySelector('input[name="scaleValue"]')
    act(() => {
      scaleValue.value = '1.35'
      scaleValue.dispatchEvent(new Event('input', { bubbles: true }))
      scaleValue.dispatchEvent(new Event('blur', { bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.35)
    expect(scale.value).toBe('1.35')
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1.35')
  })

  it('resets graphics changes to the captured current implementation baseline', () => {
    saveStudioTunings({ player: { scale: 1.4 } })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.8'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(loadStudioTunings().player.scale).toBe(1.8)

    const resetButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Reset'))
    act(() => {
      resetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.4)
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1.4')
  })

  it('applies typed part position values into separate part tuning', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const preview = container.querySelector('[data-testid="graphics-preview"]')
    act(() => {
      preview.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })

    const positionX = container.querySelector('input[name="positionXValue"]')
    act(() => {
      positionX.value = '0.75'
      positionX.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStudioTunings()['player::part::0.1'].positionX).toBe(0.75)
    expect(loadStudioTunings()).not.toHaveProperty('player')

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Apply')
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadStudioTunings()['player::part::0.1'].positionX).toBe(0.75)
  })

  it('offers the named flashlight lantern player animation in the motion control', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const motion = container.querySelector('select[name="animation"]')
    expect(Array.from(motion.options).map((option) => option.value)).toContain('lanternFlashlight')

    act(() => {
      motion.value = 'lanternFlashlight'
      motion.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1:1:lanternFlashlight')
  })

  it('focuses a double-clicked model part and stores its tuning separately', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const preview = container.querySelector('[data-testid="graphics-preview"]')
    act(() => {
      preview.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })

    expect(container.textContent).toContain('Part Focus')
    expect(container.textContent).toContain('Head')

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.32'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStudioTunings()['player::part::0.1'].scale).toBe(1.32)
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1:1:normal:1.32')
  })

  it('groups focused parts with shift double-click and transforms them together', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const preview = container.querySelector('[data-testid="graphics-preview"]')
    act(() => {
      preview.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      preview.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, shiftKey: true }))
    })

    expect(container.textContent).toContain('Part Group / 2 parts')

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.24'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadStudioTunings()['player::group::0.1+0.2'].scale).toBe(1.24)

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Apply')
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadStudioTunings()['player::group::0.1+0.2'].scale).toBe(1.24)

    act(() => {
      preview.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })

    expect(container.textContent).toContain('Part Focus / Head')
    expect(container.textContent).not.toContain('Part Group / 2 parts')
  })

  it('restores up to ten previous tuning states with Ctrl+Z', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      for (let index = 1; index <= 11; index += 1) {
        scale.value = String(1 + index / 100)
        scale.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })

    act(() => {
      for (let index = 0; index < 10; index += 1) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
      }
    })

    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player:1.01')
    expect(loadStudioTunings().player.scale).toBe(1.01)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.01)
  })


  it('applies audio tuning to the game immediately', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const audioTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Audio')
    act(() => {
      audioTab.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('pencilFire')
    expect(container.textContent).toContain('/sfx/weapons/pencilFire.ogg')

    const volumeValue = container.querySelector('input[name="sfxVolumeValue"]')
    act(() => {
      volumeValue.value = '0.42'
      volumeValue.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(loadSfxTunings().pencilFire.volume).toBe(0.42)
    expect(container.querySelector('input[name="sfxVolume"]').value).toBe('0.42')
  })

  it('has an audio Apply button that confirms the current SFX tuning for game playback', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const audioTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Audio')
    act(() => {
      audioTab.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const pitchValue = container.querySelector('input[name="sfxRateValue"]')
    act(() => {
      pitchValue.value = '1.37'
      pitchValue.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(loadSfxTunings().pencilFire.rate).toBe(1.37)

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Apply')
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadSfxTunings().pencilFire.rate).toBe(1.37)
    expect(container.textContent).toContain('Audio applied')
  })
})

// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import GraphicsStudio from './GraphicsStudio.jsx'
import { loadStageBossPreview, loadStudioTunings, loadTextureDecals, saveStudioTunings } from '../lib/graphicsStudioConfig.js'
import { loadSfxTunings } from '../lib/sfxRegistry.js'

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
        onClick={() => onPartFocus?.({ key: 'id:b02-head', label: 'b02Head', additive: false, faceAxis: '+z' })}
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
    window.location.hash = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    window.location.hash = ''
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

  it('connects to a typed game URL and mirrors live tuning changes into that game window', () => {
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

    expect(window.open).toHaveBeenCalledWith('http://localhost:5173/', 'escape-zombie-school-game')
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'escape-zombie-school.studioGameSync.v1',
        tunings: expect.objectContaining({
          player: expect.objectContaining({ scale: 1.55 }),
        }),
      }),
      'http://localhost:5173',
    )
  })

  it('uses Zombie B02 for the stage boss preview and game sync when B02 is selected', () => {
    const postMessage = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Zombie B02'))
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

    expect(loadStudioTunings()['zombie-b02'].scale).toBe(1.62)
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'escape-zombie-school.studioGameSync.v1',
        tunings: expect.objectContaining({
          'zombie-b02': expect.objectContaining({ scale: 1.62 }),
        }),
      }),
      'http://localhost:5173',
    )
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
      expect.objectContaining({
        type: 'escape-zombie-school.studioGameSync.v1',
        stageBossPreview: expect.objectContaining({ zoom: 132, panX: 0.45 }),
      }),
      'http://localhost:5173',
    )
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
    expect(loadStudioTunings().player).toBeUndefined()

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

  it('uploads a decal image onto the focused part face and syncs it to the game', async () => {
    const postMessage = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, postMessage })

    act(() => {
      root.render(<GraphicsStudio />)
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Zombie B02'))
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

    // 파트 포커스 전에는 업로드 비활성
    const upload = container.querySelector('input[name="decalImage"]')
    expect(upload.disabled).toBe(true)

    act(() => {
      container.querySelector('[data-testid="focus-stable-part"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(upload.disabled).toBe(false)
    expect(container.textContent).toContain('b02-head / +z')

    Object.defineProperty(upload, 'files', {
      configurable: true,
      value: [new File(['png-bytes'], 'face.png', { type: 'image/png' })],
    })
    await act(async () => {
      upload.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(loadTextureDecals()['zombie-b02']).toHaveLength(1)
    expect(loadTextureDecals()['zombie-b02'][0]).toMatchObject({
      partId: 'b02-head',
      faceAxis: '+z',
      imageDataUrl: 'data:image/png;base64,MOCK',
    })
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'escape-zombie-school.studioGameSync.v1',
        decals: expect.objectContaining({
          'zombie-b02': [expect.objectContaining({ partId: 'b02-head', faceAxis: '+z' })],
        }),
      }),
      'http://localhost:5173',
    )
    expect(container.querySelector('[data-testid="preview-decals"]').textContent).toContain('b02-head:+z')
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"b02-head"')

    // 면 안 정렬: 오프셋 슬라이더가 데칼 레이어를 갱신한다
    const offsetU = container.querySelector('input[name="decalOffsetU"]')
    act(() => {
      offsetU.value = '0.25'
      offsetU.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(loadTextureDecals()['zombie-b02'][0].offset[0]).toBe(0.25)

    const rotation = container.querySelector('input[name="decalRotation"]')
    act(() => {
      rotation.value = '45'
      rotation.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(loadTextureDecals()['zombie-b02'][0].rotation).toBe(45)

    // 삭제
    const deleteButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Delete')
    act(() => {
      deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(loadTextureDecals()['zombie-b02']).toBeUndefined()
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ decals: {} }),
      'http://localhost:5173',
    )
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

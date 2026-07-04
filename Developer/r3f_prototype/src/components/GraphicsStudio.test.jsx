// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import GraphicsStudio from './GraphicsStudio.jsx'
import { loadStudioTunings } from '../lib/graphicsStudioConfig.js'

vi.mock('./GraphicsStudioPreview.jsx', () => ({
  default: ({ selectedItem, tuning }) => (
    <div data-testid="graphics-preview">{selectedItem.id}:{tuning.scale}:{tuning.scaleX}:{tuning.animation}</div>
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
    expect(container.querySelector('input[name="scale"]')).toBeTruthy()
    expect(container.querySelector('input[name="scaleX"]')).toBeTruthy()
    expect(container.querySelector('input[name="scaleY"]')).toBeTruthy()
    expect(container.querySelector('input[name="scaleZ"]')).toBeTruthy()
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

  it('applies transform slider changes into local storage for game application', () => {
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

    const applyButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Apply'))
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.45)
    expect(loadStudioTunings().player.scaleX).toBe(1.25)
    expect(loadStudioTunings().player.rotationZ).toBe(-30)
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"scale": 1.45')
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"scaleX": 1.25')
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
})

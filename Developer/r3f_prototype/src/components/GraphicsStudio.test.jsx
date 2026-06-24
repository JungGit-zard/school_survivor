// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import GraphicsStudio from './GraphicsStudio.jsx'
import { loadStudioTunings } from '../lib/graphicsStudioConfig.js'

vi.mock('./GraphicsStudioPreview.jsx', () => ({
  default: ({ selectedItem, tuning }) => (
    <div data-testid="graphics-preview">{selectedItem.id}:{tuning.scale}</div>
  ),
}))

describe('GraphicsStudio', () => {
  let container
  let root

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders the catalog, preview, sliders, and export panel', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    expect(container.textContent).toContain('Graphics Studio')
    expect(container.textContent).toContain('Player')
    expect(container.textContent).toContain('Zombie E01')
    expect(container.textContent).toContain('Weapon Model')
    expect(container.querySelector('[data-testid="graphics-preview"]').textContent).toContain('player')
    expect(container.querySelector('input[name="scale"]')).toBeTruthy()
    expect(container.querySelector('input[name="outlineThickness"]')).toBeTruthy()
    expect(container.querySelector('input[name="color"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"graphics-studio"')
  })

  it('confirms slider changes into local storage for later code application', () => {
    act(() => {
      root.render(<GraphicsStudio />)
    })

    const scale = container.querySelector('input[name="scale"]')
    act(() => {
      scale.value = '1.45'
      scale.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const confirmButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Confirm'))
    act(() => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadStudioTunings().player.scale).toBe(1.45)
    expect(container.querySelector('[data-testid="studio-export"]').value).toContain('"scale": 1.45')
  })
})

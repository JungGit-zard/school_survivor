// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import StageBossPreview from './StageBossPreview.jsx'

// Canvas는 자식을 렌더하지 않는 빈 div로 mock → ReactiveBoss의 R3F 훅은 실행되지 않는다.
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="stage-boss-preview-canvas" />,
}))

let container = null

afterEach(() => {
  if (container) {
    document.body.removeChild(container)
    container = null
  }
})

function render(ui) {
  container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return container
}

describe('StageBossPreview 온디맨드 모션', () => {
  it('비인터랙티브 프리뷰의 pointerdown은 throw하지 않고 framing 속성을 반영한다', () => {
    const el = render(<StageBossPreview framing={{ zoom: 60, panX: 0.2, panY: -0.1 }} />)
    const preview = el.querySelector('[data-testid="stage-boss-preview"]')
    expect(preview).toBeTruthy()
    expect(preview.getAttribute('data-zoom')).toBeTruthy()

    expect(() => {
      act(() => {
        preview.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      })
    }).not.toThrow()
  })
})

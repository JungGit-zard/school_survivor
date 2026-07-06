// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import StageBossPreview from './StageBossPreview.jsx'

const invalidate = vi.fn()

// Canvas는 자식을 렌더하지 않는 빈 div로 mock → ReactiveBoss의 R3F 훅은 실행되지 않는다.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="stage-boss-preview-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: (selector) => selector({ invalidate }),
}))

vi.mock('./Enemy.jsx', () => ({
  EnemyVisual: ({ frozen }) => <div data-testid="stage-boss-preview-enemy" data-frozen={String(frozen)} />,
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

  it('keeps the lobby boss frozen until an entry motion token is requested', () => {
    const el = render(<StageBossPreview />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.frozen).toBe('true')
  })

  it('unfreezes the lobby boss while an entry motion token is active', () => {
    const el = render(<StageBossPreview motionToken={1} />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.frozen).toBe('false')
  })
})

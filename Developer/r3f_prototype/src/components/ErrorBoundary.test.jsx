// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function BrokenRoute() {
  throw new Error('lazy route failed')
}

describe('ErrorBoundary', () => {
  let container
  let root

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    root = null
    container = null
    vi.restoreAllMocks()
  })

  it('contains a render failure and renders the supplied route fallback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <ErrorBoundary fallback={({ retry, reload }) => (
          <main role="alert">
            <button type="button" onClick={retry}>retry route</button>
            <button type="button" onClick={reload}>reload route</button>
          </main>
        )}>
          <BrokenRoute />
        </ErrorBoundary>,
      )
    })

    expect(container.querySelector('[role="alert"]')).not.toBe(null)
    expect(container.textContent).toContain('retry route')
    expect(consoleError).toHaveBeenCalled()
  })
})

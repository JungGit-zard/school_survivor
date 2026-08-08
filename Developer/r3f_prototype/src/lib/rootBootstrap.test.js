// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { bootstrapApplication, renderBootstrapFailure } from './rootBootstrap.js'

describe('root bootstrap isolation', () => {
  it('replaces the root with a recovery screen when an application import rejects', async () => {
    const root = document.createElement('div')
    const reload = vi.fn()
    const result = await bootstrapApplication({
      root,
      reload,
      loadStudioGuard: () => Promise.reject(new Error('broken optional module')),
    })

    expect(result.status).toBe('failed')
    expect(root.querySelector('[data-testid="root-bootstrap-failure"]')).not.toBe(null)
    expect(root.textContent).toContain('게임을 시작하지 못했습니다')
    root.querySelector('button').click()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('creates a root recovery screen with only DOM APIs', () => {
    const documentRef = document.implementation.createHTMLDocument('bootstrap')
    const reload = vi.fn()

    expect(renderBootstrapFailure({ documentRef, reload })).toBe(true)
    expect(documentRef.getElementById('root')?.querySelector('[role="alert"]')).not.toBe(null)
  })
})

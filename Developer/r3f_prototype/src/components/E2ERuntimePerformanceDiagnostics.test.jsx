// @vitest-environment jsdom
import React, { act, createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import E2ERuntimePerformanceDiagnostics from './E2ERuntimePerformanceDiagnostics.jsx'
import { STAGE_ENTRY_METRIC_EVENT } from '../lib/stageEntryMetrics.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const roots = []

// document.hidden은 defineProperty로 덮어쓰는데 복원하지 않으면 그 값이 남는다.
// 이 파일 안에서는 안 드러나지만, 병렬 실행에서 환경이 재사용되면 다음 테스트가
// "이미 hidden=true"인 상태로 시작해 샘플 수가 달라진다. 시작·종료 모두에서 고정한다.
function setDocumentHidden(value) {
  Object.defineProperty(document, 'hidden', { configurable: true, value })
}

afterEach(() => {
  while (roots.length) act(() => roots.pop().unmount())
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
  setDocumentHidden(false)
})

function renderProbe({ enabled = true } = {}) {
  const host = document.createElement('div')
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const ref = createRef()
  ref.current = host
  const container = document.createElement('div')
  const root = createRoot(container)
  roots.push(root)
  act(() => root.render(<E2ERuntimePerformanceDiagnostics enabled={enabled} canvasRootRef={ref} />))
  return { canvas, container, root }
}

describe('E2ERuntimePerformanceDiagnostics', () => {
  it('creates no diagnostic DOM, RAF, or listeners when disabled', () => {
    const request = vi.fn()
    const addDocument = vi.spyOn(document, 'addEventListener')
    const addWindow = vi.spyOn(window, 'addEventListener')
    vi.stubGlobal('requestAnimationFrame', request)
    renderProbe({ enabled: false })
    expect(request).not.toHaveBeenCalled()
    expect(addDocument).not.toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(addWindow).not.toHaveBeenCalledWith(STAGE_ENTRY_METRIC_EVENT, expect.any(Function))
  })

  it('cleans up RAF, visibility, stage metric, and WebGL context-loss listeners', () => {
    let callback
    const request = vi.fn((next) => { callback = next; return 73 })
    const cancel = vi.fn()
    vi.stubGlobal('requestAnimationFrame', request)
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const removeDocument = vi.spyOn(document, 'removeEventListener')
    const removeWindow = vi.spyOn(window, 'removeEventListener')
    const { canvas, root } = renderProbe()
    act(() => callback(0))
    const removeCanvas = vi.spyOn(canvas, 'removeEventListener')
    act(() => root.unmount())
    roots.pop()
    expect(cancel).toHaveBeenCalled()
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(removeWindow).toHaveBeenCalledWith(STAGE_ENTRY_METRIC_EVENT, expect.any(Function))
    expect(removeCanvas).toHaveBeenCalledWith('webglcontextlost', expect.any(Function))
  })

  it('publishes exactly one completed JSON result and excludes hidden-frame intervals', () => {
    window.history.replaceState(null, '', '/?e2eperfseconds=5')
    setDocumentHidden(false) // 앞선 파일이 남긴 hidden 상태에 의존하지 않는다
    const callbacks = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((next) => { callbacks.push(next); return callbacks.length }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { canvas, container } = renderProbe()
    window.dispatchEvent(new CustomEvent(STAGE_ENTRY_METRIC_EVENT, {
      detail: { compileStatus: 'compiled', renderer: { calls: 4, triangles: 24, geometries: 3, textures: 5 } },
    }))
    act(() => callbacks.shift()(0))
    act(() => callbacks.shift()(16))
    setDocumentHidden(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => callbacks.shift()(2000))
    setDocumentHidden(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    canvas.dispatchEvent(new Event('webglcontextlost'))
    act(() => callbacks.shift()(10000))

    expect(container.querySelector('[data-testid="e2e-runtime-performance-status"]').textContent).toBe('complete')
    const result = JSON.parse(container.querySelector('[data-testid="e2e-runtime-performance-json"]').textContent)
    expect(result).toMatchObject({
      sampleCount: 1,
      webglContextLostCount: 1,
      visibility: { transitions: [{ state: 'hidden' }, { state: 'visible' }] },
      stageEntry: { status: 'received', calls: 4, triangles: 24, geometries: 3, textures: 5, compileStatus: 'compiled' },
    })
  })
})

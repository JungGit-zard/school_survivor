import { describe, expect, it } from 'vitest'
import { isAllowedStudioGameOrigin } from './studioGameBridge.js'

describe('isAllowedStudioGameOrigin', () => {
  it('allows local dev origins over http', () => {
    expect(isAllowedStudioGameOrigin('http://localhost:5173')).toBe(true)
    expect(isAllowedStudioGameOrigin('http://127.0.0.1:5173')).toBe(true)
    expect(isAllowedStudioGameOrigin('http://0.0.0.0:5173')).toBe(true)
    expect(isAllowedStudioGameOrigin('http://192.168.0.42:5173')).toBe(true)
  })

  it('rejects public hosts that merely start with 192.168.', () => {
    // 이전 startsWith 우회 케이스 — 반드시 거부되어야 한다.
    expect(isAllowedStudioGameOrigin('http://192.168.evil.com')).toBe(false)
    expect(isAllowedStudioGameOrigin('http://192.1680.0.1')).toBe(false)
  })

  it('rejects https and non-lan hosts', () => {
    expect(isAllowedStudioGameOrigin('https://localhost:5173')).toBe(false)
    expect(isAllowedStudioGameOrigin('http://example.com')).toBe(false)
    expect(isAllowedStudioGameOrigin('not-a-url')).toBe(false)
  })
})

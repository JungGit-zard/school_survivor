import { describe, expect, it } from 'vitest'
import { getDefaultStudioGameUrl, isAllowedStudioGameOrigin, parseStudioGameUrl } from './studioGameBridge.js'

describe('isAllowedStudioGameOrigin', () => {
  it('uses localhost as the one local game target even when Studio runs on a loopback alias', () => {
    expect(getDefaultStudioGameUrl({ href: 'http://127.0.0.1:5175/graphics-studio#player' })).toBe('http://localhost:5175/')
    expect(parseStudioGameUrl('http://0.0.0.0:5175/graphics-studio')?.href).toBe('http://localhost:5175/graphics-studio')
  })

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

  it('allows same-origin production https and rejects external https or non-lan hosts', () => {
    expect(isAllowedStudioGameOrigin(
      'https://game.example.com',
      'https://game.example.com',
    )).toBe(true)
    expect(isAllowedStudioGameOrigin(
      'https://evil.example.com',
      'https://game.example.com',
    )).toBe(false)
    expect(isAllowedStudioGameOrigin('https://localhost:5173', 'https://game.example.com')).toBe(false)
    expect(isAllowedStudioGameOrigin('http://game.example.com', 'http://game.example.com')).toBe(true)
    expect(isAllowedStudioGameOrigin('http://localhost:5173', 'https://game.example.com')).toBe(false)
    expect(isAllowedStudioGameOrigin('http://example.com')).toBe(false)
    expect(isAllowedStudioGameOrigin('not-a-url')).toBe(false)
  })

  it('only parses safe Studio game targets before private data is posted', () => {
    expect(parseStudioGameUrl(
      'https://game.example.com/',
      'https://game.example.com/graphics-studio',
    )?.href).toBe('https://game.example.com/')
    expect(parseStudioGameUrl(
      'https://evil.example.com/',
      'https://game.example.com/graphics-studio',
    )).toBeNull()
    expect(parseStudioGameUrl(
      'http://example.com/',
      'https://game.example.com/graphics-studio',
    )).toBeNull()
    expect(parseStudioGameUrl(
      'http://localhost:5173/',
      'http://localhost:4173/graphics-studio',
    )?.href).toBe('http://localhost:5173/')
  })
})

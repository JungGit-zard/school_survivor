import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('favicon routing', () => {
  it('uses the pink-hair favicon for the game and keeps the studio favicon separate', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

    expect(html).toContain('/favicon-game.svg?v=20260705')
    expect(html).toContain("location.pathname.startsWith('/graphics-studio')")
    expect(html).toContain('/favicon.svg?v=20260705')
  })

  it('marks the app as not translatable to suppress Google Translate overlays', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

    expect(html).toContain('<meta name="google" content="notranslate" />')
    expect(html).toContain('<html lang="ko" translate="no" class="notranslate">')
    expect(html).toContain('.gtx-trans-icon')
    expect(html).toContain('#goog-gt-tt')
  })
})

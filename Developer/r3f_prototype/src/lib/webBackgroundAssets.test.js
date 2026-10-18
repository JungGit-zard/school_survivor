import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getWebBacklogComicUrl, WEB_LANDING_COMIC_URLS } from './webBackgroundAssets.js'

describe('homepage dialogue-complete backlog assets', () => {
  for (const language of ['ko', 'en', 'ja', 'vi']) {
    it(`uses same-origin versioned assets for all ten ${language} episodes`, () => {
      for (let episode = 1; episode <= 10; episode += 1) {
        expect(getWebBacklogComicUrl(language, episode)).toBe(
          `/comics/backlog-dialogue-20261018/${language}/${String(episode).padStart(2, '0')}.png`,
        )
      }
    })
    it(`ships ten valid PNG files for ${language}`, () => {
      for (let episode = 1; episode <= 10; episode += 1) {
        const url = getWebBacklogComicUrl(language, episode)
        const bytes = readFileSync(new URL(`../../public${url}`, import.meta.url))
        expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
      }
    })
  }
  it('retains official v3 bindings', () => {
    expect(Object.values(WEB_LANDING_COMIC_URLS)).toHaveLength(5)
    expect(Object.values(WEB_LANDING_COMIC_URLS).every(url => url.startsWith('/web-comics/v3/'))).toBe(true)
  })
})

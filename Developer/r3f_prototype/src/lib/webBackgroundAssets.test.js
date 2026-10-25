import { describe, expect, it } from 'vitest'
import * as webBackgroundAssets from './webBackgroundAssets.js'
import webBackgroundAssetsSource from './webBackgroundAssets.js?raw'

// 2026-10-25: 만화(레거시·데일리·백로그)는 미디어 사이트(media.escapezombie.com)로 분리됐다.
// 게임 사이트 번들은 만화 URL을 갖지 않고, 웹 배경(사이드 거터)은 빌드 내부 WebP만 쓴다.
describe('web background assets after the comics/media split', () => {
  it('exports no comic URLs from the game bundle', () => {
    expect(webBackgroundAssets.WEB_LANDING_COMIC_URLS).toBeUndefined()
    expect(webBackgroundAssets.getWebBacklogComicUrl).toBeUndefined()
    expect(webBackgroundAssetsSource).not.toMatch(/web-comics|\/comics\//)
  })

  it('uses build-internal WebP side-gutter backgrounds with no external asset host', () => {
    expect(webBackgroundAssets.WEB_BACKGROUND_URLS.length).toBeGreaterThan(0)
    webBackgroundAssets.WEB_BACKGROUND_URLS.forEach((url) => {
      expect(url).toMatch(/\.webp$/)
      expect(url).not.toMatch(/^https?:/)
    })
    expect(webBackgroundAssetsSource).not.toContain('assets.web.app')
    expect(webBackgroundAssets.WEB_BACKGROUND_URLS).toContain(webBackgroundAssets.selectedWebBackgroundUrl)
  })
})

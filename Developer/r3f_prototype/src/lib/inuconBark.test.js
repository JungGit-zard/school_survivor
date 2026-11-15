// 2026-11-15: 이누콘 가드 짖음 "멍!멍!"은 CC0 실제 강아지 녹음(scripts/generate_inucon_bark.mjs)으로 만든다.
// 합성 생성기에 다시 들어가면 다음 일괄 재생성 때 옛 합성 "왈!"이 덮어쓴다 — 그걸 싸게 막는다.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { INUCON_BARK_CUE, INUCON_BARK_SOURCE } from '../../scripts/generate_inucon_bark.mjs'
import { POLYPHONY_COOLDOWN, SOUND_MAP, isProtectedSfx } from './sfxRegistry.js'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

describe('Inucon guard bark is a real CC0 dog recording', () => {
  it('is registered as a protected enemies/ SFX key', () => {
    expect(SOUND_MAP.inuconBark).toBe('/sfx/enemies/inuconBark.ogg')
    expect(INUCON_BARK_CUE.dir).toBe('enemies')
    expect(isProtectedSfx('inuconBark')).toBe(true)
  })

  it('uses a SHA-pinned CC0 source', () => {
    expect(INUCON_BARK_SOURCE.license).toBe('CC0-1.0')
    expect(INUCON_BARK_SOURCE.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(INUCON_BARK_SOURCE.page).toMatch(/^https:\/\/freesound\.org\//)
  })

  it('is a quick double bark whose cooldown outlasts the cue but not the 520 ms hit window', () => {
    const cue = INUCON_BARK_CUE
    const barkSec = cue.bark[1] - cue.bark[0]
    const totalSec = cue.secondOnset + barkSec / cue.secondRate
    expect(totalSec).toBeGreaterThanOrEqual(0.4)
    expect(totalSec).toBeLessThanOrEqual(0.6)
    expect(POLYPHONY_COOLDOWN.inuconBark).toBeGreaterThan(totalSec * 1000)
    expect(POLYPHONY_COOLDOWN.inuconBark).toBeLessThan(520)
  })

  for (const script of ['scripts/generate_voice_sfx.mjs', 'scripts/generate_sfx.mjs']) {
    it(`${script} does not define inuconBark`, () => {
      const src = read(script).toString('utf8')
      expect(src).not.toMatch(/^\s*['"]?(?:enemies\/)?inuconBark['"]?\s*:/m)
    })
  }

  it('provenance manifest records the shipped bytes as CC0-recording-derived', () => {
    const manifest = JSON.parse(read('../agent_room/audio_asset_provenance_manifest_2026-07-30.json').toString('utf8'))
    const entry = manifest.assets.find((asset) => asset.logicalId === 'inuconBark')
    expect(entry?.provenanceType).toBe('cc0-recording-derived')
    expect(entry.source).toContain('generate_inucon_bark.mjs')
    expect(entry.source).toContain(INUCON_BARK_SOURCE.sha256)
    for (const ext of ['ogg', 'mp3']) {
      const rel = `public/sfx/enemies/inuconBark.${ext}`
      const bytes = read(rel)
      const recorded = entry.paths.find((p) => p.path.endsWith(rel))
      expect(recorded, rel).toBeTruthy()
      expect(recorded.sha256, rel).toBe(sha(bytes))
      expect(recorded.bytes, rel).toBe(bytes.length)
      expect(bytes.length, rel).toBeLessThan(8 * 1024)
    }
  })
})

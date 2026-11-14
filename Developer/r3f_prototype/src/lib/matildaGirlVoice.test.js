// 2026-11-14 Terry: "마틸다 여자아이 목소리 엄수해" / "마틸다 음성은 지금 괴기스러우니까 100퍼센트 완전히 바꿔".
// 마틸다의 목소리 큐는 전부 scripts/generate_matilda_girl_voice.mjs(CC0 실제 여자아이 녹음, 자르기·정리만)가
// 만든다. 합성 생성기에 다시 들어가면 다음 일괄 재생성 때 옛 기계음/괴기음이 덮어쓴다 — 그걸 싸게 막는다.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { MATILDA_VOICE_CUES, SOURCES } from '../../scripts/generate_matilda_girl_voice.mjs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

// matildaWarningTick은 목소리가 아니다(947/474 Hz 두 번 울리는 경고 비프) — 합성 그대로 둔다.
const VOCAL_MATILDA_CUES = ['matildaSpawn', 'matildaDash', 'matildaLaugh', 'matildaDeath', 'matildaCountdownEnd']

describe('Matilda voice is a real little girl, never re-synthesized', () => {
  it('the girl-voice generator owns every vocal Matilda cue', () => {
    expect(Object.keys(MATILDA_VOICE_CUES).sort()).toEqual([...VOCAL_MATILDA_CUES].sort())
  })

  it('uses only SHA-pinned CC0 sources', () => {
    for (const spec of Object.values(MATILDA_VOICE_CUES)) {
      for (const [key] of spec.parts) {
        expect(SOURCES[key].license).toBe('CC0-1.0')
        expect(SOURCES[key].sha256).toMatch(/^[0-9a-f]{64}$/)
      }
    }
  })

  for (const script of ['scripts/generate_voice_sfx.mjs', 'scripts/generate_sfx.mjs']) {
    it(`${script} does not define any vocal Matilda cue`, () => {
      const src = read(script).toString('utf8')
      for (const cue of VOCAL_MATILDA_CUES) {
        const definition = new RegExp(`^\\s*['"]?(?:enemies/|events/)?${cue}['"]?\\s*:`, 'm')
        expect(src, `${cue} is defined in ${script}`).not.toMatch(definition)
      }
    })
  }

  it('plays the dash at natural pitch (no rate slowdown on the girl voice)', () => {
    const enemy = read('src/components/Enemy.jsx').toString('utf8')
    const dashSfx = enemy.match(/\{[^{}]*id: 'matildaDash'[^{}]*\}/g) ?? []
    expect(dashSfx.length).toBeGreaterThan(0)
    for (const literal of dashSfx) expect(literal).not.toMatch(/\brate\s*:/)
  })

  it('provenance manifest records the shipped bytes as CC0-recording-derived', () => {
    const manifest = JSON.parse(read('../agent_room/audio_asset_provenance_manifest_2026-07-30.json').toString('utf8'))
    for (const cue of VOCAL_MATILDA_CUES) {
      const entry = manifest.assets.find((asset) => asset.logicalId === cue)
      expect(entry?.provenanceType, cue).toBe('cc0-recording-derived')
      expect(entry.source).toContain('generate_matilda_girl_voice.mjs')
      for (const ext of ['ogg', 'mp3']) {
        const rel = `public/sfx/${MATILDA_VOICE_CUES[cue].dir}/${cue}.${ext}`
        const bytes = read(rel)
        const recorded = entry.paths.find((p) => p.path.endsWith(rel))
        expect(recorded, rel).toBeTruthy()
        expect(recorded.sha256, rel).toBe(sha(bytes))
        expect(recorded.bytes, rel).toBe(bytes.length)
      }
    }
  })
})

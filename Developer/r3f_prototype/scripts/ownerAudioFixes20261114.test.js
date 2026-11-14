// 2026-11-14 Terry 청취 지시 7건(soundmini) 회귀 테스트.
// 음원 바이트 정본은 provenance manifest(verify-audio-manifest)가 잡고, 여기서는 "옛 소리가 조용히 돌아오지 않는다"를 잡는다.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sounds } from './generate_sfx.mjs'
import { CUTE_FEMALE_VOICE_PITCH_SCALE, PLAYER_DEATH_PITCH_SCALE, VOICE_SFX } from './generate_voice_sfx.mjs'

const root = new URL('../', import.meta.url)
const bytes = (path) => readFileSync(new URL(path, root))
const sha = (path) => createHash('sha256').update(bytes(path)).digest('hex')

// 2026-11-14 이전 sharkFire 배포 바이트(= 지금의 slteraRush).
const OLD_SHARK_OGG = '28fcb189a0c4944aabc71884109e26f03439557aa0b701b769119a808d3e6cb6'
const OLD_SHARK_MP3 = '00553ea74898fb919341bfb1da013359a90a2434f0ed2e6097fff8c123447e53'

describe('2026-11-14 owner audio fixes', () => {
  it('sharkFire is a new sound; the old bytes live on only as the Sltera rush cue', () => {
    expect(sha('public/sfx/weapons/sharkFire.ogg')).not.toBe(OLD_SHARK_OGG)
    expect(sha('public/sfx/weapons/sharkFire.mp3')).not.toBe(OLD_SHARK_MP3)
    expect(sha('public/sfx/events/slteraRush.ogg')).toBe(OLD_SHARK_OGG)
    expect(sha('public/sfx/events/slteraRush.mp3')).toBe(OLD_SHARK_MP3)
    const sltera = bytes('src/components/SlteraEvent.jsx').toString('utf8')
    expect(sltera).toContain("id: 'slteraRush'")
    expect(sltera).not.toContain("id: 'sharkFire'")
  })

  it('keeps generator recipes for the new sounds and drops the replaced presets', () => {
    for (const id of ['weapons/sharkFire', 'weapons/lanternFire', 'weapons/bikittyCutterFire', 'weapons/bikittyCutterReload', 'events/slteraRush']) {
      expect(typeof sounds[id], id).toBe('function')
    }
    // generate_voice_sfx.mjs가 정본인 playerDeath의 옛 노이즈 프리셋이 --encode로 덮어쓰지 않게 지웠다.
    expect(sounds['player/playerDeath']).toBeUndefined()
    // 철컥 = 짧은 금속 두 타(옛 스륵은 0.95s).
    expect(sounds['weapons/bikittyCutterReload']().length / 44100).toBeLessThan(0.3)
  })

  it('raises playerDeath by +5 semitones in the voice recipe itself (not a runtime rate)', () => {
    expect(PLAYER_DEATH_PITCH_SCALE / CUTE_FEMALE_VOICE_PITCH_SCALE).toBeCloseTo(2 ** (5 / 12), 6)
    expect(VOICE_SFX.playerDeath.synth.toString()).toContain('PLAYER_DEATH_PITCH_SCALE')
    const store = bytes('src/store/useGameStore.js').toString('utf8')
    expect(store).not.toMatch(/id: 'playerDeath',\s*rate/)
  })

  it('plays lineDrawCross at full call volume (×2 of the old 0.5)', () => {
    const lineDraw = bytes('src/components/Weapons/LineDraw.jsx').toString('utf8')
    expect(lineDraw).toContain("emitSfx({ id: 'lineDrawCross', volume: 1,")
  })
})

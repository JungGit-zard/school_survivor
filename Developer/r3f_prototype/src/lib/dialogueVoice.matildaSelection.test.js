import { describe, expect, it } from 'vitest'
import { DIALOGUE_VOICE_PROFILES, getDialogueVoiceProfile, getDialogueGlyphDelay } from './dialogueVoice.js'

// 2026-11-14 Terry "마틸다 여자아이 목소리 엄수해" / "100퍼센트 완전히 바꿔" supersedes the
// soundmini t_92589769 selection A (610 Hz triangle + square overtone + vibrato bleep).
// Matilda now rotates recorded little-girl syllable grains; glyph timing is unchanged.
const matildaGrainVoice = {
  grainUrls: [1, 2, 3, 4, 5].map((n) => `/sfx/dialogue/matildaGrain${n}`),
  grainPattern: [0, 3, 1, 4, 2, 1, 3, 0],
  grainGain: 0.028,
  glyphMs: 76,
  releaseMs: 16,
  punctuationPauseMs: 120,
  sentencePauseMs: 185,
}

describe('Matilda dialogue voice selection', () => {
  it('uses the recorded girl grain profile', () => {
    expect(DIALOGUE_VOICE_PROFILES.matilda).toEqual(matildaGrainVoice)
    expect(getDialogueVoiceProfile('matilda', '오호호호!')).toEqual(matildaGrainVoice)
  })

  it('keeps the previous glyph and sentence timing', () => {
    const profile = getDialogueVoiceProfile('matilda', '오호!')
    expect(getDialogueGlyphDelay('오', profile)).toBe(76)
    expect(getDialogueGlyphDelay('!', profile)).toBe(185)
  })
})

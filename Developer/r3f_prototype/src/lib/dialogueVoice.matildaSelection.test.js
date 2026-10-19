import { describe, expect, it } from 'vitest'
import { DIALOGUE_VOICE_PROFILES, getDialogueVoiceProfile, getDialogueGlyphDelay } from './dialogueVoice.js'

// soundmini t_92589769 final handoff: applied A is 610 Hz / 76 ms,
// not the historical audition-label copy. Do not infer a new voice choice.
const selectedMatildaA = {
  waveform: 'triangle',
  overtoneWaveform: 'square',
  overtoneGain: 0.25,
  baseFrequency: 610,
  semitonePattern: [0, 4, 2, 5, -2, 0, -1, 2],
  detuneCents: 20,
  glyphMs: 76,
  durationMs: 64,
  gain: 0.043,
  attackMs: 2,
  releaseMs: 16,
  filterType: 'bandpass',
  filterFrequency: 1800,
  filterQ: 1.4,
  punctuationPauseMs: 120,
  sentencePauseMs: 185,
  vibratoRate: 10,
  vibratoDepthCents: 18,
}

describe('Matilda source-owner final selection', () => {
  it('uses every parameter of the actually selected A runtime profile', () => {
    expect(DIALOGUE_VOICE_PROFILES.matilda).toEqual(selectedMatildaA)
    expect(getDialogueVoiceProfile('matilda', '오호호호!')).toEqual(selectedMatildaA)
  })

  it('applies selected glyph and sentence timing through the runtime helper', () => {
    const profile = getDialogueVoiceProfile('matilda', '오호!')
    expect(getDialogueGlyphDelay('오', profile)).toBe(76)
    expect(getDialogueGlyphDelay('!', profile)).toBe(185)
  })
})

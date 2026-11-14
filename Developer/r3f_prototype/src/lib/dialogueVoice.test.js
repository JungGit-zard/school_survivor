import { describe, expect, it } from 'vitest'
import {
  DIALOGUE_VOICE_PROFILES,
  getDialogueGlyphDelay,
  getDialogueVoiceProfile,
  isSilentDialogueGlyph,
  segmentDialogueText,
} from './dialogueVoice.js'

describe('dialogueVoice', () => {
  it('segments Korean dialogue by grapheme and skips punctuation as silent timing glyphs', () => {
    expect(segmentDialogueText('오호!')).toEqual(['오', '호', '!'])
    expect(isSilentDialogueGlyph('오')).toBe(false)
    expect(isSilentDialogueGlyph('!')).toBe(true)
    expect(getDialogueGlyphDelay('!', DIALOGUE_VOICE_PROFILES.matilda)).toBe(DIALOGUE_VOICE_PROFILES.matilda.sentencePauseMs)
  })

  it('keeps protagonist and Matilda voice profiles distinct', () => {
    const protagonist = getDialogueVoiceProfile('protagonistIntro', '공부가 하기싫은 학생들의 마음')
    const urgent = getDialogueVoiceProfile('protagonistIntro', '난 여기서 빠져나가야겠어, 여긴… 좀비학교다!')
    const matilda = getDialogueVoiceProfile('matilda', '오호호호! 떡하나주면 안잡아먹지!')

    expect(urgent.baseFrequency).toBeGreaterThan(protagonist.baseFrequency)
    // 2026-11-14: Matilda speaks with recorded little-girl syllable grains, not an oscillator.
    expect(protagonist.waveform).toBeTruthy()
    expect(matilda.grainUrls.length).toBeGreaterThanOrEqual(3)
    expect(matilda.waveform).toBeUndefined()
  })
})

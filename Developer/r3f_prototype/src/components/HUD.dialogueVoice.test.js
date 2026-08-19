import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')

describe('HUD dialogue voice wiring', () => {
  it('plays Animalese-style protagonist voice for Stage 1 intro lines', () => {
    expect(source).toContain("import { playDialogueVoice, stopDialogueVoice } from '../lib/dialogueVoice.js'")
    expect(source).toContain("playDialogueVoice(line, 'protagonistIntro'")
    // introLine()이 STAGE1_INTRO_IDS로 로케일 문구를 조회해 돌려준다(i18n 전환 후 심볼명).
    expect(source).toContain('const line = introLine(introDialogue.index)')
    expect(source).toContain('STAGE1_INTRO_IDS[index]')
  })

  it('plays the distinct Matilda dialogue voice when her dialogue appears', () => {
    expect(source).toContain("playDialogueVoice(matildaDialogueLine, 'matilda'")
    expect(source).toContain('delayMs: 180')
    expect(source).toContain('matildaDialogueVisible')
  })
})

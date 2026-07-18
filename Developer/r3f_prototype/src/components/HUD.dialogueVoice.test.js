import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')

describe('HUD dialogue voice wiring', () => {
  it('plays Animalese-style protagonist voice for Stage 1 intro lines', () => {
    expect(source).toContain("import { playDialogueVoice, stopDialogueVoice } from '../lib/dialogueVoice.js'")
    expect(source).toContain("playDialogueVoice(line, 'protagonistIntro'")
    expect(source).toContain('STAGE1_INTRO_LINES[introDialogue.index]')
  })

  it('plays the distinct Matilda dialogue voice when her dialogue appears', () => {
    expect(source).toContain("playDialogueVoice(MATILDA_DIALOGUE_LINE, 'matilda'")
    expect(source).toContain('delayMs: 180')
    expect(source).toContain('matildaDialogueVisible')
  })
})

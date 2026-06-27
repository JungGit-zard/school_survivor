import { describe, expect, it } from 'vitest'
import {
  schoolButton,
  schoolPanel,
  uiBorders,
  uiPalette,
  uiShadows,
  warningSticker,
} from './uiStyle.js'

describe('infected school UI style tokens', () => {
  it('keeps the planned role colors stable', () => {
    expect(uiPalette.cta).toBe('#59c7ff')
    expect(uiPalette.reward).toBe('#f7d17e')
    expect(uiPalette.danger).toBe('#e03040')
    expect(uiPalette.chalkboard).toBe('#18372f')
    expect(uiPalette.paper).toBe('#f6ead0')
  })

  it('uses thick toon outlines and short press shadows', () => {
    expect(uiBorders.strong).toBe('2px solid #050209')
    expect(uiShadows.press).toContain('#050209')
    expect(schoolButton()).toMatchObject({
      minHeight: 48,
      border: uiBorders.strong,
      borderRadius: 8,
    })
    expect(schoolButton().boxShadow).toContain(uiShadows.press)
  })

  it('maps button intents to school survival materials', () => {
    expect(schoolButton('primary').background).toContain(uiPalette.cta)
    expect(schoolButton('reward').background).toContain(uiPalette.reward)
    expect(schoolButton('paper').background).toBe(uiPalette.paper)
    expect(schoolButton('danger').background).toBe(uiPalette.danger)
  })

  it('provides reusable school panels and warning stickers', () => {
    expect(schoolPanel('chalk')).toMatchObject({
      border: uiBorders.strong,
      background: uiPalette.chalkboard,
      color: uiPalette.paper,
    })
    expect(warningSticker()).toMatchObject({
      border: uiBorders.strong,
      background: uiPalette.warning,
      color: uiPalette.ink,
    })
  })
})

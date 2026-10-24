import { describe, expect, it } from 'vitest'
import { getStage4CauldronFeedback } from './stage4CauldronFeedback.js'

const cue = (from, to, stage = 'stage4', phase = 'playing') => getStage4CauldronFeedback(from, to, stage, phase)

describe('Stage4 current cauldron fixed-step edges', () => {
  it('starts the warning at 12s, not every warning substep', () => {
    expect(cue(11990, 12000)).toBe('zombieGiantThud')
    expect(cue(12000, 12017)).toBe(null)
    expect(cue(14980, 14999)).toBe(null)
    expect(cue(26990, 27000)).toBe('zombieGiantThud')
  })
  it('emits the actual explosion edge only in the current 250ms burst', () => {
    expect(cue(14990, 15000)).toBe('flaskHit')
    expect(cue(15000, 15017)).toBe(null)
    expect(cue(14990, 15249)).toBe('flaskHit')
    expect(cue(14990, 15250)).toBe(null)
    expect(cue(0, 0)).toBe(null)
  })
  it('drops all past skipped cycles and never replays a skipped warning at explosion', () => {
    expect(cue(0, 60100)).toBe('flaskHit')
    expect(cue(0, 61000)).toBe(null)
    expect(cue(0, 74000)).toBe('zombieGiantThud')
  })
  it.each(['stage1', 'stage2', 'stage3', 'stage5'])('is silent in %s', (stage) => {
    expect(cue(11990, 12000, stage)).toBe(null)
    expect(cue(14990, 15000, stage)).toBe(null)
  })
  it.each(['paused', 'levelup', 'gameover', 'cleared', 'intro'])('is silent during %s', (phase) => {
    expect(cue(11990, 12000, 'stage4', phase)).toBe(null)
  })
  it('ignores invalid or reversed time instead of manufacturing an event', () => {
    for (const [from, to] of [[NaN, 12000], [0, Infinity], [-1, 12000], [12000, 11999]]) {
      expect(cue(from, to)).toBe(null)
    }
  })
})

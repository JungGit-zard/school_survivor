import { describe, expect, it } from 'vitest'
import {
  MATILDA_DIALOGUE_MS,
  advanceMatildaEntryGrace,
  canSpawnMatildaEntry,
  cancelMatildaEntryGrace,
  createMatildaEntryGrace,
} from './matildaEntryGrace.js'

describe('Matilda dialogue entry grace', () => {
  it('does not complete at 4.4s and completes exactly once at 4.5s of gameplay', () => {
    const entry = createMatildaEntryGrace({ stageId: 'stage1', gameKey: 8 })

    expect(advanceMatildaEntryGrace(entry, 4.4)).toBe(false)
    expect(entry.remainingMs).toBeCloseTo(100, 8)
    expect(advanceMatildaEntryGrace(entry, 0.1)).toBe(true)
    expect(advanceMatildaEntryGrace(entry, 20)).toBe(false)
  })

  it('completes deterministically on the 270th 60 Hz gameplay step', () => {
    const entry = createMatildaEntryGrace()
    for (let step = 0; step < 269; step += 1) {
      expect(advanceMatildaEntryGrace(entry, 1 / 60)).toBe(false)
    }

    expect(entry.remainingMs).toBeGreaterThan(0)
    expect(advanceMatildaEntryGrace(entry, 1 / 60)).toBe(true)
    expect(entry.remainingMs).toBe(0)
    expect(advanceMatildaEntryGrace(entry, 1 / 60)).toBe(false)
  })

  it('does not consume paused or level-up wall-clock time because no gameplay step advances it', () => {
    const entry = createMatildaEntryGrace()
    advanceMatildaEntryGrace(entry, 4.4)
    const beforePause = entry.remainingMs

    // Pause/level-up: usePlayingFrame calls no callback, so the entry is untouched.
    expect(entry.remainingMs).toBe(beforePause)
    expect(advanceMatildaEntryGrace(entry, 0.1)).toBe(true)
  })

  it('preserves stage and run tokens for the caller to reject stale entries', () => {
    const entry = createMatildaEntryGrace({ stageId: 'stage1', gameKey: 8 })
    expect(entry.stageId).toBe('stage1')
    expect(entry.gameKey).toBe(8)
    expect(advanceMatildaEntryGrace(entry, MATILDA_DIALOGUE_MS / 1000)).toBe(true)
    expect(canSpawnMatildaEntry(entry, { matildaSpawned: true, currentStageId: 'stage1', gameKey: 8, phase: 'playing' })).toBe(true)
    expect(canSpawnMatildaEntry(entry, { matildaSpawned: true, currentStageId: 'stage2', gameKey: 8, phase: 'playing' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { matildaSpawned: true, currentStageId: 'stage1', gameKey: 9, phase: 'playing' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { matildaSpawned: false, currentStageId: 'stage1', gameKey: 8, phase: 'playing' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { matildaSpawned: true, currentStageId: 'stage1', gameKey: 8, phase: 'gameover' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { matildaSpawned: true, currentStageId: 'stage1', gameKey: 8, phase: 'cleared' })).toBe(false)
  })

  it('cancels reset, stage-change, and unmount pending entries', () => {
    const entry = createMatildaEntryGrace()
    cancelMatildaEntryGrace(entry)
    expect(advanceMatildaEntryGrace(entry, MATILDA_DIALOGUE_MS / 1000)).toBe(false)
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createRankingRows, mergeCloudEntries } from './userRanking.js'

const rowFor = (entry) => createRankingRows([{ uid: 'synthetic-ranking-only', score: 300, timeMs: 60000, ...entry }], 1)[0]

describe('accepted stage ranking identity regression B01', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index + 1))('preserves explicit Stage %i identity through rows and UID merge', (number) => {
    const stageId = `stage${number}`
    const input = { uid: 'synthetic-ranking-only', score: 300, timeMs: 60000, stageId }
    expect(rowFor({ stageId })).toMatchObject({ stageId, stageLabel: `Stage ${number}`, score: 300 })
    expect(mergeCloudEntries(null, [input], input.uid)[0]).toMatchObject({ stageId, stageLabel: `Stage ${number}` })
  })
  it.each(Array.from({ length: 10 }, (_, index) => index + 1))('retains legacy label-only Stage %i records', (number) => {
    expect(rowFor({ stageLabel: `Stage ${number}` }).stageId).toBe(`stage${number}`)
  })
  it.each(['stage0', 'stage11', '__proto__', 'constructor', '', null, undefined])('does not accept unknown stage identity %s', (stageId) => {
    expect(rowFor({ stageId }).stageId).toBe('stage1')
  })
  it('uses the explicit accepted ID rather than a conflicting legacy label', () => {
    expect(rowFor({ stageId: 'stage5', stageLabel: 'Stage 4' }).stageId).toBe('stage5')
  })
})

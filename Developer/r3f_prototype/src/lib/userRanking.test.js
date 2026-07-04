// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  RANKING_LIMIT,
  buildLocalPlayerRankingEntry,
  createRankingRows,
  formatSurvivalTime,
  mergeCloudEntries,
} from './userRanking.js'
import { saveNicknameForUser } from './userNickname.js'

describe('user ranking helpers', () => {
  it('sorts entries by survival score and fills ranks through 100', () => {
    const rows = createRankingRows([
      { displayName: '민수', survivalSeconds: 220, stageId: 'stage1', cleared: false },
      { displayName: '지안', survivalSeconds: 180, stageId: 'stage2', cleared: false },
      { displayName: '하린', survivalSeconds: 240, stageId: 'stage1', cleared: true },
    ])

    expect(rows).toHaveLength(RANKING_LIMIT)
    expect(rows[0]).toMatchObject({ rank: 1, displayName: '하린', score: 270, stageId: 'stage1', empty: false })
    expect(rows[1]).toMatchObject({ rank: 2, displayName: '지안', score: 240, stageId: 'stage2', empty: false })
    expect(rows[2]).toMatchObject({ rank: 3, displayName: '민수', score: 220, stageId: 'stage1', empty: false })
    expect(rows[99]).toMatchObject({ rank: 100, displayName: '', score: 0, survivalSeconds: 0, empty: true })
  })

  it('caps ranking rows at the top 100 entries', () => {
    const rows = createRankingRows(
      Array.from({ length: 125 }, (_, index) => ({
        displayName: `User ${index + 1}`,
        survivalSeconds: 125 - index,
        stageId: 'stage1',
      })),
    )

    expect(rows).toHaveLength(RANKING_LIMIT)
    expect(rows[0].score).toBe(125)
    expect(rows[99].score).toBe(26)
  })

  it('builds the local player entry from the best stage record', () => {
    const entry = buildLocalPlayerRankingEntry({
      bestSurvivalSeconds: 180,
      stage2BestSurvivalSec: 220,
    }, { displayName: 'Player One' })

    expect(entry).toMatchObject({
      displayName: 'Player One',
      score: 280,
      survivalSeconds: 220,
      stageLabel: 'Stage 2',
      stageId: 'stage2',
      local: true,
    })
  })

  it('prefers the saved Google-matched nickname for the local player ranking entry', () => {
    saveNicknameForUser({ uid: 'uid-1' }, '랭킹 생존자')

    const entry = buildLocalPlayerRankingEntry({
      bestSurvivalSeconds: 180,
      stage2BestSurvivalSec: 0,
    }, { uid: 'uid-1', displayName: 'Google Name' })

    expect(entry.displayName).toBe('랭킹 생존자')
  })

  it('formats survival seconds as minutes and seconds', () => {
    expect(formatSurvivalTime(0)).toBe('0:00')
    expect(formatSurvivalTime(82)).toBe('1:22')
    expect(formatSurvivalTime(240)).toBe('4:00')
  })

  it('keeps every cloud score even when the same Google uid has multiple entries', () => {
    const merged = mergeCloudEntries(null, [
      { uid: 'uid-1', displayName: 'A', survivalSeconds: 120, stageId: 'stage1' },
      { uid: 'uid-1', displayName: 'A', survivalSeconds: 180, stageId: 'stage1' },
      { uid: 'uid-2', displayName: 'B', survivalSeconds: 150, stageId: 'stage2' },
    ], 'uid-1')

    expect(merged).toHaveLength(3)
  })
})

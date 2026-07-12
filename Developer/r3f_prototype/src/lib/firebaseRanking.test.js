import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firebase ranking client contract', () => {
  const source = readFileSync(new URL('./firebaseRanking.js', import.meta.url), 'utf8')

  it('submits ranking runs through the authenticated callable backend', () => {
    expect(source).toContain("import('firebase/functions')")
    expect(source).toContain("'submitRankingRun'")
    expect(source).toContain('functionsModule.httpsCallable')
    expect(source).not.toContain('mod.runTransaction(')
  })

  it('reads public global daily/weekly and stage-daily projections', () => {
    expect(source).toContain("const RANKING_ROOT = 'rankingService/v1/public'")
    expect(source).toContain('/global/${window}/${key}/entries')
    expect(source).toContain('/stage/${stageId}/daily/${key}/entries')
  })

  it('subscribes to ranking updates and rebinds at KST period boundaries', () => {
    expect(source).toContain('mod.onValue(')
    expect(source).toContain('msUntilNextWindow')
    expect(source).toContain('kstWeeklyKey(now)')
  })
})

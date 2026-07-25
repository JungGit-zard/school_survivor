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

  it('reads public global and stage projections across daily/weekly windows', () => {
    expect(source).toContain("const RANKING_ROOT = 'rankingService/v1/public'")
    expect(source).toContain('/global/${window}/${key}/entries')
    // stage board path is window-generalized (daily + weekly) — no longer hardcoded to daily.
    expect(source).toContain('/stage/${stageId}/${normalizeWindow(window)}/${key}/entries')
  })

  it('subscribes to ranking updates and rebinds at KST period boundaries', () => {
    expect(source).toContain('mod.onValue(')
    expect(source).toContain('msUntilNextWindow')
    expect(source).toContain('kstWeeklyKey(now)')
  })
})

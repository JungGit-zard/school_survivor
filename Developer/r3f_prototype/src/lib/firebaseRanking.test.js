import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firebase ranking storage contract', () => {
  const source = readFileSync(new URL('./firebaseRanking.js', import.meta.url), 'utf8')

  it('writes to the season/stage/window/period nested entries path', () => {
    expect(source).toContain('rankings/${seasonId}/stage/${stageId}/${window}/${key}/entries')
    expect(source).toContain("const WINDOWS = ['daily', 'weekly']")
  })

  it('keeps only the best score per uid (monotonic best-only write)', () => {
    expect(source).toContain('const existing = await mod.get(entryRef)')
    expect(source).toContain('if (existing.exists() && readScore(existing.val()?.score) >= nextScore) return')
    expect(source).toContain('uid: user.uid')
    expect(source).toContain('displayName: pickDisplayName(user)')
    expect(source).not.toContain('mod.push(')
  })

  it('skips submission for E2E bypass users, unconfigured Firebase, and inactive seasons', () => {
    expect(source).toContain('if (isE2EAuthBypass()) return')
    expect(source).toContain('if (!user?.uid || !isFirebaseRankingConfigured()) return')
    expect(source).toContain('if (!season.active) return')
  })

  it('aggregates the global board on read across all stages', () => {
    expect(source).toContain('Object.keys(STAGE_CONFIGS)')
    expect(source).toContain('current.score += readScore(value.score)')
  })
})

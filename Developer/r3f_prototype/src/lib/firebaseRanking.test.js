import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firebase ranking storage contract', () => {
  it('stores only the best Google ranking score per uid', () => {
    const source = readFileSync(new URL('./firebaseRanking.js', import.meta.url), 'utf8')

    expect(source).toContain('mod.ref(db, `rankings/${seasonId}/entries/${user.uid}`)')
    expect(source).toContain('const existing = await mod.get(entryRef)')
    expect(source).toContain('if (existing.exists() && readScore(existing.val()?.score) >= nextScore) return')
    expect(source).toContain('uid: user.uid')
    expect(source).toContain('displayName:')
    expect(source).not.toContain('mod.push(')
  })
})

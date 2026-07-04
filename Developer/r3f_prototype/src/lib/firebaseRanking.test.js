import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firebase ranking storage contract', () => {
  it('appends every Google ranking score under a unique shared entry id', () => {
    const source = readFileSync(new URL('./firebaseRanking.js', import.meta.url), 'utf8')

    expect(source).toContain('mod.push(mod.ref(db, `rankings/${seasonId}/entries`))')
    expect(source).toContain('uid: user.uid')
    expect(source).toContain('displayName:')
    expect(source).not.toContain('entries/${user.uid}')
    expect(source).not.toContain('existing.val().score')
  })
})

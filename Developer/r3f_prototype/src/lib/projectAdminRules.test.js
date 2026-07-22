import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rules = readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')

describe('Realtime Database project master rule', () => {
  it('keeps root denied and grants owner-or-verified-Google-master access only to user and Studio paths', () => {
    expect(rules).toContain('".read": false')
    expect(rules).toContain('".write": false')
    expect(rules.match(/auth\.token\.email === 'zard5388@gmail\.com'/g)).toHaveLength(5)
    expect(rules.match(/auth\.token\.email_verified === true/g)).toHaveLength(5)
    expect(rules.match(/auth\.token\.firebase\.sign_in_provider === 'google\.com'/g)).toHaveLength(5)
  })
})

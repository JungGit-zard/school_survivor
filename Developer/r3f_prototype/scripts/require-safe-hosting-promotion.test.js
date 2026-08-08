import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve(import.meta.dirname, 'require-safe-hosting-promotion.mjs')

function run(extraEnvironment = {}) {
  return spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, ...extraEnvironment } })
}

describe('Firebase Hosting direct-deploy guard', () => {
  it('blocks a direct deploy without the safe preview promotion nonce', () => {
    const result = run({ ESCAPE_HOSTING_PROMOTION_NONCE: '' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Direct Firebase Hosting deploy is blocked')
  })

  it('allows the nonce passed by the safe preview promoter', () => {
    const result = run({ ESCAPE_HOSTING_PROMOTION_NONCE: '12345678-1234-1234-1234-123456789abc' })
    expect(result.status).toBe(0)
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, unlinkSync, rmdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LANGUAGES, precheck, releaseLease, markPublished } from './precheck.mjs'

function fixture(t) {
  const stateDir = mkdtempSync(join(tmpdir(), 'daily-comic-precheck-'))
  t.after(() => {
    for (const entry of readdirSync(stateDir, { withFileTypes: true })) {
      if (entry.isFile()) unlinkSync(join(stateDir, entry.name))
      else if (entry.name === 'published') {
        for (const name of readdirSync(join(stateDir, 'published'))) unlinkSync(join(stateDir, 'published', name))
        rmdirSync(join(stateDir, 'published'))
      }
    }
    rmdirSync(stateDir)
  })
  return stateDir
}
const due = new Date('2026-10-13T00:00:00.000Z')
function receipt(date = '2026-10-13') {
  return { publishedDate: date, homepageVerified: true, verifiedAt: due.toISOString(), commit: 'fixture-commit', hostingVersion: 'fixture-version',
    images: LANGUAGES.map((language) => ({ language, status: 200, url: `https://example.invalid/${date}/${language}.png` })) }
}

test('waits until 09:00 KST unless explicitly forced', (t) => {
  const stateDir = fixture(t)
  const now = new Date('2026-10-12T23:59:59.000Z')
  assert.equal(precheck({ stateDir, now }).status, 'before-09-KST')
  assert.equal(precheck({ stateDir, now, force: true }).status, 'work-pending')
})

test('scheduler check-only never creates state or a lease and leaves the actual worker able to acquire', (t) => {
  const stateDir = join(fixture(t), 'check-only-state')
  assert.equal(precheck({ stateDir, now: due, checkOnly: true }).exitCode, 0)
  assert.equal(existsSync(stateDir), false)
  const lease = precheck({ stateDir, now: due })
  assert.equal(lease.status, 'work-pending')
  assert.equal(precheck({ stateDir, now: due, checkOnly: true }).status, 'leased')
  releaseLease({ stateDir, leaseId: lease.leaseId })
  rmdirSync(stateDir)
})

test('keeps one atomic lease, resumes existing artwork publication and rejects another owner', (t) => {
  const stateDir = fixture(t)
  const first = precheck({ stateDir, now: due, catalogDates: ['2026-10-13'] })
  assert.equal(first.mode, 'resume-publication')
  assert.equal(first.date, '2026-10-13')
  assert.equal(precheck({ stateDir, now: due }).status, 'leased')
  assert.throws(() => releaseLease({ stateDir, leaseId: 'other-job' }), /owner mismatch/)
  assert.equal(JSON.parse(readFileSync(first.leasePath)).id, first.leaseId)
  assert.equal(releaseLease({ stateDir, leaseId: first.leaseId }).status, 'released')
  assert.equal(precheck({ stateDir, now: due }).mode, 'new-story')
})

test('reclaims an expired lease after 60 minutes', (t) => {
  const stateDir = fixture(t)
  const first = precheck({ stateDir, now: due })
  const second = precheck({ stateDir, now: new Date(due.getTime() + 60 * 60 * 1000) })
  assert.equal(second.status, 'work-pending')
  assert.notEqual(second.leaseId, first.leaseId)
})

test('recovers a crashed expired reclaim guard but preserves a living owner', (t) => {
  const stateDir = fixture(t)
  precheck({ stateDir, now: due })
  const now = new Date(due.getTime() + 60 * 60 * 1000)
  const guardPath = join(stateDir, 'reclaim.lock')
  writeFileSync(guardPath, JSON.stringify({ id: 'fixture-guard', expiresAt: due.toISOString(), pid: process.pid }))
  assert.equal(precheck({ stateDir, now }).status, 'reclaim-in-progress')
  assert.equal(JSON.parse(readFileSync(guardPath)).id, 'fixture-guard')
  writeFileSync(guardPath, JSON.stringify({ id: 'crashed-guard', expiresAt: due.toISOString() }))
  assert.equal(precheck({ stateDir, now }).status, 'work-pending')
})

test('records only verified six-language publication and skips that date on every retry', (t) => {
  const stateDir = fixture(t)
  const lease = precheck({ stateDir, now: due })
  const incomplete = receipt()
  incomplete.images.pop()
  assert.throws(() => markPublished({ stateDir, leaseId: lease.leaseId, receipt: incomplete }), /verified six-language/)
  assert.equal(markPublished({ stateDir, leaseId: lease.leaseId, receipt: receipt() }).status, 'publication-recorded')
  releaseLease({ stateDir, leaseId: lease.leaseId })
  assert.equal(precheck({ stateDir, now: due }).status, 'published')
  assert.equal(precheck({ stateDir, now: due, force: true }).exitCode, 2)
})

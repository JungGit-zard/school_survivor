import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, existsSync, unlinkSync, renameSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

export const STATE_DIR = 'C:/Users/admin/AppData/Local/escape-zombie-school-comics-state'
export const LANGUAGES = ['ko', 'en', 'ja', 'zh-CN', 'vi', 'id']
const LEASE_MS = 60 * 60 * 1000
const RECLAIM_MS = 60 * 1000
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function writeExclusive(path, value) {
  const fd = openSync(path, 'wx')
  try { writeFileSync(fd, JSON.stringify(value, null, 2)) } finally { closeSync(fd) }
}

function acquireReclaimGuard(path, now) {
  const guard = { id: randomUUID(), pid: process.pid, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + RECLAIM_MS).toISOString() }
  try { writeExclusive(path, guard); return guard } catch (error) {
    if (error.code !== 'EEXIST') throw error
    let previous
    try { previous = readJson(path) } catch { previous = { expiresAt: new Date(statSync(path).mtimeMs + RECLAIM_MS).toISOString() } }
    let ownerAlive = false
    if (previous.pid) {
      try { process.kill(previous.pid, 0); ownerAlive = true } catch (ownerError) { ownerAlive = ownerError.code === 'EPERM' }
    }
    if (ownerAlive || Date.parse(previous.expiresAt) > now.getTime()) throw error
    // A crashed reclaimer may leave its short-lived guard behind; never remove a living owner.
    unlinkSync(path)
    writeExclusive(path, guard)
    return guard
  }
}

function releaseReclaimGuard(path, guard) {
  if (existsSync(path) && readJson(path).id === guard.id) unlinkSync(path)
}

function isVerified(receipt, date) {
  return receipt?.publishedDate === date && receipt.homepageVerified === true && receipt.verifiedAt
    && receipt.commit && receipt.hostingVersion
    && LANGUAGES.every((language) => receipt.images?.some((image) => image.language === language && image.status === 200 && image.url))
}

export function precheck({ now = new Date(), stateDir = STATE_DIR, force = false, checkOnly = false, catalogDates = [] } = {}) {
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23' }).format(now))
  const receiptPath = join(stateDir, 'published', `${date}.json`)
  const leasePath = join(stateDir, 'lease.json')
  if (existsSync(receiptPath) && isVerified(readJson(receiptPath), date)) return { status: 'published', date, receiptPath, exitCode: 2 }
  if (!force && hour < 9) return { status: 'before-09-KST', date, exitCode: 2 }
  if (checkOnly) {
    if (existsSync(leasePath)) {
      const previous = readJson(leasePath)
      if (Date.parse(previous.expiresAt) > now.getTime()) return { status: 'leased', date, leasePath, expiresAt: previous.expiresAt, exitCode: 2 }
    }
    return { status: 'work-pending', date, mode: catalogDates.includes(date) ? 'resume-publication' : 'new-story', checkOnly: true, receiptPath, exitCode: 0 }
  }
  mkdirSync(stateDir, { recursive: true })
  const lease = { id: randomUUID(), date, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + LEASE_MS).toISOString() }
  try {
    writeExclusive(leasePath, lease)
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    const previous = readJson(leasePath)
    if (Date.parse(previous.expiresAt) > now.getTime()) return { status: 'leased', date, leasePath, expiresAt: previous.expiresAt, exitCode: 2 }
    // Only one process may reclaim an expired lease; the ordinary acquire remains atomic.
    const reclaimPath = join(stateDir, 'reclaim.lock')
    let guard
    try { guard = acquireReclaimGuard(reclaimPath, now) } catch (reclaimError) {
      if (reclaimError.code !== 'EEXIST') throw reclaimError
      return { status: 'reclaim-in-progress', date, leasePath, exitCode: 2 }
    }
    try {
      if (existsSync(leasePath)) {
        const current = readJson(leasePath)
        if (Date.parse(current.expiresAt) > now.getTime()) return { status: 'leased', date, leasePath, expiresAt: current.expiresAt, exitCode: 2 }
        renameSync(leasePath, join(stateDir, `expired-lease-${randomUUID()}.json`))
      }
      try { writeExclusive(leasePath, lease) } catch (acquireError) {
        if (acquireError.code !== 'EEXIST') throw acquireError
        return { status: 'leased', date, leasePath, exitCode: 2 }
      }
    } finally { releaseReclaimGuard(reclaimPath, guard) }
  }
  return { status: 'work-pending', date, mode: catalogDates.includes(date) ? 'resume-publication' : 'new-story',
    leaseId: lease.id, leasePath, expiresAt: lease.expiresAt, receiptPath, exitCode: 0 }
}

export function releaseLease({ stateDir = STATE_DIR, leaseId }) {
  const path = join(stateDir, 'lease.json')
  if (!existsSync(path)) return { status: 'already-released' }
  const reclaimPath = join(stateDir, 'reclaim.lock')
  const guard = acquireReclaimGuard(reclaimPath, new Date())
  try {
    if (!existsSync(path)) return { status: 'already-released' }
    if (readJson(path).id !== leaseId) throw new Error('Lease owner mismatch; active job is preserved.')
    unlinkSync(path)
    return { status: 'released' }
  } finally { releaseReclaimGuard(reclaimPath, guard) }
}

export function markPublished({ stateDir = STATE_DIR, leaseId, receipt }) {
  const lease = readJson(join(stateDir, 'lease.json'))
  if (lease.id !== leaseId || !isVerified(receipt, lease.date)) throw new Error('Matching lease and verified six-language publication receipt required.')
  const dir = join(stateDir, 'published')
  mkdirSync(dir, { recursive: true })
  const destination = join(dir, `${lease.date}.json`)
  if (existsSync(destination)) {
    if (!isVerified(readJson(destination), lease.date)) throw new Error('Existing receipt is invalid; do not overwrite.')
  } else {
    const temporary = join(dir, `${lease.date}.${leaseId}.tmp`)
    writeExclusive(temporary, receipt)
    renameSync(temporary, destination)
  }
  return { status: 'publication-recorded', date: lease.date, receiptPath: destination }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { force: { type: 'boolean' }, 'check-only': { type: 'boolean' }, release: { type: 'boolean' },
      'mark-published': { type: 'boolean' }, 'lease-id': { type: 'string' }, receipt: { type: 'string' },
      'state-dir': { type: 'string', default: STATE_DIR } } })
    const options = { stateDir: values['state-dir'], leaseId: values['lease-id'] }
    let result
    if (values.release) result = releaseLease(options)
    else if (values['mark-published']) result = markPublished({ ...options, receipt: readJson(values.receipt) })
    else {
      const catalogUrl = new URL('../../../Developer/r3f_prototype/src/components/dailyWebComics.js', import.meta.url)
      const { dailyWebComics } = await import(pathToFileURL(fileURLToPath(catalogUrl)).href)
      result = precheck({ ...options, force: values.force, checkOnly: values['check-only'], catalogDates: dailyWebComics.map((entry) => entry.date) })
    }
    console.log(JSON.stringify(result))
    process.exitCode = result.exitCode ?? 0
  } catch (error) {
    console.error(JSON.stringify({ status: 'error', message: error.message }))
    process.exitCode = 1
  }
}

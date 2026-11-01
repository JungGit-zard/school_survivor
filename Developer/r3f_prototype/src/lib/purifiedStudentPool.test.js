import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  PURIFIED_STUDENT_CAPACITY, PURIFIED_STUDENT_DELAY_MS, PURIFIED_STUDENT_LIFETIME_MS, PURIFIED_STUDENT_RECYCLE_MIN_AGE_MS,
  advancePurifiedStudents, createPurifiedStudentPool, getPurifiedStudentOpacity, purifiedUniformColors, resetPurifiedStudents, spawnPurifiedStudent,
} from './purifiedStudentPool.js'
import { emitPurifiedStudentForDeath } from '../components/Enemies.jsx'
import { ZOMBIE_PALETTE } from '../components/ZombieMesh.jsx'

const PAL = { body: 0x336699, bottom: 0x222222 }
const fill = (pool, n) => { for (let i = 0; i < n; i += 1) spawnPurifiedStudent(pool, i, 0, 0, 1, PAL) }

describe('purified student pool', () => {
  it('caps simultaneous students at a small fixed capacity', () => {
    expect(PURIFIED_STUDENT_CAPACITY).toBeGreaterThanOrEqual(24)
    expect(PURIFIED_STUDENT_CAPACITY).toBeLessThanOrEqual(32)
    const pool = createPurifiedStudentPool()
    fill(pool, PURIFIED_STUDENT_CAPACITY + 10)
    expect(pool.activeCount).toBe(PURIFIED_STUDENT_CAPACITY)
    expect(pool.active.reduce((s, v) => s + v, 0)).toBe(PURIFIED_STUDENT_CAPACITY)
    // a burst while every student is still clearly visible is skipped, never overdrawn
    expect(pool.skipped).toBe(10)
    expect(pool.recycled).toBe(0)
  })

  it('recycles the oldest slot once it is already fading out', () => {
    const pool = createPurifiedStudentPool(4)
    fill(pool, 4)
    pool.age.set([PURIFIED_STUDENT_RECYCLE_MIN_AGE_MS + 10, 100, 200, 300])
    const slot = spawnPurifiedStudent(pool, 9, 0, 9, 1, PAL)
    expect(slot).toBe(0)
    expect(pool.recycled).toBe(1)
    expect(pool.age[0]).toBe(0)
    expect(pool.x[0]).toBe(9)
    expect(pool.activeCount).toBe(4)
  })

  it('expires each student after its lifetime and frees the slot', () => {
    const pool = createPurifiedStudentPool(2)
    fill(pool, 2)
    for (let t = 0; t < PURIFIED_STUDENT_LIFETIME_MS + 40; t += 40) advancePurifiedStudents(pool, 40)
    expect(pool.activeCount).toBe(0)
    expect(spawnPurifiedStudent(pool, 0, 0, 0, 1, PAL)).toBeGreaterThanOrEqual(0)
  })

  it('skips spawning while the frame budget is tight', () => {
    const pool = createPurifiedStudentPool(4)
    advancePurifiedStudents(pool, 80)
    expect(pool.busy).toBe(true)
    expect(spawnPurifiedStudent(pool, 0, 0, 0, 1, PAL)).toBe(-1)
    advancePurifiedStudents(pool, 16)
    expect(spawnPurifiedStudent(pool, 0, 0, 0, 1, PAL)).toBe(0)
  })

  it('appears after the break, holds, then fades out (about 0.6-1.0 s visible)', () => {
    expect(getPurifiedStudentOpacity(0)).toBe(0)
    expect(getPurifiedStudentOpacity(PURIFIED_STUDENT_DELAY_MS)).toBe(0)
    expect(getPurifiedStudentOpacity(PURIFIED_STUDENT_DELAY_MS + 400)).toBe(1)
    expect(getPurifiedStudentOpacity(PURIFIED_STUDENT_LIFETIME_MS)).toBe(0)
    const visibleMs = PURIFIED_STUDENT_LIFETIME_MS - PURIFIED_STUDENT_DELAY_MS
    expect(visibleMs).toBeGreaterThanOrEqual(600)
    expect(visibleMs).toBeLessThanOrEqual(1000)
  })

  it('dresses the student in a uniform that echoes the zombie palette', () => {
    const out = purifiedUniformColors({ body: 0x1f2a8a, bottom: 0x7c8494 }, [0, 0])
    expect(out[1]).toBe(0x7c8494)
    expect(out[0]).not.toBe(0x1f2a8a)
    expect(Math.abs(((out[0] >> 0) & 255) - 0x8a)).toBeLessThan(30)
  })

  it('resets on run restart', () => {
    const pool = createPurifiedStudentPool(3)
    fill(pool, 3)
    resetPurifiedStudents(pool)
    expect(pool.activeCount).toBe(0)
    expect(pool.active.every((v) => v === 0)).toBe(true)
  })

  it('does not allocate in spawn or advance', () => {
    const source = readFileSync(new URL('./purifiedStudentPool.js', import.meta.url), 'utf8')
    const body = (name) => source.slice(source.indexOf(`export function ${name}(`), source.indexOf('\n}\n', source.indexOf(`export function ${name}(`)))
    for (const name of ['spawnPurifiedStudent', 'advancePurifiedStudents', 'getPurifiedStudentHeadShake']) {
      expect(body(name)).not.toMatch(/new |\[\]|\{ *\}|\.\.\./)
    }
    const layer = readFileSync(new URL('../components/PurifiedStudentLayer.jsx', import.meta.url), 'utf8')
    const frame = layer.slice(layer.indexOf('useFrame((_, delta)'), layer.indexOf('\n  return <>'))
    expect(frame).not.toContain('new THREE.')
    expect(frame).not.toContain('...')
  })
})

describe('shared death path hook', () => {
  it('purifies every non-boss zombie, including the 15 new types, but not bosses or Matilda', () => {
    const pool = createPurifiedStudentPool(32)
    const drop = (type, extra = {}) => emitPurifiedStudentForDeath({ type, pos: [1, 0.3, 2], visualScale: 4 / 3, ...extra }, pool)
    for (const type of ['E01', 'E05', 'RZT', 'E07', 'E34', 'E46', 'E55', 'E60']) expect(drop(type), type).toBeGreaterThanOrEqual(0)
    for (const type of ['B01', 'B02', 'B03', 'B04', 'B05']) expect(drop(type), type).toBe(-1)
    expect(drop('E01', { isMatilda: true })).toBe(-1)
    expect(emitPurifiedStudentForDeath({ type: 'E01' }, pool)).toBe(-1)
    const e46 = drop('E46')
    expect(pool.bottom[e46]).toBe(ZOMBIE_PALETTE.E46.bottom)
  })
})

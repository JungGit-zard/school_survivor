// Sltera kills use the racer's knock-flight death (2026-11-22) through the per-kill-source option
// impact.deathStyleOverride; every other kill keeps the normal collapse + kill puff.
import { describe, expect, it } from 'vitest'
import { createSlteraHitImpact } from './SlteraEvent.jsx'
import { DEATH_STYLE_CODE, decodeDeathStyleOverride, emitEnemyDeathVisual, encodeDeathStyleOverride } from './Enemies.jsx'
import { KNOCK_FLIGHT_DEATH_STYLE, createKnockFlightPool } from '../lib/knockFlightDeath.js'
import { addSlteraLaunch, createSlteraLaunchTable, removeSlteraLaunchAt } from '../lib/slteraEvent.js'
import { purifiedStudentPool } from '../lib/purifiedStudentPool.js'

const dropData = (overrides = {}) => ({ pos: [2, 0.3, -1], xp: 4, type: 'E01', visualScale: 0.333, intensity: 'medium', ...overrides })

describe('Sltera hit impacts choose the knock-flight death', () => {
  it('both Sltera impacts (direct hit + landing) carry deathStyleOverride = knockFlight and stay non-weapon hits', () => {
    for (const impact of [createSlteraHitImpact(), createSlteraHitImpact()]) {
      expect(impact.deathStyleOverride).toBe(KNOCK_FLIGHT_DEATH_STYLE)
      expect(impact.ignoreSightBlock).toBe(true)
      expect(impact.knockback).toBe(0)
      expect(impact.weaponKey).toBeUndefined() // mission kill attribution unchanged
    }
    expect(createSlteraHitImpact()).not.toBe(createSlteraHitImpact())
  })

  it('the launch table keeps each flight direction (landing kill flies the same way), also across swap-removal', () => {
    const table = createSlteraLaunchTable(4)
    addSlteraLaunch(table, 7, 1, 0.3, 0.5, 1, 30, 0.6, 0.8)
    addSlteraLaunch(table, 9, 1, 0.3, 0.5, 1, 30, -1, 0)
    expect([table.dirX[0], table.dirZ[0]]).toEqual([expect.closeTo(0.6, 5), expect.closeTo(0.8, 5)])
    removeSlteraLaunchAt(table, 0)
    expect(table.index[0]).toBe(9)
    expect([table.dirX[0], table.dirZ[0]]).toEqual([-1, 0])
    // old callers without a direction still work (0,0 → the death picks its own direction)
    const slot = addSlteraLaunch(table, 11, 1, 0.3, 0.5, 1, 0)
    expect([table.dirX[slot], table.dirZ[slot]]).toEqual([0, 0])
  })
})

describe('death visual routing (per kill source)', () => {
  it('encodes the option into the pooled death queue and back without touching shatter5', () => {
    expect(encodeDeathStyleOverride(undefined)).toBe(DEATH_STYLE_CODE.DEFAULT)
    expect(encodeDeathStyleOverride('shatter5')).toBe(DEATH_STYLE_CODE.SHATTER5)
    expect(encodeDeathStyleOverride(KNOCK_FLIGHT_DEATH_STYLE)).toBe(DEATH_STYLE_CODE.KNOCK_FLIGHT)
    for (const style of [undefined, 'shatter5', KNOCK_FLIGHT_DEATH_STYLE]) expect(decodeDeathStyleOverride(encodeDeathStyleOverride(style))).toBe(style)
  })

  it('a Sltera kill flies away and pops instead of the normal collapse, kill puff and immediate purified student', () => {
    const flights = createKnockFlightPool()
    const collapses = []
    const studentsBefore = purifiedStudentPool.spawned
    const result = emitEnemyDeathVisual(dropData({ type: 'RDZ', styleOverride: KNOCK_FLIGHT_DEATH_STYLE, dirX: 1, dirZ: 0 }), collapses, flights)
    expect(result).toBe(KNOCK_FLIGHT_DEATH_STYLE)
    expect(collapses).toEqual([])
    expect(purifiedStudentPool.spawned).toBe(studentsBefore) // the student comes after the pop (KnockFlightDeathLayer)
    expect(flights.activeCount).toBe(1)
    expect(flights.vx[0]).toBeGreaterThan(0) // flung along the hit direction
    expect(flights.body[0]).toBe(0x2c3a66) // RDZ uniform
  })

  it('every other kill is unchanged: collapse entry + kill puff + purified student', () => {
    const flights = createKnockFlightPool()
    const collapses = []
    const studentsBefore = purifiedStudentPool.spawned
    expect(emitEnemyDeathVisual(dropData(), collapses, flights)).toBe('collapse')
    expect(emitEnemyDeathVisual(dropData({ styleOverride: 'shatter5' }), collapses, flights)).toBe('collapse')
    expect(collapses.map((c) => c.styleOverride)).toEqual([undefined, 'shatter5'])
    expect(purifiedStudentPool.spawned).toBe(studentsBefore + 2)
    expect(flights.activeCount).toBe(0)
  })

  it('bosses and Matilda keep their own deaths even when hit by the car', () => {
    const flights = createKnockFlightPool()
    const collapses = []
    emitEnemyDeathVisual(dropData({ type: 'B01', styleOverride: KNOCK_FLIGHT_DEATH_STYLE }), collapses, flights)
    emitEnemyDeathVisual(dropData({ type: 'E01', isMatilda: true, styleOverride: KNOCK_FLIGHT_DEATH_STYLE }), collapses, flights)
    expect(flights.activeCount).toBe(0)
    expect(collapses.length).toBe(2)
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getMatildaDashSpeed } from './matildaDashSpeed.js'

describe('Matilda base-additive speed per actual dash', () => {
  it('keeps the first dash at base, then adds one percent of base per start', () => {
    expect(getMatildaDashSpeed(10, 1)).toBe(10)
    expect(getMatildaDashSpeed(10, 2)).toBeCloseTo(10.1)
    expect(getMatildaDashSpeed(10, 3)).toBeCloseTo(10.2)
    expect(getMatildaDashSpeed(10, 101)).toBe(20)
  })
  it('does not compound or accumulate by frame reads', () => {
    for (let frame = 0; frame < 300; frame++) expect(getMatildaDashSpeed(8, 101)).toBe(16)
    expect(getMatildaDashSpeed(8, 1)).toBe(8)
    expect(getMatildaDashSpeed(20, 2)).toBeCloseTo(20.2)
  })
  it('leaves the base untouched before the first actual start', () => {
    expect(getMatildaDashSpeed(8, 0)).toBe(8)
  })
  it('counts only the Matilda aim-to-charge transition and uses that speed for movement and stall detection', () => {
    const source = readFileSync(new URL('../components/Enemy.jsx', import.meta.url), 'utf8')
    const start = source.indexOf("if (chargeState.current === 'matildaAim')")
    const end = source.indexOf("if (chargeState.current === 'chase')", start)
    const matilda = source.slice(start, end)
    expect(source).toContain('const matildaDashCountRef = useRef(0)')
    expect(source).toContain('matildaDashCountRef.current = 0')
    expect(matilda.match(/matildaDashCountRef\.current\s*\+=\s*1/g)).toHaveLength(1)
    expect(matilda.indexOf('matildaDashCountRef.current += 1')).toBeLessThan(matilda.indexOf("} else if (chargeState.current === 'charge')"))
    expect(matilda).toContain('getMatildaDashSpeed(stats.chargeSpeed, matildaDashCountRef.current)')
    expect(matilda).toContain('const expectedMove = dashSpeed * delta')
    expect(matilda).toContain('_vel.x = cd.x * dashSpeed')
    expect(matilda).toContain('_vel.z = cd.z * dashSpeed')
  })
})

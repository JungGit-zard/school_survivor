import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const weaponsDir = path.resolve(__dirname, '../components/Weapons')

function source(fileName) {
  return fs.readFileSync(path.join(weaponsDir, fileName), 'utf8')
}

function applyRadialDamageCalls(text) {
  const calls = []
  let cursor = 0
  while (cursor < text.length) {
    const start = text.indexOf('applyRadialDamage({', cursor)
    if (start === -1) break
    let depth = 0
    let end = start
    for (; end < text.length; end += 1) {
      if (text[end] === '{') depth += 1
      if (text[end] === '}') {
        depth -= 1
        if (depth === 0) {
          end += 1
          break
        }
      }
    }
    calls.push(text.slice(start, end))
    cursor = end
  }
  return calls
}

describe('explosive weapon critical-hit policy', () => {
  it.each([
    'Flask.jsx',
    'EraserBomb.jsx',
    'Missile.jsx',
    'SharkMissile.jsx',
    'CompassBlade.jsx',
    'UmbrellaGuard.jsx',
  ])('%s marks an explosive radial damage call as non-critical explosive damage', (fileName) => {
    const calls = applyRadialDamageCalls(source(fileName))
    expect(calls).toContainEqual(expect.stringMatching(/canCrit:\s*false[\s\S]*damageType:\s*'explosive'|damageType:\s*'explosive'[\s\S]*canCrit:\s*false/))
  })
})

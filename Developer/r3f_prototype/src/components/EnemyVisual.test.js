import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CHARGE_CUE_LABEL,
  CHARGE_CUE_LAYOUT,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_SPAWN_REVEAL_DELAY_MS,
  ENEMY_STATS,
  SPAWN_SMOKE_END_SCALE,
  SPAWN_SMOKE_START_SCALE,
  SPAWN_SMOKE_DURATION_MS,
  advanceEnemySpawnTimer,
  getBodyContactDistance,
  getChargeHitDistance,
  getEnemySpawnSfx,
} from './Enemy.jsx'

describe('Enemy charge warning cue', () => {
  it('only lets Matilda deal charge damage at the normal body contact distance', () => {
    const stats = { contactDist: 0.36, scale: 3 }

    expect(getChargeHitDistance(stats, true)).toBeCloseTo(getBodyContactDistance(stats))
    expect(getChargeHitDistance(stats, false)).toBeCloseTo(stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5)
  })

  it('keeps E05 and B01 charge warning readable with a non-HTML 3D toon speech bubble', () => {
    expect(ENEMY_STATS.E05.charger).toBe(true)
    expect(ENEMY_STATS.B01.charger).toBe(true)

    expect(CHARGE_CUE_LABEL).toBe('GO!')
    expect(CHARGE_CUE_LAYOUT.y).toBeGreaterThan(1.5)
    expect(CHARGE_CUE_LAYOUT.pulseScale).toBeGreaterThan(0)
    expect(CHARGE_CUE_LAYOUT.billboard).toBe(true)
    expect(Object.keys(CHARGE_CUE_LAYOUT.parts)).toEqual(expect.arrayContaining([
      'bubble',
      'tail',
      'gVertical',
      'gTop',
      'gBottom',
      'gMiddle',
      'oLeft',
      'oRight',
      'oTop',
      'oBottom',
      'bang',
      'bangDot',
    ]))

    expect(CHARGE_CUE_LAYOUT.parts.bubble.size[0]).toBeGreaterThan(0.8)
    expect(CHARGE_CUE_LAYOUT.parts.tail.rotation[2]).toBeGreaterThan(0)
    expect(CHARGE_CUE_LAYOUT.parts.bang.size[1]).toBeGreaterThan(0.2)
  })

  it('does not reintroduce the previous Html sprite cue', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain("import { Html } from '@react-three/drei'")
    expect(source).not.toContain('<Html')
    expect(source).not.toContain('GoSpeechBubble')
  })

  it('shows a camera-facing image smoke puff before the enemy is revealed', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const asset = readFileSync(new URL('../assets/effects/spawn_smoke_puff.png', import.meta.url))

    expect(source).toContain("import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.png'")
    expect(source).toContain('function SpawnSmokeEffect')
    expect(source).toContain('<sprite')
    expect(source).toContain('<SpawnSmokeEffect position={spawnPos} visualScale={cs * 0.333} />')
    expect(source).toContain('const [spawnRevealed, setSpawnRevealed] = useState(false)')
    expect(source).toContain('{spawnRevealed && (')
    expect(source).not.toContain('setTimeout(() =>')
    expect(SPAWN_SMOKE_DURATION_MS).toBeGreaterThan(ENEMY_SPAWN_REVEAL_DELAY_MS)
    expect(SPAWN_SMOKE_START_SCALE).toBeLessThan(SPAWN_SMOKE_END_SCALE)
    expect(SPAWN_SMOKE_END_SCALE).toBeLessThanOrEqual(1.2)
    expect(source).toContain('depthWrite: false')
    expect(asset.subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('pauses both smoke and reveal timing while gameplay is paused', () => {
    const afterPlaying = advanceEnemySpawnTimer(0, 0.16, 'playing')
    const afterPause = advanceEnemySpawnTimer(afterPlaying, 1, 'paused')
    const afterResume = advanceEnemySpawnTimer(afterPause, 0.16, 'playing')

    expect(afterPlaying).toBe(160)
    expect(afterPause).toBe(160)
    expect(afterResume).toBe(ENEMY_SPAWN_REVEAL_DELAY_MS)
  })

  it('uses existing spawn-like SFX ids for smoke poofs without adding a new sound asset', () => {
    expect(getEnemySpawnSfx('E01')).toMatchObject({ id: 'bossSpawn' })
    expect(getEnemySpawnSfx('B01')).toMatchObject({ id: 'bossSpawn' })
    expect(getEnemySpawnSfx('E01').volume).toBeLessThan(getEnemySpawnSfx('B01').volume)
    expect(getEnemySpawnSfx('E01', true)).toMatchObject({ id: 'matildaSpawn' })
  })
})

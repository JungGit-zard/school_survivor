import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CHARGE_CUE_LABEL,
  CHARGE_CUE_LAYOUT,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_SPAWN_REVEAL_DELAY_MS,
  ENEMY_STATS,
  MATILDA_EDGE_INSET,
  MATILDA_LAUGH_DURATION_MS,
  SPAWN_SMOKE_END_SCALE,
  SPAWN_SMOKE_START_SCALE,
  SPAWN_SMOKE_DURATION_MS,
  SPAWN_SMOKE_OPAQUE_MS,
  getSpawnSmokeOpacity,
  advanceEnemySpawnTimer,
  getBodyContactDistance,
  getChargeHitDistance,
  getEnemySpawnSfx,
  hasMatildaReachedStageEdge,
  isMatildaChargingOutward,
  resolveSightBlockedEnemyVelocity,
} from './Enemy.jsx'

describe('Enemy charge warning cue', () => {
  it('wanders deterministically without approaching while sight is blocked, then releases control when clear', () => {
    const blocked = resolveSightBlockedEnemyVelocity({ blocked: true, enemyId: 17, dirX: 3, dirZ: 4, speed: 2 })

    expect(resolveSightBlockedEnemyVelocity({ blocked: true, enemyId: 17, dirX: 3, dirZ: 4, speed: 2 })).toEqual(blocked)
    expect(blocked.x * 3 + blocked.z * 4).toBeCloseTo(0, 8)
    expect(Math.hypot(blocked.x, blocked.z)).toBeCloseTo(1.1, 8)
    expect(resolveSightBlockedEnemyVelocity({ blocked: false, enemyId: 17, dirX: 3, dirZ: 4, speed: 2 })).toBeNull()
  })

  it('restarts Matilda charge only after she reaches a stage edge and finishes laughing', () => {
    const bounds = { halfX: 10, halfZ: 14.4 }

    expect(hasMatildaReachedStageEdge({ x: 0, z: 0 }, bounds)).toBe(false)
    expect(hasMatildaReachedStageEdge({ x: bounds.halfX - MATILDA_EDGE_INSET, z: 0 }, bounds)).toBe(true)
    expect(hasMatildaReachedStageEdge({ x: 0, z: -bounds.halfZ + MATILDA_EDGE_INSET }, bounds)).toBe(true)
    expect(MATILDA_EDGE_INSET).toBeGreaterThanOrEqual(1.1)
    expect(MATILDA_LAUGH_DURATION_MS).toBeGreaterThanOrEqual(700)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain("chargeState.current = 'matildaLaugh'")
    expect(source).toContain("emitSfx({ id: 'matildaLaugh'")
    expect(source).toContain("emitSfx({ id: 'matildaDash'")
  })

  it('lets Matilda leave an edge toward the player before checking for the next charge endpoint', () => {
    const bounds = { halfX: 10, halfZ: 14.4 }
    const rightEdge = { x: bounds.halfX - MATILDA_EDGE_INSET, z: 0 }

    expect(isMatildaChargingOutward(rightEdge, { x: -1, z: 0 }, bounds)).toBe(false)
    expect(isMatildaChargingOutward(rightEdge, { x: 1, z: 0 }, bounds)).toBe(true)
  })

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

  it('shows the supplied smoke asset as an unobstructed camera-facing billboard before reveal', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const asset = readFileSync(new URL('../assets/effects/spawn_smoke_puff.png', import.meta.url))

    expect(source).toContain("import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.png'")
    expect(source).toContain('function SpawnSmokeEffect')
    expect(source).toContain('<Billboard')
    expect(source).toContain('<planeGeometry args={[1, 1]} />')
    expect(source).toContain('<SpawnSmokeEffect position={spawnPos} visualScale={cs * 0.333} />')
    expect(source).toContain('const [spawnRevealed, setSpawnRevealed] = useState(false)')
    expect(source).toContain('{spawnRevealed && (')
    expect(source).not.toContain('setTimeout(() =>')
    expect(SPAWN_SMOKE_DURATION_MS).toBeGreaterThan(ENEMY_SPAWN_REVEAL_DELAY_MS)
    expect(SPAWN_SMOKE_START_SCALE).toBeLessThan(SPAWN_SMOKE_END_SCALE)
    // 정본 스펙: 줌아웃 카메라에서 좀비보다 큼직하게 — 기존(끝 1.12) 대비 2배 이상 확대
    expect(SPAWN_SMOKE_START_SCALE).toBeGreaterThanOrEqual(1.2)
    expect(SPAWN_SMOKE_END_SCALE).toBeGreaterThanOrEqual(2.4)
    expect(source).toContain('depthTest={false}')
    expect(source).toContain('depthWrite={false}')
    expect(asset.subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('shows the puff first, holds it fully opaque for the 300ms reveal window, then fades', () => {
    // (2) 연기가 300ms 동안 완벽하게 보인 뒤 좀비 등장
    expect(ENEMY_SPAWN_REVEAL_DELAY_MS).toBe(300)
    expect(SPAWN_SMOKE_OPAQUE_MS).toBe(ENEMY_SPAWN_REVEAL_DELAY_MS)

    // 앞 300ms 동안 opacity 1.0 유지
    expect(getSpawnSmokeOpacity(0)).toBe(1)
    expect(getSpawnSmokeOpacity(150)).toBe(1)
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_OPAQUE_MS)).toBe(1)

    // 리빌 이후부터 페이드아웃 시작, 끝에서 완전 투명
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_OPAQUE_MS + 1)).toBeLessThan(1)
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_DURATION_MS)).toBe(0)
    const mid = (SPAWN_SMOKE_OPAQUE_MS + SPAWN_SMOKE_DURATION_MS) / 2
    expect(getSpawnSmokeOpacity(mid)).toBeCloseTo(0.5, 5)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    // (1) 연기 먼저 — RigidBody(좀비)는 spawnRevealed 이후에만 렌더
    expect(source.indexOf('<SpawnSmokeEffect')).toBeLessThan(source.indexOf('{spawnRevealed && ('))
    // (3) 효과 없이는 스폰 없음 — 모듈 로드 시 텍스처 프리로드
    expect(source).toContain('useLoader.preload(THREE.TextureLoader, spawnSmokeUrl)')
    expect(source).toContain('material.opacity = getSpawnSmokeOpacity(elapsed)')
  })

  it('pauses both smoke and reveal timing while gameplay is paused', () => {
    const afterPlaying = advanceEnemySpawnTimer(0, 0.16, 'playing')
    const afterPause = advanceEnemySpawnTimer(afterPlaying, 1, 'paused')
    const afterResume = advanceEnemySpawnTimer(afterPause, 0.16, 'playing')

    expect(afterPlaying).toBe(160)
    expect(afterPause).toBe(160)
    expect(afterResume).toBe(320)
  })

  it('uses a dedicated poof sound for regular zombie spawns', () => {
    expect(getEnemySpawnSfx('E01')).toMatchObject({ id: 'zombieSpawn' })
    expect(getEnemySpawnSfx('B01')).toMatchObject({ id: 'bossSpawn' })
    expect(getEnemySpawnSfx('E01').volume).toBeLessThan(getEnemySpawnSfx('B01').volume)
    expect(getEnemySpawnSfx('E01', true)).toMatchObject({ id: 'matildaSpawn' })
  })
})

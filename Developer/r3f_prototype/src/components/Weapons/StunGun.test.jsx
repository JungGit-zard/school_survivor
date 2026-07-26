import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { playerPos } from '../../lib/refs.js'

describe('StunGunWeapon pool targeting', () => {
  it('uses pool-aware targeting instead of raw enemyBodies iteration for both fire and chain', () => {
    const source = readFileSync(new URL('./StunGun.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).not.toContain('enemyBodies.get')
    expect(source).toContain('findClosestEnemy(STUN_GUN_TARGET_RANGE)')
    expect(source).toContain('pickStunGunChainTarget')
    expect(source).toContain('isEnemyHitLive(targetRb, targetGeneration)')
    expect(source).toContain('applyEnemyHit(targetRb, targetGeneration')
    // 볼트/체인은 여러 프레임에 걸쳐 타깃을 추적하므로 {rb, generation}을 보관해야 한다 —
    // enemyId로 재조회(enemyBodies.get)하면 pooled 프록시에는 통하지 않는다.
    expect(source).toContain('targetRb')
    expect(source).toContain('targetGeneration')
  })
})

describe('StunGun projectile visual pose', () => {
  it('aligns LightningBoltModel local long axis with the target delta', async () => {
    const { getStunBoltVisualPose } = await import('./StunGun.jsx')

    // LightningBoltModel is drawn along its local Y axis (Shape y=-0.48…0.48).
    // The pose must rotate that axis onto the projectile's XZ target delta, not
    // merely yaw a still-vertical bolt around Y.
    expect(getStunBoltVisualPose).toBeTypeOf('function')
    const reusablePose = getStunBoltVisualPose(0, 1)
    expect(getStunBoltVisualPose(1, 0)).toBe(reusablePose)

    for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0], [3, 4]]) {
      const pose = getStunBoltVisualPose(dx, dz)
      const visualLongAxis = new THREE.Vector3(0, 1, 0)
        .applyEuler(new THREE.Euler(pose.x, pose.y, pose.z, pose.order))
      const targetDirection = new THREE.Vector3(dx, 0, dz).normalize()

      expect(visualLongAxis.dot(targetDirection)).toBeCloseTo(1, 8)
      expect(visualLongAxis.y).toBeCloseTo(0, 8)
    }
  })

  it('applies the pure projectile pose helper instead of assigning only yaw', () => {
    const source = readFileSync(new URL('./StunGun.jsx', import.meta.url), 'utf8')

    expect(source).toContain('export function getStunBoltVisualPose(dx, dz)')
    expect(source).toContain('const pose = getStunBoltVisualPose(dx, dz)')
    expect(source).toContain('groupRef.current.rotation.set(pose.x, pose.y, pose.z, pose.order)')
    expect(source).not.toContain('groupRef.current.rotation.y = Math.atan2(dx, dz)')
  })
})

describe('StunGun chain arc live endpoints', () => {
  it('resolves player and same-generation pooled targets live, but preserves fallback coordinates for a reused slot', async () => {
    const { resolveStunArcEndpoint } = await import('./StunGun.jsx')
    expect(resolveStunArcEndpoint).toBeTypeOf('function')

    const originalPlayer = { x: playerPos.x, z: playerPos.z }
    const out = { x: 0, z: 0 }
    const target = {
      _enemyDead: false,
      _enemyHit: () => true,
      generation: 7,
      translation: () => ({ x: 6, z: -4 }),
    }

    try {
      playerPos.x = -2
      playerPos.z = 5
      expect(resolveStunArcEndpoint(out, { isPlayer: true, fallbackX: 10, fallbackZ: 11 })).toBe(out)
      expect(out).toEqual({ x: -2, z: 5 })

      playerPos.x = 3
      playerPos.z = 9
      resolveStunArcEndpoint(out, { isPlayer: true, fallbackX: 10, fallbackZ: 11 })
      expect(out).toEqual({ x: 3, z: 9 })

      resolveStunArcEndpoint(out, { rb: target, generation: 7, fallbackX: 1, fallbackZ: 2 })
      expect(out).toEqual({ x: 6, z: -4 })

      target.generation = 8 // pooled slot is despawned and reused by another enemy
      target.translation = () => ({ x: 99, z: 88 })
      resolveStunArcEndpoint(out, { rb: target, generation: 7, fallbackX: 1, fallbackZ: 2 })
      expect(out).toEqual({ x: 1, z: 2 })

      resolveStunArcEndpoint(out, undefined)
      expect(out).toEqual({ x: 0, z: 0 })
    } finally {
      playerPos.x = originalPlayer.x
      playerPos.z = originalPlayer.z
    }
  })

  it('updates both ChainArcVisual endpoints and segment transforms in its frame loop instead of relying on initial coordinates', () => {
    const source = readFileSync(new URL('./StunGun.jsx', import.meta.url), 'utf8')
    const start = source.indexOf('function ChainArcVisual')
    const end = source.indexOf('\nfunction StunBoltProjectile', start)
    const chainArcSource = source.slice(start, end)

    expect(source).toContain('export function resolveStunArcEndpoint(out, endpoint)')
    expect(chainArcSource).toContain('usePlayingFrame')
    expect(chainArcSource).toMatch(/resolveStunArcEndpoint\([^\n]+from/)
    expect(chainArcSource).toMatch(/resolveStunArcEndpoint\([^\n]+to/)
    expect(chainArcSource).toMatch(/\w+Refs\.current\[i\]\.position\.set/)
    expect(chainArcSource).toMatch(/\w+Refs\.current\[i\]\.rotation\.y/)
    expect(chainArcSource).not.toContain('}, [fromX, fromZ, toX, toZ])')
    expect(chainArcSource).toContain('const doneRef = useRef(false)')
    expect(chainArcSource).toContain('if (doneRef.current) return')
    expect(chainArcSource).toContain('doneRef.current = true')
    expect(chainArcSource).not.toContain('mats.forEach')
  })
})

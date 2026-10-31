import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PENCIL_MODEL_SCALE, PencilModel } from './Pencil.jsx'

describe('PencilModel', () => {
  it('renders the base pencil weapon model at 1.5x the previous size', () => {
    expect(PENCIL_MODEL_SCALE).toBeCloseTo(0.29 * 1.5)
  })

  it('assigns upgraded projectiles to distinct nearby enemies', () => {
    const source = readFileSync(new URL('./Pencil.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import { PENCIL_FIRE_RANGE_WORLD_UNITS } from '../../lib/gameplayUnits.js'")
    expect(source).toContain('scanClosestEnemiesInto(targetScratch, w.range ?? PENCIL_FIRE_RANGE_WORLD_UNITS, count)')
    expect(source).not.toContain('w.range ?? 22')
    expect(source).not.toContain('PENCIL_ZM_WORLD_UNITS')
    expect(source).toContain('targetIndex')
    expect(source).not.toContain('enemyBodies.forEach')
  })

  it('does not fire when the inclusive 3zm scan returns no target outside the 2.25-unit radius', () => {
    const source = readFileSync(new URL('./Pencil.jsx', import.meta.url), 'utf8')
    const scanIndex = source.indexOf('scanClosestEnemiesInto(targetScratch, w.range ?? PENCIL_FIRE_RANGE_WORLD_UNITS, count)')
    const noTargetIndex = source.indexOf('if (targetCount === 0) return', scanIndex)
    const fireIndex = source.indexOf("emitSfx({ id: 'pencilFire' })", scanIndex)

    // scanner itself keeps its existing distance <= range boundary behavior;
    // Pencil only fires after that canonical-radius scan produced a target.
    expect(scanIndex).toBeGreaterThanOrEqual(0)
    expect(noTargetIndex).toBeGreaterThan(scanIndex)
    expect(fireIndex).toBeGreaterThan(noTargetIndex)
  })

  it('uses a pure swept capsule instead of Rapier intersections', () => {
    const source = readFileSync(new URL('./Pencil.jsx', import.meta.url), 'utf8')
    expect(source).toContain('scanSweptCapsuleEnemiesInto')
    expect(source).not.toContain('other.rigidBody')
    expect(source).not.toContain('@react-three/rapier')
  })
})

describe('Pencil pierce homing release', () => {
  it('clears only the matching first target after a successful pierce hit so the pencil continues on its current velocity', async () => {
    const { releasePencilHomingTargetAfterHit } = await import('./Pencil.jsx')
    expect(releasePencilHomingTargetAfterHit).toBeTypeOf('function')

    const pooledTarget = { index: 4, generation: 12, special: null }
    expect(releasePencilHomingTargetAfterHit(pooledTarget, 8, 12, null)).toBe(false)
    expect(pooledTarget).toEqual({ index: 4, generation: 12, special: null })
    expect(releasePencilHomingTargetAfterHit(pooledTarget, 4, 13, null)).toBe(false)
    expect(pooledTarget).toEqual({ index: 4, generation: 12, special: null })

    expect(releasePencilHomingTargetAfterHit(pooledTarget, 4, 12, null)).toBe(true)
    expect(pooledTarget).toEqual({ index: -1, generation: null, special: null })

    const firstSpecial = { id: 'first-special' }
    const otherSpecial = { id: 'other-special' }
    const specialTarget = { index: -1, generation: null, special: firstSpecial }
    expect(releasePencilHomingTargetAfterHit(specialTarget, -1, null, otherSpecial)).toBe(false)
    expect(specialTarget.special).toBe(firstSpecial)
    expect(releasePencilHomingTargetAfterHit(specialTarget, -1, null, firstSpecial)).toBe(true)
    expect(specialTarget).toEqual({ index: -1, generation: null, special: null })
  })

  it('releases homing immediately after applyEnemyHit succeeds and never resolves a cleared target for steering', () => {
    const source = readFileSync(new URL('./Pencil.jsx', import.meta.url), 'utf8')
    const tryHitStart = source.indexOf('const tryHit =')
    const frameStart = source.indexOf('usePlayingFrame', tryHitStart)
    const tryHitSource = source.slice(tryHitStart, frameStart)
    const steeringStart = source.indexOf('const tgt = targetRef.current')
    const steeringEnd = source.indexOf('const p = positionRef.current', steeringStart)
    const steeringSource = source.slice(steeringStart, steeringEnd)

    expect(source).toContain('export function releasePencilHomingTargetAfterHit(target, index, generation, special)')
    expect(tryHitSource).toContain('if (!applyEnemyHit(rb, generation, damage, impact)) return false')
    expect(tryHitSource).toContain('releasePencilHomingTargetAfterHit(targetRef.current, index, generation, special)')
    expect(tryHitSource.indexOf('applyEnemyHit')).toBeLessThan(tryHitSource.indexOf('releasePencilHomingTargetAfterHit'))
    expect(steeringSource).toContain('if (tgt.index >= 0 || tgt.special)')
    expect(steeringSource).toContain('resolveWeaponTarget(tgt.index, tgt.generation, tgt.special)')
  })
})

describe('Pencil pierce sweep candidate capacity', () => {
  it('scans remaining pierce plus prior hits so a duplicate first hit cannot hide the next enemy without sorting the whole scratch', () => {
    const source = readFileSync(new URL('./Pencil.jsx', import.meta.url), 'utf8')
    const scanStart = source.indexOf('scanSweptCapsuleEnemiesInto(')
    const scanEnd = source.indexOf('\n', scanStart)
    const scanCall = source.slice(scanStart, scanEnd)

    // With pierce=2, a repeated A can be the first swept candidate. The scan must
    // still include B, while tryHit alone decides that A consumes no remaining hit.
    // The candidate budget stays small: prior hits + the remaining valid hits.
    expect(source).toContain('const sweepCandidateLimit = Math.min(sweepScratch.indices.length, hitsLeftRef.current + hitCountRef.current)')
    expect(scanCall).toContain('sweepCandidateLimit')
    expect(scanCall).not.toContain('hitsLeftRef.current')
  })
})

describe('PencilModel GPU resource sharing', () => {
  // 2026-10-31 poststay stress: every fired pencil allocated 5 geometries that were never
  // disposed (renderer.info.memory.geometries +~10/s). All pencils must share one set.
  const collectMeshResources = (node, out = { geometries: [], materials: [] }) => {
    if (!node || typeof node !== 'object') return out
    if (Array.isArray(node)) { node.forEach((child) => collectMeshResources(child, out)); return out }
    if (node.type === 'mesh') { out.geometries.push(node.props.geometry); out.materials.push(node.props.material) }
    collectMeshResources(node.props?.children, out)
    return out
  }

  afterEach(() => vi.unstubAllGlobals())

  it('reuses the same geometries and materials for every pencil instance', () => {
    // node env: toonMat's gradient texture only needs a 2D canvas stub.
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) })
    const first = collectMeshResources(PencilModel())
    const second = collectMeshResources(PencilModel())
    expect(first.geometries).toHaveLength(8)
    expect(new Set(first.geometries).size).toBe(5)
    first.geometries.forEach((geometry, i) => {
      expect(geometry?.isBufferGeometry).toBe(true)
      expect(second.geometries[i]).toBe(geometry)
    })
    first.materials.forEach((material, i) => expect(second.materials[i]).toBe(material))
  })
})

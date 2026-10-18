import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import Stage5Environment, { getStage5EnvironmentScale } from './Stage5Environment.jsx'
import Floor, { FloorVisual } from './Floor.jsx'
import ClassroomFloor from './ClassroomFloor.jsx'
import StageVendingLayer from './StageVendingLayer.jsx'
import { StageObjectLayer, StageObjectColliderLayer } from './StageObjects/index.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getStageObjectColliders } from './StageObjects/stageObjectColliders.js'

// Contract fixture only; this does not claim levelmini's config is integrated.
const contract = vi.hoisted(() => ({ registered: true, halfX: 7.5, halfZ: 19.2 }))
vi.mock('../lib/stageConfig.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getStageConfig: (id) => id === 'stage5' && contract.registered
      ? { ...actual.getStageConfig('stage3'), id: 'stage5' }
      : actual.getStageConfig(id === 'stage5' ? 'stage1' : id),
    getStageBounds: (id) => id === 'stage5'
      ? { halfX: contract.halfX, halfZ: contract.halfZ }
      : actual.getStageBounds(id),
  }
})

function children(element) {
  const value = element?.props?.children
  return (Array.isArray(value) ? value.flat(Infinity) : [value]).filter(Boolean)
}
function descendants(element) {
  return [element, ...children(element).flatMap(descendants)]
}

beforeEach(() => Object.assign(contract, { registered: true, halfX: 7.5, halfZ: 19.2 }))

describe('Stage5 scoped gym environment', () => {
  it('reuses the approved gym court, not the default classroom or Stage3 furniture', () => {
    const root = Stage5Environment()
    expect(root.props.name).toBe('stage5-environment')
    const nodes = descendants(root)
    expect(nodes.find((node) => node.type === ClassroomFloor)?.props.stageId).toBe('stage3')
    expect(nodes.some((node) => node.type === StageObjectLayer)).toBe(false)
    expect(nodes.some((node) => node.type === StageObjectColliderLayer)).toBe(false)
    expect(root.props.scale).toEqual([1, 1, 1])
  })

  it('derives visual alignment from authoritative Stage5 bounds', () => {
    contract.halfX = 6
    contract.halfZ = 15.36
    const scale = getStage5EnvironmentScale()
    expect(scale[0]).toBeCloseTo(0.8)
    expect(scale[1]).toBe(1)
    expect(scale[2]).toBeCloseTo(0.8)
  })

  it('does not mount a Stage1 fallback before gameplay registers Stage5', () => {
    contract.registered = false
    expect(getStage5EnvironmentScale()).toBeNull()
    expect(Stage5Environment()).toBeNull()
    expect(Floor({ stageId: 'stage5' })).toBeNull()
    expect(FloorVisual({ stageId: 'stage5' })).toBeNull()
  })

  it.each([0, -1, NaN, Infinity])('rejects unsafe Stage5 bounds (%s)', (value) => {
    contract.halfX = value
    expect(getStage5EnvironmentScale()).toBeNull()
  })

  it('mounts the Stage5 environment and preserves exactly one existing vending mount', () => {
    const nodes = descendants(FloorVisual({ stageId: 'stage5' }))
    expect(nodes.filter((node) => node.type === Stage5Environment)).toHaveLength(1)
    expect(nodes.filter((node) => node.type === StageVendingLayer)).toHaveLength(1)
    expect(nodes.find((node) => node.type === StageVendingLayer).props.stageId).toBe('stage5')
    expect(nodes.find((node) => node.type === StageObjectLayer).props.stageId).toBe('stage5')
    expect(nodes.some((node) => node.type === ClassroomFloor)).toBe(false)
  })

  it('preserves Stage1–4 visual mounts and stage identities', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const nodes = descendants(FloorVisual({ stageId }))
      expect(nodes.find((node) => node.type === ClassroomFloor).props.stageId).toBe(stageId)
      expect(nodes.some((node) => node.type === Stage5Environment)).toBe(false)
      expect(nodes.filter((node) => node.type === StageVendingLayer)).toHaveLength(1)
    }
  })

  it('keeps Stage5 render and collider identity aligned without importing gym blockers', () => {
    const nodes = descendants(Floor({ stageId: 'stage5' }))
    expect(nodes.find((node) => node.type === StageObjectColliderLayer).props.stageId).toBe('stage5')
    expect(getStageObjectPlacements('stage5')).toEqual([])
    expect(getStageObjectColliders('stage5')).toEqual([])
    const plane = nodes.find((node) => node.type === 'planeGeometry')
    expect(plane.props.args).toEqual([15, 38.4])
  })

  it('adds no runtime light or new Studio item in the Stage5 adapter', () => {
    const source = readFileSync(new URL('./Stage5Environment.jsx', import.meta.url), 'utf8')
    expect(source).not.toMatch(/<(?:spotLight|pointLight|directionalLight|ambientLight)\b/)
    expect(source).not.toContain('stage-floor-stage5')
  })
})

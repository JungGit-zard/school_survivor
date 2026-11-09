import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import Stage5Environment, { getStage5EnvironmentScale } from './Stage5Environment.jsx'
import Stage5StaffroomDecor from './Stage5StaffroomDecor.jsx'
import Floor, { FloorVisual } from './Floor.jsx'
import ClassroomFloor, { getFloorPlaneSize, getStage5LinoleumRepeat, getStageFloorOcclusion, STAGE5_LINOLEUM } from './ClassroomFloor.jsx'
import StageVendingLayer from './StageVendingLayer.jsx'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import { StageObjectLayer, StageObjectColliderLayer } from './StageObjects/index.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getStageObjectColliders } from './StageObjects/stageObjectColliders.js'
import { STAGE_LIGHTING_PROFILES } from '../lib/stageLightingProfile.js'

function children(element) {
  const value = element?.props?.children
  return (Array.isArray(value) ? value.flat(Infinity) : [value]).filter(Boolean)
}
function descendants(element) {
  return [element, ...children(element).flatMap(descendants)]
}

describe('Stage5 staff room environment (spec Part B §3-3)', () => {
  it('renders the stage5 linoleum floor and the staff room walls, never the reused gym court', () => {
    const root = Stage5Environment()
    expect(root.props.name).toBe('stage5-environment')
    const nodes = descendants(root)
    const tuned = nodes.find((node) => node.type === StudioTunedGroup)
    expect(tuned.props.itemId).toBe('stage-floor-stage5')
    expect(tuned.props.materialTuning).toBe(false)
    const floors = nodes.filter((node) => node.type === ClassroomFloor)
    expect(floors).toHaveLength(1)
    expect(floors[0].props.stageId).toBe('stage5')
    expect(nodes.filter((node) => node.type === Stage5StaffroomDecor)).toHaveLength(1)
    expect(nodes.some((node) => node.props?.itemId === 'stage-floor-stage3')).toBe(false)
    expect(root.props.scale).toBeUndefined()
  })

  it('keeps getStage5EnvironmentScale as a [1,1,1] compatibility shim for the Floor guard', () => {
    expect(getStage5EnvironmentScale()).toEqual([1, 1, 1])
    expect(Floor({ stageId: 'stage5' })).not.toBeNull()
    expect(FloorVisual({ stageId: 'stage5' })).not.toBeNull()
  })

  it('sizes the linoleum plane to the stage5 bounds with 1.2u square tiles', () => {
    expect(getFloorPlaneSize('stage5')).toEqual({ width: 18.72, depth: 32 })
    const repeat = getStage5LinoleumRepeat()
    const canvasWorld = STAGE5_LINOLEUM.tileWorldSize * STAGE5_LINOLEUM.tilesPerCanvas
    expect(repeat.x * canvasWorld).toBeCloseTo(18.72, 6)
    expect(repeat.z * canvasWorld).toBeCloseTo(32, 6)
    expect(STAGE5_LINOLEUM).toMatchObject({ tileWorldSize: 1.2, base: '#A7B4A0', grout: '#8F9C89', groutWidth: 0.03, speckle: '#C3CBB9' })
  })

  it('bakes contact shadows for the 20 solid staff room props into the floor lightMap', () => {
    const occlusion = getStageFloorOcclusion('stage5')
    expect(occlusion.halfX).toBe(9.36)
    expect(occlusion.halfZ).toBe(16)
    expect(occlusion.boxes).toHaveLength(20)
    expect(occlusion.circles).toEqual([])
  })

  it('mounts the stage5 environment with stage5 props, colliders and exactly one vending layer', () => {
    const nodes = descendants(FloorVisual({ stageId: 'stage5' }))
    expect(nodes.filter((node) => node.type === Stage5Environment)).toHaveLength(1)
    expect(nodes.filter((node) => node.type === StageVendingLayer)).toHaveLength(1)
    expect(nodes.find((node) => node.type === StageVendingLayer).props.stageId).toBe('stage5')
    expect(nodes.find((node) => node.type === StageObjectLayer).props.stageId).toBe('stage5')
    const floorNodes = descendants(Floor({ stageId: 'stage5' }))
    expect(floorNodes.find((node) => node.type === StageObjectColliderLayer).props.stageId).toBe('stage5')
    expect(floorNodes.find((node) => node.type === 'planeGeometry').props.args).toEqual([18.72, 32])
  })

  it('has 34 placements, 20 colliders and a 3-light baked profile', () => {
    expect(getStageObjectPlacements('stage5')).toHaveLength(34)
    expect(getStageObjectColliders('stage5')).toHaveLength(20)
    expect(STAGE_LIGHTING_PROFILES.stage5).toHaveLength(3)
    expect(STAGE_LIGHTING_PROFILES.stage5.map(({ color }) => color)).toEqual(['#FFF4E0', '#FFE9C7', '#F7F1E3'])
  })

  it('preserves Stage1–4 visual mounts and stage identities', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const nodes = descendants(FloorVisual({ stageId }))
      expect(nodes.find((node) => node.type === ClassroomFloor).props.stageId).toBe(stageId)
      expect(nodes.some((node) => node.type === Stage5Environment)).toBe(false)
      expect(nodes.filter((node) => node.type === StageVendingLayer)).toHaveLength(1)
    }
  })

  it('adds no runtime light to the Stage5 environment, its wall decor or its props', () => {
    for (const file of ['./Stage5Environment.jsx', './Stage5StaffroomDecor.jsx', './StageObjects/StaffroomProps.jsx']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source, file).not.toMatch(/<(?:spotLight|pointLight|directionalLight|ambientLight)\b/)
    }
  })
})

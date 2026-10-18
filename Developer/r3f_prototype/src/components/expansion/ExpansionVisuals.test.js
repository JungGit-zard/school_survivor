// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { EXPANSION_VISUALS, EXPANSION_STAGE_VISUALS, getExpansionVisual, isExpansionNormalCode } from '../../lib/expansionVisuals.js'
import { createExpansionRig, animateExpansionRig, collectExpansionLeaves, disposeExpansionRig } from './expansionRig.js'
import { applySavedStudioPartTunings, applyStudioTuning, captureStudioPartBaseTransforms, getStudioTransformProps } from '../StudioTunedGroup.jsx'
import { GRAPHICS_STUDIO_CATALOG } from '../../lib/graphicsStudioConfig.js'

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect() {} })
})

describe('expansion original cartoon visual contract', () => {
  it('has exactly the reserved 15 normals and five bosses, not the initially proposed IDs', () => {
    expect(Object.keys(EXPANSION_VISUALS)).toEqual(['E19','E20','E21','E22','E23','E24','E25','E26','E27','E28','E29','E30','E31','E32','E33','B05','B06','B07','B08','B09'])
    expect(isExpansionNormalCode(17)).toBe(true)
    expect(isExpansionNormalCode(31)).toBe(true)
    for (const code of [0,16,32,36,255]) expect(isExpansionNormalCode(code)).toBe(false)
    expect(getExpansionVisual('E01')).toBeNull()
  })

  it('all 20 models contain dimensional gear, a face, and individually different silhouette geometry', () => {
    const signatures = new Set()
    for (const def of Object.values(EXPANSION_VISUALS)) {
      const root = createExpansionRig(def.id)
      const leaves = collectExpansionLeaves(root)
      expect(leaves.length).toBeGreaterThan(22)
      expect(leaves.some(n => n.name.includes('gear'))).toBe(true)
      expect(leaves.some(n => n.name.includes('eye'))).toBe(true)
      expect(leaves.filter(n => !n.userData.expansionOutline).every(n => n.material.isMeshToonMaterial)).toBe(true)
      expect(leaves.every(n => n.geometry.isBufferGeometry)).toBe(true)
      signatures.add(JSON.stringify(def.rig))
      disposeExpansionRig(root)
    }
    expect(signatures.size).toBe(20)
  })

  it('uses canonical numeric child paths, additive animation and multiplicative scale for both CPU rig consumers', () => {
    for (const id of Object.keys(EXPANSION_VISUALS)) {
      const mesh = createExpansionRig(id), pool = createExpansionRig(id)
      const itemId = getExpansionVisual(id).studioItemId
      const tune = {
        [itemId]: { positionX: 0.2, rotationY: 24, scale: 1.15 },
        [`${itemId}::group::0.0+0.1`]: { rotationZ: 18, scaleY: 1.3, positionX: 0.12 },
        [`${itemId}::part::0.0.0.0`]: { positionZ: 0.18, rotationY: 30, scaleX: 1.4 },
      }
      for (const root of [mesh,pool]) {
        const t=getStudioTransformProps(tune[itemId])
        root.position.fromArray(t.position);root.rotation.fromArray(t.rotation);root.scale.fromArray(t.scale)
        captureStudioPartBaseTransforms(root)
        applyStudioTuning(root,tune[itemId])
        applySavedStudioPartTunings(root,itemId,tune)
        animateExpansionRig(root,1.25,'charge')
        root.updateMatrixWorld(true)
      }
      const a=collectExpansionLeaves(mesh),b=collectExpansionLeaves(pool)
      expect(a.length).toBe(b.length)
      a.forEach((n,i)=>expect(n.matrixWorld.elements).toEqual(b[i].matrixWorld.elements))
      const pose=a[0].matrixWorld.elements.slice()
      applySavedStudioPartTunings(mesh,itemId,tune)
      animateExpansionRig(mesh,1.25,'charge');mesh.updateMatrixWorld(true)
      expect(collectExpansionLeaves(mesh)[0].matrixWorld.elements).toEqual(pose)
      expect(mesh.children[0].children[0].userData.studioPartPositionOffset.x).toBeCloseTo(.12)
      disposeExpansionRig(mesh);disposeExpansionRig(pool)
    }
  })

  it('registers each new type and floor without replacing existing Studio items', () => {
    for (const def of Object.values(EXPANSION_VISUALS)) {
      const item=GRAPHICS_STUDIO_CATALOG.find(i=>i.id===def.studioItemId)
      expect(item?.zombieType).toBe(def.id)
      expect(item?.previewKind).toBe('zombie')
    }
    for (const stage of Object.keys(EXPANSION_STAGE_VISUALS)) {
      expect(GRAPHICS_STUDIO_CATALOG.find(i=>i.id===`stage-floor-${stage}`)?.stageId).toBe(stage)
    }
    expect(GRAPHICS_STUDIO_CATALOG.find(i=>i.id==='stage2-boss-v2')?.zombieType).toBe('B02')
    expect(GRAPHICS_STUDIO_CATALOG.filter(i=>i.id==='zombie-e01')).toHaveLength(1)
    expect(new Set(GRAPHICS_STUDIO_CATALOG.map(i=>i.id)).size).toBe(GRAPHICS_STUDIO_CATALOG.length)
  })
})

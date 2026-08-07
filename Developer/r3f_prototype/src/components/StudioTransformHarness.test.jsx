import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_CATALOG,
  normalizeStudioTuning,
} from '../lib/graphicsStudioConfig.js'
import { STAGE_PROP_TYPES } from '../lib/stagePropPlacements.js'
import {
  applySavedStudioPartTunings,
  captureStudioPartBaseTransforms,
  getStudioTransformProps,
} from './StudioTunedGroup.jsx'

const ITERATIONS_PER_ITEM = 1000
const PART_PATH = '0.0'

function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function makeTuning(random) {
  return normalizeStudioTuning({
    ...DEFAULT_STUDIO_TUNING,
    scale: 0.4 + random() * 2.1,
    scaleX: 0.4 + random() * 2.1,
    scaleY: 0.4 + random() * 2.1,
    scaleZ: 0.4 + random() * 2.1,
    positionX: -3 + random() * 6,
    positionY: -3 + random() * 6,
    positionZ: -3 + random() * 6,
    rotationX: -180 + random() * 360,
    rotationY: -180 + random() * 360,
    rotationZ: -180 + random() * 360,
  })
}

function buildPartTree() {
  const root = new THREE.Group()
  const inner = new THREE.Group()
  const part = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
  part.position.set(0.125, -0.375, 0.625)
  part.rotation.set(0.15, -0.35, 0.55)
  part.scale.set(0.75, 1.25, 1.5)
  inner.add(part)
  root.add(inner)
  captureStudioPartBaseTransforms(root)
  return { root, part }
}

function snapshot(object) {
  return {
    position: object.position.toArray(),
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order],
    scale: object.scale.toArray(),
  }
}

describe('zombie-e01 공통 변형 강제 하네스', () => {
  it('모든 등록 모델링과 프랍이 동일한 정본 transform 함수로 1,000회 왕복해도 초기 상태로 정확히 복원된다', () => {
    const defaultTransform = getStudioTransformProps(DEFAULT_STUDIO_TUNING)
    expect(defaultTransform).toEqual({
      scale: [1, 1, 1],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    })

    GRAPHICS_STUDIO_CATALOG.forEach(({ id }, itemIndex) => {
      const { root, part } = buildPartTree()
      const initial = snapshot(part)
      const key = `${id}::part::${PART_PATH}`
      const random = createRandom(0xe0100000 + itemIndex)

      for (let iteration = 0; iteration < ITERATIONS_PER_ITEM; iteration += 1) {
        applySavedStudioPartTunings(root, id, {
          [key]: makeTuning(random),
        }, { materialTuning: false })

        applySavedStudioPartTunings(root, id, iteration % 2 === 0
          ? { [key]: DEFAULT_STUDIO_TUNING }
          : {}, { materialTuning: false })

        if (JSON.stringify(snapshot(part)) !== JSON.stringify(initial)) {
          throw new Error(`${id} reset mismatch at iteration ${iteration + 1}`)
        }
      }

      expect(snapshot(part)).toEqual(initial)
    })
  }, 120_000)

  it('모든 프랍 type은 독자 변형 함수 없이 공통 Studio catalog 항목 하나에만 연결된다', () => {
    const catalogByObjectType = new Map()
    GRAPHICS_STUDIO_CATALOG
      .filter(({ category }) => category === 'stageObject')
      .forEach((item) => {
        const items = catalogByObjectType.get(item.objectType) ?? []
        items.push(item)
        catalogByObjectType.set(item.objectType, items)
      })

    STAGE_PROP_TYPES.forEach((type) => {
      expect(catalogByObjectType.get(type), `${type} Studio mapping`).toHaveLength(1)
    })
  })

  it('미리보기에는 런타임과 별개의 파츠 변형 구현이 존재하지 않는다', () => {
    const previewSource = fs.readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    expect(previewSource).not.toContain('function applyFocusedPartTuning')
    expect(previewSource).not.toContain('function resetFocusedPartTransforms')
    expect(previewSource).toContain('applySavedStudioPartTunings(rootRef.current, itemId, partTunings)')
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  CLASSROOM_CHAIR_VARIANTS,
  CLASSROOM_DESK_VARIANTS,
  ClassroomChair,
  CorridorJanitorCart,
  CorridorLockerBank,
  CorridorLostFoundBoard,
  BallCart,
  BasketballCluster,
  BasketballHoop,
  GymBanner,
  GymBench,
  GymEquipmentSpill,
  GymExitDoor,
  GymMats,
  GymScoreboard,
  TrainingCones,
  KITCHEN_CLUTTER_VARIANTS,
  KITCHEN_PREP_TABLE_VARIANTS,
  KITCHEN_TRASH_BIN_VARIANTS,
  KitchenClutter,
  KitchenCookLine,
  KitchenCrateStack,
  KitchenPrepTable,
  KitchenRefrigerator,
  KitchenShelfCart,
  KitchenSinkCounter,
  KitchenTrashBins,
  KitchenTrayRack,
  UNCONSCIOUS_STUDENT_VARIANTS,
  UnconsciousStudent,
  ClassPresidentStudent,
} from './index.js'
import { BLOCKING_STAGE_OBJECT_TYPES } from './stageObjectColliders.js'
import { STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'
import { STAGE_OBJECT_TYPES } from './StageObjectLayer.jsx'
import { STAGE_PROP_TYPES } from '../../lib/stagePropPlacements.js'
import { GRAPHICS_STUDIO_CATALOG } from '../../lib/graphicsStudioConfig.js'
import { getCachedBoxGeo, getCachedOutlineMat, getCachedToonMat } from '../../lib/toon.js'
import {
  getPropOutlineScale,
  getStagePropOutlineUserData,
  getStagePropOutlineMaterial,
  getStagePropDepthWritingToonMaterial,
  getStagePropToonMaterial,
  STAGE_PROP_MESH_RENDERING,
  STAGE_PROP_OUTLINE_RENDERING,
  STAGE_PROP_OUTLINE_RENDER_ORDER,
  STAGE_PROP_OUTLINE_USER_DATA,
  STAGE_PROP_SHARED_OUTLINE_RENDERING,
  STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING,
  STAGE_PROP_SHARED_SURFACE_RENDERING,
  STAGE_PROP_SURFACE_RENDERING,
  STAGE_PROP_SURFACE_RENDER_ORDER,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './propRendering.js'

const STAGE_OBJECT_COMPONENT_FILES = [
  'ClassroomChair.jsx',
  'ClassroomDesk.jsx',
  'UnconsciousStudent.jsx',
]

describe('stage object asset catalog', () => {
  it('exports classroom chair and unconscious student assets from the StageObjects repository', () => {
    expect(ClassroomChair).toBeTypeOf('function')
    expect(UnconsciousStudent).toBeTypeOf('function')
    expect(ClassPresidentStudent).toBeTypeOf('function')
  })

  it('defines reusable low-poly variants for the classroom chair', () => {
    expect(Object.keys(CLASSROOM_CHAIR_VARIANTS).sort()).toEqual([
      'abandoned',
      'overturned',
      'tilted',
      'upright',
    ])
    expect(CLASSROOM_CHAIR_VARIANTS.overturned.modelRotation[2]).toBeCloseTo(Math.PI)
  })

  it('does not use dark blob shadow fields on prop variants', () => {
    const variantSets = [
      CLASSROOM_CHAIR_VARIANTS,
      CLASSROOM_DESK_VARIANTS,
      UNCONSCIOUS_STUDENT_VARIANTS,
    ]

    for (const variants of variantSets) {
      for (const variant of Object.values(variants)) {
        expect(variant.shadowOpacity).toBeUndefined()
        expect(variant.shadowScale).toBeUndefined()
      }
    }
  })

  it('keeps classroom prop mesh shadows disabled and renders fills before outline hulls', () => {
    expect(STAGE_PROP_MESH_RENDERING).toMatchObject({
      castShadow: false,
      receiveShadow: false,
    })
    expect(STAGE_PROP_SURFACE_RENDER_ORDER).toBeLessThan(STAGE_PROP_OUTLINE_RENDER_ORDER)
    expect(STAGE_PROP_SURFACE_RENDERING).toMatchObject({
      castShadow: false,
      receiveShadow: false,
      renderOrder: STAGE_PROP_SURFACE_RENDER_ORDER,
    })
    expect(STAGE_PROP_OUTLINE_RENDERING).toMatchObject({
      castShadow: false,
      receiveShadow: false,
      renderOrder: STAGE_PROP_OUTLINE_RENDER_ORDER,
    })
    expect(STAGE_PROP_OUTLINE_USER_DATA).toMatchObject({
      studioRenderOutline: true,
      stagePropOutline: true,
    })
    expect(STAGE_PROP_OUTLINE_RENDERING.userData).toBeUndefined()
  })

  it('shares the unit box geometry and keeps it alive across individual prop unmounts', () => {
    expect(STAGE_PROP_UNIT_BOX_GEOMETRY).toBe(getCachedBoxGeo(1, 1, 1))
    expect(getStagePropOutlineMaterial(0.9, 0x24170f)).toBe(
      getStagePropOutlineMaterial(0.9, 0x24170f),
    )
    expect(getStagePropOutlineMaterial(0.9, 0x24170f)).toBe(
      getCachedOutlineMat(0.9, 0x24170f),
    )
    expect(STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING).toBe(STAGE_PROP_SHARED_SURFACE_RENDERING)
    expect(STAGE_PROP_SHARED_SURFACE_RENDERING).toMatchObject({
      castShadow: false,
      receiveShadow: false,
      renderOrder: STAGE_PROP_SURFACE_RENDER_ORDER,
      dispose: null,
    })
    expect(STAGE_PROP_SHARED_OUTLINE_RENDERING).toMatchObject({
      castShadow: false,
      receiveShadow: false,
      renderOrder: STAGE_PROP_OUTLINE_RENDER_ORDER,
      dispose: null,
    })
    const outlineUserDataA = getStagePropOutlineUserData()
    const outlineUserDataB = getStagePropOutlineUserData()
    expect(outlineUserDataA).toMatchObject(STAGE_PROP_OUTLINE_USER_DATA)
    expect(outlineUserDataB).toMatchObject(STAGE_PROP_OUTLINE_USER_DATA)
    expect(outlineUserDataA).not.toBe(outlineUserDataB)
    expect(Object.isExtensible(outlineUserDataA)).toBe(true)
  })

  it('keeps every stage prop toon surface visible from both sides while outlines stay inverted hulls', () => {
    const originalDocument = globalThis.document
    globalThis.document = {
      createElement: () => ({
        getContext: () => ({ fillStyle: '', fillRect: () => {} }),
      }),
    }

    let surfaceMaterial
    try {
      surfaceMaterial = getStagePropToonMaterial(0x7394a0, 0.06)
    } finally {
      if (originalDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
      else globalThis.document = originalDocument
    }
    const outlineMaterial = getStagePropOutlineMaterial(0.9, 0x24170f)
    const defaultSurfaceMaterial = getCachedToonMat(0x7394a0, 0.06)

    expect(surfaceMaterial.side).toBe(THREE.DoubleSide)
    expect(defaultSurfaceMaterial.side).toBe(THREE.FrontSide)
    expect(surfaceMaterial).not.toBe(defaultSurfaceMaterial)
    expect(outlineMaterial.side).toBe(THREE.BackSide)

    for (const file of ['CorridorProps.jsx', 'GymProps.jsx']) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')

      expect(source).toContain(
        file === 'CorridorProps.jsx'
          ? 'getStagePropDepthWritingToonMaterial('
          : 'getStagePropToonMaterial(',
      )
      expect(source).not.toContain('toonMat(')
    }
  })

  it('does not reintroduce direct shadow props in classroom prop components', () => {
    for (const file of STAGE_OBJECT_COMPONENT_FILES) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')

      expect(source).not.toContain('castShadow')
      expect(source).not.toContain('receiveShadow')
    }
  })

  it('uses shared geometry and cached materials without changing the StudioTunedGroup roots', () => {
    const studioItemIds = {
      'ClassroomChair.jsx': 'stage-object-chair',
      'ClassroomDesk.jsx': 'stage-object-desk',
      'UnconsciousStudent.jsx': 'stage-object-unconscious-student',
    }

    for (const file of STAGE_OBJECT_COMPONENT_FILES) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')

      expect(source).not.toContain('<boxGeometry')
      expect(source).not.toContain('useMemo')
      expect(source).not.toContain('toonMat(')
      expect(source).not.toContain('outlineMat(')
      expect(source).toContain('geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}')
      expect(source).toContain('getStagePropToonMaterial(')
      expect(source).toContain('getStagePropOutlineMaterial(')
      expect(source).toContain('STAGE_PROP_SHARED_SURFACE_RENDERING')
      expect(source).toContain('STAGE_PROP_SHARED_OUTLINE_RENDERING')
      expect(source).toContain(`<StudioTunedGroup itemId="${studioItemIds[file]}">`)
    }
  })

  it('uses shared rendering only for kitchen meshes with shared geometry', () => {
    const source = readFileSync(new URL('./KitchenProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('STAGE_PROP_SHARED_SURFACE_RENDERING')
    expect(source).toContain('STAGE_PROP_SHARED_OUTLINE_RENDERING')
    expect(source).toContain('STAGE_PROP_SURFACE_RENDERING')
    expect(source).toContain('STAGE_PROP_OUTLINE_RENDERING')
    expect(source.match(/userData=\{getStagePropOutlineUserData\(\)\}/g)).toHaveLength(2)
    expect(source).not.toContain('STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING')
    expect(source).toMatch(/function PropBox[\s\S]*?\{\.\.\.STAGE_PROP_SHARED_SURFACE_RENDERING\}[\s\S]*?\{\.\.\.STAGE_PROP_SHARED_OUTLINE_RENDERING\}/)
    expect(source).toMatch(/function OutlinedCylinder[\s\S]*?\{\.\.\.STAGE_PROP_SURFACE_RENDERING\}[\s\S]*?\{\.\.\.STAGE_PROP_OUTLINE_RENDERING\} userData=\{getStagePropOutlineUserData\(\)\}/)
  })

  it('uses the shared student body under its own fixed-color Studio root for the class president', () => {
    const source = readFileSync(new URL('./ClassPresidentStudent.jsx', import.meta.url), 'utf8')

    expect(source).toContain('UnconsciousStudentVisual')
    expect(source).toContain('CLASS_PRESIDENT_UNIFORM_COLOR = 0xc23535')
    expect(source).toContain('<StudioTunedGroup itemId="stage-object-class-president-student">')
    expect(source).not.toContain('uniformColor =')
  })

  it('keeps classroom prop outline scales positive for thin boards and legs', () => {
    const thinPropScales = [
      [1.76, 0.12, 1.04],
      [1.56, 0.03, 0.86],
      [0.08, 0.72, 0.08],
      [1.02, 0.11, 0.9],
      [0.84, 0.025, 0.74],
      [0.08, 0.56, 0.08],
    ]

    for (const scale of thinPropScales) {
      const outlineScale = getPropOutlineScale(scale)

      expect(outlineScale.every((value) => value > 0)).toBe(true)
      expect(outlineScale.every((value, index) => value - scale[index] <= 0.0450001)).toBe(true)
    }
  })

  it('defines reusable low-poly lying variants for unconscious students', () => {
    expect(Object.keys(UNCONSCIOUS_STUDENT_VARIANTS).sort()).toEqual([
      'faceUp',
      'faceUpFlipped',
      'sideLeft',
      'sideLeftFlipped',
      'sideRight',
      'sideRightFlipped',
    ])
    expect(UNCONSCIOUS_STUDENT_VARIANTS.faceUp.modelRotation[0]).toBeCloseTo(Math.PI / 2)
    expect(UNCONSCIOUS_STUDENT_VARIANTS.faceUpFlipped.modelRotation[0]).toBeCloseTo(-Math.PI / 2)
  })

  it('exports the three Stage 2 corridor prop models and the matching concept sheet', () => {
    expect(CorridorLockerBank).toBeTypeOf('function')
    expect(CorridorJanitorCart).toBeTypeOf('function')
    expect(CorridorLostFoundBoard).toBeTypeOf('function')
    expect(readFileSync(new URL('../../assets/concept/stage2_corridor_props_concept.png', import.meta.url)).subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('keeps Stage 2 corridor props to Roblox-style block primitives and six-sided cylinders', () => {
    const source = readFileSync(new URL('./CorridorProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<boxGeometry')
    expect(source).toContain('<cylinderGeometry')
    expect(source).not.toContain('dodecahedronGeometry')
    expect(source).not.toContain('material={outline}')
    expect(source).not.toContain(', 8]')
    expect(source).not.toContain(', 10]')
  })

  it('keeps every multi-part Stage 2 corridor prop in the normal opaque depth pass', () => {
    const source = readFileSync(new URL('./CorridorProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('getStagePropDepthWritingToonMaterial')
    expect(source).toContain('STAGE_PROP_MESH_RENDERING')
    expect(source).not.toContain('STAGE_PROP_SURFACE_RENDERING')

    const corridorMaterial = getStagePropDepthWritingToonMaterial(0x7394a0, 0.06)
    const nonOccludingPropMaterial = getStagePropToonMaterial(0x7394a0, 0.06)

    expect(corridorMaterial.depthWrite).toBe(true)
    expect(corridorMaterial).not.toBe(nonOccludingPropMaterial)
    expect(nonOccludingPropMaterial.depthWrite).toBe(false)
  })

  it('exports Stage 3 voxel gym prop models and the matching concept sheet', () => {
    const gymProps = [
      BasketballHoop,
      BallCart,
      BasketballCluster,
      GymBench,
      TrainingCones,
      GymMats,
      GymScoreboard,
      GymBanner,
      GymExitDoor,
      GymEquipmentSpill,
    ]

    for (const Component of gymProps) {
      expect(Component).toBeTypeOf('function')
    }

    expect(readFileSync(new URL('../../assets/concept/stage3_basketball_court_voxel_lowpoly_props.png', import.meta.url)).subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('keeps Stage 3 gym props mostly voxel/block modeled with explicitly low-poly balls', () => {
    const source = readFileSync(new URL('./GymProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<boxGeometry')
    expect(source).toContain('<cylinderGeometry')
    expect(source).toContain('<icosahedronGeometry')
    expect(source).not.toContain('sphereGeometry')
    expect(source).not.toContain('torusGeometry')
  })

  it('exports the nine Stage 4 kitchen prop models', () => {
    const kitchenProps = [
      KitchenPrepTable,
      KitchenCookLine,
      KitchenSinkCounter,
      KitchenRefrigerator,
      KitchenTrayRack,
      KitchenShelfCart,
      KitchenTrashBins,
      KitchenCrateStack,
      KitchenClutter,
    ]

    for (const Component of kitchenProps) {
      expect(Component).toBeTypeOf('function')
    }
  })

  it('declares the Stage 4 kitchen prop variant key sets', () => {
    expect([...KITCHEN_PREP_TABLE_VARIANTS].sort()).toEqual(['bare', 'cutting', 'pans', 'side'])
    expect([...KITCHEN_TRASH_BIN_VARIANTS].sort()).toEqual(['round', 'wheelie'])
    expect([...KITCHEN_CLUTTER_VARIANTS].sort()).toEqual(['bags', 'pots', 'trays'])
  })

  it('registers every Stage 4 kitchen prop in the placeable type catalog', () => {
    const kitchenTypes = [
      'kitchenPrepTable',
      'kitchenCookLine',
      'kitchenSinkCounter',
      'kitchenRefrigerator',
      'kitchenTrayRack',
      'kitchenShelfCart',
      'kitchenTrashBins',
      'kitchenCrateStack',
      'kitchenClutter',
    ]

    for (const type of kitchenTypes) {
      expect(STAGE_OBJECT_TYPES).toContain(type)
      expect(STAGE_PROP_TYPES).toContain(type)
    }
  })

  it('keeps Stage 4 kitchen props to low-poly block, six-sided cylinder and faceted blob primitives', () => {
    const source = readFileSync(new URL('./KitchenProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<boxGeometry')
    expect(source).toContain('<cylinderGeometry')
    expect(source).toContain('<icosahedronGeometry')
    expect(source).not.toContain('sphereGeometry')
    expect(source).not.toContain('torusGeometry')
    expect(source).not.toContain('castShadow')
    expect(source).not.toContain('receiveShadow')
    expect(source).not.toContain('material={outline}')
  })

  it('keeps all 35 Stage 4 kitchen surfaces in the opaque depth-writing pass while preserving transparent outlines', () => {
    const source = readFileSync(new URL('./KitchenProps.jsx', import.meta.url), 'utf8')
    const renderingSource = readFileSync(new URL('./propRendering.js', import.meta.url), 'utf8')
    const stage4Placements = STAGE_OBJECT_PLACEMENTS.stage4
    const kitchenPlacements = stage4Placements.filter(({ type }) => type.startsWith('kitchen'))

    expect(stage4Placements).toHaveLength(37)
    expect(kitchenPlacements).toHaveLength(35)
    expect(source).toContain('getStagePropDepthWritingToonMaterial(')
    expect(source).not.toContain('getStagePropToonMaterial(')
    expect(renderingSource).toContain('getCachedToonMat(color, emissiveIntensity, STAGE_PROP_SURFACE_SIDE, true)')
    expect(renderingSource).toContain('material.depthWrite = false')
    expect(source).toContain('STAGE_PROP_OUTLINE_RENDERING')
  })

  // 2026-07-25 사용자 결정: 중앙 조리대를 원화 위치로 되돌리고 콜라이더를 붙인다.
  // 대형 가구 8종은 solid, 바닥 잡동사니(kitchenClutter)만 통과 가능하다.
  it('registers the eight solid Stage 4 kitchen furniture types as blockers', () => {
    const solidKitchenTypes = [
      'kitchenPrepTable',
      'kitchenCookLine',
      'kitchenSinkCounter',
      'kitchenRefrigerator',
      'kitchenTrayRack',
      'kitchenShelfCart',
      'kitchenTrashBins',
      'kitchenCrateStack',
    ]
    const kitchenTypes = STAGE_OBJECT_TYPES.filter((type) => type.startsWith('kitchen'))

    expect(kitchenTypes).toHaveLength(9)
    for (const type of solidKitchenTypes) {
      expect(BLOCKING_STAGE_OBJECT_TYPES.has(type), type).toBe(true)
    }
  })

  it('keeps kitchenClutter out of the blocking type set so it never cuts E04 ranged sight lines', () => {
    // getStageObjectSightObstacles()는 blocking 플래그를 무시하고 타입 멤버십만 본다.
    // 바닥에 깔린 냄비·봉지가 여기 들어가면 스4 시그니처(18초 원거리 조기 발사)가 망가진다.
    expect(BLOCKING_STAGE_OBJECT_TYPES.has('kitchenClutter')).toBe(false)
  })

  // 2026-07-26: Graphics Studio에 kitchen 10종이 뜨지 않던 버그(등록 누락)의 회귀 테스트.
  // 세 지점 — graphicsStudioConfig의 카탈로그 항목, GraphicsStudioPreview의 objectType 분기,
  // KitchenProps.jsx의 StudioTunedGroup itemId — 가 전부 같은 문자열로 일치해야 스튜디오에서
  // 목록에 뜨고 튜닝값이 실제 게임 프랍에 적용된다. 하나라도 어긋나면 이 테스트가 잡는다.
  it('wires every Stage 4 kitchen prop to Graphics Studio: catalog id, preview branch, and StudioTunedGroup itemId all match', () => {
    const kitchenPropsSource = readFileSync(new URL('./KitchenProps.jsx', import.meta.url), 'utf8')
    const previewSource = readFileSync(new URL('../GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    const kitchenItemIdToObjectType = {
      'stage-object-kitchen-prep-table': 'kitchenPrepTable',
      'stage-object-kitchen-cook-line': 'kitchenCookLine',
      'stage-object-kitchen-sink-counter': 'kitchenSinkCounter',
      'stage-object-kitchen-refrigerator': 'kitchenRefrigerator',
      'stage-object-kitchen-tray-rack': 'kitchenTrayRack',
      'stage-object-kitchen-shelf-cart': 'kitchenShelfCart',
      'stage-object-kitchen-trash-bins': 'kitchenTrashBins',
      'stage-object-kitchen-crate-stack': 'kitchenCrateStack',
      'stage-object-kitchen-clutter': 'kitchenClutter',
    }

    const kitchenCatalogItems = GRAPHICS_STUDIO_CATALOG.filter((item) => item.id.startsWith('stage-object-kitchen-'))
    expect(kitchenCatalogItems).toHaveLength(9)

    for (const [itemId, objectType] of Object.entries(kitchenItemIdToObjectType)) {
      // (a) graphicsStudioConfig.js에 category: 'stageObject'로 등록되어 있고 objectType이 일치한다.
      const catalogItem = GRAPHICS_STUDIO_CATALOG.find((item) => item.id === itemId)
      expect(catalogItem, `missing Graphics Studio catalog entry for ${itemId}`).toBeDefined()
      expect(catalogItem.category).toBe('stageObject')
      expect(catalogItem.previewKind).toBe('stageObject')
      expect(catalogItem.objectType).toBe(objectType)

      // (b) GraphicsStudioPreview.jsx에 이 objectType을 렌더하는 분기가 있다.
      expect(
        previewSource,
        `GraphicsStudioPreview.jsx is missing a render branch for objectType '${objectType}'`,
      ).toContain(`item.objectType === '${objectType}'`)

      // (c) KitchenProps.jsx의 StudioTunedGroup itemId가 카탈로그 id와 문자열 그대로 일치한다.
      expect(
        kitchenPropsSource,
        `KitchenProps.jsx is missing <StudioTunedGroup itemId="${itemId}"> for ${objectType}`,
      ).toContain(`<StudioTunedGroup itemId="${itemId}">`)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { getStudioPartKey } from './GraphicsStudioPreview.jsx'

describe('GraphicsStudioPreview render contracts', () => {
  it('renders standard zombie catalog items with a direct mesh preview', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('forceMesh')
    expect(source).toContain("previewKind === 'zombie'")
  })

  it('lets the Matilda studio preview show the movement pose from Motion', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain("previewKind === 'matilda'")
    expect(source).toContain("movementPose={item.animation === 'charge'}")
  })

  it('renders the three Stage 2 corridor prop models from their shared runtime component', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('CorridorLockerBank')
    expect(source).toContain('CorridorJanitorCart')
    expect(source).toContain('CorridorLostFoundBoard')
  })

  it('previews the runtime zombie spawn billboard in the VFX studio', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('SpawnSmokeEffect')
    expect(source).toContain("type === 'spawnSmoke'")
    expect(source).toContain('frozen')
  })

  it('can preview separated Starlink crash phases and fixed zombie death styles', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain("previewKind === 'starlinkCrash'")
    expect(source).toContain("item.crashPhase === 'impact'")
    expect(source).toContain('item.deathStyle ?? ENEMY_DEATH_COLLAPSE_STYLES[index]')
  })

  it('maps the named player flashlight animation to the runtime arm action', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('PLAYER_STUDIO_ARM_ACTIONS')
    expect(source).toContain("lanternFlashlight: 'lanternFlashlight'")
  })

  it('uses the shared studio transform for per-axis scale and default rotation preview', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('getStudioTransformProps(tuning)')
    expect(source).toContain('scale={transform.scale}')
    expect(source).toContain('position={transform.position}')
    expect(source).toContain('rotation={transform.rotation}')
    expect(source).toContain('StudioTuningPreviewProvider')
  })

  it('uses middle mouse drag for viewport panning in Graphics Studio', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('enablePan')
    expect(source).toContain('screenSpacePanning')
    expect(source).toContain('function StudioOrbitControls')
    expect(source).toContain('MIDDLE: THREE.MOUSE.PAN')
  })

  it('supports double-click part focusing with a separate part tuning', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('export function getStudioPartKey')
    expect(source).toContain('export function findStudioPart')
    expect(source).toContain('studioPartId')
    expect(source).toContain('getStableStudioPartObject')
    expect(source).toContain('object.userData?.studioNonFocusable')
    expect(source).toContain('label: getStudioPartLabel(part ?? event.object)')
    expect(source).toContain("STABLE_PART_KEY_PREFIX = 'id:'")
    expect(source).toContain('onDoubleClick={handlePartDoubleClick}')
    expect(source).toContain('focusedPartTuning')
    expect(source).toContain('applyFocusedPartTuning')
  })

  it('does not focus runtime or studio-generated outline objects', () => {
    const root = new THREE.Group()
    const regular = new THREE.Mesh()
    const renderOutline = new THREE.Mesh()
    const partGroupOutline = new THREE.LineSegments()
    const nonFocusable = new THREE.Mesh()
    renderOutline.userData.studioRenderOutline = true
    partGroupOutline.userData.studioPartGroupOutline = true
    nonFocusable.userData.studioNonFocusable = true
    root.add(regular, renderOutline, partGroupOutline, nonFocusable)

    expect(getStudioPartKey(root, regular)).toBe('0')
    expect(getStudioPartKey(root, renderOutline)).toBeNull()
    expect(getStudioPartKey(root, partGroupOutline)).toBeNull()
    expect(getStudioPartKey(root, nonFocusable)).toBeNull()
  })

  it('supports single and grouped part focus with neon outlines', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('focusedPartKeys')
    expect(source).toContain('shiftKey')
    expect(source).toContain('syncPartGroupOutlines')
    expect(source).toContain('PART_GROUP_OUTLINE_COLOR')
    expect(source).toContain('focusedPartKeys.length ? focusedPartKeys : []')
    expect(source).toContain('new THREE.EdgesGeometry(mesh.geometry)')
    expect(source).toContain('new THREE.LineSegments')
  })

  it('attaches group part focus outlines to each child mesh contour instead of a bounding box', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    // BoxHelper를 transform된 root에 붙이면 root 변환이 이중 적용되어 아웃라인이 어긋난다
    expect(source).not.toContain('THREE.BoxHelper')
    // 파트 로컬 AABB 계산은 데칼과 공유하는 TextureDecal.jsx 정본을 사용한다
    expect(source).not.toContain('computePartLocalBox')
    expect(source).not.toContain('new THREE.BoxGeometry')
    expect(source).toContain('function collectFocusableMeshes')
    expect(source).toContain('part.traverse((object) =>')
    expect(source).toContain('if (!object.isMesh || !object.geometry) return')
    expect(source).toContain('object.userData.studioRenderOutline')
    expect(source).toContain('object.userData.studioNonFocusable || object.userData.studioNonTunable')
    expect(source).toContain('createMeshFocusOutline(mesh)')
    expect(source).toContain('mesh.add(outline)')
    expect(source).toContain('outline.raycast = () => {}')

    expect(source).not.toContain('root.add(outline)')
    expect(source).toContain('outline.userData.studioPartGroupOutline = true')
  })

  it('freezes zombie animation while a part is focused so editing works on the rest pose', () => {
    const previewSource = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const zombieSource = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

    expect(previewSource).toContain('frozen={focusedPartKeys.length > 0}')
    expect(previewSource).toContain('forceMesh frozen={frozen}')
    expect(enemySource).toContain('forceMesh = false, frozen = false')
    expect(enemySource).toContain('frozen={frozen}')
    // 인게임 기본값은 false — 게임 내 애니메이션 불변
    expect(zombieSource).toContain('frozen = false')
  })

  it('disposes outline-only geometry and materials when clearing part focus outlines', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    const clearFnMatch = source.match(/function clearPartGroupOutlines[\s\S]*?\n\}/)
    expect(clearFnMatch).not.toBeNull()
    const clearFn = clearFnMatch[0]
    expect(clearFn).toContain('outline.geometry?.dispose()')
    expect(clearFn).toContain('materials.forEach((material) => material.dispose())')
  })

  it('keeps saved part and group edits visible when focusing another part', () => {
    const studioSource = readFileSync(new URL('./GraphicsStudio.jsx', import.meta.url), 'utf8')
    const previewSource = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(studioSource).toContain('partTunings={livePreviewTunings}')
    expect(previewSource).toContain('applySavedStudioPartTunings(rootRef.current, itemId, partTunings')
  })

  it('keeps catalog-only studio items wired to runtime tuning groups', () => {
    const sourceByFile = {
      './Floor.jsx': readFileSync(new URL('./Floor.jsx', import.meta.url), 'utf8'),
      './MiniHealthBar.jsx': readFileSync(new URL('./MiniHealthBar.jsx', import.meta.url), 'utf8'),
      './EnemyProjectileVisual.jsx': readFileSync(new URL('./EnemyProjectileVisual.jsx', import.meta.url), 'utf8'),
      './VFXLayer.jsx': readFileSync(new URL('./VFXLayer.jsx', import.meta.url), 'utf8'),
      './EnemyDeathCollapse.jsx': readFileSync(new URL('./EnemyDeathCollapse.jsx', import.meta.url), 'utf8'),
      './TitleScene3D.jsx': readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8'),
    }

    expect(sourceByFile['./Floor.jsx']).toContain('stage-floor-${stageId}')
    expect(sourceByFile['./Floor.jsx']).toContain('materialTuning={false}')
    expect(sourceByFile['./MiniHealthBar.jsx']).toContain('ui-mini-health-bar')
    expect(sourceByFile['./EnemyProjectileVisual.jsx']).toContain('enemy-projectile-e04')
    expect(sourceByFile['./VFXLayer.jsx']).toContain('vfx-hit-spark')
    expect(sourceByFile['./VFXLayer.jsx']).toContain('vfx-charge-warning')
    expect(sourceByFile['./VFXLayer.jsx']).toContain('vfx-pickup-pop')
    expect(sourceByFile['./EnemyDeathCollapse.jsx']).toContain('enemy-death-collapse')
    expect(sourceByFile['./EnemyDeathCollapse.jsx']).toContain("enemy-death-${String(index + 1).padStart(2, '0')}")
    expect(sourceByFile['./TitleScene3D.jsx']).toContain('title-scene')
  })
})

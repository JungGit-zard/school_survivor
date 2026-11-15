// 감염 안 된 사람 구경꾼 레이어 — Kenney "Mini Characters 2.0"(CC0) 원래 색. 2026-11-15, threemini.
//
// MiniZombieLayer와 같은 GLB·같은 파트 지오메트리(lib/miniZombieGeometry.js)·같은 툰 재질 값이다. 다른 점:
//  - 칸 옮기기 없음(원래 색) 또는 피부만 팩 피부 칸으로(lib/miniHumanRoster.js).
//  - 배치는 고정 목록(placements prop)뿐이다. enemyPool·Rapier·콜라이더를 읽지도 만들지도 않는다 → 투사체·좀비·스폰과 무관.
//  - placements가 비어 있으면 null(GLB 대기·메시·드로콜 0). 지금 타이틀·스테이지 목록은 전부 비어 있다(구조만).
// 모습(look+피부) 1개 = 파트 6개 × [툰 몸통, 스텐실 뒷면 외곽선] InstancedMesh = 드로콜 12. 장면 상한 4모습 = 48.
// 포즈는 절차적 idle/cower(lib/miniHumanPose.js), 시각 = 프레임 시계, 개체 위상 = 배치 순번(Math.random 없음).
import { Suspense, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import ErrorBoundary from './ErrorBoundary.jsx'
import miniCharactersUrl from '../assets/models/kenney_mini/mini_zombies_kenney.glb?url'
import { getToonGradient } from '../lib/toon.js'
import { createOutlineGeometry } from '../lib/projectileZombieShotGeometry.js'
import { getMiniZombieAssets } from '../lib/miniZombieGeometry.js'
import { miniHumanLookKey, miniHumanVariant } from '../lib/miniHumanRoster.js'
import { composeMiniHumanParts, createMiniHumanPose, fillMiniHumanPose, miniHumanSeed } from '../lib/miniHumanPose.js'

// 게임 캔버스의 좀비 외곽선과 같은 스텐실 값(1). 타이틀은 캐릭터 외곽선 값(TITLE_CHARACTER_STENCIL_REF)을 넘긴다.
const DEFAULT_STENCIL_REF = 1

function makeBodyMaterial(atlas, stencilRef) {
  const material = new THREE.MeshToonMaterial({ color: 0xffffff, map: atlas, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.16, gradientMap: getToonGradient() })
  material.name = 'mini-human-toon'
  material.stencilWrite = true; material.stencilRef = stencilRef; material.stencilFunc = THREE.AlwaysStencilFunc; material.stencilZPass = THREE.ReplaceStencilOp
  return material
}

function makeOutlineMaterial(stencilRef) {
  const material = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96, depthWrite: false })
  material.name = 'mini-human-outline'
  material.stencilWrite = true; material.stencilRef = stencilRef; material.stencilFunc = THREE.NotEqualStencilFunc
  return material
}

function instanced(geometry, material, capacity) {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity)
  mesh.frustumCulled = false
  mesh.count = capacity
  return mesh
}

// 배치 목록 → 모습별 세트(같은 모습의 사람들은 한 세트의 인스턴스).
export function groupMiniHumanPlacements(placements) {
  const groups = new Map()
  placements.forEach((placement, index) => {
    const key = miniHumanLookKey(placement)
    if (!groups.has(key)) groups.set(key, { key, variant: miniHumanVariant(placement), members: [] })
    groups.get(key).members.push({ placement, index })
  })
  return [...groups.values()]
}

function MiniHumanLayerInner({ placements, stencilRef = DEFAULT_STENCIL_REF }) {
  const gltf = useGLTF(miniCharactersUrl, false, true)
  const state = useMemo(() => {
    const assets = getMiniZombieAssets(gltf?.scene, createOutlineGeometry)
    const root = new THREE.Group(); root.name = 'mini-human-layer'
    if (!assets) return { root, sets: [], materials: null }
    const atlas = assets.map
    if (atlas) {
      atlas.colorSpace = THREE.SRGBColorSpace; atlas.flipY = false
      atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false
      atlas.needsUpdate = true
    }
    const materials = { body: makeBodyMaterial(atlas, stencilRef), outline: makeOutlineMaterial(stencilRef) }
    const sets = groupMiniHumanPlacements(placements).map((group) => {
      const built = assets.variant(group.key, 0, group.variant)
      const capacity = group.members.length
      const entries = built.parts.map((part) => {
        const body = instanced(part.geometry, materials.body, capacity); body.renderOrder = 2
        const outline = instanced(part.outlineGeometry, materials.outline, capacity); outline.renderOrder = 1
        body.name = `mini-human-${group.key}-${part.key}`
        root.add(body, outline)
        return { body, outline }
      })
      return { ...group, built, entries, matrices: [] }
    })
    return { root, sets, materials }
  }, [gltf, placements, stencilRef])

  useEffect(() => () => {
    for (const set of state.sets) for (const e of set.entries) { e.body.dispose(); e.outline.dispose() }
    state.materials?.body.dispose(); state.materials?.outline.dispose()
  }, [state])

  const pose = useMemo(createMiniHumanPose, [])
  useFrame((frame) => {
    const time = frame?.clock?.elapsedTime ?? 0
    for (const set of state.sets) {
      set.members.forEach(({ placement, index }, slot) => {
        fillMiniHumanPose(pose, placement.pose ?? 'idle', time, miniHumanSeed(index))
        composeMiniHumanParts(set.built, placement, pose, set.matrices)
        set.entries.forEach((entry, k) => { entry.body.setMatrixAt(slot, set.matrices[k]); entry.outline.setMatrixAt(slot, set.matrices[k]) })
      })
      for (const entry of set.entries) { entry.body.instanceMatrix.needsUpdate = true; entry.outline.instanceMatrix.needsUpdate = true }
    }
  })

  return <primitive object={state.root} />
}

/**
 * @param placements  lib/miniHumanRoster.js 배치 목록(getMiniHumanPlacements(장면 열쇠)). 비어 있으면 아무것도 안 그린다.
 * @param stencilRef  외곽선 스텐실 값(게임 1, 타이틀 TITLE_CHARACTER_STENCIL_REF).
 */
export default function MiniHumanLayer({ placements, stencilRef }) {
  if (!placements || placements.length === 0) return null
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <MiniHumanLayerInner placements={placements} stencilRef={stencilRef} />
      </Suspense>
    </ErrorBoundary>
  )
}

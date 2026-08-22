import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { invalidate } from '@react-three/fiber'
import * as THREE from 'three'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_TUNING_EVENT,
  TEXTURE_DECALS_EVENT,
  loadStudioTunings,
  loadTextureDecals,
  normalizeStudioTuning,
} from '../lib/graphicsStudioConfig.js'
import { disposeTextureDecals, syncTextureDecals } from './TextureDecal.jsx'

const StudioPreviewContext = createContext(false)
const StudioSnapshotContext = createContext(null)
const STABLE_PART_KEY_PREFIX = 'id:'

export function StudioTuningPreviewProvider({ children }) {
  return (
    <StudioPreviewContext.Provider value>
      {children}
    </StudioPreviewContext.Provider>
  )
}

export function StudioTuningRuntimeProvider({ children }) {
  return (
    <StudioPreviewContext.Provider value={false}>
      {children}
    </StudioPreviewContext.Provider>
  )
}

export function StudioTuningSnapshotProvider({ datasets, children }) {
  const snapshot = useMemo(() => ({
    tunings: datasets?.tunings ?? {},
    decals: datasets?.decals ?? {},
  }), [datasets])
  return (
    <StudioSnapshotContext.Provider value={snapshot}>
      {children}
    </StudioSnapshotContext.Provider>
  )
}

export function getStudioTransformProps(tuning = DEFAULT_STUDIO_TUNING) {
  const t = normalizeStudioTuning(tuning)
  return {
    scale: [t.scale * t.scaleX, t.scale * t.scaleY, t.scale * t.scaleZ],
    position: [t.positionX, t.positionY, t.positionZ],
    rotation: [
      THREE.MathUtils.degToRad(t.rotationX),
      THREE.MathUtils.degToRad(t.rotationY),
      THREE.MathUtils.degToRad(t.rotationZ),
    ],
  }
}

function isOutlineMaterial(material) {
  return material?.side === THREE.BackSide
    && material?.stencilFunc === THREE.NotEqualStencilFunc
}

function disposeOwnedStudioMaterial(material, owner) {
  if (material?.userData?.studioMaterialOwner !== owner) return
  if (material.userData.studioMaterialDisposed) return
  material.dispose()
}

function getStudioObjectMaterials(object) {
  return Array.isArray(object.material)
    ? object.material
    : object.material
      ? [object.material]
      : []
}

function releaseReplacedStudioMaterials(object, currentMaterials) {
  const retained = new Set(currentMaterials)
  const owned = object.userData.studioOwnedMaterials ?? []
  owned.forEach((material) => {
    if (!retained.has(material)) disposeOwnedStudioMaterial(material, object.uuid)
  })
  object.userData.studioOwnedMaterials = currentMaterials.filter(
    (material) => material.userData?.studioMaterialOwner === object.uuid,
  )
}

function isolateStudioObjectMaterials(object, currentMaterials) {
  if (!currentMaterials.length) {
    object.userData.studioOwnedMaterials = []
    return currentMaterials
  }

  let changed = false
  const materials = currentMaterials.map((material) => {
    if (material.userData?.studioMaterialOwner === object.uuid) return material
    const isolated = material.clone()
    const dispose = isolated.dispose.bind(isolated)
    const sourceBaseColor = material.userData?.studioBaseColor
    isolated.userData = {
      ...isolated.userData,
      studioMaterialOwner: object.uuid,
      studioMaterialDisposed: false,
    }
    if (sourceBaseColor?.isColor) {
      isolated.userData.studioBaseColor = sourceBaseColor.clone()
    } else {
      delete isolated.userData.studioBaseColor
    }
    isolated.dispose = () => {
      if (isolated.userData.studioMaterialDisposed) return
      isolated.userData.studioMaterialDisposed = true
      dispose()
    }
    changed = true
    return isolated
  })

  if (changed) {
    object.material = Array.isArray(object.material) ? materials : materials[0]
  }
  object.userData.studioOwnedMaterials = materials.filter(
    (material) => material.userData?.studioMaterialOwner === object.uuid,
  )
  return materials
}

function getOwnedStudioObjectMaterials(object) {
  return getStudioObjectMaterials(object)
    .filter((material) => material.userData?.studioMaterialOwner === object.uuid)
}

export function disposeStudioOwnedMaterials(root) {
  if (!root || typeof root.traverse !== 'function') return
  root.traverse((object) => {
    const currentOwned = getOwnedStudioObjectMaterials(object)
    const owned = new Set([
      ...(object.userData.studioOwnedMaterials ?? []),
      ...currentOwned,
    ])
    owned.forEach((material) => disposeOwnedStudioMaterial(material, object.uuid))
    object.userData.studioOwnedMaterials = []
  })
}

function hasStudioMaterialTuning(tuning) {
  return tuning.color !== DEFAULT_STUDIO_TUNING.color
    || tuning.colorStrength !== DEFAULT_STUDIO_TUNING.colorStrength
    || tuning.brightness !== DEFAULT_STUDIO_TUNING.brightness
    || tuning.saturation !== DEFAULT_STUDIO_TUNING.saturation
    || tuning.outlineColor !== DEFAULT_STUDIO_TUNING.outlineColor
    || tuning.outlineOpacity !== DEFAULT_STUDIO_TUNING.outlineOpacity
    || tuning.outlineThickness !== DEFAULT_STUDIO_TUNING.outlineThickness
    || tuning.emissiveIntensity !== DEFAULT_STUDIO_TUNING.emissiveIntensity
}

// 留??꾨젅??useFrame) ?ъ쟻??寃쎈줈??GC 遺?섎? 以꾩씠湲??꾪븳 ?ъ궗???ㅽ겕?섏튂.
// tuneColor??export?섏? ?딄퀬 ?좎씪???몄텧??applyStudioTuning)媛 諛섑솚媛믪쓣
// material.color.copy(...)濡?利됱떆 ?뚮퉬?섎?濡? 諛섑솚 李몄“瑜?蹂닿??섎뒗 寃쎈줈媛 ?놁뼱 ?덉쟾?섎떎.
const _tuneScratchColor = new THREE.Color()
const _tuneTargetColor = new THREE.Color()
const _tuneScratchHSL = { h: 0, s: 0, l: 0 }

function tuneColor(baseColor, tuning) {
  const next = _tuneScratchColor.copy(baseColor)
  next.getHSL(_tuneScratchHSL)
  next.setHSL(
    _tuneScratchHSL.h,
    Math.min(1, Math.max(0, _tuneScratchHSL.s * tuning.saturation)),
    Math.min(1, Math.max(0, _tuneScratchHSL.l * tuning.brightness)),
  )
  return next.lerp(_tuneTargetColor.set(tuning.color), tuning.colorStrength)
}

export function applyStudioTuning(root, tuning = DEFAULT_STUDIO_TUNING, { scope = 'root' } = {}) {
  const t = normalizeStudioTuning(tuning)
  const customMaterialTuning = hasStudioMaterialTuning(t)
  const outlineColor = new THREE.Color(t.outlineColor)
  const outlineScaleFactor = 1 + (t.outlineThickness - 1) * 0.12

  root.traverse((object) => {
    if (object.userData.studioPartGroupOutline) return
    if (object.userData.studioTextureDecal) return
    if (object.userData.studioNonTunable) return

    const currentMaterials = getStudioObjectMaterials(object)
    releaseReplacedStudioMaterials(object, currentMaterials)
    const materials = customMaterialTuning
      ? isolateStudioObjectMaterials(object, currentMaterials)
      : scope === 'part'
        ? getOwnedStudioObjectMaterials(object)
        : currentMaterials

    const hasOutlineMaterial = materials.some(isOutlineMaterial)
    if (hasOutlineMaterial && object.isMesh) {
      if (!object.userData.studioBaseScale) object.userData.studioBaseScale = object.scale.clone()
      object.scale.copy(object.userData.studioBaseScale).multiplyScalar(outlineScaleFactor)
    } else if (!customMaterialTuning && object.userData.studioBaseScale) {
      object.scale.copy(object.userData.studioBaseScale)
    }

    materials.forEach((material) => {
      const outline = isOutlineMaterial(material)
      if (material.color) {
        if (!material.userData.studioBaseColor) material.userData.studioBaseColor = material.color.clone()
        material.color.copy(outline ? outlineColor : tuneColor(material.userData.studioBaseColor, t))
      }
      if (outline && typeof material.opacity === 'number') {
        material.opacity = t.outlineOpacity
        material.transparent = t.outlineOpacity < 1
      }
      if (!outline && typeof material.emissiveIntensity === 'number') {
        material.emissiveIntensity = t.emissiveIntensity
      }
      if (!outline && material.emissive && material.color) {
        material.emissive.copy(material.color)
      }
      material.needsUpdate = true
    })
  })
}

// 파츠 조회 정본. 미리보기와 게임 런타임이 **같은 함수**를 쓴다.
//
// 앞 세그먼트를 하나씩 떼며 재시도하는 이유(제거하면 안 된다):
// 스튜디오 미리보기 루트에는 조명·바닥 같은 형제가 함께 들어 있어 편집 대상 아이템이
// 루트의 N번째 자식에 놓인다. 그래서 저장 키에 그 N이 앞에 붙는다(예: `player::group::7.0+7.1`).
// 게임 런타임에서는 StudioTunedGroup 루트가 곧 아이템이라 그 선행 세그먼트가 없다.
// 정확 경로(offset 0)를 항상 먼저 시도하고, 실패할 때만 선행 세그먼트를 떼어 본다.
//
// 예전에는 이 재시도가 런타임 구현에만 있고 미리보기 구현에는 없었다. 같은 저장값이
// 한쪽에서만 해석되는 드리프트였고, 두 구현이 따로 유지보수된 결과다. 이제 하나만 쓴다.
export function findStudioPartByKey(root, key) {
  if (!root || !key) return null
  if (key.startsWith(STABLE_PART_KEY_PREFIX)) {
    const id = key.slice(STABLE_PART_KEY_PREFIX.length)
    let found = null
    root.traverse((object) => {
      if (!found && object.userData?.studioPartId === id) found = object
    })
    return found
  }
  const parts = key.split('.')
  for (let offset = 0; offset < parts.length; offset += 1) {
    const found = parts
      .slice(offset)
      .reduce((node, index) => node?.children?.[Number(index)] ?? null, root)
    if (found) return found
  }
  return null
}

function resetSavedStudioPartTransforms(root) {
  root.traverse((object) => {
    if (!object.userData.studioPartTransformApplied) return
    if (object.userData.studioPartBaseScale) object.scale.copy(object.userData.studioPartBaseScale)
    if (object.userData.studioPartBaseRotation) object.rotation.copy(object.userData.studioPartBaseRotation)
    if (object.userData.studioPartBasePosition) object.position.copy(object.userData.studioPartBasePosition)
    object.userData.studioPartPositionOffset?.set(0, 0, 0)
    object.userData.studioPartRotationOffset?.set(0, 0, 0)
    object.userData.studioPartScaleMultiplier?.set(1, 1, 1)
    object.userData.studioPartTransformApplied = false
  })
}

export function captureStudioPartBaseTransform(object) {
  if (!object) return
  if (!object.userData.studioPartBaseScale) object.userData.studioPartBaseScale = object.scale.clone()
  if (!object.userData.studioPartBaseRotation) object.userData.studioPartBaseRotation = object.rotation.clone()
  if (!object.userData.studioPartBasePosition) object.userData.studioPartBasePosition = object.position.clone()
}

// base 소유권 정본:
//   base는 "StudioTunedGroup 루트가 이 파츠를 처음 편입시킨 순간의 JSX 선언값"이며,
//   그 파츠에 스튜디오 튜닝이 걸렸는지와 무관하게 항상 먼저 존재한다.
//
// 예전에는 파츠에 튜닝이 처음 적용되는 순간에만 지연 캡처했다. 그 순간 애니메이션이 파츠를
// 이미 움직여 놨다면 rest 포즈가 아닌 자세가 base로 굳어, 사용자가 0을 다시 입력해도
// 원래 자리가 아니라 그 오염된 자세로 돌아갔다. 마운트 시점(첫 프레임 이전)에 서브트리
// 전체를 한 번 훑어 두면 그 경합 자체가 사라진다. 매 프레임 비용이 아니라 1회성이다.
export function captureStudioPartBaseTransforms(root) {
  if (!root || typeof root.traverse !== 'function') return 0
  let captured = 0
  root.traverse((object) => {
    if (object.userData.studioPartBasePosition) return
    captureStudioPartBaseTransform(object)
    captured += 1
  })
  return captured
}

// The only numeric transform-composition law used by Studio, runtime meshes,
// and pooled instances. Position and rotation are additive; scale is
// multiplicative. Keep these pure so renderers never duplicate the formula.
export function composeStudioPartOffset(base, studioOffset = 0, animationOffset = 0) {
  return base + studioOffset + animationOffset
}

export function composeStudioPartMultiplier(base = 1, studioMultiplier = 1, animationMultiplier = 1) {
  return base * studioMultiplier * animationMultiplier
}

// Packed pooled-instance caches use the same canonical numeric composition.
export function composeStudioPartTransformCache(cache, offset, transform) {
  cache[offset] = composeStudioPartOffset(cache[offset], transform.position[0])
  cache[offset + 1] = composeStudioPartOffset(cache[offset + 1], transform.position[1])
  cache[offset + 2] = composeStudioPartOffset(cache[offset + 2], transform.position[2])
  cache[offset + 3] = composeStudioPartOffset(cache[offset + 3], transform.rotation[0])
  cache[offset + 4] = composeStudioPartOffset(cache[offset + 4], transform.rotation[1])
  cache[offset + 5] = composeStudioPartOffset(cache[offset + 5], transform.rotation[2])
  cache[offset + 6] = composeStudioPartMultiplier(cache[offset + 6], transform.scale[0])
  cache[offset + 7] = composeStudioPartMultiplier(cache[offset + 7], transform.scale[1])
  cache[offset + 8] = composeStudioPartMultiplier(cache[offset + 8], transform.scale[2])
}

export function composeStudioPartPosition(object, axis, fallbackBase, animationOffset = 0) {
  const base = object?.userData?.studioPartBasePosition?.[axis] ?? fallbackBase
  const studioOffset = object?.userData?.studioPartPositionOffset?.[axis] ?? 0
  return composeStudioPartOffset(base, studioOffset, animationOffset)
}

export function composeStudioPartRotation(object, axis, fallbackBase, animationOffset = 0) {
  const base = object?.userData?.studioPartBaseRotation?.[axis] ?? fallbackBase
  const studioOffset = object?.userData?.studioPartRotationOffset?.[axis] ?? 0
  return composeStudioPartOffset(base, studioOffset, animationOffset)
}

// 스케일은 더하기가 아니라 곱하기다. 애니메이션이 파츠를 부풀리거나 눌러도
// 스튜디오 배율이 지워지지 않게 base × 스튜디오배율 × 애니메이션배율로 합성한다.
export function composeStudioPartScale(object, axis, fallbackBase = 1, animationMultiplier = 1) {
  const base = object?.userData?.studioPartBaseScale?.[axis] ?? fallbackBase
  const studioMultiplier = object?.userData?.studioPartScaleMultiplier?.[axis] ?? 1
  return composeStudioPartMultiplier(base, studioMultiplier, animationMultiplier)
}

// 애니메이션이 "절대 자세"를 직접 계산해 쓰는 경우(예: `arm.rotation.z = 1.25 - s * 1.05`)를 위한
// 정본 접근자. 이 경우 base는 이미 그 절대값 안에 녹아 있으므로 compose*를 쓰면 base가 두 번
// 더해진다. 스튜디오 오프셋만 얹는 것이 맞다:  `절대값 + studioPartRotationOffset(part, 'z')`.
// userData 키를 각 컴포넌트가 직접 들여다보지 않게 하려고 여기서 노출한다.
export function studioPartRotationOffset(object, axis) {
  return object?.userData?.studioPartRotationOffset?.[axis] ?? 0
}

export function studioPartPositionOffset(object, axis) {
  return object?.userData?.studioPartPositionOffset?.[axis] ?? 0
}

export function studioPartScaleMultiplier(object, axis) {
  return object?.userData?.studioPartScaleMultiplier?.[axis] ?? 1
}

function getSavedPartTuning(itemId, savedKey, tuning) {
  const partPrefix = `${itemId}::part::`
  const groupPrefix = `${itemId}::group::`
  if (savedKey.startsWith(partPrefix)) {
    return {
      kind: 'part',
      partKeys: [savedKey.slice(partPrefix.length)],
      savedKey,
      tuning,
    }
  }
  if (savedKey.startsWith(groupPrefix)) {
    return {
      kind: 'group',
      partKeys: Array.from(new Set(
        savedKey.slice(groupPrefix.length).split('+').filter(Boolean),
      )),
      savedKey,
      tuning,
    }
  }
  return null
}

// 留??꾨젅???뚰듃 ?쒕떇 ?ъ쟻????Vector3 ?좊떦 諛⑹????ㅽ겕?섏튂.
// .add()/.multiply()???몄옄瑜??쎄린留??섍퀬 李몄“瑜?蹂닿??섏? ?딆쑝硫?
// applySavedStudioPartTunings???ш?쨌以묒꺽 ?몄텧???녿뒗 ?⑥씪 ?숆린 寃쎈줈??
const _partCombinedPosition = new THREE.Vector3()
const _partCombinedScale = new THREE.Vector3()

export function applySavedStudioPartTunings(root, itemId, tunings = loadStudioTunings(), { materialTuning = true } = {}) {
  if (!root || !itemId) return
  const savedPartTunings = Object.entries(tunings ?? {})
    .map(([savedKey, tuning]) => getSavedPartTuning(itemId, savedKey, tuning))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'group' ? -1 : 1
      return a.savedKey.localeCompare(b.savedKey)
    })
  if (typeof root.traverse !== 'function') return

  resetSavedStudioPartTransforms(root)
  if (!savedPartTunings.length) return

  const tuningsByPartKey = new Map()
  savedPartTunings.forEach((entry) => {
    entry.partKeys.forEach((partKey) => {
      const entries = tuningsByPartKey.get(partKey) ?? []
      entries.push(entry)
      tuningsByPartKey.set(partKey, entries)
    })
  })

  Array.from(tuningsByPartKey.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([partKey, entries]) => {
      const part = findStudioPartByKey(root, partKey)
      if (!part) return

      captureStudioPartBaseTransform(part)

      _partCombinedPosition.set(0, 0, 0)
      _partCombinedScale.set(1, 1, 1)
      let rotationX = 0
      let rotationY = 0
      let rotationZ = 0
      entries.forEach(({ tuning }) => {
        const transform = getStudioTransformProps(tuning)
        _partCombinedPosition.x += transform.position[0]
        _partCombinedPosition.y += transform.position[1]
        _partCombinedPosition.z += transform.position[2]
        _partCombinedScale.x *= transform.scale[0]
        _partCombinedScale.y *= transform.scale[1]
        _partCombinedScale.z *= transform.scale[2]
        rotationX += transform.rotation[0]
        rotationY += transform.rotation[1]
        rotationZ += transform.rotation[2]
      })

      if (!part.userData.studioPartPositionOffset) part.userData.studioPartPositionOffset = new THREE.Vector3()
      if (!part.userData.studioPartRotationOffset) part.userData.studioPartRotationOffset = new THREE.Vector3()
      if (!part.userData.studioPartScaleMultiplier) part.userData.studioPartScaleMultiplier = new THREE.Vector3(1, 1, 1)
      part.userData.studioPartPositionOffset.copy(_partCombinedPosition)
      part.userData.studioPartRotationOffset.set(rotationX, rotationY, rotationZ)
      part.userData.studioPartScaleMultiplier.copy(_partCombinedScale)
      part.userData.studioPartTransformApplied = true
      part.position.set(
        composeStudioPartOffset(part.userData.studioPartBasePosition.x, _partCombinedPosition.x),
        composeStudioPartOffset(part.userData.studioPartBasePosition.y, _partCombinedPosition.y),
        composeStudioPartOffset(part.userData.studioPartBasePosition.z, _partCombinedPosition.z),
      )
      part.scale.set(
        composeStudioPartMultiplier(part.userData.studioPartBaseScale.x, _partCombinedScale.x),
        composeStudioPartMultiplier(part.userData.studioPartBaseScale.y, _partCombinedScale.y),
        composeStudioPartMultiplier(part.userData.studioPartBaseScale.z, _partCombinedScale.z),
      )
      part.rotation.set(
        composeStudioPartOffset(part.userData.studioPartBaseRotation.x, rotationX),
        composeStudioPartOffset(part.userData.studioPartBaseRotation.y, rotationY),
        composeStudioPartOffset(part.userData.studioPartBaseRotation.z, rotationZ),
      )
      if (materialTuning) {
        entries.forEach(({ tuning }) => applyStudioTuning(part, tuning, { scope: 'part' }))
      }
    })
}

const EMPTY_DECALS = Object.freeze([])

function loadStudioState(itemId) {
  const tunings = loadStudioTunings()
  return {
    tuning: tunings[itemId] ?? DEFAULT_STUDIO_TUNING,
    tunings,
    decals: loadTextureDecals()[itemId] ?? EMPTY_DECALS,
  }
}

function loadSnapshotStudioState(itemId, snapshot) {
  const tunings = snapshot.tunings
  return {
    tuning: tunings[itemId] ?? DEFAULT_STUDIO_TUNING,
    tunings,
    decals: snapshot.decals[itemId] ?? EMPTY_DECALS,
  }
}

export default function StudioTunedGroup(props) {
  const previewOnly = useContext(StudioPreviewContext)
  const snapshot = useContext(StudioSnapshotContext)
  if (previewOnly) return <>{props.children}</>
  return <StudioTunedRuntimeGroup {...props} snapshot={snapshot} />
}

function StudioTunedRuntimeGroup({ itemId, children, materialTuning = true, snapshot = null, transformPositionMultiplier = 1 }) {
  // A non-1 value is reserved for a fixed parent base scale: compensate only
  // the parent-scaled Studio position so runtime and preview stay world-equal.
  const groupRef = useRef(null)
  const [studioState, setStudioState] = useState(() => (
    snapshot ? loadSnapshotStudioState(itemId, snapshot) : loadStudioState(itemId)
  ))

  useEffect(() => {
    if (snapshot) {
      setStudioState(loadSnapshotStudioState(itemId, snapshot))
      return undefined
    }
    if (typeof window === 'undefined') return undefined
    const update = () => setStudioState(loadStudioState(itemId))
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    window.addEventListener(TEXTURE_DECALS_EVENT, update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
      window.removeEventListener(TEXTURE_DECALS_EVENT, update)
    }
  }, [itemId, snapshot])

  const { tuning, tunings, decals } = studioState
  const transform = useMemo(() => getStudioTransformProps(tuning), [tuning])
  const runtimePosition = useMemo(() => (
    transform.position.map((value) => value * transformPositionMultiplier)
  ), [transform.position, transformPositionMultiplier])

  // 첫 useFrame(애니메이션)이 돌기 전에 rest 포즈를 base로 확정한다.
  // useLayoutEffect는 R3F의 rAF 루프보다 먼저 실행되므로 경합이 없다.
  useLayoutEffect(() => {
    captureStudioPartBaseTransforms(groupRef.current)
  })

  useEffect(() => {
    if (!groupRef.current) return
    if (materialTuning) applyStudioTuning(groupRef.current, tuning)
    applySavedStudioPartTunings(groupRef.current, itemId, tunings, { materialTuning })
    syncTextureDecals(groupRef.current, decals)
    invalidate()
  }, [itemId, materialTuning, tuning, tunings, decals, transformPositionMultiplier])

  useEffect(() => {
    const group = groupRef.current
    return () => {
      disposeTextureDecals(group)
      disposeStudioOwnedMaterials(group)
    }
  }, [])

  return <group ref={groupRef} scale={transform.scale} position={runtimePosition} rotation={transform.rotation}>{children}</group>
}

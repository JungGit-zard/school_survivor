import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { invalidate } from '@react-three/fiber'
import * as THREE from 'three'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_TUNING_EVENT,
  loadStudioTunings,
  normalizeStudioTuning,
} from '../lib/graphicsStudioConfig.js'

const StudioPreviewContext = createContext(false)
const STABLE_PART_KEY_PREFIX = 'id:'

export function StudioTuningPreviewProvider({ children }) {
  return (
    <StudioPreviewContext.Provider value>
      {children}
    </StudioPreviewContext.Provider>
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
  return material?.side === THREE.BackSide || material?.stencilFunc === THREE.NotEqualStencilFunc
}

// 매 프레임(useFrame) 재적용 경로의 GC 부하를 줄이기 위한 재사용 스크래치.
// tuneColor는 export되지 않고 유일한 호출자(applyStudioTuning)가 반환값을
// material.color.copy(...)로 즉시 소비하므로, 반환 참조를 보관하는 경로가 없어 안전하다.
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

export function applyStudioTuning(root, tuning = DEFAULT_STUDIO_TUNING) {
  const t = normalizeStudioTuning(tuning)
  const outlineColor = new THREE.Color(t.outlineColor)
  const outlineScaleFactor = 1 + (t.outlineThickness - 1) * 0.12

  root.traverse((object) => {
    if (object.userData.studioPartGroupOutline) return

    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : []

    const hasOutlineMaterial = materials.some(isOutlineMaterial)
    if (hasOutlineMaterial && object.isMesh) {
      if (!object.userData.studioBaseScale) object.userData.studioBaseScale = object.scale.clone()
      object.scale.copy(object.userData.studioBaseScale).multiplyScalar(outlineScaleFactor)
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

function findStudioPartFromRuntimeRoot(root, key) {
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
    if (object.userData.studioPartBaseScale) object.scale.copy(object.userData.studioPartBaseScale)
    if (object.userData.studioPartBaseRotation) object.rotation.copy(object.userData.studioPartBaseRotation)
    if (object.userData.studioPartBasePosition) object.position.copy(object.userData.studioPartBasePosition)
  })
}

function getPartKeysForSavedTuning(itemId, savedKey) {
  const partPrefix = `${itemId}::part::`
  const groupPrefix = `${itemId}::group::`
  if (savedKey.startsWith(partPrefix)) return [savedKey.slice(partPrefix.length)]
  if (savedKey.startsWith(groupPrefix)) return savedKey.slice(groupPrefix.length).split('+')
  return []
}

// 매 프레임 파트 튜닝 재적용 시 Vector3 할당 방지용 스크래치.
// .add()/.multiply()는 인자를 읽기만 하고 참조를 보관하지 않으며,
// applySavedStudioPartTunings는 재귀·중첩 호출이 없는 단일 동기 경로다.
const _partScratchVec = new THREE.Vector3()

// scale을 UV 줌으로 변환하되, 텍스처에 원래 걸려 있던 크롭(base repeat/offset)을 보존·합성한다.
// (예: B02 얼굴은 로드 시 repeat(0.82,0.76)/offset(0.09,0.05) 크롭 — 이를 덮어쓰면 얼굴 프레이밍이 깨짐)
// 줌은 base 크롭 창의 중심을 유지한 채 창 크기만 1/scale 배로 줄인다.
function applyTextureFitTuning(part, transform) {
  const materials = Array.isArray(part.material) ? part.material : part.material ? [part.material] : []
  materials.forEach((material) => {
    const map = material.map
    if (!map) return
    if (!material.userData.studioBaseMapRepeat) material.userData.studioBaseMapRepeat = map.repeat.clone()
    if (!material.userData.studioBaseMapOffset) material.userData.studioBaseMapOffset = map.offset.clone()
    const baseRepeat = material.userData.studioBaseMapRepeat
    const baseOffset = material.userData.studioBaseMapOffset
    const repeatX = baseRepeat.x / Math.max(0.01, transform.scale[0])
    const repeatY = baseRepeat.y / Math.max(0.01, transform.scale[1])
    map.repeat.set(repeatX, repeatY)
    map.offset.set(
      baseOffset.x + (baseRepeat.x - repeatX) / 2,
      baseOffset.y + (baseRepeat.y - repeatY) / 2,
    )
    map.needsUpdate = true
  })
}

export function applySavedStudioPartTunings(root, itemId, tunings = loadStudioTunings(), { materialTuning = true } = {}) {
  if (!root || !itemId) return
  const savedPartTunings = Object.entries(tunings ?? {})
    .map(([savedKey, tuning]) => [getPartKeysForSavedTuning(itemId, savedKey), tuning])
    .filter(([partKeys]) => partKeys.length)
  if (!savedPartTunings.length || typeof root.traverse !== 'function') return

  resetSavedStudioPartTransforms(root)

  savedPartTunings.forEach(([partKeys, tuning]) => {
    const transform = getStudioTransformProps(tuning)

    partKeys.forEach((partKey) => {
      const part = findStudioPartFromRuntimeRoot(root, partKey)
      if (!part) return

      if (!part.userData.studioPartBaseScale) part.userData.studioPartBaseScale = part.scale.clone()
      if (!part.userData.studioPartBaseRotation) part.userData.studioPartBaseRotation = part.rotation.clone()
      if (!part.userData.studioPartBasePosition) part.userData.studioPartBasePosition = part.position.clone()

      part.position.copy(part.userData.studioPartBasePosition).add(_partScratchVec.fromArray(transform.position))
      if (part.userData.studioTextureFit) {
        part.scale.copy(part.userData.studioPartBaseScale)
        applyTextureFitTuning(part, transform)
      } else {
        part.scale.copy(part.userData.studioPartBaseScale).multiply(_partScratchVec.fromArray(transform.scale))
      }
      part.rotation.set(
        part.userData.studioPartBaseRotation.x + transform.rotation[0],
        part.userData.studioPartBaseRotation.y + transform.rotation[1],
        part.userData.studioPartBaseRotation.z + transform.rotation[2],
      )
      if (materialTuning) applyStudioTuning(part, tuning)
    })
  })
}

function loadStudioState(itemId) {
  const tunings = loadStudioTunings()
  return {
    tuning: tunings[itemId] ?? DEFAULT_STUDIO_TUNING,
    tunings,
  }
}

export default function StudioTunedGroup({ itemId, children, materialTuning = true }) {
  const previewOnly = useContext(StudioPreviewContext)
  const groupRef = useRef(null)
  const [studioState, setStudioState] = useState(() => loadStudioState(itemId))

  useEffect(() => {
    if (previewOnly || typeof window === 'undefined') return undefined
    const update = () => setStudioState(loadStudioState(itemId))
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [itemId, previewOnly])

  const { tuning, tunings } = studioState
  const transform = useMemo(() => getStudioTransformProps(tuning), [tuning])

  useEffect(() => {
    if (previewOnly || !groupRef.current) return
    if (materialTuning) applyStudioTuning(groupRef.current, tuning)
    applySavedStudioPartTunings(groupRef.current, itemId, tunings, { materialTuning })
    invalidate()
  }, [itemId, materialTuning, previewOnly, tuning, tunings])

  if (previewOnly) return <>{children}</>
  return <group ref={groupRef} scale={transform.scale} position={transform.position} rotation={transform.rotation}>{children}</group>
}

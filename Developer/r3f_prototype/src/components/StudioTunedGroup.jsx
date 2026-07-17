import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
      const part = findStudioPartFromRuntimeRoot(root, partKey)
      if (!part) return

      if (!part.userData.studioPartBaseScale) part.userData.studioPartBaseScale = part.scale.clone()
      if (!part.userData.studioPartBaseRotation) part.userData.studioPartBaseRotation = part.rotation.clone()
      if (!part.userData.studioPartBasePosition) part.userData.studioPartBasePosition = part.position.clone()

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

      part.position.copy(part.userData.studioPartBasePosition).add(_partCombinedPosition)
      part.scale.copy(part.userData.studioPartBaseScale).multiply(_partCombinedScale)
      part.rotation.set(
        part.userData.studioPartBaseRotation.x + rotationX,
        part.userData.studioPartBaseRotation.y + rotationY,
        part.userData.studioPartBaseRotation.z + rotationZ,
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

export default function StudioTunedGroup({ itemId, children, materialTuning = true }) {
  const previewOnly = useContext(StudioPreviewContext)
  const groupRef = useRef(null)
  const [studioState, setStudioState] = useState(() => loadStudioState(itemId))

  useEffect(() => {
    if (previewOnly || typeof window === 'undefined') return undefined
    const update = () => setStudioState(loadStudioState(itemId))
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    window.addEventListener(TEXTURE_DECALS_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
      window.removeEventListener(TEXTURE_DECALS_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [itemId, previewOnly])

  const { tuning, tunings, decals } = studioState
  const transform = useMemo(() => getStudioTransformProps(tuning), [tuning])

  useEffect(() => {
    if (previewOnly || !groupRef.current) return
    if (materialTuning) applyStudioTuning(groupRef.current, tuning)
    applySavedStudioPartTunings(groupRef.current, itemId, tunings, { materialTuning })
    syncTextureDecals(groupRef.current, decals)
    invalidate()
  }, [itemId, materialTuning, previewOnly, tuning, tunings, decals])

  useEffect(() => {
    if (previewOnly) return undefined
    const group = groupRef.current
    return () => {
      disposeTextureDecals(group)
      disposeStudioOwnedMaterials(group)
    }
  }, [previewOnly])

  if (previewOnly) return <>{children}</>
  return <group ref={groupRef} scale={transform.scale} position={transform.position} rotation={transform.rotation}>{children}</group>
}

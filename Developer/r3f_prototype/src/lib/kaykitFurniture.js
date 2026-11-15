import * as THREE from 'three'
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import kaykitFurnitureUrl from '../assets/models/kaykit/furniture_kaykit.glb?url'
import { toonMat } from './toon.js'
import { createOutlineGeometry } from './projectileZombieShotGeometry.js'

// KayKit Furniture Bits (CC0, Kay Lousberg; provenance: Developer/agent_room/3d_asset_provenance_manifest_2026-11-14.json).
// One GLB, 22 named root nodes, one material, one 1024 PNG atlas. Built with gltf-transform
// (merge -> dedup -> prune -> meshopt): positions/normals/uvs are quantized ints and every node
// carries the dequantize scale/offset in its own transform. bakeKaykitNodeGeometry() folds that
// node matrix into a plain float geometry, so instancing never has to know about it.
export const KAYKIT_FURNITURE_URL = kaykitFurnitureUrl

export const KAYKIT_NODE_NAMES = Object.freeze([
  'table_small', 'chair_A_wood', 'chair_B_wood', 'table_medium_long', 'shelf_B_large', 'chair_A', 'table_medium', 'chair_B',
  'book_set', 'book_single', 'pictureframe_large_A', 'pictureframe_large_B', 'bed_single_A', 'bed_single_B', 'cabinet_medium',
  'cabinet_medium_decorated', 'cabinet_small', 'chair_stool', 'pillow_A', 'cactus_small_A', 'cactus_small_B', 'pictureframe_medium',
])

// Inverted-hull push (prop-local units, before the placement scale). The old box props padded each
// axis by 0.045 in total, i.e. 0.0225 per side; this keeps the same line weight.
export const KAYKIT_OUTLINE_THICKNESS = 0.0225
// Same lift every other stage prop gets from toonMat (emissive = colour x 0.08), here colour = atlas.
export const KAYKIT_EMISSIVE_INTENSITY = 0.08

const _v = new THREE.Vector3()
const _n = new THREE.Matrix3()

function toFloatAttribute(attribute, itemSize) {
  const out = new Float32Array(attribute.count * itemSize)
  for (let i = 0; i < attribute.count; i += 1) {
    out[i * itemSize] = attribute.getX(i)
    if (itemSize > 1) out[i * itemSize + 1] = attribute.getY(i)
    if (itemSize > 2) out[i * itemSize + 2] = attribute.getZ(i)
  }
  return new THREE.BufferAttribute(out, itemSize)
}

// Quantized node mesh -> float geometry in scene-root space (node matrix baked in), optional extra yaw.
export function bakeKaykitNodeGeometry(node, { rotationY = 0 } = {}) {
  const mesh = node?.isMesh ? node : node?.getObjectByProperty?.('isMesh', true)
  const source = mesh?.geometry
  if (!source?.attributes?.position) return null
  mesh.updateWorldMatrix(true, false)
  const matrix = mesh.matrixWorld.clone()
  if (rotationY) matrix.premultiply(new THREE.Matrix4().makeRotationY(rotationY))
  _n.getNormalMatrix(matrix)
  const geometry = new THREE.BufferGeometry()
  const position = toFloatAttribute(source.attributes.position, 3)
  for (let i = 0; i < position.count; i += 1) {
    _v.fromBufferAttribute(position, i).applyMatrix4(matrix)
    position.setXYZ(i, _v.x, _v.y, _v.z)
  }
  geometry.setAttribute('position', position)
  if (source.attributes.normal) {
    const normal = toFloatAttribute(source.attributes.normal, 3)
    for (let i = 0; i < normal.count; i += 1) {
      _v.fromBufferAttribute(normal, i).applyMatrix3(_n).normalize()
      normal.setXYZ(i, _v.x, _v.y, _v.z)
    }
    geometry.setAttribute('normal', normal)
  } else {
    geometry.computeVertexNormals()
  }
  if (source.attributes.uv) geometry.setAttribute('uv', toFloatAttribute(source.attributes.uv, 2))
  if (source.index) geometry.setIndex(new THREE.BufferAttribute(source.index.array.slice(), 1))
  geometry.computeBoundingBox()
  return geometry
}

// Fit a baked geometry to a prop footprint. fit.size = [w, h, d] (per-axis stretch to exactly that box)
// or fit.scale = uniform factor. The result stands on y = 0 and is centred on fit.center = [x, z].
export function fitKaykitGeometry(geometry, fit = {}) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const size = box.getSize(new THREE.Vector3())
  const scale = Array.isArray(fit.size)
    ? fit.size.map((target, axis) => target / Math.max(1e-6, size.getComponent(axis)))
    : [fit.scale ?? 1, fit.scale ?? 1, fit.scale ?? 1]
  const [cx, cz] = fit.center ?? [0, 0]
  const center = box.getCenter(new THREE.Vector3())
  geometry.translate(-center.x, -box.min.y, -center.z)
  geometry.scale(scale[0], scale[1], scale[2])
  geometry.translate(cx, fit.y ?? 0, cz)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createKaykitPropMaterial(map = null) {
  const material = toonMat(0xffffff, KAYKIT_EMISSIVE_INTENSITY, THREE.DoubleSide)
  material.name = 'kaykit-furniture-toon'
  material.map = map
  material.emissiveMap = map
  material.depthWrite = true
  material.needsUpdate = true
  return material
}

// gltf.scene -> shared assets. Geometries are cached per (node, fit) and live as long as the GLB
// (useGLTF cache); components never dispose them (dispose={null}).
const _assetCache = new WeakMap()
export function getKaykitFurnitureAssets(scene) {
  if (!scene) return null
  let assets = _assetCache.get(scene)
  if (assets) return assets
  let map = null
  scene.traverse((object) => { if (!map && object.isMesh && object.material?.map) map = object.material.map })
  const material = createKaykitPropMaterial(map)
  const geometries = new Map()
  assets = {
    material,
    hasNode: (name) => Boolean(scene.getObjectByName(name)),
    get(name, fit = {}) {
      const key = `${name}|${JSON.stringify(fit)}`
      if (geometries.has(key)) return geometries.get(key)
      const baked = bakeKaykitNodeGeometry(scene.getObjectByName(name), { rotationY: fit.rotationY ?? 0 })
      const entry = baked
        ? (() => {
          const geometry = fitKaykitGeometry(baked, fit)
          return { geometry, outlineGeometry: createOutlineGeometry(geometry, KAYKIT_OUTLINE_THICKNESS) }
        })()
        : null
      geometries.set(key, entry)
      return entry
    },
  }
  _assetCache.set(scene, assets)
  return assets
}

// Suspends until the GLB is loaded (wrap callers in KaykitBoundary). Draco off, meshopt on.
export function useKaykitFurniture() {
  const gltf = useGLTF(KAYKIT_FURNITURE_URL, false, true)
  return useMemo(() => getKaykitFurnitureAssets(gltf?.scene), [gltf])
}

// Start the ~120 KB download as soon as a stage-prop or title module is imported.
useGLTF.preload(KAYKIT_FURNITURE_URL, false, true)

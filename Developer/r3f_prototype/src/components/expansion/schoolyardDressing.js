import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import dressingUrl from '../../assets/models/schoolyard/schoolyard_dressing.glb?url'
import { createOutlineGeometry } from '../../lib/projectileZombieShotGeometry.js'
import { getSchoolyardPropMaterial, getSchoolyardOutlineMaterial } from './schoolyardProps.js'

// Stage 6 「운동장」 free-pack dressing (2026-11-17): school block, trees, bushes, hedges, flower beds, lamps,
// benches, bin, hydrants, playground set, sports-day tents and kit, school fence and gate pillars — all CC0
// (Kenney, KayKit, Tiny Treats; provenance: src/assets/models/schoolyard/PROVENANCE.json, build script:
// scripts/build_schoolyard_dressing.mjs). They stand beside the six hand-built props (schoolyardProps.js),
// never replace them, and never stand inside the playable rectangle.
//
// One GLB, one root node per model, colours baked into vertex colours, so every placed piece shares the
// hand-built props' vertex-colour toon material + no-stencil inverted-hull outline. Placements are merged
// per region chunk (SCHOOLYARD_DRESSING_CHUNKS): one solid + one outline mesh each, frustum-culled, so the
// game camera only draws the one to three chunks next to the player.
export const SCHOOLYARD_DRESSING_URL = dressingUrl
export const SCHOOLYARD_DRESSING_OUTLINE = 0.03

// Node -> model size [w, h, d] in GLB units (centred on x/z, standing on y = 0). Must match the GLB.
export const SCHOOLYARD_DRESSING_NODES = Object.freeze({
  school_wall_windows: [1, 0.63, 1], school_wall_door: [1, 0.63, 1], school_roof: [1.1, 0.21, 1.1],
  tent_long: [2, 0.7, 1], tent_small: [1, 0.7, 1],
  tree_round: [3.18, 4.16, 3.25], tree_tall: [2.6, 4.67, 2], bush_round: [1.2, 0.81, 1.2], bush_small: [1.32, 1.32, 1.32],
  hedge_long: [4, 1.5, 1.5], flower_white: [0.45, 0.14, 0.45], flower_pink: [0.31, 0.11, 0.3],
  park_bench: [2, 1.41, 1.32], street_lantern: [0.94, 4.5, 0.94],
  fence_long: [2.4, 2, 0.4], fence_post: [0.4, 2, 0.4],
  slide: [2.76, 4, 5.91], swing: [4, 3.94, 3.06], seesaw: [1.54, 0.95, 4], merry_go_round: [4, 2.5, 4], sandbox: [4, 0.39, 4],
  bin: [1, 1.1429, 1], hydrant: [0.14, 0.22, 0.13],
  cone_blue: [0.5, 0.65, 0.5], cone_green: [0.5, 0.65, 0.5], big_ball_blue: [2, 2, 2],
  team_flag_blue: [0.6, 2.06, 1.62], team_flag_yellow: [0.6, 2.06, 1.62], sign_board: [0.77, 1.26, 0.76],
  football: [0.57, 0.58, 0.57], school_bell: [0.81, 1.09, 0.81], hurdle: [1.96, 1, 0.17],
})

// Merge regions; the order is the Studio child order under the dressing slot (append only). The school
// building and its low front planting are separate so the tall block's box never reaches the screen edge.
export const SCHOOLYARD_DRESSING_CHUNKS = Object.freeze(['school', 'schoolFront', 'cornerTL', 'cornerTR', 'sideL', 'sideR', 'cornerBL', 'cornerBR', 'gate'])

const HALF_PI = Math.PI / 2
// Placements in game units: p = [x, y, z] of the model's base centre, s = uniform or [sx, sy, sz], r = yaw.
// glTF +Z (the model's front) faces the game camera with r = 0; +π/2 turns it to face +X.
export function getSchoolyardDressingLayout({ halfX, halfZ }) {
  const X = halfX, Z = halfZ, items = []
  const put = (chunk, node, x, z, { s = 1, r = 0, y = 0 } = {}) => items.push({ chunk, node, p: [x, y, z], s: Array.isArray(s) ? s : [s, s, s], r })

  // ── Top: school block (Kenney Modular Buildings, 10 × 3 tiles), hedges, flower beds, lamps ──
  const tile = 2.6, floorH = SCHOOLYARD_DRESSING_NODES.school_wall_windows[1] * tile, schoolZ = -Z - 5.8
  for (let floor = 0; floor < 3; floor++) for (let i = 0; i < 10; i++) {
    const door = floor === 0 && (i === 4 || i === 5)
    put('school', door ? 'school_wall_door' : 'school_wall_windows', -11.7 + i * tile, schoolZ, { s: tile, y: floor * floorH })
  }
  for (let i = 0; i < 10; i++) put('school', 'school_roof', -11.7 + i * tile, schoolZ, { s: [tile / 1.1, tile, tile / 1.1], y: 3 * floorH })
  for (const side of [-1, 1]) {
    for (const x of [5, 7.5, 10]) put('schoolFront', 'hedge_long', side * x, -Z - 3.8, { s: 0.6 })
    ;[4.7, 6.1, 7.5, 8.9, 10.3].forEach((x, i) => put('schoolFront', i % 2 ? 'flower_pink' : 'flower_white', side * x, -Z - 2.95, { s: i % 2 ? 2.2 : 1.6, r: i * 0.7 }))
    put('schoolFront', 'street_lantern', side * 12.9, -Z - 2.3, { s: 0.7 })
  }

  // ── Top corners: sports-day tents (Racing Kit, recoloured school blue), team flags, bell, bench, bin, lamp ──
  put('cornerTL', 'tree_round', -17, -15, { s: 0.9 })
  put('cornerTL', 'tent_long', -14.6, -16.3, { s: 2.7, r: HALF_PI })
  put('cornerTL', 'school_bell', -13.5, -16.3, { s: 0.5, y: 1.0 })
  put('cornerTL', 'team_flag_blue', -12.9, -13.2, { s: 0.8 })
  put('cornerTL', 'team_flag_yellow', -12.9, -19.4, { s: 0.8 })
  put('cornerTR', 'tree_round', 17, -15, { s: 0.9, r: 1.3 })
  put('cornerTR', 'tent_long', 14.6, -16.3, { s: 2.7, r: -HALF_PI })
  put('cornerTR', 'park_bench', 13.15, -12.95, { s: 0.55, r: -HALF_PI })
  put('cornerTR', 'bin', 12.75, -14.0, { s: 0.5 })
  put('cornerTR', 'street_lantern', 12.9, -19.6, { s: 0.7 })
  put('cornerTR', 'hydrant', 16.9, -19.8, { s: 2.7 })

  // ── Sides: plane-tree row behind our bleachers (KayKit Forest) with bushes between ──
  for (const [side, chunk] of [[-1, 'sideL'], [1, 'sideR']]) {
    put(chunk, 'tree_tall', side * 17, -5, { r: HALF_PI })
    put(chunk, 'tree_round', side * 17, 5, { s: 0.9, r: 2.1 })
    put(chunk, 'bush_round', side * 17.2, 0, { s: 1.2 })
    for (const z of [-10, 10]) put(chunk, 'bush_small', side * 17.3, z, { s: 0.8, r: z * 0.1 })
  }

  // ── Bottom-left corner: sports-day kit — small tent, hurdles, cones, giant ball, football, sign ──
  put('cornerBL', 'tree_tall', -17, 15, { r: HALF_PI })
  put('cornerBL', 'tent_small', -14.9, 16.4, { s: 2.7, r: HALF_PI })
  for (const z of [13.2, 13.6, 14.0]) put('cornerBL', 'hurdle', -13.6, z, { s: 0.5 })
  ;[[-12.75, 'cone_blue'], [-13.35, 'cone_green'], [-13.95, 'cone_blue']].forEach(([x, node]) => put('cornerBL', node, x, 12.9, { s: 0.6 }))
  put('cornerBL', 'sign_board', -12.9, 17.9, { s: 0.6, r: HALF_PI })
  put('cornerBL', 'big_ball_blue', -13.3, 18.9, { s: 0.45 })
  put('cornerBL', 'football', -14.2, 19.3, { s: 0.4 })

  // ── Bottom-right corner: playground (Tiny Treats Fun Playground) around our jungle gym at (X+2.5, Z-4) ──
  put('cornerBR', 'tree_round', 17, 15, { s: 0.9, r: 0.6 })
  put('cornerBR', 'swing', 13.4, 13.75, { s: 0.5, r: HALF_PI })
  put('cornerBR', 'sandbox', 17.1, 13, { s: 0.5 })
  put('cornerBR', 'seesaw', 13.05, 17.4, { s: 0.5 })
  put('cornerBR', 'merry_go_round', 16.4, 17.5, { s: 0.45 })
  put('cornerBR', 'slide', 14.5, 19.3, { s: 0.45, r: -HALF_PI })

  // ── Bottom: school fence + gate pillars (Tiny Treats fence), hydrant and bushes outside ──
  const gateZ = Z + 0.6
  for (const side of [-1, 1]) {
    put('gate', 'fence_post', side * 3.4, gateZ, { s: [2.2, 1.6, 2.2] })
    for (let i = 0; i < 7; i++) put('gate', 'fence_long', side * (4.68 + i * 1.68), gateZ, { s: 0.7 })
    put('gate', 'fence_post', side * 15.75, gateZ, { s: 0.7 })
    put('gate', 'bush_round', side * 17.2, gateZ + 0.2, { s: 1.0 })
  }
  put('gate', 'hydrant', 5, Z + 1.4, { s: 2.7 })
  return items
}

// Axis-aligned XZ footprint of one placement (decoration claim; never a collider).
export function schoolyardDressingFootprint(item) {
  const [w, , d] = SCHOOLYARD_DRESSING_NODES[item.node]
  const hw = w * item.s[0] / 2, hd = d * item.s[2] / 2, c = Math.abs(Math.cos(item.r)), sn = Math.abs(Math.sin(item.r))
  const hx = hw * c + hd * sn, hz = hw * sn + hd * c
  return { minX: item.p[0] - hx, maxX: item.p[0] + hx, minZ: item.p[2] - hz, maxZ: item.p[2] + hz }
}

// Quantized GLB node -> float geometry in the node's scene space (dequantize matrix folded in).
function bakeNodeGeometry(node) {
  const mesh = node?.isMesh ? node : node?.getObjectByProperty?.('isMesh', true)
  const source = mesh?.geometry
  if (!source?.attributes?.position) return null
  mesh.updateWorldMatrix(true, false)
  const geometry = new THREE.BufferGeometry()
  for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3]]) {
    const attribute = source.attributes[name]
    if (!attribute) continue
    const array = new Float32Array(attribute.count * size)
    for (let i = 0; i < attribute.count; i++) {
      array[i * size] = attribute.getX(i); array[i * size + 1] = attribute.getY(i); array[i * size + 2] = attribute.getZ(i)
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size))
  }
  if (!geometry.attributes.color) {
    const white = new Float32Array(geometry.attributes.position.count * 3).fill(1)
    geometry.setAttribute('color', new THREE.BufferAttribute(white, 3))
  }
  geometry.setIndex(source.index ? new THREE.BufferAttribute(Uint32Array.from(source.index.array), 1) : null)
  geometry.applyMatrix4(mesh.matrixWorld)
  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  return geometry
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0)
const triangles = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3

// Builds the chunk meshes into the root's dressing slot (root child 4). Idempotent; returns the stats.
export function attachSchoolyardDressing(root, scene) {
  const slot = root?.userData.schoolyardDressingSlot
  if (!slot || !scene) return null
  if (slot.userData.dressingStats) return slot.userData.dressingStats
  const { halfX, halfZ } = slot.userData.bounds
  scene.updateMatrixWorld(true)
  const baked = new Map()
  const nodeGeometry = (name) => {
    if (!baked.has(name)) baked.set(name, bakeNodeGeometry(scene.getObjectByName(name)))
    return baked.get(name)
  }
  const perChunk = new Map(SCHOOLYARD_DRESSING_CHUNKS.map((chunk) => [chunk, { solids: [], hulls: [] }]))
  const missing = []
  for (const item of getSchoolyardDressingLayout({ halfX, halfZ })) {
    const source = nodeGeometry(item.node)
    if (!source) { missing.push(item.node); continue }
    const solid = source.clone()
    solid.applyMatrix4(_m.compose(_p.fromArray(item.p), _q.setFromAxisAngle(_up, item.r), _s.fromArray(item.s)))
    const hull = createOutlineGeometry(solid, SCHOOLYARD_DRESSING_OUTLINE)
    hull.deleteAttribute('normal')
    const bucket = perChunk.get(item.chunk)
    bucket.solids.push(solid); bucket.hulls.push(hull)
  }
  for (const geometry of baked.values()) geometry?.dispose()
  const stats = { solid: 0, outline: 0, meshes: 0, missing, chunks: {} }
  for (const chunk of SCHOOLYARD_DRESSING_CHUNKS) {
    const { solids, hulls } = perChunk.get(chunk)
    const group = new THREE.Group(); group.name = `schoolyard-dressing-${chunk}`
    if (solids.length) {
      const solidGeo = mergeGeometries(solids), hullGeo = mergeGeometries(hulls)
      solids.forEach((g) => g.dispose()); hulls.forEach((g) => g.dispose())
      solidGeo.computeBoundingSphere(); hullGeo.computeBoundingSphere()
      const solid = new THREE.Mesh(solidGeo, getSchoolyardPropMaterial()); solid.name = `schoolyard-dressing-${chunk}-solid`
      const hull = new THREE.Mesh(hullGeo, getSchoolyardOutlineMaterial()); hull.name = `schoolyard-dressing-${chunk}-outline`; hull.renderOrder = 1
      for (const mesh of [solid, hull]) { mesh.userData.schoolyardOwnedGeometry = true; mesh.matrixAutoUpdate = false; group.add(mesh) }
      stats.chunks[chunk] = { solid: triangles(solidGeo), outline: triangles(hullGeo) }
      stats.solid += triangles(solidGeo); stats.outline += triangles(hullGeo); stats.meshes += 2
    } else stats.chunks[chunk] = { solid: 0, outline: 0 }
    slot.add(group)
  }
  slot.userData.dressingStats = stats
  return stats
}

// Long chunks (school row, fence row) have bounding spheres far larger than their footprint, so the
// built-in sphere test keeps drawing them while they are off screen. Each frame, a chunk group is shown
// only when its world box (plus a margin for the one-frame camera follow lag) meets the camera frustum.
// Studio never tunes visibility, so this does not fight a saved part state.
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _box = new THREE.Box3()
export const SCHOOLYARD_DRESSING_CULL_MARGIN = 1.0
export function cullSchoolyardDressing(root, camera) {
  const slot = root?.userData.schoolyardDressingSlot
  if (!slot?.children.length || !camera) return 0
  camera.updateMatrixWorld()
  _frustum.setFromProjectionMatrix(_pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
  let shown = 0
  for (const group of slot.children) {
    const solid = group.children[0]
    if (!solid?.geometry) continue
    if (!solid.geometry.boundingBox) solid.geometry.computeBoundingBox()
    solid.updateWorldMatrix(true, false)
    _box.copy(solid.geometry.boundingBox).applyMatrix4(solid.matrixWorld).expandByScalar(SCHOOLYARD_DRESSING_CULL_MARGIN)
    group.visible = _frustum.intersectsBox(_box)
    if (group.visible) shown++
  }
  return shown
}

export function disposeSchoolyardDressing(slot) {
  slot?.traverse((node) => { if (node.userData.schoolyardOwnedGeometry) node.geometry?.dispose() })
}

// One shared load per page (the parsed scene is only read to build each stage's chunks).
let _loading = null
export function loadSchoolyardDressingScene(url = SCHOOLYARD_DRESSING_URL) {
  if (!_loading) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    _loading = loader.loadAsync(url).then((gltf) => gltf.scene).catch((error) => { _loading = null; throw error })
  }
  return _loading
}

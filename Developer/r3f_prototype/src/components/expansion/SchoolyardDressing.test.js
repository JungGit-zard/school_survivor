// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { createExpansionEnvironment, disposeExpansionEnvironment } from './expansionEnvironment.js'
import { getSchoolyardStandHalf, getSchoolyardJungleGymAnchor, getSchoolyardGateHalf, getSchoolyardFenceSpan, SCHOOLYARD_FENCE } from './schoolyardProps.js'
import { SCHOOLYARD_DRESSING_NODES, SCHOOLYARD_DRESSING_CHUNKS, getSchoolyardDressingLayout, schoolyardDressingFootprint, attachSchoolyardDressing } from './schoolyardDressing.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { EXPANSION_STAGES } from '../../lib/expansionContent.js'

const GLB = resolve(process.cwd(), 'src/assets/models/schoolyard/schoolyard_dressing.glb') // vitest runs from Developer/r3f_prototype
let scene
beforeAll(async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect() {} })
  await MeshoptDecoder.ready
  const bytes = readFileSync(GLB)
  const buffer = new ArrayBuffer(bytes.byteLength) // this realm's ArrayBuffer (GLTFLoader checks instanceof)
  new Uint8Array(buffer).set(bytes)
  scene = await new Promise((resolve, reject) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(buffer, '', (gltf) => resolve(gltf.scene), reject))
  scene.updateMatrixWorld(true)
})

describe('stage6 free-pack schoolyard dressing', () => {
  it('ships one compact GLB that holds exactly the nodes the layout asks for, at their declared sizes', () => {
    expect(statSync(GLB).size).toBeLessThanOrEqual(350 * 1024)
    const { halfX, halfZ } = getStageBounds('stage6')
    const used = new Set(getSchoolyardDressingLayout({ halfX, halfZ }).map((item) => item.node))
    expect([...used].sort()).toEqual(Object.keys(SCHOOLYARD_DRESSING_NODES).sort())
    const glbNodes = scene.children.map((n) => n.name).sort()
    expect(glbNodes).toEqual(Object.keys(SCHOOLYARD_DRESSING_NODES).sort())
    for (const [name, size] of Object.entries(SCHOOLYARD_DRESSING_NODES)) {
      const box = new THREE.Box3().setFromObject(scene.getObjectByName(name)), got = box.getSize(new THREE.Vector3())
      size.forEach((v, axis) => expect(got.getComponent(axis), `${name} axis ${axis}`).toBeCloseTo(v, 1))
      expect(box.min.y, name).toBeCloseTo(0, 2)
    }
  })

  it('keeps the six hand-built props, the goal colliders and the old claims; dressing stays outside the playable rectangle', () => {
    const { halfX, halfZ } = getStageBounds('stage6')
    const root = createExpansionEnvironment('stage6', { halfX, halfZ })
    expect(root.userData.schoolyardProps.children.map((c) => c.name)).toEqual(['schoolyard-prop-goals', 'schoolyard-prop-podium', 'schoolyard-prop-flagpoles', 'schoolyard-prop-pa-horns', 'schoolyard-prop-jungle-gym', 'schoolyard-prop-grandstand'])
    expect(root.userData.gateLeaves).toHaveLength(2)
    // Goal visuals follow the goal collider data (owned by the stage data; levelmini may move them).
    expect(root.userData.obstacleVisualIds).toEqual(EXPANSION_STAGES.stage6.layout.obstacles.map((o) => o.id))
    // Every pre-dressing claim is still there, unchanged.
    const key = (b) => [b.minX, b.maxX, b.minZ, b.maxZ].map((v) => v.toFixed(3)).join(',')
    const claimed = new Set(root.userData.decorationBounds.map(key))
    const old = [[0, -halfZ - 5, 13, .5], [0, -halfZ - 1.8, 3, 1.2], [...getSchoolyardJungleGymAnchor(halfX, halfZ), .8, .8], [0, halfZ + .4, 3.1, .1]]
    for (const side of [-1, 1]) {
      const g = getSchoolyardGateHalf(halfX), [f0, f1] = getSchoolyardFenceSpan(halfX)
      old.push([side * g, -halfZ - 1.2, .35, .35], [side * (halfX + 2.75), 0, 1.25, getSchoolyardStandHalf(halfZ)], [side * g, halfZ + .6, .55, .55], [side * (f0 + f1) / 2, halfZ + SCHOOLYARD_FENCE.dz, (f1 - f0) / 2, .1])
      for (const tz of [-15, -5, 5, 15]) old.push([side * (halfX + 5), tz, 1.2, 1.2])
    }
    for (const fx of [-6.5, -8.0, -9.5]) old.push([fx * halfX / 12, -halfZ - 1.5, .6, .2])
    for (const [x, z, hx, hz] of old) expect(claimed.has(key({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz })), `${x},${z}`).toBe(true)
    // No dressing footprint reaches into the playable rectangle.
    const layout = getSchoolyardDressingLayout({ halfX, halfZ })
    for (const item of layout) {
      const b = schoolyardDressingFootprint(item)
      expect(b.minX >= halfX || b.maxX <= -halfX || b.minZ >= halfZ || b.maxZ <= -halfZ, `${item.node} @ ${item.p}`).toBe(true)
      expect(SCHOOLYARD_DRESSING_CHUNKS).toContain(item.chunk)
    }

    // Built chunks: 8 groups (append-only order), one solid + one outline each, no vertex inside the arena.
    const slot = root.userData.schoolyardDressingSlot
    expect(root.children[4]).toBe(slot)
    expect(slot.children).toHaveLength(0) // empty until the GLB arrives
    const stats = attachSchoolyardDressing(root, scene)
    expect(stats.missing).toEqual([])
    expect(attachSchoolyardDressing(root, scene)).toBe(stats)
    expect(slot.children.map((c) => c.name)).toEqual(SCHOOLYARD_DRESSING_CHUNKS.map((c) => `schoolyard-dressing-${c}`))
    let meshes = 0
    const v = new THREE.Vector3()
    slot.traverse((mesh) => {
      if (!mesh.isMesh) return
      meshes++
      const pos = mesh.geometry.attributes.position
      let inside = 0
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (Math.abs(v.x) < halfX - 1e-6 && Math.abs(v.z) < halfZ - 1e-6) inside++ }
      expect(inside, mesh.name).toBe(0)
      expect(mesh.frustumCulled, mesh.name).toBe(true)
    })
    expect(meshes).toBe(SCHOOLYARD_DRESSING_CHUNKS.length * 2)
    // Whole board (solid, outlines are the same again); the game camera draws only the 1-4 chunks in view,
    // so the per-frame budget (~30k incl. outlines, measured in the browser) is bounded by the chunk ceiling.
    expect(stats.solid).toBeLessThanOrEqual(34000)
    for (const chunk of SCHOOLYARD_DRESSING_CHUNKS) expect(stats.chunks[chunk].solid, chunk).toBeLessThanOrEqual(8000)
    expect(stats.outline).toBe(stats.solid)
    // Disposal releases every merged chunk geometry exactly once.
    const listeners = []
    slot.traverse((mesh) => { if (mesh.isMesh) { const l = vi.fn(); mesh.geometry.addEventListener('dispose', l); listeners.push(l) } })
    disposeExpansionEnvironment(root)
    for (const l of listeners) expect(l).toHaveBeenCalledTimes(1)
  })
})

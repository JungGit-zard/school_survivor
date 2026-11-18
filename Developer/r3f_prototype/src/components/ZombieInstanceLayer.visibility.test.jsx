// 2026-11-05 회귀: 스튜디오 상태가 하이드레이트된 뒤(라이브) 튜닝 목록 밖 타입(E08, 투사체 15종)의
// 몸통이 0 스케일로 사라졌고, 얼굴 슬롯(16) 밖으로 넘친 E07은 그림자·체력바만 남았다.
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

let frameCb = null
let studioEffects = []
vi.mock('react', async (orig) => {
  const real = await orig()
  return { ...real, useMemo: (f) => f(), useRef: (v) => ({ current: v }), useEffect: (f) => { studioEffects.push(f) }, useLayoutEffect: (f) => { f() } }
})
vi.mock('../lib/toon.js', async (orig) => ({ ...(await orig()), getToonGradient: () => new THREE.DataTexture(new Uint8Array(4), 1, 1) }))
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb) => { frameCb = cb },
  useThree: () => ({ camera: new THREE.PerspectiveCamera() }),
  useLoader: () => new THREE.Texture(),
}))
// MiniZombieLayer(2차 좀비 E89~E106) loads its GLB through drei useGLTF; hand it the real baked file parsed below.
const miniGltf = vi.hoisted(() => ({ value: null }))
vi.mock('@react-three/drei', () => { const useGLTF = () => miniGltf.value; useGLTF.preload = () => {}; return { useGLTF } })
vi.mock('../lib/studioRuntimeState.js', async (orig) => ({ ...(await orig()), getFirebaseStudioRuntimeState: () => ({ datasets: {}, revision: 1 }) }))

globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } }
const { default: ZombieInstanceLayer, resolvePooledZombieVisual } = await import('./ZombieInstanceLayer.jsx')
const { PROCEDURAL_FACE_ZOMBIE_CAPACITY } = await import('./PooledEnemyVisuals.js')
const { enemyPool, playerPos } = await import('../lib/refs.js')
const { ENEMY_TYPE_NAMES } = await import('../lib/enemyEntityPool.js')
const { isExpansionNormalCode } = await import('../lib/expansionVisuals.js')

function collect(el, out = []) {
  if (!el) return out
  if (Array.isArray(el)) { el.forEach((x) => collect(x, out)); return out }
  if (el.props?.object) out.push(el.props.object)
  if (el.props?.children) collect(el.props.children, out)
  return out
}

const { default: BlockyZombieLayer } = await import('./BlockyZombieLayer.jsx')
const { BLOCKY_ZOMBIE_TYPES, BLOCKY_ZOMBIE_TYPE_CODES, blockyZombieAtlasCell } = await import('../lib/blockyZombieRoster.js')
const { KENNEY_BLOCKY_PARTS } = await import('../lib/kenneyBlockyGeometry.js')

const tree = ZombieInstanceLayer({ resetKey: 0 })
studioEffects.forEach((f) => f())
const meshes = collect(tree)
const instanceFrame = frameCb
// Blocky zombies E71-E88 get their bodies from BlockyZombieLayer (GameCanvas mounts both layers).
// BlockyZombieLayer wraps its body in its own Suspense (the atlas must not suspend the whole Canvas): Suspense > inner.
const blockyInner = BlockyZombieLayer({ resetKey: 0 }).props.children
const blockyMeshes = collect(blockyInner.type(blockyInner.props))
const blockyFrame = frameCb

// Novel-2 zombies E89-E106 (typeCode 94-111) get their bodies from MiniZombieLayer (Kenney Mini Characters, CC0).
const { readFileSync } = await import('node:fs')
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
{
  const bytes = readFileSync(new URL('../assets/models/kenney_mini/mini_zombies_kenney.glb', import.meta.url))
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  loader.register(() => ({ name: 'test_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }))
  await MeshoptDecoder.ready
  miniGltf.value = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject))
}
const { default: MiniZombieLayer, pickMiniVariant } = await import('./MiniZombieLayer.jsx')
const { NOVEL2_TYPE_IDS, NOVEL2_TYPE_CODES } = await import('../lib/novelZombie2Content.js')
const miniOuter = MiniZombieLayer({ resetKey: 0 })
const miniInner = miniOuter.props.children.props.children // ErrorBoundary > Suspense > inner
const miniRoot = miniInner.type(miniInner.props).props.object
const miniFrame = frameCb
frameCb = instanceFrame
function miniDrawn() {
  const bodies = []; const outlines = []
  miniRoot.traverse((mesh) => {
    if (!(mesh instanceof THREE.InstancedMesh) || !mesh.visible || mesh.count <= 0) return
    ;(mesh.material?.side === THREE.BackSide ? outlines : bodies).push(mesh)
  })
  return { bodies, outlines }
}
const mm = new THREE.Matrix4()

function clearPool() {
  for (let i = 0; i <= enemyPool.highestActive; i++) if (enemyPool.active[i]) enemyPool.despawnIndex(i, enemyPool.generation[i])
}
function spawn(type, x) {
  enemyPool.spawnInto({}, { type, x, y: 0, z: 1, hp: 10, maxHp: 10, visualScale: 1, runDirX: 1, runDirZ: 0 })
  enemyPool.spawnTimer[enemyPool.highestActive] = 5000
}
function drawnBodyInstances() {
  let n = 0
  for (const mesh of meshes) {
    if (!(mesh instanceof THREE.InstancedMesh) || mesh.count <= 0 || !mesh.visible || mesh.material?.side === THREE.BackSide || mesh.material?.type === 'MeshBasicMaterial') continue
    for (let k = 0; k < mesh.count; k++) { mesh.getMatrixAt(k, mm); if (mm.elements[0] ** 2 + mm.elements[1] ** 2 + mm.elements[2] ** 2 > 1e-10) n++ }
  }
  return n
}
// The blob shadow: the only instanced MeshBasicMaterial at 30% black (see ZombieInstanceLayer).
function drawnShadowInstances() {
  const shadow = meshes.find((mesh) => mesh instanceof THREE.InstancedMesh && mesh.material?.type === 'MeshBasicMaterial' && mesh.material.opacity === 0.3 && mesh.material.color.getHex() === 0)
  return shadow ? shadow.count : 0
}
function nonZeroInstances(mesh) {
  let n = 0
  for (let k = 0; k < mesh.count; k++) { mesh.getMatrixAt(k, mm); if (mm.elements[0] ** 2 + mm.elements[1] ** 2 + mm.elements[2] ** 2 > 1e-10) n++ }
  return n
}

describe('ZombieInstanceLayer body visibility after studio hydrate', () => {
  playerPos.set(0, 0, 0)
  // E07은 얼굴 레이어, 17-31은 확장 레이어, 블록 좀비(E71~E88)는 BlockyZombieLayer,
  // 보스(B01~B10)는 보스 전용 컴포넌트가 그린다(풀 경로 아님).
  const blocky = new Set(BLOCKY_ZOMBIE_TYPES)
  // 2차 신규 좀비(E89~E106)는 MiniZombieLayer가 몸을 그린다(아래 블록).
  const novel2 = new Set(NOVEL2_TYPE_IDS)
  const types = ENEMY_TYPE_NAMES.filter((name, code) => name && !/^B\d+$/.test(name) && name !== 'E07' && !isExpansionNormalCode(code) && !blocky.has(name) && !novel2.has(name))

  it('the pool knows every blocky zombie under its fixed type code', () => {
    expect(BLOCKY_ZOMBIE_TYPES).toHaveLength(18)
    for (const type of BLOCKY_ZOMBIE_TYPES) expect(ENEMY_TYPE_NAMES[BLOCKY_ZOMBIE_TYPE_CODES[type]], type).toBe(type)
  })

  it.each(BLOCKY_ZOMBIE_TYPES)('%s: the instance layer skips the body on purpose (shadow only) and BlockyZombieLayer draws all six parts', (type) => {
    clearPool(); spawn(type, 1)
    instanceFrame({}, 0.016)
    // No box body from the instance layer, so the zombie is never drawn twice ...
    expect(drawnBodyInstances()).toBe(0)
    // ... but it still owns the blob shadow, like E07.
    expect(drawnShadowInstances()).toBe(1)
    blockyFrame({}, 0.016)
    const bodies = blockyMeshes.filter((mesh) => mesh instanceof THREE.InstancedMesh && mesh.material?.side !== THREE.BackSide)
    const outlines = blockyMeshes.filter((mesh) => mesh instanceof THREE.InstancedMesh && mesh.material?.side === THREE.BackSide)
    expect(bodies).toHaveLength(KENNEY_BLOCKY_PARTS.length)
    expect(outlines).toHaveLength(KENNEY_BLOCKY_PARTS.length)
    for (const mesh of [...bodies, ...outlines]) {
      expect(mesh.count).toBe(1)
      expect(nonZeroInstances(mesh)).toBe(1)
    }
    // The body samples this type's own atlas cell (6 cols x 3 rows), not cell 0 for everyone.
    const cell = blockyZombieAtlasCell(type)
    const offset = bodies[0].userData.atlas.array
    expect(cell).toBeGreaterThanOrEqual(0)
    expect([offset[0] > 0, offset[1] > 0]).toEqual([cell % 6 > 0, Math.floor(cell / 6) > 0])
  })

  it('BlockyZombieLayer draws nothing for non-blocky zombies', () => {
    clearPool(); spawn('E01', 1)
    blockyFrame({}, 0.016)
    for (const mesh of blockyMeshes) expect(mesh.count, mesh.name).toBe(0)
  })

  it('the pool knows every novel-2 zombie under typeCodes 94-111, and the instance layer reports them as Mini bodies', () => {
    expect(NOVEL2_TYPE_IDS).toHaveLength(18)
    NOVEL2_TYPE_IDS.forEach((type, i) => {
      expect(NOVEL2_TYPE_CODES[type]).toBe(94 + i)
      expect(ENEMY_TYPE_NAMES[94 + i]).toBe(type)
      const visual = resolvePooledZombieVisual(94 + i)
      expect(visual.mini, type).toBe(true)
      expect(visual.blocky, type).toBe(false)
      expect(visual.partCount, type).toBe(0)
      expect(visual.posedIndex, type).toBe(0) // no longer routed through the wave-1 placeholder alias
    })
    expect(resolvePooledZombieVisual(93).mini).toBe(false)
  })

  it.each(NOVEL2_TYPE_IDS)('%s: the instance layer skips the body (shadow only) and MiniZombieLayer draws its Kenney body with outlines', (type) => {
    clearPool(); spawn(type, 1)
    instanceFrame({}, 0.016)
    expect(drawnBodyInstances()).toBe(0)
    // E91 spawns asleep as a floor textbook: no shadow until it wakes (see the mimic block below).
    expect(drawnShadowInstances()).toBe(type === 'E91' ? 0 : 1)
    miniFrame({}, 0.016)
    const { bodies, outlines } = miniDrawn()
    expect(bodies.length, type).toBeGreaterThanOrEqual(type === 'E91' ? 2 : 6)
    expect(outlines.length, type).toBe(bodies.length)
    for (const mesh of [...bodies, ...outlines]) {
      expect(mesh.count).toBe(1)
      expect(nonZeroInstances(mesh)).toBe(1)
    }
  })

  // E91 textbook mimic: while asleep it must look like a real dropped textbook (XpTextbook has no blob shadow,
  // no HP bar, no spawn smoke). From the bite telegraph on it reads like any zombie. Dormant = the same pool
  // state the mimic pose reads (phase 'normal' = closed book); behaviour states 8/9/10 = telegraph/bite/hop.
  describe('E91 textbook mimic disguise', () => {
    const bar = () => meshes.find((mesh) => mesh instanceof THREE.InstancedMesh && mesh.material?.type === 'MeshBasicMaterial' && mesh.material.color.getHex() === 0xd72832)
    const smoke = () => meshes.find((mesh) => mesh instanceof THREE.InstancedMesh && mesh.material?.map)
    function mimicAt(state, spawnTimer = 5000) {
      clearPool(); spawn('E91', 1)
      const i = enemyPool.highestActive
      enemyPool.state[i] = state; enemyPool.spawnTimer[i] = spawnTimer
      instanceFrame({}, 0.016)
      return i
    }

    it('asleep (approach state 7 / fresh spawn state): no HP bar, no shadow, no spawn smoke, no instance-layer body', () => {
      for (const state of [7, 1, 0]) {
        mimicAt(state)
        expect(bar().count, `state ${state}`).toBe(0)
        expect(drawnShadowInstances(), `state ${state}`).toBe(0)
        expect(drawnBodyInstances()).toBe(0)
      }
      mimicAt(7, 100) // inside the spawn-smoke window
      expect(smoke().count).toBe(0)
      // The disguise itself (closed book) is still drawn by MiniZombieLayer.
      mimicAt(7); miniFrame({}, 0.016)
      expect(miniDrawn().bodies.length).toBeGreaterThanOrEqual(2)
    })

    it.each([[8, 'bite telegraph'], [9, 'bite'], [10, 'awake hop chase']])('state %i (%s): HP bar and shadow show like any zombie', (state) => {
      mimicAt(state)
      expect(bar().count).toBe(1)
      expect(nonZeroInstances(bar())).toBe(1)
      expect(drawnShadowInstances()).toBe(1)
    })

    it('a sleeping mimic hides only itself: other Mini zombies next to it keep their bar and shadow', () => {
      clearPool(); spawn('E91', 1); spawn('E90', 2); spawn('E89', 3)
      enemyPool.state[enemyPool.highestActive - 2] = 7
      instanceFrame({}, 0.016)
      expect(bar().count).toBe(2)
      expect(drawnShadowInstances()).toBe(2)
      // Other Mini types in their own approach state (7) are never treated as disguised.
      clearPool(); spawn('E90', 2); enemyPool.state[enemyPool.highestActive] = 7; enemyPool.spawnTimer[enemyPool.highestActive] = 100
      instanceFrame({}, 0.016)
      expect(smoke().count).toBe(1)
    })
  })

  it('MiniZombieLayer draws nothing for zombies outside 94-111', () => {
    clearPool(); spawn('E01', 1); spawn(BLOCKY_ZOMBIE_TYPES[0], 2)
    miniFrame({}, 0.016)
    expect(miniDrawn().bodies).toHaveLength(0)
  })

  it('E105 pair partners get different bodies from the behaviour partner link; unpaired falls back to slot parity', () => {
    const partner = new Int16Array(200).fill(-1); partner[4] = 9; partner[9] = 4
    const runtime = { novel2: { partner } }
    expect(pickMiniVariant(enemyPool, 4, 'n2-three-legged', 2, runtime)).toBe(0)
    expect(pickMiniVariant(enemyPool, 9, 'n2-three-legged', 2, runtime)).toBe(1)
    expect(pickMiniVariant(enemyPool, 7, 'n2-three-legged', 2, runtime)).toBe(1)
    expect(pickMiniVariant(enemyPool, 7, 'n2-class-president', 1, runtime)).toBe(0)
  })

  it.each(types)('%s draws a non-zero body', (type) => {
    clearPool(); spawn(type, 1)
    frameCb({}, 0.016)
    expect(drawnBodyInstances()).toBeGreaterThan(0)
  })

  it('E07 beyond the face-layer slots still gets a body', () => {
    clearPool()
    const extra = 4
    for (let i = 0; i < PROCEDURAL_FACE_ZOMBIE_CAPACITY + extra; i++) spawn('E07', -8 + i * 0.5)
    frameCb({}, 0.016)
    expect(drawnBodyInstances()).toBeGreaterThan(0)
  })

  // 2026-11-19 look variants: every E07 gets the smile face — look 0 in the face layer, looks 1-3
  // (and any face-layer overflow) as an instanced face quad on the instanced body.
  it('every E07 on screen gets a smile face (26 alive = measured worst)', async () => {
    const { isProceduralFaceZombieCandidate } = await import('./PooledEnemyVisuals.js')
    const { screenBounds } = await import('../lib/refs.js')
    clearPool()
    // Spawn into recycled slots too (the free list is LIFO), so set the reveal timer on each handle.
    for (let i = 0; i < 26; i++) {
      const handle = {}
      enemyPool.spawnInto(handle, { type: 'E07', x: -6 + i * 0.45, y: 0, z: 1, hp: 10, maxHp: 10, visualScale: 1 })
      enemyPool.spawnTimer[handle.index] = 5000
    }
    instanceFrame({}, 0.016)
    let faceLayer = 0
    for (let i = 0; i <= enemyPool.highestActive; i++) if (isProceduralFaceZombieCandidate(enemyPool, i, screenBounds)) faceLayer++
    const instancedFaces = meshes.find((mesh) => mesh.name === 'e07-instanced-face')
    expect(faceLayer).toBeLessThanOrEqual(PROCEDURAL_FACE_ZOMBIE_CAPACITY)
    expect(faceLayer + nonZeroInstances(instancedFaces)).toBe(26)
  })
})

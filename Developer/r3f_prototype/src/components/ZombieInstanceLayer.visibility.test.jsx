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
vi.mock('../lib/studioRuntimeState.js', async (orig) => ({ ...(await orig()), getFirebaseStudioRuntimeState: () => ({ datasets: {}, revision: 1 }) }))

globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } }
const { default: ZombieInstanceLayer } = await import('./ZombieInstanceLayer.jsx')
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
const blockyMeshes = collect(BlockyZombieLayer({ resetKey: 0 }))
const blockyFrame = frameCb
frameCb = instanceFrame
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
  const types = ENEMY_TYPE_NAMES.filter((name, code) => name && !/^B\d+$/.test(name) && name !== 'E07' && !isExpansionNormalCode(code) && !blocky.has(name))

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
})

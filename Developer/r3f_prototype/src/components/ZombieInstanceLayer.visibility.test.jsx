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

const tree = ZombieInstanceLayer({ resetKey: 0 })
studioEffects.forEach((f) => f())
const meshes = collect(tree)
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

describe('ZombieInstanceLayer body visibility after studio hydrate', () => {
  playerPos.set(0, 0, 0)
  // E07은 얼굴 레이어, 17-31은 확장 레이어, 보스(B01~B10)는 보스 전용 컴포넌트가 그린다(풀 경로 아님).
  const types = ENEMY_TYPE_NAMES.filter((name, code) => name && !/^B\d+$/.test(name) && name !== 'E07' && !isExpansionNormalCode(code))

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

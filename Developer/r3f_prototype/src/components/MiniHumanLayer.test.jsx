// 사람 구경꾼 레이어: 빈 목록 = 아무것도 안 그림, 고정 배치(fixture) = 그 몸이 원래 색으로 그려지고, 결정적이고, 적 풀과 무관. 2026-11-15, threemini.
// ZombieInstanceLayer.visibility.test.jsx와 같은 방식: React 훅·R3F·drei를 흉내 내고 실제 굽힌 GLB를 넘긴다.
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

let frameCb = null
vi.mock('react', async (orig) => {
  const real = await orig()
  return { ...real, useMemo: (f) => f(), useRef: (v) => ({ current: v }), useEffect: () => {}, useLayoutEffect: (f) => { f() } }
})
vi.mock('../lib/toon.js', async (orig) => ({ ...(await orig()), getToonGradient: () => new THREE.DataTexture(new Uint8Array(4), 1, 1) }))
vi.mock('@react-three/fiber', () => ({ useFrame: (cb) => { frameCb = cb } }))
const miniGltf = vi.hoisted(() => ({ value: null }))
vi.mock('@react-three/drei', () => { const useGLTF = () => miniGltf.value; useGLTF.preload = () => {}; return { useGLTF } })

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
const { default: MiniHumanLayer, groupMiniHumanPlacements } = await import('./MiniHumanLayer.jsx')
const { MINI_HUMAN_PLACEMENTS, MINI_HUMAN_DRAW_CALLS_PER_LOOK, miniHumanNativeSkin } = await import('../lib/miniHumanRoster.js')
const { MINI_PALETTE_SLOTS, miniPaletteKeyAt } = await import('../lib/miniZombieRoster.js')
const { enemyPool } = await import('../lib/refs.js')

const ZOMBIE_SLOTS = new Set(MINI_PALETTE_SLOTS.map(([name]) => name).filter((name) => name !== 'eye' && name !== 'mouth'))
const FIXTURE = Object.freeze([
  Object.freeze({ look: 'female-c', x: -46.9, z: -20, yaw: 0.6 }),
  Object.freeze({ look: 'male-d', skin: 'r2c1', x: -46.9, z: -18, pose: 'cower' }),
  Object.freeze({ look: 'female-c', x: -46.9, z: -16, yaw: -0.4, height: 0.6 }),
])

function mount(placements, stencilRef) {
  const outer = MiniHumanLayer({ placements, stencilRef })
  if (outer === null) return null
  const inner = outer.props.children.props.children // ErrorBoundary > Suspense > inner
  const root = inner.type(inner.props).props.object
  return { root, frame: frameCb }
}
function meshes(root) {
  const out = []
  root.traverse((node) => { if (node instanceof THREE.InstancedMesh) out.push(node) })
  return out
}
function keysOf(geometry) {
  const keys = new Set(); const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i += 1) keys.add(miniPaletteKeyAt(uv.getX(i), uv.getY(i)))
  return keys
}

describe('MiniHumanLayer', () => {
  it('빈 목록(지금 타이틀·스테이지 1~6)은 null — 메시·드로콜 0, 화면 변화 없음', () => {
    for (const [key, list] of Object.entries(MINI_HUMAN_PLACEMENTS)) if (list.length === 0) expect(MiniHumanLayer({ placements: list }), key).toBe(null)
    expect(MiniHumanLayer({ placements: [] })).toBe(null)
    expect(MiniHumanLayer({ placements: undefined })).toBe(null)
  })

  it('고정 배치: 모습마다 한 세트(파트 6 × 몸통·외곽선), 같은 모습 둘은 한 세트의 인스턴스 2개', () => {
    const groups = groupMiniHumanPlacements(FIXTURE)
    expect(groups.map((g) => [g.key, g.members.length])).toEqual([['human:female-c:orig', 2], ['human:male-d:r2c1', 1]])
    const { root } = mount(FIXTURE)
    const all = meshes(root)
    expect(all).toHaveLength(2 * MINI_HUMAN_DRAW_CALLS_PER_LOOK)
    const outlines = all.filter((m) => m.material.side === THREE.BackSide)
    expect(outlines).toHaveLength(all.length / 2)
    for (const mesh of all) expect(mesh.material.stencilRef).toBe(1)
    const bodies = all.filter((m) => m.material.side !== THREE.BackSide)
    for (const mesh of bodies) expect(mesh.material).toBeInstanceOf(THREE.MeshToonMaterial) // 툰 + 외곽선 유지
    expect(bodies.filter((m) => m.name.startsWith('mini-human-human:female-c:orig')).every((m) => m.count === 2)).toBe(true)
    expect(bodies.filter((m) => m.name.startsWith('mini-human-human:male-d:r2c1')).every((m) => m.count === 1)).toBe(true)
  })

  it('고정 배치의 몸이 원래 색이다: female-c 원래 피부 칸, male-d는 피부만 r2c1, 좀비 슬롯 0', () => {
    const { root } = mount(FIXTURE)
    const bodies = meshes(root).filter((m) => m.material.side !== THREE.BackSide)
    const female = new Set(); const male = new Set()
    for (const mesh of bodies) {
      const target = mesh.name.includes('female-c') ? female : male
      for (const key of keysOf(mesh.geometry)) target.add(key)
    }
    expect(female.has(miniHumanNativeSkin('female-c'))).toBe(true)
    expect(male.has('r2c1')).toBe(true)
    expect(male.has(miniHumanNativeSkin('male-d'))).toBe(false)
    for (const key of [...female, ...male]) expect(ZOMBIE_SLOTS.has(key), key).toBe(false)
  })

  it('결정적: Math.random 없이 같은 시각이면 같은 행렬, 적 풀은 건드리지 않는다', () => {
    const { root, frame } = mount(FIXTURE)
    const snapshot = () => meshes(root).map((m) => Array.from(m.instanceMatrix.array.slice(0, m.count * 16)))
    const poolBefore = Array.from(enemyPool.active)
    const random = vi.spyOn(Math, 'random')
    frame({ clock: { elapsedTime: 3.2 } })
    const first = snapshot()
    frame({ clock: { elapsedTime: 7.7 } })
    const later = snapshot()
    frame({ clock: { elapsedTime: 3.2 } })
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
    expect(snapshot()).toEqual(first)
    expect(later).not.toEqual(first)
    expect(first.flat().every(Number.isFinite)).toBe(true)
    expect(Array.from(enemyPool.active)).toEqual(poolBefore)
    // 인스턴스 위치가 배치 자리 근처다(첫 번째 female-c 몸통 = x −46.9, z −20).
    const torso = meshes(root).find((m) => m.name === 'mini-human-human:female-c:orig-torso')
    const m = new THREE.Matrix4(); torso.getMatrixAt(0, m)
    const p = new THREE.Vector3().setFromMatrixPosition(m)
    expect(Math.hypot(p.x + 46.9, p.z + 20)).toBeLessThan(0.3)
  })

  it('타이틀은 캐릭터 스텐실 값을 넘겨 받는다', () => {
    const { root } = mount(FIXTURE.slice(0, 1), 2)
    for (const mesh of meshes(root)) expect(mesh.material.stencilRef).toBe(2)
  })
})

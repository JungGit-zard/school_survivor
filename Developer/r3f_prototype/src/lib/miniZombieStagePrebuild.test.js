// @vitest-environment node
// 2차 좀비(E89~E106) 몸 세트는 스테이지 진입 때(프레임 루프 밖) 미리 만들어지고, 첫 스폰 프레임에서는 만들지 않는다.
// 2026-11-17 끊김 수정(첫 등장 프레임에서 변형 빌드 4~34 ms) 회귀 방지. + 프레임마다 할당 없는 업로드 범위 · E92 키 캐시.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { NOVEL2_ROWS } from './novelZombie2Content.js'
import { getBurstEventsForStage } from './burstEvents.js'
import { MINI_ZOMBIE_VISUALS } from './miniZombieRoster.js'
import { markInstanceUpload } from './templateInstanceLayer.js'
import { createNovel2Runtime } from './novelZombie2Behavior.js'

// MiniZombieLayer는 drei useGLTF로 GLB를 미리 부른다 — 이 테스트는 장면을 직접 읽는다.
vi.mock('@react-three/drei', () => { const useGLTF = () => null; useGLTF.preload = () => {}; return { useGLTF } })
// 툰 그라디언트는 캔버스(브라우저)로 만든다 — node에서는 자리표시.
vi.mock('./toon.js', async (importOriginal) => ({ ...(await importOriginal()), getToonGradient: () => null }))

const GLB_URL = new URL('../assets/models/kenney_mini/mini_zombies_kenney.glb', import.meta.url)
let _gltf = null
async function loadScene() {
  if (_gltf) return _gltf.scene
  const bytes = readFileSync(GLB_URL)
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  loader.register(() => ({ name: 'test_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }))
  await MeshoptDecoder.ready
  _gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject))
  return _gltf.scene
}

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']

describe('2차 좀비 스테이지 몸 미리 만들기', () => {
  it('스테이지 몸 목록 = 그 스테이지 행 + 스폰 표의 2차 좀비, 몸 번호 전부', async () => {
    const { miniZombieStageVariants } = await import('../components/MiniZombieLayer.jsx')
    for (const stageId of STAGES) {
      const list = miniZombieStageVariants(stageId)
      const keys = new Set(list.map(([visualId, k]) => `${visualId}#${k}`))
      const expected = new Set()
      for (const row of Object.values(NOVEL2_ROWS)) if (row.stageId === stageId) expected.add(row.visualId)
      for (const evt of getBurstEventsForStage(stageId)) for (const type of [evt.type, ...(evt.mixedTypes ?? [])]) if (NOVEL2_ROWS[type]) expected.add(NOVEL2_ROWS[type].visualId)
      expect(expected.size, stageId).toBeGreaterThan(0)
      for (const visualId of expected) {
        MINI_ZOMBIE_VISUALS[visualId].variants.forEach((_, k) => expect(keys.has(`${visualId}#${k}`), `${stageId} ${visualId}#${k}`).toBe(true))
      }
      expect(keys.size, stageId).toBe(list.length) // 중복 없음
    }
  })

  it('스테이지 진입 뒤 그 스테이지의 어떤 몸이 첫 스폰돼도 프레임 경로는 빌드하지 않는다', async () => {
    const { createMiniZombieLayerState, prebuildMiniZombieStage, getMiniVariantSet, miniZombieStageVariants } = await import('../components/MiniZombieLayer.jsx')
    const scene = await loadScene()
    for (const stageId of STAGES) {
      const state = createMiniZombieLayerState(scene)
      const assets = state.assets
      const original = assets.variant
      let builds = 0
      assets.variant = (...args) => { builds += 1; return original.apply(assets, args) }
      try {
        const made = prebuildMiniZombieStage(state, stageId)
        const list = miniZombieStageVariants(stageId)
        expect(made, stageId).toBe(list.length)
        const buildsAfterPrebuild = builds
        const setsAfterPrebuild = state.sets.length
        // 프레임 경로(첫 스폰): 이미 있는 세트를 돌려줄 뿐 — 빌드·메시 생성 0.
        for (const [visualId, k] of list) {
          const set = getMiniVariantSet(state, visualId, k)
          expect(set.meshes.length, `${visualId}#${k}`).toBeGreaterThan(0)
          expect(set.meshes.every((mesh) => mesh.isInstancedMesh)).toBe(true)
        }
        expect(builds, stageId).toBe(buildsAfterPrebuild)
        expect(state.sets.length, stageId).toBe(setsAfterPrebuild)
        // 재진입(같은 스테이지 다시)은 아무것도 새로 만들지 않는다.
        expect(prebuildMiniZombieStage(state, stageId)).toBe(0)
      } finally {
        assets.variant = original
      }
    }
  })

  it('지오메트리는 장면 캐시라 레이어를 다시 만들어도(캔버스 재마운트) 다시 빌드하지 않는다', async () => {
    const { createMiniZombieLayerState, prebuildMiniZombieStage } = await import('../components/MiniZombieLayer.jsx')
    const scene = await loadScene()
    const a = createMiniZombieLayerState(scene)
    prebuildMiniZombieStage(a, 'stage1')
    const b = createMiniZombieLayerState(scene)
    prebuildMiniZombieStage(b, 'stage1')
    expect(b.assets).toBe(a.assets)
    expect(b.sets.length).toBe(a.sets.length)
    b.sets.forEach((set, n) => expect(set.entries[0].part.geometry).toBe(a.sets[n].entries[0].part.geometry))
  })

  it('표 밖 몸도 프레임 경로 안전망으로 그대로 만들어진다', async () => {
    const { createMiniZombieLayerState, getMiniVariantSet, miniZombieStageVariants } = await import('../components/MiniZombieLayer.jsx')
    const scene = await loadScene()
    const state = createMiniZombieLayerState(scene)
    const [visualId, k] = miniZombieStageVariants('stage6')[0]
    const set = getMiniVariantSet(state, visualId, k)
    expect(state.sets).toEqual([set])
    expect(state.root.children).toContain(set.group)
  })
})

describe('프레임마다 할당 없는 업로드 범위', () => {
  it('markInstanceUpload는 속성마다 같은 범위 객체 1개를 다시 쓴다', () => {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(64), 16)
    markInstanceUpload(attr, 2, 16)
    const first = attr.updateRanges[0]
    expect(attr.updateRanges).toEqual([{ start: 0, count: 32 }])
    const version = attr.version
    markInstanceUpload(attr, 3, 16)
    expect(attr.updateRanges).toHaveLength(1)
    expect(attr.updateRanges[0]).toBe(first)
    expect(attr.updateRanges).toEqual([{ start: 0, count: 48 }])
    expect(attr.version).toBe(version + 1) // 매번 업로드 표시
  })
})

describe('E92 예고선 키', () => {
  it('슬롯·세대가 같으면 같은 문자열을 다시 쓰고, 세대가 바뀌면 새 키', () => {
    const behavior = createNovel2Runtime(4)
    const pool = { generation: new Int32Array(4) }
    pool.generation[2] = 7
    const key = behavior._trainLineKey(pool, 2)
    expect(key.endsWith('2:7')).toBe(true)
    expect(behavior._trainLineKey(pool, 2)).toBe(key)
    pool.generation[2] = 8
    expect(behavior._trainLineKey(pool, 2).endsWith('2:8')).toBe(true)
  })
})

// @vitest-environment node
// 감염 안 된 사람 구경꾼(Kenney Mini Characters CC0 원래 색): 표·원래 색·포즈 결정성·배치 안전·게임플레이 중립. 2026-11-15, threemini.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { createOutlineGeometry } from './projectileZombieShotGeometry.js'
import { MINI_BODY_IDS, MINI_PALETTE_SLOTS, MINI_PART_KEYS, MINI_ZOMBIE_VISUALS, miniPaletteKeyAt } from './miniZombieRoster.js'
import { buildMiniVariant, readMiniZombieScene } from './miniZombieGeometry.js'
import {
  MINI_HUMAN_BODY_IDS, MINI_HUMAN_DRAW_CALLS_PER_LOOK, MINI_HUMAN_MAX_LOOKS_PER_SCENE, MINI_HUMAN_PLACEMENTS, MINI_HUMAN_POSES,
  MINI_HUMAN_SCENE_KEYS, MINI_HUMAN_SKIN_CELLS, MINI_HUMAN_STAGE_HEIGHT, getMiniHumanPlacements, miniHumanLookKey,
  miniHumanNativeSkin, miniHumanPlacementShapeProblems, miniHumanSceneProblems, miniHumanVariant,
} from './miniHumanRoster.js'
import { composeMiniHumanParts, createMiniHumanPose, fillMiniHumanPose, miniHumanSeed } from './miniHumanPose.js'
import { MINI_HUMAN_EXIT_CLEARANCE, MINI_HUMAN_PLAYER_START_CLEARANCE, miniHumanPlacementProblems } from './miniHumanPlacementSafety.js'
import { getStageBounds, getStageConfig } from './stageConfig.js'
import { getPlayerStartPosition } from './playerStartPosition.js'
import { getStageObjectColliders } from '../components/StageObjects/stageObjectColliders.js'
import { ENEMY_VISUAL_WORLD_SCALE } from '../components/PooledEnemyVisuals.js'
import { ENEMY_TYPE_NAMES } from './enemyEntityPool.js'

const GLB_URL = new URL('../assets/models/kenney_mini/mini_zombies_kenney.glb', import.meta.url)
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const STAGES = MINI_HUMAN_SCENE_KEYS.filter((key) => key !== 'title')
// 좀비용으로 굽힌 팔레트 슬롯 전부(눈·입 기본 슬롯 'eye'·'mouth'만 팩 원래 진회색이라 사람도 쓴다).
const ZOMBIE_SLOTS = new Set(MINI_PALETTE_SLOTS.map(([name]) => name).filter((name) => name !== 'eye' && name !== 'mouth'))

let _raw = null
async function loadRaw() {
  if (_raw) return _raw
  const bytes = readFileSync(GLB_URL)
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  loader.register(() => ({ name: 'test_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }))
  await MeshoptDecoder.ready
  const gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject))
  _raw = readMiniZombieScene(gltf.scene)
  return _raw
}

function paletteKeys(built) {
  const keys = new Set()
  for (const part of built.parts) {
    const uv = part.geometry.attributes.uv
    for (let i = 0; i < uv.count; i += 1) keys.add(miniPaletteKeyAt(uv.getX(i), uv.getY(i)))
  }
  return keys
}

describe('사람 표(miniHumanRoster)', () => {
  it('사람 몸 = 팩 몸 15명 중 좀비 몸을 뺀 14명, 피부 칸 3개, 포즈 2개', () => {
    expect(MINI_HUMAN_BODY_IDS).toHaveLength(14)
    expect(MINI_HUMAN_BODY_IDS).not.toContain('zombie')
    expect(MINI_HUMAN_BODY_IDS).not.toContain('textbook')
    for (const body of MINI_HUMAN_BODY_IDS) expect(MINI_BODY_IDS).toContain(body)
    expect(MINI_HUMAN_SKIN_CELLS).toEqual(['r2c1', 'r2c3', 'r2c5'])
    expect(MINI_HUMAN_POSES).toEqual(['idle', 'cower'])
  })

  it('원래 색 변형은 칸 옮기기가 하나도 없고(몸만), 피부 변형은 피부만 팩 피부 칸으로 바꾼다', () => {
    for (const look of MINI_HUMAN_BODY_IDS) {
      expect(miniHumanVariant({ look, x: 0, z: 0 })).toEqual({ body: look })
      expect(miniHumanVariant({ look, skin: miniHumanNativeSkin(look), x: 0, z: 0 })).toEqual({ body: look })
      const other = MINI_HUMAN_SKIN_CELLS.find((cell) => cell !== miniHumanNativeSkin(look))
      expect(miniHumanVariant({ look, skin: other, x: 0, z: 0 })).toEqual({ body: look, skin: other })
    }
  })

  it('모습 열쇠는 좀비 visualId와 겹치지 않고, 원래 피부를 고르면 원래 색과 같은 세트다', () => {
    expect(miniHumanLookKey({ look: 'female-a' })).toBe('human:female-a:orig')
    expect(miniHumanLookKey({ look: 'female-a', skin: 'r2c3' })).toBe('human:female-a:orig')
    expect(miniHumanLookKey({ look: 'female-a', skin: 'r2c1' })).toBe('human:female-a:r2c1')
    for (const look of MINI_HUMAN_BODY_IDS) expect(MINI_ZOMBIE_VISUALS[miniHumanLookKey({ look })]).toBeUndefined()
  })

  it('배치 모양 검사: 좀비 몸·좀비 슬롯 피부·모르는 포즈·숫자 아닌 좌표를 거른다', () => {
    expect(miniHumanPlacementShapeProblems({ look: 'male-d', x: 1, z: 2 })).toEqual([])
    expect(miniHumanPlacementShapeProblems({ look: 'male-d', skin: 'r2c1', x: 1, z: 2, y: 0.1, yaw: 0.4, pose: 'cower', height: 0.6 })).toEqual([])
    expect(miniHumanPlacementShapeProblems({ look: 'zombie', x: 1, z: 2 })).not.toEqual([])
    expect(miniHumanPlacementShapeProblems({ look: 'male-d', skin: 'zGreen', x: 1, z: 2 })).not.toEqual([])
    expect(miniHumanPlacementShapeProblems({ look: 'male-d', pose: 'dance', x: 1, z: 2 })).not.toEqual([])
    expect(miniHumanPlacementShapeProblems({ look: 'male-d', x: Number.NaN, z: 2 })).not.toEqual([])
    const tooManyLooks = MINI_HUMAN_BODY_IDS.slice(0, MINI_HUMAN_MAX_LOOKS_PER_SCENE + 1).map((look, i) => ({ look, x: i, z: 0 }))
    expect(miniHumanSceneProblems(tooManyLooks).some((p) => p.includes('looks'))).toBe(true)
  })

  it('타이틀·스테이지 1~6 목록이 다 있고, 실린 배치는 모양·상한 검사를 통과한다', () => {
    expect(Object.keys(MINI_HUMAN_PLACEMENTS).sort()).toEqual([...MINI_HUMAN_SCENE_KEYS].sort())
    for (const key of MINI_HUMAN_SCENE_KEYS) {
      expect(getMiniHumanPlacements(key)).toBe(MINI_HUMAN_PLACEMENTS[key])
      expect(miniHumanSceneProblems(getMiniHumanPlacements(key)), key).toEqual([])
    }
    expect(getMiniHumanPlacements('no-such-stage')).toEqual([])
  })

  it('게임 기본 키 = 2차 좀비 기본 키(1.69 × ENEMY_VISUAL_WORLD_SCALE)', () => {
    expect(MINI_HUMAN_STAGE_HEIGHT).toBeCloseTo(1.69 * ENEMY_VISUAL_WORLD_SCALE, 3)
  })

  it('드로콜 상한: 모습 1개 = 파트 6 × 2, 장면 최대 48', () => {
    expect(MINI_HUMAN_DRAW_CALLS_PER_LOOK).toBe(MINI_PART_KEYS.length * 2)
    expect(MINI_HUMAN_DRAW_CALLS_PER_LOOK * MINI_HUMAN_MAX_LOOKS_PER_SCENE).toBe(48)
  })
})

describe('실제 GLB에서 사람 모습 = 팩 원래 색', () => {
  it('표의 원래 피부 칸이 GLB extras와 같다', async () => {
    const raw = await loadRaw()
    for (const look of MINI_HUMAN_BODY_IDS) expect(raw.bodies[look].skinCell, look).toBe(miniHumanNativeSkin(look))
  })

  it.each(MINI_HUMAN_BODY_IDS)('%s: 원래 색 — 팩 칸과 원래 눈·입만, 좀비 슬롯 0, 원래 피부 칸 그대로', async (look) => {
    const raw = await loadRaw()
    const built = buildMiniVariant(raw, miniHumanVariant({ look, x: 0, z: 0 }), createOutlineGeometry)
    expect(built.parts.map((p) => p.key)).toEqual([...MINI_PART_KEYS])
    expect(built.loose).toEqual([])
    const keys = paletteKeys(built)
    for (const key of keys) expect(/^r\d+c\d+$/.test(key) || key === 'eye' || key === 'mouth', `${look} ${key}`).toBe(true)
    for (const key of keys) expect(ZOMBIE_SLOTS.has(key), `${look} ${key}`).toBe(false)
    expect(keys.has(miniHumanNativeSkin(look)), `${look} native skin`).toBe(true)
    expect(keys.has('eye'), `${look} eye`).toBe(true)
    for (const part of built.parts) expect(part.outlineGeometry.attributes.position.count).toBe(part.geometry.attributes.position.count)
  })

  it.each(MINI_HUMAN_BODY_IDS)('%s: 피부만 바꾼 변형 — 원래 피부 칸이 사라지고 새 팩 피부 칸, 좀비 슬롯 0', async (look) => {
    const raw = await loadRaw()
    const skin = MINI_HUMAN_SKIN_CELLS.find((cell) => cell !== miniHumanNativeSkin(look))
    const keys = paletteKeys(buildMiniVariant(raw, miniHumanVariant({ look, skin, x: 0, z: 0 }), null))
    expect(keys.has(miniHumanNativeSkin(look)), `${look} old skin left`).toBe(false)
    expect(keys.has(skin), `${look} ${skin}`).toBe(true)
    for (const key of keys) expect(ZOMBIE_SLOTS.has(key), `${look} ${key}`).toBe(false)
  })
})

describe('사람 포즈·행렬 결정성', () => {
  it.each(MINI_HUMAN_POSES)('%s: 값이 유한하고, 같은 시각·순번이면 같은 값, 시간이 흐르면 움직인다', (pose) => {
    const a = Array.from(fillMiniHumanPose(createMiniHumanPose(), pose, 2.5, miniHumanSeed(3)))
    const b = Array.from(fillMiniHumanPose(createMiniHumanPose(), pose, 2.5, miniHumanSeed(3)))
    expect(a.every(Number.isFinite)).toBe(true)
    expect(a).toEqual(b)
    expect(Array.from(fillMiniHumanPose(createMiniHumanPose(), pose, 2.9, miniHumanSeed(3)))).not.toEqual(a)
  })

  it('웅크림은 두 팔을 머리 위로 들고 몸을 숙인다, 서 있기는 팔을 내린 채다(좀비처럼 앞으로 뻗지 않는다)', () => {
    const cower = fillMiniHumanPose(createMiniHumanPose(), 'cower', 1)
    expect(cower[9]).toBeLessThan(-2); expect(cower[12]).toBeLessThan(-2); expect(cower[6]).toBeGreaterThan(0.3)
    const idle = fillMiniHumanPose(createMiniHumanPose(), 'idle', 1)
    expect(Math.abs(idle[9])).toBeLessThan(0.2); expect(Math.abs(idle[12])).toBeLessThan(0.2)
  })

  it('배치 하나의 파트 행렬: Math.random 없이 같은 입력 → 같은 행렬, 발이 배치 자리, 키가 height', async () => {
    const raw = await loadRaw()
    const built = buildMiniVariant(raw, miniHumanVariant({ look: 'female-c', x: 0, z: 0 }), null)
    const placement = { look: 'female-c', x: 4.25, z: -7.5, yaw: 0.6, height: 0.8 }
    const random = vi.spyOn(Math, 'random')
    const pose = fillMiniHumanPose(createMiniHumanPose(), 'idle', 1.75, miniHumanSeed(0))
    const first = composeMiniHumanParts(built, placement, pose, []).map((m) => m.toArray())
    const second = composeMiniHumanParts(built, placement, pose, []).map((m) => m.toArray())
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
    expect(second).toEqual(first)
    const box = new THREE.Box3()
    built.parts.forEach((part, k) => {
      part.geometry.computeBoundingBox()
      box.union(part.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().fromArray(first[k])))
    })
    expect(box.min.y).toBeGreaterThan(-0.05); expect(box.min.y).toBeLessThan(0.05)
    expect(box.max.y).toBeGreaterThan(0.7); expect(box.max.y).toBeLessThan(0.8 * 1.3) // 머리 묶음·모자는 평균 키보다 높다
    const centre = box.getCenter(new THREE.Vector3())
    expect(Math.hypot(centre.x - 4.25, centre.z + 7.5)).toBeLessThan(0.3)
  })
})

describe('스테이지 배치 안전(콜라이더·프롭·플레이어 시작점·출구)', () => {
  // 벽 띠를 0.25u 격자로 훑어 통과하는 자리를 결정적으로 찾는다(테스트 전용 — 실제 배치는 손으로 적는다).
  function wallBandSpots(stageId) {
    const { halfX, halfZ } = getStageBounds(stageId)
    const spots = []
    for (let x = -halfX; x <= halfX; x += 0.25) {
      for (let z = -halfZ; z <= halfZ; z += 0.25) {
        if (Math.abs(x) < halfX - 2 && Math.abs(z) < halfZ - 2) continue
        if (miniHumanPlacementProblems(stageId, { x, z }).length === 0) spots.push({ x, z })
      }
    }
    return spots
  }

  it.each(STAGES)('%s: 실린 배치는 모두 안전 검사를 통과한다', (stageId) => {
    for (const placement of getMiniHumanPlacements(stageId)) expect(miniHumanPlacementProblems(stageId, placement), JSON.stringify(placement)).toEqual([])
  })

  it.each(STAGES)('%s: 규칙을 다 지키는 벽·모서리 자리가 실제로 있다(규칙이 불가능하지 않다), 같은 입력이면 같은 결과', (stageId) => {
    const spots = wallBandSpots(stageId)
    expect(spots.length, stageId).toBeGreaterThan(10)
    expect(wallBandSpots(stageId)).toEqual(spots)
  })

  it.each(STAGES)('%s: 플레이어 시작점·맵 가운데(무작위 출구 범위)·맵 밖은 거른다', (stageId) => {
    const [sx, , sz] = getPlayerStartPosition(stageId)
    expect(miniHumanPlacementProblems(stageId, { x: sx, z: sz })).toContain('near the player start')
    expect(miniHumanPlacementProblems(stageId, { x: sx + MINI_HUMAN_PLAYER_START_CLEARANCE - 0.1, z: sz })).toContain('near the player start')
    expect(miniHumanPlacementProblems(stageId, { x: 0, z: 0 })).toContain('inside the random exit area')
    const { halfX } = getStageBounds(stageId)
    expect(miniHumanPlacementProblems(stageId, { x: halfX + 1, z: 0 })).toContain('outside the map')
  })

  it.each(STAGES)('%s: 프롭 콜라이더 위는 거른다', (stageId) => {
    const colliders = getStageObjectColliders(stageId)
    for (const collider of colliders.slice(0, 5)) {
      expect(miniHumanPlacementProblems(stageId, { x: collider.position[0], z: collider.position[2] }), collider.id).toContain('overlaps a prop collider')
    }
  })

  it('고정 출구 앵커(Stage 5 현관) 근처는 거른다', () => {
    const anchor = getStageConfig('stage5').portalAnchor
    expect(anchor).toBeTruthy()
    expect(miniHumanPlacementProblems('stage5', { x: anchor.x + MINI_HUMAN_EXIT_CLEARANCE - 0.2, z: anchor.z })).toContain('near the fixed exit')
  })
})

describe('게임플레이 중립', () => {
  const layerSource = read('../components/MiniHumanLayer.jsx')
  // 주석은 빼고 코드만 본다(주석은 '적 풀을 안 쓴다'처럼 이름을 설명에 쓴다).
  const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const dataSources = [layerSource, read('./miniHumanRoster.js'), read('./miniHumanPose.js'), read('./miniHumanPlacementSafety.js')].map(code)

  it('레이어·표·포즈는 Rapier·콜라이더·적 풀·런타임 refs를 쓰지 않고, Math.random·localStorage도 없다', () => {
    for (const source of dataSources) {
      expect(source).not.toMatch(/@react-three\/rapier|RigidBody|CuboidCollider|BallCollider|enemyPool|lib\/refs\.js|Math\.random|localStorage/)
    }
  })

  it('적 종류 표에 사람이 없다(적 풀·스폰·조준 대상이 아님)', () => {
    expect(ENEMY_TYPE_NAMES.length).toBeGreaterThan(17)
    for (const name of ENEMY_TYPE_NAMES) expect(String(name)).not.toMatch(/^human|^(female|male)-|^worker$/)
    for (const look of MINI_HUMAN_BODY_IDS) expect(ENEMY_TYPE_NAMES).not.toContain(miniHumanLookKey({ look }))
  })

  it('사람 모듈을 가져다 쓰는 곳은 그림 쪽(GameCanvas·TitleScene3D·레이어·포즈)과 테스트뿐이다', () => {
    const allowed = new Set(['components/GameCanvas.jsx', 'components/TitleScene3D.jsx', 'components/MiniHumanLayer.jsx', 'lib/miniHumanPose.js'])
    const importers = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) { if (name !== 'node_modules') walk(full); continue }
        if (!/\.(js|jsx)$/.test(name) || /\.test\.(js|jsx)$/.test(name)) continue
        const source = readFileSync(full, 'utf8')
        if (/from ['"][^'"]*(miniHumanRoster\.js|MiniHumanLayer\.jsx|miniHumanPose\.js|miniHumanPlacementSafety\.js)['"]/.test(source)) importers.push(full.slice(SRC_DIR.length).replace(/\\/g, '/'))
      }
    }
    walk(SRC_DIR)
    for (const file of importers) expect(allowed.has(file), file).toBe(true)
    expect(importers).toEqual(expect.arrayContaining(['components/GameCanvas.jsx', 'components/TitleScene3D.jsx']))
  })

  it('GameCanvas는 물리 트리(Physics) 밖에, 타이틀은 캐릭터 외곽선 묶음 밖에 단다', () => {
    const canvas = read('../components/GameCanvas.jsx')
    expect(canvas.indexOf('<MiniHumanLayer placements={getMiniHumanPlacements(currentStageId)} />')).toBeGreaterThan(canvas.indexOf('</Physics>'))
    const title = read('../components/TitleScene3D.jsx')
    const at = title.indexOf("<MiniHumanLayer placements={getMiniHumanPlacements('title')} stencilRef={TITLE_CHARACTER_STENCIL_REF} />")
    expect(at).toBeGreaterThan(title.indexOf('</TitleCharacterOutlineGroup>'))
  })
})

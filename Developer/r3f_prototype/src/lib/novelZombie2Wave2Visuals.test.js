// @vitest-environment node
// 2차 신규 좀비 wave 2(E90·E91·E92·E95) 그리기 쪽 계약. 2026-11-15, threemini.
// 못박는 것: E95 줄은 줄 스냅샷 고정 양끝에 그리고 내려침 띠 = 피해 선(0.5u, 같은 양끝) · E91 미믹 단서(진짜 교과서 × 1.15, 빨간 책장)와
// 깡충 포즈가 행동 박자와 같다 · 물기 원 = r 1.0u · E92 돌진선은 빨강(피해 예고), 피해 0 안내는 노랑, 보스 색은 그대로 ·
// E95 두 몸 = female-c + male-g.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { EnemyEntityPool, ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import { ENEMY_RUNTIME_HP, ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime } from './enemySimulation.js'
import { clearExpansionAttacks, expansionAttackSnapshots } from './expansionAttackRuntime.js'
import { expansionAuthoredPolygons } from './expansionAttackSafety.js'
import { E91_MIMIC, E92_TRAIN, E95_ROPE, N2_STATE_TELEGRAPH, makeZeroDamageSnapshot } from './novelZombie2Behavior.js'
import { NOVEL2_ZOMBIE_STATS } from './novelZombie2Content.js'
import { LONG_ROPE_VISUAL, longRopeInto, longRopeMatrixParts, longRopeStage } from './longRopeVisual.js'
import {
  MINI_MIMIC_SIZE_TELL, MINI_MODEL_HEIGHT, MINI_REAL_TEXTBOOK_WIDTH, MINI_TEXTBOOK_BODY_WIDTH, MINI_ZOMBIE_VISUALS,
  miniBodyWorldScale, miniPaletteKeyAt,
} from './miniZombieRoster.js'
import { MINI_MIMIC_HOP, MINI_POSE_BOB, createMiniPose, fillMiniZombiePose } from './miniZombiePose.js'
import { buildMiniVariant, readMiniZombieScene } from './miniZombieGeometry.js'
import { TEXTBOOK_SCALE } from './xpTextbookField.js'
import {
  EXPANSION_TELEGRAPH_FILL, NOVEL2_DAMAGE_TELEGRAPH_FILL, createExpansionTelegraphVisual, isNovel2DamageTelegraph,
} from '../components/expansion/expansionTelegraphs.js'
import { TELEGRAPH_FEATHER } from './telegraphStyle.js'

// MiniZombieLayer(훅 파일이 import한다)는 drei useGLTF로 GLB를 미리 부른다 — 이 테스트는 GLB 렌더가 필요 없다.
vi.mock('@react-three/drei', () => { const useGLTF = () => null; useGLTF.preload = () => {}; return { useGLTF } })

const DT = 1 / 60
const BOUNDS = { halfX: 7.5, halfZ: 19.2 }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

beforeEach(() => { clearExpansionAttacks() })
afterEach(() => { clearExpansionAttacks() })

function spawn(pool, id, x, z, { hp, spawnTimer = ENEMY_SPAWN_REVEAL_MS + 1, scale } = {}) {
  const life = hp ?? (ENEMY_RUNTIME_HP[ENEMY_TYPE_CODES[id]] || 10)
  const handle = pool.spawn({ type: id, x, y: 0, z, hp: life, maxHp: life, visualScale: (scale ?? 1) * ENEMY_SIZE_MULTIPLIER, spawnTimer })
  expect(handle, `${id} spawn`).not.toBeNull()
  return handle
}

function makeStep(runtime, pool) {
  return (player, stageId = 'stage1') => {
    runtime.step(pool, { delta: DT, playerX: player.x, playerZ: player.z, ...BOUNDS, elapsedSec: 30, activeProjectileCount: 0, stageId, onContact: () => {} })
  }
}

function snapshotOfType(type) {
  return [...expansionAttackSnapshots.values()].find((s) => s.type === type) ?? null
}

// 실제 행동 런타임으로 E95 줄 스냅샷을 만든다(wave 2 행동 테스트와 같은 배치: 두 몸 ±2.25, 플레이어 가운데).
function makeRope({ offsetX = 0.6, offsetZ = -1.3 } = {}) {
  const pool = new EnemyEntityPool()
  const runtime = createEnemySimulationRuntime()
  const step = makeStep(runtime, pool)
  const a = spawn(pool, 'E95', -2.25 + offsetX, offsetZ, { hp: 288, spawnTimer: 2000 })
  const b = spawn(pool, 'E95', 2.25 + offsetX, offsetZ + 0.4, { hp: 288, spawnTimer: 2000 })
  const player = { x: offsetX, z: offsetZ + 0.2 }
  for (let f = 0; f < 3 / DT && pool.state[a.index] !== N2_STATE_TELEGRAPH; f += 1) step(player, 'stage3')
  const rope = snapshotOfType('E95')
  expect(rope, 'rope snapshot').not.toBe(null)
  return { pool, runtime, step: () => step(player, 'stage3'), a, b, rope }
}

describe('E95 긴줄넘기 줄', () => {
  it('줄은 스냅샷 고정 양끝(A = origin, B = origin + dir × range)에 그리고, 내려침 띠는 피해 선과 양끝·폭이 같다', () => {
    const { rope } = makeRope()
    const [poly] = expansionAuthoredPolygons(rope) // 피해 판정 선(벽·장애물로 깎기 전 원형)
    // 선 사각형의 짧은 변 두 개 = 양끝. 짧은 변의 가운데 = 끝점, 길이 = 폭.
    const edges = poly.map((p, k) => [p, poly[(k + 1) % poly.length]]).map(([p, q]) => ({ mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], len: Math.hypot(q[0] - p[0], q[1] - p[1]) }))
    const shorts = edges.filter((e) => Math.abs(e.len - rope.widthUnits) < 1e-9)
    expect(shorts).toHaveLength(2)

    const slam = { ...rope, phase: 'active', elapsedMs: rope.windupMs + 10 }
    const r = longRopeInto({}, slam)
    expect(r.stage).toBe('slam')
    expect(r.width).toBe(E95_ROPE.ropeWidth)
    expect(r.width).toBe(rope.widthUnits)
    const ends = [[r.ax, r.az], [r.bx, r.bz]]
    for (const end of ends) expect(shorts.some((e) => Math.hypot(e.mid[0] - end[0], e.mid[1] - end[1]) < 1e-9), `end ${end}`).toBe(true)
    expect([r.ax, r.az]).toEqual(rope.originXZ)
    expect(r.span).toBe(rope.rangeUnits)
  })

  it('줄 양끝은 살아 있는 몸 위치가 아니라 고정 스냅샷이다(안전 구간에 몸이 걸어도 줄은 그대로)', () => {
    const ctx = makeRope()
    const before = longRopeInto({}, ctx.rope)
    const frozen = [before.ax, before.az, before.bx, before.bz]
    // 줄 전 구간(예고 0.9 + 내려침 0.3 + 안전 0.6초)을 진행한다. 안전 구간에 두 몸은 다시 움직인다.
    let sawSafe = false
    let bodyMoved = false
    const a0 = [ctx.pool.posX[ctx.a.index], ctx.pool.posZ[ctx.a.index]]
    for (let f = 0; f < 1.8 / DT; f += 1) {
      ctx.step()
      const live = expansionAttackSnapshots.get(ctx.rope.key)
      if (!live) break
      const r = longRopeInto({}, live)
      expect([r.ax, r.az, r.bx, r.bz]).toEqual(frozen)
      if (r.stage === 'safe') sawSafe = true
      if (Math.hypot(ctx.pool.posX[ctx.a.index] - a0[0], ctx.pool.posZ[ctx.a.index] - a0[1]) > 1e-3) bodyMoved = true
    }
    expect(sawSafe).toBe(true)
    void bodyMoved // 몸이 움직이든 말든 줄 양끝은 같다(위에서 매 프레임 확인)
  })

  it('높이: 예고 중 높이 든다 > 안전 구간 떠 있음 > 내려침 바닥', () => {
    const { rope } = makeRope()
    const raised = longRopeInto({}, { ...rope, phase: 'windup', elapsedMs: rope.windupMs * 0.6 })
    const slam = longRopeInto({}, { ...rope, phase: 'active', elapsedMs: rope.windupMs + 1 })
    const safe = longRopeInto({}, { ...rope, phase: 'recovery', elapsedMs: rope.windupMs + rope.activeMs + 100 })
    expect(raised.stage).toBe('raised'); expect(safe.stage).toBe('safe')
    expect(raised.y).toBeGreaterThan(1.1)
    expect(safe.y).toBeGreaterThan(0.6); expect(safe.y).toBeLessThan(raised.y)
    expect(slam.y - slam.thickness / 2).toBeGreaterThanOrEqual(0) // 바닥 위
    expect(slam.y + slam.thickness / 2).toBeLessThan(0.1)
    expect(raised.width).toBeLessThan(0.1) // 든 줄은 가늘다(띠가 아니다)
  })

  it('한 몸이 죽으면 스냅샷이 지워지고 줄도 그 프레임에 사라진다', async () => {
    const { syncLongRopes } = await import('../components/LongRopeLayer.jsx')
    const ctx = makeRope()
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5), new THREE.MeshBasicMaterial(), LONG_ROPE_VISUAL.capacity)
    expect(syncLongRopes(mesh, expansionAttackSnapshots)).toBe(1)
    expect(mesh.visible).toBe(true)
    ctx.runtime.applyHitIndex(ctx.pool, ctx.b.index, ctx.b.generation, 1e9)
    ctx.step()
    expect(snapshotOfType('E95')).toBe(null)
    expect(syncLongRopes(mesh, expansionAttackSnapshots)).toBe(0)
    expect(mesh.visible).toBe(false)
  })

  it('인스턴스 행렬이 단위 줄(z 0..1)의 양끝을 정확히 A·B로, 폭을 0.5u로 옮긴다(드로콜 1개)', async () => {
    const { syncLongRopes, createLongRopeGeometry } = await import('../components/LongRopeLayer.jsx')
    const { rope } = makeRope({ offsetX: -1.1, offsetZ: 2.3 })
    const geometry = createLongRopeGeometry()
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), LONG_ROPE_VISUAL.capacity)
    const slam = { ...rope, phase: 'active', elapsedMs: rope.windupMs + 5 }
    expect(syncLongRopes(mesh, [slam])).toBe(1)
    const m = new THREE.Matrix4(); mesh.getMatrixAt(0, m)
    const a = new THREE.Vector3(0, 0, 0).applyMatrix4(m)
    const b = new THREE.Vector3(0, 0, 1).applyMatrix4(m)
    const side = new THREE.Vector3(0.5, 0, 0).applyMatrix4(m).sub(a)
    const [ox, oz] = rope.originXZ; const [dx, dz] = rope.directionXZ
    expect(a.x).toBeCloseTo(ox, 6); expect(a.z).toBeCloseTo(oz, 6)
    expect(b.x).toBeCloseTo(ox + dx * rope.rangeUnits, 6); expect(b.z).toBeCloseTo(oz + dz * rope.rangeUnits, 6)
    expect(side.length() * 2).toBeCloseTo(E95_ROPE.ropeWidth, 6)
    expect(side.dot(new THREE.Vector3(dx, 0, dz))).toBeCloseTo(0, 6) // 폭은 줄과 직각
    // 몸통 + 외곽선 껍질이 지오메트리 하나(재질 하나 = 드로콜 1개). 껍질은 aOutline 1, 감김이 뒤집혀 있다.
    expect(geometry.groups.length).toBeLessThanOrEqual(1)
    const flags = geometry.attributes.aOutline.array
    expect([...new Set(flags)].sort()).toEqual([0, 1])
    expect(longRopeMatrixParts(longRopeInto({}, slam)).scale).toEqual([rope.widthUnits, LONG_ROPE_VISUAL.slamThickness, rope.rangeUnits])
  })

  it('줄이 아닌 스냅샷(다른 종·끝난 단계)은 그리지 않는다', () => {
    const { rope } = makeRope()
    expect(longRopeStage({ ...rope, type: 'E92' })).toBe(null)
    expect(longRopeStage({ ...rope, phase: 'done' })).toBe(null)
    expect(longRopeInto({}, { ...rope, rangeUnits: Number.NaN })).toBe(null)
  })

  it('pickVariant: 짝 두 몸은 female-c(줄 주인 = 낮은 슬롯) 하나와 male-g 하나', async () => {
    const { novel2PickVariant } = await import('../components/miniZombieHooks.js')
    const { pool, runtime, a, b } = makeRope()
    const visual = MINI_ZOMBIE_VISUALS['n2-long-rope-duo']
    const bodies = [a.index, b.index].map((i) => visual.variants[novel2PickVariant(pool, i, 'n2-long-rope-duo', visual.variants.length, runtime)].body)
    expect(bodies.sort()).toEqual(['female-c', 'male-g'])
    const low = Math.min(a.index, b.index)
    expect(visual.variants[novel2PickVariant(pool, low, 'n2-long-rope-duo', 2, runtime)].body).toBe('female-c')
  })
})

describe('E91 교과서 미믹', () => {
  let _raw = null
  async function loadRaw() {
    if (_raw) return _raw
    const bytes = readFileSync(new URL('../assets/models/kenney_mini/mini_zombies_kenney.glb', import.meta.url))
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    loader.register(() => ({ name: 'test_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }))
    await MeshoptDecoder.ready
    const gltf = await new Promise((resolve, reject) => loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject))
    _raw = readMiniZombieScene(gltf.scene)
    return _raw
  }

  it('단서 ①: 렌더 가로 = 진짜 XP 교과서 가로 × 1.15(진짜 교과서 값은 XpTextbook 표지 0.36 × TEXTBOOK_SCALE)', async () => {
    expect(MINI_MIMIC_SIZE_TELL).toBe(1.15)
    expect(MINI_REAL_TEXTBOOK_WIDTH).toBeCloseTo(0.36 * TEXTBOOK_SCALE, 9)
    expect(read('../components/XpTextbook.jsx')).toContain('<boxGeometry args={[0.36, 0.04, 0.26]} />') // 표지(가장 넓은 판)
    const raw = await loadRaw()
    const visual = MINI_ZOMBIE_VISUALS['n2-textbook-mimic']
    const built = buildMiniVariant(raw, visual.variants[0], null)
    const box = new THREE.Box3()
    for (const part of built.parts) { part.geometry.computeBoundingBox(); box.union(part.geometry.boundingBox) }
    expect(box.max.x - box.min.x).toBeCloseTo(MINI_TEXTBOOK_BODY_WIDTH, 3) // 굽힌 표지 가로 = 표의 modelWidth
    const worldScale = miniBodyWorldScale(visual, 999) // pool 배율과 무관
    const rendered = (box.max.x - box.min.x) * (1.69 / MINI_MODEL_HEIGHT) * worldScale
    expect(rendered / MINI_REAL_TEXTBOOK_WIDTH).toBeCloseTo(1.15, 3)
    // 다른 종은 그대로 pool 배율
    expect(miniBodyWorldScale(MINI_ZOMBIE_VISUALS['n2-homework-collector'], 0.42)).toBe(0.42)
  })

  it('단서 ②: 책장 블록(가장자리)이 빨강 — 흰 책장 칸이 남지 않고, 눈은 빨간 입 안에서 보이는 크림색', async () => {
    const raw = await loadRaw()
    const built = buildMiniVariant(raw, MINI_ZOMBIE_VISUALS['n2-textbook-mimic'].variants[0], null)
    const keys = new Set()
    for (const part of built.parts) {
      const uv = part.geometry.attributes.uv
      for (let i = 0; i < uv.count; i += 1) keys.add(miniPaletteKeyAt(uv.getX(i), uv.getY(i)))
    }
    expect(keys.has('pagesWhite')).toBe(false)
    expect(keys.has('armRed')).toBe(true)
    expect(keys.has('bookBlue')).toBe(true) // 표지는 진짜 교과서처럼 파랑
    expect(keys.has('eyeCream')).toBe(true)
    expect(keys.has('eyeRed')).toBe(false)
  })

  it('깡충 추격 포즈(stun = 깨어남): 행동과 같은 박자(0.5초 중 0.3초 뜀), 뛸 때 뚜껑이 벌어지고 쉴 때 바닥', () => {
    expect(MINI_MIMIC_HOP.cycle * 1000).toBe(E91_MIMIC.hopCycleMs)
    expect(MINI_MIMIC_HOP.move * 1000).toBe(E91_MIMIC.hopMoveMs)
    const out = createMiniPose()
    const mid = Array.from(fillMiniZombiePose(out, 'mimic', 'stun', 10 + MINI_MIMIC_HOP.move / 2, false, 0.3))
    expect(mid[MINI_POSE_BOB]).toBeCloseTo(MINI_MIMIC_HOP.height, 6)
    expect(mid[15]).toBeLessThan(-0.8) // 뚜껑(head X) 쩍
    const rest = Array.from(fillMiniZombiePose(out, 'mimic', 'stun', 10 + MINI_MIMIC_HOP.move + 0.1, false, 0.3))
    expect(rest[MINI_POSE_BOB]).toBe(0)
    expect(rest[15]).toBeGreaterThan(-0.2)
    expect(mid.every(Number.isFinite) && rest.every(Number.isFinite)).toBe(true)
    // 잠든 미믹(평시)은 그대로 진짜 책처럼 납작
    expect(fillMiniZombiePose(out, 'mimic', 'normal', 1.5)[MINI_POSE_BOB]).toBe(0)
  })

  it('물기 예고 원 = 피해 원(r 1.0u, 물기 자리 중심), 빨강', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const mimic = spawn(pool, 'E91', 1.2, 0, { spawnTimer: 2000 })
    for (let f = 0; f < 2 / DT && pool.state[mimic.index] !== N2_STATE_TELEGRAPH; f += 1) step({ x: 0, z: 0 })
    const bite = snapshotOfType('E91')
    expect(bite.rangeUnits).toBe(E91_MIMIC.biteRadius)
    expect(bite.rangeUnits).toBe(1.0)
    const root = createExpansionTelegraphVisual(bite)
    const [cx, cz] = bite.originXZ
    let maxR = 0
    root.traverse((n) => {
      if (!n.isMesh || n.name === TELEGRAPH_FEATHER.name) return // opaque core only — the 2026-11-22 soft feather lies outside it
      const p = n.geometry.attributes.position
      for (let i = 0; i < p.count; i += 1) maxR = Math.max(maxR, Math.hypot(p.getX(i) + root.position.x - cx, p.getZ(i) + root.position.z - cz))
    })
    expect(maxR).toBeCloseTo(1.0, 6)
    expect(root.userData.fillMat.color.getHexString()).toBe(new THREE.Color(NOVEL2_DAMAGE_TELEGRAPH_FILL.color).getHexString())
  })
})

describe('예고 색: 피해 예고 빨강 / 피해 0 안내 노랑 / 보스 그대로', () => {
  function makeTrainLine() {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool)
    const head = spawn(pool, 'E92', 0, 4.5, { hp: 53, scale: NOVEL2_ZOMBIE_STATS.E92.scale })
    step({ x: 0, z: 0 }, 'stage2')
    for (let i = 0; i <= pool.highestActive; i += 1) if (pool.active[i] && pool.type[i] === ENEMY_TYPE_CODES.E01) pool.despawnIndex(i, pool.generation[i])
    for (let f = 0; f < 6 / DT && pool.state[head.index] !== N2_STATE_TELEGRAPH; f += 1) step({ x: 0, z: 0 }, 'stage2')
    return snapshotOfType('E92')
  }
  const hex = (c) => new THREE.Color(c).getHexString()

  it('E92 기관사 돌진선(스냅샷 피해 0 + contactAttack 표식) = 빨강, 길이 6.2u·폭 1.1u', () => {
    const line = makeTrainLine()
    expect(line.damage).toBe(0)
    expect(line.contactAttack).toBe(true)
    expect(isNovel2DamageTelegraph(line)).toBe(true)
    const windup = createExpansionTelegraphVisual(line)
    expect(windup.userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    const active = createExpansionTelegraphVisual({ ...line, phase: 'active' })
    expect(active.userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.activeColor))
    expect(line.rangeUnits).toBe(E92_TRAIN.lineLength)
    expect(line.widthUnits).toBe(E92_TRAIN.lineWidth)
    // 빨간 채움이 그리는 면 = 피해 0이 아닌 선 기하(안전 다각형) — 길이 방향 끝까지 6.2u.
    const [ox, oz] = line.originXZ; const [dx, dz] = line.directionXZ
    let along = 0
    windup.traverse((n) => {
      if (!n.isMesh || n.name === TELEGRAPH_FEATHER.name) return // opaque core only — the 2026-11-22 soft feather lies outside it
      const p = n.geometry.attributes.position
      for (let i = 0; i < p.count; i += 1) along = Math.max(along, (p.getX(i) + windup.position.x - ox) * dx + (p.getZ(i) + windup.position.z - oz) * dz)
    })
    expect(along).toBeCloseTo(E92_TRAIN.lineLength, 4)
  })

  it('피해 0 안내(E89·E103 모양)는 노랑 그대로, novel2가 아닌 보스 예고도 노랑 그대로', () => {
    const info = makeZeroDamageSnapshot('t:e89', 'E89', 'e89_command', 'disk', 0, 0, 4, 0, 1200, 800, 0)
    expect(isNovel2DamageTelegraph(info)).toBe(false)
    expect(createExpansionTelegraphVisual(info).userData.fillMat.color.getHexString()).toBe(hex(EXPANSION_TELEGRAPH_FILL.color))
    const boss = { key: 'b', type: 'B06', id: 'b06_p1', shape: 'disk', originXZ: [0, 0], rangeUnits: 2, phase: 'windup', elapsedMs: 0, windupMs: 1000, damage: 20 }
    expect(isNovel2DamageTelegraph(boss)).toBe(false)
    expect(createExpansionTelegraphVisual(boss).userData.fillMat.color.getHexString()).toBe(hex(EXPANSION_TELEGRAPH_FILL.color))
    expect(createExpansionTelegraphVisual({ ...boss, phase: 'active' }).userData.fillMat.color.getHexString()).toBe(hex(EXPANSION_TELEGRAPH_FILL.activeColor))
  })

  it('E95 줄 내려침 예고도 빨강(피해 10)', () => {
    const { rope } = makeRope()
    expect(createExpansionTelegraphVisual(rope).userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
  })
})

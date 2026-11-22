// @vitest-environment node
// 2차 신규 좀비 wave 3 치프(E98 대식가 · E101 복사기 · E104 공굴리기 대장) 그리기 쪽 계약. 2026-11-16, threemini.
// + wave 3 둘째 묶음(E100 찹쌀떡 · E102 회전의자 · E106 기마전) 2026-11-17 — 파일 끝 describe 3개.
// 못박는 것: 굴러가는 공이 그려지고 그 중심 = 피해 판정 원 중심(반지름 0.9u 그대로) · 손의 공과 굴러가는 공은 한 레이어 한 모양(드로콜 1) ·
// 먹히는 잡몹은 흡입 동안 작아지며 입으로 · 복사본은 흰 종이색 · 복사기 스캔/부채꼴/용지 걸림 포즈가 서로 다르다 · 예고 색(피해 빨강,
// 피해 0 노랑) · 세 종 몸 세트 드로콜 12 · 대식가 큰 입 소품(코드 프리미티브, GLB 불변).
import { readFileSync } from 'node:fs'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { EnemyEntityPool, ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import { ENEMY_RUNTIME_HP, ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime } from './enemySimulation.js'
import { clearExpansionAttacks, expansionAttackSnapshots } from './expansionAttackRuntime.js'
import { EXPANSION_PLAYER_RADIUS } from './expansionAttackSafety.js'
import { E101_COPIER, E104_BALL, E98_EATER, N2_STATE_ATTACK, N2_STATE_STUN, N2_STATE_TELEGRAPH } from './novelZombie2Behavior.js'
import { NOVEL2_ZOMBIE_STATS } from './novelZombie2Content.js'
import {
  COPIER_JAM_BLINK, COPY_PAPER_COLORS, E104_BALL_VISUAL, E98_EATEN_VISUAL, copyPaperHex, eatenProgress, eatenVisualInto,
  isNovel2Copy, miniInstanceTintInto, miniPoseStyleFor, rollingBallInto,
} from './novelZombie2Wave3Visuals.js'
import { MINI_ZOMBIE_VISUALS, miniPaletteKeyAt } from './miniZombieRoster.js'
import { MINI_POSE_ROOT_ROLL, MINI_POSE_STYLES, createMiniPose, fillMiniZombiePose } from './miniZombiePose.js'
import { MINI_CODE_PROPS, buildMiniVariant, readMiniZombieScene } from './miniZombieGeometry.js'
import { EXPANSION_TELEGRAPH_FILL, NOVEL2_DAMAGE_TELEGRAPH_FILL, createExpansionTelegraphVisual } from '../components/expansion/expansionTelegraphs.js'
import { TELEGRAPH_FEATHER } from './telegraphStyle.js'
// wave 3 둘째 묶음(E100 찹쌀떡 · E102 회전의자 · E106 기마전, 2026-11-17)
import { E100_MOCHI, E102_CHAIR, E106_CAVALRY, N2_STATE_APPROACH, N2_STATE_RECOVER } from './novelZombie2Behavior.js'
import {
  E100_MOCHI_VISUAL, E102_CHAIR_VISUAL, E106_CAVALRY_VISUAL, cavalryLinkedRider, cavalryRiderCapScale, chairMotionInto,
  createMiniBodyTransform, createMochiDrawMemory, miniBodyTransformInto, mochiLeapLift, novel2BarLiftWorld,
} from './novelZombie2Wave3Visuals.js'
import { MINI_POSE_LIFT, MINI_POSE_ROOT_YAW, MINI_RIDER_LIFT } from './miniZombiePose.js'
import { MINI_HEAD_ANCHORS } from './miniZombieGeometry.js'

// MiniZombieLayer·RollingBallLayer는 drei useGLTF로 GLB를 미리 부른다 — 이 테스트는 GLB 렌더가 필요 없다.
vi.mock('@react-three/drei', () => { const useGLTF = () => null; useGLTF.preload = () => {}; return { useGLTF } })

const DT = 1 / 60
const S4 = { halfX: 9.36, halfZ: 16 }
const S5 = { halfX: 9.36, halfZ: 16 }
const S6 = { halfX: 12, halfZ: 20 }
const hex = (c) => new THREE.Color(c).getHexString()

beforeEach(() => { clearExpansionAttacks() })
afterEach(() => { clearExpansionAttacks() })

function spawn(pool, id, x, z, { hp, spawnTimer = ENEMY_SPAWN_REVEAL_MS + 1, scale } = {}) {
  const life = hp ?? (ENEMY_RUNTIME_HP[ENEMY_TYPE_CODES[id]] || 10)
  const handle = pool.spawn({ type: id, x, y: 0, z, hp: life, maxHp: life, visualScale: (scale ?? 1) * ENEMY_SIZE_MULTIPLIER, spawnTimer })
  expect(handle, `${id} spawn`).not.toBeNull()
  return handle
}

function makeStep(runtime, pool, bounds, stageId) {
  return (player) => {
    let damage = 0
    runtime.step(pool, {
      delta: DT, playerX: player.x, playerZ: player.z, ...bounds, elapsedSec: 80, activeProjectileCount: 0, stageId,
      onContact: (_i, _g, _x, _y, _z, value) => { damage += value },
    })
    return damage
  }
}

function snapshotOf(type) { return [...expansionAttackSnapshots.values()].find((s) => s.type === type) }

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

// ── E104 공 ──────────────────────────────────────────────────────────────────
describe('E104 공굴리기 대장의 공', () => {
  function setup() {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S6, 'stage6')
    const captain = spawn(pool, 'E104', 0, 8, { hp: NOVEL2_ZOMBIE_STATS.E104.hp, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E104.scale })
    return { pool, runtime, step, captain }
  }

  it('굴러가는 공이 그려지고, 그린 공 중심 = 피해 판정 원 중심 — 플레이어가 맞는 순간 그린 공이 플레이어에 닿아 있다', async () => {
    const { syncRollingBalls, createRollingBallState } = await import('../components/RollingBallLayer.jsx')
    const ctx = setup()
    const player = { x: 0, z: 0 }
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial(), E104_BALL_VISUAL.capacity)
    const state = createRollingBallState()
    const m = new THREE.Matrix4(); const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3()
    const truth = {}
    let rollingFrames = 0
    let hitFrames = 0
    for (let f = 0; f < 6 / DT; f += 1) {
      const damage = ctx.step(player)
      expect(syncRollingBalls(mesh, ctx.pool, ctx.runtime, state, DT)).toBe(1)
      mesh.getMatrixAt(0, m); m.decompose(p, q, s)
      ctx.runtime.novel2.ballStateInto(ctx.pool, ctx.captain.index, truth)
      if (truth.phase === 2) {
        rollingFrames += 1
        expect(p.x).toBeCloseTo(truth.x, 6)
        expect(p.z).toBeCloseTo(truth.z, 6)
        expect(s.x).toBeCloseTo(E104_BALL.ballRadius * 2, 6) // 지름 = 판정 지름
        expect(p.y).toBeCloseTo(E104_BALL.ballRadius, 6) // 바닥에 닿아 굴러간다
      }
      if (damage > 0) {
        hitFrames += 1
        // 피해 판정: |플레이어 − 공 중심| ≤ r + 몸 반경. 그린 공도 바로 거기 있다.
        expect(Math.hypot(p.x - player.x, p.z - player.z)).toBeLessThanOrEqual(E104_BALL.ballRadius + EXPANSION_PLAYER_RADIUS + 1e-6)
      }
    }
    expect(rollingFrames).toBeGreaterThan(30)
    expect(hitFrames).toBe(1)
  })

  it('든 공(0·1)은 대장 앞 1.2u, 겨눔은 떨리고, 멈춘 공(3)은 behavior 자리 그대로 바닥에 있다', () => {
    const ctx = setup()
    const out = {}
    const i = ctx.captain.index
    expect(rollingBallInto(out, ctx.pool, i, ctx.runtime, 0)).toBe(true)
    expect(out.held).toBe(true)
    const yaw = ctx.pool.yaw[i]
    expect(Math.hypot(out.x - ctx.pool.posX[i], out.z - ctx.pool.posZ[i])).toBeCloseTo(E104_BALL_VISUAL.heldAhead, 6)
    expect(out.x - ctx.pool.posX[i]).toBeCloseTo(Math.sin(yaw) * 1.2, 6)
    expect(E104_BALL_VISUAL.heldAhead).toBe(MINI_ZOMBIE_VISUALS['n2-ball-roll-captain'].variants[0].loose[0].offset[2])
    // 겨눔
    for (let f = 0; f < 4 / DT && ctx.pool.state[i] !== N2_STATE_TELEGRAPH; f += 1) ctx.step({ x: 0, z: 0 })
    expect(ctx.runtime.novel2.ballPhase[i]).toBe(1)
    const a = {}; const b = {}
    rollingBallInto(a, ctx.pool, i, ctx.runtime, 0.01); rollingBallInto(b, ctx.pool, i, ctx.runtime, 0.04)
    expect(a.held && b.held).toBe(true)
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.01)
    // 굴림 끝 → 바닥
    for (let f = 0; f < 6 / DT && ctx.runtime.novel2.ballPhase[i] !== 3; f += 1) ctx.step({ x: 6, z: 0 })
    expect(ctx.runtime.novel2.ballPhase[i]).toBe(3)
    const floor = {}
    expect(rollingBallInto(floor, ctx.pool, i, ctx.runtime, 0)).toBe(true)
    expect(floor.held).toBe(false)
    expect(floor.x).toBe(ctx.runtime.novel2.ballX[i]); expect(floor.z).toBe(ctx.runtime.novel2.ballZ[i])
  })

  it('굴러가는 공은 진행 방향으로 돈다(미끄러지지 않고 구른다: 회전각 = 이동거리 / 반지름)', async () => {
    const { syncRollingBalls, createRollingBallState } = await import('../components/RollingBallLayer.jsx')
    const pool = new EnemyEntityPool()
    const captain = spawn(pool, 'E104', 0, 0, { hp: 250, spawnTimer: 3000 })
    const i = captain.index
    const fake = { novel2: { phase: 2, x: 0, z: 0, ballStateInto(_p, _i, out) { out.phase = this.phase; out.x = this.x; out.z = this.z; out.radius = 0.9; return out } } }
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial(), 4)
    const state = createRollingBallState()
    syncRollingBalls(mesh, pool, fake, state, DT)
    const q0 = new THREE.Quaternion().fromArray(state.q, i * 4)
    fake.novel2.z = 0.45 // +z로 0.45u = 0.5rad
    syncRollingBalls(mesh, pool, fake, state, DT)
    const q1 = new THREE.Quaternion().fromArray(state.q, i * 4)
    expect(q0.angleTo(q1)).toBeCloseTo(0.45 / 0.9, 5)
    // 축 = 위 × 진행(+z) = +x: 공 앞쪽 꼭대기(0, 1, 0)가 +z 쪽으로 넘어간다.
    const top = new THREE.Vector3(0, 1, 0).applyQuaternion(q1)
    expect(top.z).toBeGreaterThan(0.4)
  })

  it('대장이 없거나(0개) 죽으면 visible=false(드로콜 0), 공 레이어는 InstancedMesh 1개·재질 1개(외곽선 껍질 합침)', async () => {
    const { syncRollingBalls, createRollingBallState, createRollingBallGeometry } = await import('../components/RollingBallLayer.jsx')
    const raw = await loadRaw()
    const geometry = createRollingBallGeometry(raw.props.giantBall)
    expect(geometry.groups.length).toBeLessThanOrEqual(1)
    expect([...new Set(geometry.attributes.aOutline.array)].sort()).toEqual([0, 1])
    // 몸통(aOutline 0) 지름 = 1(인스턴스 배율 = 지름 1.8u), 중심 원점
    const box = new THREE.Box3(); const v = new THREE.Vector3()
    const pos = geometry.attributes.position; const flag = geometry.attributes.aOutline
    for (let k = 0; k < pos.count; k += 1) if (flag.getX(k) === 0) box.expandByPoint(v.fromBufferAttribute(pos, k))
    expect(box.max.y - box.min.y).toBeCloseTo(1, 4)
    expect((box.max.y + box.min.y) / 2).toBeCloseTo(0, 4)
    // 손의 공과 같은 모양: GLB giantBall 소품 그대로(빨강 + 흰 띠 팔레트 칸)
    const keys = new Set(); const uv = geometry.attributes.uv
    for (let k = 0; k < uv.count; k += 1) if (flag.getX(k) === 0) keys.add(miniPaletteKeyAt(uv.getX(k), uv.getY(k)))
    expect([...keys].sort()).toEqual(['giantBallRed', 'giantBallWhite'])
    const ctx = setup()
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), E104_BALL_VISUAL.capacity)
    const state = createRollingBallState()
    expect(syncRollingBalls(mesh, new EnemyEntityPool(), ctx.runtime, state)).toBe(0)
    expect(mesh.visible).toBe(false)
    expect(syncRollingBalls(mesh, ctx.pool, ctx.runtime, state)).toBe(1)
    expect(mesh.visible).toBe(true)
    ctx.runtime.applyHitIndex(ctx.pool, ctx.captain.index, ctx.captain.generation, 1e9)
    ctx.step({ x: 0, z: 0 })
    expect(syncRollingBalls(mesh, ctx.pool, ctx.runtime, state)).toBe(0)
    expect(mesh.visible).toBe(false)
  })

  it('몸 레이어는 공을 그리지 않는다(loose drawnBy) — E104 몸 세트 드로콜 12, hook ballHeld 표는 그대로', async () => {
    const { miniLooseDrawnHere, miniVariantDrawCalls } = await import('../components/MiniZombieLayer.jsx')
    const raw = await loadRaw()
    const spec = MINI_ZOMBIE_VISUALS['n2-ball-roll-captain'].variants[0].loose[0]
    expect(spec).toMatchObject({ prop: 'giantBall', worldSize: 2 * E104_BALL.ballRadius, hook: 'ballHeld', drawnBy: 'rollingBall' })
    const built = buildMiniVariant(raw, MINI_ZOMBIE_VISUALS['n2-ball-roll-captain'].variants[0], null)
    expect(built.loose.filter(miniLooseDrawnHere)).toHaveLength(0)
    for (const visualId of ['n2-big-eater', 'n2-photocopier', 'n2-ball-roll-captain']) {
      expect(miniVariantDrawCalls(buildMiniVariant(raw, MINI_ZOMBIE_VISUALS[visualId].variants[0], null)), visualId).toBe(12)
    }
    // 다른 종의 loose(E90 가방·E96 공·E102 의자)는 그대로 몸 레이어가 그린다
    expect(miniVariantDrawCalls(buildMiniVariant(raw, MINI_ZOMBIE_VISUALS['n2-dribbler'].variants[0], null))).toBe(14)
  })
})

// ── E98 대식가 ───────────────────────────────────────────────────────────────
describe('E98 대식가', () => {
  it('먹히는 잡몹: 흡입 0.4초 동안 점점 작아지고(→ 25%) 입 높이로 떠오르며, 수평으로는 입 자리로 모인다', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4, 'stage4')
    const eater = spawn(pool, 'E98', 0, 4, { hp: 173, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E98.scale })
    const food = spawn(pool, 'E01', 0, 2.6, { hp: 14 })
    const player = { x: 0, z: -8 }
    const out = { scale: 1, lift: 0, spin: 0 }
    const samples = []
    for (let f = 0; f < 3 / DT; f += 1) {
      step(player)
      if (!pool.isIndexGenerationAlive(food.index, food.generation)) break
      eatenVisualInto(out, pool, food.index, runtime)
      if (eatenProgress(pool, food.index, runtime) >= 0) {
        expect(pool.state[eater.index]).toBe(N2_STATE_ATTACK)
        const d = Math.hypot(runtime.novel2.mouthX[eater.index] - pool.posX[food.index], runtime.novel2.mouthZ[eater.index] - pool.posZ[food.index])
        samples.push({ scale: out.scale, lift: out.lift, spin: out.spin, d })
      } else {
        expect(out).toEqual({ scale: 1, lift: 0, spin: 0 })
      }
    }
    expect(samples.length).toBeGreaterThan(10) // 0.4초 ≈ 24프레임
    for (let k = 1; k < samples.length; k += 1) {
      expect(samples[k].scale).toBeLessThanOrEqual(samples[k - 1].scale + 1e-9)
      expect(samples[k].lift).toBeGreaterThanOrEqual(samples[k - 1].lift - 1e-9)
      expect(samples[k].d).toBeLessThanOrEqual(samples[k - 1].d + 0.02) // 입 근처 무리 밀어내기 떨림(< 2cm)만 허용
    }
    const last = samples[samples.length - 1]
    expect(last.scale).toBeLessThan(0.35)
    expect(last.scale).toBeGreaterThanOrEqual(E98_EATEN_VISUAL.minScale)
    expect(last.lift).toBeGreaterThan(0.1)
    expect(last.d).toBeLessThan(0.3)
    expect(samples[0].d - last.d).toBeGreaterThan(0.5) // 입으로 끌려왔다
    expect(pool.isIndexGenerationAlive(food.index, food.generation)).toBe(false) // 다 먹혔다
    expect(runtime.novel2.eaterGrowth(pool, eater.index)).toBeCloseTo(1 + E98_EATER.growPerEat, 6) // 커졌다(visualScale에 반영)
  })

  it('예고는 빨간 부채꼴(70°·r 2.2u) — 채움이 정확히 r 2.2u까지', () => {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4, 'stage4')
    spawn(pool, 'E98', 0, 2, { hp: 173, spawnTimer: 3000 })
    for (let f = 0; f < 3 / DT && !snapshotOf('E98'); f += 1) step({ x: 0, z: 0 })
    const bite = snapshotOf('E98')
    expect(bite.shape).toBe('sector'); expect(bite.angleDeg).toBe(E98_EATER.coneAngleDeg); expect(bite.rangeUnits).toBe(E98_EATER.coneRadius)
    const root = createExpansionTelegraphVisual(bite)
    expect(root.userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    let maxR = 0
    root.traverse((n) => {
      if (!n.isMesh || n.name === TELEGRAPH_FEATHER.name) return // opaque core only — the 2026-11-22 soft feather lies outside it
      const p = n.geometry.attributes.position
      for (let k = 0; k < p.count; k += 1) maxR = Math.max(maxR, Math.hypot(p.getX(k) + root.position.x - bite.originXZ[0], p.getZ(k) + root.position.z - bite.originXZ[1]))
    })
    expect(maxR).toBeCloseTo(E98_EATER.coneRadius, 3)
  })

  it('큰 입 소품: 머리 파트에 합친 코드 프리미티브(빨간 입술·목구멍·이·혀), GLB 소품 목록·드로콜 불변', async () => {
    const raw = await loadRaw()
    expect(raw.props.gapingMouth).toBeUndefined() // GLB에는 없다(코드 프리미티브)
    const mouth = MINI_CODE_PROPS.gapingMouth()
    const keys = new Set(); const uv = mouth.attributes.uv
    for (let k = 0; k < uv.count; k += 1) keys.add(miniPaletteKeyAt(uv.getX(k), uv.getY(k)))
    expect([...keys].sort()).toEqual(['armRed', 'coffeeDark', 'mochiRose', 'teeth'])
    const variant = MINI_ZOMBIE_VISUALS['n2-big-eater'].variants[0]
    const withMouth = buildMiniVariant(raw, variant, null)
    const without = buildMiniVariant(raw, { ...variant, codeProps: [] }, null)
    const head = (b) => b.parts.find((part) => part.key === 'head').geometry
    const headKeys = new Set(); const huv = head(withMouth).attributes.uv
    for (let k = 0; k < huv.count; k += 1) headKeys.add(miniPaletteKeyAt(huv.getX(k), huv.getY(k)))
    expect(headKeys.has('teeth')).toBe(true)
    expect(head(withMouth).attributes.position.count).toBeGreaterThan(head(without).attributes.position.count)
    // 입은 얼굴 앞(+z)에 있다: 입 정점의 최대 z가 원래 머리보다 앞
    head(withMouth).computeBoundingBox(); head(without).computeBoundingBox()
    expect(head(withMouth).boundingBox.max.z).toBeGreaterThanOrEqual(head(without).boundingBox.max.z - 0.02)
    expect(withMouth.parts.length).toBe(without.parts.length)
  })

  it('포즈: 예고(입 벌림 — 고개를 젖혀 얼굴을 위로) · 흡입(앞으로 숙여 덜덜) · 씹기가 서로 다르다', () => {
    const out = createMiniPose()
    const warn = Array.from(fillMiniZombiePose(out, 'eat', 'warn', 1.2))
    const charge = Array.from(fillMiniZombiePose(out, 'eat', 'charge', 1.2))
    const chew = Array.from(fillMiniZombiePose(out, 'eat', 'stun', 1.2))
    expect(warn[15]).toBeLessThan(-0.75) // 머리 X 음수 = 젖힘
    expect(charge[15]).toBeGreaterThan(-0.1) // 앞으로
    expect(charge[6]).toBeGreaterThan(0.3) // 상체 숙임
    expect(warn).not.toEqual(chew); expect(charge).not.toEqual(chew)
    for (const pose of [warn, charge, chew]) expect(pose.every(Number.isFinite)).toBe(true)
  })
})

// ── E101 복사기 ──────────────────────────────────────────────────────────────
describe('E101 복사기', () => {
  function setup() {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S5, 'stage5')
    const copier = spawn(pool, 'E101', 0, 10, { hp: 187, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E101.scale })
    return { pool, runtime, step, copier }
  }

  it('복사본은 흰 종이색, 원본은 원래 팔레트 — 스캔 예고는 노란 원(피해 0)', async () => {
    const { pool, runtime, step, copier } = setup()
    const target = spawn(pool, 'E01', 1, 10, { hp: 17 })
    const player = { x: 0, z: -15 }
    step(player)
    expect(pool.state[copier.index]).toBe(N2_STATE_TELEGRAPH)
    expect(runtime.novel2.copierMode[copier.index]).toBe(1)
    expect(miniPoseStyleFor('copier', pool, copier.index, runtime)).toBe('copierScan')
    const scan = snapshotOf('E101')
    expect(createExpansionTelegraphVisual(scan).userData.fillMat.color.getHexString()).toBe(hex(EXPANSION_TELEGRAPH_FILL.color))
    for (let f = 0; f < (E101_COPIER.scanMs + 100) / 1000 / DT; f += 1) step(player)
    const e01 = []
    for (let i = 0; i <= pool.highestActive; i += 1) if (pool.active[i] && pool.type[i] === ENEMY_TYPE_CODES.E01) e01.push(i)
    expect(e01).toHaveLength(2)
    const copy = e01.find((i) => i !== target.index)
    expect(isNovel2Copy(pool, copy, runtime)).toBe(true)
    expect(isNovel2Copy(pool, target.index, runtime)).toBe(false)
    expect(miniPoseStyleFor('copier', pool, copier.index, runtime)).toBe('copier') // 스캔이 끝나면 원래 문법
    // 종이색: 몸통·피부·발·눈 모두 원래 E01 팔레트와 다르고 밝다(눈은 토너 회색)
    expect(copyPaperHex('body')).toBe(COPY_PAPER_COLORS.body)
    expect(copyPaperHex('eye')).toBe(COPY_PAPER_COLORS.eye)
    const lum = (h) => { const c = new THREE.Color(h); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b }
    expect(lum(copyPaperHex('body'))).toBeGreaterThan(0.8)
    expect(lum(copyPaperHex('skin'))).toBeGreaterThan(0.7)
  })

  it('근접 부채꼴(모드 2) 예고 = 빨강, 포즈는 부채꼴 문법(copier) — 스캔 포즈와 다르다', () => {
    const { pool, runtime, step, copier } = setup()
    for (let f = 0; f < 2 / DT && pool.state[copier.index] !== N2_STATE_TELEGRAPH; f += 1) step({ x: 0, z: 8.4 })
    expect(runtime.novel2.copierMode[copier.index]).toBe(2)
    expect(miniPoseStyleFor('copier', pool, copier.index, runtime)).toBe('copier')
    const fan = snapshotOf('E101')
    expect(fan.shape).toBe('sector')
    expect(createExpansionTelegraphVisual(fan).userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    const out = createMiniPose()
    const scanPose = Array.from(fillMiniZombiePose(out, 'copierScan', 'warn', 0.7))
    const fanPose = Array.from(fillMiniZombiePose(out, 'copier', 'warn', 0.7))
    expect(scanPose).not.toEqual(fanPose)
    expect(MINI_POSE_STYLES).toContain('copierScan')
  })

  it('용지 걸림(상태 4): 처진 고장 포즈 + 빨간 오류 깜박임(초당 4번), 평시에는 색을 바꾸지 않는다', () => {
    const { pool, runtime, copier } = setup()
    const i = copier.index
    const tint = new Float32Array(3)
    expect(miniInstanceTintInto(tint, pool, i, 0)).toBe(false)
    runtime.applyHitIndex(pool, i, copier.generation, Math.ceil(pool.maxHp[i] * E101_COPIER.jamDamageRatio) + 1)
    expect(pool.state[i]).toBe(N2_STATE_STUN)
    const ons = [0.06, 0.19, 0.31, 0.44, 0.56, 0.69, 0.81, 0.94].map((t) => miniInstanceTintInto(tint, pool, i, t))
    expect(ons).toEqual([true, false, true, false, true, false, true, false]) // 1/8초마다 켜짐·꺼짐 = 초당 4번 깜박
    miniInstanceTintInto(tint, pool, i, 0)
    expect([...tint].map((v) => +v.toFixed(2))).toEqual([...COPIER_JAM_BLINK.rgb])
    const out = createMiniPose()
    const jam = Array.from(fillMiniZombiePose(out, 'copier', 'stun', 0.9))
    const normal = Array.from(fillMiniZombiePose(out, 'copier', 'normal', 0.9))
    expect(jam).not.toEqual(normal)
    expect(jam[6]).toBeGreaterThan(0.4) // 상체가 처진다
    expect(jam[9]).toBeGreaterThan(-0.2) // 팔이 축 늘어진다(앞으로 뻗지 않음)
    expect(jam.every(Number.isFinite)).toBe(true)
    expect(Math.abs(fillMiniZombiePose(out, 'copier', 'stun', 0.31)[MINI_POSE_ROOT_ROLL])).toBeGreaterThan(0) // 덜컹거림
  })
})

describe('E104 포즈 · 예고', () => {
  it('예고(겨눔) = 뒤로 젖혀 오른발 뒤로, 공격(차기) = 오른발을 앞으로 차올리고 두 팔을 벌린다 · 예고선은 빨강', () => {
    const out = createMiniPose()
    const warn = Array.from(fillMiniZombiePose(out, 'roll', 'warn', 0.8))
    const kick = Array.from(fillMiniZombiePose(out, 'roll', 'charge', 0.8))
    expect(warn[6]).toBeLessThan(-0.2) // 상체 젖힘
    expect(warn[3]).toBeGreaterThan(0.5) // 오른다리 뒤로
    expect(kick[3]).toBeLessThan(-1.2) // 오른다리 앞으로 차올림
    expect(kick[11]).toBeGreaterThan(0.5); expect(kick[14]).toBeLessThan(-0.5) // 팔 벌림
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S6, 'stage6')
    spawn(pool, 'E104', 0, 8, { hp: 250, spawnTimer: 3000 })
    for (let f = 0; f < 4 / DT && !snapshotOf('E104'); f += 1) step({ x: 0, z: 0 })
    const line = snapshotOf('E104')
    expect(createExpansionTelegraphVisual(line).userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    expect(line.widthUnits).toBe(2 * E104_BALL_VISUAL.radius) // 선 폭 = 그린 공 지름
  })
})

// ══ wave 3 둘째 묶음 ════════════════════════════════════════════════════════════════════════════════════════
// 못박는 것: 예고 채움 = 스냅샷 기하 그대로 + 빨강(셋 다 피해 예고) · 떡 웅크림 납작 → 도약 포물선 → 매달림(behavior 매달림 자리 그대로 — 로사리 등 뒤, 앞을
// 가리지 않고, 떨쳐내기 진행만큼 늘어나며 가늘어짐) → 떨어지면 바닥에 납작 · 의자 회전은 behavior yaw(포즈는 따로 돌지 않음)·속도선 ∝ 속도 ·
// 기마전 네 몸 = 한 변형(드로콜 공유), 역할별 포즈, 기수만 모자, 말 손 → 기수 엉덩이 엮은 팔, 기수가 쓰러지면 팔이 사라진다.
function telegraphExtents(snapshot) {
  const root = createExpansionTelegraphVisual(snapshot)
  root.updateMatrixWorld(true)
  const [ox, oz] = snapshot.originXZ
  const [dx, dz] = snapshot.directionXZ
  const v = new THREE.Vector3()
  let along = 0; let back = 0; let lateral = 0; let radius = 0
  root.traverse((n) => {
    if (!n.isMesh || n.name === TELEGRAPH_FEATHER.name) return // opaque core only — the 2026-11-22 soft feather lies outside it
    const p = n.geometry.attributes.position
    for (let k = 0; k < p.count; k += 1) {
      v.fromBufferAttribute(p, k).applyMatrix4(n.matrixWorld)
      const rx = v.x - ox; const rz = v.z - oz
      along = Math.max(along, rx * dx + rz * dz); back = Math.min(back, rx * dx + rz * dz)
      lateral = Math.max(lateral, Math.abs(rx * -dz + rz * dx)); radius = Math.max(radius, Math.hypot(rx, rz))
    }
  })
  return { root, along, back, lateral, radius }
}
function runUntil(step, player, done, seconds = 4) {
  for (let f = 0; f < seconds / DT; f += 1) { step(player); if (done()) return true }
  return false
}

describe('E100 찹쌀떡', () => {
  function setup() {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S4, 'stage4')
    const mochi = spawn(pool, 'E100', 0, 1.2, { hp: 40, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E100.scale })
    return { pool, runtime, step, mochi }
  }

  it('웅크림 예고 = 빨간 선, 채움이 스냅샷 기하 그대로(길이 1.75u · 폭 0.9u) — 몸은 점점 납작하게 퍼진다', () => {
    const { pool, runtime, step, mochi } = setup()
    const i = mochi.index
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[i] === N2_STATE_TELEGRAPH)).toBe(true)
    const line = snapshotOf('E100')
    expect(line.shape).toBe('line'); expect(line.rangeUnits).toBe(E100_MOCHI.lineLength); expect(line.widthUnits).toBe(E100_MOCHI.lineWidth)
    const ext = telegraphExtents(line)
    expect(ext.root.userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    expect(ext.along).toBeCloseTo(E100_MOCHI.lineLength, 2)
    expect(ext.lateral).toBeCloseTo(E100_MOCHI.lineWidth / 2, 2)
    expect(miniPoseStyleFor('cling', pool, i, runtime)).toBe('cling')
    const xf = createMiniBodyTransform()
    const early = { ...miniBodyTransformInto(xf, pool, i, runtime, { reduced: true }) }
    for (let f = 0; f < (E100_MOCHI.telegraphMs - 60) / 1000 / DT; f += 1) step({ x: 0, z: 0 })
    const late = { ...miniBodyTransformInto(xf, pool, i, runtime, { reduced: true }) }
    expect(late.active).toBe(true)
    expect(late.sy).toBeLessThan(early.sy)
    expect(late.sy).toBeLessThan(0.7)
    expect(late.sx).toBeGreaterThan(1.2)
    expect(late.x).toBe(pool.posX[i]); expect(late.z).toBe(pool.posZ[i]) // 자리 고정(선의 원점)
  })

  it('도약 = 원점 → 착지점 포물선(꼭대기 ≤ 0.5u, 착지에서 0), 체력바도 같이 뜬다', () => {
    const { pool, runtime, step, mochi } = setup()
    const i = mochi.index
    expect(runUntil(step, { x: 0, z: 0 }, () => runtime.novel2.mochiPhase[i] === 2)).toBe(true)
    const xf = createMiniBodyTransform()
    const lifts = []
    for (let f = 0; f < 1 / DT && runtime.novel2.mochiPhase[i] === 2; f += 1) {
      miniBodyTransformInto(xf, pool, i, runtime, { reduced: true })
      lifts.push(xf.lift)
      expect(novel2BarLiftWorld(pool, i, runtime)).toBeCloseTo(xf.lift, 6)
      expect(mochiLeapLift(pool, i, runtime)).toBeCloseTo(xf.lift, 6)
      step({ x: 0, z: 0 })
    }
    expect(lifts.length).toBeGreaterThan(5)
    const peak = Math.max(...lifts)
    expect(peak).toBeGreaterThan(0.15)
    expect(peak).toBeLessThanOrEqual(E100_MOCHI_VISUAL.leapHeightMax + 1e-6)
    expect(lifts[0]).toBeLessThan(peak * 0.5)
    expect(lifts[lifts.length - 1]).toBeLessThan(peak * 0.6)
  })

  it('매달림: 그린 떡 = behavior 매달림 자리(로사리 + offset, 0.3u) = 맞는 몸, 로사리를 보며, 떨쳐내기 진행만큼 늘어나 가늘어진다', () => {
    const { pool, runtime, step, mochi } = setup()
    const i = mochi.index
    expect(runUntil(step, { x: 0, z: 0 }, () => runtime.novel2.mochiPhase[i] === 3)).toBe(true)
    expect(miniPoseStyleFor('cling', pool, i, runtime)).toBe('clingHold')
    const xf = createMiniBodyTransform()
    const memory = createMochiDrawMemory()
    const player = { x: 0, z: 0 }
    const samples = []
    let fellAt = -1
    for (let f = 0; f < 3 / DT; f += 1) {
      if (runtime.novel2.mochiPhase[i] === 3) {
        miniBodyTransformInto(xf, pool, i, runtime, { playerX: player.x, playerZ: player.z, reduced: true, memory })
        const truth = runtime.novel2.mochiStateInto(pool, i, {})
        expect(xf.x).toBeCloseTo(player.x + truth.offsetX, 6); expect(xf.z).toBeCloseTo(player.z + truth.offsetZ, 6) // 그린 자리 = behavior 자리
        // 맞는 몸(풀 자리)과 같은 곳 — 착지 프레임만 빼고 한 스텝 뒤처짐 이내(플레이어 3u/s·0.05u + 등 자리가 방향을 초당 720°로
        // 따라 도는 한 스텝 12°·0.3u ≈ 0.06u — 풀 자리는 offset을 갱신하기 전 스텝의 값이다)
        if (samples.length > 0) expect(Math.hypot(xf.x - pool.posX[i], xf.z - pool.posZ[i])).toBeLessThan(0.15)
        expect(Math.hypot(xf.x - player.x, xf.z - player.z)).toBeCloseTo(E100_MOCHI.attachOffset, 5)
        expect(Math.sin(xf.yaw) * (player.x - xf.x) + Math.cos(xf.yaw) * (player.z - xf.z)).toBeGreaterThan(0.29) // 로사리를 본다
        expect(xf.lift).toBe(E100_MOCHI_VISUAL.clingLift); expect(xf.uniform).toBe(E100_MOCHI_VISUAL.clingScale)
        samples.push({ p: runtime.novel2.mochiStateInto(pool, i, {}).progress, sz: xf.sz, sx: xf.sx, sy: xf.sy })
      } else if (fellAt < 0) fellAt = f
      player.x += 3 * DT // 움직이면 떨쳐낸다
      step(player)
    }
    expect(samples.length).toBeGreaterThan(20)
    for (let k = 1; k < samples.length; k += 1) {
      expect(samples[k].p).toBeGreaterThanOrEqual(samples[k - 1].p)
      expect(samples[k].sz).toBeGreaterThanOrEqual(samples[k - 1].sz - 1e-9)
      expect(samples[k].sx).toBeLessThanOrEqual(samples[k - 1].sx + 1e-9)
    }
    const last = samples[samples.length - 1]
    expect(last.p).toBeGreaterThan(0.9)
    expect(last.sz).toBeGreaterThan(1.8) // 뒤로 길게
    expect(last.sx).toBeLessThan(0.6) // 가늘게
    expect(fellAt).toBeGreaterThan(0)
  })

  it('매달림 자리는 behavior offset 그대로(시각 쪽 재계산 없음) · 선을 못 세운 접촉 추격(laneBlocked)은 평범한 걸음', () => {
    const pool = new EnemyEntityPool()
    const m = spawn(pool, 'E100', 0, 0, { hp: 40 })
    const state = { phase: 3, offsetX: -0.21, offsetZ: -0.21, laneBlocked: false }
    const fake = { novel2: { mochiStateInto: (_p, _i, out) => Object.assign(out, { clinging: state.phase === 3, progress: 0.2, leapX: 0, leapZ: 0, side: 1, ...state }) } }
    const xf = createMiniBodyTransform()
    miniBodyTransformInto(xf, pool, m.index, fake, { playerX: 2, playerZ: 3, reduced: true })
    expect(xf.x).toBeCloseTo(2 - 0.21, 9); expect(xf.z).toBeCloseTo(3 - 0.21, 9)
    expect(Math.sin(xf.yaw) * 0.21 + Math.cos(xf.yaw) * 0.21).toBeGreaterThan(0.29) // 로사리 쪽을 본다
    state.offsetX = 0.3; state.offsetZ = 0 // 카메라·방향과 상관없이 behavior 자리 그대로
    miniBodyTransformInto(xf, pool, m.index, fake, { playerX: 0, playerZ: 0, reduced: true })
    expect(xf.x).toBeCloseTo(0.3, 9); expect(xf.z).toBeCloseTo(0, 9)
    // laneBlocked: behavior는 평범한 접촉 추격(단계 0, 상태 7) — 포즈는 평시 걸음, 몸 변형은 걸음 말랑임뿐(웅크림·도약 없음)
    Object.assign(state, { phase: 0, laneBlocked: true })
    pool.state[m.index] = N2_STATE_APPROACH
    expect(miniPoseStyleFor('cling', pool, m.index, fake)).toBe('cling')
    miniBodyTransformInto(xf, pool, m.index, fake, { reduced: true })
    expect([xf.lift, xf.sx, xf.sy, xf.sz, xf.x, xf.z]).toEqual([0, 1, 1, 1, pool.posX[m.index], pool.posZ[m.index]])
  })

  it('실제 런타임 laneBlocked: 세 종 모두 접촉 추격 상태(7)라 평시 걸음 포즈 · 의자 속도선 없음', async () => {
    const { syncChairStreaks } = await import('../components/Wave3bMotionLayer.jsx')
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S5, 'stage5')
    const chair = spawn(pool, 'E102', 0, 3, { hp: 40, spawnTimer: 3000 })
    runtime.novel2.laneFails[chair.index] = 255 // 선을 못 세운 지 오래(behavior가 laneBlocked로 본다)
    runtime.novel2.slotGen[chair.index] = pool.generation[chair.index]
    pool.attackCooldown[chair.index] = 5000
    step({ x: 0, z: 0 })
    expect(runtime.novel2.chairStateInto(pool, chair.index, {}).laneBlocked).toBe(true)
    expect(pool.state[chair.index]).toBe(N2_STATE_APPROACH)
    expect(chairMotionInto({}, pool, chair.index, runtime)).toBe(true)
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial(), E102_CHAIR_VISUAL.capacity)
    expect(syncChairStreaks(mesh, pool, runtime)).toBe(0)
    expect(miniPoseStyleFor('swivel', pool, chair.index, runtime)).toBe('swivel')
  })

  it('떨어지면 바닥에 철퍽(납작·넓게, 매달려 그리던 자리에서 미끄러져 내려온다), 빗나감도 납작 — 포즈는 clingSplat', () => {
    const { pool, runtime, step, mochi } = setup()
    const i = mochi.index
    expect(runUntil(step, { x: 0, z: 0 }, () => runtime.novel2.mochiPhase[i] === 3)).toBe(true)
    const xf = createMiniBodyTransform()
    const memory = createMochiDrawMemory()
    const player = { x: 0, z: 0 }
    let drawn = null
    for (let f = 0; f < 3 / DT && runtime.novel2.mochiPhase[i] !== 5; f += 1) {
      miniBodyTransformInto(xf, pool, i, runtime, { playerX: player.x, playerZ: player.z, reduced: true, memory })
      drawn = [xf.x, xf.z]
      player.x += 3 * DT
      step(player)
    }
    expect(runtime.novel2.mochiPhase[i]).toBe(5)
    expect(pool.state[i]).toBe(N2_STATE_STUN)
    expect(miniPoseStyleFor('cling', pool, i, runtime)).toBe('clingSplat')
    miniBodyTransformInto(xf, pool, i, runtime, { playerX: player.x, playerZ: player.z, reduced: true, memory })
    expect(Math.hypot(xf.x - drawn[0], xf.z - drawn[1])).toBeLessThan(0.1) // 순간이동 없음
    for (let f = 0; f < 0.4 / DT; f += 1) step(player)
    miniBodyTransformInto(xf, pool, i, runtime, { reduced: true, memory })
    expect(xf.sy).toBeCloseTo(E100_MOCHI_VISUAL.splatSquash, 2)
    expect(xf.sx).toBeCloseTo(E100_MOCHI_VISUAL.splatWiden, 2)
    expect(xf.x).toBe(pool.posX[i]); expect(xf.z).toBe(pool.posZ[i])
    // 빗나감(4)
    const miss = setup()
    expect(runUntil(miss.step, { x: 0, z: 0 }, () => miss.pool.state[miss.mochi.index] === N2_STATE_TELEGRAPH)).toBe(true)
    const p2 = { x: 0, z: 0 }
    for (let f = 0; f < 2 / DT && miss.runtime.novel2.mochiPhase[miss.mochi.index] !== 4; f += 1) { if (p2.x < 1.4) p2.x += 3 * DT; miss.step(p2) }
    expect(miss.runtime.novel2.mochiPhase[miss.mochi.index]).toBe(4)
    expect(miss.pool.state[miss.mochi.index]).toBe(N2_STATE_RECOVER)
    for (let f = 0; f < 0.3 / DT; f += 1) miss.step(p2)
    miniBodyTransformInto(xf, miss.pool, miss.mochi.index, miss.runtime, { reduced: true })
    expect(xf.sy).toBeCloseTo(E100_MOCHI_VISUAL.missSquash, 2)
    const out = createMiniPose()
    const splat = Array.from(fillMiniZombiePose(out, 'clingSplat', 'stun', 0.5))
    const hold = Array.from(fillMiniZombiePose(out, 'clingHold', 'charge', 0.5))
    expect(splat[11]).toBeGreaterThan(1); expect(splat[14]).toBeLessThan(-1) // 팔을 옆으로 쫙
    expect(hold[11]).toBeLessThan(0); expect(hold[14]).toBeGreaterThan(0) // 팔을 안쪽으로 모아 안는다
  })

  it('효과 줄이기: 출렁임·떨림 없이 같은 상태 표시(늘어남은 그대로), 몸 세트 드로콜 12', async () => {
    const { miniVariantDrawCalls } = await import('../components/MiniZombieLayer.jsx')
    const raw = await loadRaw()
    expect(miniVariantDrawCalls(buildMiniVariant(raw, MINI_ZOMBIE_VISUALS['n2-mochi-cling'].variants[0], null))).toBe(12)
    const pool = new EnemyEntityPool()
    const m = spawn(pool, 'E100', 0, 0, { hp: 40 })
    const fake = { novel2: { mochiStateInto: (_p, _i, out) => Object.assign(out, { phase: 3, clinging: true, progress: 0.5, offsetX: -0.3, offsetZ: 0, leapX: 0, leapZ: 0 }) } }
    const xf = createMiniBodyTransform()
    const a = { ...miniBodyTransformInto(xf, pool, m.index, fake, { playerX: 0, playerZ: 0, clockSec: 0.03, reduced: true }) }
    const b = { ...miniBodyTransformInto(xf, pool, m.index, fake, { playerX: 0, playerZ: 0, clockSec: 0.11, reduced: true }) }
    expect(a.sx).toBe(b.sx); expect(a.sy).toBe(b.sy)
    expect(a.sz).toBeCloseTo(1 + E100_MOCHI_VISUAL.clingStretch * 0.5, 6)
    const c = { ...miniBodyTransformInto(xf, pool, m.index, fake, { playerX: 0, playerZ: 0, clockSec: 0.03, reduced: false }) }
    const d = { ...miniBodyTransformInto(xf, pool, m.index, fake, { playerX: 0, playerZ: 0, clockSec: 0.11, reduced: false }) }
    expect(c.sx).not.toBe(d.sx)
    // 다른 종은 변형 없음
    const other = spawn(pool, 'E102', 2, 2, { hp: 40 })
    expect(miniBodyTransformInto(xf, pool, other.index, fake, null).active).toBe(false)
  })
})

describe('E102 회전의자', () => {
  function setup() {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S5, 'stage5')
    const chair = spawn(pool, 'E102', 0, 4, { hp: 40, spawnTimer: 3000, scale: NOVEL2_ZOMBIE_STATS.E102.scale })
    return { pool, runtime, step, chair }
  }
  const streakMesh = () => new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial(), E102_CHAIR_VISUAL.capacity)

  it('회전 예고 = 빨간 선(4.2 × 1.8u 그대로) · 몸은 behavior yaw로 두 바퀴 돌아 선 방향에 멈춘다(포즈는 따로 돌지 않는다) · 회전선 4줄', async () => {
    const { syncChairStreaks } = await import('../components/Wave3bMotionLayer.jsx')
    const { pool, runtime, step, chair } = setup()
    const i = chair.index
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[i] === N2_STATE_TELEGRAPH)).toBe(true)
    const line = snapshotOf('E102')
    const ext = telegraphExtents(line)
    expect(ext.root.userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    expect(ext.along).toBeCloseTo(E102_CHAIR.lineLength, 2)
    expect(ext.lateral).toBeCloseTo(E102_CHAIR.lineWidth / 2, 2)
    const out = createMiniPose()
    expect(fillMiniZombiePose(out, 'swivel', 'warn', 0.4)[MINI_POSE_ROOT_YAW]).toBe(0)
    const mesh = streakMesh()
    expect(syncChairStreaks(mesh, pool, runtime, false)).toBe(E102_CHAIR_VISUAL.whirlCount)
    expect(syncChairStreaks(mesh, pool, runtime, true)).toBe(0) // 효과 줄이기: 회전선 없음
    const yaws = []
    while (pool.state[i] === N2_STATE_TELEGRAPH) { yaws.push(pool.yaw[i]); step({ x: 0, z: 0 }) }
    const turned = yaws[0] - yaws[yaws.length - 1]
    expect(turned).toBeGreaterThan(Math.PI * 3.5) // 거의 두 바퀴
    const [dx, dz] = line.directionXZ
    const lockYaw = Math.atan2(dx, dz)
    // 예고가 끝난 첫 프레임(활주 시작)의 몸 방향 = 빨간 선 방향(마지막 예고 프레임은 아직 한 프레임만큼 돌고 있다)
    const diff = Math.atan2(Math.sin(pool.yaw[i] - lockYaw), Math.cos(pool.yaw[i] - lockYaw))
    expect(Math.abs(diff)).toBeLessThan(0.05)
  })

  it('활주·표류 = 의자 뒤로 속도선 3줄(진행 반대쪽), 길이 ∝ 속도 · 굴러오는 중에는 0 · 흰 반투명(외곽선 없음)', async () => {
    const { syncChairStreaks, createChairStreakMaterial } = await import('../components/Wave3bMotionLayer.jsx')
    const { pool, runtime, step, chair } = setup()
    const i = chair.index
    const mesh = streakMesh()
    expect(syncChairStreaks(mesh, pool, runtime)).toBe(0)
    expect(mesh.visible).toBe(false)
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[i] === N2_STATE_TELEGRAPH)).toBe(true)
    const m = new THREE.Matrix4(); const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3()
    const motion = {}
    const lengths = []
    let sawGlide = false; let sawDrift = false
    for (let f = 0; f < (E102_CHAIR.telegraphMs + E102_CHAIR.glideMs + E102_CHAIR.driftMs) / 1000 / DT; f += 1) {
      step({ x: 0, z: 0 })
      if (!chairMotionInto(motion, pool, i, runtime) || (motion.phase !== 2 && motion.phase !== 3)) continue
      sawGlide ||= motion.phase === 2; sawDrift ||= motion.phase === 3
      const n = syncChairStreaks(mesh, pool, runtime)
      if (motion.speed < E102_CHAIR_VISUAL.streakMinSpeed) { expect(n).toBe(0); continue }
      expect(n).toBe(3)
      mesh.getMatrixAt(0, m); m.decompose(p, q, s)
      // 줄은 의자 뒤(진행 반대)에 있다
      expect((p.x - pool.posX[i]) * motion.dirX + (p.z - pool.posZ[i]) * motion.dirZ).toBeLessThan(-0.2)
      expect(s.z).toBeCloseTo(E102_CHAIR_VISUAL.streakLength * motion.speedFrac, 5)
      lengths.push({ phase: motion.phase, len: s.z })
    }
    expect(sawGlide && sawDrift).toBe(true)
    const drift = lengths.filter((l) => l.phase === 3)
    expect(drift.length).toBeGreaterThan(3)
    for (let k = 1; k < drift.length; k += 1) expect(drift[k].len).toBeLessThanOrEqual(drift[k - 1].len + 1e-9) // 표류하며 줄어든다
    const material = createChairStreakMaterial()
    expect(material.type).toBe('MeshBasicMaterial'); expect(material.transparent).toBe(true)
    expect(new THREE.Color(material.color).getHSL({}).l).toBeGreaterThan(0.8) // 검은 외곽선·검은 줄 없음
  })

  it('포즈: 회전(팔로 의자 붙잡기) · 활주(등받이로 젖혀 두 팔 위로) · 표류(허우적) · 몸 세트 드로콜 14(몸 12 + 사무용 의자 2)', async () => {
    const { miniVariantDrawCalls } = await import('../components/MiniZombieLayer.jsx')
    const out = createMiniPose()
    const spin = Array.from(fillMiniZombiePose(out, 'swivel', 'warn', 0.7))
    const glide = Array.from(fillMiniZombiePose(out, 'swivel', 'charge', 0.7))
    const drift = Array.from(fillMiniZombiePose(out, 'swivel', 'stun', 0.7))
    expect(glide[6]).toBeLessThan(-0.35) // 뒤로 젖힘
    expect(glide[9]).toBeLessThan(-2.2); expect(glide[12]).toBeLessThan(-2.2) // 두 팔 위로
    expect(spin).not.toEqual(glide); expect(drift).not.toEqual(glide)
    const raw = await loadRaw()
    const variant = MINI_ZOMBIE_VISUALS['n2-swivel-chair'].variants[0]
    expect(variant.loose.map((l) => l.prop)).toEqual(['officeChair'])
    expect(miniVariantDrawCalls(buildMiniVariant(raw, variant, null))).toBe(14)
  })
})

describe('E106 기마전', () => {
  function setup(positions = [[0, 4], [1, 5], [-1, 5], [0, 6]]) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const step = makeStep(runtime, pool, S6, 'stage6')
    const bodies = positions.map(([x, z]) => spawn(pool, 'E106', x, z, { hp: 30, spawnTimer: 0, scale: NOVEL2_ZOMBIE_STATS.E106.scale }))
    step({ x: 0, z: -6 })
    for (let f = 0; f < 0.4 / DT; f += 1) step({ x: 0, z: -6 }) // 등장 연출(0.3초) 지나 몸이 보인다
    return { pool, runtime, step, bodies }
  }
  const armMesh = () => new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), E106_CAVALRY_VISUAL.capacity)

  it('네 몸이 한 변형(드로콜 공유: 몸 12 + 기수 모자 2 = 14), 역할별 포즈 문법, 모자는 기수만(머리를 따라간다)', async () => {
    const { miniVariantDrawCalls } = await import('../components/MiniZombieLayer.jsx')
    const { novel2PickVariant, novel2PropScale } = await import('../components/miniZombieHooks.js')
    const raw = await loadRaw()
    const visual = MINI_ZOMBIE_VISUALS['n2-cavalry']
    expect(visual.variants).toHaveLength(1)
    const built = buildMiniVariant(raw, visual.variants[0], null)
    expect(miniVariantDrawCalls(built)).toBe(14)
    const cap = built.loose.find((l) => l.prop === 'cap')
    expect(cap.part).toBe('head')
    expect(cap.anchor).toEqual([...MINI_HEAD_ANCHORS.headTop])
    const { pool, runtime, bodies } = setup()
    const [rider, ...horses] = bodies
    for (const b of bodies) expect(novel2PickVariant(pool, b.index, 'n2-cavalry', 1, runtime)).toBe(0)
    expect(miniPoseStyleFor('horse', pool, rider.index, runtime)).toBe('rider')
    const styles = horses.map((h) => [runtime.novel2.cavalryStateInto(pool, h.index, {}).slot, miniPoseStyleFor('horse', pool, h.index, runtime)])
    for (const [slot, style] of styles) expect(style).toBe(slot === 0 ? 'horseFront' : 'horse')
    expect(novel2PropScale('riderCap', pool, rider.index, runtime)).toBe(1)
    for (const h of horses) expect(novel2PropScale('riderCap', pool, h.index, runtime)).toBe(0)
    expect(cavalryRiderCapScale(pool, rider.index, null)).toBe(1) // 런타임이 없으면 숨기지 않는다
    // 기수는 들려 있고(엮은 팔 높이), 체력바도 같이 뜬다
    const out = createMiniPose()
    expect(fillMiniZombiePose(out, 'rider', 'normal', 0.3)[MINI_POSE_LIFT]).toBeCloseTo(MINI_RIDER_LIFT, 6)
    expect(novel2BarLiftWorld(pool, rider.index, runtime)).toBeGreaterThan(0.15)
    for (const h of horses) expect(novel2BarLiftWorld(pool, h.index, runtime)).toBe(0)
    // 앞 말은 팔을 뒤로(기수가 뒤에 있다), 뒤 말은 앞으로
    expect(fillMiniZombiePose(out, 'horseFront', 'normal', 0.3)[9]).toBeGreaterThan(0.5)
    expect(fillMiniZombiePose(out, 'horse', 'normal', 0.3)[9]).toBeLessThan(-1)
  })

  it('엮은 팔: 말 셋의 손 → 기수 엉덩이(말 손보다 높다), 기수가 쓰러지면 사라지고 말은 휘청(horseLoose)', async () => {
    const { syncCavalryLinks } = await import('../components/Wave3bMotionLayer.jsx')
    const { pool, runtime, step, bodies } = setup([[0, 10], [1, 11], [-1, 11], [0, 12]])
    const [rider, ...horses] = bodies
    const mesh = armMesh()
    expect(syncCavalryLinks(mesh, pool, runtime)).toBe(3)
    expect(mesh.visible).toBe(true)
    for (const h of horses) expect(cavalryLinkedRider(pool, h.index, runtime)).toBe(rider.index)
    expect(cavalryLinkedRider(pool, rider.index, runtime)).toBe(-1)
    const m = new THREE.Matrix4(); const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3()
    const end = new THREE.Vector3()
    for (let k = 0; k < 3; k += 1) {
      mesh.getMatrixAt(k, m); m.decompose(p, q, s)
      end.set(0, 0, 1).applyMatrix4(m) // 막대 끝(길이 1 → 인스턴스 배율)
      expect(Math.hypot(end.x - pool.posX[rider.index], end.z - pool.posZ[rider.index])).toBeLessThan(E106_CAVALRY_VISUAL.riderInset + 1e-3)
      expect(end.y).toBeGreaterThan(p.y) // 기수 엉덩이 > 말 손
      const nearest = Math.min(...horses.map((h) => Math.hypot(p.x - pool.posX[h.index], p.z - pool.posZ[h.index])))
      expect(nearest).toBeCloseTo(E106_CAVALRY_VISUAL.carrierInset, 3)
    }
    runtime.applyHitIndex(pool, rider.index, rider.generation, 1e9)
    step({ x: 0, z: 0 })
    expect(syncCavalryLinks(mesh, pool, runtime)).toBe(0)
    expect(mesh.visible).toBe(false)
    for (const h of horses) {
      expect(pool.state[h.index]).toBe(N2_STATE_STUN)
      expect(miniPoseStyleFor('horse', pool, h.index, runtime)).toBe('horseLoose')
    }
    const out = createMiniPose()
    expect(Math.abs(fillMiniZombiePose(out, 'horseLoose', 'stun', 0.2)[MINI_POSE_ROOT_ROLL])).toBeGreaterThan(0.05) // 비틀
  })

  it('말이 다 쓰러지면 기수가 내려와 주저앉는다(riderDown, 들림·체력바 들림 0, 팔 없음)', async () => {
    const { syncCavalryLinks } = await import('../components/Wave3bMotionLayer.jsx')
    const { pool, runtime, step, bodies } = setup([[0, 10], [1, 11], [-1, 11], [0, 12]])
    const [rider, ...horses] = bodies
    for (const h of horses) runtime.applyHitIndex(pool, h.index, h.generation, 1e9)
    step({ x: 0, z: 0 })
    expect(pool.state[rider.index]).toBe(N2_STATE_STUN)
    expect(miniPoseStyleFor('horse', pool, rider.index, runtime)).toBe('riderDown')
    expect(novel2BarLiftWorld(pool, rider.index, runtime)).toBe(0)
    expect(syncCavalryLinks(armMesh(), pool, runtime)).toBe(0)
    const out = createMiniPose()
    const sit = fillMiniZombiePose(out, 'riderDown', 'stun', 0.4)
    expect(sit[MINI_POSE_LIFT]).toBe(0)
    expect(sit[19]).toBeLessThan(-0.3) // 바닥에 주저앉음(몸을 다리 길이만큼 내림)
    for (let f = 0; f < (E106_CAVALRY.dismountStunMs + 100) / 1000 / DT; f += 1) step({ x: 0, z: 0 })
    expect(pool.state[rider.index]).toBe(N2_STATE_APPROACH)
    expect(miniPoseStyleFor('horse', pool, rider.index, runtime)).toBe('riderDown') // 달린다(보통 좀비 걸음)
  })

  it('모자 뺏기 예고 = 빨간 부채꼴(90° · 반지름은 behavior E106_CAVALRY.coneRadius 그대로), 기수 팔은 젖혔다가(예고) 반대쪽으로 휘두른다(공격)', () => {
    const { pool, runtime, step, bodies } = setup()
    const rider = bodies[0]
    expect(runUntil(step, { x: 0, z: 0 }, () => pool.state[rider.index] === N2_STATE_TELEGRAPH, 12)).toBe(true)
    const hat = snapshotOf('E106')
    expect(hat.shape).toBe('sector'); expect(hat.angleDeg).toBe(E106_CAVALRY.coneAngleDeg); expect(hat.rangeUnits).toBe(E106_CAVALRY.coneRadius)
    const ext = telegraphExtents(hat)
    expect(ext.root.userData.fillMat.color.getHexString()).toBe(hex(NOVEL2_DAMAGE_TELEGRAPH_FILL.color))
    expect(ext.radius).toBeCloseTo(E106_CAVALRY.coneRadius, 2)
    expect(miniPoseStyleFor('horse', pool, rider.index, runtime)).toBe('rider')
    const out = createMiniPose()
    const windup = Array.from(fillMiniZombiePose(out, 'rider', 'warn', 0.5))
    const swipe = Array.from(fillMiniZombiePose(out, 'rider', 'charge', 0.5))
    expect(windup[12]).toBeLessThan(-2.6) // 오른팔을 머리 위로 높이(위 카메라에서 모자 위로 손이 보인다)
    expect(swipe[12]).toBeGreaterThan(-2); expect(swipe[14]).toBeGreaterThan(0.5) // 앞으로 내려 반대쪽(안쪽)으로 휘두름
    expect(Math.sign(windup[7])).not.toBe(Math.sign(swipe[7])) // 몸통 비틀기 방향이 바뀐다
    expect(windup[MINI_POSE_LIFT]).toBeCloseTo(MINI_RIDER_LIFT, 6)
    void runtime
  })
})

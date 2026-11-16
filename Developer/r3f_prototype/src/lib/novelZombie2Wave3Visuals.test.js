// @vitest-environment node
// 2차 신규 좀비 wave 3 치프(E98 대식가 · E101 복사기 · E104 공굴리기 대장) 그리기 쪽 계약. 2026-11-16, threemini.
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
      if (!n.isMesh) return
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

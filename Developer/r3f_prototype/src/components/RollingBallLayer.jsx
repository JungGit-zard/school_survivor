// E104 공굴리기 대장의 큰 공 — InstancedMesh 1개 = 드로콜 1개(대장이 없으면 visible=false라 0개). 2026-11-16, threemini.
//
// 공 하나가 손(단계 0 듦 · 1 겨눔)과 바닥(2 구름 · 3 멈춤) 사이를 오가므로 몸 레이어의 loose 소품 대신 이 레이어가 모든 단계를 같은
// 모양으로 그린다(표 miniZombieRoster 'n2-ball-roll-captain' loose drawnBy: 'rollingBall'). 모양 = GLB giantBall 소품(빨강 + 흰 띠,
// 팔레트 아틀라스 공용) 그대로, 지름 = 판정 지름 1.8u. 굴러가는/멈춘 공의 중심 = behavior ballStateInto(x, z) = 피해 판정 원의 중심.
// 굴림: 매 프레임 움직인 거리만큼 진행 방향의 수평 축으로 돈다(거리 / 반지름 rad — 미끄러지지 않고 구른다).
// 툰 규칙: MeshToonMaterial(공용 그라디언트·몸 레이어와 같은 아틀라스·발광 0.16) + 외곽선. 외곽선은 같은 지오메트리에 합친
// 뒤집힌 껍질(aOutline=1 → 프래그먼트에서 #050209)이라 드로콜이 늘지 않는다(LongRopeLayer와 같은 방식).
// 피해·타이머는 여기 없다(읽기 전용 뷰).
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import { MINI_ZOMBIES_URL } from './MiniZombieLayer.jsx'
import { enemyPool, enemySimulationRuntime } from '../lib/refs.js'
import { getToonGradient } from '../lib/toon.js'
import { getMiniZombieAssets } from '../lib/miniZombieGeometry.js'
import { createOutlineGeometry } from '../lib/projectileZombieShotGeometry.js'
import { E104_BALL_VISUAL, rollingBallInto } from '../lib/novelZombie2Wave3Visuals.js'
import { SPAWN_REVEAL_MS } from './PooledEnemyVisuals.js'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const OUTLINE_RGB = [0x05 / 255, 0x02 / 255, 0x09 / 255]

function flipWinding(geometry) {
  for (const name of Object.keys(geometry.attributes)) {
    const attribute = geometry.attributes[name]
    const n = attribute.itemSize
    const a = attribute.array
    for (let tri = 0; tri < attribute.count; tri += 3) {
      for (let k = 0; k < n; k += 1) {
        const i1 = (tri + 1) * n + k; const i2 = (tri + 2) * n + k
        const t = a[i1]; a[i1] = a[i2]; a[i2] = t
      }
    }
  }
  return geometry
}

/**
 * 지름 1 단위 공(중심 원점) + 외곽선 껍질을 한 지오메트리로. source = GLB giantBall 소품(구 r 0.5, 바닥 y 0)·없으면 프리미티브 구.
 * aOutline: 몸통 0 / 껍질 1. 껍질 두께 = outlineWidth / 지름(인스턴스 배율 = 지름이라 월드 두께가 outlineWidth가 된다).
 */
export function createRollingBallGeometry(source, diameter = E104_BALL_VISUAL.radius * 2) {
  let body
  if (source) {
    body = source.clone()
    body.computeBoundingBox()
    const size = body.boundingBox.getSize(new THREE.Vector3())
    const centre = body.boundingBox.getCenter(new THREE.Vector3())
    body.translate(-centre.x, -centre.y, -centre.z)
    const s = 1 / Math.max(size.x, size.y, size.z)
    body.scale(s, s, s)
  } else {
    body = new THREE.SphereGeometry(0.5, 12, 8)
  }
  body = body.index ? body.toNonIndexed() : body
  body.deleteAttribute('normal')
  body.computeVertexNormals() // 면 법선(툰 단이 면마다 끊긴다 — 몸 레이어와 같은 처리)
  const hull = flipWinding(createOutlineGeometry(body, E104_BALL_VISUAL.outlineWidth / diameter))
  const flag = (geometry, value) => {
    geometry.setAttribute('aOutline', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(value), 1))
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2))
    return geometry
  }
  const merged = mergeGeometries([flag(body, 0), flag(hull, 1)], false)
  body.dispose(); hull.dispose()
  merged.computeBoundingSphere()
  return merged
}

export function createRollingBallMaterial(atlas) {
  const material = new THREE.MeshToonMaterial({ color: atlas ? 0xffffff : 0xd83a3a, map: atlas, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: atlas ? 0.16 : 0, gradientMap: getToonGradient() })
  material.name = 'e104-rolling-ball-toon'
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aOutline;\nvarying float vBallOutline;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBallOutline = aOutline;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBallOutline;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  if (vBallOutline > 0.5) gl_FragColor = vec4(${OUTLINE_RGB.map((v) => v.toFixed(4)).join(', ')}, 1.0);`)
  }
  material.customProgramCacheKey = () => 'e104-rolling-ball-v1'
  return material
}

const ball = { phase: 0, x: 0, z: 0, radius: 0, held: true }
const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const mat = new THREE.Matrix4()
const delta = new THREE.Quaternion(); const axis = new THREE.Vector3()

/** 굴림 상태(대장 슬롯마다): 마지막으로 그린 공 중심·회전·세대. */
export function createRollingBallState(capacity = 200) {
  return { x: new Float32Array(capacity), z: new Float32Array(capacity), q: new Float32Array(capacity * 4), generation: new Int32Array(capacity).fill(-1) }
}

/**
 * 풀의 E104 대장마다 공 1개를 인스턴스 행렬로. 그린 공 개수를 돌려준다(테스트·GameCanvas 밖에서도 쓴다).
 * dt = 초(든 공이 따라붙는 보간). 구름·바닥 단계는 보간 없이 behavior 공 중심 그대로.
 */
export function syncRollingBalls(mesh, pool, runtime, state, dt = 1 / 60, clockSec = 0) {
  if (!mesh) return 0
  let count = 0
  const V = E104_BALL_VISUAL
  const radius = V.radius
  if (pool) {
    const max = Math.min(state.generation.length - 1, Number.isInteger(pool.highestActive) ? pool.highestActive : state.generation.length - 1)
    for (let i = 0; i <= max && count < mesh.instanceMatrix.count; i += 1) {
      if (pool.active[i] !== 1 || pool.type[i] !== V.type) continue
      if (!(pool.spawnTimer[i] >= SPAWN_REVEAL_MS)) continue
      if (!rollingBallInto(ball, pool, i, runtime, clockSec)) continue
      const generation = pool.generation ? pool.generation[i] : 0
      const fresh = state.generation[i] !== generation
      let x = ball.x; let z = ball.z
      if (fresh) {
        state.generation[i] = generation
        state.q[i * 4] = 0; state.q[i * 4 + 1] = 0; state.q[i * 4 + 2] = 0; state.q[i * 4 + 3] = 1
      } else if (ball.held) {
        const k = 1 - Math.exp(-V.heldFollowRate * Math.max(0, dt))
        x = state.x[i] + (ball.x - state.x[i]) * k
        z = state.z[i] + (ball.z - state.z[i]) * k
      }
      quat.fromArray(state.q, i * 4)
      if (!fresh) {
        const dx = x - state.x[i]; const dz = z - state.z[i]
        const dist = Math.hypot(dx, dz)
        // 굴림: 진행 방향(dx, dz)에 수직인 수평 축(위 × 진행)으로 dist / r. 한 프레임 3u 넘게 뛰면(판 리셋 등) 돌리지 않는다.
        if (dist > 1e-5 && dist < 3) {
          axis.set(dz / dist, 0, -dx / dist)
          delta.setFromAxisAngle(axis, dist / radius)
          quat.premultiply(delta).normalize()
          quat.toArray(state.q, i * 4)
        }
      }
      state.x[i] = x; state.z[i] = z
      pos.set(x, radius, z); scl.set(radius * 2, radius * 2, radius * 2)
      mesh.setMatrixAt(count, mat.compose(pos, quat, scl))
      count += 1
    }
  }
  mesh.count = count
  mesh.visible = count > 0
  if (count > 0) {
    mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, count * 16); mesh.instanceMatrix.needsUpdate = true
  }
  return count
}

function RollingBallLayerInner({ resetKey }) {
  const gltf = useGLTF(MINI_ZOMBIES_URL, false, true)
  const mesh = useMemo(() => {
    const assets = getMiniZombieAssets(gltf?.scene, createOutlineGeometry)
    const atlas = assets?.map ?? null
    if (atlas) {
      // 몸 레이어와 같은 아틀라스 설정(같은 텍스처 객체 — 어느 레이어가 먼저 마운트돼도 같은 값).
      atlas.colorSpace = THREE.SRGBColorSpace; atlas.flipY = false
      atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false
      atlas.needsUpdate = true
    }
    const m = new THREE.InstancedMesh(createRollingBallGeometry(assets?.raw?.props?.giantBall ?? null), createRollingBallMaterial(atlas), E104_BALL_VISUAL.capacity)
    m.name = 'e104-rolling-ball'
    m.frustumCulled = false
    m.renderOrder = 2
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < E104_BALL_VISUAL.capacity; i += 1) m.setMatrixAt(i, ZERO)
    m.count = 0
    // 처음 두 프레임은 0개인 채로 보이게 둔다(스테이지 진입 셰이더 프리웜 — LongRopeLayer와 같다).
    m.visible = true
    return m
  }, [gltf])
  const state = useMemo(() => createRollingBallState(), [])
  const frame = useRef(0)
  useEffect(() => () => { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose() }, [mesh])
  useLayoutEffect(() => { mesh.count = 0; state.generation.fill(-1) }, [mesh, state, resetKey])
  useFrame((_, dt) => {
    frame.current += 1
    const ms = enemySimulationRuntime?.novel2?.clockMs
    const drawn = syncRollingBalls(mesh, enemyPool, enemySimulationRuntime, state, dt, Number.isFinite(ms) ? ms * 0.001 : 0)
    if (drawn === 0 && frame.current <= 2) mesh.visible = true
  })
  return <primitive object={mesh} />
}

// GLB를 기다리는 동안·실패해도 다른 장면 요소는 기다리지 않는다(MiniZombieLayer와 같은 경계).
export default function RollingBallLayer(props) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <RollingBallLayerInner {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

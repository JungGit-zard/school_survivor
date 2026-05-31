import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerArmActionState, playerFacing, playerPos } from '../../lib/refs.js'
import { pickBoxCutterTargets, normalizePlanarFacing } from '../../lib/boxCutter.js'
import { startPlayerArmAction, computeBoxCutterActionPhases, BOX_CUTTER_ACTION_MS } from '../../lib/playerArmAction.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

function BoxCutterModel() {
  const handleMat = useMemo(() => toonMat(0xffc928, 0.16), [])
  const gripMat = useMemo(() => toonMat(0x2e3747, 0.08), [])
  const bladeMat = useMemo(() => toonMat(0xdce6ee, 0.06), [])
  const edgeMat = useMemo(() => toonMat(0xffffff, 0.12), [])
  const outMat = useMemo(() => outlineMat(0.95), [])

  return (
    <group scale={[0.42, 0.42, 0.42]} rotation={[0.12, 0, -0.08]}>
      <mesh material={outMat} position={[0, 0, -0.12]} scale={inflateScale([1.1, 1.12, 1.08])}>
        <boxGeometry args={[0.22, 0.18, 0.74]} />
      </mesh>
      <mesh material={handleMat} position={[0, 0, -0.12]}>
        <boxGeometry args={[0.22, 0.18, 0.74]} />
      </mesh>
      <mesh material={gripMat} position={[0, 0.095, -0.18]}>
        <boxGeometry args={[0.16, 0.025, 0.46]} />
      </mesh>
      <mesh material={outMat} position={[0, 0.01, 0.42]} scale={inflateScale([1.14, 1.12, 1.08])}>
        <boxGeometry args={[0.13, 0.095, 0.52]} />
      </mesh>
      <mesh material={bladeMat} position={[0, 0.01, 0.42]}>
        <boxGeometry args={[0.13, 0.095, 0.52]} />
      </mesh>
      <mesh material={edgeMat} position={[0.045, 0.062, 0.42]}>
        <boxGeometry args={[0.022, 0.014, 0.48]} />
      </mesh>
    </group>
  )
}

const easeOut = (t) => 1 - (1 - t) * (1 - t)

// 베기 궤도 — 직각으로 꺾인 L자 경로(로컬 전방 +z). 전방으로 찌른 뒤 우측(+x)으로
// 90° 꺾어 베는 형태. 정점 색 밝기로 그라데이션을 준다: 시작=밝음(진함) → 끝=어두움(옅음).
// AdditiveBlending에서는 색 밝기 ≈ 가시성이므로 이것이 opacity 그라데이션처럼 보인다.
const SLASH_PATH = [
  [-0.1, 0.28],
  [-0.1, 0.58],
  [-0.1, 0.9],
  [-0.1, 0.98],
  [0.2, 0.98],
  [0.52, 0.98],
  [0.84, 0.98],
]

// 효과 그래픽 표현 크기 — 기존(≈1.275)의 2/3. 게임플레이 범위(weaponCatalog의 range/width)와
// 분리된 시각 전용 값이라, 범위를 좁혀도 잔상 그래픽 크기는 여기서 독립적으로 정한다.
const VISUAL_REACH = 1.275 * (2 / 3)

// 동작 길이는 playerArmAction의 단일 정의(BOX_CUTTER_ACTION_MS)를 그대로 사용한다.
const ACTION_MS = BOX_CUTTER_ACTION_MS

function buildSlashRibbon(points, halfWidth) {
  const n = points.length
  const positions = new Float32Array(n * 2 * 3)
  const colors = new Float32Array(n * 2 * 3)
  for (let i = 0; i < n; i += 1) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(n - 1, i + 1)]
    let tx = next[0] - prev[0]
    let tz = next[1] - prev[1]
    const tl = Math.hypot(tx, tz) || 1
    tx /= tl
    tz /= tl
    const px = -tz // 진행방향에 수직(평면 내)
    const pz = tx
    const t = i / (n - 1)
    const w = halfWidth * (1 - 0.45 * t) // 끝으로 갈수록 얇게
    const b = THREE.MathUtils.lerp(1, 0.05, t) // 시작=밝음 → 끝=어두움(옅어짐)
    const cx = points[i][0]
    const cz = points[i][1]
    const li = i * 2
    const ri = i * 2 + 1
    positions[li * 3] = cx + px * w
    positions[li * 3 + 1] = 0
    positions[li * 3 + 2] = cz + pz * w
    positions[ri * 3] = cx - px * w
    positions[ri * 3 + 1] = 0
    positions[ri * 3 + 2] = cz - pz * w
    for (const vi of [li, ri]) {
      colors[vi * 3] = b // R
      colors[vi * 3 + 1] = b * 0.93 // G
      colors[vi * 3 + 2] = b * 0.5 // B → 노란 칼빛
    }
  }
  const index = []
  for (let i = 0; i < n - 1; i += 1) {
    const a = i * 2
    const b = i * 2 + 1
    const c = (i + 1) * 2
    const d = (i + 1) * 2 + 1
    index.push(a, b, c, b, d, c)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(index)
  return geo
}

function BoxCutterStrikeEffect({ strike, duration }) {
  const rootRef = useRef(null)
  const ribbonRef = useRef(null)
  const tipRef = useRef(null)
  const geometry = useMemo(() => buildSlashRibbon(SLASH_PATH, 0.13), [])
  const mats = useMemo(() => ({
    ribbon: new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    tip: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  }), [])

  useFrame(({ clock }) => {
    if (!strike || !rootRef.current) return

    const elapsed = clock.elapsedTime * 1000 - strike.startMs
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1)
    const dir = normalizePlanarFacing(strike.facing)
    const yaw = Math.atan2(dir.x, dir.z)

    rootRef.current.position.set(playerPos.x, playerPos.y + 0.235, playerPos.z)
    rootRef.current.rotation.set(0, yaw, 0)

    // 잔상은 동작 앞부분(전방 찌르기)에서만 빠르게 번쩍였다 사라진다.
    // (전체 동작은 460ms지만 슬래시 자국은 progress 0.4 즈음 이미 사라짐)
    const appear = THREE.MathUtils.clamp(progress / 0.09, 0, 1)
    const fade = 1 - THREE.MathUtils.clamp((progress - 0.2) / 0.2, 0, 1)
    const grow = THREE.MathUtils.lerp(0.8, 1.04, easeOut(appear))
    const reach = VISUAL_REACH * grow

    if (ribbonRef.current) ribbonRef.current.scale.set(reach, 1, reach)
    if (tipRef.current) {
      // 직각으로 꺾이는 코너에 임팩트 스파크
      const pulse = 1 + Math.sin(progress * Math.PI) * 0.8
      tipRef.current.position.set(-0.1 * reach, 0.02, 0.98 * reach)
      tipRef.current.scale.setScalar(pulse)
    }

    mats.ribbon.opacity = appear * fade
    mats.tip.opacity = 0.85 * appear * (1 - THREE.MathUtils.clamp((progress - 0.22) / 0.18, 0, 1))
  })

  return (
    <group ref={rootRef} renderOrder={20}>
      <mesh ref={ribbonRef} geometry={geometry} material={mats.ribbon} />
      <mesh ref={tipRef} material={mats.tip}>
        <octahedronGeometry args={[0.05, 0]} />
      </mesh>
    </group>
  )
}

export function BoxCutterWeapon() {
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const [strike, setStrike] = useState(null)
  const visualRef = useRef(null)
  const lastFireRef = useRef(-Infinity)

  useFrame(({ clock }) => {
    const w = weapons.boxCutter
    if (phase !== 'playing' || !w?.active) return

    const now = clock.elapsedTime * 1000
    const duration = ACTION_MS

    if (strike) {
      const elapsed = now - strike.startMs
      const progress = Math.min(1, elapsed / duration)
      const dir = normalizePlanarFacing(strike.facing)
      const yaw = Math.atan2(dir.x, dir.z)
      // 칼도 팔과 동일한 위상으로 (1) 앞으로 쭉 → (2) 위로 들어올린다. (공용 헬퍼로 타이밍 일치)
      const { thrust, raise, env } = computeBoxCutterActionPhases(progress)
      const forward = (THREE.MathUtils.lerp(0.26, 0.66, thrust) - raise * 0.32) * env
      const lift = (0.22 + raise * 0.66) - (1 - env) * raise * 0.66 // 위로 들었다 마지막에 복귀

      if (visualRef.current) {
        visualRef.current.position.set(
          playerPos.x + dir.x * forward,
          playerPos.y + lift,
          playerPos.z + dir.z * forward,
        )
        // 칼끝이 전방 → 위로 향하도록 기울임
        visualRef.current.rotation.set(-0.25 - raise * 0.5 * env, yaw + Math.PI * 0.02, -0.3 - thrust * 0.2 * env)
      }

      if (progress >= 1) setStrike(null)
      return
    }

    if (now - lastFireRef.current < (w.cooldown ?? 1100)) return

    const facing = normalizePlanarFacing(playerFacing)
    const targets = pickBoxCutterTargets({
      enemies: enemyBodies,
      origin: playerPos,
      facing,
      range: w.range ?? 1.275,
      width: w.width ?? 0.22,
    })
    if (targets.length === 0) return

    lastFireRef.current = now
    startPlayerArmAction(playerArmActionState, 'boxCutter', now, duration)
    targets.forEach(({ rb }) => {
      rb._enemyHit(w.damage, {
        source: { x: playerPos.x, z: playerPos.z },
        knockback: w.knockback ?? 1.8,
        knockbackMs: 80,
      })
    })
    setStrike({ startMs: now, facing, range: w.range ?? 1.275, width: w.width ?? 0.22 })
  })

  if (!weapons.boxCutter?.active || !strike) return null

  return (
    <>
      <group ref={visualRef} position={[playerPos.x, playerPos.y + 0.22, playerPos.z]}>
        <BoxCutterModel />
      </group>
      <BoxCutterStrikeEffect strike={strike} duration={ACTION_MS} />
    </>
  )
}

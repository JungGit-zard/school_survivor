import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGameStore } from '../store/useGameStore.js'
import { playerFacing, playerPos, joystickDir } from '../lib/refs.js'
import PlayerMesh from './PlayerMesh.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'

const _v = { x: 0, y: 0, z: 0 }
const INV_DURATION = 520
const TURN_SPEED = 14
// 플레이어 이동 한계. 카메라가 45°로 비스듬해 시야 여백이 축마다 달라, 축별로 다르게 막는다.
// - 세로(z): 위쪽 시야 여백(reachUp≈12.5)이 커서 벽(±48)까지 가면 화면 밖으로 크게 빠짐 → 안쪽 ±44.
// - 가로(x): 좌우 시야 여백(reachSide≈4.6)이 작아 ±48이면 화면 끝을 넘어 절반이 밖으로 나감
//   → 화면 끝 살짝 안쪽 ±46에서 멈춰 "좌우 끝 가까이"까지 보이는 상태로.
const PLAYER_BOUND_X = 46
const PLAYER_BOUND_Z = 44
const clampAbs = (v, bound) => Math.min(bound, Math.max(-bound, v))

function shortestAngleDiff(target, current) {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return diff
}

export default function Player() {
  const rb        = useRef()
  const meshGroup = useRef()
  const movingRef = useRef(false)
  const invTimer  = useRef(0)
  const [, getKeys] = useKeyboardControls()
  const speed           = useGameStore((s) => s.player.speed)
  const phase           = useGameStore((s) => s.phase)
  const hp              = useGameStore((s) => s.player.hp)
  const maxHp           = useGameStore((s) => s.player.maxHp)
  const endInvulnerable = useGameStore((s) => s.endInvulnerable)
  const damagePlayer    = useGameStore((s) => s.damagePlayer)

  // 적 투사체가 플레이어를 감지할 수 있도록 RigidBody ref에 핸들러 등록
  useEffect(() => {
    if (rb.current) rb.current._playerHit = (dmg) => damagePlayer(dmg)
  })

  useFrame((_, delta) => {
    if (!rb.current) return
    if (phase !== 'playing') { rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true); return }

    const { up, down, left, right } = getKeys()

    if (joystickDir.active) {
      _v.x = joystickDir.x
      _v.z = joystickDir.z
    } else {
      _v.x = (right ? 1 : 0) - (left ? 1 : 0)
      _v.z = (down  ? 1 : 0) - (up   ? 1 : 0)
    }

    const len = Math.hypot(_v.x, _v.z)
    movingRef.current = len > 0
    if (len > 0) {
      const nx = _v.x / len
      const nz = _v.z / len
      const targetY = Math.atan2(nx, nz)

      if (meshGroup.current) {
        const turnRatio = Math.min(1, delta * TURN_SPEED)
        meshGroup.current.rotation.y += shortestAngleDiff(targetY, meshGroup.current.rotation.y) * turnRatio
      }

      _v.x = nx * speed
      _v.z = nz * speed
    }

    rb.current.setLinvel({ x: _v.x, y: 0, z: _v.z }, true)

    // 화면 밖으로 못 나가게 축별 경계로 클램프 (가로 ±46, 세로 ±44)
    const t = rb.current.translation()
    const cx = clampAbs(t.x, PLAYER_BOUND_X)
    const cz = clampAbs(t.z, PLAYER_BOUND_Z)
    if (cx !== t.x || cz !== t.z) {
      rb.current.setTranslation({ x: cx, y: t.y, z: cz }, true)
    }

    // 전역 위치 동기화
    playerPos.set(cx, t.y, cz)

    // 무적 타이머 (setTimeout 대신 useFrame에서 처리)
    const inv = useGameStore.getState().player.invulnerable
    if (inv) {
      invTimer.current += delta * 1000
      if (invTimer.current >= INV_DURATION) {
        invTimer.current = 0
        endInvulnerable()
      }
    } else {
      invTimer.current = 0
    }

    // 무적 점멸 (80ms 간격)
    if (meshGroup.current) {
      meshGroup.current.visible = !inv || Math.floor(performance.now() / 80) % 2 === 0
    }

    // 이동 방향으로 메시 회전 (최단경로 보간 — ±π 경계 처리)
    if (meshGroup.current) {
      playerFacing.set(Math.sin(meshGroup.current.rotation.y), 0, Math.cos(meshGroup.current.rotation.y))
    }
  })

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      position={[0, 0.32, 0]}   // 콜라이더 반높이(0.32) 만큼 올려 발이 바닥에 닿게
      lockRotations
      linearDamping={10}
      colliders={false}
    >
      <CuboidCollider args={[0.136, 0.32, 0.136]} />
      <PlayerMesh groupRef={meshGroup} movingRef={movingRef} />
      <MiniHealthBar current={hp} max={maxHp} width={0.38} height={0.052} y={0.75} />
    </RigidBody>
  )
}

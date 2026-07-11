import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos, playerFacing, playerArmActionState } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyForwardConeDamage } from '../../lib/weaponTargeting.js'
import { startPlayerArmAction } from '../../lib/playerArmAction.js'
import { PLAYER_MESH_SCALE } from '../../lib/characterVisualScale.js'

const lanternBeamVertexShader = `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lanternBeamFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uLength;
  uniform float uWidth;
  uniform float uBaseWidth;
  varying vec2 vLocal;

  void main() {
    float y01 = clamp(vLocal.y / max(uLength, 0.001), 0.0, 1.0);
    float halfWidth = mix(uBaseWidth * 0.5, uWidth * 0.5, y01);
    float edge01 = clamp(abs(vLocal.x) / max(halfWidth, 0.001), 0.0, 1.0);
    float sideAlpha = 1.0 - smoothstep(0.18, 1.0, edge01);
    float tipAlpha = 1.0 - smoothstep(0.78, 1.0, y01);
    gl_FragColor = vec4(uColor, uOpacity * sideAlpha * tipAlpha);
  }
`

function createLanternBeamUniforms(color, opacity, length, width, baseWidth) {
  return {
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uLength: { value: length },
    uWidth: { value: width },
    uBaseWidth: { value: baseWidth },
  }
}

function setLanternBeamOpacity(mesh, opacity) {
  const uniforms = mesh?.material?.uniforms
  if (uniforms?.uOpacity) uniforms.uOpacity.value = opacity
}

const LANTERN_LENS_FORWARD_OFFSET = 0.46
const LANTERN_HAND_LIGHT_CONE_RAW_LENGTH = 0.62
const LANTERN_BEAM_FORWARD_OFFSET = LANTERN_LENS_FORWARD_OFFSET + LANTERN_HAND_LIGHT_CONE_RAW_LENGTH * PLAYER_MESH_SCALE
const LANTERN_BEAM_VISUAL_SCALE = 1 / 3

export function getLanternBeamOrigin(player, facing) {
  const rawDirX = facing?.x ?? 0
  const rawDirZ = facing?.z ?? 1
  const len = Math.hypot(rawDirX, rawDirZ) || 1
  const dirX = rawDirX / len
  const dirZ = rawDirZ / len

  return {
    x: player.x + dirX * LANTERN_BEAM_FORWARD_OFFSET,
    z: player.z + dirZ * LANTERN_BEAM_FORWARD_OFFSET,
  }
}

// 학생용 랜턴 (신무기 2026-07-04, 스탯 정본: weaponCatalog.studentLantern)
// 점등하면 durationMs 동안 전방으로 퍼지는 빛 콘(lightLength × lightWidth)을 비추고,
// 그 안의 모든 적이 hitIntervalMs마다 피해를 받는다. 점등 즉시 1타 →
// 3초/1초 간격 = 3타 (기획). 빛은 플레이어 이동·회전을 따라간다.

export function StudentLanternWeapon() {
  const litRef = useRef(false)
  const litAgeRef = useRef(0)       // 점등 후 경과(초)
  const tickTimerRef = useRef(0)    // 다음 타격까지 누적(ms). 점등 즉시 1타를 위해 interval로 초기화.
  const lastFireRef = useRef(0)
  const groupRef = useRef(null)
  const beamRef = useRef(null)
  const coreRef = useRef(null)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const w = weapons.studentLantern
  const renderLength = (w?.lightLength ?? 2.08) * LANTERN_BEAM_VISUAL_SCALE
  const renderWidth = (w?.lightWidth ?? 3.6) * LANTERN_BEAM_VISUAL_SCALE
  const renderBaseWidth = (w?.lightBaseWidth ?? 0.35) * LANTERN_BEAM_VISUAL_SCALE
  const renderCoreLength = renderLength * 0.68
  const renderCoreBaseWidth = renderBaseWidth * 0.65
  const renderCoreWidth = renderWidth * 0.48
  const beamShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-renderBaseWidth / 2, 0)
    shape.lineTo(renderBaseWidth / 2, 0)
    shape.lineTo(renderWidth / 2, renderLength)
    shape.lineTo(-renderWidth / 2, renderLength)
    shape.closePath()
    return shape
  }, [renderBaseWidth, renderLength, renderWidth])
  const coreShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-renderCoreBaseWidth / 2, 0)
    shape.lineTo(renderCoreBaseWidth / 2, 0)
    shape.lineTo(renderCoreWidth / 2, renderCoreLength)
    shape.lineTo(-renderCoreWidth / 2, renderCoreLength)
    shape.closePath()
    return shape
  }, [renderCoreBaseWidth, renderCoreLength, renderCoreWidth])
  const beamUniforms = useMemo(
    () => createLanternBeamUniforms(0xffd964, 0.3, renderLength, renderWidth, renderBaseWidth),
    [renderBaseWidth, renderLength, renderWidth],
  )
  const coreUniforms = useMemo(
    () => createLanternBeamUniforms(0xfff0b0, 0.38, renderCoreLength, renderCoreWidth, renderCoreBaseWidth),
    [renderCoreBaseWidth, renderCoreLength, renderCoreWidth],
  )

  usePlayingFrame(({ clock }, delta) => {
    if (!w?.active) return
    const now = clock.elapsedTime * 1000
    const durationMs = w.durationMs ?? 3000
    const intervalMs = w.hitIntervalMs ?? 300
    const length = w.lightLength ?? 2.08
    const width = w.lightWidth ?? 3.6
    const baseWidth = w.lightBaseWidth ?? 0.35

    // 소등 상태: 쿨다운(점등 시작 기준) 경과 시 점등
    if (!litRef.current) {
      if (now - lastFireRef.current < (w.cooldown ?? 8000)) {
        if (groupRef.current) groupRef.current.visible = false
        return
      }
      litRef.current = true
      litAgeRef.current = 0
      tickTimerRef.current = intervalMs // 점등 즉시 첫 타격
      lastFireRef.current = now
      emitSfx({ id: 'lanternFire' })
    }

    litAgeRef.current += delta
    if (litAgeRef.current * 1000 >= durationMs) {
      litRef.current = false
      if (groupRef.current) groupRef.current.visible = false
      return
    }

    // 빛을 플레이어 위치·시선에 정렬
    startPlayerArmAction(playerArmActionState, 'lanternFlashlight', now)
    const yaw = Math.atan2(playerFacing.x, playerFacing.z)
    if (groupRef.current) {
      const beamOrigin = getLanternBeamOrigin(playerPos, playerFacing)
      groupRef.current.visible = true
      groupRef.current.position.set(beamOrigin.x, 0, beamOrigin.z)
      groupRef.current.rotation.y = yaw
      // 촛불 흔들림 느낌의 밝기 플리커
      const flicker = 0.9 + Math.sin(litAgeRef.current * 17) * 0.08 + Math.sin(litAgeRef.current * 5.3) * 0.05
      setLanternBeamOpacity(beamRef.current, 0.30 * flicker)
      setLanternBeamOpacity(coreRef.current, 0.38 * flicker)
    }

    // hitIntervalMs마다 빛 콘 안 전원 타격
    tickTimerRef.current += delta * 1000
    if (tickTimerRef.current >= intervalMs) {
      tickTimerRef.current -= intervalMs
      const hits = applyForwardConeDamage({
        originX: playerPos.x, originZ: playerPos.z,
        dirX: playerFacing.x, dirZ: playerFacing.z,
        length, width, baseWidth, damage: w.damage ?? 0.6,
      })
      if (hits > 0) {
        emitSfx({
          id: 'lanternTick',
          volume: 0.20 + Math.random() * 0.05,
          rate: 0.82 + Math.random() * 0.12,
        })
      }
    }
  })

  if (!w?.active) return null

  return (
    <group ref={groupRef} visible={false}>
      {/* 넓어지는 랜턴 콘 - 플레이어 앞에서 시작해 12시 방향으로 퍼진다. */}
      <mesh ref={beamRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} renderOrder={3}>
        <shapeGeometry args={[beamShape]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={lanternBeamVertexShader}
          fragmentShader={lanternBeamFragmentShader}
          uniforms={beamUniforms}
        />
      </mesh>
      <mesh ref={coreRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} renderOrder={4}>
        <shapeGeometry args={[coreShape]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={lanternBeamVertexShader}
          fragmentShader={lanternBeamFragmentShader}
          uniforms={coreUniforms}
        />
      </mesh>
    </group>
  )
}

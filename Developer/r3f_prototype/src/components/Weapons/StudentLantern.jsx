import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos, playerFacing, playerArmActionState } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyForwardConeDamage } from '../../lib/weaponTargeting.js'
import { LIFESTEAL_HEAL_FLASH_INTERVAL_MS } from '../../lib/weaponLifesteal.js'
import { startPlayerArmAction } from '../../lib/playerArmAction.js'
import { PLAYER_MESH_SCALE } from '../../lib/characterVisualScale.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

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
    // uColor는 THREE.Color라 선형 공간 값이다. 출력 색공간(sRGB)으로 변환해야 지정한 hex 색이 나온다.
    #include <colorspace_fragment>
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

// 크기 uniform은 값만 바꾼다. uniforms 객체를 갈아 끼우면 렌더러는 컴파일 때 잡은 옛 객체를
// 계속 올린다. Studio 재질 튜닝이 재질을 복제할 수 있으므로 지금 메시에 붙은 재질에 쓴다.
function setLanternBeamSize(mesh, length, width, baseWidth) {
  const uniforms = mesh?.material?.uniforms
  if (!uniforms?.uLength) return
  uniforms.uLength.value = length
  uniforms.uWidth.value = width
  uniforms.uBaseWidth.value = baseWidth
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

export function StudentLanternVisual({ beamRef: beamRefProp = null, coreRef: coreRefProp = null, length = 2.08 * LANTERN_BEAM_VISUAL_SCALE, width = 3.6 * LANTERN_BEAM_VISUAL_SCALE, baseWidth = 0.35 * LANTERN_BEAM_VISUAL_SCALE }) {
  const coreLength = length * 0.68
  const coreBaseWidth = baseWidth * 0.65
  const coreWidth = width * 0.48
  const beamShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-baseWidth / 2, 0)
    shape.lineTo(baseWidth / 2, 0)
    shape.lineTo(width / 2, length)
    shape.lineTo(-width / 2, length)
    shape.closePath()
    return shape
  }, [baseWidth, length, width])
  const coreShape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-coreBaseWidth / 2, 0)
    shape.lineTo(coreBaseWidth / 2, 0)
    shape.lineTo(coreWidth / 2, coreLength)
    shape.lineTo(-coreWidth / 2, coreLength)
    shape.closePath()
    return shape
  }, [coreBaseWidth, coreLength, coreWidth])
  const localBeamRef = useRef(null)
  const localCoreRef = useRef(null)
  const beamRef = beamRefProp ?? localBeamRef
  const coreRef = coreRefProp ?? localCoreRef
  // 마운트당 한 번만 만든다. 이후 스탯 변화는 아래 layout effect가 값만 갱신한다.
  const beamUniforms = useMemo(
    () => createLanternBeamUniforms(0xffd964, 0.3, length, width, baseWidth),
    [],
  )
  const coreUniforms = useMemo(
    () => createLanternBeamUniforms(0xfff0b0, 0.38, coreLength, coreWidth, coreBaseWidth),
    [],
  )
  useLayoutEffect(() => {
    setLanternBeamSize(beamRef.current, length, width, baseWidth)
    setLanternBeamSize(coreRef.current, coreLength, coreWidth, coreBaseWidth)
  }, [beamRef, coreRef, length, width, baseWidth, coreLength, coreWidth, coreBaseWidth])

  return (
    <>
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
    </>
  )
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
  // 랜턴은 ~150ms마다 소량 회복한다. HP는 매 틱 올리되 회복 이펙트는 근접 흡혈과 같은 간격으로만 켠다.
  const lastHealFlashMsRef = useRef(-Infinity)
  const groupRef = useRef(null)
  const beamRef = useRef(null)
  const coreRef = useRef(null)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const w = weapons.studentLantern
  const renderLength = (w?.lightLength ?? 2.08) * LANTERN_BEAM_VISUAL_SCALE
  const renderWidth = (w?.lightWidth ?? 3.6) * LANTERN_BEAM_VISUAL_SCALE
  const renderBaseWidth = (w?.lightBaseWidth ?? 0.35) * LANTERN_BEAM_VISUAL_SCALE

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
        // 폴백은 카탈로그 base.damage와 같은 값이어야 한다. 0.6은 카탈로그에서 이미 제거된
        // 죽은 값인데 여기만 남아 있었다(발동 시 실제의 4배).
        length, width, baseWidth, damage: w.damage ?? 0.15,
        critChance: w.critChance,
        critMultiplier: w.critMultiplier,
      })
      if (hits > 0) {
        const store = useGameStore.getState()
        const healPercent = Number.isFinite(w.healPercentOnHit) ? w.healPercentOnHit : 0.0008
        const healAmount = Math.max(0, store.player.maxHp * healPercent)
        if (healAmount > 0 && store.player.hp < store.player.maxHp) {
          const nowMs = clock.elapsedTime * 1000
          const flash = nowMs - lastHealFlashMsRef.current >= LIFESTEAL_HEAL_FLASH_INTERVAL_MS
          if (flash) lastHealFlashMsRef.current = nowMs
          store.healPlayer(healAmount, { silent: true, flash })
        }
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
      <StudioTunedGroup itemId="weapon-student-lantern">
        {/* 넓어지는 랜턴 콘 - 플레이어 앞에서 시작해 12시 방향으로 퍼진다. */}
        <StudentLanternVisual
          beamRef={beamRef}
          coreRef={coreRef}
          length={renderLength}
          width={renderWidth}
          baseWidth={renderBaseWidth}
        />
      </StudioTunedGroup>
    </group>
  )
}

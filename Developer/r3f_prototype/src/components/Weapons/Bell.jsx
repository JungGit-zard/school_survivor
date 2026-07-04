import { useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { getBellSonicRingConfigs, BELL_VISUAL_SCALE, BELL_NOTE_LIFETIME_MS, createBellNoteSpecs } from '../../lib/bell.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

let _bellPulseId = 0

export function BellModel() {
  const bellMat = useMemo(() => toonMat(0xffd040, 0.2), [])
  const rimMat = useMemo(() => toonMat(0xf0a820, 0.16), [])
  const handleMat = useMemo(() => toonMat(0x8a4a18, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.36, 0.36, 0.36]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.1, 1.12])} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={bellMat} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={rimMat} position={[0, -0.31, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 12]} />
      </mesh>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.12])} position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 14]} />
      </mesh>
      <mesh material={handleMat} position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 14]} />
      </mesh>
      <mesh material={outMat} position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
      </mesh>
    </group>
  )
}

// 2D 음표 (♪/♫) — 평면 도형 조합, 카메라 각도(-45°)로 눕혀 빌보드처럼 보이게.
function MusicNoteShape({ variant, material, outlineMaterial }) {
  const single = variant === 'single'
  const parts = (mat, inflate = 0) => (
    <group scale={[1 + inflate, 1 + inflate, 1]}>
      {/* 머리(타원) */}
      <mesh material={mat} position={[0, 0, 0]} scale={[1.25, 0.9, 1]}>
        <circleGeometry args={[0.075, 20]} />
      </mesh>
      {/* 기둥 */}
      <mesh material={mat} position={[0.082, 0.16, 0]}>
        <planeGeometry args={[0.028, 0.36]} />
      </mesh>
      {single ? (
        /* 8분음표 깃발 */
        <mesh material={mat} position={[0.15, 0.29, 0]} rotation={[0, 0, -0.65]}>
          <planeGeometry args={[0.13, 0.05]} />
        </mesh>
      ) : (
        <>
          {/* 두 번째 머리+기둥, 상단 빔 (♫) */}
          <mesh material={mat} position={[0.26, 0.02, 0]} scale={[1.25, 0.9, 1]}>
            <circleGeometry args={[0.075, 20]} />
          </mesh>
          <mesh material={mat} position={[0.342, 0.18, 0]}>
            <planeGeometry args={[0.028, 0.36]} />
          </mesh>
          <mesh material={mat} position={[0.212, 0.345, 0]} rotation={[0, 0, 0.08]}>
            <planeGeometry args={[0.3, 0.06]} />
          </mesh>
        </>
      )}
    </group>
  )
  return (
    <>
      {/* 뒤에 살짝 큰 어두운 사본 = 2D 외곽선 */}
      <group position={[0, 0, -0.005]}>{parts(outlineMaterial, 0.28)}</group>
      {parts(material)}
    </>
  )
}

function BellPulse({ id, startMs, radius, onDone }) {
  const ringRefs = useRef([])
  const noteRefs = useRef([])
  const ringConfigs = useMemo(() => getBellSonicRingConfigs(), [])
  const noteSpecs = useMemo(() => createBellNoteSpecs(3), [])
  // 음표별 개별 머티리얼 — 등장 딜레이가 달라 페이드도 개별이어야 한다
  const noteMats = useMemo(() => noteSpecs.map(() => ({
    fill: new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    out: new THREE.MeshBasicMaterial({ color: 0x4a3208, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  })), [noteSpecs])

  usePlayingFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    const t = Math.min(1, age / 520)
    const ease = 1 - Math.pow(1 - t, 3)

    ringRefs.current.forEach((ring, idx) => {
      if (!ring) return
      const config = ringConfigs[idx]
      const waveProgress = Math.min(1, ease + config.scaleOffset)
      // BELL_VISUAL_SCALE: 그래픽만 1.5배 — 공격 판정(radius)은 불변
      const scale = scaleEffectVisual(0.2 + radius * 2 * waveProgress) * BELL_VISUAL_SCALE
      const opacity = 0.55 * (1 - t) * config.opacityMult
      ring.position.set(playerPos.x, 0.075 + idx * 0.003, playerPos.z)
      ring.scale.setScalar(scale)
      ring.material.opacity = opacity
    })

    // 2D 음표: 벨 주변에서 순차 등장 → 흔들리며 상승 → 페이드아웃
    let anyNoteAlive = false
    noteRefs.current.forEach((note, idx) => {
      if (!note) return
      const spec = noteSpecs[idx]
      const noteAge = age - spec.delayMs
      if (noteAge < 0) { anyNoteAlive = true; return }
      const nt = Math.min(1, noteAge / BELL_NOTE_LIFETIME_MS)
      if (nt < 1) anyNoteAlive = true
      const sway = Math.sin(noteAge * 0.006 + spec.swayPhase) * 0.09
      note.position.set(
        playerPos.x + Math.sin(spec.angle) * spec.dist + sway,
        0.55 + nt * spec.riseHeight,
        playerPos.z + Math.cos(spec.angle) * spec.dist,
      )
      note.rotation.set(-Math.PI / 4, 0, Math.sin(noteAge * 0.004 + spec.swayPhase) * 0.18)
      note.scale.setScalar(spec.scale * BELL_VISUAL_SCALE)
      // 빠른 등장(12%) 후 서서히 소멸
      const fade = Math.max(0, nt < 0.12 ? nt / 0.12 : 1 - (nt - 0.12) / 0.88)
      noteMats[idx].fill.opacity = fade * 0.95
      noteMats[idx].out.opacity = fade * 0.85
    })

    if (t >= 1 && !anyNoteAlive) onDone(id)
  })

  return (
    <>
      {ringConfigs.map((config, idx) => (
        <mesh
          key={`${config.shape}-${idx}`}
          ref={(node) => { ringRefs.current[idx] = node }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[playerPos.x, 0.075 + idx * 0.003, playerPos.z]}
          renderOrder={5}
        >
          <torusGeometry args={[0.48, 0.035, 8, 96]} />
          <meshBasicMaterial color={0xffdf5a} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {noteSpecs.map((spec, idx) => (
        <group
          key={`note-${idx}`}
          ref={(node) => { noteRefs.current[idx] = node }}
          position={[playerPos.x, 0.55, playerPos.z]}
          renderOrder={6}
        >
          <MusicNoteShape variant={spec.variant} material={noteMats[idx].fill} outlineMaterial={noteMats[idx].out} />
        </group>
      ))}
    </>
  )
}

export function BellShockwave() {
  const bellRef = useRef(null)
  const lastFireRef = useRef(0)
  const [pulses, setPulses] = useState([])
  const weapons = useGameStore((s) => s.weapons)

  const removePulse = useCallback((id) => {
    setPulses((prev) => prev.filter((pulse) => pulse.id !== id))
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.bell
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const nowMs = nowSec * 1000
    const floatAngle = nowSec * 2.3
    if (bellRef.current) {
      bellRef.current.position.set(
        playerPos.x + 0.58 + Math.sin(floatAngle) * 0.05,
        playerPos.y + 0.74 + Math.sin(nowSec * 4.4) * 0.045,
        playerPos.z - 0.32,
      )
      const ringShake = nowMs - lastFireRef.current < 360
        ? Math.sin(nowSec * 52) * 0.28
        : Math.sin(nowSec * 2.2) * 0.08
      bellRef.current.rotation.set(0.15, 0.28, ringShake)
    }

    if (nowMs - lastFireRef.current < w.cooldown) return
    lastFireRef.current = nowMs
    emitSfx({ id: 'bellFire' })

    const radius = w.radius ?? 1.7
    applyRadialDamage({
      x: playerPos.x, z: playerPos.z, radius, damage: w.damage,
      knockback: 4.8, knockbackMs: 180,
    })

    setPulses((prev) => [...prev, { id: ++_bellPulseId, startMs: nowMs, radius }])
  })

  if (!weapons.bell?.active) return null

  return (
    <>
      <group ref={bellRef}>
        <BellModel />
      </group>
      {pulses.map((pulse) => (
        <BellPulse key={pulse.id} {...pulse} onDone={removePulse} />
      ))}
    </>
  )
}

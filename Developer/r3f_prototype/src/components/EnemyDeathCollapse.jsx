import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { outlineMat, toonMat, inflateScale } from '../lib/toon.js'
import {
  ENEMY_DEATH_COLLAPSE_LIFETIME_MS,
  ENEMY_DEATH_COLLAPSE_STYLES,
  ZOMBIE_COLLAPSE_PARTS,
  createCollapseMotion,
  collapseStyleForIntensity,
  collapsePieceScaleForStyle,
  seededCollapseNoise,
  resolveCollapsePartOpacity,
} from '../lib/enemyDeathCollapse.js'
import { ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import StudioTunedGroup from './StudioTunedGroup.jsx'

function resolvePartColor(part, palette) {
  if (part.color === 'foot') return 0x1a1a1a
  return palette[part.color] ?? palette.body
}

function collapseVariantSeed(id, position) {
  const numericId = Number(id)
  const idSeed = Number.isFinite(numericId)
    ? numericId
    : String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const [x = 0, , z = 0] = position ?? []
  return idSeed * 17.17 + x * 19.31 + z * 23.73
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}

function easeOut(value) {
  return 1 - Math.pow(1 - clamp01(value), 3)
}

function CollapsePart({ part, index, origin, visualScale, palette, startedAt, style, pieceScale }) {
  const groupRef = useRef(null)
  const meshRef = useRef(null)
  const outlineRef = useRef(null)

  const color = resolvePartColor(part, palette)
  const displayColor = useMemo(() => {
    if (part.color === 'eye') return color
    return new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.12).getHex()
  }, [color, part.color])

  const mat = useMemo(() => {
    const m = toonMat(displayColor, part.color === 'eye' ? 0.9 : 0.28)
    m.transparent = true
    m.opacity = 1
    m.depthWrite = false
    m.depthTest = true
    m.toneMapped = false
    return m
  }, [displayColor, part.color])

  const outMat = useMemo(() => {
    const m = outlineMat(part.color === 'eye' ? 0.25 : 0.72)
    m.depthTest = true
    return m
  }, [part.color])

  const seed = origin[0] * 17.1 + origin[2] * 31.7 + index * 13.37
  const motion = useRef(createCollapseMotion({ seed, part, index, style }))
  const size = useMemo(() => part.size.map((value) => value * visualScale * pieceScale), [part.size, visualScale, pieceScale])
  const baseRotation = part.rotation ?? [0, 0, 0]

  const pos = useRef({
    x: origin[0] + part.offset[0] * visualScale,
    y: origin[1] + part.offset[1] * visualScale,
    z: origin[2] + part.offset[2] * visualScale,
    rx: baseRotation[0] + (seededCollapseNoise(seed + 5) - 0.5) * 0.18,
    ry: baseRotation[1] + seededCollapseNoise(seed + 6) * Math.PI * 2,
    rz: baseRotation[2] + (seededCollapseNoise(seed + 7) - 0.5) * 0.18,
  })

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const elapsed = performance.now() - startedAt
    const v = motion.current
    const p = pos.current
    const activeMs = elapsed - v.delayMs

    if (v.mode === 'sidePivot') {
      const baseX = origin[0] + part.offset[0] * visualScale
      const baseY = origin[1] + part.offset[1] * visualScale
      const baseZ = origin[2] + part.offset[2] * visualScale
      const pivotX = origin[0] + v.pivotXOffset * visualScale
      const pivotY = origin[1] + v.pivotYOffset * visualScale
      const pivotZ = origin[2] + v.pivotZOffset * visualScale
      const fallT = easeOut(elapsed / 430)
      const angle = -v.pivotDirection * v.pivotAngle * fallT
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const dx = baseX - pivotX
      const dy = baseY - pivotY

      groupRef.current.position.set(
        pivotX + dx * cos - dy * sin,
        pivotY + dx * sin + dy * cos,
        pivotZ + (baseZ - pivotZ) + v.z * visualScale * fallT,
      )
      groupRef.current.rotation.set(
        pos.current.rx + v.rx * fallT,
        pos.current.ry + v.ry * fallT,
        pos.current.rz + angle,
      )

      const opacity = resolveCollapsePartOpacity(elapsed, v)
      if (meshRef.current) meshRef.current.material.opacity = opacity
      if (outlineRef.current) outlineRef.current.material.opacity = opacity * (part.color === 'eye' ? 0.25 : 0.72)
      return
    }

    if (v.mode === 'proneSink') {
      const baseX = origin[0] + part.offset[0] * visualScale
      const baseY = origin[1] + part.offset[1] * visualScale
      const baseZ = origin[2] + part.offset[2] * visualScale
      const proneT = easeOut(elapsed / 300)
      const sinkT = easeOut((elapsed - 380) / 260)

      groupRef.current.position.set(
        baseX + v.x * visualScale * proneT,
        baseY + v.y * 0.45 * visualScale * proneT - v.sinkDepth * visualScale * sinkT,
        baseZ + v.z * visualScale * proneT,
      )
      groupRef.current.rotation.set(
        pos.current.rx + v.rx * proneT,
        pos.current.ry + v.ry * proneT,
        pos.current.rz + v.rz * proneT,
      )

      const opacity = resolveCollapsePartOpacity(elapsed, v)
      if (meshRef.current) meshRef.current.material.opacity = opacity
      if (outlineRef.current) outlineRef.current.material.opacity = opacity * (part.color === 'eye' ? 0.25 : 0.72)
      return
    }

    if (activeMs >= 0) {
      v.y -= v.gravity * delta

      const linDamping = Math.max(0, 1 - (v.linearDamping ?? 2.6) * delta)
      const spinDamping = Math.max(0, 1 - (v.spinDamping ?? 1.1) * delta)
      v.x *= linDamping
      v.z *= linDamping
      v.rx *= spinDamping
      v.ry *= spinDamping
      v.rz *= spinDamping

      const motionScale = (v.distanceScale ?? visualScale) * 0.5
      p.x += v.x * delta * motionScale
      p.y += v.y * delta * motionScale
      p.z += v.z * delta * motionScale
      p.rx += v.rx * delta
      p.ry += v.ry * delta
      p.rz += v.rz * delta

      const floorY = origin[1] + v.settleY * visualScale
      if (p.y < floorY) {
        p.y = floorY
        v.y = 0
        v.x *= 0.72
        v.z *= 0.72
      }
    }

    const sink = Math.min(1, Math.max(0, elapsed / 380))
    groupRef.current.position.set(p.x, p.y - sink * 0.08 * visualScale, p.z)
    groupRef.current.rotation.set(p.rx, p.ry, p.rz)

    const opacity = resolveCollapsePartOpacity(elapsed, v)
    if (meshRef.current) meshRef.current.material.opacity = opacity
    if (outlineRef.current) outlineRef.current.material.opacity = opacity * (part.color === 'eye' ? 0.25 : 0.72)
  })

  const outlineScale = inflateScale(part.outlineScale ?? 1.06)

  return (
    <group
      ref={groupRef}
      position={[pos.current.x, pos.current.y, pos.current.z]}
      rotation={[pos.current.rx, pos.current.ry, pos.current.rz]}
    >
      <mesh ref={outlineRef} renderOrder={1} material={outMat} scale={[outlineScale, outlineScale, outlineScale]}>
        <boxGeometry args={size} />
      </mesh>
      <mesh ref={meshRef} renderOrder={2} material={mat}>
        <boxGeometry args={size} />
      </mesh>
    </group>
  )
}

export default function EnemyDeathCollapse({ id, type, position, visualScale, intensity = 'medium', styleOverride, onDone }) {
  const palette = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01
  const startedAtRef = useRef(performance.now())
  const styleSeed = useMemo(() => collapseVariantSeed(id, position), [id, position])
  // Every kill draws from the same death pool; intensity no longer pins a style.
  const style = useMemo(() => (
    ENEMY_DEATH_COLLAPSE_STYLES.includes(styleOverride)
      ? styleOverride
      : collapseStyleForIntensity(intensity, styleSeed)
  ), [intensity, styleOverride, styleSeed])
  const pieceScale = useMemo(() => collapsePieceScaleForStyle(style), [style])
  const styleItemId = useMemo(() => {
    const index = ENEMY_DEATH_COLLAPSE_STYLES.indexOf(style)
    if (index < 0) return 'enemy-death-collapse'
    return `enemy-death-${String(index + 1).padStart(2, '0')}`
  }, [style])

  useEffect(() => {
    const timer = window.setTimeout(() => onDone?.(id), ENEMY_DEATH_COLLAPSE_LIFETIME_MS)
    return () => window.clearTimeout(timer)
  }, [id, onDone])

  return (
    <StudioTunedGroup itemId="enemy-death-collapse">
      <StudioTunedGroup itemId={styleItemId}>
        <group>
          {ZOMBIE_COLLAPSE_PARTS.map((part, index) => (
            <CollapsePart
              key={`${id}-${part.key}`}
              part={part}
              index={index}
              origin={position}
              visualScale={visualScale}
              palette={palette}
              startedAt={startedAtRef.current}
              style={style}
              pieceScale={pieceScale}
            />
          ))}
        </group>
      </StudioTunedGroup>
    </StudioTunedGroup>
  )
}

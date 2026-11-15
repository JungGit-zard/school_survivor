// Dev-only preview for Terry's 2026-11-15 VFX picks (open /__vfx_preview.html?scene=hits on the Vite dev server).
// Uses the real game modules: BurstVfxLayer system, InuconGuardEffect, EscapePortal, ribbon trail, twinkle trail.
// Not imported by the app and not part of the production build (index.html is the only build input).
//   scene = hits | big | heal | levelup | guard | portal | trails      t = frozen progress 0..1 (hits/big/heal/levelup)
import React, { useEffect, useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './store/useGameStore.js'
import { playerPos, portalTarget } from './lib/refs.js'
import { createBurstVfxSystem, BURST_KINDS } from './components/BurstVfxLayer.jsx'
import { VFX_BURST, spawnVfxBurst, shedOnigiriTwinkle } from './lib/vfxBursts.js'
import { InuconGuardEffect } from './components/Weapons/Inucon.jsx'
import { triggerInuconGuard } from './lib/inuconGuard.js'
import EscapePortal from './components/EscapePortal.jsx'
import { StudioTuningPreviewProvider } from './components/StudioTunedGroup.jsx'
import { createRibbonTrail } from './lib/vfxRibbonTrail.js'

useGameStore.setState({ phase: 'playing' })
const Q = new URLSearchParams(location.search)
const SCENE = Q.get('scene') || 'hits'
const FREEZE = Q.has('t') ? Math.min(0.99, Math.max(0, parseFloat(Q.get('t')))) : 0.4
const DIST = Q.has('dist') ? parseFloat(Q.get('dist')) : 10

const S = VFX_BURST
const LAYOUTS = {
  hits: [
    [S.HIT_PENCIL, -3.6, 0.42, -1.4], [S.HIT_REEBO, -1.2, 0.42, -1.4], [S.HIT_BINBUN, 1.2, 0.42, -1.4], [S.HIT_CODEMANU, 3.6, 0.42, -1.4],
    [S.HIT_LANTERN, -2.4, 0.42, 1.4], [S.HIT_PIXEL, 0, 0.42, 1.4], [S.HIT_CHIBIKO, 2.4, 0.42, 1.4],
  ],
  big: [
    [S.KILL_PUFF, -3.6, 0, -1.6, 1], [S.PICKUP, -1.2, 0, -1.6, 1], [S.HEART_BURST, 2.2, 0, -1.6, 1.6],
    [S.SHARK_EXPLOSION, -2.2, 0, 1.8, 1.6], [S.STARLINK_IMPACT, 2.4, 0, 1.8, 1.2],
  ],
  heal: [[S.HEAL, 0, 0, 0]],
  levelup: [[S.LEVEL_UP, 0, 0, 0]],
}
const ZOMBIE_SPOTS = { hits: LAYOUTS.hits, big: [[0, -3.6, 0, -1.6], [0, 2.2, 0, -1.6], [0, -2.2, 0, 1.8], [0, 2.4, 0, 1.8]] }

function floorTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'); g.fillStyle = '#e4d1ad'; g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#d8c29a'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12)
  t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t
}

function Dummy({ position, color = 0x7fae5a, scale = 1 }) {
  const mats = useMemo(() => ({ body: new THREE.MeshToonMaterial({ color }), line: new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide }) }), [color])
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.24, 0]} material={mats.body}><cylinderGeometry args={[0.22, 0.27, 0.48, 12]} /></mesh>
      <mesh position={[0, 0.24, 0]} scale={1.1} material={mats.line}><cylinderGeometry args={[0.22, 0.27, 0.48, 12]} /></mesh>
      <mesh position={[0, 0.7, 0]} material={mats.body}><sphereGeometry args={[0.25, 16, 12]} /></mesh>
      <mesh position={[0, 0.7, 0]} scale={1.1} material={mats.line}><sphereGeometry args={[0.25, 16, 12]} /></mesh>
    </group>
  )
}

// Frozen burst scene: every listed burst shown at progress FREEZE (same rule as the trial's ?t=).
function FrozenBursts({ layout }) {
  const system = useMemo(() => createBurstVfxSystem(), [])
  const sorted = useMemo(() => [...layout].sort((a, b) => BURST_KINDS[b[0]].life - BURST_KINDS[a[0]].life), [layout])
  useFrame(() => {
    system.reset()
    for (let i = 0; i < sorted.length; i += 1) {
      const [kind, x, y, z, s = 1] = sorted[i]
      spawnVfxBurst(kind, x, y, z, s)
      system.step(0)
      const next = sorted[i + 1] ? BURST_KINDS[sorted[i + 1][0]].life : 0
      // step() clamps one frame to 0.1 s, so advance in small chunks.
      for (let left = FREEZE * (BURST_KINDS[kind].life - next); left > 1e-6; left -= 0.05) system.step(Math.min(0.05, left))
    }
  })
  return <primitive object={system.group} />
}

function GuardLoop() {
  const inuconPosRef = useRef(new THREE.Vector3(0.9, 0.3, 0.3))
  useEffect(() => {
    const id = setInterval(() => triggerInuconGuard(), 260)
    return () => clearInterval(id)
  }, [])
  return <InuconGuardEffect inuconPosRef={inuconPosRef} />
}

function PortalCentered() {
  const ref = useRef()
  useFrame(() => { if (ref.current && portalTarget.active) ref.current.position.set(-portalTarget.x, 0, -portalTarget.z) })
  return (
    <group ref={ref}>
      <StudioTuningPreviewProvider><EscapePortal stageId={1} /></StudioTuningPreviewProvider>
    </group>
  )
}

function Trails() {
  const system = useMemo(() => createBurstVfxSystem(), [])
  const ribbon = useMemo(() => createRibbonTrail(4), [])
  const plane = useRef()
  const rice = useRef()
  const clock = useRef(0)
  useFrame((_, delta) => {
    clock.current += delta
    const t = clock.current
    const px = -3.5 + ((t * 2.2) % 7)
    const pz = -1.2 + Math.sin(px * 1.4) * 0.5
    ribbon.update(0, px, 0.45, pz, t * 1000 % 3181)
    ribbon.commit()
    if (plane.current) plane.current.position.set(px, 0.45, pz)
    const ox = -3.5 + ((t * 3) % 7)
    const oz = 1.4 + Math.sin(ox * 1.6) * 0.4
    if (rice.current) rice.current.position.set(ox, 0.45, oz)
    shedOnigiriTwinkle(0, ox, 0.45, oz)
    system.step(delta)
  })
  return (
    <>
      <primitive object={ribbon.mesh} />
      <primitive object={system.group} />
      <mesh ref={plane}><coneGeometry args={[0.12, 0.34, 3]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh ref={rice}><coneGeometry args={[0.2, 0.3, 3]} /><meshToonMaterial color="#ffffff" /></mesh>
    </>
  )
}

function Scene() {
  const floor = useMemo(() => floorTexture(), [])
  const actor = SCENE === 'heal' || SCENE === 'levelup' || SCENE === 'guard'
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 7, 5]} intensity={2.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial map={floor} toneMapped={false} />
      </mesh>
      {(ZOMBIE_SPOTS[SCENE] ?? []).map(([, x, , z], i) => <Dummy key={i} position={[x, 0, z]} />)}
      {actor && <Dummy position={[0, 0, 0]} color={0x34405e} />}
      {LAYOUTS[SCENE] && <FrozenBursts layout={LAYOUTS[SCENE]} />}
      {SCENE === 'guard' && <GuardLoop />}
      {SCENE === 'portal' && <PortalCentered />}
      {SCENE === 'trails' && <Trails />}
    </>
  )
}

playerPos.set(0, 0, 0)
createRoot(document.getElementById('root')).render(
  <Canvas camera={{ position: [0, DIST * 0.72, DIST * 0.72], fov: 30 }} gl={{ preserveDrawingBuffer: true }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
    <Scene />
  </Canvas>,
)

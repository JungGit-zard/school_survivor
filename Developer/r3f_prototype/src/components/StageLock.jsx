import { Canvas } from '@react-three/fiber'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import { STAGE_LOCK_STUDIO_ITEM_ID } from '../lib/graphicsStudioConfig.js'
import {
  getCachedBoxGeo,
  getCachedToonMat,
  getSharedOutlineMat,
  inflateScale,
} from '../lib/toon.js'

const GOLD = 0xf5b82e
const GOLD_DARK = 0xc78618
const SILVER = 0xd8dde6
const KEYHOLE = 0x151312

function LockBoxPart({ name, part, size, position, color = GOLD, emissive = 0.1, outlineScale = 1.045 }) {
  const geometry = getCachedBoxGeo(...size)
  const outline = getSharedOutlineMat()
  const material = getCachedToonMat(color, emissive)
  const os = inflateScale(outlineScale)

  return (
    <group name={name} position={position} userData={{ stageLockPart: part }}>
      <mesh
        renderOrder={1}
        geometry={geometry}
        material={outline}
        scale={[os, os, os]}
        userData={{ studioRenderOutline: true }}
      />
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function LockCylinderPart({ name, part, radius = 0.055, length, position, rotation, color = SILVER, emissive = 0.08, outlineScale = 1.06 }) {
  const outline = getSharedOutlineMat()
  const material = getCachedToonMat(color, emissive)
  const os = inflateScale(outlineScale)

  return (
    <group name={name} position={position} rotation={rotation} userData={{ stageLockPart: part }}>
      <mesh renderOrder={1} material={outline} scale={[os, os, os]} userData={{ studioRenderOutline: true }}>
        <cylinderGeometry args={[radius, radius, length, 8]} />
      </mesh>
      <mesh renderOrder={2} material={material}>
        <cylinderGeometry args={[radius, radius, length, 8]} />
      </mesh>
    </group>
  )
}

function StageLockCore() {
  return (
    <group name="stage-lock-low-poly" rotation={[0, -0.22, 0]}>
      <LockBoxPart name="body" part="body" size={[0.82, 0.58, 0.28]} position={[0, 0.22, 0]} color={GOLD} emissive={0.18} outlineScale={1.035} />
      <LockCylinderPart name="shackle-left" part="shackle-left" length={0.62} position={[-0.27, 0.68, 0]} rotation={[0, 0, 0]} />
      <LockCylinderPart name="shackle-top" part="shackle-top" length={0.54} position={[0, 0.99, 0]} rotation={[0, 0, Math.PI / 2]} />
      <LockCylinderPart name="shackle-right" part="shackle-right" length={0.62} position={[0.27, 0.68, 0]} rotation={[0, 0, 0]} />
      <LockBoxPart name="collar-left" part="collar" size={[0.2, 0.16, 0.22]} position={[-0.27, 0.53, 0]} color={GOLD_DARK} emissive={0.14} outlineScale={1.045} />
      <LockBoxPart name="collar-right" part="collar" size={[0.2, 0.16, 0.22]} position={[0.27, 0.53, 0]} color={GOLD_DARK} emissive={0.14} outlineScale={1.045} />
      <group name="keyhole" position={[0, 0.22, 0.151]} userData={{ stageLockPart: 'keyhole' }}>
        <mesh renderOrder={3} material={getCachedToonMat(KEYHOLE, 0.02)} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.018, 8]} />
        </mesh>
        <mesh renderOrder={3} geometry={getCachedBoxGeo(0.055, 0.17, 0.02)} material={getCachedToonMat(KEYHOLE, 0.02)} position={[0, -0.11, 0]} />
      </group>
    </group>
  )
}

export function StageLockModel() {
  return (
    <StudioTunedGroup itemId={STAGE_LOCK_STUDIO_ITEM_ID}>
      <StageLockCore />
    </StudioTunedGroup>
  )
}

export function StageLockPreview({ style = null, testId = 'stage-lock-preview', ariaLabel = '잠긴 스테이지 3D 자물쇠' }) {
  return (
    <Canvas
      data-testid={testId}
      aria-label={ariaLabel}
      camera={{ position: [1.8, 1.55, 2.8], fov: 34, near: 0.01, far: 30 }}
      gl={{ stencil: true, antialias: true }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', background: 'transparent', ...style }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <group position={[0, -0.28, 0]}>
        <StageLockModel />
      </group>
    </Canvas>
  )
}

export default StageLockModel

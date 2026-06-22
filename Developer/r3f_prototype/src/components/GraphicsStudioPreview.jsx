import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import PlayerMesh from './PlayerMesh.jsx'
import ZombieMesh from './ZombieMesh.jsx'
import ClassroomFloor from './ClassroomFloor.jsx'
import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'
import GoldCoin from './GoldCoin.jsx'
import XpTextbook from './XpTextbook.jsx'
import XpOrb from './XpOrb.jsx'
import { LunchModel } from './LunchItems.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import TitleScene3D from './TitleScene3D.jsx'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'
import { VFX_COLORS } from '../lib/vfxPalette.js'

function isOutlineMaterial(material) {
  return material?.side === THREE.BackSide || material?.stencilFunc === THREE.NotEqualStencilFunc
}

function tuneColor(baseColor, tuning) {
  const next = baseColor.clone()
  const hsl = {}
  next.getHSL(hsl)
  next.setHSL(
    hsl.h,
    Math.min(1, Math.max(0, hsl.s * tuning.saturation)),
    Math.min(1, Math.max(0, hsl.l * tuning.brightness)),
  )
  return next.lerp(new THREE.Color(tuning.color), tuning.colorStrength)
}

function applyStudioTuning(root, tuning) {
  const outlineColor = new THREE.Color(tuning.outlineColor)
  const outlineScaleFactor = 1 + (tuning.outlineThickness - 1) * 0.12

  root.traverse((object) => {
    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : []

    const hasOutlineMaterial = materials.some(isOutlineMaterial)
    if (hasOutlineMaterial && object.isMesh) {
      if (!object.userData.studioBaseScale) object.userData.studioBaseScale = object.scale.clone()
      object.scale.copy(object.userData.studioBaseScale).multiplyScalar(outlineScaleFactor)
    }

    materials.forEach((material) => {
      const outline = isOutlineMaterial(material)
      if (material.color) {
        if (!material.userData.studioBaseColor) material.userData.studioBaseColor = material.color.clone()
        material.color.copy(outline ? outlineColor : tuneColor(material.userData.studioBaseColor, tuning))
      }
      if (outline && typeof material.opacity === 'number') {
        material.opacity = tuning.outlineOpacity
        material.transparent = tuning.outlineOpacity < 1
      }
      if (!outline && typeof material.emissiveIntensity === 'number') {
        material.emissiveIntensity = tuning.emissiveIntensity
      }
      if (!outline && material.emissive && material.color) {
        material.emissive.copy(material.color)
      }
      material.needsUpdate = true
    })
  })
}

function useApplyStudioTuning(rootRef, tuning) {
  useEffect(() => {
    if (rootRef.current) applyStudioTuning(rootRef.current, tuning)
  }, [rootRef, tuning])

  useFrame(() => {
    if (rootRef.current) applyStudioTuning(rootRef.current, tuning)
  })
}

function ImagePlane({ src }) {
  const texture = useLoader(THREE.TextureLoader, src)
  texture.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={[0, 1.1, 0]}>
      <planeGeometry args={[2.4, 2.4]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  )
}

function VfxPreview({ type }) {
  const sparkMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: VFX_COLORS.stunYellow, transparent: true, opacity: 0.9 }),
    [],
  )
  const dangerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: VFX_COLORS.dangerRed, transparent: true, opacity: 0.55 }),
    [],
  )
  const cyanMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: VFX_COLORS.electricCyan, transparent: true, opacity: 0.7 }),
    [],
  )

  if (type === 'chargeWarning') {
    return (
      <group position={[0, 0.04, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={dangerMat}>
          <planeGeometry args={[0.9, 5.2]} />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={cyanMat}>
          <planeGeometry args={[0.12, 5.6]} />
        </mesh>
      </group>
    )
  }

  if (type === 'pickupPop') {
    return (
      <group position={[0, 0.1, 0]}>
        {[0, 0.2, 0.42].map((height, index) => (
          <mesh
            key={height}
            position={[0, height, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1 + index * 0.5, 1 + index * 0.5, 1]}
          >
            <ringGeometry args={[0.34, 0.44, 24]} />
            <meshBasicMaterial
              color={index === 0 ? VFX_COLORS.xpGreen : VFX_COLORS.coinPink}
              transparent
              opacity={0.62 - index * 0.15}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group position={[0, 1.2, 0]}>
      {Array.from({ length: 10 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 10
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.64, Math.sin(angle) * 0.64, 0]}
            rotation={[0, 0, angle]}
            material={sparkMat}
          >
            <boxGeometry args={[0.12, 0.46, 0.08]} />
          </mesh>
        )
      })}
    </group>
  )
}

function PickupPreview({ type }) {
  if (type === 'goldCoin') {
    return (
      <group scale={7.5} rotation={[0, Math.PI / 2, 0]}>
        <GoldCoin id="studio-gold" pos={[0, 0, 0]} value={1} onCollect={() => {}} />
      </group>
    )
  }
  if (type === 'xpTextbook') {
    return (
      <group scale={4.2}>
        <XpTextbook id="studio-book" pos={[0, 0, 0]} value={5} onCollect={() => {}} />
      </group>
    )
  }
  if (type === 'xpOrb') {
    return (
      <group scale={5}>
        <XpOrb id={17} pos={[0, 0.15, 0]} xp={1} onCollect={() => {}} />
      </group>
    )
  }
  if (type === 'lunchMilk') {
    return (
      <group scale={3.2}>
        <LunchModel kind="milk" />
      </group>
    )
  }
  return (
    <group scale={3.2}>
      <LunchModel kind="meal" />
    </group>
  )
}

function EnemyProjectilePreview() {
  const bodyMat = useMemo(() => toonMat(0x34d6b8, 0.45), [])
  const outMat = useMemo(() => outlineMat(0.97), [])

  return (
    <group position={[0, 0.8, 0]}>
      <mesh renderOrder={1} material={outMat} scale={inflateScale([1.32, 1.32, 1.32])}>
        <sphereGeometry args={[0.36, 16, 12]} />
      </mesh>
      <mesh renderOrder={2} material={bodyMat}>
        <sphereGeometry args={[0.36, 16, 12]} />
      </mesh>
      <mesh position={[0, 0, -0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.28, 0.7, 16]} />
        <meshBasicMaterial color={VFX_COLORS.electricCyan} transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  )
}

function RenderPreviewItem({ item }) {
  const movingRef = useRef(false)
  const playerRef = useRef(null)

  if (item.previewKind === 'player') {
    return <PlayerMesh groupRef={playerRef} movingRef={movingRef} />
  }
  if (item.previewKind === 'zombie') {
    return <ZombieMesh type={item.zombieType} animPhase={item.animation ?? 'normal'} />
  }
  if (item.previewKind === 'stageObject' && item.objectType === 'desk') {
    return <ClassroomDesk variant={item.variant} />
  }
  if (item.previewKind === 'stageObject' && item.objectType === 'chair') {
    return <ClassroomChair variant={item.variant} />
  }
  if (item.previewKind === 'stageObject' && item.objectType === 'student') {
    return <UnconsciousStudent variant={item.variant} />
  }
  if (item.previewKind === 'pickup') {
    return <PickupPreview type={item.pickupType} />
  }
  if (item.previewKind === 'floor') {
    return (
      <group scale={[0.04, 0.04, 0.04]} position={[0, -0.04, 0]}>
        <ClassroomFloor stageId={item.stageId} />
      </group>
    )
  }
  if (item.previewKind === 'image') {
    return <ImagePlane src={item.assetUrl} />
  }
  if (item.previewKind === 'vfx') {
    return <VfxPreview type={item.vfxType} />
  }
  if (item.previewKind === 'projectile') {
    return <EnemyProjectilePreview />
  }
  if (item.previewKind === 'enemyCollapse') {
    return <EnemyDeathCollapse id="studio-collapse" type="E01" position={[0, 0.6, 0]} visualScale={1.25} intensity="heavy" onDone={() => {}} />
  }
  if (item.previewKind === 'healthBar') {
    return (
      <group position={[0, 0.8, 0]}>
        <MiniHealthBar current={42} max={70} width={1.55} height={0.24} y={0} />
      </group>
    )
  }
  return null
}

function StudioScene({ selectedItem, tuning }) {
  const rootRef = useRef(null)
  const rotationY = THREE.MathUtils.degToRad(tuning.rotationY)
  const item = selectedItem.previewKind === 'zombie'
    ? { ...selectedItem, animation: tuning.animation }
    : selectedItem

  useApplyStudioTuning(rootRef, tuning)

  if (selectedItem.previewKind === 'titleScene') {
    return (
      <>
        <TitleScene3D studioGroupRef={rootRef} studioTuning={tuning} />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[4, 6, 5]} intensity={2.4} />
      <directionalLight position={[-5, 3, -3]} intensity={0.8} color="#ffc69a" />
      <group ref={rootRef} scale={[tuning.scale, tuning.scale, tuning.scale]} rotation={[0, rotationY, 0]}>
        <RenderPreviewItem item={item} />
      </group>
      <gridHelper args={[8, 8, '#5f705d', '#343735']} position={[0, -0.04, 0]} />
      <OrbitControls makeDefault target={[0, 0.8, 0]} enablePan={false} minDistance={2.5} maxDistance={10} />
    </>
  )
}

export default function GraphicsStudioPreview({ selectedItem, tuning }) {
  const titleCamera = selectedItem.previewKind === 'titleScene'
    ? { position: [0, 6.8, 11.8], fov: 34, near: 0.1, far: 100 }
    : { position: [4, 3.2, 5.6], fov: 38, near: 0.1, far: 100 }

  return (
    <Canvas
      camera={titleCamera}
      gl={{ stencil: true, antialias: true }}
      shadows
      style={{ width: '100%', height: '100%', background: '#171817' }}
    >
      <color attach="background" args={['#171817']} />
      <StudioScene selectedItem={selectedItem} tuning={tuning} />
    </Canvas>
  )
}

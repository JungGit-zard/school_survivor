import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import PlayerMesh from './PlayerMesh.jsx'
import ZombieMesh from './ZombieMesh.jsx'
import ClassroomFloor from './ClassroomFloor.jsx'
import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'
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
  return null
}

function StudioScene({ selectedItem, tuning }) {
  const rootRef = useRef(null)
  const rotationY = THREE.MathUtils.degToRad(tuning.rotationY)
  const item = selectedItem.previewKind === 'zombie'
    ? { ...selectedItem, animation: tuning.animation }
    : selectedItem

  useApplyStudioTuning(rootRef, tuning)

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
  return (
    <Canvas
      camera={{ position: [4, 3.2, 5.6], fov: 38, near: 0.1, far: 100 }}
      gl={{ stencil: true, antialias: true }}
      shadows
      style={{ width: '100%', height: '100%', background: '#171817' }}
    >
      <color attach="background" args={['#171817']} />
      <StudioScene selectedItem={selectedItem} tuning={tuning} />
    </Canvas>
  )
}

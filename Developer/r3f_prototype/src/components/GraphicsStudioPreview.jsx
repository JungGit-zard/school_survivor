import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { PlayerVisual } from './Player.jsx'
import { ENEMY_STATS, EnemyVisual } from './Enemy.jsx'
import { FloorVisual } from './Floor.jsx'
import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'
import GoldCoin from './GoldCoin.jsx'
import XpTextbook from './XpTextbook.jsx'
import XpOrb from './XpOrb.jsx'
import { LunchModel } from './LunchItems.jsx'
import MiniHealthBar from './MiniHealthBar.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import EnemyProjectileVisual from './EnemyProjectileVisual.jsx'
import TitleScene3D from './TitleScene3D.jsx'
import { ChargeWarningLine, HitSpark, PickupPop } from './VFXLayer.jsx'
import { PencilModel } from './Weapons/Pencil.jsx'
import { ThirtyCmRulerModel } from './Weapons/SchoolBag.jsx'
import { TumblerModel } from './Weapons/Tumbler.jsx'
import { FlaskModel } from './Weapons/Flask.jsx'
import { BellModel } from './Weapons/Bell.jsx'
import { LightningBoltModel } from './Weapons/StunGun.jsx'
import { OnigiiriModel } from './Weapons/Onigiri.jsx'
import { StrikeVisual } from './Weapons/Starlink.jsx'
import { CompassBladeModel } from './Weapons/CompassBlade.jsx'
import { UmbrellaModel } from './Weapons/UmbrellaGuard.jsx'
import { EraserModel } from './Weapons/EraserBomb.jsx'
import { BoxCutterModel } from './Weapons/BoxCutter.jsx'
import { ChibikoModel } from './Weapons/Chibiko.jsx'
import { SharkMissileModel, FlameTrail } from './Weapons/SharkMissile.jsx'

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

function StudioVfxPreview({ type }) {
  const event = useMemo(() => {
    const startMs = performance.now()
    if (type === 'chargeWarning') {
      return { id: 'studio-charge-warning', x: 0, z: -2.25, angle: 0, length: 4.5, width: 0.9, life: 120000, startMs }
    }
    if (type === 'pickupPop') {
      return { id: 'studio-pickup-pop', x: 0, y: 0.18, z: 0, life: 120000, startMs }
    }
    return { id: 'studio-hit-spark', x: 0, y: 0.8, z: 0, life: 120000, startMs, baseScale: 0.28, growScale: 0.08 }
  }, [type])

  const onDone = () => {}

  if (type === 'chargeWarning') return <ChargeWarningLine event={event} onDone={onDone} />
  if (type === 'pickupPop') return <PickupPop event={event} onDone={onDone} />
  return <HitSpark event={event} onDone={onDone} />
}

function PickupPreview({ type }) {
  if (type === 'goldCoin') {
    return <GoldCoin id="studio-gold" pos={[0, 0.2, 0]} value={1} onCollect={() => {}} />
  }
  if (type === 'xpTextbook') {
    return <XpTextbook id="studio-book" pos={[0, 0, 0]} value={5} onCollect={() => {}} />
  }
  if (type === 'xpOrb') {
    return <XpOrb id={17} pos={[0, 0.15, 0]} xp={1} onCollect={() => {}} />
  }
  if (type === 'lunchMilk') {
    return <LunchModel kind="milk" />
  }
  return <LunchModel kind="meal" />
}

function WeaponModelPreview({ type }) {
  const chibikoAttackPhase = useRef(0)

  if (type === 'pencil') return <PencilModel />
  if (type === 'ruler') return <ThirtyCmRulerModel />
  if (type === 'tumbler') return <TumblerModel />
  if (type === 'scienceFlask') return <FlaskModel />
  if (type === 'bell') return <BellModel />
  if (type === 'stunGun') return <LightningBoltModel />
  if (type === 'onigiri') return <OnigiiriModel />
  if (type === 'starlink') return <StrikeVisual x={0} z={0} age={180} />
  if (type === 'compass') return <CompassBladeModel />
  if (type === 'umbrella') return <UmbrellaModel openProgress={1} spin={0} />
  if (type === 'eraser') return <EraserModel />
  if (type === 'boxCutter') return <BoxCutterModel />
  if (type === 'chibiko') {
    return (
      <group scale={[0.255, 0.255, 0.255]}>
        <ChibikoModel attackPhaseRef={chibikoAttackPhase} />
      </group>
    )
  }
  if (type === 'sharkMissile') {
    return (
      <>
        <SharkMissileModel />
        <FlameTrail />
      </>
    )
  }
  return null
}

function getPreviewFrame(item) {
  if (item.previewKind === 'titleScene') {
    return {
      camera: { position: [0, 6.8, 11.8], fov: 34, near: 0.1, far: 100 },
      target: [0, 1.6, 0],
    }
  }
  if (item.previewKind === 'floor') {
    return {
      camera: { position: [0, 17, 17], fov: 30, near: 0.1, far: 120 },
      target: [0, 0, 0],
      minDistance: 8,
      maxDistance: 80,
    }
  }
  if (item.previewKind === 'pickup') {
    return {
      camera: { position: [0.65, 0.52, 0.92], fov: 30, near: 0.01, far: 20 },
      target: [0, 0.18, 0],
      minDistance: 0.18,
      maxDistance: 4,
    }
  }
  if (item.previewKind === 'weaponModel') {
    return {
      camera: { position: [1.4, 1.05, 1.8], fov: 34, near: 0.01, far: 30 },
      target: [0, 0.18, 0],
      minDistance: 0.3,
      maxDistance: 8,
    }
  }
  if (item.previewKind === 'vfx') {
    return {
      camera: { position: [1.25, 1.1, 2.0], fov: 34, near: 0.01, far: 30 },
      target: [0, 0.35, 0],
      minDistance: 0.35,
      maxDistance: 8,
    }
  }
  if (item.previewKind === 'projectile') {
    return {
      camera: { position: [0.42, 0.34, 0.62], fov: 28, near: 0.01, far: 10 },
      target: [0, 0, 0],
      minDistance: 0.08,
      maxDistance: 3,
    }
  }
  if (item.previewKind === 'healthBar') {
    return {
      camera: { position: [0.8, 0.9, 1.4], fov: 34, near: 0.01, far: 20 },
      target: [0, 0.8, 0],
      minDistance: 0.4,
      maxDistance: 5,
    }
  }
  return {
    camera: { position: [4, 3.2, 5.6], fov: 38, near: 0.1, far: 100 },
    target: [0, 0.8, 0],
    minDistance: 1.2,
    maxDistance: 14,
  }
}

function RenderPreviewItem({ item }) {
  const movingRef = useRef(false)
  const playerRef = useRef(null)

  if (item.previewKind === 'player') {
    return <PlayerVisual meshGroup={playerRef} movingRef={movingRef} hp={100} maxHp={100} />
  }
  if (item.previewKind === 'zombie') {
    return <EnemyVisual type={item.zombieType} animPhase={item.animation ?? 'normal'} hp={ENEMY_STATS[item.zombieType]?.hp} />
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
    return <FloorVisual stageId={item.stageId} />
  }
  if (item.previewKind === 'image') {
    return <ImagePlane src={item.assetUrl} />
  }
  if (item.previewKind === 'weaponModel') {
    return <WeaponModelPreview type={item.weaponType} />
  }
  if (item.previewKind === 'vfx') {
    return <StudioVfxPreview type={item.vfxType} />
  }
  if (item.previewKind === 'projectile') {
    return <EnemyProjectileVisual />
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

function StudioScene({ selectedItem, tuning, frame }) {
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
      <ambientLight intensity={0.38} color={0x6d6780} />
      <directionalLight
        position={[-10, 22, 12]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <directionalLight position={[10, 12, -10]} intensity={0.85} color={0xffe2b0} />
      <group ref={rootRef} scale={[tuning.scale, tuning.scale, tuning.scale]} rotation={[0, rotationY, 0]}>
        <RenderPreviewItem item={item} />
      </group>
      <OrbitControls
        makeDefault
        target={frame.target}
        enablePan={false}
        minDistance={frame.minDistance ?? 1.2}
        maxDistance={frame.maxDistance ?? 14}
      />
    </>
  )
}

export default function GraphicsStudioPreview({ selectedItem, tuning }) {
  const frame = getPreviewFrame(selectedItem)

  return (
    <Canvas
      camera={frame.camera}
      gl={{ stencil: true, antialias: true }}
      shadows
      style={{ width: '100%', height: '100%', background: '#171817' }}
    >
      <color attach="background" args={['#171817']} />
      <StudioScene selectedItem={selectedItem} tuning={tuning} frame={frame} />
    </Canvas>
  )
}

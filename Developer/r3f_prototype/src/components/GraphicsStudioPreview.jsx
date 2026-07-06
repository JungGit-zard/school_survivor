import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
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
import MatildaMesh from './MatildaMesh.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import { ENEMY_DEATH_COLLAPSE_STYLES } from '../lib/enemyDeathCollapse.js'
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
import { CrashExplosionVisual, StarlinkSatelliteModel, ZomlonbiskModel } from './Weapons/StarlinkSatellite.jsx'
import { StudioTuningPreviewProvider, applySavedStudioPartTunings, applyStudioTuning, getStudioTransformProps } from './StudioTunedGroup.jsx'
import { getCrashPose } from '../lib/starlinkCrash.js'

const PLAYER_STUDIO_ARM_ACTIONS = {
  lantern: 'lanternAim',
  lanternFlashlight: 'lanternFlashlight',
}
const PART_GROUP_OUTLINE_COLOR = 0x7cff00
const STABLE_PART_KEY_PREFIX = 'id:'

function getStableStudioPartKey(root, object) {
  const stablePart = getStableStudioPartObject(root, object)
  return stablePart?.userData?.studioPartId ? `${STABLE_PART_KEY_PREFIX}${stablePart.userData.studioPartId}` : null
}

function getStableStudioPartObject(root, object) {
  let current = object
  while (current && current !== root) {
    if (current.userData?.studioPartId) return current
    current = current.parent
  }
  return null
}

export function getStudioPartKey(root, object) {
  if (!root || !object || object === root) return null
  const stableKey = getStableStudioPartKey(root, object)
  if (stableKey) return stableKey

  const path = []
  let current = object
  while (current && current !== root) {
    const parent = current.parent
    if (!parent) return null
    const index = parent.children.indexOf(current)
    if (index < 0) return null
    path.unshift(index)
    current = parent
  }

  return current === root ? path.join('.') : null
}

export function findStudioPart(root, key) {
  if (!root || !key) return null
  if (key.startsWith(STABLE_PART_KEY_PREFIX)) {
    const id = key.slice(STABLE_PART_KEY_PREFIX.length)
    let found = null
    root.traverse((object) => {
      if (!found && object.userData?.studioPartId === id) found = object
    })
    return found
  }
  return key.split('.').reduce((node, index) => node?.children?.[Number(index)] ?? null, root)
}

function getStudioPartLabel(object) {
  return object?.name || object?.parent?.name || object?.geometry?.type || object?.type || 'part'
}

function resetFocusedPartTransforms(root) {
  root.traverse((object) => {
    if (object.userData.studioPartBaseScale) {
      object.scale.copy(object.userData.studioPartBaseScale)
    }
    if (object.userData.studioPartBaseRotation) {
      object.rotation.copy(object.userData.studioPartBaseRotation)
    }
    if (object.userData.studioPartBasePosition) {
      object.position.copy(object.userData.studioPartBasePosition)
    }
  })
}

function clearPartGroupOutlines(root) {
  const outlines = []
  root.traverse((object) => {
    if (object.userData.studioPartGroupOutline) outlines.push(object)
  })
  outlines.forEach((outline) => {
    outline.parent?.remove(outline)
    outline.geometry?.dispose()
    const materials = Array.isArray(outline.material)
      ? outline.material
      : outline.material
        ? [outline.material]
        : []
    materials.forEach((material) => material.dispose())
  })
  root.userData.studioPartGroupOutlineKey = ''
}

function stylePartFocusOutline(outline) {
  const materials = Array.isArray(outline.material)
    ? outline.material
    : outline.material
      ? [outline.material]
      : []
  materials.forEach((material) => {
    if (material.color) material.color.setHex(PART_GROUP_OUTLINE_COLOR)
    material.depthTest = false
    material.transparent = true
    material.opacity = 0.9
    material.needsUpdate = true
  })
  outline.renderOrder = 999
}

function createPartFocusOutline(root, part) {
  if (part.isMesh && part.geometry) {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(part.geometry),
      new THREE.LineBasicMaterial({ color: PART_GROUP_OUTLINE_COLOR }),
    )
    outline.userData.studioPartGroupOutline = true
    outline.userData.studioPartGroupTarget = part
    stylePartFocusOutline(outline)
    part.add(outline)
    return
  }

  const outline = new THREE.BoxHelper(part, PART_GROUP_OUTLINE_COLOR)
  outline.userData.studioPartGroupOutline = true
  outline.userData.studioPartGroupTarget = part
  stylePartFocusOutline(outline)
  root.add(outline)
}

function syncPartGroupOutlines(root, focusedPartKeys) {
  const outlineKeys = focusedPartKeys.length ? focusedPartKeys : []
  const nextKey = outlineKeys.join('|')
  if (root.userData.studioPartGroupOutlineKey === nextKey) return

  clearPartGroupOutlines(root)
  outlineKeys.forEach((key) => {
    const part = findStudioPart(root, key)
    if (!part) return
    createPartFocusOutline(root, part)
  })
  root.userData.studioPartGroupOutlineKey = nextKey
}

function updatePartGroupOutlines(root) {
  root.traverse((object) => {
    if (!object.userData.studioPartGroupOutline) return
    stylePartFocusOutline(object)
    if (typeof object.update === 'function') object.update()
  })
}

function applyFocusedPartTuning(root, focusedPartKeys, focusedPartTuning) {
  resetFocusedPartTransforms(root)
  syncPartGroupOutlines(root, focusedPartKeys)
  updatePartGroupOutlines(root)
  if (!focusedPartKeys.length || !focusedPartTuning) return

  const transform = getStudioTransformProps(focusedPartTuning)
  focusedPartKeys.forEach((focusedPartKey) => {
    const part = findStudioPart(root, focusedPartKey)
    if (!part) return

    if (!part.userData.studioPartBaseScale) part.userData.studioPartBaseScale = part.scale.clone()
    if (!part.userData.studioPartBaseRotation) part.userData.studioPartBaseRotation = part.rotation.clone()
    if (!part.userData.studioPartBasePosition) part.userData.studioPartBasePosition = part.position.clone()

    part.position.copy(part.userData.studioPartBasePosition).add(new THREE.Vector3(...transform.position))
    part.scale.copy(part.userData.studioPartBaseScale).multiply(new THREE.Vector3(...transform.scale))
    part.rotation.set(
      part.userData.studioPartBaseRotation.x + transform.rotation[0],
      part.userData.studioPartBaseRotation.y + transform.rotation[1],
      part.userData.studioPartBaseRotation.z + transform.rotation[2],
    )
    applyStudioTuning(part, focusedPartTuning)
  })
  updatePartGroupOutlines(root)
}

function useApplyStudioTuning(rootRef, itemId, tuning, focusedPartKeys, partTunings) {
  useEffect(() => {
    if (!rootRef.current) return
    applyStudioTuning(rootRef.current, tuning)
    applySavedStudioPartTunings(rootRef.current, itemId, partTunings)
    syncPartGroupOutlines(rootRef.current, focusedPartKeys)
    updatePartGroupOutlines(rootRef.current)
  }, [rootRef, itemId, tuning, focusedPartKeys, partTunings])

  useFrame(() => {
    if (!rootRef.current) return
    applyStudioTuning(rootRef.current, tuning)
    applySavedStudioPartTunings(rootRef.current, itemId, partTunings)
    syncPartGroupOutlines(rootRef.current, focusedPartKeys)
    updatePartGroupOutlines(rootRef.current)
  })
}

function StudioOrbitControls({ frame }) {
  return (
    <OrbitControls
      makeDefault
      target={frame.target}
      enablePan
      screenSpacePanning
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      }}
      minDistance={frame.minDistance ?? 1.2}
      maxDistance={frame.maxDistance ?? 14}
    />
  )
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
  if (item.previewKind === 'matilda') {
    return {
      camera: { position: [2.4, 2.5, 4.2], fov: 34, near: 0.01, far: 30 },
      target: [0, 0.9, 0],
      minDistance: 0.8,
      maxDistance: 9,
    }
  }
  if (item.previewKind === 'starlinkSatellite') {
    return {
      camera: { position: [1.9, 1.5, 2.4], fov: 34, near: 0.01, far: 30 },
      target: [0, 0.35, 0],
      minDistance: 0.5,
      maxDistance: 9,
    }
  }
  if (item.previewKind === 'starlinkCrash') {
    return {
      camera: { position: [2.6, 2.1, 4.0], fov: 36, near: 0.01, far: 40 },
      target: [0, 0.75, 0],
      minDistance: 0.8,
      maxDistance: 10,
    }
  }
  if (item.previewKind === 'zomlonbisk') {
    return {
      camera: { position: [1.7, 1.7, 3.0], fov: 34, near: 0.01, far: 30 },
      target: [0, 0.6, 0],
      minDistance: 0.6,
      maxDistance: 9,
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
  if (item.previewKind === 'enemyCollapse') {
    return {
      camera: { position: [2.4, 2.0, 3.7], fov: 36, near: 0.05, far: 40 },
      target: [0, 0.58, 0],
      minDistance: 1.2,
      maxDistance: 8,
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
  const [deathReplayKey, setDeathReplayKey] = useState(0)
  const [crashReplayKey, setCrashReplayKey] = useState(0)

  useEffect(() => {
    if (item.previewKind !== 'enemyCollapse') return undefined
    const timer = window.setInterval(() => setDeathReplayKey((key) => key + 1), 920)
    return () => window.clearInterval(timer)
  }, [item.previewKind])

  useEffect(() => {
    if (item.previewKind !== 'starlinkCrash') return undefined
    const timer = window.setInterval(() => setCrashReplayKey((key) => key + 1), 33)
    return () => window.clearInterval(timer)
  }, [item.previewKind])

  if (item.previewKind === 'player') {
    return <PlayerVisual meshGroup={playerRef} movingRef={movingRef} hp={100} maxHp={100} previewArmAction={PLAYER_STUDIO_ARM_ACTIONS[item.animation] ?? null} />
  }
  if (item.previewKind === 'zombie') {
    return <EnemyVisual type={item.zombieType} animPhase={item.animation ?? 'normal'} hp={ENEMY_STATS[item.zombieType]?.hp} forceMesh />
  }
  if (item.previewKind === 'matilda') {
    return <MatildaMesh movementPose={item.animation === 'charge'} />
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
  if (item.previewKind === 'starlinkSatellite') {
    return (
      <group position={[0, 0.35, 0]}>
        <StarlinkSatelliteModel />
      </group>
    )
  }
  if (item.previewKind === 'starlinkCrash') {
    const t = (crashReplayKey % 24) / 23
    if (item.crashPhase === 'impact') return <CrashExplosionVisual x={0} z={0} t={t} />

    const pose = getCrashPose({ x: 0, z: 0 }, t)
    return (
      <group position={[pose.x, pose.y, pose.z]} rotation={[pose.tilt, pose.spin, pose.tilt * 0.6]}>
        <StarlinkSatelliteModel />
      </group>
    )
  }
  if (item.previewKind === 'zomlonbisk') {
    return (
      <group position={[0, 0.57, 0]}>
        <ZomlonbiskModel running />
      </group>
    )
  }
  if (item.previewKind === 'vfx') {
    return <StudioVfxPreview type={item.vfxType} />
  }
  if (item.previewKind === 'projectile') {
    return <EnemyProjectileVisual />
  }
  if (item.previewKind === 'enemyCollapse') {
    const index = item.deathStyleIndex ?? deathReplayKey % ENEMY_DEATH_COLLAPSE_STYLES.length
    const style = item.deathStyle ?? ENEMY_DEATH_COLLAPSE_STYLES[index]
    return (
      <>
        <EnemyDeathCollapse
          key={`${deathReplayKey}-${style}`}
          id={`studio-${style}`}
          type="E01"
          position={[0, 0.58, 0]}
          visualScale={1.15}
          styleOverride={style}
          onDone={() => {}}
        />
        <Html center position={[0, 1.95, 0]} style={{ pointerEvents: 'none' }}>
          <div
            data-testid="death-style-label"
            style={{
              minWidth: 170,
              padding: '6px 9px',
              border: '2px solid #f2eee5',
              borderRadius: 6,
              background: 'rgba(18, 18, 16, 0.86)',
              color: '#f7f0dc',
              fontSize: 13,
              fontWeight: 900,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {index + 1}/{ENEMY_DEATH_COLLAPSE_STYLES.length} {style}
          </div>
        </Html>
      </>
    )
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

function StudioScene({ selectedItem, tuning, frame, focusedPartKeys, focusedPartTuning, partTunings, onPartFocus }) {
  const rootRef = useRef(null)
  const transform = getStudioTransformProps(tuning)
  const item = selectedItem.previewKind === 'player' || selectedItem.previewKind === 'zombie' || selectedItem.previewKind === 'matilda'
    ? { ...selectedItem, animation: tuning.animation }
    : selectedItem

  useApplyStudioTuning(rootRef, selectedItem.id, tuning, focusedPartKeys, partTunings)

  const handlePartDoubleClick = (event) => {
    const key = getStudioPartKey(rootRef.current, event.object)
    if (!key) return
    const part = findStudioPart(rootRef.current, key)
    event.stopPropagation()
    onPartFocus?.({
      key,
      label: getStudioPartLabel(part ?? event.object),
      additive: Boolean(event.shiftKey || event.nativeEvent?.shiftKey),
    })
  }

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
      <group ref={rootRef} scale={transform.scale} position={transform.position} rotation={transform.rotation} onDoubleClick={handlePartDoubleClick}>
        <RenderPreviewItem item={item} />
      </group>
      <StudioOrbitControls frame={frame} />
    </>
  )
}

export default function GraphicsStudioPreview({ selectedItem, tuning, focusedPartKeys = [], focusedPartTuning = null, partTunings = {}, onPartFocus = null }) {
  const frame = getPreviewFrame(selectedItem)

  return (
    <Canvas
      camera={frame.camera}
      gl={{ stencil: true, antialias: true }}
      shadows
      style={{ width: '100%', height: '100%', background: '#171817' }}
    >
      <StudioTuningPreviewProvider>
        <color attach="background" args={['#171817']} />
        <StudioScene
          selectedItem={selectedItem}
          tuning={tuning}
          frame={frame}
          focusedPartKeys={focusedPartKeys}
          focusedPartTuning={focusedPartTuning}
          partTunings={partTunings}
          onPartFocus={onPartFocus}
        />
      </StudioTuningPreviewProvider>
    </Canvas>
  )
}

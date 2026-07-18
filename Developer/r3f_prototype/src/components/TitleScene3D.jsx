import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GRAPHICS_STUDIO_STORAGE_KEY, GRAPHICS_STUDIO_TUNING_EVENT } from '../lib/graphicsStudioConfig.js'
import { toonMat } from '../lib/toon.js'
import { DancingDoge } from './DogeMesh.jsx'
import MatildaMesh from './MatildaMesh.jsx'
import ZombieMesh from './ZombieMesh.jsx'
import StudioTunedGroup, { getStudioTransformProps } from './StudioTunedGroup.jsx'
import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'
import { CompassBladeModel } from './Weapons/CompassBlade.jsx'
import { ChibikoModel } from './Weapons/Chibiko.jsx'
import { StarlinkSatelliteModel, ZomlonbiskModel } from './Weapons/StarlinkSatellite.jsx'

const TITLE_CHASE_TARGET = [0.48, 0.08]
export const TITLE_BOARD_BACK_LIMIT_Z = -4.62
export const TITLE_ZOMBIE_GROUND_LIFT_Y = 0.16
const TITLE_CHARACTER_STENCIL_REF = 2
const TITLE_OUTLINE_SCALE_BOOST = 1.02
const TITLE_MATERIAL_CACHE_KEY = 'titleCharacterMaterials'
const TITLE_OUTLINE_STATE_KEY = 'titleCharacterOutline'
const CLUB_LIGHT_BEAMS = [
  { color: 0x59c7ff, position: [-2.35, 5.7, -5.15], angle: 0.13, phase: 0 },
  { color: 0xd64fa8, position: [2.4, 5.8, -5.2], angle: -0.13, phase: Math.PI },
]
const CLUB_WASH_CYAN = new THREE.Color(0x59c7ff)
const CLUB_WASH_MAGENTA = new THREE.Color(0xa278ad)

export function clampTitleBackgroundZ(z) {
  return Math.min(z, TITLE_BOARD_BACK_LIMIT_Z)
}

export function isTitleOutlineStorageEvent(event) {
  return event?.key === GRAPHICS_STUDIO_STORAGE_KEY || event?.key === null
}

export function disposeTitleCharacterOutlines(root) {
  if (!root?.traverse) return

  root.traverse((node) => {
    const state = node?.userData?.[TITLE_OUTLINE_STATE_KEY]
    if (!state) return

    if (node.material === state.titleMaterial) node.material = state.sourceMaterial
    if (state.kind === 'outline') node.scale.copy(state.baseScale)
    delete node.userData[TITLE_OUTLINE_STATE_KEY]
  })

  const materialCache = root.userData?.[TITLE_MATERIAL_CACHE_KEY]
  materialCache?.forEach((material) => material.dispose())
  materialCache?.clear()
  delete root.userData[TITLE_MATERIAL_CACHE_KEY]
}

export function prepareTitleCharactersForStudioUpdate(root) {
  disposeTitleCharacterOutlines(root)
}

function getTitleCharacterMaterialKind(material) {
  if (!material || Array.isArray(material)) return null
  if (material.side === THREE.BackSide && material.stencilFunc === THREE.NotEqualStencilFunc) return 'outline'
  if (material.stencilWrite && material.stencilFunc === THREE.AlwaysStencilFunc) return 'fill'
  return null
}

export function applyTitleCharacterOutline(root) {
  if (!root?.traverse) return
  const materialCache = root.userData[TITLE_MATERIAL_CACHE_KEY] ?? new Map()
  root.userData[TITLE_MATERIAL_CACHE_KEY] = materialCache

  root.traverse((node) => {
    if (!node?.isMesh) return

    let material = node.material
    let state = node.userData[TITLE_OUTLINE_STATE_KEY]
    if (state && material !== state.titleMaterial) {
      if (state.kind === 'outline' && state.appliedScale && node.scale.equals(state.appliedScale)) {
        node.scale.copy(state.baseScale)
      }
      delete node.userData[TITLE_OUTLINE_STATE_KEY]
      state = null
    }

    const kind = state?.kind ?? getTitleCharacterMaterialKind(material)
    if (!kind) return

    if (!state) {
      let titleMaterial = materialCache.get(material)
      if (!titleMaterial) {
        titleMaterial = material.clone()
        materialCache.set(material, titleMaterial)
      }
      state = {
        kind,
        baseScale: node.scale.clone(),
        appliedScale: null,
        sourceMaterial: material,
        titleMaterial,
      }
      node.userData[TITLE_OUTLINE_STATE_KEY] = state
      node.material = state.titleMaterial
      material = state.titleMaterial
    }

    material.stencilRef = TITLE_CHARACTER_STENCIL_REF
    if (kind === 'outline') {
      if (state.appliedScale && !node.scale.equals(state.appliedScale)) {
        state.baseScale.copy(node.scale)
      }
      material.color?.set(0x000000)
      material.opacity = 1
      material.transparent = false
      node.scale.copy(state.baseScale).multiplyScalar(TITLE_OUTLINE_SCALE_BOOST)
      state.appliedScale ??= new THREE.Vector3()
      state.appliedScale.copy(node.scale)
    }
    material.needsUpdate = true
  })
}

function TitleCharacterOutlineGroup({ children }) {
  const ref = useRef()
  const dirtyRef = useRef(true)

  useEffect(() => {
    const group = ref.current
    const markDirty = () => {
      prepareTitleCharactersForStudioUpdate(group)
      dirtyRef.current = true
    }
    const handleStorage = (event) => {
      if (isTitleOutlineStorageEvent(event)) markDirty()
    }
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, markDirty)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, markDirty)
      window.removeEventListener('storage', handleStorage)
      disposeTitleCharacterOutlines(group)
    }
  }, [])

  useFrame(() => {
    if (!dirtyRef.current || !ref.current) return
    applyTitleCharacterOutline(ref.current)
    dirtyRef.current = false
  })

  return <group ref={ref}>{children}</group>
}

export const TITLE_SCENE_DIRECTION = {
  scene: {
    exitGlow: true,
    infectionStreaks: 2,
    warningLights: 2,
    zombieStudents: 5,
    bossZombies: 3,
    matildaPursuers: 1,
    dancingDoges: 2,
    clubLights: {
      beams: 2,
      palette: ['cyan', 'magenta'],
      animated: true,
      dynamicLights: 1,
      fixtures: 0,
    },
    realForegroundResources: [
      'ZombieMesh',
      'MatildaMesh',
      'ClassroomDesk',
      'ClassroomChair',
      'UnconsciousStudent',
    ],
  },
}

function TitleCameraRig() {
  const { camera } = useThree()
  useFrame(() => {
    camera.lookAt(0.1, 0.48, -1.35)
  })
  return null
}

function faceTitleTargetYaw(position) {
  return Math.atan2(TITLE_CHASE_TARGET[0] - position[0], TITLE_CHASE_TARGET[1] - position[2])
}

function TitleCompanions() {
  const chibikoAttackPhaseRef = useRef(0)

  return (
    <>
      <group position={[-0.22, 0.2, 0.82]} rotation={[0, 0.28, -0.03]} scale={1.05}>
        <CompassBladeModel />
      </group>
      <group position={[1.36, 0.27, 0.76]} rotation={[0, -0.38, 0.02]} scale={0.42}>
        <ChibikoModel attackPhaseRef={chibikoAttackPhaseRef} />
      </group>
    </>
  )
}

function TitleFarBackgroundStory({ reducedEffects }) {
  const zomlonbiskRef = useRef()

  useFrame(({ clock }) => {
    if (!zomlonbiskRef.current) return
    if (reducedEffects) {
      zomlonbiskRef.current.position.y = 0.68
      zomlonbiskRef.current.rotation.y = -0.28
      zomlonbiskRef.current.rotation.z = 0
      return
    }

    const t = clock.elapsedTime
    const s = Math.sin(t * 3.2)
    zomlonbiskRef.current.position.y = 0.68 + Math.abs(s) * 0.05
    zomlonbiskRef.current.rotation.y = -0.28 + s * 0.5
    zomlonbiskRef.current.rotation.z = Math.sin(t * 6.4) * 0.09
  })

  return (
    <>
      <group position={[-2.35, 1.12, clampTitleBackgroundZ(-7.0)]} rotation={[0.08, -0.42, -1.2]} scale={1.24}>
        <StarlinkSatelliteModel studioItemId="title-crashed-starlink" />
      </group>
      <group ref={zomlonbiskRef} position={[1.86, 0.68, clampTitleBackgroundZ(-8.0)]} rotation={[0, -0.28, 0]} scale={1.16}>
        <ZomlonbiskModel running={false} />
      </group>
    </>
  )
}

function TitleZombie({ position, delay = 0, scale = 1, type = 'E01' }) {
  const ref = useRef()
  const yaw = faceTitleTargetYaw(position)
  const liftedPosition = [position[0], position[1] + TITLE_ZOMBIE_GROUND_LIFT_Y, position[2]]
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 1.2) * 0.07
    ref.current.position.y = liftedPosition[1] + Math.sin(t * 2.1) * 0.035
    ref.current.rotation.x = 0.14 + Math.sin(t * 1.8) * 0.04
    ref.current.rotation.y = yaw + Math.sin(t * 1.15) * 0.025
    ref.current.rotation.z = Math.sin(t * 1.5) * 0.055
  })

  return (
    <group ref={ref} position={liftedPosition} rotation={[0.14, yaw, 0]} scale={scale}>
      <ZombieMesh type={type} animPhase="charge" />
    </group>
  )
}

function TitleMatildaPursuer({ position, delay = 0, scale = 1 }) {
  const ref = useRef()
  const yaw = faceTitleTargetYaw(position)
  const liftedPosition = [position[0], position[1] + TITLE_ZOMBIE_GROUND_LIFT_Y, position[2]]
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 1.05) * 0.05
    ref.current.position.y = liftedPosition[1] + Math.sin(t * 1.9) * 0.035
    ref.current.rotation.y = yaw + Math.sin(t * 1.1) * 0.018
    ref.current.rotation.z = Math.sin(t * 1.35) * 0.045
  })

  return (
    <group ref={ref} position={liftedPosition} rotation={[0, yaw, 0]} scale={scale}>
      <MatildaMesh />
    </group>
  )
}

function TitleBossZombie({ type = 'B01', position, scale = 1.25, delay = 0 }) {
  const ref = useRef()
  const yaw = faceTitleTargetYaw(position)
  const liftedPosition = [position[0], position[1] + TITLE_ZOMBIE_GROUND_LIFT_Y, position[2]]
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.position.x = position[0] + Math.sin(t * 0.7) * 0.08
    ref.current.rotation.y = yaw + Math.sin(t * 0.95) * 0.018
    ref.current.rotation.z = Math.sin(t * 0.9) * 0.035
  })

  return (
    <group ref={ref} position={liftedPosition} rotation={[0, yaw, 0]} scale={scale}>
      <ZombieMesh type={type} animPhase="charge" />
    </group>
  )
}

function TitleClassroomProps() {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = -0.06 + Math.sin(state.clock.elapsedTime * 0.9) * 0.015
  })

  return (
    <group ref={ref}>
      <group position={[-2.78, 0.02, 0.95]} rotation={[0, 0.42, -0.06]} scale={0.72}>
        <ClassroomDesk variant="overturned" />
      </group>
      <group position={[2.42, 0.02, 0.48]} rotation={[0, -0.36, 0.04]} scale={1.02}>
        <ClassroomChair variant="tilted" />
      </group>
      <group position={[-1.72, 0.02, 0.12]} rotation={[0, 0.9, 0]} scale={0.84}>
        <ClassroomChair variant="overturned" />
      </group>
      <group position={[2.62, 0.05, -1.08]} rotation={[0, -0.78, 0]} scale={0.84}>
        <ClassroomDesk variant="abandoned" />
      </group>
      <group position={[-2.35, 0.02, -1.22]} rotation={[0, 0.58, 0]} scale={0.34}>
        <UnconsciousStudent variant="sideLeft" />
      </group>
    </group>
  )
}

function SpeedStreak({ position, scale, delay = 0 }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xfff3ba,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + delay
    ref.current.material.opacity = 0.12 + Math.sin(t * 4.5) * 0.07
    ref.current.position.z = position[2] + Math.sin(t * 2.2) * 0.08
  })

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={2}>
      <planeGeometry args={scale} />
    </mesh>
  )
}

function WarningLight({ position, delay }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xe99039, transparent: true, opacity: 0.7 }), [])
  useFrame((state) => {
    if (!ref.current) return
    ref.current.material.opacity = 0.28 + Math.sin(state.clock.elapsedTime * 4 + delay) * 0.18
  })

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <circleGeometry args={[1.1, 24]} />
    </mesh>
  )
}

function ClubLightBeam({ config, register }) {
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: config.color,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    forceSinglePass: true,
  }), [config.color])
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: config.color,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    forceSinglePass: true,
  }), [config.color])

  useEffect(() => () => {
    beamMat.dispose()
    coreMat.dispose()
  }, [beamMat, coreMat])

  return (
    <group
      ref={(node) => register(node ? { node, beamMat, coreMat } : null)}
      position={config.position}
      rotation={[0, 0, config.angle]}
    >
      <mesh position={[0, -2.3, 0]} material={beamMat} renderOrder={-1}>
        <coneGeometry args={[1.18, 4.6, 10, 1, true]} />
      </mesh>
      <mesh position={[0, -2.15, 0.015]} material={coreMat}>
        <coneGeometry args={[0.46, 4.3, 8, 1, true]} />
      </mesh>
    </group>
  )
}

export function applyClubLightFrame(beamStates, wash, elapsedTime, reducedEffects) {
  CLUB_LIGHT_BEAMS.forEach((config, index) => {
    const beamState = beamStates[index]
    if (!beamState) return

    if (reducedEffects) {
      beamState.node.rotation.z = config.angle
      beamState.beamMat.opacity = 0.065
      beamState.coreMat.opacity = 0.08
      return
    }

    beamState.node.rotation.z = config.angle + Math.sin(elapsedTime * 1.05 + config.phase) * 0.08
    beamState.beamMat.opacity = 0.1 + Math.sin(elapsedTime * 1.3 + config.phase) * 0.025
    beamState.coreMat.opacity = 0.145 + Math.sin(elapsedTime * 1.15 + config.phase) * 0.035
  })

  if (!wash) return
  if (reducedEffects) {
    wash.color.lerpColors(CLUB_WASH_CYAN, CLUB_WASH_MAGENTA, 0.5)
    wash.intensity = 0.45
    return
  }

  const mix = (Math.sin(elapsedTime * 0.72) + 1) * 0.5
  wash.color.lerpColors(CLUB_WASH_CYAN, CLUB_WASH_MAGENTA, mix)
  wash.intensity = 0.7 + Math.sin(elapsedTime * 1.15) * 0.16
}

function ClubLightRig({ reducedEffects }) {
  const beamStates = useRef([])
  const washRef = useRef()
  const reducedAppliedRef = useRef(false)

  useFrame((state) => {
    if (reducedEffects) {
      if (reducedAppliedRef.current) return
      applyClubLightFrame(beamStates.current, washRef.current, state.clock.elapsedTime, true)
      reducedAppliedRef.current = true
      return
    }

    reducedAppliedRef.current = false
    applyClubLightFrame(beamStates.current, washRef.current, state.clock.elapsedTime, false)
  })

  return (
    <>
      {CLUB_LIGHT_BEAMS.map((config, index) => (
        <ClubLightBeam
          key={config.color}
          config={config}
          register={(beamState) => { beamStates.current[index] = beamState }}
        />
      ))}
      <pointLight ref={washRef} position={[0, 3.8, -3.8]} intensity={0.7} distance={7} decay={2} />
    </>
  )
}

function ExitGlow() {
  const ref = useRef()
  const poolRef = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xfff3ba, transparent: true, opacity: 0.5, depthWrite: false }), [])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.22, depthWrite: false }), [])
  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 1.6)
    if (ref.current) ref.current.material.opacity = 0.46 + pulse * 0.1
    if (poolRef.current) poolRef.current.material.opacity = 0.2 + pulse * 0.06
  })

  return (
    <group>
      <mesh ref={ref} position={[0, 1.35, -4.35]} material={mat}>
        <boxGeometry args={[1.475, 1.15, 0.08]} />
      </mesh>
      <mesh ref={poolRef} position={[0, 0.015, -3.4]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat} renderOrder={1}>
        <circleGeometry args={[2.6, 36]} />
      </mesh>
    </group>
  )
}

export function inspectTitleSceneObject(event) {
  const inspector = typeof window !== 'undefined'
    ? window.__zombieSchoolScreenInspector
    : null
  if (!inspector?.inspectThree) return

  event.stopPropagation()
  const object = event.object
  const material = Array.isArray(object.material) ? object.material[0] : object.material
  const hierarchy = []
  let current = object
  while (current) {
    hierarchy.push(current.name || current.userData?.studioItemId || current.type)
    current = current.parent
  }

  inspector.inspectThree({
    name: object.name || object.userData?.studioItemId || '',
    objectType: object.type,
    geometryType: object.geometry?.type || '',
    materialType: material?.type || '',
    color: material?.color ? `#${material.color.getHexString()}` : '',
    uuid: object.uuid,
    point: {
      x: event.point.x.toFixed(3),
      y: event.point.y.toFixed(3),
      z: event.point.z.toFixed(3),
    },
    distance: event.distance.toFixed(3),
    hierarchy,
  })
}

export default function TitleScene3D({ studioGroupRef = null, studioTuning = null, reducedEffects = false }) {
  const floorMat = useMemo(() => toonMat(0x4a4054, 0.05), [])
  const doorMat = useMemo(() => toonMat(0x805947, 0.05), [])
  const studioMode = studioTuning != null
  const studioTransform = studioMode ? getStudioTransformProps(studioTuning) : getStudioTransformProps()

  const sceneRoot = (
    <group
      ref={studioGroupRef}
      onPointerDown={inspectTitleSceneObject}
      rotation={[studioTransform.rotation[0], -0.09 + studioTransform.rotation[1], studioTransform.rotation[2]]}
      position={[0, -1.15, 0]}
      scale={studioTransform.scale}
    >
      <mesh receiveShadow position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[8.6, 12]} />
      </mesh>
      <mesh receiveShadow position={[0, 1.3, -4.62]} material={doorMat}>
        <boxGeometry args={[1.7, 1.3, 0.32]} />
      </mesh>

      <ClubLightRig reducedEffects={reducedEffects} />
      <ExitGlow />
      <TitleClassroomProps />
      <SpeedStreak position={[-0.98, 0.055, 1.9]} scale={[0.11, 1.8]} delay={0.3} />
      <SpeedStreak position={[0.02, 0.055, 1.3]} scale={[0.09, 2.25]} delay={1.0} />
      <SpeedStreak position={[1.06, 0.055, 0.98]} scale={[0.1, 1.75]} delay={1.7} />
      <WarningLight position={[-2.3, 0.03, -1.5]} delay={0} />
      <WarningLight position={[2.15, 0.03, 1.3]} delay={1.4} />

      <TitleCharacterOutlineGroup>
        <TitleFarBackgroundStory reducedEffects={reducedEffects} />
        <TitleBossZombie type="B02" position={[-1.99, 0.18, -3.7]} scale={0.93} delay={0.9} />
        <TitleBossZombie type="B03" position={[0.02, 0.4, -4.04]} scale={1.344} delay={1.35} />
        <TitleBossZombie type="B01" position={[-0.86, 0.34, -1.12]} scale={1.02} />
        <TitleZombie position={[-3.3, 0.22, -3.42]} delay={0.4} scale={0.58} type="E03" />
        <TitleZombie position={[2.0, 0.2, -3.18]} delay={1.6} scale={0.52} type="E02" />
        <TitleZombie position={[-1.95, 0.22, -1.55]} delay={0.2} scale={0.7} type="E01" />
        <TitleZombie position={[1.56, 0.2, -2.08]} delay={1.0} scale={0.62} type="E02" />
        <TitleZombie position={[-0.92, 0.18, -2.72]} delay={2.1} scale={0.52} type="E03" />
        <TitleMatildaPursuer position={[1.45, 0.36, -2.92]} delay={1.8} scale={1.44} />
        <DancingDoge position={[-1.27, 0.0, 1.55]} dance="twist" delay={0} scale={0.92} yaw={0.42} paused={reducedEffects} />
        <DancingDoge position={[1.97, 0.0, 1.5]} dance="disco" delay={1.15} scale={0.92} yaw={-0.5} paused={reducedEffects} />
        <TitleCompanions />
      </TitleCharacterOutlineGroup>
    </group>
  )

  return (
    <>
      <TitleCameraRig />
      <fog attach="fog" args={[0x140f1c, 16, 34]} />
      <ambientLight intensity={0.4} color={0x9fb0c4} />
      <directionalLight position={[-5, 10, 6]} intensity={2.35} castShadow />
      <directionalLight position={[2, 4, -5]} intensity={1.35} color={0xfff0bc} />
      <directionalLight position={[5, 4, -4]} intensity={0.7} color={0xffa34f} />
      <pointLight position={[0, 1.1, -3.7]} intensity={5.5} color={0xffdf9a} distance={11} decay={2} />

      {studioMode ? sceneRoot : <StudioTunedGroup itemId="title-scene">{sceneRoot}</StudioTunedGroup>}
    </>
  )
}

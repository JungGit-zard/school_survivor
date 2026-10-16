import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  capRosariFrameDelta,
  isRosariNearWardrobe,
  moveRosariRoomPosition,
  normalizeRosariMoveVector,
} from '../lib/rosariRoom.js'

const ROSARI_GLB_URL = '/assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb'
const OUTLINE_STENCIL_REF = 3
const OUTLINE_WIDTH_PX = 2
const OUTLINE_COLOR = 0x050209
const MOVE_SPEED = 1.85
const EMPTY_KEYS = Object.freeze({ up: false, down: false, left: false, right: false })
const DIRECTION_LABELS = Object.freeze({ up: '위', down: '아래', left: '왼쪽', right: '오른쪽' })

export default function RosariRoom({ onBack }) {
  const [wardrobeOpen, setWardrobeOpen] = useState(false)
  const [nearWardrobe, setNearWardrobe] = useState(false)
  const [pressedKeys, setPressedKeys] = useState(EMPTY_KEYS)
  const mobileKeysRef = useRef({ ...EMPTY_KEYS })
  const keyboardKeysRef = useRef({ ...EMPTY_KEYS })
  const rootRef = useRef(null)
  const wardrobeButtonRef = useRef(null)
  const heldKeyboard = useRef(new Map())
  const wasWardrobeOpen = useRef(false)
  const heldPointers = useRef(new Map())
  const padKeyboard = useRef(new Set())
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 })
  const layout = getRosariRoomLayout(roomSize)

  useEffect(() => {
    if (wasWardrobeOpen.current && !wardrobeOpen) wardrobeButtonRef.current?.focus()
    wasWardrobeOpen.current = wardrobeOpen
  }, [wardrobeOpen])

  useEffect(() => {
    const element = rootRef.current
    const measure = (size) => setRoomSize({ width: size.width, height: size.height })
    measure(element.getBoundingClientRect())
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const clearAllKeys = () => {
      heldKeyboard.current.clear()
      keyboardKeysRef.current = { ...EMPTY_KEYS }
      for (const [id, held] of heldPointers.current) {
        if (held.target.hasPointerCapture?.(id)) held.target.releasePointerCapture?.(id)
      }
      heldPointers.current.clear()
      padKeyboard.current.clear()
      mobileKeysRef.current = { ...EMPTY_KEYS }
      setPressedKeys(EMPTY_KEYS)
    }
    const applyKey = (event, pressed) => {
      const key = keyToDirection(event.key)
      if (!key) return
      if (wardrobeOpen) return
      const physicalKey = event.code || event.key.toLowerCase()
      if (pressed) heldKeyboard.current.set(physicalKey, key)
      else heldKeyboard.current.delete(physicalKey)
      const next = { ...EMPTY_KEYS }
      for (const direction of heldKeyboard.current.values()) next[direction] = true
      keyboardKeysRef.current = next
      event.preventDefault()
    }
    const down = (event) => {
      if (event.key === 'Escape') {
        if (wardrobeOpen) setWardrobeOpen(false)
        else onBack?.()
        return
      }
      applyKey(event, true)
    }
    const up = (event) => applyKey(event, false)
    window.addEventListener('keydown', down)
    const visibility = () => { if (document.hidden) clearAllKeys() }
    if (wardrobeOpen) clearAllKeys()
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clearAllKeys)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pointercancel', clearAllKeys)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clearAllKeys)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pointercancel', clearAllKeys)
      clearAllKeys()
    }
  }, [onBack, wardrobeOpen])

  const clearMobileKeys = useCallback(() => {
    for (const [id, held] of heldPointers.current) {
      if (held.target.hasPointerCapture?.(id)) held.target.releasePointerCapture?.(id)
    }
    heldPointers.current.clear()
    padKeyboard.current.clear()
    mobileKeysRef.current = { ...EMPTY_KEYS }
    setPressedKeys(EMPTY_KEYS)
  }, [])
  const refreshMobileKeys = useCallback(() => {
    const next = { ...EMPTY_KEYS }
    for (const held of heldPointers.current.values()) next[held.key] = true
    for (const key of padKeyboard.current) next[key] = true
    mobileKeysRef.current = next
    setPressedKeys(next)
  }, [])
  const makePadHandlers = useCallback((key) => {
    const release = (event) => {
      heldPointers.current.delete(event.pointerId)
      refreshMobileKeys()
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    return {
      'aria-pressed': Boolean(pressedKeys[key]),
      disabled: wardrobeOpen,
      onPointerDown: (event) => {
        if (event.button !== 0 || wardrobeOpen) return
        event.preventDefault()
        heldPointers.current.set(event.pointerId, { key, target: event.currentTarget })
        refreshMobileKeys()
        event.currentTarget.setPointerCapture?.(event.pointerId)
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onKeyDown: (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        if (wardrobeOpen) return
        event.preventDefault()
        padKeyboard.current.add(key)
        refreshMobileKeys()
      },
      onKeyUp: (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        padKeyboard.current.delete(key)
        refreshMobileKeys()
      },
      onBlur: clearMobileKeys,
    }
  }, [clearMobileKeys, refreshMobileKeys, wardrobeOpen, pressedKeys])
  const canUseWardrobeButton = canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe })

  return (
    <main ref={rootRef} style={{ ...styles.root, gridTemplateColumns: layout.sideRail ? 'minmax(0, 1fr) 158px' : 'minmax(0, 1fr)', gridTemplateRows: layout.sideRail ? 'auto minmax(0, 1fr)' : styles.root.gridTemplateRows }} aria-label="로자리의 방">
      <div style={styles.header}>
        <button type="button" style={styles.backButton} onClick={onBack}>← 타이틀</button>
        <div style={styles.titleBlock}>
          <h1 style={{ ...styles.title, ...(layout.compact ? { fontSize: 16 } : {}) }}>로자리의 방</h1>
          <p hidden={layout.compact} style={styles.subtitle}>방을 둘러보고 옷장을 열어 현재 복장을 확인해요.</p>
        </div>
      </div>
      <section style={styles.stage} aria-label="로자리 방 3D 장면">
        <RoomErrorBoundary>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, stencil: true, alpha: false }}
          camera={{ position: [0, 0, 1], fov: 50 }}
          style={styles.canvas}
        >
          <Suspense fallback={<Html center><div role="status" style={{ ...panel, padding: 12, width: 140, color: '#5f2d58' }}>로자리의 방을 불러오는 중…</div></Html>}>
            <RoomScene
              keyboardKeysRef={keyboardKeysRef}
              mobileKeysRef={mobileKeysRef}
              wardrobeOpen={wardrobeOpen}
              onNearWardrobeChange={setNearWardrobe}
              onWardrobeToggle={() => setWardrobeOpen((open) => !open)}
            />
          </Suspense>
        </Canvas>
        </RoomErrorBoundary>
        {wardrobeOpen && (
          <section role="dialog" aria-modal="false" aria-label="로자리 옷장" style={styles.wardrobePanel} onKeyDown={(event) => { if (event.key !== 'Escape') event.stopPropagation() }}>
            <div style={styles.wardrobeHeader}>
              <h2 style={styles.wardrobeTitle}>옷장</h2>
              <button autoFocus type="button" aria-label="옷장 닫기" style={styles.wardrobeCloseButton} onClick={() => setWardrobeOpen(false)}>×</button>
            </div>
            <div data-wardrobe-scroll style={styles.wardrobeBody}>
              <div style={styles.currentOutfit}>현재 착용: 학교 교복</div>
              <p style={styles.emptyOutfit}>추가 의상은 준비 중이에요.</p>
            </div>
          </section>
        )}
      </section>
      <div style={{ ...styles.bottomHud, gridTemplateColumns: layout.sideRail ? 'minmax(0, 1fr)' : styles.bottomHud.gridTemplateColumns, alignContent: layout.sideRail ? 'space-between' : 'end' }}>
        <div style={styles.controlPanel} aria-label="이동 조작">
          <PadButton direction="up" style={styles.padButton} handlers={makePadHandlers('up')}>▲</PadButton>
          <PadButton direction="down" style={styles.padButton} handlers={makePadHandlers('down')}>▼</PadButton>
          <PadButton direction="left" style={styles.padButton} handlers={makePadHandlers('left')}>◀</PadButton>
          <PadButton direction="right" style={styles.padButton} handlers={makePadHandlers('right')}>▶</PadButton>
        </div>
        <div style={styles.actionPanel}>
          <p style={styles.hint}>키보드: 방향키/WASD · ESC: 타이틀</p>
          <button
            ref={wardrobeButtonRef}
            type="button"
            style={canUseWardrobeButton ? styles.wardrobeButton : styles.wardrobeButtonDisabled}
            disabled={!canUseWardrobeButton}
            aria-expanded={wardrobeOpen}
            onClick={() => { if (canUseWardrobeButton) setWardrobeOpen((open) => !open) }}
          >
            옷장 {wardrobeOpen ? '닫기' : '열기'}
          </button>
        </div>
      </div>
    </main>
  )
}

export class RoomErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return (
      <div role="alert" style={{ padding: 12, overflowY: 'auto', maxHeight: '100%', boxSizing: 'border-box' }}>
        <p>방을 불러오지 못했어요. 다시 시도하거나 위의 타이틀 버튼으로 돌아가 주세요.</p>
        <button type="button" style={styles.backButton} onClick={() => this.setState({ failed: false })}>다시 시도</button>
      </div>
    )
    return this.props.children
  }
}

function PadButton({ direction, style, handlers, children }) {
  const label = DIRECTION_LABELS[direction] || direction
  return (
    <button type="button" style={{ ...style, ...(handlers['aria-pressed'] ? { background: '#b94f85', color: '#fff', boxShadow: 'inset 0 2px 4px #67315c' } : {}), ...(handlers.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }} aria-label={`이동: ${label}`} {...handlers}>
      {children}
    </button>
  )
}

export function canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe }) {
  return Boolean(wardrobeOpen || nearWardrobe)
}

export function getRosariRoomLayout(size) {
  return {
    sideRail: size.width >= 500 && size.width > size.height * 1.25,
    compact: size.width > 0 && size.width < 280,
  }
}

// Fit the authored floor and wall bounds, not guessed camera distances.
export function getRosariCameraLayout(size) {
  const { width, height } = getRosariOutlineViewport(size)
  const fov = 48
  const target = new THREE.Vector3(0, 1, 0)
  const backward = new THREE.Vector3(0, 0.7, 0.8).normalize()
  const right = new THREE.Vector3(1, 0, 0)
  const up = new THREE.Vector3().crossVectors(backward, right)
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanX = tanY * width / height
  let distance = 0
  for (const x of [-4.2, 4.2]) for (const y of [-0.07, 3.025]) for (const z of [-3.15, 3.15]) {
    const corner = new THREE.Vector3(x, y, z).sub(target)
    distance = Math.max(distance, corner.dot(backward) + Math.max(Math.abs(corner.dot(right)) / tanX, Math.abs(corner.dot(up)) / tanY) / 0.94)
  }
  return { position: target.clone().addScaledVector(backward, distance).toArray(), target: target.toArray(), fov }
}

function RoomScene({ keyboardKeysRef, mobileKeysRef, wardrobeOpen, onNearWardrobeChange, onWardrobeToggle }) {
  const characterRef = useRef(null)
  const positionRef = useRef({ x: 0, z: 0.65 })
  const walkTimeRef = useRef(0)
  const limbRefs = useRef({})
  const lastNearWardrobeRef = useRef(false)
  const canToggleWardrobeRef = useRef(false)
  const { camera, size } = useThree()

  useEffect(() => {
    const layout = getRosariCameraLayout(size)
    camera.position.set(...layout.position)
    camera.fov = layout.fov
    camera.updateProjectionMatrix()
    camera.lookAt(...layout.target)
  }, [camera, size.height, size.width])

  useFrame((_, rawDelta) => {
    const delta = capRosariFrameDelta(rawDelta)
    const keys = mergeKeys(keyboardKeysRef.current, mobileKeysRef.current)
    const vector = normalizeRosariMoveVector(wardrobeOpen ? EMPTY_KEYS : keys)
    const moving = vector.x !== 0 || vector.z !== 0
    if (moving) {
      positionRef.current = moveRosariRoomPosition(positionRef.current, {
        x: vector.x * MOVE_SPEED * delta,
        z: vector.z * MOVE_SPEED * delta,
      })
      walkTimeRef.current += delta * 8
    }
    const root = characterRef.current
    if (root) {
      root.position.set(positionRef.current.x, (moving ? Math.sin(walkTimeRef.current * 2) * 0.015 : 0), positionRef.current.z)
      if (moving) root.rotation.y = Math.atan2(vector.x, vector.z)
      animateNamedLimbs(limbRefs.current, moving ? walkTimeRef.current : 0, moving)
    }
    updateOutlineUniforms(root, size)
    const nearWardrobe = isRosariNearWardrobe(positionRef.current)
    canToggleWardrobeRef.current = canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe })
    if (nearWardrobe !== lastNearWardrobeRef.current) {
      lastNearWardrobeRef.current = nearWardrobe
      onNearWardrobeChange(nearWardrobe)
    }
  })

  return (
    <>
      <color attach="background" args={[wardrobeOpen ? '#ffe7ef' : '#fff1f4']} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[-2.5, 5.5, 3.5]} intensity={2.1} />
      <pointLight position={[1.9, 2.3, 1.6]} color="#ffd6a6" intensity={2.5} distance={6} />
      <RosariBedroom wardrobeOpen={wardrobeOpen} canToggleWardrobeRef={canToggleWardrobeRef} onWardrobeToggle={onWardrobeToggle} />
      <RosariModel refObject={characterRef} limbRefs={limbRefs} />
    </>
  )
}

function RosariModel({ refObject, limbRefs }) {
  const gltf = useGLTF(ROSARI_GLB_URL)
  const { gl } = useThree()
  const [container] = useState(() => new THREE.Group())
  // Each committed setup owns a fresh clone, including R3F StrictMode replay.
  // The resource-free primitive boundary keeps R3F from dismantling the clone
  // before passive cleanup can release its materials/hulls on true unmount.
  useEffect(() => mountRosariModel(container, gltf.scene, limbRefs.current, gl), [container, gltf.scene, limbRefs, gl])
  return <group ref={refObject} position={[0, 0, 0.65]}><primitive object={container} /></group>
}

export function mountRosariModel(parent, source, limbs, gl) {
  const cloned = source.clone(true)
  cloned.traverse((node) => {
    if (!node.isMesh) return
    node.castShadow = true
    node.receiveShadow = true
    if (node.material) node.material = Array.isArray(node.material)
      ? node.material.map((mat) => makeArchiveToonMaterial(mat))
      : makeArchiveToonMaterial(node.material)
    markSurfaceMaterial(node)
  })
  applyPixelOutlines(cloned, () => gl.getSize(new THREE.Vector2()))
  collectLimbRefs(cloned, limbs)
  const bounds = new THREE.Box3().setFromObject(cloned)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const characterScale = size.y > 0 ? 1.32 / size.y : 0.86
  cloned.position.set(-center.x, -bounds.min.y, -center.z)
  parent.scale.setScalar(characterScale)
  parent.add(cloned)
  return () => {
    parent.remove(cloned)
    for (const key of Object.keys(limbs)) delete limbs[key]
    // Only this setup's materials/hulls; cached GLTF geometry/maps stay loader-owned.
    disposeRosariModel(cloned)
  }
}

// Only call on the room clone: all its surface materials were replaced above.
// Geometry and maps on surfaces still belong to useGLTF's shared cache.
export function disposeRosariModel(root) {
  const materials = new Set()
  const outlineGeometries = new Set()
  root.traverse((node) => {
    if (!node.isMesh) return
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material) materials.add(material)
    }
    if (node.userData?.isOutline && node.geometry) outlineGeometries.add(node.geometry)
  })
  for (const geometry of outlineGeometries) geometry.dispose()
  for (const material of materials) material.dispose()
}

function RosariBedroom({ wardrobeOpen, canToggleWardrobeRef, onWardrobeToggle }) {
  return (
    <group>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[8.3, 0.08, 6.3]} />
        <meshToonMaterial color="#fff1db" />
      </mesh>
      <mesh position={[0, 1.5, -3.05]}>
        <boxGeometry args={[8.4, 3.05, 0.12]} />
        <meshToonMaterial color="#ffd7e7" />
      </mesh>
      <mesh position={[-4.05, 1.5, 0]}>
        <boxGeometry args={[0.12, 3.05, 6.3]} />
        <meshToonMaterial color="#eadcff" />
      </mesh>
      <mesh position={[4.05, 1.5, 0]}>
        <boxGeometry args={[0.12, 3.05, 6.3]} />
        <meshToonMaterial color="#f7d5ff" />
      </mesh>
      <Wardrobe wardrobeOpen={wardrobeOpen} canToggleWardrobeRef={canToggleWardrobeRef} onOpen={onWardrobeToggle} />
      <Bed />
      <Vanity />
      <HeartRug />
      <WindowCurtains />
      <PlushToys />
      <FramedArt />
    </group>
  )
}

function Wardrobe({ wardrobeOpen, canToggleWardrobeRef, onOpen }) {
  return (
    <group
      position={[-2.85, 0, -1.35]}
      onClick={(event) => {
        event.stopPropagation()
        if (canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe: canToggleWardrobeRef.current })) onOpen?.()
      }}
    >
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.35, 1.8, 0.7]} />
        <meshToonMaterial color="#f8cfe0" />
      </mesh>
      <mesh position={[0, 1.84, 0]}>
        <boxGeometry args={[1.48, 0.16, 0.78]} />
        <meshToonMaterial color="#fff0c9" />
      </mesh>
      <mesh position={[-0.35, 0.94, 0.38]}><boxGeometry args={[0.05, 1.54, 0.04]} /><meshToonMaterial color="#fff6ef" /></mesh>
      <mesh position={[0.35, 0.94, 0.38]}><boxGeometry args={[0.05, 1.54, 0.04]} /><meshToonMaterial color="#fff6ef" /></mesh>
      <mesh position={[-0.18, 0.92, 0.44]}><sphereGeometry args={[0.045, 12, 12]} /><meshToonMaterial color="#c77ab8" /></mesh>
      <mesh position={[0.18, 0.92, 0.44]}><sphereGeometry args={[0.045, 12, 12]} /><meshToonMaterial color="#c77ab8" /></mesh>
    </group>
  )
}

function Bed() {
  return (
    <group position={[2.25, 0, -1.1]}>
      <mesh position={[0, 0.45, -0.96]}><boxGeometry args={[2.18, 0.9, 0.16]} /><meshToonMaterial color="#d889b0" /></mesh>
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[2.0, 0.5, 1.75]} /><meshToonMaterial color="#f8c7dc" /></mesh>
      <mesh position={[0, 0.58, -0.18]}><boxGeometry args={[1.95, 0.28, 1.2]} /><meshToonMaterial color="#fff4c8" /></mesh>
      <mesh position={[-0.48, 0.82, -0.65]}><boxGeometry args={[0.74, 0.25, 0.42]} /><meshToonMaterial color="#efd9ff" /></mesh>
      <mesh position={[0.48, 0.82, -0.65]}><boxGeometry args={[0.74, 0.25, 0.42]} /><meshToonMaterial color="#ffe1ec" /></mesh>
      <mesh position={[0, 0.95, -0.2]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.42, 0.08, 0.08]} /><meshToonMaterial color="#de75ab" /></mesh>
      <mesh position={[0, 0.95, -0.2]} rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.42, 0.08, 0.08]} /><meshToonMaterial color="#de75ab" /></mesh>
      <mesh position={[-0.86, 0.78, -0.88]}><sphereGeometry args={[0.07, 12, 12]} /><meshToonMaterial color="#fff1c2" /></mesh>
      <mesh position={[0.86, 0.78, -0.88]}><sphereGeometry args={[0.07, 12, 12]} /><meshToonMaterial color="#fff1c2" /></mesh>
    </group>
  )
}

function Vanity() {
  return (
    <group position={[-2.8, 0, 1.45]}>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.28, 0.35, 0.55]} /><meshToonMaterial color="#fff0d1" /></mesh>
      <mesh position={[0, 1.0, -0.06]}><torusGeometry args={[0.38, 0.035, 12, 32]} /><meshToonMaterial color="#d89bd8" /></mesh>
      <mesh position={[0, 1.0, -0.07]}><circleGeometry args={[0.32, 32]} /><meshBasicMaterial color="#e9f7ff" /></mesh>
      <mesh position={[-0.42, 0.18, 0.15]}><boxGeometry args={[0.12, 0.36, 0.12]} /><meshToonMaterial color="#e8b7d5" /></mesh>
      <mesh position={[0.42, 0.18, 0.15]}><boxGeometry args={[0.12, 0.36, 0.12]} /><meshToonMaterial color="#e8b7d5" /></mesh>
      <mesh position={[-0.35, 0.72, 0.22]} rotation={[0, 0.25, 0]}><boxGeometry args={[0.28, 0.06, 0.2]} /><meshToonMaterial color="#7bc3ff" /></mesh>
      <mesh position={[-0.06, 0.74, 0.22]} rotation={[0, 0.2, 0]}><boxGeometry args={[0.26, 0.06, 0.2]} /><meshToonMaterial color="#ffd36b" /></mesh>
      <mesh position={[0.35, 0.78, 0.2]}><cylinderGeometry args={[0.06, 0.04, 0.24, 12]} /><meshToonMaterial color="#b7e28b" /></mesh>
      <mesh position={[0.35, 0.93, 0.2]}><sphereGeometry args={[0.12, 12, 12]} /><meshToonMaterial color="#ff9abf" /></mesh>
    </group>
  )
}

function HeartRug() {
  return (
    <group position={[0.35, 0.025, 1.25]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[-0.22, 0.17, 0]}><circleGeometry args={[0.42, 32]} /><meshToonMaterial color="#ee8fbb" /></mesh>
      <mesh position={[0.22, 0.17, 0.001]}><circleGeometry args={[0.42, 32]} /><meshToonMaterial color="#ee8fbb" /></mesh>
      <mesh position={[0, -0.13, 0.002]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.85, 0.85]} /><meshToonMaterial color="#ee8fbb" /></mesh>
    </group>
  )
}

function WindowCurtains() {
  return (
    <group position={[1.2, 1.45, -2.92]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[1.45, 0.82, 0.05]} /><meshBasicMaterial color="#fffbe8" /></mesh>
      <mesh position={[-0.92, 0, 0.08]}><boxGeometry args={[0.33, 1.32, 0.09]} /><meshToonMaterial color="#e6b7f5" /></mesh>
      <mesh position={[0.92, 0, 0.08]}><boxGeometry args={[0.33, 1.32, 0.09]} /><meshToonMaterial color="#e6b7f5" /></mesh>
    </group>
  )
}

function PlushToys() {
  return (
    <group position={[3.12, 0.18, 1.65]}>
      <mesh position={[0, 0.26, 0]}><sphereGeometry args={[0.22, 16, 16]} /><meshToonMaterial color="#fff5d5" /></mesh>
      <mesh position={[-0.14, 0.47, 0]}><sphereGeometry args={[0.09, 12, 12]} /><meshToonMaterial color="#fff5d5" /></mesh>
      <mesh position={[0.14, 0.47, 0]}><sphereGeometry args={[0.09, 12, 12]} /><meshToonMaterial color="#fff5d5" /></mesh>
      <mesh position={[-0.55, 0.22, 0.05]}><sphereGeometry args={[0.18, 16, 16]} /><meshToonMaterial color="#ffd4ea" /></mesh>
      <mesh position={[-0.55, 0.44, 0.04]}><sphereGeometry args={[0.13, 16, 16]} /><meshToonMaterial color="#ffd4ea" /></mesh>
      <mesh position={[-0.07, 0.3, 0.2]}><sphereGeometry args={[0.025, 8, 8]} /><meshToonMaterial color="#4f2c33" /></mesh>
      <mesh position={[0.07, 0.3, 0.2]}><sphereGeometry args={[0.025, 8, 8]} /><meshToonMaterial color="#4f2c33" /></mesh>
      <mesh position={[0, 0.23, 0.22]}><sphereGeometry args={[0.028, 8, 8]} /><meshToonMaterial color="#7d4b38" /></mesh>
      <mesh position={[-0.2, 0.54, 0.02]} rotation={[0, 0, 0.55]}><coneGeometry args={[0.1, 0.16, 3]} /><meshToonMaterial color="#ff7eb3" /></mesh>
      <mesh position={[-0.07, 0.54, 0.02]} rotation={[0, 0, -0.55]}><coneGeometry args={[0.1, 0.16, 3]} /><meshToonMaterial color="#ff7eb3" /></mesh>
    </group>
  )
}

function FramedArt() {
  return (
    <group position={[3.0, 1.65, -2.97]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.9, 0.62, 0.06]} /><meshToonMaterial color="#b77ac8" /></mesh>
      <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.72, 0.44, 0.04]} /><meshToonMaterial color="#fff7d7" /></mesh>
      <mesh position={[-0.16, -0.03, 0.08]}><circleGeometry args={[0.12, 16]} /><meshToonMaterial color="#ff94bd" /></mesh>
      <mesh position={[0.13, 0.04, 0.08]}><circleGeometry args={[0.16, 16]} /><meshToonMaterial color="#9bd9ff" /></mesh>
    </group>
  )
}

function keyToDirection(key) {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up'
  if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down'
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left'
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right'
  return null
}

function mergeKeys(a, b) {
  return {
    up: a.up || b.up,
    down: a.down || b.down,
    left: a.left || b.left,
    right: a.right || b.right,
  }
}

const ARCHIVE_TOON_GRADIENT = (() => {
  let texture
  return () => {
    if (texture) return texture
    const data = new Uint8Array([
      45, 45, 45, 255,
      105, 105, 105, 255,
      170, 170, 170, 255,
      225, 225, 225, 255,
      255, 255, 255, 255,
    ])
    texture = new THREE.DataTexture(data, 5, 1, THREE.RGBAFormat)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.needsUpdate = true
    return texture
  }
})()

function collectLimbRefs(root, refs) {
  for (const key of Object.keys(refs)) delete refs[key]
  root.traverse((node) => {
    const name = node.name || ''
    if (name === 'left_shoulder_pivot') refs.leftShoulder = node
    if (name === 'right_shoulder_pivot') refs.rightShoulder = node
    if (name === 'left_elbow_pivot') refs.leftElbow = node
    if (name === 'right_elbow_pivot') refs.rightElbow = node
    if (name === 'left_wrist_pivot') refs.leftWrist = node
    if (name === 'right_wrist_pivot') refs.rightWrist = node
    if (name === 'left_hip_pivot') refs.leftHip = node
    if (name === 'right_hip_pivot') refs.rightHip = node
    if (name === 'left_knee_pivot') refs.leftKnee = node
    if (name === 'right_knee_pivot') refs.rightKnee = node
    if (name === 'left_ankle_pivot') refs.leftAnkle = node
    if (name === 'right_ankle_pivot') refs.rightAnkle = node
  })
}

function animateNamedLimbs(refs, t, moving) {
  const armSwing = moving ? Math.sin(t) * 0.34 : 0
  const legSwing = moving ? Math.sin(t + Math.PI) * 0.3 : 0
  const elbowBend = moving ? 0.08 + Math.max(0, Math.sin(t + Math.PI)) * 0.16 : 0
  const kneeBend = moving ? Math.max(0, Math.sin(t)) * 0.18 : 0
  const settle = moving ? Math.sin(t * 2) * 0.03 : 0

  if (refs.leftShoulder) refs.leftShoulder.rotation.x = armSwing
  if (refs.rightShoulder) refs.rightShoulder.rotation.x = -armSwing
  if (refs.leftHip) refs.leftHip.rotation.x = legSwing
  if (refs.rightHip) refs.rightHip.rotation.x = -legSwing
  if (refs.leftElbow) refs.leftElbow.rotation.x = -elbowBend
  if (refs.rightElbow) refs.rightElbow.rotation.x = -elbowBend
  if (refs.leftKnee) refs.leftKnee.rotation.x = kneeBend
  if (refs.rightKnee) refs.rightKnee.rotation.x = moving ? Math.max(0, Math.sin(t + Math.PI)) * 0.18 : 0
  if (refs.leftWrist) refs.leftWrist.rotation.z = settle
  if (refs.rightWrist) refs.rightWrist.rotation.z = -settle
  if (refs.leftAnkle) refs.leftAnkle.rotation.x = -kneeBend * 0.35
  if (refs.rightAnkle) refs.rightAnkle.rotation.x = (moving ? -Math.max(0, Math.sin(t + Math.PI)) * 0.18 : 0) * 0.35
}

function makeArchiveToonMaterial(source) {
  const material = new THREE.MeshToonMaterial({
    name: source.name,
    color: source.color ? source.color.clone() : new THREE.Color(0xffffff),
    map: source.map || null,
    gradientMap: ARCHIVE_TOON_GRADIENT(),
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    side: source.side ?? THREE.FrontSide,
  })
  if (source.name === 'faceSkin_under_jaw_clean_solid') {
    material.map = null
    material.color.setRGB(0.9310609698295593, 0.6928935647010803, 0.5660545825958252)
  }
  material.depthTest = source.depthTest
  material.depthWrite = source.depthWrite
  material.toneMapped = source.toneMapped
  material.userData.originalMaterialType = source.type
  return material
}

function markSurfaceMaterial(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const material of materials) {
    if (!material) continue
    material.depthTest = true
    material.depthWrite = true
    material.stencilWrite = true
    material.stencilRef = OUTLINE_STENCIL_REF
    material.stencilFunc = THREE.AlwaysStencilFunc
    material.stencilFail = THREE.KeepStencilOp
    material.stencilZFail = THREE.KeepStencilOp
    material.stencilZPass = THREE.ReplaceStencilOp
    material.needsUpdate = true
  }
}

function applyPixelOutlines(root, getSize) {
  const surfaces = []
  root.traverse((node) => {
    if (node.isMesh && !node.userData?.isOutline && !node.name.startsWith('Decal_')) surfaces.push(node)
  })
  for (const surface of surfaces) {
    const geometry = computeWeldedOutlineNormals(surface.geometry.clone())
    const hull = new THREE.Mesh(geometry, makeOutlineMaterial(getSize))
    hull.name = `__outline_${surface.name}`
    hull.renderOrder = 91
    hull.frustumCulled = false
    hull.userData.isOutline = true
    surface.renderOrder = 90
    surface.add(hull)
  }
}

function computeWeldedOutlineNormals(geometry) {
  const position = geometry.attributes.position
  let normal = geometry.attributes.normal
  if (!normal) {
    geometry.computeVertexNormals()
    normal = geometry.attributes.normal
  }
  const sums = new Map()
  const keyFor = (i) => `${Math.round(position.getX(i) / 1e-5)},${Math.round(position.getY(i) / 1e-5)},${Math.round(position.getZ(i) / 1e-5)}`
  for (let i = 0; i < position.count; i += 1) {
    const key = keyFor(i)
    const entry = sums.get(key) || [0, 0, 0, 0]
    entry[0] += normal.getX(i)
    entry[1] += normal.getY(i)
    entry[2] += normal.getZ(i)
    entry[3] += 1
    sums.set(key, entry)
  }
  const outlineNormals = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i += 1) {
    const entry = sums.get(keyFor(i))
    let x = entry[0]
    let y = entry[1]
    let z = entry[2]
    let length = Math.hypot(x, y, z)
    if (length < 1e-8) {
      x = normal.getX(i)
      y = normal.getY(i)
      z = normal.getZ(i)
      length = Math.hypot(x, y, z) || 1
    }
    outlineNormals[i * 3] = x / length
    outlineNormals[i * 3 + 1] = y / length
    outlineNormals[i * 3 + 2] = z / length
  }
  geometry.setAttribute('outlineNormal', new THREE.BufferAttribute(outlineNormals, 3))
  return geometry
}

export function updateOutlineUniforms(root, size) {
  if (!root) return
  root.traverse((node) => {
    if (!node.userData?.isOutline) return
    const uniforms = node.material?.userData?.outlineUniforms
    if (!uniforms) return
    uniforms.outlineWidthPx.value = OUTLINE_WIDTH_PX
    const viewport = getRosariOutlineViewport(size)
    uniforms.outlineViewport.value.set(viewport.width, viewport.height)
  })
}

export const ROSARI_OUTLINE_WIDTH_CSS_PX = OUTLINE_WIDTH_PX

export function getRosariOutlineViewport(size) {
  return {
    width: Number.isFinite(size?.width) && size.width > 0 ? size.width : 1,
    height: Number.isFinite(size?.height) && size.height > 0 ? size.height : 1,
  }
}

export function calculateRosariOutlineClipOffset({ direction, outlineWidthPx, viewport, clipW }) {
  const length = Math.hypot(direction.x, direction.y) || 1
  return {
    x: direction.x / length * (2 * outlineWidthPx / viewport.width) * clipW,
    y: direction.y / length * (2 * outlineWidthPx / viewport.height) * clipW,
  }
}

export function makeOutlineMaterial(getSize = () => null) {
  const material = new THREE.MeshBasicMaterial({
    color: OUTLINE_COLOR,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.96,
    depthTest: true,
    depthWrite: false,
  })
  material.stencilWrite = true
  material.stencilRef = OUTLINE_STENCIL_REF
  material.stencilFunc = THREE.NotEqualStencilFunc
  material.stencilFail = THREE.KeepStencilOp
  material.stencilZFail = THREE.KeepStencilOp
  material.stencilZPass = THREE.KeepStencilOp
  material.onBeforeCompile = (shader) => {
    const rawSize = getSize()
    const viewport = getRosariOutlineViewport(rawSize?.isVector2 ? { width: rawSize.x, height: rawSize.y } : rawSize)
    shader.uniforms.outlineWidthPx = { value: OUTLINE_WIDTH_PX }
    shader.uniforms.outlineViewport = { value: new THREE.Vector2(viewport.width, viewport.height) }
    material.userData.outlineUniforms = shader.uniforms
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 outlineNormal;\nuniform float outlineWidthPx;\nuniform vec2 outlineViewport;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 outlineClipBase = gl_Position;
        vec3 outlineViewNormal = normalize( normalMatrix * outlineNormal );
        vec4 outlineClipNormal = projectionMatrix * vec4( mvPosition.xyz + outlineViewNormal, 1.0 );
        vec2 outlineBaseNdc = outlineClipBase.xy / max( abs(outlineClipBase.w), 1e-6 );
        vec2 outlineNormalNdc = outlineClipNormal.xy / max( abs(outlineClipNormal.w), 1e-6 );
        vec2 outlineDirPx = ( outlineNormalNdc - outlineBaseNdc ) * outlineViewport;
        float outlineLen = length( outlineDirPx );
        if( outlineLen < 1e-5 ) outlineDirPx = outlineViewNormal.xy * outlineViewport;
        outlineLen = length( outlineDirPx );
        if( outlineLen > 1e-5 ) {
          vec2 outlineDir = outlineDirPx / outlineLen;
          gl_Position.xy += outlineDir * ( 2.0 * outlineWidthPx / outlineViewport ) * gl_Position.w;
        }`)
  }
  material.customProgramCacheKey = () => 'rosari-room-screen-space-pixel-outline-2px-css-dpr'
  return material
}

useGLTF.preload(ROSARI_GLB_URL)

const panel = {
  border: '3px solid #8a4a73',
  borderRadius: 18,
  background: 'rgba(255,247,230,0.9)',
  boxShadow: '0 10px 0 rgba(85,45,75,0.22), 0 18px 32px rgba(70,35,72,0.25)',
}

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    gap: 6,
    padding: 'max(8px, env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px))',
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #ffe8f2 0%, #fff5de 54%, #eadfff 100%)',
    color: '#5f2d58',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    touchAction: 'pan-y',
    userSelect: 'none',
  },
  header: {
    gridColumn: '1 / -1',
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  backButton: {
    minHeight: 44,
    minWidth: 76,
    padding: '8px 12px',
    border: '3px solid #7c416e',
    borderRadius: 999,
    background: '#fff3cd',
    color: '#5f2d58',
    fontWeight: 900,
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
  },
  titleBlock: { ...panel, flex: 1, minWidth: 0, padding: 6, boxSizing: 'border-box' },
  title: { margin: 0, fontSize: 20, lineHeight: 1.15, fontWeight: 1000, overflowWrap: 'anywhere' },
  subtitle: { margin: '4px 0 0', fontSize: 11, lineHeight: 1.22, fontWeight: 800, overflowWrap: 'anywhere' },
  stage: { ...panel, position: 'relative', minHeight: 0, minWidth: 0, overflow: 'hidden', borderRadius: 18 },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' },
  bottomHud: {
    zIndex: 3,
    display: 'grid',
    gridTemplateColumns: '106px minmax(0, 1fr)',
    alignItems: 'end',
    gap: 6,
    minWidth: 0,
  },
  controlPanel: { ...panel, width: 'fit-content', display: 'grid', gridTemplateColumns: 'repeat(2, 44px)', justifyItems: 'center', gap: 4, padding: 6, touchAction: 'none', userSelect: 'none', boxSizing: 'border-box' },
  padButton: { width: 44, minWidth: 44, height: 44, minHeight: 44, border: '2px solid #894d82', borderRadius: 12, background: '#ffd4e4', color: '#67315c', fontWeight: 1000, cursor: 'pointer', touchAction: 'none', userSelect: 'none' },
  actionPanel: { ...panel, justifySelf: 'stretch', padding: 4, minWidth: 0, boxSizing: 'border-box', overflowWrap: 'anywhere' },
  hint: { margin: '0 0 4px', fontSize: 11, fontWeight: 900, lineHeight: 1.25 },
  wardrobeButton: { width: '100%', minHeight: 44, border: '3px solid #7c416e', borderRadius: 14, background: '#ffacd0', color: '#4e2449', fontWeight: 1000, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' },
  wardrobeButtonDisabled: { width: '100%', minHeight: 44, border: '3px solid #b991ab', borderRadius: 14, background: '#eadfe7', color: '#8b7286', fontWeight: 900, cursor: 'not-allowed', touchAction: 'manipulation', userSelect: 'none' },
  wardrobePanel: { ...panel, position: 'absolute', zIndex: 4, top: 4, right: 4, width: 'min(292px, calc(100% - 8px))', maxHeight: 'calc(100% - 8px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 6, touchAction: 'pan-y' },
  wardrobeBody: { minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain', overflowWrap: 'anywhere' },
  wardrobeHeader: { display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  wardrobeTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 1000 },
  wardrobeCloseButton: { minWidth: 44, minHeight: 44, flexShrink: 0, border: '3px solid #7c416e', borderRadius: 999, background: '#fff3cd', color: '#4e2449', fontSize: 24, fontWeight: 1000, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' },
  currentOutfit: { padding: 10, border: '2px solid #8a4a73', borderRadius: 12, background: '#fff3fa', fontWeight: 1000 },
  emptyOutfit: { margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, fontWeight: 800 },
}

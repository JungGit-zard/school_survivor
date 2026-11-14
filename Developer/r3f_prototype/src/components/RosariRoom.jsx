import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useStore, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  ROSARI_ROOM_FURNITURE,
  capRosariFrameDelta,
  isNearRosariRadio,
  isRosariNearWardrobe,
  isRosariTextEntryTarget,
  moveRosariRoomPosition,
  resolveRosariMoveVector,
} from '../lib/rosariRoom.js'
import { buildRosariBedroom } from '../lib/rosariBedroomMesh.js'
import { ROSARI_FOLLOW_TARGET_Y, clampRosariFollowTarget, getRosariCameraLayout } from '../lib/rosariRoomCamera.js'
import RosariRadioPanel, { RosariRadioButton } from './RosariRadioPanel.jsx'
import { roomRadio } from '../lib/roomRadio.js'
import { DEFAULT_ROSARI_OUTFIT_ID, applyRosariOutfit, resolveRosariOutfit } from '../lib/rosariOutfits.js'
import { loadPlayerOutfit, savePlayerOutfit } from '../lib/titleSettings.js'
import { getOwnedOutfitIds } from '../lib/outfitUnlocks.js'
import { t as translate, useT } from '../lib/i18n.js'
import RosariWardrobeBody, { OutfitFeatureTable, OutfitTableButton, WardrobeAngleControls } from './RosariWardrobePanel.jsx'
import { joystickDir } from '../lib/refs.js'
import { emitUiSfx } from '../lib/uiSfx.js'
import VirtualJoystick from './VirtualJoystick.jsx'

const ROSARI_GLB_URL = '/assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb'
const rosariLoadErrors = new WeakSet()
const OUTLINE_STENCIL_REF = 3
const OUTLINE_WIDTH_PX = 2
const OUTLINE_COLOR = 0x050209
const MOVE_SPEED = 1.85
const EMPTY_KEYS = Object.freeze({ up: false, down: false, left: false, right: false })
// Rosari's soles sit on the floor top (y 0.01), not 1 cm inside it.
const ROSARI_FLOOR_Y = 0.012
export { getRosariCameraLayout }
// Wardrobe view mode: Rosari turns on the spot (yaw only) in front of a fixed close-up camera.
// 0 = facing the camera. Positive yaw turns her front toward screen right, same as a rightward drag.
export const ROSARI_VIEW_ANGLES = Object.freeze({ front: 0, threeQuarter: Math.PI / 4, side: Math.PI / 2, back: Math.PI })
export const ROSARI_VIEW_KEY_STEP = Math.PI / 12
export const ROSARI_VIEW_DRAG_RAD_PER_PX = 0.012

export default function RosariRoom({ onBack }) {
  const t = useT()
  const [wardrobeOpen, setWardrobeOpen] = useState(false)
  // Outfit feature table (의상 능력표), opened from inside the wardrobe.
  const [featureTableOpen, setFeatureTableOpen] = useState(false)
  const featureTableButtonRef = useRef(null)
  // Wardrobe choice is titleSettings.playerOutfit: account cloud save when signed in and hydrated,
  // this tab's guest session memory otherwise. Separate axis from playerAppearance.
  // A saved outfit that is not owned (yet) shows as the school uniform, same as the run start.
  const [outfitId, setOutfitId] = useState(() => {
    const saved = loadPlayerOutfit()
    return getOwnedOutfitIds().has(saved) ? saved : DEFAULT_ROSARI_OUTFIT_ID
  })
  const [outfitSaveFailed, setOutfitSaveFailed] = useState(false)
  const outfitSaveSeq = useRef(0)
  const currentOutfit = resolveRosariOutfit(outfitId)
  const selectOutfit = (nextId) => {
    if (nextId === currentOutfit.id) return
    const previous = currentOutfit.id
    const seq = ++outfitSaveSeq.current
    setOutfitId(nextId)
    setOutfitSaveFailed(false)
    void savePlayerOutfit(nextId).then((saved) => {
      if (saved || seq !== outfitSaveSeq.current) return
      setOutfitId(previous)
      setOutfitSaveFailed(true)
    })
  }
  const [nearWardrobe, setNearWardrobe] = useState(false)
  // Room radio (music logic + panel live in roomRadio.js / RosariRadioPanel.jsx).
  const [radioOpen, setRadioOpen] = useState(false)
  const [nearRadio, setNearRadio] = useState(false)
  const radioButtonRef = useRef(null)
  // Leaving the room always hands the music back to the room/lobby track.
  useEffect(() => () => { roomRadio.stop() }, [])
  // Walking away closes only the panel; the song keeps playing.
  // Walking up to the radio opens the music panel; walking away closes it.
  useEffect(() => { setRadioOpen(nearRadio) }, [nearRadio])
  // The wardrobe and the radio panel share the same screen area: one at a time.
  useEffect(() => { if (wardrobeOpen) setRadioOpen(false) }, [wardrobeOpen])
  useEffect(() => { if (radioOpen) setWardrobeOpen(false) }, [radioOpen])
  const [overview, setOverview] = useState(false)
  const [pressedKeys, setPressedKeys] = useState(EMPTY_KEYS)
  const mobileKeysRef = useRef({ ...EMPTY_KEYS })
  const keyboardKeysRef = useRef({ ...EMPTY_KEYS })
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const wardrobeButtonRef = useRef(null)
  const heldKeyboard = useRef(new Map())
  const wasWardrobeOpen = useRef(false)
  const heldPointers = useRef(new Map())
  const padKeyboard = useRef(new Map())
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 })
  const layout = getRosariRoomLayout(roomSize)
  // Wardrobe view mode yaw target. A ref, not state: a drag updates it every pointermove and the
  // scene reads it per frame, so the room does not re-render on every pixel.
  const viewYawRef = useRef(0)
  const [viewAngle, setViewAngle] = useState('front')
  const viewDragRef = useRef(null)
  const rotateView = useCallback((amount) => {
    viewYawRef.current += amount
    setViewAngle(null)
  }, [])
  const chooseViewAngle = useCallback((name) => {
    viewYawRef.current = nearestRosariYaw(viewYawRef.current, ROSARI_VIEW_ANGLES[name])
    setViewAngle(name)
  }, [])

  useEffect(() => {
    if (wasWardrobeOpen.current && !wardrobeOpen) {
      setFeatureTableOpen(false)
      // Every opening starts from the front view.
      viewYawRef.current = 0
      viewDragRef.current = null
      setViewAngle('front')
      wardrobeButtonRef.current?.focus()
    }
    wasWardrobeOpen.current = wardrobeOpen
  }, [wardrobeOpen])

  const closeFeatureTable = useCallback(() => {
    setFeatureTableOpen(false)
    // Return focus to the device that opened the table.
    setTimeout(() => featureTableButtonRef.current?.focus(), 0)
  }, [])

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
      // Typing in a text field must never walk Rosari (keyup still releases a held key).
      if (pressed && isRosariTextEntryTarget(event.target)) return
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
        if (event.repeat) return
        if (featureTableOpen) closeFeatureTable()
        else if (wardrobeOpen) setWardrobeOpen(false)
        else if (radioOpen) setRadioOpen(false)
        else onBack?.()
        return
      }
      // While the wardrobe is open, the left/right arrows turn Rosari instead of walking her.
      const viewStep = wardrobeOpen && !featureTableOpen ? rosariViewKeyStep(event) : 0
      if (viewStep) {
        rotateView(viewStep)
        event.preventDefault()
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
  }, [onBack, wardrobeOpen, radioOpen, featureTableOpen, closeFeatureTable, rotateView])

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
    for (const key of padKeyboard.current.values()) next[key] = true
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
        padKeyboard.current.set(event.code || event.key, key)
        refreshMobileKeys()
      },
      onKeyUp: (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.preventDefault()
        padKeyboard.current.delete(event.code || event.key)
        refreshMobileKeys()
      },
      onBlur: clearMobileKeys,
    }
  }, [clearMobileKeys, refreshMobileKeys, wardrobeOpen, pressedKeys])
  const canUseWardrobeButton = canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe })
  const bottomSheet = layout.wardrobeSheet === 'bottom'
  const endViewDrag = (event) => {
    if (viewDragRef.current?.id !== event.pointerId) return
    viewDragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <main ref={rootRef} style={{ ...styles.root, gridTemplateColumns: layout.sideRail ? 'minmax(0, 1fr) 158px' : 'minmax(0, 1fr)', gridTemplateRows: layout.sideRail ? 'auto minmax(0, 1fr)' : styles.root.gridTemplateRows }} aria-label={t('rosariRoom.title')}>
      <div style={styles.header}>
        <button type="button" data-ui-sfx="close" style={styles.backButton} onClick={onBack}>{t('rosariRoom.back')}</button>
        <div style={styles.titleBlock}>
          <h1 style={{ ...styles.title, ...(layout.compact ? { fontSize: 16 } : {}) }}>{t('rosariRoom.title')}</h1>
          <p hidden={layout.compact} style={styles.subtitle}>{t('rosariRoom.subtitle')}</p>
        </div>
      </div>
      <section ref={stageRef} style={styles.stage} aria-label={t('rosariRoom.sceneAria')}>
        <RoomErrorBoundary>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, stencil: true, alpha: false }}
          camera={{ position: [0, 0, 1], fov: 50 }}
          style={styles.canvas}
        >
          <Suspense fallback={<Html center><div role="status" style={{ ...panel, padding: 12, width: 140, color: '#5f2d58' }}>{t('rosariRoom.loading')}</div></Html>}>
            <RoomScene
              overview={overview}
              keyboardKeysRef={keyboardKeysRef}
              mobileKeysRef={mobileKeysRef}
              wardrobeOpen={wardrobeOpen}
              wardrobeSheet={layout.wardrobeSheet}
              viewYawRef={viewYawRef}
              outfitId={currentOutfit.id}
              onNearWardrobeChange={setNearWardrobe}
              onNearRadioChange={setNearRadio}
              onWardrobeToggle={() => setWardrobeOpen((open) => !open)}
            />
          </Suspense>
        </Canvas>
        </RoomErrorBoundary>
        {/* Same floating joystick as gameplay: touch the 3D scene anywhere and drag. */}
        <VirtualJoystick enabled={!wardrobeOpen} phase="playing" playAreaRef={stageRef} />
        {!wardrobeOpen && <button type="button" aria-pressed={overview} style={styles.cameraButton} onClick={() => setOverview((value) => !value)}>{t(overview ? 'rosariRoom.followCamera' : 'rosariRoom.overviewCamera')}</button>}
        {wardrobeOpen && (
          // Drag/swipe anywhere on the scene to turn Rosari. Pointer-only; the angle buttons and the
          // arrow keys are the keyboard/screen-reader route, so this layer stays out of the a11y tree.
          <div
            aria-hidden="true"
            data-wardrobe-rotate-surface
            style={styles.rotateSurface}
            onPointerDown={(event) => {
              if (event.button !== 0 || viewDragRef.current) return
              event.preventDefault()
              viewDragRef.current = { id: event.pointerId, x: event.clientX }
              event.currentTarget.setPointerCapture?.(event.pointerId)
            }}
            onPointerMove={(event) => {
              const drag = viewDragRef.current
              if (!drag || drag.id !== event.pointerId) return
              const dx = event.clientX - drag.x
              drag.x = event.clientX
              if (dx !== 0) rotateView(dx * ROSARI_VIEW_DRAG_RAD_PER_PX)
            }}
            onPointerUp={endViewDrag}
            onPointerCancel={endViewDrag}
            onLostPointerCapture={endViewDrag}
          />
        )}
        <RosariRadioPanel open={radioOpen} onClose={() => { setRadioOpen(false); radioButtonRef.current?.focus() }} sheet={layout.wardrobeSheet} />
        {wardrobeOpen && (
          <WardrobeAngleControls
            active={viewAngle}
            onChoose={chooseViewAngle}
            style={bottomSheet ? styles.angleBarTop : styles.angleBarSide}
          />
        )}
        {wardrobeOpen && (
          <section
            role="dialog"
            aria-modal="false"
            aria-label={t('outfit.wardrobe.dialogAria')}
            data-wardrobe-sheet={layout.wardrobeSheet}
            style={bottomSheet ? styles.wardrobeSheet : styles.wardrobePanel}
            onKeyDown={(event) => {
              const step = rosariViewKeyStep(event)
              if (step) {
                rotateView(step)
                event.preventDefault()
              }
              if (event.key !== 'Escape') event.stopPropagation()
            }}
          >
            <div style={styles.wardrobeHeader}>
              <h2 style={styles.wardrobeTitle}>{t('outfit.wardrobe.title')}</h2>
              <div style={styles.wardrobeHeaderActions}>
                <OutfitTableButton buttonRef={featureTableButtonRef} onOpen={() => setFeatureTableOpen(true)} />
                <button autoFocus type="button" aria-label={t('outfit.wardrobe.closeAria')} style={styles.wardrobeCloseButton} onClick={() => setWardrobeOpen(false)}>×</button>
              </div>
            </div>
            <div data-wardrobe-scroll style={styles.wardrobeBody}>
              <RosariWardrobeBody
                currentOutfitId={currentOutfit.id}
                onSelect={selectOutfit}
                saveFailed={outfitSaveFailed}
              />
            </div>
          </section>
        )}
      </section>
      <div style={{ ...styles.bottomHud, gridTemplateColumns: layout.sideRail ? 'minmax(0, 1fr)' : styles.bottomHud.gridTemplateColumns, alignContent: layout.sideRail ? 'space-between' : 'end' }}>
        <div style={styles.controlPanel} aria-label={t('rosariRoom.moveControlsAria')}>
          <PadButton direction="up" style={styles.padButton} handlers={makePadHandlers('up')}>▲</PadButton>
          <PadButton direction="down" style={styles.padButton} handlers={makePadHandlers('down')}>▼</PadButton>
          <PadButton direction="left" style={styles.padButton} handlers={makePadHandlers('left')}>◀</PadButton>
          <PadButton direction="right" style={styles.padButton} handlers={makePadHandlers('right')}>▶</PadButton>
        </div>
        <div style={styles.actionPanel}>
          <p style={styles.hint} title={t('rosariRoom.hintTitle')}>{t(nearRadio && !nearWardrobe ? 'roomRadio.hintNear' : nearWardrobe ? 'rosariRoom.hintNear' : 'rosariRoom.hintFar')}{!layout.compact && <><br />{t('rosariRoom.hintKeys')}</>}</p>
          <button
            ref={wardrobeButtonRef}
            type="button"
            style={canUseWardrobeButton ? styles.wardrobeButton : styles.wardrobeButtonDisabled}
            disabled={!canUseWardrobeButton}
            aria-expanded={wardrobeOpen}
            onClick={() => { if (canUseWardrobeButton) setWardrobeOpen((open) => !open) }}
          >
            {t(wardrobeOpen ? 'rosariRoom.wardrobeClose' : 'rosariRoom.wardrobeOpen')}
          </button>
          <div style={styles.radioButtonSlot}>
            <RosariRadioButton near={nearRadio} open={radioOpen} buttonRef={radioButtonRef} onToggle={() => { if (radioOpen || nearRadio) setRadioOpen((open) => !open) }} />
          </div>
        </div>
      </div>
      {wardrobeOpen && featureTableOpen && <OutfitFeatureTable onClose={closeFeatureTable} />}
    </main>
  )
}

export class RoomErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError(error) { return { failed: true, error } }
  render() {
    if (this.state.failed) return (
      <div role="alert" style={{ padding: 12, overflowY: 'auto', maxHeight: '100%', boxSizing: 'border-box' }}>
        <p>{translate('rosariRoom.loadFailed')}</p>
        <button type="button" style={styles.backButton} onClick={() => {
          // Evict only a rejected room load, never a successful shared loader entry.
          if (this.state.error && rosariLoadErrors.has(this.state.error)) useGLTF.clear(ROSARI_GLB_URL)
          this.setState({ failed: false, error: null })
        }}>{translate('common.retry')}</button>
      </div>
    )
    return this.props.children
  }
}

function PadButton({ direction, style, handlers, children }) {
  const t = useT()
  const label = t(`rosariRoom.dir.${direction}`, null, direction)
  return (
    <button type="button" data-ui-sfx="none" style={{ ...style, ...(handlers['aria-pressed'] ? { background: '#b94f85', color: '#fff', boxShadow: 'inset 0 2px 4px #67315c' } : {}), ...(handlers.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }} aria-label={t('rosariRoom.moveAria', { direction: label })} {...handlers}>
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
    // Portrait (or narrow) rooms put the outfit list in a bottom sheet so Rosari stays visible above it.
    wardrobeSheet: size.height > size.width || size.width < 560 ? 'bottom' : 'side',
  }
}

// Shortest-way target: the preset angle's equivalent closest to the current yaw.
export function nearestRosariYaw(current, preset) {
  const turn = Math.PI * 2
  return preset + Math.round((current - preset) / turn) * turn
}

export function rosariViewKeyStep(event) {
  if (isRosariTextEntryTarget(event.target)) return 0
  if (event.key === 'ArrowRight') return ROSARI_VIEW_KEY_STEP
  if (event.key === 'ArrowLeft') return -ROSARI_VIEW_KEY_STEP
  return 0
}

// Stage pixels the wardrobe UI covers in view mode. Mirrors styles.wardrobeSheet / wardrobePanel and
// the angle bar: bottom sheet at most 40% (+ gap); side panel min(292px, 100% - 8px) (+ gap).
export const ROSARI_VIEW_ANGLE_BAR_PX = 76
export function getRosariWardrobeViewInsets(size, sheet) {
  const { width, height } = getRosariOutlineViewport(size)
  return {
    top: Math.min(ROSARI_VIEW_ANGLE_BAR_PX, height * 0.2),
    right: sheet === 'side' ? Math.min(292, width - 8) + 8 : 0,
    bottom: sheet === 'bottom' ? height * 0.4 + 8 : 0,
    left: 0,
  }
}

// Close-up full-body framing of Rosari, centred in the part of the stage the wardrobe UI leaves free.
// The view offset slides the projection centre into that free area; the near plane sits just in front
// of her so furniture between the camera and Rosari can never hide her.
export function getRosariWardrobeViewLayout(size, { position = { x: 0, z: 0.65 }, sheet = 'side' } = {}) {
  const { width, height } = getRosariOutlineViewport(size)
  const insets = getRosariWardrobeViewInsets(size, sheet)
  const visibleWidth = Math.max(1, width - insets.left - insets.right)
  const visibleHeight = Math.max(1, height - insets.top - insets.bottom)
  const fov = 38
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  // Body is 1.32 tall and hats/hoods rise above it: fit 1.6 into ~88% of the free height, and
  // ~1.0 (arms, any yaw) into ~85% of the free width.
  const byHeight = (1.6 / 0.88) * height / (visibleHeight * 2 * tanY)
  const byWidth = (1.0 / 0.85) * width / (visibleWidth * 2 * tanY * (width / height))
  const distance = Math.max(1.6, Math.min(12, Math.max(byHeight, byWidth)))
  const target = new THREE.Vector3(position.x, 0.72, position.z)
  const direction = new THREE.Vector3(0, 0.2, 1).normalize()
  const centerX = insets.left + visibleWidth / 2
  const centerY = insets.top + visibleHeight / 2
  return {
    position: target.clone().addScaledVector(direction, distance).toArray(),
    target: target.toArray(),
    fov,
    near: Math.max(0.1, distance - 0.9),
    viewOffset: { fullWidth: width, fullHeight: height, x: width / 2 - centerX, y: height / 2 - centerY, width, height },
  }
}

// Enter view mode on a live camera; the returned function puts back the exact previous camera.
export function enterRosariWardrobeView(camera, layout) {
  const snapshot = {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    fov: camera.fov,
    near: camera.near,
    view: camera.view ? { ...camera.view } : null,
  }
  camera.position.set(...layout.position)
  camera.fov = layout.fov
  camera.near = layout.near
  const offset = layout.viewOffset
  camera.setViewOffset(offset.fullWidth, offset.fullHeight, offset.x, offset.y, offset.width, offset.height)
  camera.lookAt(...layout.target)
  camera.updateProjectionMatrix()
  return () => {
    camera.position.copy(snapshot.position)
    camera.quaternion.copy(snapshot.quaternion)
    camera.fov = snapshot.fov
    camera.near = snapshot.near
    if (snapshot.view?.enabled) {
      const v = snapshot.view
      camera.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height)
    } else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }
}

// Per-frame facing in view mode. The first open frame remembers Rosari's facing; while open her yaw
// eases toward the target; the first closed frame puts the remembered facing back exactly.
export function updateRosariViewFacing(root, state, { wardrobeOpen, targetYaw, delta }) {
  if (!root) return
  if (wardrobeOpen) {
    if (state.savedFacing === null) {
      state.savedFacing = root.rotation.y
      // Start from her current facing (the equivalent next to the target) so she turns to the camera.
      state.displayYaw = nearestRosariYaw(targetYaw, root.rotation.y)
    }
    state.displayYaw += (targetYaw - state.displayYaw) * (1 - Math.exp(-delta * 10))
    if (Math.abs(targetYaw - state.displayYaw) < 1e-4) state.displayYaw = targetYaw
    root.rotation.y = state.displayYaw
  } else if (state.savedFacing !== null) {
    root.rotation.y = state.savedFacing
    state.savedFacing = null
    state.displayYaw = 0
  }
}

function RoomScene({ keyboardKeysRef, mobileKeysRef, wardrobeOpen, wardrobeSheet = 'side', viewYawRef, overview, outfitId, onNearWardrobeChange, onNearRadioChange, onWardrobeToggle }) {
  const characterRef = useRef(null)
  const positionRef = useRef({ x: 0, z: 0.65 })
  const walkTimeRef = useRef(0)
  const limbRefs = useRef({})
  const lastNearWardrobeRef = useRef(false)
  const lastNearRadioRef = useRef(false)
  const blobRef = useRef(null)
  const followRef = useRef(null)
  const followAimRef = useRef({ x: NaN, z: NaN })
  const followScratch = useRef({ x: 0, z: 0 })
  const canToggleWardrobeRef = useRef(false)
  const moveVectorRef = useRef({ x: 0, z: 0 })
  const viewFacingRef = useRef({ savedFacing: null, displayYaw: 0 })
  const { camera, size } = useThree()

  // ponytail: dev-only QA handle. rosari-room-visual-qa.js calls window.rosariThree.getState();
  // it needs the live store, not an onCreated RootState snapshot, or its later calls read stale state.
  const devQaStore = useStore()
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.rosariThree = devQaStore
    return () => { delete window.rosariThree }
  }, [devQaStore])

  useEffect(() => {
    const layout = getRosariCameraLayout(size, { overview, position: positionRef.current })
    camera.position.set(...layout.position)
    camera.fov = layout.fov
    camera.updateProjectionMatrix()
    camera.lookAt(...layout.target)
    followRef.current = layout.follow ?? null
    followAimRef.current = { x: layout.target[0], z: layout.target[2] }
  }, [camera, size.height, size.width, overview])

  // Wardrobe view mode camera. Declared after the room camera effect: on a resize while open, React
  // runs this cleanup (restore), then the room layout for the new size, then a fresh snapshot here.
  useEffect(() => {
    if (!wardrobeOpen) return undefined
    const layout = getRosariWardrobeViewLayout(size, { position: positionRef.current, sheet: wardrobeSheet })
    return enterRosariWardrobeView(camera, layout)
  }, [camera, size.height, size.width, wardrobeOpen, wardrobeSheet])

  useFrame((_, rawDelta) => {
    const delta = capRosariFrameDelta(rawDelta)
    const keyboard = keyboardKeysRef.current
    const pad = mobileKeysRef.current
    const vector = wardrobeOpen
      ? resolveRosariMoveVector(EMPTY_KEYS, null, moveVectorRef.current)
      : resolveRosariMoveVector(
        mergeKeysInto(MERGED_KEYS, keyboard, pad),
        joystickDir,
        moveVectorRef.current,
      )
    const moving = vector.x !== 0 || vector.z !== 0
    if (moving) {
      positionRef.current = moveRosariRoomPosition(positionRef.current, {
        x: vector.x * MOVE_SPEED * delta,
        z: vector.z * MOVE_SPEED * delta,
      })
      walkTimeRef.current += delta * 8
    }
    const root = characterRef.current
    const follow = followRef.current
    if (!overview && !wardrobeOpen && follow) {
      // Translation-only follow keeps the orientation set on resize. The aim is clamped so the view
      // stays inside the room; the camera moves only when the aim does (an idle frame leaves it be).
      const aim = clampRosariFollowTarget(follow, positionRef.current, followScratch.current)
      const last = followAimRef.current
      if (Math.abs(aim.x - last.x) > 1e-6 || Math.abs(aim.z - last.z) > 1e-6) {
        camera.position.set(aim.x + follow.offset.x, ROSARI_FOLLOW_TARGET_Y + follow.offset.y, aim.z + follow.offset.z)
        last.x = aim.x
        last.z = aim.z
      }
    }
    const blob = blobRef.current
    if (blob) {
      blob.position.x = positionRef.current.x
      blob.position.z = positionRef.current.z
    }
    if (root) {
      root.position.set(positionRef.current.x, ROSARI_FLOOR_Y + (moving ? Math.sin(walkTimeRef.current * 2) * 0.015 : 0), positionRef.current.z)
      if (moving) root.rotation.y = Math.atan2(vector.x, vector.z)
      animateNamedLimbs(limbRefs.current, moving ? walkTimeRef.current : 0, moving)
    }
    updateRosariViewFacing(root, viewFacingRef.current, { wardrobeOpen, targetYaw: viewYawRef?.current ?? 0, delta })
    updateOutlineUniforms(root, size)
    const nearRadio = isNearRosariRadio(positionRef.current)
    if (nearRadio !== lastNearRadioRef.current) {
      lastNearRadioRef.current = nearRadio
      onNearRadioChange?.(nearRadio)
    }
    const nearWardrobe = isRosariNearWardrobe(positionRef.current)
    canToggleWardrobeRef.current = canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe })
    if (nearWardrobe !== lastNearWardrobeRef.current) {
      lastNearWardrobeRef.current = nearWardrobe
      onNearWardrobeChange(nearWardrobe)
    }
  })

  return (
    <>
      <color attach="background" args={[wardrobeOpen ? '#ffe7ef' : '#f4e2ef']} />
      {/* Same key light direction and fill Rosari always had; the warm point light (floor banding) is
          gone. The room itself is unlit / vertex-coloured toon and not tone-mapped, so it keeps its colours. */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[-2.5, 5.5, 3.5]} intensity={2.15} />
      <RosariBedroom wardrobeOpen={wardrobeOpen} canToggleWardrobeRef={canToggleWardrobeRef} onWardrobeToggle={onWardrobeToggle} />
      {/* Fake contact shadow under Rosari (no shadow map). */}
      <mesh ref={blobRef} position={[0, 0.021, 0.65]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]} renderOrder={2}>
        <circleGeometry args={[0.3, 20]} />
        <meshBasicMaterial color="#4a2142" transparent opacity={0.26} depthWrite={false} toneMapped={false} />
      </mesh>
      <RosariModel refObject={characterRef} limbRefs={limbRefs} outfitId={outfitId} />
    </>
  )
}

export function RosariModel({ refObject, limbRefs, outfitId = DEFAULT_ROSARI_OUTFIT_ID }) {
  let gltf
  try { gltf = useGLTF(ROSARI_GLB_URL) }
  catch (error) {
    if (error && typeof error === 'object' && typeof error.then !== 'function') rosariLoadErrors.add(error)
    throw error
  }
  const { gl } = useThree()
  const [container] = useState(() => new THREE.Group())
  // Each committed setup owns a fresh clone, including R3F StrictMode replay.
  // The resource-free primitive boundary keeps R3F from dismantling the clone
  // before passive cleanup can release its materials/hulls on true unmount.
  useEffect(() => mountRosariModel(container, gltf.scene, limbRefs.current, gl, outfitId), [container, gltf.scene, limbRefs, gl, outfitId])
  return <group ref={refObject} position={[0, ROSARI_FLOOR_Y, 0.65]}><primitive object={container} /></group>
}

export function mountRosariModel(parent, source, limbs, gl, outfitId = DEFAULT_ROSARI_OUTFIT_ID) {
  const cloned = source.clone(true)
  cloned.traverse((node) => {
    if (!node.isMesh) return
    if (node.material) node.material = Array.isArray(node.material)
      ? node.material.map((mat) => makeArchiveToonMaterial(mat))
      : makeArchiveToonMaterial(node.material)
    markSurfaceMaterial(node)
  })
  // Outfit recolors only this clone's fresh materials; accessories are room-owned meshes
  // that go through the same stencil/outline/dispose path as the GLB surfaces.
  for (const accessory of applyRosariOutfit(cloned, outfitId, makeOutfitAccessoryMaterial)) {
    markSurfaceMaterial(accessory)
  }
  applyPixelOutlines(cloned, () => gl.getSize(new THREE.Vector2()))
  collectLimbRefs(cloned, limbs)
  const bounds = measureRosariBodyBounds(cloned)
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

// The approved room scale is fitted to the character's body. Outfit details (a hood or a
// mortarboard rises above the bob) and their outline hulls are left out, so changing clothes
// never resizes the character. Same per-mesh geometry boxes Box3.setFromObject would use.
function measureRosariBodyBounds(root) {
  const bounds = new THREE.Box3()
  const box = new THREE.Box3()
  root.updateWorldMatrix(true, true)
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return
    if (node.userData?.ownedGeometry || node.parent?.userData?.ownedGeometry) return
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox()
    bounds.union(box.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld))
  })
  return bounds
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
    if ((node.userData?.isOutline || node.userData?.ownedGeometry) && node.geometry) outlineGeometries.add(node.geometry)
  })
  for (const geometry of outlineGeometries) geometry.dispose()
  for (const material of materials) material.dispose()
}

// The room is built once from rosariBedroomMesh.js: 4 merged meshes (toon, unlit, contact shadows,
// outline hulls). Room surfaces never write the stencil: Rosari's surfaces own stencil 3, and her hull
// must still draw over furniture behind her. Room hulls likewise skip the stencil test so a prop in
// front of Rosari keeps its outline across her.
function RosariBedroom({ wardrobeOpen, canToggleWardrobeRef, onWardrobeToggle }) {
  const { size } = useThree()
  const sizeRef = useRef(size)
  sizeRef.current = size
  const [room] = useState(() => createRosariBedroom(() => sizeRef.current))
  useEffect(() => room.dispose, [room])
  useFrame(() => {
    const uniforms = room.hullMaterial.userData.outlineUniforms
    if (!uniforms) return
    const viewport = getRosariOutlineViewport(sizeRef.current)
    uniforms.outlineViewport.value.set(viewport.width, viewport.height)
  })
  const wardrobe = ROSARI_ROOM_FURNITURE.wardrobe
  return (
    <group>
      <primitive object={room.group} />
      {/* Invisible click target for the merged wardrobe (raycast only, never drawn). */}
      <mesh
        position={[wardrobe.x, 0.96, wardrobe.z]}
        onClick={(event) => {
          event.stopPropagation()
          if (canRosariWardrobeToggle({ wardrobeOpen, nearWardrobe: canToggleWardrobeRef.current })) {
            // 3D 옷장 탭은 버튼이 아니라 캔버스 레이캐스트라 루트 UI 리스너가 못 본다 — 옷장 버튼과 같은 소리를 직접 낸다.
            emitUiSfx(wardrobeOpen ? 'close' : 'open')
            onWardrobeToggle?.()
          }
        }}
      >
        <boxGeometry args={[1.48, 1.92, 0.78]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}

export function createRosariBedroom(getSize = () => null) {
  return buildRosariBedroom({
    gradientMap: ARCHIVE_TOON_GRADIENT(),
    hullMaterial: makeRoomOutlineMaterial(getSize),
    weldOutlineNormals: computeWeldedOutlineNormals,
  })
}

export function makeRoomOutlineMaterial(getSize) {
  const material = makeOutlineMaterial(getSize)
  material.name = 'rosari_bedroom_outline'
  material.stencilWrite = false
  return material
}

function keyToDirection(key) {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up'
  if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down'
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left'
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right'
  return null
}

// Module-level scratch: useFrame merges keys without allocating each frame.
const MERGED_KEYS = { up: false, down: false, left: false, right: false }
function mergeKeysInto(out, a, b) {
  out.up = a.up || b.up
  out.down = a.down || b.down
  out.left = a.left || b.left
  out.right = a.right || b.right
  return out
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

export function collectLimbRefs(root, refs) {
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
  // The GLB bakes small rest rotations into several pivots (shoulders, elbows, hips,
  // knees).  The room animation is an offset on top of that rest pose.
  for (const node of Object.values(refs)) {
    node.userData.roomBaseRotX = node.rotation.x
    node.userData.roomBaseRotZ = node.rotation.z
  }
}

function setLimbRotationX(node, offset) {
  if (node) node.rotation.x = (node.userData.roomBaseRotX ?? 0) + offset
}

function setLimbRotationZ(node, offset) {
  if (node) node.rotation.z = (node.userData.roomBaseRotZ ?? 0) + offset
}

export function animateNamedLimbs(refs, t, moving) {
  const armSwing = moving ? Math.sin(t) * 0.34 : 0
  const legSwing = moving ? Math.sin(t + Math.PI) * 0.3 : 0
  const elbowBend = moving ? 0.08 + Math.max(0, Math.sin(t + Math.PI)) * 0.16 : 0
  const kneeBend = moving ? Math.max(0, Math.sin(t)) * 0.18 : 0
  const settle = moving ? Math.sin(t * 2) * 0.03 : 0

  setLimbRotationX(refs.leftShoulder, armSwing)
  setLimbRotationX(refs.rightShoulder, -armSwing)
  setLimbRotationX(refs.leftHip, legSwing)
  setLimbRotationX(refs.rightHip, -legSwing)
  setLimbRotationX(refs.leftElbow, -elbowBend)
  setLimbRotationX(refs.rightElbow, -elbowBend)
  setLimbRotationX(refs.leftKnee, kneeBend)
  setLimbRotationX(refs.rightKnee, moving ? Math.max(0, Math.sin(t + Math.PI)) * 0.18 : 0)
  setLimbRotationZ(refs.leftWrist, settle)
  setLimbRotationZ(refs.rightWrist, -settle)
  setLimbRotationX(refs.leftAnkle, -kneeBend * 0.35)
  setLimbRotationX(refs.rightAnkle, (moving ? -Math.max(0, Math.sin(t + Math.PI)) * 0.18 : 0) * 0.35)
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

function makeOutfitAccessoryMaterial(color) {
  return new THREE.MeshToonMaterial({ name: 'outfit_accessory', color, gradientMap: ARCHIVE_TOON_GRADIENT() })
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
  subtitle: { margin: '4px 0 0', fontSize: 14, lineHeight: 1.3, fontWeight: 800, overflowWrap: 'anywhere' },
  stage: { ...panel, position: 'relative', minHeight: 0, minWidth: 0, overflow: 'hidden', borderRadius: 18 },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' },
  cameraButton: { position: 'absolute', bottom: 6, left: 6, zIndex: 2, minHeight: 44, maxWidth: 'calc(100% - 12px)', padding: '6px 10px', border: '2px solid #7c416e', borderRadius: 12, background: '#fff3cd', color: '#5f2d58', fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' },
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
  hint: { margin: '0 0 4px', fontSize: 14, fontWeight: 900, lineHeight: 1.3 },
  radioButtonSlot: { marginTop: 4 },
  wardrobeButton: { width: '100%', minHeight: 44, border: '3px solid #7c416e', borderRadius: 14, background: '#ffacd0', color: '#4e2449', fontWeight: 1000, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' },
  wardrobeButtonDisabled: { width: '100%', minHeight: 44, border: '3px solid #b991ab', borderRadius: 14, background: '#eadfe7', color: '#8b7286', fontWeight: 900, cursor: 'not-allowed', touchAction: 'manipulation', userSelect: 'none' },
  wardrobePanel: { ...panel, position: 'absolute', zIndex: 4, top: 4, right: 4, width: 'min(292px, calc(100% - 8px))', maxHeight: 'calc(100% - 8px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 6, touchAction: 'pan-y' },
  // Portrait: the list is a bottom sheet capped at 40% of the stage so Rosari stays visible above it.
  wardrobeSheet: { ...panel, position: 'absolute', zIndex: 4, left: 4, right: 4, bottom: 4, maxHeight: '40%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 6, touchAction: 'pan-y' },
  rotateSurface: { position: 'absolute', inset: 0, zIndex: 1, cursor: 'grab', touchAction: 'none', userSelect: 'none' },
  angleBarTop: { position: 'absolute', zIndex: 3, top: 6, left: 6, right: 6 },
  angleBarSide: { position: 'absolute', zIndex: 3, top: 6, left: 6, right: 'calc(min(292px, 100% - 8px) + 12px)' },
  wardrobeBody: { minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain', overflowWrap: 'anywhere' },
  wardrobeHeader: { display: 'flex', flexWrap: 'wrap', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 },
  wardrobeTitle: { flex: '1 0 auto', margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 1000 },
  // Title and the two buttons share a row; a longer translation drops the buttons to a second row, right-aligned.
  wardrobeHeaderActions: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  wardrobeCloseButton: { minWidth: 44, minHeight: 44, flexShrink: 0, border: '3px solid #7c416e', borderRadius: 999, background: '#fff3cd', color: '#4e2449', fontSize: 24, fontWeight: 1000, cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none' },
}

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import playerModelUrl from '../assets/models/player/player-nendoroid-2head-2026-09-01.glb?url'

const VIEWER_ROUTE_MODEL_URL = playerModelUrl

const CAMERA_VIEWS = Object.freeze({
  front: { label: 'Front', position: [0, 0.95, 6.4] },
  right: { label: 'Right', position: [6.4, 0.95, 0] },
  back: { label: 'Back', position: [0, 0.95, -6.4] },
  reset: { label: 'Front-right reset', position: [4.8, 1.15, 5.4] },
})

function ProtagonistModel() {
  const gltf = useGLTF(VIEWER_ROUTE_MODEL_URL)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  return <primitive object={scene} scale={1.28} position={[0, -0.12, 0]} />
}

function CameraRig({ controlsRef, view }) {
  const { camera } = useThree()

  useEffect(() => {
    const nextView = CAMERA_VIEWS[view] ?? CAMERA_VIEWS.reset
    camera.position.set(...nextView.position)
    camera.lookAt(0, 0.18, 0)
    camera.updateProjectionMatrix()
    controlsRef.current?.target?.set(0, 0.18, 0)
    controlsRef.current?.update?.()
  }, [camera, controlsRef, view])

  return null
}

function ViewerCanvas({ view }) {
  const controlsRef = useRef(null)
  return (
    <Canvas
      camera={{ position: CAMERA_VIEWS.reset.position, fov: 35, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      style={styles.canvas}
    >
      <color attach="background" args={["#f6f2e8"]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <directionalLight position={[-3, 4, -4]} intensity={0.55} />
      <CameraRig controlsRef={controlsRef} view={view} />
      <Suspense fallback={<Html center><div style={styles.loadingBadge}>GLB loading...</div></Html>}>
        <ProtagonistModel />
      </Suspense>
      <gridHelper args={[5, 10, '#d6c8ad', '#e8ddc8']} position={[0, -1.784, 0]} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, 0.18, 0]}
        minDistance={1.8}
        maxDistance={8}
      />
    </Canvas>
  )
}

export default function PlayerModelViewer() {
  const [view, setView] = useState('reset')
  const [helpOpen, setHelpOpen] = useState(true)
  const setNamedView = useCallback((nextView) => setView(nextView), [])

  return (
    <main style={styles.shell} data-testid="player-model-viewer">
      <section style={styles.header} aria-label="viewer description">
        <div>
          <p style={styles.eyebrow}>Local protagonist GLB viewer</p>
          <h1 style={styles.title}>player-nendoroid-2head-2026-09-01.glb</h1>
          <p style={styles.subtitle}>Public local route. No login, no Firebase readiness gate, no localStorage state.</p>
        </div>
        <div style={styles.currentView} aria-live="polite">View: {CAMERA_VIEWS[view]?.label ?? CAMERA_VIEWS.reset.label}</div>
      </section>

      <section style={styles.viewerFrame} aria-label="3D protagonist model viewer">
        <ViewerCanvas view={view} />
      </section>

      <nav style={styles.controls} aria-label="viewer controls">
        <button type="button" style={styles.button} onClick={() => setNamedView('front')}>Front</button>
        <button type="button" style={styles.button} onClick={() => setNamedView('right')}>Right</button>
        <button type="button" style={styles.button} onClick={() => setNamedView('back')}>Back</button>
        <button type="button" style={styles.buttonPrimary} onClick={() => setNamedView('reset')}>Reset</button>
        <button type="button" style={styles.button} aria-expanded={helpOpen} onClick={() => setHelpOpen((open) => !open)}>Help</button>
      </nav>

      {helpOpen && (
        <aside style={styles.help}>
          <strong>Controls:</strong> drag to orbit, wheel or pinch to zoom, buttons snap to front/right/back/reset views.
          This route loads the exact committed GLB URL directly from Vite assets.
        </aside>
      )}
    </main>
  )
}

useGLTF.preload(VIEWER_ROUTE_MODEL_URL)

const styles = {
  shell: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateRows: 'auto minmax(360px, 1fr) auto auto',
    gap: 14,
    padding: 'clamp(14px, 2vw, 24px)',
    background: 'linear-gradient(180deg, #fff8e7 0%, #e9ddc2 100%)',
    color: '#241609',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  eyebrow: {
    margin: '0 0 4px',
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#76512d',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(20px, 4vw, 36px)',
    lineHeight: 1.05,
  },
  subtitle: {
    margin: '8px 0 0',
    fontWeight: 700,
    color: '#5c4328',
  },
  currentView: {
    padding: '10px 14px',
    border: '2px solid #5a3418',
    borderRadius: 999,
    background: '#fffdf5',
    fontWeight: 900,
  },
  viewerFrame: {
    minHeight: 0,
    border: '4px solid #2a180c',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 18px 45px rgba(60, 32, 7, 0.22)',
    background: '#f6f2e8',
  },
  canvas: {
    width: '100%',
    height: '100%',
    minHeight: 360,
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    minHeight: 44,
    padding: '10px 18px',
    border: '2px solid #2a180c',
    borderRadius: 12,
    background: '#fffdf5',
    color: '#2a180c',
    fontWeight: 900,
    cursor: 'pointer',
  },
  buttonPrimary: {
    minHeight: 44,
    padding: '10px 20px',
    border: '2px solid #2a180c',
    borderRadius: 12,
    background: '#2a180c',
    color: '#fffdf5',
    fontWeight: 900,
    cursor: 'pointer',
  },
  help: {
    justifySelf: 'center',
    maxWidth: 900,
    padding: '12px 16px',
    borderRadius: 16,
    background: 'rgba(255, 253, 245, 0.86)',
    color: '#3b2714',
    fontWeight: 700,
    lineHeight: 1.45,
  },
  loadingBadge: {
    padding: '10px 14px',
    borderRadius: 12,
    background: '#2a180c',
    color: '#fffdf5',
    fontWeight: 900,
  },
}

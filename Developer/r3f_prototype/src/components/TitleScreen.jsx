import { Canvas } from '@react-three/fiber'
import TitleScene3D from './TitleScene3D.jsx'

export default function TitleScreen({ onStart }) {
  return (
    <div style={styles.root}>
      <Canvas
        orthographic
        camera={{ zoom: 56, position: [0, 13, 18], near: 0.1, far: 100 }}
        gl={{ stencil: true, antialias: true }}
        shadows
        style={styles.canvas}
      >
        <TitleScene3D />
      </Canvas>

      <div style={styles.tint} />
      <div style={styles.content}>
        <div style={styles.serviceName}>Escape! zombie school</div>
        <h1 style={styles.title}>
          <span style={styles.titleAccent}>Escape!</span>
          <span>zombie school</span>
        </h1>
        <p style={styles.subtitle}>5분만 버티면, 교문이 열린다</p>
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.primaryButton} onClick={onStart}>
          게임 시작
        </button>
      </div>
    </div>
  )
}

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#16121d',
    fontFamily: "'Segoe UI', sans-serif",
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: '#211c2b',
  },
  tint: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(13,10,18,0.28) 0%, rgba(13,10,18,0.08) 42%, rgba(13,10,18,0.58) 100%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'absolute',
    top: '13%',
    left: 22,
    right: 22,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  serviceName: {
    color: '#f7d17e',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    textShadow: '0 2px 0 #050209, 0 0 8px rgba(233,144,57,0.55)',
    marginBottom: 8,
  },
  title: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    color: '#f8f7f2',
    fontSize: 48,
    lineHeight: 0.96,
    fontWeight: 1000,
    letterSpacing: 0,
    textShadow: '0 4px 0 #050209, 0 0 16px rgba(65,116,90,0.75)',
  },
  titleAccent: {
    color: '#ff8a37',
  },
  subtitle: {
    color: '#f8f7f2',
    fontSize: 16,
    lineHeight: 1.35,
    fontWeight: 800,
    letterSpacing: 0,
    margin: '12px 0 0',
    textShadow: '0 3px 0 #050209, 0 0 8px rgba(0,0,0,0.45)',
  },
  actions: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 34,
    display: 'flex',
    flexDirection: 'column',
  },
  primaryButton: {
    height: 54,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    fontSize: 20,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 5px 0 #050209, 0 0 16px rgba(89,199,255,0.45)',
  },
}

import { Canvas } from '@react-three/fiber'
import ErrorBoundary from './ErrorBoundary.jsx'
import TitleScene3D from './TitleScene3D.jsx'

// 타이틀 UI와 3D 장면은 함께 로드해 문구만 보이고 그래픽이 비는 상태를 만들지 않는다.
export default function TitleSceneCanvas({ className, style }) {
  return (
    <Canvas
      className={className}
      camera={{ fov: 34, position: [0, 6.8, 11.8], near: 0.1, far: 100 }}
      gl={{ stencil: true, antialias: true }}
      shadows
      style={style}
    >
      <ErrorBoundary fallback={null}>
        <TitleScene3D reducedEffects={false} />
      </ErrorBoundary>
    </Canvas>
  )
}

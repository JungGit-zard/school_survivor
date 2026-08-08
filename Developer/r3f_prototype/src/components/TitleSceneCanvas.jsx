import { Suspense, lazy } from 'react'
import { Canvas } from '@react-three/fiber'
import ErrorBoundary from './ErrorBoundary.jsx'
import { applyFrozenStudioSnapshot } from '../title/frozenStudio.js'

const TitleScene3D = lazy(() => import('./TitleScene3D.jsx'))

// 타이틀은 Firebase와 완전히 분리돼 있다. 동결 스냅샷(src/title/)만 보고 무조건 렌더한다.
applyFrozenStudioSnapshot()

// Title 3D는 Three/R3F를 끌고 오므로 TitleScreen 본체에서 분리한다.
// 이렇게 해야 버튼/로그인 UI가 먼저 뜨고, 무거운 3D 씬은 별도 chunk로 뒤따라 로드된다.
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
        <Suspense fallback={null}><TitleScene3D reducedEffects={false} /></Suspense>
      </ErrorBoundary>
    </Canvas>
  )
}

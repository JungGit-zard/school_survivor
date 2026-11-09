import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import ErrorBoundary from './ErrorBoundary.jsx'
import TitleScene3D from './TitleScene3D.jsx'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// 움직임 줄이기에서는 연속 루프 대신 요청할 때만 그린다. 첫 몇 장은 늦게 붙는 외곽선·크기 변화를 위해 다시 그린다.
const REDUCED_MOTION_SETTLE_MS = [120, 600, 1500]

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches
  ))
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    const onChange = () => setReduced(media.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

function ReducedMotionSettle() {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    const timers = REDUCED_MOTION_SETTLE_MS.map((delay) => setTimeout(() => invalidate(), delay))
    return () => timers.forEach(clearTimeout)
  }, [invalidate])
  return null
}

// 타이틀 UI와 3D 장면은 함께 로드해 문구만 보이고 그래픽이 비는 상태를 만들지 않는다.
// prefers-reduced-motion이면 3D도 멈춘다(2026-11-08): 장면 구성·모델은 그대로 두고, 대기 동작·달리기·춤을
// reducedEffects로 끄고 렌더 루프를 'demand'로 바꿔 흔들림·빛 깜빡임·속도선이 계속 돌지 않게 한다.
export default function TitleSceneCanvas({ className, style }) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <Canvas
      className={className}
      camera={{ fov: 34, position: [0, 6.8, 11.8], near: 0.1, far: 100 }}
      gl={{ stencil: true, antialias: true }}
      shadows
      frameloop={reducedMotion ? 'demand' : 'always'}
      style={style}
    >
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <TitleScene3D reducedEffects={reducedMotion} />
          {reducedMotion && <ReducedMotionSettle />}
        </Suspense>
      </ErrorBoundary>
    </Canvas>
  )
}

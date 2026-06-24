import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'

// 게임이 진행 중('playing')일 때만 프레임 콜백을 돌릴지 결정하는 순수 게이트.
// 일시정지/레벨업/게임오버 등 'playing'이 아닌 모든 상태에서는 false.
export function shouldRunGameFrame(phase) {
  return phase === 'playing'
}

// useFrame 래퍼: 게임이 'playing'일 때만 콜백을 실행한다.
// 발사체·이펙트처럼 물리(Physics paused)에 묶이지 않고 직접 위치를 갱신하거나
// 데미지를 가하는 컴포넌트가, 일시정지/레벨업 중에도 계속 움직이며 피해를 주는 것을 막는다.
// (Canvas에 frameloop가 없어 useFrame은 정지 중에도 매 프레임 실행되므로 게이트가 필요하다.)
export function usePlayingFrame(callback) {
  useFrame((state, delta) => {
    if (!shouldRunGameFrame(useGameStore.getState().phase)) return
    callback(state, Math.min(delta, 0.1))
  })
}

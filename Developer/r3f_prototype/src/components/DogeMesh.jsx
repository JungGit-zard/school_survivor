import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

// ── 코믹 도지 (시바견 밈) 복셀 카툰 메쉬 ─────────────────────────────────
// 박스 조합 + MeshToonMaterial + 인버티드 헐 아웃라인. 씬 의존성 없음 —
// 타이틀 배경, 인게임 NPC/이벤트, 그래픽 스튜디오 프리뷰 어디서든 재사용.
const DOGE_COAT = 0xe2a659   // 시바 오렌지-탄 코트
const DOGE_CREAM = 0xf6e7c8  // 주둥이·배·볼·발 크림
const DOGE_DARK = 0x241811   // 눈·코

// 인버티드 헐 외곽선 굵기 계수. inflateScale은 1 근처의 "인플레이션 계수"를 받도록 설계됐다
// (예: inflateScale(1.06)=1.12 → 12% 부풀림). 여기 박스들의 scale은 치수값(0.15~0.56 등)이라
// inflateScale에 직접 넣으면 음수/0 스케일이 되어 BackSide가 뒤집힌 검은 박스(블롭)로 렌더된다.
// 따라서 치수 scale에는 계수를 그대로 곱해 소폭만 부풀린다.
const DOGE_OUTLINE_INFLATE = inflateScale(1.06)

function DogeToonBox({ position, rotation = [0, 0, 0], scale, color, emissive = 0.08 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outline = useMemo(() => outlineMat(0.95), [])
  const outlineScale = useMemo(
    () => (Array.isArray(scale) ? scale.map((s) => s * DOGE_OUTLINE_INFLATE) : scale * DOGE_OUTLINE_INFLATE),
    [scale],
  )
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow scale={scale} material={mat}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh scale={outlineScale} material={outline}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  )
}

function DogeLegs() {
  return (
    <group name="doge-legs">
      {/* 다리 (고정, 양발 서기) */}
      <DogeToonBox position={[-0.16, 0.17, 0.01]} scale={[0.15, 0.34, 0.18]} color={DOGE_COAT} />
      <DogeToonBox position={[0.16, 0.17, 0.01]} scale={[0.15, 0.34, 0.18]} color={DOGE_COAT} />
      <DogeToonBox position={[-0.16, 0.045, 0.07]} scale={[0.2, 0.09, 0.3]} color={DOGE_CREAM} />
      <DogeToonBox position={[0.16, 0.045, 0.07]} scale={[0.2, 0.09, 0.3]} color={DOGE_CREAM} />

      {/* 몸통 */}
      <DogeToonBox position={[0, 0.62, 0]} scale={[0.5, 0.56, 0.36]} color={DOGE_COAT} />
      {/* 배·가슴 크림 */}
      <DogeToonBox position={[0, 0.58, 0.185]} scale={[0.3, 0.44, 0.06]} color={DOGE_CREAM} />
    </group>
  )
}

function DogeHead() {
  return (
    <group name="doge-head">
      {/* 머리 */}
      <DogeToonBox position={[0, 0.2, 0]} scale={[0.5, 0.42, 0.44]} color={DOGE_COAT} />
      {/* 볼 (통통 크림) */}
      <DogeToonBox position={[-0.24, 0.08, 0.12]} scale={[0.14, 0.16, 0.22]} color={DOGE_CREAM} />
      <DogeToonBox position={[0.24, 0.08, 0.12]} scale={[0.14, 0.16, 0.22]} color={DOGE_CREAM} />
      {/* 주둥이 */}
      <DogeToonBox position={[0, 0.11, 0.25]} scale={[0.3, 0.22, 0.24]} color={DOGE_CREAM} />
      {/* 코 */}
      <DogeToonBox position={[0, 0.15, 0.4]} scale={[0.12, 0.1, 0.08]} color={DOGE_DARK} emissive={0.02} />
      {/* 눈 */}
      <DogeToonBox position={[-0.13, 0.27, 0.22]} scale={[0.08, 0.11, 0.06]} color={DOGE_DARK} emissive={0.02} />
      <DogeToonBox position={[0.13, 0.27, 0.22]} scale={[0.08, 0.11, 0.06]} color={DOGE_DARK} emissive={0.02} />
      {/* 쫑긋 귀 (바깥 탄 + 안쪽 크림) */}
      <DogeToonBox position={[-0.19, 0.46, -0.02]} rotation={[0, 0, 0.32]} scale={[0.14, 0.26, 0.1]} color={DOGE_COAT} />
      <DogeToonBox position={[0.19, 0.46, -0.02]} rotation={[0, 0, -0.32]} scale={[0.14, 0.26, 0.1]} color={DOGE_COAT} />
      <DogeToonBox position={[-0.19, 0.46, 0.03]} rotation={[0, 0, 0.32]} scale={[0.07, 0.15, 0.06]} color={DOGE_CREAM} />
      <DogeToonBox position={[0.19, 0.46, 0.03]} rotation={[0, 0, -0.32]} scale={[0.07, 0.15, 0.06]} color={DOGE_CREAM} />
    </group>
  )
}

function DogeArm() {
  // 어깨 피벗 기준으로 아래로 뻗은 팔 + 크림 발
  return (
    <group name="doge-arm">
      <DogeToonBox position={[0, -0.17, 0]} scale={[0.13, 0.34, 0.16]} color={DOGE_COAT} />
      <DogeToonBox position={[0, -0.35, 0.02]} scale={[0.15, 0.12, 0.18]} color={DOGE_CREAM} />
    </group>
  )
}

function DogeTail() {
  // 말린 꼬리 — 뒤에서 위로 올라가 안쪽으로 말림
  return (
    <group name="doge-tail">
      <DogeToonBox position={[0, 0.1, 0]} rotation={[0.5, 0, 0]} scale={[0.13, 0.26, 0.13]} color={DOGE_COAT} />
      <DogeToonBox position={[0, 0.28, 0.06]} rotation={[1.4, 0, 0]} scale={[0.12, 0.22, 0.12]} color={DOGE_COAT} />
      <DogeToonBox position={[0, 0.34, 0.22]} rotation={[2.2, 0, 0]} scale={[0.11, 0.16, 0.11]} color={DOGE_CREAM} />
    </group>
  )
}

// 정지 포즈(rest pose) 도지 — 애니메이션 없는 순수 비주얼.
// 리그 refs를 넘기면 상위(예: DancingDoge)에서 파츠를 직접 구동할 수 있다.
export function DogeMesh({ hipRef = null, headRef = null, lArmRef = null, rArmRef = null, tailRef = null }) {
  return (
    <group name="doge">
      <DogeLegs />
      <group ref={hipRef} position={[0, 0.33, 0]}>
        <group ref={headRef} position={[0, 0.62, 0]}>
          <DogeHead />
        </group>
        <group ref={lArmRef} position={[-0.32, 0.5, 0.02]} rotation={[0, 0, -0.32]}>
          <DogeArm />
        </group>
        <group ref={rArmRef} position={[0.32, 0.5, 0.02]} rotation={[0, 0, 0.32]}>
          <DogeArm />
        </group>
        <group ref={tailRef} position={[0, 0.32, -0.2]}>
          <DogeTail />
        </group>
      </group>
    </group>
  )
}

// 양발로 서서 춤추는 도지.
// dance: 'twist'(좌우 트위스트+엉덩이 씰룩) | 'disco'(바운스+팔 번갈아 찌르기)
// delay: 위상차(여러 마리 엇박자), paused: true면 정지 포즈 고정(reduced effects용)
export function DancingDoge({ position = [0, 0, 0], dance = 'twist', delay = 0, scale = 1, yaw = 0, paused = false }) {
  const rootRef = useRef()
  const hipRef = useRef()
  const headRef = useRef()
  const lArmRef = useRef()
  const rArmRef = useRef()
  const tailRef = useRef()
  const baseY = position[1]

  useFrame((state) => {
    const hip = hipRef.current
    const head = headRef.current
    const lArm = lArmRef.current
    const rArm = rArmRef.current
    const tail = tailRef.current
    const root = rootRef.current
    if (!hip || !head || !lArm || !rArm || !tail || !root) return

    if (paused) {
      root.position.y = baseY
      root.rotation.y = yaw
      hip.rotation.set(0, 0, 0)
      head.rotation.set(0, 0, 0)
      lArm.rotation.set(0, 0, -0.28)
      rArm.rotation.set(0, 0, 0.28)
      tail.rotation.set(0, 0, 0)
      return
    }

    const t = state.clock.elapsedTime + delay

    if (dance === 'disco') {
      // 큰 바운스 + 엉덩이 좌우 그루브 + 양팔 번갈아 바깥으로 하늘 찌르기 (액티브 디스코)
      const tempo = 4.0
      const s = Math.sin(t * tempo)
      root.position.y = baseY + Math.abs(s) * 0.2
      root.rotation.y = yaw + Math.sin(t * 2.0) * 0.28
      hip.rotation.y = Math.sin(t * tempo) * 0.22 // 좌우 그루브
      hip.rotation.z = Math.cos(t * tempo) * 0.08
      head.rotation.x = s * 0.16 // 까딱임 강화
      head.rotation.z = Math.sin(t * 2.0) * 0.2
      head.rotation.y = 0
      // 오른팔은 +z(오른쪽 바깥), 왼팔은 -z(왼쪽 바깥)로만 움직여 몸통에 파고들지 않는다.
      rArm.rotation.z = 1.25 - s * 1.05 // 0.2~2.3 (팔 끝 +x 바깥)
      rArm.rotation.x = -Math.max(0, -s) * 0.3 // 찌를 때 전방 스러스트
      lArm.rotation.z = -1.25 - s * 1.05 // -2.3~-0.2 (팔 끝 -x 바깥, 반대 위상)
      lArm.rotation.x = -Math.max(0, s) * 0.3
      tail.rotation.z = Math.sin(t * 8.0) * 0.36
      tail.rotation.x = 0
    } else {
      // 좌우 트위스트 + 엉덩이 씰룩 + 팔 엇갈려 흔들기
      const s = Math.sin(t * 3.2)
      root.position.y = baseY + Math.abs(Math.sin(t * 3.2)) * 0.05
      root.rotation.y = yaw
      hip.rotation.y = s * 0.5
      hip.rotation.z = Math.sin(t * 6.4) * 0.09
      head.rotation.y = -s * 0.22
      head.rotation.z = Math.sin(t * 3.2 + 0.6) * 0.13
      head.rotation.x = 0
      lArm.rotation.z = -0.32
      lArm.rotation.x = s * 0.95
      rArm.rotation.z = 0.32
      rArm.rotation.x = -s * 0.95
      tail.rotation.z = Math.sin(t * 6.4) * 0.42
      tail.rotation.x = 0
    }
  })

  return (
    <group ref={rootRef} position={position} rotation={[0, yaw, 0]} scale={scale}>
      <DogeMesh hipRef={hipRef} headRef={headRef} lArmRef={lArmRef} rArmRef={rArmRef} tailRef={tailRef} />
    </group>
  )
}

export default DogeMesh

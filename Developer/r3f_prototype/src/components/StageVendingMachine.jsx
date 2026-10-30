import React from 'react'

// 화이트 스포츠음료 콘셉트(2026-10-30 Terry 지시): 흰 몸체 + 오션 블루 띠/버튼.
// 브랜드 문구·로고 형상 없음, 병은 일반 음료 색만 사용한다.
function DrinkBottle({ x, color, capColor = '#ffffff' }) {
  return (
    <group position={[x, 0, 0.045]}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.11, 0.3, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[0.07, 0.08, 0.04]} />
        <meshStandardMaterial color={capColor} roughness={0.5} />
      </mesh>
    </group>
  )
}

export default function StageVendingMachine({ position = [0, 0, 0], rotation = [0, 0, 0], soldOut = false }) {
  const glassColor = soldOut ? '#9aa6b0' : '#dff3ff'
  const buttonColor = soldOut ? '#6b7280' : '#38b6ff'
  const bodyColor = soldOut ? '#aeb8c2' : '#f4f8fb'
  const accentColor = soldOut ? '#7b8794' : '#1f7ad1'
  const waveColor = soldOut ? '#a3adb7' : '#7fd0f5'

  return (
    <group
      name="stage-vending-machine"
      position={position}
      rotation={rotation}
      userData={{ stageVendingMachine: true }}
    >
      <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 2.04, 0.55]} />
        <meshStandardMaterial color={bodyColor} roughness={0.42} metalness={0.05} />
      </mesh>

      {/* 전면 상단 블루 헤더 띠 + 하단 물결 띠: 몸체 앞면(z=0.275)에 붙인 얇은 장식판 */}
      <mesh position={[0, 1.92, 0.285]}>
        <boxGeometry args={[0.98, 0.16, 0.02]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.83, 0.285]}>
        <boxGeometry args={[0.98, 0.035, 0.02]} />
        <meshStandardMaterial color={waveColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.64, 0.285]}>
        <boxGeometry args={[0.98, 0.05, 0.02]} />
        <meshStandardMaterial color={waveColor} roughness={0.4} />
      </mesh>

      <mesh position={[0, 2.08, 0.02]} castShadow>
        <boxGeometry args={[0.92, 0.1, 0.62]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>

      <group position={[-0.17, 1.25, 0.292]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.52, 1.05, 0.035]} />
          <meshStandardMaterial color={glassColor} roughness={0.38} transparent opacity={soldOut ? 0.7 : 0.92} />
        </mesh>
        <DrinkBottle x={-0.17} color="#2f8fe0" />
        <DrinkBottle x={0} color="#eaf6ff" capColor="#1f7ad1" />
        <DrinkBottle x={0.17} color="#69c3f0" />
        <mesh position={[0, -0.4, 0.018]}>
          <boxGeometry args={[0.42, 0.12, 0.035]} />
          <meshStandardMaterial color={soldOut ? '#94a3b8' : '#1f7ad1'} roughness={0.45} />
        </mesh>
      </group>

      <mesh position={[0.31, 1.32, 0.305]} castShadow>
        <boxGeometry args={[0.24, 1.08, 0.05]} />
        <meshStandardMaterial color="#cfe3f2" roughness={0.45} />
      </mesh>
      <mesh position={[0.31, 1.63, 0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.035, 16]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>
      <mesh position={[0.31, 1.36, 0.34]} castShadow>
        <boxGeometry args={[0.14, 0.16, 0.04]} />
        <meshStandardMaterial color={buttonColor} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.42, 0.31]} castShadow>
        <boxGeometry args={[0.74, 0.18, 0.06]} />
        <meshStandardMaterial color="#1b2a38" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.51, 0.35]}>
        <boxGeometry args={[0.58, 0.035, 0.025]} />
        <meshStandardMaterial color={buttonColor} roughness={0.45} />
      </mesh>

      <mesh position={[-0.32, 0.07, 0.14]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.22]} />
        <meshStandardMaterial color="#8a98a6" roughness={0.7} />
      </mesh>
      <mesh position={[0.32, 0.07, 0.14]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.22]} />
        <meshStandardMaterial color="#8a98a6" roughness={0.7} />
      </mesh>
    </group>
  )
}

import React from 'react'

function DrinkBottle({ x, color }) {
  return (
    <group position={[x, 0, 0.045]}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.11, 0.3, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[0.07, 0.08, 0.04]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
    </group>
  )
}

export default function StageVendingMachine({ position = [0, 0, 0], rotation = [0, 0, 0], soldOut = false }) {
  const glassColor = soldOut ? '#7d8790' : '#c6f4ff'
  const buttonColor = soldOut ? '#6b7280' : '#4dffbd'
  const bodyColor = soldOut ? '#334155' : '#304b5e'

  return (
    <group
      name="stage-vending-machine"
      position={position}
      rotation={rotation}
      userData={{ stageVendingMachine: true }}
    >
      <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 2.04, 0.55]} />
        <meshStandardMaterial color={bodyColor} roughness={0.72} metalness={0.05} />
      </mesh>

      <mesh position={[0, 2.08, 0.02]} castShadow>
        <boxGeometry args={[0.92, 0.1, 0.62]} />
        <meshStandardMaterial color="#9cc8d8" roughness={0.65} />
      </mesh>

      <group position={[-0.17, 1.25, 0.292]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.52, 1.05, 0.035]} />
          <meshStandardMaterial color={glassColor} roughness={0.38} transparent opacity={soldOut ? 0.7 : 0.92} />
        </mesh>
        <DrinkBottle x={-0.17} color="#ff6b6b" />
        <DrinkBottle x={0} color="#7bd88f" />
        <DrinkBottle x={0.17} color="#9b8cff" />
        <mesh position={[0, -0.4, 0.018]}>
          <boxGeometry args={[0.42, 0.12, 0.035]} />
          <meshStandardMaterial color={soldOut ? '#94a3b8' : '#ffd166'} roughness={0.55} />
        </mesh>
      </group>

      <mesh position={[0.31, 1.32, 0.305]} castShadow>
        <boxGeometry args={[0.24, 1.08, 0.05]} />
        <meshStandardMaterial color="#111820" roughness={0.8} />
      </mesh>
      <mesh position={[0.31, 1.63, 0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.035, 16]} />
        <meshStandardMaterial color="#ffd166" roughness={0.45} />
      </mesh>
      <mesh position={[0.31, 1.36, 0.34]} castShadow>
        <boxGeometry args={[0.14, 0.16, 0.04]} />
        <meshStandardMaterial color={buttonColor} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.42, 0.31]} castShadow>
        <boxGeometry args={[0.74, 0.18, 0.06]} />
        <meshStandardMaterial color="#111820" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.51, 0.35]}>
        <boxGeometry args={[0.58, 0.035, 0.025]} />
        <meshStandardMaterial color={soldOut ? '#6b7280' : '#ffd166'} roughness={0.5} />
      </mesh>

      <mesh position={[-0.32, 0.07, 0.14]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.22]} />
        <meshStandardMaterial color="#111820" roughness={0.9} />
      </mesh>
      <mesh position={[0.32, 0.07, 0.14]} castShadow>
        <boxGeometry args={[0.16, 0.14, 0.22]} />
        <meshStandardMaterial color="#111820" roughness={0.9} />
      </mesh>
    </group>
  )
}

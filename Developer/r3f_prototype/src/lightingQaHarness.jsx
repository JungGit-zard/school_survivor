import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import ClassroomFloor from './components/ClassroomFloor.jsx'
import StageLighting from './components/StageLighting.jsx'

const stageId = new URLSearchParams(window.location.search).get('stage') ?? 'stage1'

function LightingQaScene() {
  return (
    <>
      <ambientLight intensity={0.38} color={0x6d6780} />
      <directionalLight position={[-10, 22, 12]} intensity={3.2} />
      <directionalLight position={[10, 12, -10]} intensity={0.85} color={0xffe2b0} />
      <StageLighting stageId={stageId} />
      <ClassroomFloor stageId={stageId} />
      <mesh position={[0, 0.45, 6.2]}>
        <cylinderGeometry args={[0.32, 0.42, 0.9, 12]} />
        <meshToonMaterial color="#58b7ef" />
      </mesh>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <Canvas
    camera={{ fov: 30, position: [0, 17, 17], near: 0.1, far: 500 }}
    dpr={[1, 1.5]}
    shadows
    gl={{ stencil: true }}
    style={{ width: '100vw', height: '100vh', background: '#c8c4bc', display: 'block' }}
  >
    <LightingQaScene />
  </Canvas>,
)

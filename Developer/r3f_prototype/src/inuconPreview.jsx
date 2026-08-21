import React, { useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function toonMat(color, emissive = 0.035) {
  return new THREE.MeshToonMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: emissive })
}

function Part({ size, position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.085, geometry = null }) {
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const actualGeometry = geometry ?? boxGeometry
  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={0} geometry={actualGeometry} material={outlineMaterial} scale={[outlineScale, outlineScale, outlineScale]} />
      <mesh renderOrder={2} geometry={actualGeometry} material={material} />
    </group>
  )
}

function BlobPart({ size, position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.065, cornerRatio = 0.18 }) {
  const geometry = useMemo(() => {
    const [w, h, d] = size
    const c = Math.min(w, h) * cornerRatio
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2 + c, -h / 2)
    shape.lineTo(w / 2 - c, -h / 2)
    shape.lineTo(w / 2, -h / 2 + c)
    shape.lineTo(w / 2, h / 2 - c)
    shape.lineTo(w / 2 - c, h / 2)
    shape.lineTo(-w / 2 + c, h / 2)
    shape.lineTo(-w / 2, h / 2 - c)
    shape.lineTo(-w / 2, -h / 2 + c)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false })
    g.center()
    return g
  }, [size.join(','), cornerRatio])
  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[outlineScale, outlineScale, outlineScale]} />
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function CapsulePart({ radius = 0.08, length = 0.5, position, rotation = [0, 0, 0], scale = [1, 1, 1], material, outlineMaterial, outlineScale = 1.065 }) {
  const geometry = useMemo(() => new THREE.CapsuleGeometry(radius, length, 1, 8), [radius, length])
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[outlineScale, outlineScale, outlineScale]} />
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function TriEar({ position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.095 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0.3)
    shape.lineTo(-0.17, -0.19)
    shape.lineTo(0.17, -0.19)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 })
    g.center()
    return g
  }, [])
  return <Part size={[1, 1, 1]} position={position} rotation={rotation} material={material} outlineMaterial={outlineMaterial} outlineScale={outlineScale} geometry={geometry} />
}

const FACE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FACE_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  float softCircle(vec2 point, vec2 center, vec2 radius) {
    vec2 normalized = (point - center) / radius;
    return 1.0 - smoothstep(0.82, 1.0, dot(normalized, normalized));
  }
  float softLine(vec2 point, vec2 start, vec2 end, float width) {
    vec2 segment = end - start;
    float projection = clamp(dot(point - start, segment) / dot(segment, segment), 0.0, 1.0);
    return 1.0 - smoothstep(width * 0.72, width, length(point - (start + segment * projection)));
  }
  void main() {
    vec2 point = vUv - 0.5;
    float blinkAmount = pow(max(0.0, sin(uTime * 0.62)), 28.0);
    float eyeHeight = mix(0.062, 0.011, blinkAmount);
    float leftEye = softCircle(point, vec2(-0.175, 0.135), vec2(0.060, eyeHeight));
    float rightEye = softCircle(point, vec2(0.175, 0.125), vec2(0.060, eyeHeight));
    float nose = softCircle(point, vec2(0.0, -0.02), vec2(0.082, 0.055));
    float mouth = softLine(point, vec2(0.0, -0.065), vec2(-0.09, -0.15), 0.021)
      + softLine(point, vec2(0.0, -0.065), vec2(0.09, -0.15), 0.021)
      + softLine(point, vec2(-0.09, -0.15), vec2(-0.16, -0.118), 0.019)
      + softLine(point, vec2(0.09, -0.15), vec2(0.16, -0.118), 0.019);
    float darkMask = clamp(leftEye + rightEye + nose + mouth, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.025, 0.018, 0.015), darkMask);
  }
`

function InuconFace() {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh position={[0, 1.265, 0.525]} renderOrder={5}>
      <planeGeometry args={[0.74, 0.58]} />
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={FACE_VERTEX_SHADER} fragmentShader={FACE_FRAGMENT_SHADER} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function InuconLikeReference() {
  const parts = useRef({})
  const outline = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x151018, side: THREE.BackSide }), [])
  const dogMat = useMemo(() => toonMat(0xf0a542, 0.055), [])
  const dogShadeMat = useMemo(() => toonMat(0xd4872e, 0.045), [])
  const scarfMat = useMemo(() => toonMat(0xc58cff, 0.08), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (parts.current.root) {
      parts.current.root.position.y = Math.sin(t * 4.4) * 0.025
      parts.current.root.rotation.z = Math.sin(t * 3.1) * 0.035
    }
    if (parts.current.armR) parts.current.armR.rotation.z = -0.42 + Math.sin(t * 4.8) * 0.055
    if (parts.current.tail) parts.current.tail.rotation.z = Math.sin(t * 8.5) * 0.25
  })
  return (
    <group ref={(el) => { parts.current.root = el }}>
      <BlobPart size={[0.62, 0.58, 0.46]} position={[0, 1.28, 0]} material={dogMat} outlineMaterial={outline} outlineScale={1.085} />
      <TriEar position={[-0.2, 1.64, 0.02]} rotation={[0, 0, -0.22]} material={dogMat} outlineMaterial={outline} outlineScale={1.085} />
      <TriEar position={[0.23, 1.63, 0.02]} rotation={[0, 0, 0.26]} material={dogMat} outlineMaterial={outline} outlineScale={1.085} />
      <InuconFace />
      <BlobPart size={[0.42, 1.5, 0.36]} position={[-0.02, 0.43, 0]} material={dogMat} outlineMaterial={outline} outlineScale={1.095} />
      <CapsulePart radius={0.075} length={0.92} position={[-0.33, 0.77, 0.02]} rotation={[0, 0, -0.02]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} outlineScale={1.065} />
      <CapsulePart radius={0.06} length={0.4} position={[-0.1, 0.94, -0.01]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.05, 1.7]} material={scarfMat} outlineMaterial={outline} outlineScale={1.035} />
      <group ref={(el) => { parts.current.armR = el }} position={[0.24, 0.88, 0.04]} rotation={[0, 0, -0.42]}>
        <CapsulePart radius={0.065} length={0.34} position={[0.1, 0.1, 0]} rotation={[0, 0, -0.08]} scale={[1, 1, 0.82]} material={dogMat} outlineMaterial={outline} outlineScale={1.06} />
      </group>
      <group position={[-0.28, 0.78, 0.04]} rotation={[0, 0, 0.18]}>
        <CapsulePart radius={0.055} length={0.28} position={[-0.06, -0.03, 0]} rotation={[0, 0, 0.04]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} outlineScale={1.055} />
      </group>
      <CapsulePart radius={0.06} length={0.22} position={[-0.14, -0.34, 0]} rotation={[0, 0, -0.12]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} outlineScale={1.055} />
      <CapsulePart radius={0.06} length={0.22} position={[0.09, -0.34, 0]} rotation={[0, 0, 0.12]} scale={[1, 1, 0.82]} material={dogMat} outlineMaterial={outline} outlineScale={1.055} />
      <group ref={(el) => { parts.current.tail = el }} position={[-0.23, 0.96, -0.04]}>
        <CapsulePart radius={0.055} length={0.26} position={[-0.24, 0.02, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]} scale={[1, 1, 0.86]} material={dogMat} outlineMaterial={outline} outlineScale={1.055} />
      </group>
    </group>
  )
}

function BlockPerson({ position, color, scale = 0.65 }) {
  const mat = new THREE.MeshToonMaterial({ color })
  const line = new THREE.MeshBasicMaterial({ color: 0x151018, side: THREE.BackSide })
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.65, 0]} scale={[1.08, 1.08, 1.08]} material={line}><boxGeometry args={[0.5, 0.95, 0.36]} /></mesh>
      <mesh position={[0, 0.65, 0]} material={mat}><boxGeometry args={[0.5, 0.95, 0.36]} /></mesh>
      <mesh position={[0, 1.28, 0]} scale={[1.08, 1.08, 1.08]} material={line}><boxGeometry args={[0.55, 0.45, 0.42]} /></mesh>
      <mesh position={[0, 1.28, 0]} material={mat}><boxGeometry args={[0.55, 0.45, 0.42]} /></mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.82} />
      <directionalLight position={[4, 7, 5]} intensity={2.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshToonMaterial color="#2fb154" />
      </mesh>
      <BlockPerson position={[0, 0, 0]} color={0x4aa3ff} scale={0.62} />
      <BlockPerson position={[-1.65, 0, -0.65]} color={0x76b852} scale={0.56} />
      <BlockPerson position={[1.55, 0, -0.75]} color={0x76b852} scale={0.56} />
      <group position={[0.8, 0.11, 1.05]} rotation={[0, -0.18, 0]} scale={[0.78, 0.78, 0.78]}>
        <InuconLikeReference />
      </group>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <Canvas camera={{ position: [0, 3.0, 5.0], fov: 34 }} gl={{ preserveDrawingBuffer: true }}>
    <Scene />
  </Canvas>,
)

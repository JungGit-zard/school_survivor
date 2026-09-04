import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, inflateScale } from '../lib/toon.js'

const disableRaycast = () => null

// Signed Distance Field procedural face rendering:
// texture image 없이 UV 좌표의 거리장(sdf/soft distance) 계산만으로 눈·눈썹·코·웃는 입을 그린다.

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
    return 1.0 - smoothstep(width * 0.7, width, length(point - (start + segment * projection)));
  }

  void main() {
    vec2 point = vUv - 0.5;
    float faceMask = 1.0 - smoothstep(0.48, 0.53, length(vec2(point.x / 0.86, point.y)));
    float blinkAmount = pow(max(0.0, sin(uTime * 0.7)), 20.0);
    float eyeHeight = mix(0.065, 0.008, blinkAmount);
    float pupilShift = sin(uTime * 0.35) * 0.012;
    float leftEye = softCircle(point, vec2(-0.145, 0.075), vec2(0.075, eyeHeight));
    float rightEye = softCircle(point, vec2(0.145, 0.075), vec2(0.075, eyeHeight));
    float pupils = leftEye * softCircle(point, vec2(-0.145 + pupilShift, 0.073), vec2(0.027, eyeHeight * 0.62))
      + rightEye * softCircle(point, vec2(0.145 + pupilShift, 0.073), vec2(0.027, eyeHeight * 0.62));
    float brows = softLine(point, vec2(-0.215, 0.185), vec2(-0.07, 0.155), 0.018)
      + softLine(point, vec2(0.07, 0.155), vec2(0.215, 0.185), 0.018);
    float nose = softLine(point, vec2(0.0, 0.055), vec2(-0.018, -0.055), 0.014)
      + softLine(point, vec2(-0.018, -0.055), vec2(0.025, -0.07), 0.014);
    float smile = softLine(point, vec2(-0.14, -0.15), vec2(-0.07, -0.195), 0.018)
      + softLine(point, vec2(-0.07, -0.195), vec2(0.0, -0.21), 0.018)
      + softLine(point, vec2(0.0, -0.21), vec2(0.07, -0.195), 0.018)
      + softLine(point, vec2(0.07, -0.195), vec2(0.14, -0.15), 0.018);
    float mouth = clamp(smile, 0.0, 1.0);
    float scar = softLine(point, vec2(0.2, -0.02), vec2(0.27, -0.14), 0.012)
      + softLine(point, vec2(0.165, -0.085), vec2(0.29, -0.11), 0.01);
    float eyeMask = clamp(max(leftEye, rightEye), 0.0, 1.0);
    float darkFeatures = clamp(max(max(brows, nose), mouth), 0.0, 1.0);
    float scarMask = clamp(scar, 0.0, 1.0);
    vec3 color = vec3(0.0);
    color = mix(color, vec3(1.0, 0.93, 0.68), eyeMask);
    color = mix(color, vec3(0.055, 0.025, 0.06), darkFeatures);
    color = mix(color, vec3(0.86, 0.12, 0.18), scarMask);
    color = mix(color, vec3(0.01), clamp(pupils, 0.0, 1.0));
    float alpha = faceMask * max(max(eyeMask, darkFeatures), scarMask);

    gl_FragColor = vec4(color, alpha);
  }
`

function ZombiePart({ name, size, position, rotation = [0, 0, 0], color, emissive = 0.1, outlineScale = 1.07, children = null }) {
  const geometry = getCachedBoxGeo(...size)
  const outlineMaterial = getSharedOutlineMat()
  const material = getCachedToonMat(color, emissive)
  const outline = inflateScale(outlineScale)

  return (
    <group name={name} position={position} rotation={rotation}>
      <group name={`${name}-visual`}>
        <mesh renderOrder={2} geometry={geometry} material={material}>
          <mesh renderOrder={1} geometry={geometry} material={outlineMaterial} scale={[outline, outline, outline]} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
          {children}
        </mesh>
      </group>
    </group>
  )
}

function ProceduralFace() {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh
      position={[0, 0, 0.251]}
      renderOrder={3}
      raycast={disableRaycast}
      userData={{ studioNonFocusable: true, studioNonTunable: true }}
    >
      <planeGeometry args={[0.54, 0.48]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={FACE_VERTEX_SHADER}
        fragmentShader={FACE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function ProceduralFaceTestZombie() {
  return (
    <group name="procedural-face-test-zombie">
      <ZombiePart name="procedural-face-head" size={[0.56, 0.5, 0.48]} position={[0, 0.86, 0]} color={0x568a55} emissive={0.11}>
        <ProceduralFace />
      </ZombiePart>
      <ZombiePart name="procedural-face-body" size={[0.6, 0.62, 0.42]} position={[0, 0.3, 0]} color={0x486d9b} emissive={0.12} outlineScale={1.09} />
      <ZombiePart name="procedural-face-arm-left" size={[0.2, 0.52, 0.2]} position={[-0.42, 0.52, 0]} rotation={[-0.9, 0, 0.14]} color={0x486d9b} />
      <ZombiePart name="procedural-face-arm-right" size={[0.2, 0.52, 0.2]} position={[0.42, 0.52, 0]} rotation={[-0.9, 0, -0.14]} color={0x486d9b} />
      <ZombiePart name="procedural-face-leg-left" size={[0.23, 0.54, 0.27]} position={[-0.16, -0.28, 0]} color={0x313d5c} />
      <ZombiePart name="procedural-face-leg-right" size={[0.23, 0.54, 0.27]} position={[0.16, -0.28, 0]} color={0x313d5c} />
    </group>
  )
}

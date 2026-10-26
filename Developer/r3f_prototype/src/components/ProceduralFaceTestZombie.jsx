import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, inflateScale } from '../lib/toon.js'
import { composeStudioPartPosition, composeStudioPartRotation } from './StudioTunedGroup.jsx'

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

function ZombiePart({ name, partRef = null, size, position, rotation = [0, 0, 0], color, emissive = 0.1, outlineScale = 1.07, children = null }) {
  const geometry = getCachedBoxGeo(...size)
  const outlineMaterial = getSharedOutlineMat()
  const material = getCachedToonMat(color, emissive)
  const outline = inflateScale(outlineScale)

  return (
    <group ref={partRef} name={name} position={position} rotation={rotation}>
      <group name={`${name}-visual`}>
        <mesh renderOrder={2} geometry={geometry} material={material}>
          <mesh renderOrder={1} geometry={geometry} material={outlineMaterial} scale={[outline, outline, outline]} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
          {children}
        </mesh>
      </group>
    </group>
  )
}

export function getProceduralFaceZombieWalkPose(timeSeconds) {
  const t = Number.isFinite(timeSeconds) ? timeSeconds : 0
  const stride = Math.sin(t * 7.0)
  const arm = Math.sin(t * 2.8)
  const head = Math.sin(t * 1.6)
  const bob = Math.abs(stride)
  return {
    bodyY: 0.3 + bob * 0.028,
    bodyRotZ: stride * 0.018,
    headY: 0.86 + bob * 0.018,
    headRotZ: head * 0.07,
    armLRotX: -1.15 + arm * 0.06,
    armRRotX: -1.15 - arm * 0.06,
    legLRotX: stride * 0.38,
    legRRotX: -stride * 0.38,
  }
}

function setComposedRotationX(object, target) {
  if (!object) return
  const base = object.userData?.studioPartBaseRotation?.x ?? 0
  object.rotation.x = composeStudioPartRotation(object, 'x', 0, target - base)
}

function setComposedRotationZ(object, target) {
  if (!object) return
  const base = object.userData?.studioPartBaseRotation?.z ?? 0
  object.rotation.z = composeStudioPartRotation(object, 'z', 0, target - base)
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
  const partsRef = useRef({})
  const reg = (key) => (node) => {
    if (node) partsRef.current[key] = node
  }

  useFrame(({ clock }) => {
    const parts = partsRef.current
    if (!parts.legL || !parts.legR) return
    const pose = getProceduralFaceZombieWalkPose(clock.getElapsedTime())
    if (parts.body) {
      parts.body.position.y = composeStudioPartPosition(parts.body, 'y', 0.3, pose.bodyY - 0.3)
      setComposedRotationZ(parts.body, pose.bodyRotZ)
    }
    if (parts.head) {
      parts.head.position.y = composeStudioPartPosition(parts.head, 'y', 0.86, pose.headY - 0.86)
      setComposedRotationZ(parts.head, pose.headRotZ)
    }
    setComposedRotationX(parts.armL, pose.armLRotX)
    setComposedRotationX(parts.armR, pose.armRRotX)
    setComposedRotationX(parts.legL, pose.legLRotX)
    setComposedRotationX(parts.legR, pose.legRRotX)
  })

  return (
    <group name="procedural-face-test-zombie">
      <ZombiePart partRef={reg('head')} name="procedural-face-head" size={[0.56, 0.5, 0.48]} position={[0, 0.86, 0]} color={0x568a55} emissive={0.11}>
        <ProceduralFace />
      </ZombiePart>
      <ZombiePart partRef={reg('body')} name="procedural-face-body" size={[0.6, 0.62, 0.42]} position={[0, 0.3, 0]} color={0x486d9b} emissive={0.12} outlineScale={1.09} />
      <ZombiePart partRef={reg('armL')} name="procedural-face-arm-left" size={[0.2, 0.52, 0.2]} position={[-0.42, 0.52, 0]} rotation={[-1.15, 0, 0.14]} color={0x486d9b} />
      <ZombiePart partRef={reg('armR')} name="procedural-face-arm-right" size={[0.2, 0.52, 0.2]} position={[0.42, 0.52, 0]} rotation={[-1.15, 0, -0.14]} color={0x486d9b} />
      <ZombiePart partRef={reg('legL')} name="procedural-face-leg-left" size={[0.23, 0.54, 0.27]} position={[-0.16, -0.28, 0]} color={0x313d5c} />
      <ZombiePart partRef={reg('legR')} name="procedural-face-leg-right" size={[0.23, 0.54, 0.27]} position={[0.16, -0.28, 0]} color={0x313d5c} />
    </group>
  )
}

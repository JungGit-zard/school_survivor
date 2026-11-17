import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../store/useGameStore.js'
import { playerPos } from '../../lib/refs.js'
import { createChibikoTrail, getChibikoTrailTarget, recordChibikoTrailPoint } from '../../lib/chibiko.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import MiniHealthBar from '../MiniHealthBar.jsx'
import StudioTunedGroup, { composeStudioPartPosition, composeStudioPartRotation } from '../StudioTunedGroup.jsx'
import {
  INUCON_CONTACT_PULSE_INTERVAL_MS,
  INUCON_HEAL_INTERVAL_MS,
  INUCON_TRAIL_FOLLOW_DISTANCE,
  computeInuconHealAmount,
  createInuconBiteDragConfig,
  resolveInucon,
  shouldRenderInuconCompanion,
  shouldRunInuconSupport,
} from '../../lib/inucon.js'
import { subscribeInuconGuard } from '../../lib/inuconGuard.js'
import { createBinbunShellMaterial } from '../../lib/vfxShaders.js'

// 외곽선 두께 균일화(Terry 2026-11-15 점검): 예전엔 파츠마다 헐을 x·y·z 같은 배율로 키워서
// 두께가 파츠 크기에 비례했다(긴 몸통 위아래는 두껍고 가는 팔다리는 거의 안 보임).
// 인버티드 헐 방식은 그대로 두고, 축마다 배율을 따로 잡아 모든 파츠 겉면에서 같은 두께가 되게 한다.
// 두께 = INUCON_OUTLINE_BASE_THICKNESS × OUTLINE_THICKNESS_MULT(전역 곱수) 모델 단위.
export const INUCON_OUTLINE_BASE_THICKNESS = 0.02

export function computeEvenOutlineScale(halfExtents, parentScale = [1, 1, 1], base = INUCON_OUTLINE_BASE_THICKNESS) {
  return inflateScale(halfExtents.map((half, axis) => 1 + base / Math.max(1e-4, half * (parentScale[axis] ?? 1))))
}

function geometryHalfExtents(geometry) {
  geometry.computeBoundingBox()
  const size = geometry.boundingBox.getSize(new THREE.Vector3())
  return [size.x / 2, size.y / 2, size.z / 2]
}

function useEvenOutlineScale(geometry, parentScale) {
  const key = parentScale ? parentScale.join(',') : '1,1,1'
  return useMemo(() => computeEvenOutlineScale(geometryHalfExtents(geometry), parentScale), [geometry, key])
}

function Part({ size, position, rotation = [0, 0, 0], material, outlineMaterial, geometry = null }) {
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  // prop으로 넘긴 지오메트리는 R3F가 정리하지 않는다. 직접 만든 것만 직접 정리한다.
  useEffect(() => () => boxGeometry.dispose(), [boxGeometry])
  const actualGeometry = geometry ?? boxGeometry
  const outlineScale = useEvenOutlineScale(actualGeometry)
  return (
    <group position={position} rotation={rotation}>
      {outlineMaterial && <mesh renderOrder={0} geometry={actualGeometry} material={outlineMaterial} scale={outlineScale} userData={{ studioRenderOutline: true }} />}
      <mesh renderOrder={2} geometry={actualGeometry} material={material} />
    </group>
  )
}

function BlobPart({ size, position, rotation = [0, 0, 0], material, outlineMaterial, cornerRatio = 0.18 }) {
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
  useEffect(() => () => geometry.dispose(), [geometry])
  const outlineScale = useEvenOutlineScale(geometry)
  return (
    <group position={position} rotation={rotation}>
      {outlineMaterial && <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={outlineScale} userData={{ studioRenderOutline: true }} />}
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function CapsulePart({ radius = 0.08, length = 0.5, position, rotation = [0, 0, 0], scale = [1, 1, 1], material, outlineMaterial }) {
  const geometry = useMemo(() => new THREE.CapsuleGeometry(radius, length, 1, 8), [radius, length])
  useEffect(() => () => geometry.dispose(), [geometry])
  // 그룹 scale(납작하게 누른 축)까지 반영해 월드에서 같은 두께가 되게 한다.
  const outlineScale = useEvenOutlineScale(geometry, scale)
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {outlineMaterial && <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={outlineScale} userData={{ studioRenderOutline: true }} />}
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function TriEar({ position, rotation = [0, 0, 0], material, outlineMaterial }) {
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
  useEffect(() => () => geometry.dispose(), [geometry])
  return <Part size={[1, 1, 1]} position={position} rotation={rotation} material={material} outlineMaterial={outlineMaterial} geometry={geometry} />
}

const INUCON_FACE_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const INUCON_FACE_FRAGMENT_SHADER = `
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
    // 원본 레퍼런스처럼 색을 거의 쓰지 않고, 검은 선/점만 얼굴 앞면에 얹는다.
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

function InuconProceduralFace() {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  usePlayingFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  // 머리 블롭 앞면(z 0.23) 바로 앞. 예전 z 0.525는 머리 앞 0.29 허공에 떠서 비스듬히 보면 눈이 머리 밖에 그려졌다.
  return (
    <mesh
      position={[0, 1.265, INUCON_FACE_Z]}
      renderOrder={4}
      userData={{ studioNonFocusable: true, studioNonTunable: true }}
    >
      <planeGeometry args={[0.74, 0.58]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={INUCON_FACE_VERTEX_SHADER}
        fragmentShader={INUCON_FACE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export const INUCON_HEAD_FRONT_Z = 0.23
export const INUCON_FACE_Z = 0.24

// 기절(영혼) 비주얼 사양. 순수 값이라 jsdom 테스트가 R3F 렌더 없이 검증한다.
// 2026-11-15: 0.45 반투명 + 5단 툰은 회색으로 읽히고 몸 안쪽 파츠가 비쳤다 → 밝은 2단 그라데이션 +
// 깊이 기록(depthWrite)으로 "한 덩어리" 흰 유령. 불투명 큐에서 앞→뒤로 그려져 가려진 안쪽 면은 깊이 테스트에서 버려진다.
export const INUCON_GHOST_OPACITY = 0.72
export const INUCON_GHOST_FLOAT_AMPLITUDE = 0.06
export const INUCON_HALO_RADIUS = 0.22
export const INUCON_HALO_TUBE = 0.03
// 머리 블롭 윗면(y≈1.57)에서 약 0.25u 위.
export const INUCON_HALO_Y = 1.82

export function getInuconVisualState(fainted) {
  const ghost = fainted === true
  return {
    fainted: ghost,
    opacity: ghost ? INUCON_GHOST_OPACITY : 1,
    // 유령도 transparent=false(불투명 큐: 앞→뒤 정렬)로 두고 CustomBlending으로만 반투명하게 섞는다.
    transparent: false,
    depthWrite: true,
    halo: ghost,
  }
}

// levelmini가 store에 넣을 런타임 상태 경로: useGameStore.getState().inucon.fainted (boolean).
export const selectInuconFainted = (s) => s.inucon?.fainted === true

// 유령 전용 2단 밝은 그라데이션(그늘도 연한 하늘빛 흰색). 5단 기본 그라데이션의 검정 단계가 회색·검은 테두리로 보였다.
// 유령 깊이 선행 파츠: root 자식 0번(머리)·4번(몸통).
export const INUCON_GHOST_FIRST_PART_INDICES = Object.freeze([0, 4])
export const INUCON_GHOST_GRADIENT = Object.freeze(['#dfe6f7', '#ffffff'])
let ghostGradientTexture = null
function getInuconGhostGradient() {
  if (ghostGradientTexture) return ghostGradientTexture
  const canvas = document.createElement('canvas')
  canvas.width = INUCON_GHOST_GRADIENT.length
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  INUCON_GHOST_GRADIENT.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(i, 0, 1, 1)
  })
  ghostGradientTexture = new THREE.CanvasTexture(canvas)
  ghostGradientTexture.minFilter = ghostGradientTexture.magFilter = THREE.NearestFilter
  ghostGradientTexture.generateMipmaps = false
  ghostGradientTexture.colorSpace = THREE.SRGBColorSpace
  return ghostGradientTexture
}

function ghostToonMat() {
  const { opacity, transparent, depthWrite } = getInuconVisualState(true)
  // toonMat의 stencil 설정(외곽선 헐 마스킹)은 그대로 쓰고 그라데이션만 유령용으로 바꾼다.
  const m = toonMat(0xffffff, 0.12)
  m.gradientMap = getInuconGhostGradient()
  m.toneMapped = false
  m.transparent = transparent
  m.opacity = opacity
  m.depthWrite = depthWrite
  m.blending = THREE.CustomBlending
  m.blendEquation = THREE.AddEquation
  m.blendSrc = THREE.SrcAlphaFactor
  m.blendDst = THREE.OneMinusSrcAlphaFactor
  return m
}

export function InuconModel({ fainted: faintedProp } = {}) {
  const parts = useRef({})
  const storeFainted = useGameStore(selectInuconFainted)
  const fainted = typeof faintedProp === 'boolean' ? faintedProp : storeFainted
  // 두 세트를 한 번만 만들고 fainted 전환 시 참조만 바꾼다(매 프레임 생성 금지).
  const normalMats = useMemo(() => ({
    outline: outlineMat(0.97),
    dog: toonMat(0xf0a542, 0.055),
    dogShade: toonMat(0xd4872e, 0.045),
    scarf: toonMat(0xc58cff, 0.08),
  }), [])
  const ghostMats = useMemo(() => {
    const body = ghostToonMat()
    return { outline: outlineMat(0.22, 0xb8c4e8), dog: body, dogShade: body, scarf: body }
  }, [])
  const { outline, dog: dogMat, dogShade: dogShadeMat, scarf: scarfMat } = fainted ? ghostMats : normalMats
  useEffect(() => () => {
    Object.values(normalMats).forEach((material) => material.dispose())
    new Set(Object.values(ghostMats)).forEach((material) => material.dispose())
  }, [normalMats, ghostMats])

  const reg = (key) => (el) => { if (el) parts.current[key] = el }

  // 유령일 때 머리(0번)·몸통(4번)을 먼저 그려 깊이를 채운다. 그 뒤에 그리는 팔·다리·꼬리·목도리의
  // 몸 안쪽 부분은 깊이 테스트에서 버려져 비쳐 보이지 않는다. 평소엔 전부 2(재마운트 때 기본값)다.
  useLayoutEffect(() => {
    const root = parts.current.root
    if (!root) return
    root.children.forEach((child, index) => {
      const order = fainted && INUCON_GHOST_FIRST_PART_INDICES.includes(index) ? 1 : 2
      child.traverse((object) => {
        if (object.isMesh && !object.userData.studioRenderOutline && !object.userData.studioNonTunable) object.renderOrder = order
      })
    })
  }, [fainted])

  usePlayingFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (fainted) {
      // 걷기 bob·꼬리 wag·손 흔들기 정지, 전체가 천천히 둥실.
      if (parts.current.root) {
        parts.current.root.position.y = composeStudioPartPosition(parts.current.root, 'y', 0, Math.sin(t * 1.6) * INUCON_GHOST_FLOAT_AMPLITUDE)
        parts.current.root.rotation.z = composeStudioPartRotation(parts.current.root, 'z', 0, 0)
      }
      if (parts.current.tail) parts.current.tail.rotation.y = composeStudioPartRotation(parts.current.tail, 'y', 0, 0)
      if (parts.current.armR) parts.current.armR.rotation.z = composeStudioPartRotation(parts.current.armR, 'z', 0, 0)
      if (parts.current.armL) parts.current.armL.rotation.z = composeStudioPartRotation(parts.current.armL, 'z', 0, 0)
      if (parts.current.halo) parts.current.halo.position.y = INUCON_HALO_Y + Math.sin(t * 2.4) * 0.03
      return
    }
    const bob = Math.sin(t * 4.4) * 0.035
    const wag = Math.sin(t * 8.5) * 0.34
    const wave = Math.sin(t * 4.8) * 0.055
    if (parts.current.root) {
      parts.current.root.position.y = composeStudioPartPosition(parts.current.root, 'y', 0, bob)
      parts.current.root.rotation.z = composeStudioPartRotation(parts.current.root, 'z', 0, Math.sin(t * 3.1) * 0.045)
    }
    if (parts.current.tail) parts.current.tail.rotation.y = composeStudioPartRotation(parts.current.tail, 'y', 0, wag)
    if (parts.current.armR) parts.current.armR.rotation.z = composeStudioPartRotation(parts.current.armR, 'z', 0, wave * 0.5)
    if (parts.current.armL) parts.current.armL.rotation.z = composeStudioPartRotation(parts.current.armL, 'z', 0, -wave * 0.25)
  })

  // 기절/회복 때 재질 세트가 통째로 바뀐다. Studio 튜닝은 마운트 때 재질에 입혀지므로,
  // 세트가 바뀌면 튜닝 서브트리를 다시 마운트해 새 재질에도 튜닝이 다시 걸리게 한다.
  return (
    <StudioTunedGroup key={fainted ? 'ghost' : 'normal'} itemId="weapon-inucon">
      <group ref={reg('root')}>
        {/* 레퍼런스 기준: 세로로 긴 주황 강아지 + 굵은 검은 손그림 외곽선 + 양팔 A포즈. */}
        <BlobPart size={[0.62, 0.58, 0.46]} position={[0, 1.28, 0]} material={dogMat} outlineMaterial={outline} />
        <TriEar position={[-0.2, 1.64, 0.02]} rotation={[0, 0, -0.22]} material={dogMat} outlineMaterial={outline} />
        <TriEar position={[0.23, 1.63, 0.02]} rotation={[0, 0, 0.26]} material={dogMat} outlineMaterial={outline} />
        <InuconProceduralFace />
        <BlobPart size={[0.42, 1.5, 0.36]} position={[-0.02, 0.43, 0]} material={dogMat} outlineMaterial={outline} />
        {/* 목도리: 몸통(중심 x -0.02, 폭 0.42, 깊이 0.36)에 맞춘 좌우 대칭 띠. 폭 0.46(양쪽 0.02씩), 깊이 0.48로 목을 감싼다.
            예전엔 x -0.1로 치우치고 몸 안에 묻혀 왼쪽에만 보라색 혹이 튀어나왔다. 자식 순서(5번) 그대로. */}
        <CapsulePart radius={0.06} length={0.34} position={[-0.02, 0.94, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 4]} material={scarfMat} outlineMaterial={outline} />
        {/* A포즈: 어깨(y 1.02, x ±0.2) 피벗에서 아래로 0.53u 캡슐, 바깥으로 0.5rad(29°) 기울임. 양팔 동일 길이. */}
        <group ref={reg('armR')} position={[0.2, 1.02, 0.03]} rotation={[0, 0, 0.5]}>
          <CapsulePart radius={0.065} length={0.4} position={[0, -0.26, 0]} scale={[1, 1, 0.82]} material={dogMat} outlineMaterial={outline} />
        </group>
        <group ref={reg('armL')} position={[-0.2, 1.02, 0.03]} rotation={[0, 0, -0.5]}>
          <CapsulePart radius={0.065} length={0.4} position={[0, -0.26, 0]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} />
        </group>
        <CapsulePart radius={0.06} length={0.22} position={[-0.14, -0.34, 0]} rotation={[0, 0, -0.12]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} />
        <CapsulePart radius={0.06} length={0.22} position={[0.09, -0.34, 0]} rotation={[0, 0, 0.12]} scale={[1, 1, 0.82]} material={dogMat} outlineMaterial={outline} />
        {/* 꼬리: 엉덩이 뒷면(y 0.02, z -0.16) 피벗에서 뒤·위 45°로 뻗고 좌우(y축)로 흔든다.
            예전 꼬리는 어깨 높이(y 0.96) 몸 정면 평면에서 옆으로 뻗고 z축으로 위아래 흔들려
            정면에서 "세 번째 팔"처럼 보였다(Terry 2026-11-15 "옛 팔이 남아 있다"). 자식 순서(10번)는 그대로다. */}
        <group ref={reg('tail')} position={[-0.02, 0.02, -0.16]}>
          <CapsulePart radius={0.055} length={0.26} position={[0, 0.13, -0.13]} rotation={[-Math.PI / 4, 0, 0]} scale={[0.86, 1, 1]} material={dogMat} outlineMaterial={outline} />
        </group>
        {/* 기절 시 천사 고리. root의 마지막 자식이라 Studio 숫자 파츠 경로를 밀지 않는다. */}
        {fainted && (
          <mesh ref={reg('halo')} name="inucon-halo" position={[0, INUCON_HALO_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5} userData={{ studioNonFocusable: true, studioNonTunable: true }}>
            <torusGeometry args={[INUCON_HALO_RADIUS, INUCON_HALO_TUBE, 10, 40]} />
            <meshBasicMaterial color="#fff6c4" transparent opacity={0.8} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>
    </StudioTunedGroup>
  )
}

export const INUCON_COMPANION_SCALE = 0.36
// 발바닥(모델 y -0.51)이 바닥 위에 서도록 올리는 높이. 걷기 bob(±0.025)과 모델 bob(±0.035×0.36)이
// 동시에 가장 낮을 때도 발이 바닥(y≈0) 아래로 내려가지 않게 (0.51+0.035)×0.36 + 0.025 ≈ 0.221 → 0.225.
// 예전 0.15는 발이 0.03 묻혔다(가장 낮을 땐 0.07).
export const INUCON_FOOT_MODEL_Y = -0.51
export const INUCON_GROUND_Y = 0.225
export const INUCON_PUSH_VFX_DURATION_MS = 420
export const INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER = 1

function setInuconPushEffectOpacity(object, opacity) {
  if (!object) return
  if (object.material) object.material.opacity = opacity
  for (const child of object.children ?? []) setInuconPushEffectOpacity(child, opacity)
}

function InuconPushEffect({ token = 0, radius = 0 }) {
  const groupRef = useRef(null)
  const ringRef = useRef(null)
  const flashRef = useRef(null)
  const lastTokenRef = useRef(token)
  const elapsedMsRef = useRef(INUCON_PUSH_VFX_DURATION_MS)

  usePlayingFrame((_, delta) => {
    if (token !== lastTokenRef.current) {
      lastTokenRef.current = token
      elapsedMsRef.current = 0
      if (groupRef.current) groupRef.current.visible = true
    }

    const group = groupRef.current
    if (!group) return
    elapsedMsRef.current += delta * 1000
    const t = Math.min(1, elapsedMsRef.current / INUCON_PUSH_VFX_DURATION_MS)
    if (t >= 1) {
      group.visible = false
      return
    }

    group.position.set(playerPos.x, 0.17, playerPos.z)
    const pulse = Math.sin(t * Math.PI)
    const opacity = Math.max(0, 1 - t) * 0.82
    setInuconPushEffectOpacity(group, opacity)
    if (ringRef.current) {
      const ringScale = INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER * (0.22 + t * 0.78)
      ringRef.current.scale.setScalar(Math.max(0.01, radius * ringScale))
    }
    if (flashRef.current) {
      flashRef.current.scale.setScalar(Math.max(0.01, radius * (0.16 + pulse * 0.18)))
    }
  })

  return (
    <group ref={groupRef} visible={false} position={[0, 0.17, 0]} userData={{ studioNonFocusable: true, studioNonTunable: true }}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.035, 10, 64]} />
        <meshBasicMaterial color="#fff4a8" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={flashRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 1, 48]} />
        <meshBasicMaterial color="#ffcf5a" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh key={angle} position={[Math.sin(angle) * radius, 0.02, Math.cos(angle) * radius]} rotation={[0, angle, 0]}>
          <coneGeometry args={[0.085, 0.28, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// 가드(대신 맞기) 이펙트 — Terry 2026-11-15 "아주 깔끔하고 단순하게", then the same day Terry picked the
// Binbun3D Battle FX shield shell (fresnel, 3-step toon, CC0) from the VFX trial to replace the canvas ring.
// Meshes: one open hemisphere shell on the player (no dark rim — Terry's no-outline rule removed the old
// #140c18 ring stroke) + the "멍!멍!" text above Inucon. visible=false when idle (0 draw calls), 2 at most.
// Unlit ShaderMaterial / MeshBasicMaterial, toneMapped false, normal blending, no particles or glow.
export const INUCON_GUARD_RING_DURATION_MS = 600
export const INUCON_GUARD_TEXT_DURATION_MS = 650
export const INUCON_GUARD_BARK_TEXT = '멍!멍!'
export const INUCON_GUARD_SHELL_RADIUS = 0.62
const GUARD_TEXT_CANVAS_W = 192
const GUARD_TEXT_CANVAS_H = 72
const GUARD_TEXT_WORLD_H = 0.34
const GUARD_TEXT_Y_ABOVE_INUCON = 1.15

// Damage-number style lettering (bold + stroke + bright fill), but the stroke is the shield blue, not dark ink,
// per Terry's 2026-11-15 "no black/dark outline on any effect" rule.
function createGuardTextTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = GUARD_TEXT_CANVAS_W
  canvas.height = GUARD_TEXT_CANVAS_H
  const ctx = canvas.getContext('2d')
  const fontPx = 40
  ctx.font = `900 ${fontPx}px "Arial Black", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#3aa0ff'
  ctx.lineWidth = fontPx * 0.3
  ctx.strokeText(INUCON_GUARD_BARK_TEXT, GUARD_TEXT_CANVAS_W / 2, GUARD_TEXT_CANVAS_H / 2 + 1)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(INUCON_GUARD_BARK_TEXT, GUARD_TEXT_CANVAS_W / 2, GUARD_TEXT_CANVAS_H / 2 + 1)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 순수 프레임 값(jsdom 테스트용). t = 경과 ms.
export function computeInuconGuardFrame(t) {
  const ringT = Math.min(1, Math.max(0, t / INUCON_GUARD_RING_DURATION_MS))
  const textT = Math.min(1, Math.max(0, t / INUCON_GUARD_TEXT_DURATION_MS))
  const ringE = Math.min(1, ringT * 2)
  const ringEase = 1 - (1 - ringE) * (1 - ringE)
  return {
    // Binbun shell (trial S.guard 'binbun'): scale 0.8 + 0.2·ease(2p), alpha decay after half life.
    ringVisible: t < INUCON_GUARD_RING_DURATION_MS,
    ringScale: 0.8 + 0.2 * ringEase,
    ringOpacity: ringT < 0.5 ? 1 : Math.max(0, 1 - (ringT - 0.5) * 2),
    shellDecay: Math.max(0, (ringT - 0.5) * 2),
    textVisible: t < INUCON_GUARD_TEXT_DURATION_MS,
    textScale: textT < 0.15 ? 0.6 + (textT / 0.15) * 0.5 : textT < 0.25 ? 1.1 - ((textT - 0.15) / 0.1) * 0.1 : 1,
    textRise: 0.12 * textT,
    textOpacity: textT < 0.7 ? 1 : Math.max(0, 1 - (textT - 0.7) / 0.3),
  }
}

export function InuconGuardEffect({ inuconPosRef }) {
  const ringRef = useRef(null)
  const textRef = useRef(null)
  const pendingRef = useRef(false)
  const stateRef = useRef({ active: false, elapsedMs: 0 })
  const assets = useMemo(() => {
    const textTexture = createGuardTextTexture()
    return {
      textTexture,
      ringGeometry: new THREE.SphereGeometry(INUCON_GUARD_SHELL_RADIUS, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      textGeometry: new THREE.PlaneGeometry(GUARD_TEXT_WORLD_H * (GUARD_TEXT_CANVAS_W / GUARD_TEXT_CANVAS_H), GUARD_TEXT_WORLD_H),
      ringMaterial: createBinbunShellMaterial(),
      textMaterial: new THREE.MeshBasicMaterial({ map: textTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }),
    }
  }, [])
  useEffect(() => () => {
    Object.values(assets).forEach((resource) => resource.dispose())
  }, [assets])
  // store가 inuconBark emit 직후 같은 호출 안에서 알린다 → 다음 프레임에 링·글자가 함께 시작한다.
  useEffect(() => subscribeInuconGuard(() => { pendingRef.current = true }), [])

  usePlayingFrame(({ camera }, delta) => {
    const state = stateRef.current
    if (pendingRef.current) {
      state.active = true
      state.elapsedMs = 0
      pendingRef.current = false
    }
    const ring = ringRef.current
    const text = textRef.current
    if (!ring || !text) return
    if (!state.active) {
      ring.visible = false
      text.visible = false
      return
    }
    state.elapsedMs += delta * 1000
    const frame = computeInuconGuardFrame(state.elapsedMs)
    ring.visible = frame.ringVisible
    if (frame.ringVisible) {
      ring.position.set(playerPos.x, 0, playerPos.z)
      ring.scale.setScalar(frame.ringScale)
      assets.ringMaterial.uniforms.decay.value = frame.shellDecay
    }
    text.visible = frame.textVisible
    if (text.visible) {
      const p = inuconPosRef.current
      text.position.set(p.x, GUARD_TEXT_Y_ABOVE_INUCON + frame.textRise, p.z)
      text.quaternion.copy(camera.quaternion)
      text.scale.setScalar(frame.textScale)
      assets.textMaterial.opacity = frame.textOpacity
    }
    if (!frame.ringVisible && !frame.textVisible) state.active = false
  })

  return (
    <>
      <mesh ref={ringRef} visible={false} geometry={assets.ringGeometry} material={assets.ringMaterial} renderOrder={6} userData={{ studioNonFocusable: true, studioNonTunable: true }} />
      <mesh ref={textRef} visible={false} geometry={assets.textGeometry} material={assets.textMaterial} renderOrder={1001} frustumCulled={false} userData={{ studioNonFocusable: true, studioNonTunable: true }} />
    </>
  )
}

export function InuconWeapon() {
  const groupRef = useRef()
  const yawRef = useRef()
  const posRef = useRef(new THREE.Vector3())
  const targetRef = useRef(new THREE.Vector3())
  const trailRef = useRef(createChibikoTrail())
  const initializedRef = useRef(false)
  const lastHealAtRef = useRef(null)
  const lastPushAtRef = useRef(null)
  const [pushVfx, setPushVfx] = useState({ token: 0, radius: 0 })
  const weapons = useGameStore((s) => s.weapons)
  const healPlayer = useGameStore((s) => s.healPlayer)
  const fainted = useGameStore(selectInuconFainted)
  const inuconHp = useGameStore((s) => resolveInucon(s)?.hp ?? 0)
  const inuconMaxHp = useGameStore((s) => resolveInucon(s)?.maxHp ?? 0)
  const active = shouldRenderInuconCompanion(weapons)

  usePlayingFrame(({ clock }, delta) => {
    if (!active || !groupRef.current || !yawRef.current) return
    const w = weapons.inucon ?? {}
    const now = clock.elapsedTime * 1000
    if (lastHealAtRef.current === null) lastHealAtRef.current = now
    if (lastPushAtRef.current === null) lastPushAtRef.current = now - INUCON_CONTACT_PULSE_INTERVAL_MS

    recordChibikoTrailPoint(trailRef.current, playerPos, now)
    const follow = getChibikoTrailTarget(trailRef.current, now, { followDistance: w.followDistance ?? INUCON_TRAIL_FOLLOW_DISTANCE })
    targetRef.current.set(follow.x, follow.y, follow.z)
    if (!initializedRef.current) { posRef.current.copy(targetRef.current); initializedRef.current = true }

    const moveX = targetRef.current.x - posRef.current.x
    const moveZ = targetRef.current.z - posRef.current.z
    posRef.current.lerp(targetRef.current, Math.min(1, delta * 6.4))
    const bob = fainted ? 0 : Math.sin(clock.elapsedTime * 4.4) * 0.025
    groupRef.current.position.set(posRef.current.x, INUCON_GROUND_Y + bob, posRef.current.z)
    // 회전은 모델 그룹에만 준다. 미니 체력바는 카메라 빌보드라 부모 회전을 받으면 안 된다.
    const trailYaw = Math.hypot(moveX, moveZ) > 0.001 ? Math.atan2(moveX, moveZ) : yawRef.current.rotation.y
    let diff = trailYaw - yawRef.current.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    yawRef.current.rotation.y += diff * Math.min(1, delta * 9)

    // Terry 2026-10-31: 기절(유령) 중엔 따라다니기만 하고 밀어내기·물기·회복은 멈춘다.
    if (!shouldRunInuconSupport(fainted)) {
      useGameStore.getState().updateInucon()
      return
    }

    const biteDrag = createInuconBiteDragConfig(w)
    if (now - lastPushAtRef.current >= biteDrag.pulseIntervalMs) {
      const hits = applyRadialDamage({
        x: playerPos.x, z: playerPos.z, radius: biteDrag.radius, damage: biteDrag.damage,
        knockback: biteDrag.knockback, knockbackMs: biteDrag.knockbackMs, ignoreSightBlock: true, weaponKey: 'inucon',
      })
      if (hits > 0) {
        const triggerInuconPushVfx = (radius) => {
          setPushVfx((current) => ({ token: current.token + 1, radius }))
        }
        triggerInuconPushVfx(biteDrag.radius)
        lastPushAtRef.current = now
        emitSfx({ id: 'inuconBite', volume: 0.52, rate: 0.96 + Math.random() * 0.08 })
      } else lastPushAtRef.current = now - biteDrag.pulseIntervalMs + 100
    }

    const healIntervalMs = Number.isFinite(w.healIntervalMs) ? w.healIntervalMs : INUCON_HEAL_INTERVAL_MS
    if (now - lastHealAtRef.current >= healIntervalMs) {
      const player = useGameStore.getState().player
      const healAmount = computeInuconHealAmount(player.maxHp, w.healPercent)
      lastHealAtRef.current = now
      if (healAmount > 0) {
        healPlayer(healAmount)
        if (player.hp < player.maxHp) {
          emitSfx({ id: 'inuconHeal', volume: 0.44, rate: 0.98 + Math.random() * 0.06 })
          useGameStore.getState().recordMissionEvent({ type: 'companion_heal', companionId: 'inucon' })
        }
      }
    }
  })

  if (!active) {
    initializedRef.current = false
    lastHealAtRef.current = null
    lastPushAtRef.current = null
    trailRef.current.length = 0
  }

  // 가드 이펙트(방패 껍질 + "멍!멍!" 글자)는 이누콘이 없을 때도 숨긴 채(visible=false, 드로콜 0) 같은 자리에 붙여 둔다:
  // 스테이지 진입 예열(gl.compileAsync — three r164 compile은 숨은 메시도 traverse한다)이 두 셰이더를 함께 컴파일해
  // 첫 대신 맞기 순간에 멈추지 않는다. 자리를 바꾸지 않으므로 이누콘을 얻어도 다시 마운트(재질 재생성)되지 않는다.
  return (
    <>
      {active && (
        <group ref={groupRef} scale={[INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE]}>
          <group ref={yawRef}><InuconModel fainted={fainted} /></group>
          {/* 머리(1.64)·유령 고리(1.82) 위. 부모 스케일 0.36 기준이라 월드 폭 ≈0.30u. 기절 중 숨김. */}
          {!fainted && inuconMaxHp > 0 && <MiniHealthBar current={inuconHp} max={inuconMaxHp} width={0.84} height={0.14} y={2.0} />}
        </group>
      )}
      {active && <InuconPushEffect token={pushVfx.token} radius={pushVfx.radius} />}
      <InuconGuardEffect inuconPosRef={posRef} />
    </>
  )
}

// Stage 5 B10 「교감 좀비」 / Stage 6 B05 「교장 선생님 좀비」 — Kenney Mini 보스 메시(Terry 2026-11-21 "둘 다 안 A").
//
// 몸·색판·외곽선은 Mini 좀비(MiniZombieLayer)와 같은 GLB·같은 재질 규약이다. 보스는 한 마리씩이라 인스턴싱 없이 그린다
// (파트 6개 × 몸·외곽선 = 12 + SDF 얼굴 1, 정지 포즈 소품 +2). 게임 수치(HP·속도·크기·접촉 거리·공격)는 건드리지 않는다.
// 포즈는 Enemy.jsx가 넘기는 animPhase(normal/warn/charge/special/stun)를 lib/miniBossRoster.js 포즈 표로 옮겨 보간한다.
// 예전 모델(B10ViceBossMesh, 확장 리그 B05)은 지우지 않는다 — GLB를 읽는 동안·실패 시 ZombieMesh가 그 모델을 대신 그린다.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import miniZombiesUrl from '../assets/models/kenney_mini/mini_zombies_kenney.glb?url'
import { getFlashMat, getToonGradient } from '../lib/toon.js'
import { createOutlineGeometry } from '../lib/projectileZombieShotGeometry.js'
import { getMiniBossAssets } from '../lib/miniBossGeometry.js'
import { getMiniBossVisual, MINI_BOSS_POSES } from '../lib/miniBossRoster.js'
import { B10_FACE_FRAGMENT_SHADER } from './B10ViceBossMesh.jsx'
import { composeStudioPartPosition, composeStudioPartRotation } from './StudioTunedGroup.jsx'

export const MINI_BOSS_GLB_URL = miniZombiesUrl
const OUTLINE_STENCIL = 1
const disableRaycast = () => null

// Mini 좀비 레이어와 같은 툰 재질·스텐실 외곽선 값(아틀라스 1장당 1벌).
const materialCache = new WeakMap()
export function getMiniBossMaterials(atlas) {
  const key = atlas ?? materialCache
  let entry = materialCache.get(key)
  if (entry) return entry
  const body = new THREE.MeshToonMaterial({ color: 0xffffff, map: atlas ?? null, emissive: 0xffffff, emissiveMap: atlas ?? null, emissiveIntensity: 0.16, gradientMap: getToonGradient() })
  body.name = 'mini-boss-toon'
  body.stencilWrite = true; body.stencilRef = OUTLINE_STENCIL; body.stencilFunc = THREE.AlwaysStencilFunc; body.stencilZPass = THREE.ReplaceStencilOp
  const outline = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: 0.96, depthWrite: false })
  outline.name = 'mini-boss-outline'
  outline.stencilWrite = true; outline.stencilRef = OUTLINE_STENCIL; outline.stencilFunc = THREE.NotEqualStencilFunc
  entry = { body, outline }
  materialCache.set(key, entry)
  return entry
}

// B05 엄한 얼굴: 동그란 눈(안경 고리 안), 치켜뜬 눈썹, 훈화하듯 동그랗게 벌린 입. 경고(warn) 때 눈이 공통 경고색(#FF7A1A).
// B10 얼굴 셰이더와 같은 좌표 규약(p.x × 1.27, 눈 ±0.165) — 그래서 같은 얼굴 판 배치를 쓴다. 텍스처 없음.
export const B05_FACE_FRAGMENT_SHADER = /* glsl */`
uniform float uTime;
uniform float uWarn;
varying vec2 vUv;
float cov(float d) { float a = max(fwidth(d), 1e-5) * 0.75; return 1.0 - smoothstep(-a, a, d); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdEll(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float stroke(float d, float w) { return cov(d - max(w, 0.75 * fwidth(d))); }
void main() {
  vec2 p = vUv - 0.5;
  p.x *= 1.27;
  float blink = pow(max(0.0, sin(uTime * 0.7 + 1.3)), 30.0);
  float ry = mix(0.05, 0.008, blink);
  float eyes = max(cov(sdEll(p, vec2(-0.165, 0.035), vec2(0.05, ry))), cov(sdEll(p, vec2(0.165, 0.035), vec2(0.05, ry))));
  float pupils = max(cov(sdEll(p, vec2(-0.165, 0.035), vec2(0.018, min(ry, 0.018)))), cov(sdEll(p, vec2(0.165, 0.035), vec2(0.018, min(ry, 0.018)))));
  float brows = max(stroke(sdSeg(p, vec2(-0.24, 0.13), vec2(-0.1, 0.15)), 0.018), stroke(sdSeg(p, vec2(0.1, 0.15), vec2(0.24, 0.13)), 0.018));
  float talk = 0.5 + 0.5 * sin(uTime * 9.0);
  float mouth = cov(sdEll(p, vec2(0.0, -0.2), vec2(0.05, mix(0.018, 0.04, talk * (0.4 + 0.6 * uWarn)))));
  vec3 eyeColor = mix(vec3(1.0, 0.95, 0.78), vec3(1.0, 0.478, 0.102), uWarn);
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  color = mix(color, eyeColor, eyes); alpha = max(alpha, eyes);
  color = mix(color, vec3(0.02), pupils * eyes * (1.0 - uWarn * 0.7));
  color = mix(color, vec3(0.06, 0.04, 0.05), brows); alpha = max(alpha, brows);
  color = mix(color, vec3(0.23, 0.05, 0.05), mouth); alpha = max(alpha, mouth);
  gl_FragColor = vec4(color, alpha);
}
`

const FACE_VERTEX_SHADER = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// 얼굴 판 배치(머리 피벗 기준, Kenney 단위). 셰이더 눈 중심(u ±0.165/1.27, v +0.035)이 Kenney 눈 조각 중심
// (male-a·male-d 모두 x ±0.0721, y 0.1417)에 오게 한 값. z = 머리 앞면(0.17, 안경알 포함) 바로 앞.
const EYE_X = 0.0721
const EYE_Y = 0.1417
const FACE_W = EYE_X / (0.165 / 1.27)
const FACE_H = FACE_W * (0.44 / 0.56)
export const MINI_BOSS_FACE_PLANE = Object.freeze({ width: FACE_W, height: FACE_H, position: Object.freeze([0, EYE_Y - 0.035 * FACE_H, 0.176]) })

function MiniBossFace({ type, warn }) {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uWarn: { value: 0 } }), [])
  useFrame(({ clock }, delta) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value = clock.getElapsedTime()
    const current = material.uniforms.uWarn.value
    material.uniforms.uWarn.value = current + ((warn ? 1 : 0) - current) * Math.min(1, delta * 10)
  })
  return (
    <mesh
      name={`miniBoss${type}ProceduralFace`}
      position={MINI_BOSS_FACE_PLANE.position}
      renderOrder={3}
      raycast={disableRaycast}
      userData={{ studioNonFocusable: true, studioNonTunable: true }}
    >
      <planeGeometry args={[MINI_BOSS_FACE_PLANE.width, MINI_BOSS_FACE_PLANE.height]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={FACE_VERTEX_SHADER}
        fragmentShader={getMiniBossVisual(type)?.face === 'stern' ? B05_FACE_FRAGMENT_SHADER : B10_FACE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function PartMesh({ name, geometry, outlineGeometry, materials, hitFlash }) {
  const bodyRef = useRef(null)
  // ZombieMesh·B10ViceBossMesh와 같은 플래시 규약: 히트 순간에만 공유 플래시 재질로 바꿔 끼운다.
  useLayoutEffect(() => {
    const mesh = bodyRef.current
    if (!hitFlash || !mesh) return undefined
    const restore = mesh.material
    mesh.material = getFlashMat()
    mesh.userData.studioNonTunable = true
    return () => { mesh.material = restore; delete mesh.userData.studioNonTunable }
  }, [hitFlash])
  return (
    <>
      {outlineGeometry && (
        <mesh name={`${name}Outline`} renderOrder={1} geometry={outlineGeometry} material={materials.outline} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
      )}
      <mesh ref={bodyRef} name={name} renderOrder={2} geometry={geometry} material={materials.body} />
    </>
  )
}

function composeRotation(object, axis, target) {
  if (!object) return
  const base = object.userData?.studioPartBaseRotation?.[axis] ?? 0
  object.rotation[axis] = composeStudioPartRotation(object, axis, 0, target - base)
}
function approach(current, target, delta, rate) { return current + (target - current) * Math.min(1, delta * rate) }

/** GLB 장면을 이미 가진 쪽(테스트·미리보기)이 바로 쓰는 본체. */
export function MiniBossModel({ type, scene, animPhase = 'normal', hitFlash = false, staticPose = false }) {
  const visual = getMiniBossVisual(type)
  const assets = useMemo(() => getMiniBossAssets(scene, type, createOutlineGeometry), [scene, type])
  const materials = useMemo(() => getMiniBossMaterials(assets?.map), [assets])
  const nodes = useRef({})
  const reg = (key) => (node) => { if (node) nodes.current[key] = node }
  const rest = MINI_BOSS_POSES[type].normal
  const state = useRef({ armL: [...rest.armL], armR: [...rest.armR], torso: [...rest.torso] })
  const pose = visual.poseFor(animPhase)
  const stunned = animPhase === 'stun'

  useEffect(() => { for (const p of assets?.built.stunProps ?? []) { const n = nodes.current[`stun:${p.name}`]; if (n) n.visible = stunned } }, [assets, stunned])

  useFrame(({ clock }, delta) => {
    if (staticPose) return
    const pt = nodes.current
    if (!pt.legL || !pt.legR || !pt.torso) return
    const t = clock.getElapsedTime()
    const s = state.current
    const windup = animPhase === 'warn' || animPhase === 'charge' || animPhase === 'special'
    const rate = windup ? 14 : 9
    for (const key of ['armL', 'armR', 'torso']) for (let a = 0; a < 3; a += 1) s[key][a] = approach(s[key][a], pose[key][a], delta, key === 'torso' ? 10 : rate)
    const walking = !stunned && !windup
    const stride = walking ? Math.sin(t * 6.2) * 0.32 : 0
    const sway = walking ? Math.sin(t * 3.1) * 0.06 : 0
    // B10 warn: 치켜든 도장이 결재 직전처럼 떨린다. stun: 종(B10)·호루라기(B05)를 톡톡.
    const jitter = animPhase === 'warn' && type === 'B10' ? Math.sin(t * 30) * 0.05 : 0
    const tap = stunned ? Math.max(0, Math.sin(t * 16)) * 0.25 : 0
    composeRotation(pt.armR, 'x', s.armR[0] + jitter - tap + sway)
    composeRotation(pt.armR, 'z', s.armR[2])
    composeRotation(pt.armL, 'x', s.armL[0] - sway)
    composeRotation(pt.armL, 'z', s.armL[2])
    composeRotation(pt.legL, 'x', stride)
    composeRotation(pt.legR, 'x', -stride)
    composeRotation(pt.torso, 'x', s.torso[0])
    pt.torso.position.y = composeStudioPartPosition(pt.torso, 'y', pt.torso.userData.miniBossPivotY ?? 0, walking ? Math.abs(Math.sin(t * 6.2)) * 0.006 : 0)
    if (pt.head) composeRotation(pt.head, 'z', walking ? Math.sin(t * 1.5) * 0.05 : 0)
  })

  if (!visual || !assets) return null
  const { built } = assets
  const byKey = Object.fromEntries(built.parts.map((p) => [p.key, p]))
  const restRotation = (key) => (key === 'armL' || key === 'armR' || key === 'torso' ? rest[key] : [0, 0, 0])
  const stunFor = (key) => built.stunProps.filter((p) => p.part === key).map((p) => (
    <group key={p.name} name={`miniBoss${type}Stun_${p.name}`} ref={reg(`stun:${p.name}`)} visible={stunned}>
      <PartMesh name={`miniBoss${type}_${p.name}`} geometry={p.geometry} outlineGeometry={p.outlineGeometry} materials={materials} hitFlash={hitFlash} />
    </group>
  ))
  const part = (key, children = null) => {
    const p = byKey[key]
    if (!p) return null
    return (
      <group key={key} name={`miniBoss${type}_${key}Rig`} ref={reg(key)} position={p.pivot} rotation={restRotation(key)} userData={{ miniBossPivotY: p.pivot[1] }}>
        <PartMesh name={`miniBoss${type}_${key}`} geometry={p.geometry} outlineGeometry={p.outlineGeometry} materials={materials} hitFlash={hitFlash} />
        {stunFor(key)}
        {children}
      </group>
    )
  }
  const footOffset = visual.legacyFootY - visual.fit * built.footY
  return (
    <group name={`miniBoss${type}Root`} position={[0, footOffset, 0]} scale={visual.fit}>
      {part('legL')}
      {part('legR')}
      {part('torso', <>
        {part('armL')}
        {part('armR')}
        {part('head', <MiniBossFace type={type} warn={animPhase === 'warn' || animPhase === 'charge' || animPhase === 'special'} />)}
      </>)}
    </group>
  )
}

/** 게임용: Mini 좀비와 같은 GLB(useGLTF 캐시 공유)를 읽어 그린다. 읽는 동안은 ZombieMesh의 Suspense가 예전 모델을 보여 준다. */
export default function MiniBossMesh(props) {
  const gltf = useGLTF(MINI_BOSS_GLB_URL, false, true)
  return <MiniBossModel {...props} scene={gltf.scene} />
}

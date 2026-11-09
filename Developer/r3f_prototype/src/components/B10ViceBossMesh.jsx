// B10 교감 좀비(Stage 5 보스) 메시 — 스펙 Part B §12-2.
//
// 실루엣 3포인트: (1) 정수리가 벗겨진 머리 + 옆머리를 빗어 넘김 (2) 두꺼운 검정 뿔테 안경
// (3) 오른손 거대 빨간 결재 도장, 왼손 출석부. 의상: 남색 니트 조끼 + 흰 셔츠 + 교직원 목걸이 명찰.
// 피부는 좀비 녹색. 얼굴은 텍스처 이미지 없이 SDF 셰이더로 그린다(E07 절차적 얼굴 표준).
//
// 재질·외곽선: 다른 보스와 같은 캐시 MeshToonMaterial + 반전 헐 외곽선(getSharedOutlineMat).
// 블록 수는 B04 주방장과 같은 자릿수(약 50블록)다.
//
// 포즈(animPhase):
//   normal — 도장을 어깨에 메고 걷는다.
//   warn   — b10_p1 결재 도장 windup: 도장을 머리 위로 치켜든다.
//   charge — b10_p2 출석부 휘두르기 windup: 출석부를 뒤로 크게 젖힌다(도장은 어깨에).
//   stun   — 페이즈 전환·교무회의 소집 정지: 출석부 위 탁상 종을 도장 손으로 친다.
// Enemy.jsx가 진행 중인 패턴에 따라 warn / charge를 골라 넘긴다.
// staticPose(로비 카드)에서는 프레임 애니메이션을 돌리지 않고 선언된 rest 포즈를 유지한다.
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getCachedChamferedBoxGeo, getCachedToonMat, getFlashMat, getSharedOutlineMat, inflateScale } from '../lib/toon.js'
import { composeStudioPartPosition, composeStudioPartRotation } from './StudioTunedGroup.jsx'

const disableRaycast = () => null

export const B10_VICE_PALETTE = Object.freeze({
  skin: 0x9dbf8a,
  skinShadow: 0x7a9a68,
  hair: 0x3b3a38,
  glasses: 0x101010,
  shirt: 0xedebe4,
  vest: 0x4b5d7a,
  vestShadow: 0x3a4a63,
  lanyard: 0x2f4f7f,
  idCard: 0xf4f1e8,
  idPhoto: 0x8aa3c2,
  slacks: 0x3a3f45,
  belt: 0x2b2422,
  shoe: 0x4a2f1e,
  sole: 0x14100d,
  stampHandle: 0x7a4e2d,
  stampHead: 0x5a3820,
  stampInk: 0xd7263d,
  ledgerCover: 0x2f4f7f,
  ledgerPages: 0xf4f1e8,
  bell: 0xe2b84a,
  bellBase: 0x3a3f45,
})

// 포즈 표(팔 어깨 피벗 rotation.x/z, 몸통 기울기). 순수 데이터라 테스트가 직접 읽는다.
// 팔 그룹의 아래(−Y) 방향이 손이다. rotation.x = θ이면 손 방향은 (0, −cosθ, −sinθ).
export const B10_VICE_POSES = Object.freeze({
  normal: Object.freeze({ armRX: 2.55, armRZ: -0.28, armLX: -0.55, armLZ: 0.12, bodyX: 0.04 }),
  warn: Object.freeze({ armRX: 3.2, armRZ: -0.12, armLX: -0.7, armLZ: 0.2, bodyX: -0.12 }),
  ledger: Object.freeze({ armRX: 2.55, armRZ: -0.28, armLX: 1.15, armLZ: 0.5, bodyX: 0.08 }),
  stun: Object.freeze({ armRX: -1.05, armRZ: 0.32, armLX: -1.35, armLZ: -0.18, bodyX: 0.18 }),
})

export function getB10VicePose(animPhase) {
  if (animPhase === 'warn' || animPhase === 'special') return B10_VICE_POSES.warn
  if (animPhase === 'charge') return B10_VICE_POSES.ledger
  if (animPhase === 'stun') return B10_VICE_POSES.stun
  return B10_VICE_POSES.normal
}

function ViceBlock({ name, size, position, rotation, color, emissive = 0.08, outlineScale = 1.06, flash = false }) {
  const geometry = getCachedChamferedBoxGeo(...size, 1)
  const material = getCachedToonMat(color, emissive)
  const outline = inflateScale(outlineScale)
  const bodyRef = useRef(null)
  // ZombieMesh ZBlock과 같은 플래시 규약: 재질 prop은 고정하고 히트 순간에만 공유 플래시로 바꿔 끼운다.
  useLayoutEffect(() => {
    const mesh = bodyRef.current
    if (!flash || !mesh) return undefined
    const restore = mesh.material
    mesh.material = getFlashMat()
    mesh.userData.studioNonTunable = true
    return () => {
      mesh.material = restore
      delete mesh.userData.studioNonTunable
    }
  }, [flash])
  return (
    <group name={name} position={position} rotation={rotation}>
      {outlineScale > 1 && (
        <mesh renderOrder={1} geometry={geometry} material={getSharedOutlineMat()} scale={[outline, outline, outline]} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
      )}
      <mesh ref={bodyRef} renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

// 절차적 얼굴: 반쯤 감긴 피곤한 눈, 찌푸린 눈썹, 처진 입, 팔자 주름. 예고(warn) 중에는 눈이
// 공통 경고색(#FF7A1A, 투사체 좀비 얼굴과 같은 값)으로 빛난다. 피부는 그리지 않는다(feature-only alpha).
export const B10_FACE_FRAGMENT_SHADER = /* glsl */`
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
  float blink = pow(max(0.0, sin(uTime * 0.6)), 24.0);
  float lid = mix(0.034, 0.006, blink) * mix(1.0, 1.5, uWarn);
  float eyes = max(cov(sdEll(p, vec2(-0.165, 0.035), vec2(0.07, lid))), cov(sdEll(p, vec2(0.165, 0.035), vec2(0.07, lid))));
  float pupils = max(cov(sdEll(p, vec2(-0.165, 0.03), vec2(0.022, lid * 0.8))), cov(sdEll(p, vec2(0.165, 0.03), vec2(0.022, lid * 0.8))));
  float brows = max(stroke(sdSeg(p, vec2(-0.25, 0.135), vec2(-0.08, 0.1)), 0.02), stroke(sdSeg(p, vec2(0.08, 0.1), vec2(0.25, 0.135)), 0.02));
  float mouth = max(stroke(sdSeg(p, vec2(-0.12, -0.2), vec2(0.0, -0.17)), 0.016), stroke(sdSeg(p, vec2(0.0, -0.17), vec2(0.12, -0.2)), 0.016));
  float folds = max(stroke(sdSeg(p, vec2(-0.13, -0.06), vec2(-0.17, -0.16)), 0.01), stroke(sdSeg(p, vec2(0.13, -0.06), vec2(0.17, -0.16)), 0.01));
  vec3 eyeColor = mix(vec3(1.0, 0.95, 0.78), vec3(1.0, 0.478, 0.102), uWarn);
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  color = mix(color, eyeColor, eyes); alpha = max(alpha, eyes);
  color = mix(color, vec3(0.02), pupils * eyes * (1.0 - uWarn * 0.7));
  float dark = max(max(brows, mouth), folds * 0.6);
  color = mix(color, vec3(0.06, 0.04, 0.05), dark); alpha = max(alpha, dark);
  gl_FragColor = vec4(color, alpha);
}
`

const B10_FACE_VERTEX_SHADER = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

function B10ViceFace({ warn }) {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uWarn: { value: 0 } }), [])
  useFrame(({ clock }, delta) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value = clock.getElapsedTime()
    const target = warn ? 1 : 0
    const current = material.uniforms.uWarn.value
    material.uniforms.uWarn.value = current + (target - current) * Math.min(1, delta * 10)
  })
  return (
    <mesh
      name="b10ViceProceduralFace"
      position={[0, -0.02, 0.262]}
      renderOrder={3}
      raycast={disableRaycast}
      userData={{ studioNonFocusable: true, studioNonTunable: true }}
    >
      <planeGeometry args={[0.56, 0.44]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={B10_FACE_VERTEX_SHADER}
        fragmentShader={B10_FACE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function composeRotation(object, axis, target) {
  if (!object) return
  const base = object.userData?.studioPartBaseRotation?.[axis] ?? 0
  object.rotation[axis] = composeStudioPartRotation(object, axis, 0, target - base)
}

function approach(current, target, delta, rate) {
  return current + (target - current) * Math.min(1, delta * rate)
}

export default function B10ViceBossMesh({ animPhase = 'normal', hitFlash = false, staticPose = false }) {
  const parts = useRef({})
  const state = useRef({ armRX: B10_VICE_POSES.normal.armRX, armRZ: B10_VICE_POSES.normal.armRZ, armLX: B10_VICE_POSES.normal.armLX, armLZ: B10_VICE_POSES.normal.armLZ, bodyX: 0 })
  const reg = (key) => (node) => { if (node) parts.current[key] = node }
  const pal = B10_VICE_PALETTE
  const pose = getB10VicePose(animPhase)
  const stunned = animPhase === 'stun'

  useFrame(({ clock }, delta) => {
    if (staticPose) return
    const pt = parts.current
    if (!pt.legL || !pt.legR) return
    const t = clock.getElapsedTime()
    const s = state.current
    const windup = animPhase === 'warn' || animPhase === 'charge'
    const rate = windup ? 14 : 9
    s.armRX = approach(s.armRX, pose.armRX, delta, rate)
    s.armRZ = approach(s.armRZ, pose.armRZ, delta, rate)
    s.armLX = approach(s.armLX, pose.armLX, delta, rate)
    s.armLZ = approach(s.armLZ, pose.armLZ, delta, rate)
    s.bodyX = approach(s.bodyX, pose.bodyX, delta, 10)

    const walking = animPhase !== 'stun' && !windup
    const stride = walking ? Math.sin(t * 6.2) * 0.32 : 0
    // warn: 치켜든 도장이 결재 직전처럼 떨린다. stun: 탁상 종을 톡톡 친다.
    const stampJitter = animPhase === 'warn' ? Math.sin(t * 30) * 0.05 : 0
    const bellTap = stunned ? Math.max(0, Math.sin(t * 16)) * 0.32 : 0
    const sway = walking ? Math.sin(t * 3.1) * 0.06 : 0

    composeRotation(pt.armR, 'x', s.armRX + stampJitter - bellTap + sway)
    composeRotation(pt.armR, 'z', s.armRZ)
    composeRotation(pt.armL, 'x', s.armLX - sway)
    composeRotation(pt.armL, 'z', s.armLZ)
    composeRotation(pt.legL, 'x', stride)
    composeRotation(pt.legR, 'x', -stride)
    if (pt.body) {
      composeRotation(pt.body, 'x', s.bodyX)
      pt.body.position.y = composeStudioPartPosition(pt.body, 'y', 0.37, walking ? Math.abs(Math.sin(t * 6.2)) * 0.025 : 0)
    }
    if (pt.head) composeRotation(pt.head, 'z', walking ? Math.sin(t * 1.5) * 0.05 : 0)
    if (pt.bell) pt.bell.visible = stunned
  })

  const restR = B10_VICE_POSES.normal
  return (
    <group name="b10ViceRoot">
      {/* ── 머리: 벗겨진 정수리 + 빗어 넘긴 옆머리 + 뿔테 안경 + SDF 얼굴 ── */}
      <group name="b10ViceHeadRig" ref={reg('head')} position={[0, 0.93, 0]}>
        <ViceBlock name="b10ViceHead" size={[0.62, 0.5, 0.52]} position={[0, 0, 0]} color={pal.skin} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        <B10ViceFace warn={animPhase === 'warn' || animPhase === 'charge'} />
        <ViceBlock name="b10ViceEarL" size={[0.1, 0.18, 0.14]} position={[-0.36, -0.02, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ViceBlock name="b10ViceEarR" size={[0.1, 0.18, 0.14]} position={[0.36, -0.02, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ViceBlock name="b10ViceHairSideL" size={[0.08, 0.24, 0.46]} position={[-0.33, 0.02, -0.03]} color={pal.hair} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        <ViceBlock name="b10ViceHairSideR" size={[0.08, 0.24, 0.46]} position={[0.33, 0.02, -0.03]} color={pal.hair} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        <ViceBlock name="b10ViceHairBack" size={[0.6, 0.26, 0.08]} position={[0, 0.0, -0.28]} color={pal.hair} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        {/* 빗어 넘긴 머리카락 세 가닥(정수리는 맨살) */}
        <ViceBlock name="b10ViceCombOver1" size={[0.56, 0.03, 0.05]} position={[0.02, 0.262, -0.1]} rotation={[0, 0.08, 0]} color={pal.hair} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceCombOver2" size={[0.5, 0.03, 0.05]} position={[0.04, 0.262, 0.0]} rotation={[0, 0.05, 0]} color={pal.hair} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceCombOver3" size={[0.44, 0.03, 0.05]} position={[0.06, 0.262, 0.1]} rotation={[0, 0.02, 0]} color={pal.hair} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
        {/* 두꺼운 검정 뿔테 안경 */}
        <group name="b10ViceGlasses" position={[0, 0.03, 0.285]}>
          {[-0.165, 0.165].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <ViceBlock size={[0.22, 0.05, 0.05]} position={[0, 0.07, 0]} color={pal.glasses} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
              <ViceBlock size={[0.22, 0.035, 0.05]} position={[0, -0.065, 0]} color={pal.glasses} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
              <ViceBlock size={[0.04, 0.17, 0.05]} position={[Math.sign(x) * 0.1, 0, 0]} color={pal.glasses} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
            </group>
          ))}
          <ViceBlock name="b10ViceGlassesBridge" size={[0.12, 0.04, 0.05]} position={[0, 0.04, 0]} color={pal.glasses} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
          <ViceBlock name="b10ViceTempleL" size={[0.03, 0.035, 0.3]} position={[-0.3, 0.06, -0.15]} color={pal.glasses} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
          <ViceBlock name="b10ViceTempleR" size={[0.03, 0.035, 0.3]} position={[0.3, 0.06, -0.15]} color={pal.glasses} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        </group>
      </group>

      {/* ── 몸통: 흰 셔츠 + 남색 니트 조끼 + 교직원 목걸이 명찰 ── */}
      <group name="b10ViceBodyRig" ref={reg('body')} position={[0, 0.37, 0]}>
        <ViceBlock name="b10ViceShirt" size={[0.8, 0.6, 0.5]} position={[0, 0.02, 0]} color={pal.shirt} emissive={0.07} outlineScale={1.09} flash={hitFlash} />
        <ViceBlock name="b10ViceVest" size={[0.84, 0.46, 0.53]} position={[0, -0.06, 0]} color={pal.vest} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceVestFrontL" size={[0.3, 0.2, 0.05]} position={[-0.21, 0.2, 0.25]} rotation={[0, 0, -0.35]} color={pal.vest} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceVestFrontR" size={[0.3, 0.2, 0.05]} position={[0.21, 0.2, 0.25]} rotation={[0, 0, 0.35]} color={pal.vest} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceVestRib" size={[0.84, 0.06, 0.54]} position={[0, -0.27, 0]} color={pal.vestShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceCollar" size={[0.34, 0.08, 0.1]} position={[0, 0.3, 0.22]} color={pal.shirt} emissive={0.08} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceLanyardL" size={[0.04, 0.3, 0.03]} position={[-0.09, 0.14, 0.285]} rotation={[0, 0, -0.32]} color={pal.lanyard} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceLanyardR" size={[0.04, 0.3, 0.03]} position={[0.09, 0.14, 0.285]} rotation={[0, 0, 0.32]} color={pal.lanyard} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ViceBlock name="b10ViceIdCard" size={[0.15, 0.19, 0.03]} position={[0, -0.06, 0.3]} color={pal.idCard} emissive={0.08} outlineScale={1.03} flash={hitFlash} />
        <ViceBlock name="b10ViceIdPhoto" size={[0.06, 0.07, 0.01]} position={[-0.03, -0.03, 0.318]} color={pal.idPhoto} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
      </group>

      {/* ── 바지·벨트 ── */}
      <group name="b10ViceHips" position={[0, -0.08, 0]}>
        <ViceBlock name="b10ViceSlacks" size={[0.68, 0.26, 0.46]} position={[0, 0, 0]} color={pal.slacks} emissive={0.04} outlineScale={1.07} flash={hitFlash} />
        <ViceBlock name="b10ViceBelt" size={[0.7, 0.06, 0.48]} position={[0, 0.12, 0]} color={pal.belt} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
      </group>

      {/* ── 오른팔: 거대한 빨간 결재 도장(rest = 어깨에 멤) ── */}
      <group name="b10ViceArmR" ref={reg('armR')} position={[0.53, 0.61, 0]} rotation={[restR.armRX, 0, restR.armRZ]}>
        <ViceBlock name="b10ViceSleeveR" size={[0.25, 0.46, 0.25]} position={[0, -0.23, 0]} color={pal.shirt} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ViceBlock name="b10ViceHandR" size={[0.24, 0.2, 0.24]} position={[0, -0.55, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <group name="b10ViceStamp" position={[0, -0.72, 0]}>
          <ViceBlock name="b10ViceStampHandle" size={[0.16, 0.34, 0.16]} position={[0, -0.05, 0]} color={pal.stampHandle} emissive={0.05} outlineScale={1.06} flash={hitFlash} />
          <ViceBlock name="b10ViceStampHead" size={[0.46, 0.2, 0.46]} position={[0, -0.3, 0]} color={pal.stampHead} emissive={0.05} outlineScale={1.07} flash={hitFlash} />
          <ViceBlock name="b10ViceStampInk" size={[0.44, 0.06, 0.44]} position={[0, -0.43, 0]} color={pal.stampInk} emissive={0.16} outlineScale={1.04} flash={hitFlash} />
        </group>
      </group>

      {/* ── 왼팔: 출석부 + 탁상 종(교무회의 소집 정지에서만 보임) ── */}
      <group name="b10ViceArmL" ref={reg('armL')} position={[-0.53, 0.61, 0]} rotation={[restR.armLX, 0, restR.armLZ]}>
        <ViceBlock name="b10ViceSleeveL" size={[0.25, 0.46, 0.25]} position={[0, -0.23, 0]} color={pal.shirt} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ViceBlock name="b10ViceHandL" size={[0.22, 0.18, 0.22]} position={[0, -0.53, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <group name="b10ViceLedger" position={[0.02, -0.72, 0.04]}>
          <ViceBlock name="b10ViceLedgerCover" size={[0.08, 0.5, 0.38]} position={[0, 0, 0]} color={pal.ledgerCover} emissive={0.06} outlineScale={1.06} flash={hitFlash} />
          <ViceBlock name="b10ViceLedgerPages" size={[0.09, 0.46, 0.35]} position={[0.012, 0, 0.012]} color={pal.ledgerPages} emissive={0.08} outlineScale={1.0} flash={hitFlash} />
          <group name="b10ViceDeskBell" ref={reg('bell')} position={[0.12, -0.1, 0]} visible={false}>
            <ViceBlock size={[0.06, 0.2, 0.2]} position={[0, 0, 0]} color={pal.bellBase} emissive={0.04} outlineScale={1.04} flash={hitFlash} />
            <ViceBlock size={[0.12, 0.16, 0.16]} position={[0.08, 0, 0]} color={pal.bell} emissive={0.22} outlineScale={1.05} flash={hitFlash} />
          </group>
        </group>
      </group>

      {/* ── 다리 ── */}
      <group name="b10ViceLegL" ref={reg('legL')} position={[-0.19, -0.22, 0]}>
        <ViceBlock name="b10ViceLegSlacksL" size={[0.28, 0.42, 0.3]} position={[0, -0.21, 0]} color={pal.slacks} emissive={0.04} outlineScale={1.06} flash={hitFlash} />
        <ViceBlock name="b10ViceShoeL" size={[0.33, 0.14, 0.48]} position={[0, -0.5, 0.08]} color={pal.shoe} emissive={0.04} outlineScale={1.04} flash={hitFlash} />
        <ViceBlock name="b10ViceSoleL" size={[0.35, 0.05, 0.5]} position={[0, -0.59, 0.08]} color={pal.sole} emissive={0.01} outlineScale={1.02} flash={hitFlash} />
      </group>
      <group name="b10ViceLegR" ref={reg('legR')} position={[0.19, -0.22, 0]}>
        <ViceBlock name="b10ViceLegSlacksR" size={[0.28, 0.42, 0.3]} position={[0, -0.21, 0]} color={pal.slacks} emissive={0.04} outlineScale={1.06} flash={hitFlash} />
        <ViceBlock name="b10ViceShoeR" size={[0.33, 0.14, 0.48]} position={[0, -0.5, 0.08]} color={pal.shoe} emissive={0.04} outlineScale={1.04} flash={hitFlash} />
        <ViceBlock name="b10ViceSoleR" size={[0.35, 0.05, 0.5]} position={[0, -0.59, 0.08]} color={pal.sole} emissive={0.01} outlineScale={1.02} flash={hitFlash} />
      </group>
    </group>
  )
}

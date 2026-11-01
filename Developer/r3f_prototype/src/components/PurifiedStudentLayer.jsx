// 정화된 학생 사망 연출 렌더러. 좀비가 부서진 뒤 바닥에 주저앉아 멍하게 머리를 흔드는 학생이
// 약 0.8초 보였다 사라진다. 순수 시각 연출(충돌·게임플레이 없음)이다.
// 풀: lib/purifiedStudentPool.js (상한 24, 무할당). 모든 메시는 visible 상시 true + count 게이트라
// 스테이지 진입 프리웜(compileAsync, traverseVisible)에 포함되고, 활성 0이면 드로콜도 0이다.
// 저폴리 앉은 자세: 상체·팔(상의색), 앞으로 뻗은 다리(하의색), 머리(사람 피부색), 머리카락·눈(짙은색).
import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getCachedChamferedBoxGeo, getToonGradient } from '../lib/toon.js'
import { PURIFIED_STUDENT_CAPACITY, advancePurifiedStudents, getPurifiedStudentHeadShake, getPurifiedStudentOpacity, purifiedStudentPool, resetPurifiedStudents } from '../lib/purifiedStudentPool.js'
import { markInstanceAttributePrefix } from './ZombieInstanceLayer.jsx'

export const PURIFIED_STUDENT_SKIN = 0xf1c7a0
export const PURIFIED_STUDENT_DARK = 0x2a2420
// 사망 경로의 visualScale은 이미 cs × 0.333(좀비 그룹 스케일과 같은 값)이다. 여기서 0.333을
// 한 번 더 곱하면 학생이 좀비의 1/3 크기로 줄어든다(2026-11-01 실플레이 캡처로 확인).
const VISUAL_SCALE = 1
// [key, size, perStudent, fixedColor|null]
export const PURIFIED_STUDENT_PARTS = [
  ['torso', [0.50, 0.50, 0.34], 2, null],   // 상체 + 무릎 위에 얹은 팔(같은 메시 2인스턴스)
  ['legs', [0.46, 0.16, 0.52], 1, null],
  ['head', [0.48, 0.44, 0.42], 1, PURIFIED_STUDENT_SKIN],
  ['dark', [1, 1, 1], 3, PURIFIED_STUDENT_DARK], // 머리카락 + 눈 2(단위 박스를 스케일)
]
const OUTLINE_SCALE = 1.08
const OUTLINE_OPACITY = 0.9

const base = new THREE.Matrix4(); const head = new THREE.Matrix4(); const a = new THREE.Matrix4(); const t = new THREE.Matrix4(); const r = new THREE.Matrix4(); const sc = new THREE.Matrix4(); const outlineInflate = new THREE.Matrix4().makeScale(OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE)
const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const euler = new THREE.Euler(); const up = new THREE.Vector3(0, 1, 0)
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const color = new THREE.Color()
const shake = [0, 0]

// three r164의 출력 청크는 opaque_fragment다(output_fragment는 r154에서 이름이 바뀌었다).
// 둘 중 있는 쪽 뒤에 인스턴스 알파를 곱한다.
export function patchPurifiedAlphaShader(shader) {
  shader.vertexShader = `attribute float instanceAlpha;\nvarying float vPurifiedAlpha;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPurifiedAlpha = instanceAlpha;')
  const chunk = shader.fragmentShader.includes('#include <opaque_fragment>') ? '#include <opaque_fragment>' : '#include <output_fragment>'
  shader.fragmentShader = `varying float vPurifiedAlpha;\n${shader.fragmentShader}`.replace(chunk, `${chunk}\ngl_FragColor.a *= vPurifiedAlpha;`)
}
function installAlpha(geometry, material, capacity) {
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(0), 1)
  geometry.setAttribute('instanceAlpha', alpha)
  material.onBeforeCompile = patchPurifiedAlphaShader
  material.customProgramCacheKey = () => 'purified-student-alpha-v1'
  return alpha
}
function bodyMat(fixedColor) {
  const m = new THREE.MeshToonMaterial({ color: fixedColor ?? 0xffffff, gradientMap: getToonGradient(), emissive: 0xffffff, emissiveIntensity: 0.08, transparent: true })
  m.depthWrite = true
  return m
}
function outlineMat() { return new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: OUTLINE_OPACITY, depthWrite: false }) }
function makeIM(geometry, material, capacity, withColor, sharedAlphaFrom = null) {
  const x = new THREE.InstancedMesh(geometry, material, capacity)
  x.frustumCulled = false
  x.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < capacity; i += 1) x.setMatrixAt(i, ZERO)
  if (withColor) { x.setColorAt(0, color.setHex(0xffffff)); x.instanceColor.setUsage(THREE.DynamicDrawUsage) }
  if (sharedAlphaFrom) {
    // 외곽선은 몸과 같은 지오메트리·instanceAlpha 속성을 쓰고 셰이더 패치만 복사한다.
    material.onBeforeCompile = sharedAlphaFrom.material.onBeforeCompile
    material.customProgramCacheKey = sharedAlphaFrom.material.customProgramCacheKey
    x.userData.instanceAlpha = sharedAlphaFrom.userData.instanceAlpha
  } else {
    x.userData.instanceAlpha = installAlpha(geometry, material, capacity)
    x.userData.instanceAlpha.setUsage(THREE.DynamicDrawUsage)
  }
  x.count = 0
  x.visible = true
  return x
}
function upload(x, count) {
  x.count = count
  x.visible = true
  markInstanceAttributePrefix(x.instanceMatrix, count, 16)
  markInstanceAttributePrefix(x.userData.instanceAlpha, count, 1)
  if (x.instanceColor) markInstanceAttributePrefix(x.instanceColor, count, 3)
}

export default function PurifiedStudentLayer({ resetKey, pool = purifiedStudentPool }) {
  const meshes = useMemo(() => PURIFIED_STUDENT_PARTS.map(([key, size, perStudent, fixedColor]) => {
    // 몸·외곽선이 한 지오메트리와 instanceAlpha 속성을 공유한다(투명도 한 번 기록).
    const geometry = getCachedChamferedBoxGeo(size[0], size[1], size[2], 1).clone()
    const capacity = PURIFIED_STUDENT_CAPACITY * perStudent
    const body = makeIM(geometry, bodyMat(fixedColor), capacity, fixedColor === null)
    const out = makeIM(geometry, outlineMat(), capacity, false, body)
    return { key, body, out, perStudent }
  }), [])
  useEffect(() => () => { for (const m of meshes) { m.body.geometry.dispose(); m.body.material.dispose(); m.out.material.dispose() } }, [meshes])
  useLayoutEffect(() => {
    resetPurifiedStudents(pool)
    for (const m of meshes) { upload(m.body, 0); upload(m.out, 0) }
  }, [meshes, pool, resetKey])

  useFrame((_, delta) => {
    advancePurifiedStudents(pool, delta * 1000)
    let n = 0
    const torso = meshes[0]; const legs = meshes[1]; const headMesh = meshes[2]; const dark = meshes[3]
    const ta = torso.body.userData.instanceAlpha.array; const la = legs.body.userData.instanceAlpha.array; const ha = headMesh.body.userData.instanceAlpha.array; const da = dark.body.userData.instanceAlpha.array
    for (let i = 0; i < pool.capacity; i += 1) {
      if (!pool.active[i]) continue
      const opacity = getPurifiedStudentOpacity(pool.age[i])
      if (opacity <= 0) continue
      const s = pool.scale[i] * VISUAL_SCALE
      pos.set(pool.x[i], 0.004, pool.z[i]); quat.setFromAxisAngle(up, pool.yaw[i]); scl.set(s, s, s)
      base.compose(pos, quat, scl)
      // 상체(살짝 앞으로 숙임)와 무릎 위 팔
      t.makeTranslation(0, 0.42, -0.04); euler.set(0.14, 0, 0); r.makeRotationFromEuler(euler)
      a.copy(base).multiply(t).multiply(r); torso.body.setMatrixAt(n * 2, a); torso.out.setMatrixAt(n * 2, a.multiply(outlineInflate))
      t.makeTranslation(0, 0.30, 0.26); sc.makeScale(1.34, 0.32, 0.55)
      a.copy(base).multiply(t).multiply(sc); torso.body.setMatrixAt(n * 2 + 1, a); torso.out.setMatrixAt(n * 2 + 1, a.multiply(outlineInflate))
      color.setHex(pool.top[i]); torso.body.setColorAt(n * 2, color); torso.body.setColorAt(n * 2 + 1, color)
      ta[n * 2] = opacity; ta[n * 2 + 1] = opacity
      // 앞으로 뻗은 다리
      t.makeTranslation(0, 0.08, 0.30)
      a.copy(base).multiply(t); legs.body.setMatrixAt(n, a); legs.out.setMatrixAt(n, a.multiply(outlineInflate))
      color.setHex(pool.bottom[i]); legs.body.setColorAt(n, color); la[n] = opacity
      // 목 피벗에서 멍하게 흔들리는 머리
      getPurifiedStudentHeadShake(pool.age[i], pool.phase[i], shake)
      t.makeTranslation(0, 0.69, -0.02); euler.set(0.10, shake[1], shake[0]); r.makeRotationFromEuler(euler)
      head.copy(base).multiply(t).multiply(r)
      t.makeTranslation(0, 0.22, 0); a.copy(head).multiply(t); headMesh.body.setMatrixAt(n, a); headMesh.out.setMatrixAt(n, a.multiply(outlineInflate)); ha[n] = opacity
      // 머리카락
      t.makeTranslation(0, 0.42, -0.02); sc.makeScale(0.52, 0.14, 0.46)
      a.copy(head).multiply(t).multiply(sc); dark.body.setMatrixAt(n * 3, a); dark.out.setMatrixAt(n * 3, a.multiply(outlineInflate))
      // 눈(멍한 점 두 개)
      for (let k = 0; k < 2; k += 1) {
        t.makeTranslation(k === 0 ? -0.10 : 0.10, 0.22, 0.215); sc.makeScale(0.07, 0.08, 0.04)
        a.copy(head).multiply(t).multiply(sc); dark.body.setMatrixAt(n * 3 + 1 + k, a); dark.out.setMatrixAt(n * 3 + 1 + k, ZERO)
      }
      da[n * 3] = opacity; da[n * 3 + 1] = opacity; da[n * 3 + 2] = opacity
      n += 1
    }
    for (let m = 0; m < meshes.length; m += 1) { const count = n * meshes[m].perStudent; upload(meshes[m].body, count); upload(meshes[m].out, count) }
  })

  return <>{meshes.map((m) => <primitive key={`po-${m.key}`} object={m.out} renderOrder={1} />)}{meshes.map((m) => <primitive key={`pb-${m.key}`} object={m.body} renderOrder={2} />)}</>
}

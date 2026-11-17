// E95 긴줄넘기 듀오의 줄 — InstancedMesh 1개 = 드로콜 1개(줄이 없으면 visible=false라 0개). 2026-11-15, threemini.
//
// 줄 값(양끝·높이·폭·단계)은 lib/longRopeVisual.js가 E95 줄 스냅샷(확장 공격 맵)에서 읽는다 — 살아 있는 몸 위치가 아니다.
// 툰 규칙: MeshToonMaterial(공용 그라디언트) + 외곽선. 외곽선은 같은 지오메트리에 합친 뒤집힌 껍질(정점색 #050209)이라
// 드로콜이 늘지 않는다: 껍질 정점은 aOutline=1이고, 셰이더가 그 정점을 축 방향(±1 부호 벡터)으로 outlineWidth만큼
// 월드 단위로 밀어낸다(인스턴스 배율로 나눈다 — 줄이 4.5u로 늘어나도, 0.5u 띠로 납작해져도 외곽선 두께가 같다).
// 피해 판정·타이머는 여기 없다(읽기 전용 뷰).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { expansionAttackSnapshots } from '../lib/expansionAttackRuntime.js'
import { getToonGradient } from '../lib/toon.js'
import { LONG_ROPE_VISUAL, longRopeInto, longRopeMatrixParts } from '../lib/longRopeVisual.js'
import { markInstanceUpload } from '../lib/templateInstanceLayer.js'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)

// 단위 줄: x·y ±0.5, z 0..1(A → B). 몸통(앞면) + 뒤집힌 껍질(외곽선)을 한 지오메트리로.
export function createLongRopeGeometry() {
  const body = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5)
  const hull = body.clone()
  const index = hull.index.array
  for (let i = 0; i < index.length; i += 3) { const b = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = b } // 감김 뒤집기
  // 껍질 법선 = 축 부호 벡터(모서리에서 틈 없이 상자를 그대로 키운다). 껍질은 검정이라 조명에 쓰이지 않는다.
  const p = hull.attributes.position; const n = hull.attributes.normal
  for (let i = 0; i < p.count; i += 1) n.setXYZ(i, Math.sign(p.getX(i)), Math.sign(p.getY(i)), Math.sign(p.getZ(i) - 0.5))
  const paint = (geometry, hex, outline) => {
    const c = new THREE.Color(hex); const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3); const flags = new Float32Array(count)
    for (let i = 0; i < count; i += 1) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; flags[i] = outline }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aOutline', new THREE.BufferAttribute(flags, 1))
    geometry.deleteAttribute('uv')
    return geometry
  }
  const merged = mergeGeometries([paint(body, LONG_ROPE_VISUAL.color, 0), paint(hull, LONG_ROPE_VISUAL.outlineColor, 1)], false)
  body.dispose(); hull.dispose()
  merged.computeBoundingSphere()
  return merged
}

export function createLongRopeMaterial() {
  const material = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: getToonGradient() })
  material.name = 'long-rope-toon'
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRopeOutline = { value: LONG_ROPE_VISUAL.outlineWidth }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aOutline;\nuniform float uRopeOutline;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ropeScale = max(vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)), vec3(1e-4));
#else
  vec3 ropeScale = vec3(1.0);
#endif
  transformed += aOutline * objectNormal * (uRopeOutline / ropeScale);`)
  }
  material.customProgramCacheKey = () => 'long-rope-outline-v1'
  return material
}

const rope = {}
const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scl = new THREE.Vector3(); const mat = new THREE.Matrix4()
const UP = new THREE.Vector3(0, 1, 0)

/** 스냅샷 맵 → 인스턴스 행렬. 그린 줄 개수를 돌려준다(테스트·GameCanvas 밖에서도 쓴다). */
export function syncLongRopes(mesh, source = expansionAttackSnapshots) {
  if (!mesh) return 0
  let count = 0
  const values = source?.values ? source.values() : source ?? []
  for (const snapshot of values) {
    if (count >= mesh.instanceMatrix.count) break
    if (!longRopeInto(rope, snapshot)) continue
    const parts = longRopeMatrixParts(rope)
    pos.fromArray(parts.position); quat.setFromAxisAngle(UP, parts.yaw); scl.fromArray(parts.scale)
    mesh.setMatrixAt(count, mat.compose(pos, quat, scl))
    count += 1
  }
  mesh.count = count
  mesh.visible = count > 0
  if (count > 0) markInstanceUpload(mesh.instanceMatrix, count, 16)
  return count
}

export default function LongRopeLayer({ resetKey, source = expansionAttackSnapshots }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(createLongRopeGeometry(), createLongRopeMaterial(), LONG_ROPE_VISUAL.capacity)
    m.name = 'e95-long-rope'
    m.frustumCulled = false
    m.renderOrder = 4
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < LONG_ROPE_VISUAL.capacity; i += 1) m.setMatrixAt(i, ZERO)
    m.count = 0
    // 처음 두 프레임은 0개인 채로 보이게 둔다: 스테이지 진입 셰이더 프리웜(gl.compileAsync — visible만 돈다)이
    // 이 재질도 미리 컴파일하게(첫 줄이 나오는 순간 끊김 방지). MiniZombieLayer 프리웜 메시와 같은 방식.
    m.visible = true
    return m
  }, [])
  const frame = useRef(0)
  useEffect(() => () => { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose() }, [mesh])
  // 판 시작·스테이지 진입마다 프리웜을 다시 켠다: 이 레이어는 판마다 다시 마운트되는 Physics 밖에 있어서, 첫 판에만
  // 켜면 다음 스테이지(다른 조명 구성)에서 첫 줄이 나오는 순간 셰이더를 다시 컴파일한다.
  useLayoutEffect(() => { mesh.count = 0; frame.current = 0; mesh.visible = true }, [mesh, resetKey])
  useFrame(() => {
    frame.current += 1
    const drawn = syncLongRopes(mesh, source)
    if (drawn === 0 && frame.current <= 2) mesh.visible = true
  })
  return <primitive object={mesh} />
}

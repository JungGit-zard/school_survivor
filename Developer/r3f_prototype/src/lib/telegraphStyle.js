// 공격 예고(바닥 경고) 공용 스타일 — 2026-11-22 Terry "모든 공격궤도 표시자는 채도를 낮추고 끝에 블러를 넣어 세련되게 표시할 것".
//
// 1) 색: lib/telegraphPalette.js(three 없는 순수 모듈) 한 곳에서 나오고 여기서 그대로 다시 내보낸다. 원래(네온) 색을
//    TELEGRAPH_SOURCE_COLORS에 두고 같은 규칙 muteTelegraphColor로 한 번에 누른다. 사이트는 TELEGRAPH_PALETTE 역할 이름만 쓴다.
// 2) 가장자리 번짐(feather): 채움(=실제 피격 범위) 바깥쪽에 폭 TELEGRAPH_FEATHER.widthUnits의 띠를 덧대고 정점 알파를
//    안쪽 1 → 가운데 midAlpha → 바깥 0으로 준다. 채움 자체는 한 치도 줄이지 않는다 — 불투명도 그대로인 영역 = 피격 범위.
//    후처리·텍스처 없이 정점 알파(vertexColors + rgba color attribute)만 쓰며, 지오메트리는 경고가 생길 때 한 번 만든다
//    (프레임마다 할당 없음).
import * as THREE from 'three'

export * from './telegraphPalette.js'

// ── 가장자리 번짐 ─────────────────────────────────────────────────────────────
// widthUnits 0.32u(0.08블록): 폰 화면에서 손가락 한 마디 남짓한 부드러운 가장자리. 피격 범위 바깥에만 그린다.
// midAlpha: 띠 가운데(폭 절반)의 알파 — 0.4면 선형보다 바깥이 빨리 사라져 가우시안 블러 꼬리처럼 보인다.
export const TELEGRAPH_FEATHER = Object.freeze({ widthUnits: 0.32, midAlpha: 0.4, arcStepRad: Math.PI / 10, name: 'telegraph-feather' })

const KEY_SCALE = 1e4
const pointKey = (p) => `${Math.round(p[0] * KEY_SCALE)},${Math.round(p[1] * KEY_SCALE)}`
/** 여러 다각형이 맞닿은 안쪽 변(같은 두 점을 공유하는 변)은 경계가 아니다 — 거기에 번짐을 그리면 채움 안에 줄무늬가 생긴다. */
export function telegraphBoundaryEdges(loops) {
  const count = new Map()
  const keys = loops.map((loop) => loop.map((a, i) => {
    const b = loop[(i + 1) % loop.length]
    const ka = pointKey(a); const kb = pointKey(b)
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
    count.set(key, (count.get(key) ?? 0) + 1)
    return key
  }))
  return keys.map((list) => list.map((key) => count.get(key) === 1))
}

/**
 * 닫힌 다각형들(점 [u, v] 배열) 바깥쪽 번짐 띠 지오메트리. 위치와 rgba color(알파 = 번짐)만 가진 비인덱스 BufferGeometry.
 * plane 'xz': (u, y, v) — 바닥에 바로 놓는 메시. plane 'xy': (u, v, 0) — CircleGeometry처럼 X축 -90° 회전해 눕히는 메시.
 * boundary[loop][edge] === false인 변은 건너뛴다(맞닿은 안쪽 변). 각 변의 바깥쪽 = 다각형 넓이 부호로 정한다(감김 방향 무관).
 * holes[loop] === true인 윤곽은 구멍(도넛 안쪽 원)이라 번짐이 구멍 쪽으로 난다.
 */
export function buildTelegraphFeatherGeometry(loops, { width = TELEGRAPH_FEATHER.widthUnits, midAlpha = TELEGRAPH_FEATHER.midAlpha, plane = 'xz', y = 0, boundary = null, holes = null } = {}) {
  const pos = []; const col = []
  const put = (u, v, a) => {
    if (plane === 'xy') pos.push(u, v, 0)
    else pos.push(u, y, v)
    col.push(1, 1, 1, a)
  }
  const half = width / 2
  loops.forEach((loop, li) => {
    const n = loop.length
    if (n < 3) return
    let area = 0
    for (let i = 0; i < n; i += 1) { const a = loop[i]; const b = loop[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1] }
    if (Math.abs(area) < 1e-9) return
    // holes[li]: 구멍 윤곽(도넛 안쪽 원) — 바깥쪽 = 구멍 중심 쪽.
    const sign = (area > 0 ? 1 : -1) * (holes?.[li] ? -1 : 1)
    const nu = new Float64Array(n); const nv = new Float64Array(n); const edge = new Uint8Array(n)
    for (let i = 0; i < n; i += 1) {
      const a = loop[i]; const b = loop[(i + 1) % n]
      const du = b[0] - a[0]; const dv = b[1] - a[1]; const len = Math.hypot(du, dv)
      if (len < 1e-9 || (boundary && boundary[li]?.[i] === false)) continue
      edge[i] = 1
      nu[i] = (sign * dv) / len; nv[i] = (-sign * du) / len
      const [au, av] = a; const [bu, bv] = b
      // 안쪽(1) → 가운데(midAlpha) → 바깥(0) 두 띠.
      const am = [au + nu[i] * half, av + nv[i] * half]; const bm = [bu + nu[i] * half, bv + nv[i] * half]
      const ao = [au + nu[i] * width, av + nv[i] * width]; const bo = [bu + nu[i] * width, bv + nv[i] * width]
      put(au, av, 1); put(bu, bv, 1); put(bm[0], bm[1], midAlpha)
      put(au, av, 1); put(bm[0], bm[1], midAlpha); put(am[0], am[1], midAlpha)
      put(am[0], am[1], midAlpha); put(bm[0], bm[1], midAlpha); put(bo[0], bo[1], 0)
      put(am[0], am[1], midAlpha); put(bo[0], bo[1], 0); put(ao[0], ao[1], 0)
    }
    // 볼록한 모서리는 두 변의 띠 사이가 비므로 부채꼴로 메운다(오목한 모서리는 띠끼리 겹쳐 이미 덮인다).
    for (let i = 0; i < n; i += 1) {
      const p = (i - 1 + n) % n
      if (!edge[p] || !edge[i]) continue
      const cross = nu[p] * nv[i] - nv[p] * nu[i]; const dot = nu[p] * nu[i] + nv[p] * nv[i]
      if (cross * sign <= 1e-9) continue
      const theta = Math.atan2(cross, dot)
      const steps = Math.max(1, Math.ceil(Math.abs(theta) / TELEGRAPH_FEATHER.arcStepRad))
      const [cu, cv] = loop[i]
      for (let k = 0; k < steps; k += 1) {
        const t0 = (theta * k) / steps; const t1 = (theta * (k + 1)) / steps
        const c0 = Math.cos(t0); const s0 = Math.sin(t0); const c1 = Math.cos(t1); const s1 = Math.sin(t1)
        const u0 = nu[p] * c0 - nv[p] * s0; const v0 = nu[p] * s0 + nv[p] * c0
        const u1 = nu[p] * c1 - nv[p] * s1; const v1 = nu[p] * s1 + nv[p] * c1
        put(cu, cv, 1); put(cu + u0 * half, cv + v0 * half, midAlpha); put(cu + u1 * half, cv + v1 * half, midAlpha)
        put(cu + u0 * half, cv + v0 * half, midAlpha); put(cu + u1 * half, cv + v1 * half, midAlpha); put(cu + u1 * width, cv + v1 * width, 0)
        put(cu + u0 * half, cv + v0 * half, midAlpha); put(cu + u1 * width, cv + v1 * width, 0); put(cu + u0 * width, cv + v0 * width, 0)
      }
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  g.name = TELEGRAPH_FEATHER.name
  return g
}

/** 같은 재질(vertexColors)을 채움과 번짐이 함께 쓸 때, 채움 지오메트리에 알파 1 color를 붙인다(없으면 검게 그려진다). */
export function addOpaqueVertexAlpha(geometry) {
  const count = geometry.attributes.position.count
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 4).fill(1), 4))
  return geometry
}

/**
 * 원·부채꼴 윤곽 [u, v]. angle < 2π면 중심점을 포함한 부채꼴. start·angle·segments는 CircleGeometry(radius, segments,
 * thetaStart, thetaLength)와 같은 뜻(u=cos, v=sin, 호 전체를 segments등분) — 같은 인자면 채움의 바깥 꼭짓점과 정확히 겹친다.
 */
export function circleLoop(radius, { segments = 48, start = 0, angle = Math.PI * 2, cu = 0, cv = 0 } = {}) {
  const full = angle >= Math.PI * 2 - 1e-9
  const n = Math.max(3, segments)
  const out = full ? [] : [[cu, cv]]
  for (let i = 0; i < (full ? n : n + 1); i += 1) {
    const a = start + (angle * i) / n
    out.push([cu + Math.cos(a) * radius, cv + Math.sin(a) * radius])
  }
  return out
}
/** 축 정렬 직사각형 윤곽 [u, v](가로 halfU, 세로 halfV, 중심 cu, cv). */
export function rectLoop(halfU, halfV, cu = 0, cv = 0) {
  return [[cu - halfU, cv - halfV], [cu + halfU, cv - halfV], [cu + halfU, cv + halfV], [cu - halfU, cv + halfV]]
}

/** 채움 + 번짐을 지오메트리 하나에 담는다(InstancedMesh용 단위 도형). 채움 = 중심 부채 삼각형(알파 1). */
export function createSoftFillGeometry(loop, { width = TELEGRAPH_FEATHER.widthUnits, plane = 'xz', core = 'fan' } = {}) {
  const feather = buildTelegraphFeatherGeometry([loop], { width, plane })
  const pos = []
  const at = (p) => (plane === 'xy' ? pos.push(p[0], p[1], 0) : pos.push(p[0], 0, p[1]))
  if (core === 'fan') {
    let cu = 0; let cv = 0
    for (const p of loop) { cu += p[0]; cv += p[1] }
    cu /= loop.length; cv /= loop.length
    for (let i = 0; i < loop.length; i += 1) { at([cu, cv]); at(loop[i]); at(loop[(i + 1) % loop.length]) }
  }
  const fp = feather.attributes.position.array; const fc = feather.attributes.color.array
  const corePos = new Float32Array(pos)
  const merged = new Float32Array(corePos.length + fp.length); merged.set(corePos); merged.set(fp, corePos.length)
  const color = new Float32Array((merged.length / 3) * 4).fill(1); color.set(fc, (corePos.length / 3) * 4)
  feather.dispose()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(merged, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(color, 4))
  g.userData.coreVertexCount = corePos.length / 3
  return g
}

/** 축마다 번짐 폭이 다른 직사각형(채움+번짐, 단위 도형). 비균등 스케일(폭 × 길이) InstancedMesh 조준선용. */
export function createSoftRectGeometry(halfU, halfV, featherU, featherV, { midAlpha = TELEGRAPH_FEATHER.midAlpha, plane = 'xz' } = {}) {
  const us = [-halfU - featherU, -halfU - featherU / 2, -halfU, halfU, halfU + featherU / 2, halfU + featherU]
  const vs = [-halfV - featherV, -halfV - featherV / 2, -halfV, halfV, halfV + featherV / 2, halfV + featherV]
  const ramp = [0, midAlpha, 1, 1, midAlpha, 0]
  const pos = []; const col = []
  const put = (i, j) => {
    if (plane === 'xy') pos.push(us[i], vs[j], 0)
    else pos.push(us[i], 0, vs[j])
    col.push(1, 1, 1, Math.min(ramp[i], ramp[j]))
  }
  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) { put(i, j); put(i + 1, j); put(i + 1, j + 1); put(i, j); put(i + 1, j + 1); put(i, j + 1) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  return g
}

/** 번짐 전용 재질(채움 재질의 색·불투명도를 syncTelegraphFeather가 매 렌더 직전에 복사해 온다). */
export function createTelegraphFeatherMaterial() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
}
/** Object3D.onBeforeRender — 부모(채움) 메시 재질의 색·불투명도를 번짐 재질로 복사한다. 할당 없음. */
export function syncTelegraphFeather(_renderer, _scene, _camera, _geometry, material) {
  const source = this.parent?.material
  if (!source || Array.isArray(source)) return
  material.color.copy(source.color)
  material.opacity = source.opacity
}

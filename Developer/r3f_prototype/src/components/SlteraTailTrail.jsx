// Sltera 꼬리 라이트바 잔상(11-22 Terry: "빠른 속도에 의해 후방 붉은 라이트의 잔상효과").
// 급가속 퇴장 동안 꼬리 라이트바가 지나간 자리에 남는 두꺼운 붉은 띠. 월드 좌표에 고정된 리본이라 차가 지나간 뒤에도
// 잠시(SLTERA_TRAIL.lifeSec) 남았다가 사라지고, 지그재그·꺾임을 그대로 따라 휜다. 단면은 가운데 밝은 분홍빛 흰 심 +
// 바깥 진한 빨강의 두 톤 띠(11-22부터는 가장자리가 부드럽게 번진다 — 아래). depthWrite 끔·광원 없음 — 메시 1개, 고정 최대 점 수.
// 혼합은 일반 알파(정점 알파로 사라짐): 가산 혼합은 밝은 바닥(베이지 교실 등)에서 빨강이 하얗게 날아가 붉은 띠로 안 읽혔다.
// 2026-11-22 Terry "슬테라 퇴장할 때 후방라이트 효과처럼 끝에 블러를 넣어라": 단면을 딱 끊긴 두 톤 띠에서 부드러운 빛 번짐
// (가운데 밝은 심 → 가장자리 알파 0, Linear 필터)으로 바꾸고, 띠의 먼 끝(가장 오래된 점들)은 길이 방향으로 서서히 사라지며
// 오래된 점일수록 폭이 넓어져(spreadMax) 장노출 사진의 후미등 궤적처럼 번져 흩어진다. 메시·재질은 여전히 1개, 할당 없음.
// 사용법: const trail = useRef(null); <SlteraTailTrail ref={trail} /> 를 차 그룹 바깥(월드)에 두고, 매 프레임
// trail.current.sample(x, y, z, heading, halfWidth, active, nowSec)로 꼬리 라이트바의 월드 위치를 넘긴다.
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import * as THREE from 'three'

export const SLTERA_TRAIL = Object.freeze({
  maxPoints: 64, // 링 버퍼 크기(퇴장 1초 ≈ 60프레임)
  lifeSec: 0.85, // 지나간 자리에 남는 시간
  holdFrac: 0.45, // 수명의 앞 45%는 그대로 밝고 그 뒤 사라진다
  peakOpacity: 0.5, // 가장 밝을 때 불투명도(11-22 Terry "잔상효과는 반투명하게" — 바닥이 비쳐 보이게)
  minStep: 0.06, // 이보다 가까운 새 점은 끝점만 옮긴다(멈춰 있으면 띠가 쌓이지 않게)
  outer: '#ff1426',
  core: '#ff95a2', // 반투명이라 너무 흰 심은 바닥 위에서 바래 보인다 — 밝은 빨강 심
  // ── 끝 블러(11-22) ──
  baseSpread: 1.35, // 띠 폭 = 라이트바 폭 × 1.35 — 가장자리 알파가 0으로 번지는 만큼 바깥으로 넓힌다
  spreadMax: 1.9, // 사라지는 동안 폭이 이 배수까지 퍼진다(오래된 끝일수록 넓고 흐리다)
  endBlurPoints: 12, // 먼 끝(가장 오래된 점)부터 이 점 수만큼 길이 방향 알파 0 → 1 페이드
  coreHalf: 0.22, // 단면 가운데 ±22%는 알파 1, 그 바깥은 가장자리까지 부드럽게 0
})

const smooth01 = (v) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t) }
/** 띠 단면(u 0..1)의 [심 섞임 0..1, 알파 0..1]. 가운데 ±coreHalf는 심 색·알파 1, 가장자리(u=0,1)는 알파 0 — 빛 번짐. */
export function slteraTrailProfile(u) {
  const d = Math.abs(u - 0.5) * 2 // 0 가운데 → 1 가장자리
  const c = SLTERA_TRAIL.coreHalf * 2
  return [1 - smooth01(d / 0.6), d <= c ? 1 : 1 - smooth01((d - c) / (1 - c))]
}

let _trailTex = null
// 띠 단면 텍스처(32×1, Linear 필터): 가운데 분홍빛 밝은 심 → 바깥 진한 빨강 → 가장자리 투명. 모듈 수명 동안 하나.
function getTrailTexture() {
  if (_trailTex) return _trailTex
  const W = 32
  const c = document.createElement('canvas'); c.width = W; c.height = 1
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(W, 1)
  const outer = new THREE.Color(SLTERA_TRAIL.outer); const core = new THREE.Color(SLTERA_TRAIL.core)
  const o = outer.getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace); const k = core.getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace)
  for (let x = 0; x < W; x += 1) {
    const [mix, alpha] = slteraTrailProfile((x + 0.5) / W)
    img.data[x * 4] = Math.round((o.r + (k.r - o.r) * mix) * 255)
    img.data[x * 4 + 1] = Math.round((o.g + (k.g - o.g) * mix) * 255)
    img.data[x * 4 + 2] = Math.round((o.b + (k.b - o.b) * mix) * 255)
    img.data[x * 4 + 3] = Math.round(alpha * 255)
  }
  ctx.putImageData(img, 0, 0)
  _trailTex = new THREE.CanvasTexture(c)
  _trailTex.minFilter = _trailTex.magFilter = THREE.LinearFilter
  _trailTex.wrapS = _trailTex.wrapT = THREE.ClampToEdgeWrapping
  _trailTex.generateMipmaps = false
  _trailTex.colorSpace = THREE.SRGBColorSpace
  return _trailTex
}

/** 링 버퍼 상태(순수 데이터 — 테스트용으로 내보낸다). 점은 오래된 것부터 시간순. */
export function createSlteraTrailState(maxPoints = SLTERA_TRAIL.maxPoints) {
  return { count: 0, maxPoints, lx: new Float32Array(maxPoints), lz: new Float32Array(maxPoints), rx: new Float32Array(maxPoints), rz: new Float32Array(maxPoints), y: new Float32Array(maxPoints), t: new Float64Array(maxPoints) }
}

function dropOldest(st, n) {
  if (n <= 0) return
  for (const key of ['lx', 'lz', 'rx', 'rz', 'y', 't']) st[key].copyWithin(0, n, st.count)
  st.count -= n
}

/** 새 점을 넣고(active일 때만) 수명이 다한 점을 버린다. */
export function sampleSlteraTrail(st, x, y, z, heading, halfWidth, active, now) {
  let dead = 0
  while (dead < st.count && now - st.t[dead] >= SLTERA_TRAIL.lifeSec) dead += 1
  dropOldest(st, dead)
  if (!active) return st
  const sx = Math.cos(heading) * halfWidth; const sz = -Math.sin(heading) * halfWidth
  let i = st.count
  if (i > 0) {
    const last = i - 1
    const cx = (st.lx[last] + st.rx[last]) / 2; const cz = (st.lz[last] + st.rz[last]) / 2
    if (Math.hypot(x - cx, z - cz) < SLTERA_TRAIL.minStep && i > 1) i = last // 거의 안 움직였다 — 끝점만 갱신
  }
  if (i >= st.maxPoints) { dropOldest(st, 1); i = st.count }
  st.lx[i] = x + sx; st.lz[i] = z + sz; st.rx[i] = x - sx; st.rz[i] = z - sz; st.y[i] = y; st.t[i] = now
  if (i === st.count) st.count += 1
  return st
}

/** 점의 밝기(0..1): 앞 holdFrac는 1, 그 뒤 수명 끝까지 0으로. */
export function slteraTrailFade(age) {
  const u = age / SLTERA_TRAIL.lifeSec
  if (!(u < 1)) return 0
  const h = SLTERA_TRAIL.holdFrac
  return u <= h ? 1 : 1 - (u - h) / (1 - h)
}

/** 먼 끝 블러: 가장 오래된 점(index 0)은 0, endBlurPoints번째 점부터 1(부드러운 smoothstep). */
export function slteraTrailEndTaper(index, count) {
  const n = Math.min(SLTERA_TRAIL.endBlurPoints, Math.max(1, count - 1))
  return smooth01(index / n)
}

/** 퍼짐 배수: 막 생긴 점은 baseSpread, 사라지는 동안 spreadMax까지(수명 비율에 따라 부드럽게). */
export function slteraTrailSpread(age) {
  const T = SLTERA_TRAIL
  return T.baseSpread + (T.spreadMax - T.baseSpread) * smooth01(age / T.lifeSec)
}

/**
 * 링 버퍼 → 리본 정점 버퍼(위치 xyz ×2, 색 rgba ×2 / 점). 그릴 인덱스 수를 돌려준다(점이 2개 미만이면 0 — 아무것도 안 그린다).
 * 순수 함수(테스트용으로 내보낸다) — 프레임마다 같은 Float32Array에 덮어쓴다.
 */
export function writeSlteraTrailBuffers(st, pos, col, now) {
  for (let i = 0; i < st.count; i += 1) {
    const age = now - st.t[i]
    const alpha = slteraTrailFade(age) * slteraTrailEndTaper(i, st.count) * SLTERA_TRAIL.peakOpacity
    const spread = slteraTrailSpread(age)
    const cx = (st.lx[i] + st.rx[i]) / 2; const cz = (st.lz[i] + st.rz[i]) / 2
    const hx = (st.lx[i] - st.rx[i]) / 2 * spread; const hz = (st.lz[i] - st.rz[i]) / 2 * spread
    const o = i * 6
    pos[o] = cx + hx; pos[o + 1] = st.y[i]; pos[o + 2] = cz + hz
    pos[o + 3] = cx - hx; pos[o + 4] = st.y[i]; pos[o + 5] = cz - hz
    const c = i * 8
    col[c + 3] = alpha; col[c + 7] = alpha
  }
  return st.count > 1 ? (st.count - 1) * 6 : 0
}

const SlteraTailTrail = forwardRef(function SlteraTailTrail(_, ref) {
  const { geometry, material, state } = useMemo(() => {
    const n = SLTERA_TRAIL.maxPoints
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 2 * 4).fill(1), 4).setUsage(THREE.DynamicDrawUsage)) // rgba — a = 사라짐
    const uv = new Float32Array(n * 2 * 2)
    for (let i = 0; i < n; i += 1) { uv[i * 4] = 0; uv[i * 4 + 2] = 1 }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    const index = []
    for (let i = 0; i < n - 1; i += 1) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    g.setIndex(index)
    g.setDrawRange(0, 0)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6) // 월드를 가로지르는 띠 — 컬링하지 않는다
    const m = new THREE.MeshBasicMaterial({
      map: getTrailTexture(), vertexColors: true, transparent: true,
      depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false,
    })
    return { geometry: g, material: m, state: createSlteraTrailState(n) }
  }, [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useImperativeHandle(ref, () => ({
    sample(x, y, z, heading, halfWidth, active, now) {
      sampleSlteraTrail(state, x, y, z, heading, halfWidth, active, now)
      const drawCount = writeSlteraTrailBuffers(state, geometry.attributes.position.array, geometry.attributes.color.array, now)
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
      geometry.setDrawRange(0, drawCount)
    },
    clear() { state.count = 0; geometry.setDrawRange(0, 0) },
  }), [geometry, state])
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />
})

export default SlteraTailTrail

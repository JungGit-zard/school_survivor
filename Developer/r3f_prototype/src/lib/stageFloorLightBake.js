// 스테이지 색 구역을 바닥 lightMap 한 장으로 굽는다.
//
// 규약
// - 색·위치·감쇠의 정본은 `stageLightingProfile.js` 하나다. 여기서 좌표나 색을 다시
//   적지 않고 프로파일을 읽어서 굽는다(정본 2벌 금지 — xpCurve.js 3중 복제 사고 참조).
// - 런타임 광원을 늘리지 않는다. 결과물은 바닥 머티리얼의 `lightMap` 슬롯에만 들어가므로
//   씬의 `NUM_SPOT_LIGHTS`는 0으로 유지되고 픽셀당 조명 연산이 늘지 않는다.
// - 굽는 식은 three r164가 SpotLight를 계산하는 식(<lights_pars_begin> +
//   BRDF_Lambert)을 바닥 평면(법선 +Y, y=0)에 대해 그대로 옮긴 것이다. lightMap은
//   indirect irradiance로 들어가 direct 항과 똑같이 diffuseColor에 곱해지므로,
//   같은 값을 넣으면 같은 그림이 나온다.
// - 8bit 캔버스는 0~1만 담는다. 실제 irradiance는 1을 넘으므로 peak로 정규화해 굽고,
//   그 peak를 `lightMapIntensity`로 되돌려 곱한다.
import * as THREE from 'three'
import { getStageLightingProfile } from './stageLightingProfile.js'

// 색 얼룩은 완만한 그라데이션이라 이 해상도로 충분하다. 스테이지 진입 시 1회만 굽는다.
export const STAGE_FLOOR_LIGHT_BAKE_RESOLUTION = 256

// three의 SpotLight 기본 decay. 프로파일이 decay를 지정하지 않으므로 이 값이 정본이다.
const SPOT_LIGHT_DECAY = 2

const _color = new THREE.Color()

// three <common> smoothstep(low, high, x)와 같은 동작.
function smoothstep(low, high, x) {
  if (high <= low) return x < low ? 0 : 1
  let t = (x - low) / (high - low)
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t * t * (3 - 2 * t)
}

// three <lights_pars_begin> getDistanceAttenuation(decay = 2 고정).
function distanceAttenuation(dist, cutoff) {
  const falloff = 1 / Math.max(dist ** SPOT_LIGHT_DECAY, 0.01)
  if (!(cutoff > 0)) return falloff
  const ratio = dist / cutoff
  const ratio4 = ratio * ratio * ratio * ratio
  const t = ratio4 >= 1 ? 0 : 1 - ratio4
  return falloff * t * t
}

// 픽셀 루프 밖에서 한 번만 계산할 수 있는 값들을 미리 뽑는다.
// 프로파일의 angle/penumbra/distance/color가 여기서 반경·가장자리·감쇠로 환산된다.
export function prepareStageFloorLights(lights) {
  const prepared = []
  for (const light of lights) {
    const [lx, ly, lz] = light.position
    const [tx, ty, tz] = light.target ?? [lx, 0, lz]
    // spotDirection = normalize(position - target) (three WebGLLights와 동일 방향)
    const sx = lx - tx
    const sy = ly - ty
    const sz = lz - tz
    const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz)
    if (!(sLen > 0) || !(light.intensity > 0)) continue
    _color.set(light.color)
    prepared.push({
      x: lx,
      y: ly,
      z: lz,
      dirX: sx / sLen,
      dirY: sy / sLen,
      dirZ: sz / sLen,
      coneCos: Math.cos(light.angle),
      penumbraCos: Math.cos(light.angle * (1 - light.penumbra)),
      cutoff: light.distance,
      r: _color.r * light.intensity,
      g: _color.g * light.intensity,
      b: _color.b * light.intensity,
    })
  }
  return prepared
}

// 바닥 한 점 (x, 0, z)이 받는 선형 irradiance를 out에 누적해 돌려준다.
// three의 Lambert 직접광 항과 같은 식: NdotL * (color * intensity) * 거리감쇠 * 콘감쇠.
export function accumulateStageFloorIrradiance(prepared, x, z, out = [0, 0, 0]) {
  out[0] = 0
  out[1] = 0
  out[2] = 0
  for (const light of prepared) {
    const vx = light.x - x
    const vy = light.y
    const vz = light.z - z
    const dist = Math.sqrt(vx * vx + vy * vy + vz * vz)
    if (!(dist > 0)) continue
    const invDist = 1 / dist
    // 바닥 법선은 +Y라 NdotL은 정규화된 방향의 y성분 그대로다.
    const ndotl = vy * invDist
    if (ndotl <= 0) continue
    const angleCos = (vx * light.dirX + vy * light.dirY + vz * light.dirZ) * invDist
    const cone = smoothstep(light.coneCos, light.penumbraCos, angleCos)
    if (cone <= 0) continue
    const k = ndotl * cone * distanceAttenuation(dist, light.cutoff)
    if (k <= 0) continue
    out[0] += light.r * k
    out[1] += light.g * k
    out[2] += light.b * k
  }
  return out
}

// 테스트/디버그용 단축 경로. 굽기 루프는 prepare를 재사용한다.
export function sampleStageFloorIrradiance(lights, x, z, out = [0, 0, 0]) {
  return accumulateStageFloorIrradiance(prepareStageFloorLights(lights), x, z, out)
}

// 광원은 자기 `distance` 컷오프 밖으로 정확히 0을 낸다. 그래서 이 반경까지만 구우면
// 캔버스 가장자리가 검게 나오고, ClampToEdge 덕분에 바깥 영역도 자동으로 무광이 된다.
export function getStageFloorLightHalfExtent(lights) {
  let half = 0
  for (const light of lights) {
    const [lx, , lz] = light.position
    const reach = light.distance > 0 ? light.distance : 0
    half = Math.max(half, Math.abs(lx) + reach, Math.abs(lz) + reach)
  }
  return half
}

// 굽는 영역(원점 중심, 한 변 span)을 바닥 평면(width × depth)의 UV에 맞춘다.
// planeGeometry는 uv(0,0)이 로컬 (-w/2, -h/2)이고, FloorPlane의 rotation
// [-PI/2, 0, 0]을 거치면 로컬 +Y가 월드 -Z가 된다. 따라서
//   u = (x + w/2) / w,  v = (h/2 - z) / h
// 이고, 캔버스는 px가 x를, py가 z를 그대로 따라가도록 굽는다.
export function getStageFloorLightMapTransform(span, width, depth) {
  const repeatX = width / span
  const repeatY = depth / span
  return {
    repeatX,
    repeatY,
    offsetX: 0.5 * (1 - repeatX),
    offsetY: 0.5 * (1 - repeatY),
  }
}

function linearToSrgbByte(value) {
  const c = value <= 0 ? 0 : value >= 1 ? 1 : value
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(s * 255)
}

// 머티리얼 생성 인자에 그대로 펼쳐 넣는다. 굽기 결과가 없으면 빈 객체라 기존 동작 그대로다.
export function stageFloorLightMapProps(bake) {
  if (!bake) return {}
  return { lightMap: bake.texture, lightMapIntensity: bake.intensity }
}

export function buildStageFloorLightMap(stageId, {
  width,
  depth,
  resolution = STAGE_FLOOR_LIGHT_BAKE_RESOLUTION,
} = {}) {
  const lights = getStageLightingProfile(stageId)
  if (lights.length === 0) return null
  if (typeof document === 'undefined') return null
  if (!(width > 0) || !(depth > 0)) return null

  const prepared = prepareStageFloorLights(lights)
  if (prepared.length === 0) return null

  const span = getStageFloorLightHalfExtent(lights) * 2
  if (!(span > 0)) return null

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = resolution
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const values = new Float32Array(resolution * resolution * 3)
  const rgb = [0, 0, 0]
  let peak = 0
  for (let py = 0; py < resolution; py += 1) {
    const z = ((py + 0.5) / resolution) * span - span / 2
    for (let px = 0; px < resolution; px += 1) {
      const x = ((px + 0.5) / resolution) * span - span / 2
      accumulateStageFloorIrradiance(prepared, x, z, rgb)
      const i = (py * resolution + px) * 3
      values[i] = rgb[0]
      values[i + 1] = rgb[1]
      values[i + 2] = rgb[2]
      if (rgb[0] > peak) peak = rgb[0]
      if (rgb[1] > peak) peak = rgb[1]
      if (rgb[2] > peak) peak = rgb[2]
    }
  }
  if (!(peak > 0)) return null

  const image = ctx.createImageData(resolution, resolution)
  const data = image.data
  const invPeak = 1 / peak
  for (let i = 0, p = 0; i < values.length; i += 3, p += 4) {
    data[p] = linearToSrgbByte(values[i] * invPeak)
    data[p + 1] = linearToSrgbByte(values[i + 1] * invPeak)
    data[p + 2] = linearToSrgbByte(values[i + 2] * invPeak)
    data[p + 3] = 255
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  // 캔버스 바이트는 sRGB다. three가 선형으로 디코드하게 두면 어두운 감쇠 구간의
  // 8bit 밴딩이 눈에 띄게 줄어든다.
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  const { repeatX, repeatY, offsetX, offsetY } = getStageFloorLightMapTransform(span, width, depth)
  texture.repeat.set(repeatX, repeatY)
  texture.offset.set(offsetX, offsetY)

  return { texture, intensity: peak, span }
}

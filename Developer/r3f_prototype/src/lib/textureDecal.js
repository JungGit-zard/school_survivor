// 텍스처 데칼 기하 유틸 — 파트 로컬 공간에서 면(faceAxis) 위 plane 배치를 계산한다.
// THREE 수학만 사용하는 순수 계산 + 업로드 이미지 다운스케일 헬퍼.
import * as THREE from 'three'
import { DEFAULT_TEXTURE_DECAL } from './graphicsStudioConfig.js'

export const DECAL_SURFACE_EPSILON = 0.01
export const DECAL_MAX_IMAGE_SIZE = 512

// faceAxis별 plane 배치 사양(파트 로컬 기준).
// rotation: 기본 plane(+z를 봄)을 해당 면 법선으로 돌리는 오일러.
// uDir/vDir: offset [u, v]가 이동하는 면내 축 (plane 로컬 +x/+y가 매핑되는 방향).
export const FACE_AXIS_SPECS = Object.freeze({
  '+z': { axisIndex: 2, sign: 1, rotation: [0, 0, 0], uDir: [1, 0, 0], vDir: [0, 1, 0] },
  '-z': { axisIndex: 2, sign: -1, rotation: [0, Math.PI, 0], uDir: [-1, 0, 0], vDir: [0, 1, 0] },
  '+x': { axisIndex: 0, sign: 1, rotation: [0, Math.PI / 2, 0], uDir: [0, 0, -1], vDir: [0, 1, 0] },
  '-x': { axisIndex: 0, sign: -1, rotation: [0, -Math.PI / 2, 0], uDir: [0, 0, 1], vDir: [0, 1, 0] },
  '+y': { axisIndex: 1, sign: 1, rotation: [-Math.PI / 2, 0, 0], uDir: [1, 0, 0], vDir: [0, 0, -1] },
  '-y': { axisIndex: 1, sign: -1, rotation: [Math.PI / 2, 0, 0], uDir: [1, 0, 0], vDir: [0, 0, 1] },
})

// 파트 로컬 법선을 가장 가까운 축으로 스냅. 무효/영벡터는 '+z'.
export function snapLocalNormalToFaceAxis(normal) {
  const x = Number(normal?.x ?? normal?.[0]) || 0
  const y = Number(normal?.y ?? normal?.[1]) || 0
  const z = Number(normal?.z ?? normal?.[2]) || 0
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const az = Math.abs(z)
  if (ax === 0 && ay === 0 && az === 0) return '+z'
  if (ax >= ay && ax >= az) return x >= 0 ? '+x' : '-x'
  if (ay >= ax && ay >= az) return y >= 0 ? '+y' : '-y'
  return z >= 0 ? '+z' : '-z'
}

// 데칼 plane의 파트 로컬 배치 계산.
// localBox: { min: [x,y,z], max: [x,y,z] } — 파트 로컬 AABB. 비어 있으면 원점 기준.
// 반환: { position: [x,y,z], quaternion: [x,y,z,w] }
export function getDecalPlacement(decal, localBox, epsilon = DECAL_SURFACE_EPSILON) {
  const spec = FACE_AXIS_SPECS[decal?.faceAxis] ?? FACE_AXIS_SPECS['+z']
  const min = Array.isArray(localBox?.min) ? localBox.min : [0, 0, 0]
  const max = Array.isArray(localBox?.max) ? localBox.max : [0, 0, 0]
  const safe = (value) => (Number.isFinite(value) ? value : 0)
  const offset = Array.isArray(decal?.offset) ? decal.offset : DEFAULT_TEXTURE_DECAL.offset
  const u = safe(Number(offset[0]))
  const v = safe(Number(offset[1]))

  const position = [0, 1, 2].map((i) => (safe(min[i]) + safe(max[i])) / 2)
  for (let i = 0; i < 3; i += 1) {
    position[i] += spec.uDir[i] * u + spec.vDir[i] * v
  }
  const faceCoord = spec.sign > 0 ? safe(max[spec.axisIndex]) : safe(min[spec.axisIndex])
  position[spec.axisIndex] = faceCoord + spec.sign * epsilon

  const faceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...spec.rotation))
  const rollQuaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    THREE.MathUtils.degToRad(safe(Number(decal?.rotation))),
  )
  const quaternion = faceQuaternion.multiply(rollQuaternion)

  return { position, quaternion: quaternion.toArray() }
}

// 업로드 이미지 다운스케일 목표 크기(가장 긴 변 maxSize 제한). 순수 함수.
export function computeDecalTargetSize(width, height, maxSize = DECAL_MAX_IMAGE_SIZE) {
  const w = Number(width)
  const h = Number(height)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [0, 0]
  const longest = Math.max(w, h)
  if (longest <= maxSize) return [Math.round(w), Math.round(h)]
  const ratio = maxSize / longest
  return [Math.max(1, Math.round(w * ratio)), Math.max(1, Math.round(h * ratio))]
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decal image decode failed'))
    image.src = src
  })
}

// 업로드 File → base64 data URL. 가장 긴 변이 maxSize를 넘으면 canvas로 다운스케일.
// canvas/Image를 못 쓰는 환경(다운스케일 실패)에서는 원본 data URL로 폴백.
// ponytail: base64 임베드. 커지면 에셋파일 파이프라인으로.
export async function fileToDecalDataUrl(file, maxSize = DECAL_MAX_IMAGE_SIZE) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) return null
  let rawDataUrl
  try {
    rawDataUrl = await readFileAsDataUrl(file)
  } catch {
    return null
  }
  if (typeof rawDataUrl !== 'string' || !rawDataUrl.startsWith('data:image/')) return null

  try {
    const image = await loadImageElement(rawDataUrl)
    const sourceWidth = image.naturalWidth || image.width
    const sourceHeight = image.naturalHeight || image.height
    const [width, height] = computeDecalTargetSize(sourceWidth, sourceHeight, maxSize)
    if (!width || !height || (width === sourceWidth && height === sourceHeight)) return rawDataUrl
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } catch {
    return rawDataUrl
  }
}

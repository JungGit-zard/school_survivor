// B04 주방장 보스가 던지는 주방 재료 투사체의 절차적 지오메트리.
//
// 규약
// - 외부 에셋(GLTF/텍스처) 없이 three 프리미티브만 조합한다.
// - 재료 1종 = 병합된 BufferGeometry 1개. 파트별 색은 vertex color로 굽는다.
//   덕분에 body는 MeshToonMaterial({ vertexColors: true }) 하나, outline은 BackSide
//   MeshBasicMaterial 하나만 있으면 되고, 재료당 InstancedMesh 한 쌍으로 끝난다.
// - 시각 부피는 기존 E04 구체(반경 0.09)와 비슷하게 맞춘다. 판정 반경은 건드리지 않는다
//   (E04_PROJECTILE_RADIUS는 kind와 무관한 게임플레이 정본).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  CHEF_INGREDIENT_KINDS,
  ENEMY_PROJECTILE_KIND_CARROT,
  ENEMY_PROJECTILE_KIND_ONION,
  ENEMY_PROJECTILE_KIND_POTATO,
  ENEMY_PROJECTILE_KIND_KNIFE,
} from './enemyProjectilePool.js'

const _color = new THREE.Color()

// 파트 지오메트리에 단색 vertex color를 굽고, 병합 가능하도록 attribute 구성을 맞춘다.
function paint(geometry, hex) {
  _color.setHex(hex)
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = _color.r
    colors[i * 3 + 1] = _color.g
    colors[i * 3 + 2] = _color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function part(geometry, hex, { x = 0, y = 0, z = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  if (sx !== 1 || sy !== 1 || sz !== 1) geometry.scale(sx, sy, sz)
  if (rx !== 0) geometry.rotateX(rx)
  if (rz !== 0) geometry.rotateZ(rz)
  if (x !== 0 || y !== 0 || z !== 0) geometry.translate(x, y, z)
  return paint(geometry, hex)
}

function merge(parts) {
  const merged = mergeGeometries(parts, false)
  parts.forEach((geometry) => geometry.dispose())
  if (!merged) throw new Error('chef ingredient geometry merge failed')
  merged.computeVertexNormals()
  return merged
}

// 당근 — 원뿔 몸통 + 초록 잎.
function createCarrotGeometry() {
  return merge([
    part(new THREE.ConeGeometry(0.072, 0.21, 7), 0xf07c1e, { rx: Math.PI, y: 0.01 }),
    part(new THREE.ConeGeometry(0.028, 0.085, 5), 0x4f9c3a, { y: 0.155 }),
    part(new THREE.ConeGeometry(0.020, 0.065, 4), 0x63b34a, { rz: 0.7, x: 0.036, y: 0.138 }),
  ])
}

// 양파 — 살짝 눌린 구 + 싹 + 뿌리 꼭지.
function createOnionGeometry() {
  return merge([
    part(new THREE.SphereGeometry(0.082, 9, 7), 0xe0cdf0, { sy: 0.92 }),
    part(new THREE.ConeGeometry(0.024, 0.08, 4), 0x8fb35a, { y: 0.112 }),
    part(new THREE.ConeGeometry(0.018, 0.045, 4), 0xc9b6d8, { rx: Math.PI, y: -0.09 }),
  ])
}

// 감자 — 울퉁불퉁한 구 + 어두운 눈 2개.
// 요철은 정점 인덱스가 아니라 방향의 연속 함수라 구 seam에서 갈라지지 않는다(결정론적).
function createPotatoGeometry() {
  const body = new THREE.SphereGeometry(0.085, 12, 9)
  const position = body.attributes.position
  const vertex = new THREE.Vector3()
  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i)
    const length = vertex.length()
    if (length <= 1e-6) continue
    const nx = vertex.x / length
    const ny = vertex.y / length
    const nz = vertex.z / length
    const lumps = Math.sin(nx * 4.1) * Math.cos(ny * 3.3) + Math.sin(nz * 5.2 + 1.3) * 0.6
    vertex.multiplyScalar(1 + lumps * 0.075)
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }
  return merge([
    part(body, 0xbf9256, { sx: 1.16, sy: 0.86, sz: 0.98 }),
    part(new THREE.SphereGeometry(0.016, 5, 4), 0x6b4a26, { x: 0.052, y: 0.052, z: 0.045 }),
    part(new THREE.SphereGeometry(0.013, 5, 4), 0x6b4a26, { x: -0.062, y: -0.028, z: 0.055 }),
  ])
}

// 식칼 — 주방장답게 사각 클리버. 날은 강철, 손잡이는 어두운 나무.
function createKnifeGeometry() {
  return merge([
    part(new THREE.BoxGeometry(0.088, 0.115, 0.009), 0xdfe6ee, { y: 0.058 }),
    part(new THREE.BoxGeometry(0.088, 0.016, 0.010), 0xa9b4c2, { y: 0.006 }),
    part(new THREE.BoxGeometry(0.026, 0.085, 0.020), 0x4a3527, { y: -0.048 }),
  ])
}

const BUILDERS = {
  [ENEMY_PROJECTILE_KIND_CARROT]: createCarrotGeometry,
  [ENEMY_PROJECTILE_KIND_ONION]: createOnionGeometry,
  [ENEMY_PROJECTILE_KIND_POTATO]: createPotatoGeometry,
  [ENEMY_PROJECTILE_KIND_KNIFE]: createKnifeGeometry,
}

// CHEF_INGREDIENT_KINDS 순서와 1:1로 대응하는 지오메트리 배열을 만든다.
export function createChefIngredientGeometries() {
  return CHEF_INGREDIENT_KINDS.map((kind) => BUILDERS[kind]())
}

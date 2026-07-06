// 텍스처 데칼 렌더 — 저장된 데칼 레이어를 파트(studioPartId) 로컬 공간에
// planeGeometry 메시로 붙인다. 프리뷰(GraphicsStudioPreview)와 런타임(StudioTunedGroup)
// 이 같은 sync 함수를 공유한다. 공유 캐시 머티리얼 변이 금지 — 데칼은 자체 geometry/material.
import * as THREE from 'three'
import { getDecalPlacement } from '../lib/textureDecal.js'

const DECAL_KEY = 'studioTextureDecalKey'
const DECAL_MESHES = 'studioTextureDecalMeshes'

// part(group)의 자식 mesh들을 part 로컬 좌표계 기준 AABB로 합산.
// 월드 행렬을 쓰지 않으므로 root 변환·프레임 타이밍과 무관하게 안정적이다.
// (스튜디오 오버레이 — 포커스 아웃라인·데칼 자신 — 은 제외한다)
export function computePartLocalBox(part) {
  const box = new THREE.Box3()
  const childBox = new THREE.Box3()
  const relativeMatrix = new THREE.Matrix4()
  part.traverse((child) => {
    if (child === part || !child.isMesh || !child.geometry) return
    if (child.userData.studioPartGroupOutline || child.userData.studioTextureDecal) return
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    relativeMatrix.identity()
    let node = child
    while (node && node !== part) {
      node.updateMatrix()
      relativeMatrix.premultiply(node.matrix)
      node = node.parent
    }
    childBox.copy(child.geometry.boundingBox).applyMatrix4(relativeMatrix)
    box.union(childBox)
  })
  return box
}

function findPartByStudioId(root, partId) {
  let found = null
  root.traverse((object) => {
    if (!found && object.userData?.studioPartId === partId) found = object
  })
  return found
}

function disposeDecalMesh(mesh) {
  mesh.parent?.remove(mesh)
  mesh.geometry?.dispose()
  const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
  materials.forEach((material) => {
    material.map?.dispose()
    material.dispose()
  })
}

function createDecalMesh(decal, placement) {
  const texture = new THREE.TextureLoader().load(decal.imageDataUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true, // 투명 PNG = 마스크
    toneMapped: false,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  mesh.position.fromArray(placement.position)
  mesh.quaternion.fromArray(placement.quaternion)
  mesh.scale.set(decal.scale[0], decal.scale[1], 1)
  mesh.renderOrder = 5
  mesh.userData.studioTextureDecal = true
  return mesh
}

// base64 전문을 매 프레임 비교하지 않도록 요약 키를 만든다.
function getDecalSyncKey(decals) {
  return decals
    .map((decal) => [
      decal.partId,
      decal.faceAxis,
      decal.offset?.join(','),
      decal.scale?.join(','),
      decal.rotation,
      decal.imageDataUrl?.length,
      decal.imageDataUrl?.slice(-24),
    ].join('|'))
    .join('||')
}

function isAttachedToRoot(mesh, root) {
  let node = mesh
  while (node) {
    if (node === root) return true
    node = node.parent
  }
  return false
}

// root 아래에 데칼 레이어를 동기화한다. 같은 입력이면 no-op.
// 파트가 리마운트되어 데칼이 떨어져 나간 경우(부모 체인에서 root 유실)도 재생성한다.
export function syncTextureDecals(root, decals = []) {
  if (!root || typeof root.traverse !== 'function') return
  const list = Array.isArray(decals) ? decals : []
  const key = getDecalSyncKey(list)
  const tracked = root.userData[DECAL_MESHES] ?? []
  // 전 레이어가 생성되어 아직 root에 붙어 있을 때만 no-op.
  // (파트 미발견/리마운트 시에는 재시도·재생성한다)
  const complete = tracked.length === list.length && tracked.every((mesh) => isAttachedToRoot(mesh, root))
  if (root.userData[DECAL_KEY] === key && complete) return

  tracked.forEach(disposeDecalMesh)
  const strays = []
  root.traverse((object) => {
    if (object.userData.studioTextureDecal) strays.push(object)
  })
  strays.forEach(disposeDecalMesh)

  const created = []
  list.forEach((decal) => {
    const part = findPartByStudioId(root, decal.partId)
    if (!part) return
    const box = computePartLocalBox(part)
    const localBox = box.isEmpty()
      ? { min: [0, 0, 0], max: [0, 0, 0] }
      : { min: box.min.toArray(), max: box.max.toArray() }
    const mesh = createDecalMesh(decal, getDecalPlacement(decal, localBox))
    part.add(mesh)
    created.push(mesh)
  })
  root.userData[DECAL_MESHES] = created
  root.userData[DECAL_KEY] = key
}

// 언마운트 시 누수 방지 — 생성한 데칼 전부 제거·dispose.
export function disposeTextureDecals(root) {
  if (!root || typeof root.traverse !== 'function') return
  const decalMeshes = []
  root.traverse((object) => {
    if (object.userData.studioTextureDecal) decalMeshes.push(object)
  })
  decalMeshes.forEach(disposeDecalMesh)
  root.userData[DECAL_MESHES] = []
  root.userData[DECAL_KEY] = ''
}

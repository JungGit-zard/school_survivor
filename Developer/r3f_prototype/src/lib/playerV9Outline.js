import * as THREE from 'three'
import { outlineMat } from './toon.js'

// 인버티드 헐의 표면 오프셋(헐 표면이 자기 표면 밖으로 밀려나는 거리). 단위는 GLB 모델
// 루트 좌표계이며, 호출부가 모델 그룹에 걸어 둔 modelScale이 그 위에 또 곱해진다.
// 즉 화면 두께는 카메라 거리에 비례해 변한다(인버티드 헐 기법의 성질이다).
//
// ponytail: 예전에는 균일 배율(`hull.scale.setScalar(inflateScale(1.08))` = 1.16)이었다.
// bbox 중심 기준 균일 확대라서 표면 오프셋이 `0.16 × 파츠 half-extent`가 되고, 두께가
// 파츠 크기에 그대로 비례했다 — 2026-10-29 실측으로 머리 0.98 CSS px ↔ 가방 걸쇠 0.10 CSS px,
// 20배 편차였다. 큰 파츠의 16% 확대분이 겨드랑이·가랑이 틈까지 메워 실루엣이 +22.7% 부풀었다.
// 아래 축별 역산(`1 + t / h`)은 그 두 증상을 한 메커니즘에서 같이 닫는다.
export const PLAYER_OUTLINE_THICKNESS = 0.024
// Studio 프리뷰는 모델이 화면을 거의 채우므로 게임플레이의 절반만 쓴다(기존 1.08 : 1.16 비율 유지).
export const PLAYER_OUTLINE_THICKNESS_PREVIEW = PLAYER_OUTLINE_THICKNESS / 2

const _half = new THREE.Vector3()
const _scale = new THREE.Vector3()

// surface 로컬 단위 → 모델 루트 단위 누적 스케일. GLB 노드 5개가 자기 scale을 들고 있고
// 그중 셋은 비균일(`blue_backpack_top_flap` [0.46, 0.16, 0.045] 등)이라 이 보정이 없으면
// 그 파츠들의 오프셋이 다시 20배 어긋난다. matrix decompose 대신 scale 성분을 곱하는 이유:
// 헐을 붙이는 시점에 클론은 씬에 없어 matrixWorld가 갱신돼 있지 않고, 회전 사이에 낀
// 비균일 스케일의 전단(shear)은 decompose도 같은 근사로 뭉갠다.
function scaleToRoot(surface, root, target) {
  target.set(1, 1, 1)
  for (let node = surface; node && node !== root; node = node.parent) target.multiply(node.scale)
  return target
}

// Share the authored surface's silhouette stencil; never draw black inside it.
export function addPlayerV9Outlines(root, thickness = PLAYER_OUTLINE_THICKNESS_PREVIEW) {
  const surfaces = []
  root.traverse((object) => {
    if (object.isMesh && !object.userData.studioRenderOutline) surfaces.push(object)
  })
  for (const surface of surfaces) {
    surface.renderOrder = 90
    for (const material of Array.isArray(surface.material) ? surface.material : [surface.material]) {
      material.stencilWrite = true
      material.stencilRef = 3
      material.stencilFunc = THREE.AlwaysStencilFunc
      material.stencilZPass = THREE.ReplaceStencilOp
    }
    if (surface.name.startsWith('Decal_')) continue
    // Center only the derived hull so Studio's standard outline scale changes
    // thickness around this part, without shifting the source model geometry.
    const geometry = surface.geometry.clone()
    geometry.computeBoundingBox()
    const center = geometry.boundingBox.getCenter(new THREE.Vector3())
    geometry.translate(-center.x, -center.y, -center.z)
    const material = outlineMat()
    material.stencilRef = 3
    const hull = new THREE.Mesh(geometry, material)
    hull.name = `${surface.name}_outline`
    hull.position.copy(center)
    // 축별 역산: scale_i = 1 + t / h_i (h_i = 모델 루트 단위 half-extent). 박스·회전체
    // 파츠에서 각 면의 표면 오프셋이 축과 무관하게 ≈ t 로 떨어진다.
    geometry.boundingBox.getSize(_half).multiplyScalar(0.5).multiply(scaleToRoot(surface, root, _scale))
    hull.scale.set(
      // h_i ≈ 0 인 축(완전 평면 파츠)은 1로 둔다 — 안 그러면 scale이 폭주하고 BackSide가
      // 뒤집힌 검은 블롭이 된다(DogeMesh.jsx 13~17행에 같은 함정 주석이 있다).
      _half.x > 1e-5 ? 1 + thickness / _half.x : 1,
      _half.y > 1e-5 ? 1 + thickness / _half.y : 1,
      _half.z > 1e-5 ? 1 + thickness / _half.z : 1,
    )
    hull.renderOrder = 91
    hull.frustumCulled = false
    hull.userData.studioRenderOutline = true
    surface.add(hull)
  }
}

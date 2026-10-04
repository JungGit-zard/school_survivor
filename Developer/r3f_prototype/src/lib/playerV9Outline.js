import * as THREE from 'three'
import { inflateScale, outlineMat } from './toon.js'

// Share the authored surface's silhouette stencil; never draw black inside it.
export function addPlayerV9Outlines(root) {
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
    hull.scale.setScalar(inflateScale(1.04))
    hull.renderOrder = 91
    hull.frustumCulled = false
    hull.userData.studioRenderOutline = true
    surface.add(hull)
  }
}

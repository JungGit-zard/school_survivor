import * as THREE from 'three'

let _gradient = null

export function getToonGradient() {
  if (_gradient) return _gradient
  const c = document.createElement('canvas')
  c.width = 5; c.height = 1
  const ctx = c.getContext('2d')
  ;['#09070c', '#18131f', '#5c5368', '#beb4cc', '#ffffff'].forEach((col, i) => {
    ctx.fillStyle = col
    ctx.fillRect(i, 0, 1, 1)
  })
  _gradient = new THREE.CanvasTexture(c)
  _gradient.minFilter = _gradient.magFilter = THREE.NearestFilter
  _gradient.generateMipmaps = false
  _gradient.colorSpace = THREE.SRGBColorSpace
  return _gradient
}

export function toonMat(hex, emissiveIntensity = 0.08) {
  return new THREE.MeshToonMaterial({
    color: hex,
    gradientMap: getToonGradient(),
    emissive: hex,
    emissiveIntensity,
  })
}

export function outlineMat(opacity = 0.96) {
  return new THREE.MeshBasicMaterial({
    color: 0x050209,
    side: THREE.BackSide,
    transparent: true,
    opacity,
    depthWrite: false,
  })
}

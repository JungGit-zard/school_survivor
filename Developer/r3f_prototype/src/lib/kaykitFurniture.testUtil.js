import * as THREE from 'three'

// No import of kaykitFurniture.js here: tests vi.mock that module and load this file from the mock
// factory (an import back would deadlock the mock). Node order = the GLB's root order.
// Test stand-in for the KayKit GLB scene (jsdom/node cannot fetch + meshopt-decode the real file).
// Same node names; each node is a box of the real model's bounding size (w x h x d), standing on y = 0,
// with the GLB's one-material/one-atlas layout.
export const KAYKIT_TEST_NODE_SIZES = Object.freeze({
  table_small: [1, 1, 1], chair_A_wood: [0.75, 1.258, 0.845], chair_B_wood: [0.75, 1.258, 0.845],
  table_medium_long: [3, 1, 2], shelf_B_large: [2, 0.4, 0.5], chair_A: [0.75, 1.258, 0.845], table_medium: [2, 1, 2],
  chair_B: [0.75, 1.258, 0.845], book_set: [0.78, 0.5, 0.365], book_single: [0.26, 0.5, 0.365],
  pictureframe_large_A: [1.01, 1.2, 0.2], pictureframe_large_B: [2, 1.2, 0.2], bed_single_A: [1.6, 1, 3],
  bed_single_B: [1.6, 1, 3], cabinet_medium: [2, 1, 1.002], cabinet_medium_decorated: [2.042, 1.827, 1.002],
  cabinet_small: [1, 1, 1.002], chair_stool: [0.75, 0.5, 0.75], pillow_A: [0.65, 0.2, 0.5],
  cactus_small_A: [0.5, 0.552, 0.5], cactus_small_B: [0.5, 0.552, 0.5], pictureframe_medium: [0.7, 0.9, 0.2],
})

let _scene = null
export function getKaykitTestScene() {
  if (_scene) return _scene
  const map = new THREE.Texture()
  map.name = 'furniturebits_texture'
  const material = new THREE.MeshStandardMaterial({ map, name: 'furniture_texture' })
  _scene = new THREE.Group()
  for (const name of Object.keys(KAYKIT_TEST_NODE_SIZES)) {
    const [w, h, d] = KAYKIT_TEST_NODE_SIZES[name]
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    mesh.name = name
    mesh.position.y = h / 2
    _scene.add(mesh)
  }
  _scene.updateMatrixWorld(true)
  return _scene
}

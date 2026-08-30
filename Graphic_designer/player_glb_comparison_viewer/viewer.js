import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const MODEL_URL = './assets/player-image2-2_5head-new-comparison.glb'
const viewerShell = document.querySelector('.viewer-shell')
const canvasHost = document.querySelector('#viewer-canvas')
const status = document.querySelector('#viewer-status')
const errorBox = document.querySelector('#viewer-error')
const resetButton = document.querySelector('#reset-view')
const placeholder = document.querySelector('.canvas-placeholder')

if (!viewerShell || !canvasHost || !status || !errorBox || !resetButton) {
  throw new Error('Independent GLB viewer markup is missing required elements.')
}

const canvas = document.createElement('canvas')
canvas.setAttribute('aria-label', '플레이어 비교 GLB 렌더 캔버스')
canvasHost.appendChild(canvas)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
scene.background = new THREE.Color('#080d18')

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = true
controls.enableZoom = true
controls.screenSpacePanning = true
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
}
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
}

scene.add(new THREE.HemisphereLight('#d7e4ff', '#1a2130', 2.2))
const keyLight = new THREE.DirectionalLight('#fff4e6', 3.1)
keyLight.position.set(5, 8, 6)
scene.add(keyLight)
const rimLight = new THREE.DirectionalLight('#82aafc', 1.8)
rimLight.position.set(-5, 4, -6)
scene.add(rimLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: '#182238', roughness: 0.92, metalness: 0 }),
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

const gridHelper = new THREE.GridHelper(20, 20, '#5974a6', '#293850')
scene.add(gridHelper)

let resetView = () => {}

function setStatus(message, state = 'loading') {
  viewerShell.dataset.viewerState = state
  status.textContent = message
  if (state === 'error') {
    errorBox.hidden = false
    errorBox.textContent = message
  } else {
    errorBox.hidden = true
  }
}

function addRuntimeOutlineModel(model) {
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: '#101827',
    side: THREE.BackSide,
    depthWrite: false,
  })
  const surfaceMeshes = []
  model.traverse((object) => {
    if (object.isMesh) surfaceMeshes.push(object)
  })

  surfaceMeshes.forEach((surface) => {
    const outline = new THREE.Mesh(surface.geometry, outlineMaterial)
    outline.name = `${surface.name || 'player_surface'}__comparison_viewer_outline`
    outline.scale.setScalar(1.032)
    outline.renderOrder = -1
    outline.frustumCulled = surface.frustumCulled
    surface.add(outline)
  })
}

function frameModel(model) {
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const height = Math.max(size.y, 0.1)
  const radius = Math.max(size.length() * 0.6, 0.8)

  model.position.x -= center.x
  model.position.y -= bounds.min.y
  model.position.z -= center.z
  floor.position.y = -0.012
  gridHelper.position.y = 0

  const initialPosition = new THREE.Vector3(0, height * 0.68, radius * 2.65)
  const initialTarget = new THREE.Vector3(0, height * 0.48, 0)
  controls.minDistance = Math.max(radius * 0.45, 0.3)
  controls.maxDistance = radius * 5

  resetView = () => {
    camera.position.copy(initialPosition)
    controls.target.copy(initialTarget)
    controls.update()
  }
  resetView()
}

function resizeRenderer() {
  const rect = canvasHost.getBoundingClientRect()
  const width = Math.max(Math.floor(rect.width), 1)
  const height = Math.max(Math.floor(rect.height), 1)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

new ResizeObserver(resizeRenderer).observe(canvasHost)
resizeRenderer()

resetButton.addEventListener('click', () => resetView())
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') resetView()
})

const loader = new GLTFLoader()
loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene
    model.rotation.x = Math.PI / 2
    addRuntimeOutlineModel(model)
    scene.add(model)
    frameModel(model)
    placeholder?.remove()
    setStatus('모델 로드 완료. 왼쪽 드래그=세로·가로 회전, 휠=확대·축소, 오른쪽 드래그=화면 이동, R/버튼=초기화.', 'ready')
  },
  (progress) => {
    const percent = progress.total > 0 ? ` ${Math.round((progress.loaded / progress.total) * 100)}%` : ''
    setStatus(`모델을 불러오는 중…${percent}`, 'loading')
  },
  (error) => {
    console.error('Failed to load comparison-only Player Image2 GLB.', error)
    setStatus('모델을 불러오지 못했습니다. assets/player-image2-2_5head-new-comparison.glb 파일을 확인하세요.', 'error')
  },
)

function render() {
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

render()

import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const runtime = vi.hoisted(() => ({ scene: null, frame: null }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useMemo: (factory) => factory(),
  useRef: (current) => ({ current }),
  useEffect: (effect) => effect(),
}))
vi.mock('@react-three/fiber', () => ({ useFrame: (frame) => { runtime.frame = frame }, useThree: () => ({}) }))
vi.mock('@react-three/drei', () => ({ useGLTF: Object.assign(() => ({ scene: runtime.scene }), { preload: () => {} }) }))

import PlayerRosariModel, {
  PLAYER_ROSARI_RAW_HEIGHT,
  PLAYER_ROSARI_RAW_MIN_Y,
} from './PlayerRosariModel.jsx'
import StudioTunedGroup, { applySavedStudioPartTunings, applyStudioTuning, findStudioPartByKey } from './StudioTunedGroup.jsx'
import { GRAPHICS_STUDIO_CATALOG } from '../lib/graphicsStudioConfig.js'

const D = THREE.MathUtils.degToRad

// GLB에 베이크된 포즈 회전(XYZ 오일러, 도)과 pivot 변위. GLB의 JSON/BIN 청크를 직접 파싱해
// 얻은 실측값이며, 같은 스크립트로 v9를 재면 선언 상수와 비트 단위로 일치한다.
// 테스트의 요점은 이 값들이 "애니메이션이 아니라 base"로 살아남는지다.
const BAKED = {
  head_neck_pivot: { t: [0, 0.68, 0], r: [0.238713, 0, 0] },
  left_shoulder_pivot: { t: [-0.450005, 0.450333, -0.079999], r: [2.887509, -0.482725, -18.977714] },
  right_shoulder_pivot: { t: [0.449995, 0.450333, -0.079999], r: [-2.705438, -0.452085, 18.969847] },
  left_hip_pivot: { t: [-0.23, 0.96, 0], r: [-2.181550, 0, 0] },
  right_hip_pivot: { t: [0.23, 0.96, 0], r: [1.994095, 0, 0] },
  backpack_pivot: { t: [0, 0.28, -0.425], r: [0, 0, 0] },
  left_knee_pivot: { t: [0, -0.38, 0.01], r: [2.600781, 0, 0] },
  right_knee_pivot: { t: [0, -0.38, 0.01], r: [0.858550, 0, 0] },
  left_elbow_pivot: { t: [0, -0.42, 0.01], r: [-1.522908, 0, 0] },
  right_elbow_pivot: { t: [0, -0.42, 0.01], r: [1.191288, 0, 0] },
  torso_spine_pivot: { t: [0, 1.2, 0], r: [-0.190960, -0.002626, -0.143213] },
  body_pivot_pelvis: { t: [0, 0, 0], r: [0, 0, 0] },
  pose_root_all_parts: { t: [0, 0, 0], r: [0, 0, 0] },
}

const UNDRIVEN_PARTS = ['left_knee_pivot', 'right_knee_pivot', 'left_elbow_pivot', 'right_elbow_pivot']
// 씬 루트에서 리그와 형제로 떠 있는 노드들 (몸통 외피 + 어깨 캡 2개).
const RIG_ORPHANS = [
  'simple_closed_lego_torso_exterior_one_piece',
  'left_seated_shoulder_cap_underarm_bridge',
  'right_seated_shoulder_cap_underarm_bridge',
]

function node(name, { mesh = false } = {}) {
  const spec = BAKED[name]
  const object = mesh
    ? new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial())
    : new THREE.Group()
  object.name = name
  if (spec) {
    object.position.fromArray(spec.t)
    object.rotation.set(D(spec.r[0]), D(spec.r[1]), D(spec.r[2]))
  }
  return object
}

// 실제 GLB의 모양을 그대로 재현한다 — 루트 자식 4개, 리그는 그 중 하나.
function buildRosariScene() {
  const scene = new THREE.Group()
  const root = node('pose_root_all_parts')
  const pelvis = node('body_pivot_pelvis')
  const spine = node('torso_spine_pivot')
  for (const side of ['left', 'right']) {
    const hip = node(`${side}_hip_pivot`)
    hip.add(node(`${side}_knee_pivot`))
    pelvis.add(hip)
    const shoulder = node(`${side}_shoulder_pivot`)
    shoulder.add(node(`${side}_elbow_pivot`))
    spine.add(shoulder)
  }
  spine.add(node('backpack_pivot'))
  const head = node('head_neck_pivot')
  head.add(node('coherent_head_skull_UV_image_face', { mesh: true }))
  spine.add(head)
  pelvis.add(spine)
  root.add(pelvis)
  scene.add(root)
  for (const name of RIG_ORPHANS) {
    const orphan = node(name, { mesh: true })
    orphan.position.set(0.11, 1.42, -0.07)
    scene.add(orphan)
  }
  return scene
}

function mountGroups(element) {
  if (!element) return null
  if (element.type === 'primitive') return element.props.object
  if (typeof element.type === 'function' && element.type !== StudioTunedGroup) return mountGroups(element.type(element.props))
  if (element.type !== 'group' && element.type !== 'mesh' && element.type !== StudioTunedGroup) {
    return element.props?.children ? mountGroups(element.props.children) : null
  }
  const group = element.type === 'mesh' ? new THREE.Mesh(undefined, element.props.material) : new THREE.Group()
  group.name = element.props.name ?? ''
  if (element.props.position) group.position.fromArray(element.props.position)
  if (element.props.scale) group.scale.fromArray(element.props.scale)
  if (element.props.rotation) group.rotation.fromArray(element.props.rotation)
  if (typeof element.ref === 'function') element.ref(group)
  else if (element.ref) element.ref.current = group
  for (const child of [element.props.children].flat(Infinity)) {
    const object = mountGroups(child)
    if (object) group.add(object)
  }
  return group
}

function renderPlayer(props = {}) {
  const groupRef = { current: null }
  const root = mountGroups(PlayerRosariModel({ groupRef, movingRef: { current: false }, ...props }))
  return { root, groupRef, model: root.getObjectByName('player-rosari-model'), studio: root.children[0] }
}

const rotationOf = (root, name) => root.getObjectByName(name).rotation.toArray().slice(0, 3)

beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) })
  vi.spyOn(performance, 'now').mockReturnValue(4321)
  runtime.scene = buildRosariScene()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(componentsDir, '../..')
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const source = () => read('./PlayerRosariModel.jsx')

describe('Player rosari gameplay and Studio runtime model contract', () => {
  it('matches the shared world height and foot anchor with its own measured bounds', () => {
    const preview = renderPlayer().model
    const gameplay = renderPlayer({ gameplay: true }).model
    for (const axis of ['x', 'y', 'z']) expect(gameplay.scale[axis] / preview.scale[axis]).toBeCloseTo(0.9, 14)
    expect(PLAYER_ROSARI_RAW_HEIGHT * preview.scale.y).toBeCloseTo(0.89244, 14)
    expect(PLAYER_ROSARI_RAW_HEIGHT * gameplay.scale.y).toBeCloseTo(0.89244 * 0.9, 14)
    expect(gameplay.position.y + PLAYER_ROSARI_RAW_MIN_Y * gameplay.scale.y).toBeCloseTo(-0.32, 14)
    expect(preview.position.y + PLAYER_ROSARI_RAW_MIN_Y * preview.scale.y).toBeCloseTo(-0.32, 14)
    // MiniHealthBar y=0.75와 Matilda 기절 포즈는 전고가 같으면 외형과 무관하다:
    // floorY + maxY*scale === -0.32 + WORLD_HEIGHT*0.9 로 v9와 항등적으로 일치한다.
    const headTop = gameplay.position.y + (PLAYER_ROSARI_RAW_MIN_Y + PLAYER_ROSARI_RAW_HEIGHT) * gameplay.scale.y
    expect(headTop).toBeCloseTo(-0.32 + 0.89244 * 0.9, 14)
    expect(headTop).toBeLessThan(0.75)
  })

  it('wires all six pose parts and captures the GLB baked rotation as their base', () => {
    const { root } = renderPlayer()
    for (const name of ['head_neck_pivot', 'left_shoulder_pivot', 'right_shoulder_pivot', 'left_hip_pivot', 'right_hip_pivot', 'backpack_pivot']) {
      const part = root.getObjectByName(name)
      expect(part, `${name} 가 트리에 없다`).toBeTruthy()
      expect(part.userData.studioPartBaseRotation, `${name} base 미캡처`).toBeTruthy()
      for (const [index, axis] of ['x', 'y', 'z'].entries()) {
        expect(part.userData.studioPartBaseRotation[axis]).toBeCloseTo(D(BAKED[name].r[index]), 12)
      }
    }
  })

  // Studio가 저장한 `player-rosari::part::<경로>` 가 실제 어깨 노드로 해석되고, 그 오프셋이
  // 포즈 애니메이션이 한 프레임 더 돌아도 살아남는지 — 즉 §6③ "즉시 반영"의 런타임 절반.
  it('keeps a saved Studio part offset alive through the pose frame and returns to the baked pose at zero', () => {
    const { root, studio } = renderPlayer()
    const shoulderKey = '0.1.0.0.2.1'
    const shoulder = root.getObjectByName('right_shoulder_pivot')
    expect(findStudioPartByKey(studio, shoulderKey)).toBe(shoulder)

    runtime.frame({ clock: { elapsedTime: 1 } }, 1 / 60)
    const neutral = rotationOf(root, 'right_shoulder_pivot')

    const offsetDeg = { rotationX: 11, rotationY: -7, rotationZ: 23 }
    const saved = { [`player-rosari::part::${shoulderKey}`]: offsetDeg }
    applySavedStudioPartTunings(studio, 'player-rosari', saved, { materialTuning: false })
    runtime.frame({ clock: { elapsedTime: 1 } }, 1 / 60)
    for (const [index, axis] of ['x', 'y', 'z'].entries()) {
      const deg = offsetDeg[`rotation${axis.toUpperCase()}`]
      expect(shoulder.rotation[axis], `offset 이 ${axis} 축에서 지워졌다`).toBeCloseTo(neutral[index] + D(deg), 12)
    }

    applySavedStudioPartTunings(studio, 'player-rosari', {}, { materialTuning: false })
    runtime.frame({ clock: { elapsedTime: 1 } }, 1 / 60)
    for (const [index, axis] of ['x', 'y', 'z'].entries()) {
      expect(shoulder.rotation[axis]).toBeCloseTo(neutral[index], 12)
    }
  })

  it('never touches the knee and elbow pivots, so their baked flexion survives every frame', () => {
    const { root } = renderPlayer({ previewArmAction: 'boxCutter' })
    for (let i = 0; i < 4; i += 1) runtime.frame({ clock: { elapsedTime: i }, }, 1 / 60)
    for (const name of UNDRIVEN_PARTS) {
      for (const [index, axis] of ['x', 'y', 'z'].entries()) {
        expect(root.getObjectByName(name).rotation[axis], `${name}.${axis}`).toBeCloseTo(D(BAKED[name].r[index]), 12)
      }
    }
  })

  // 절대대입으로 퇴화하면 Studio 오프셋이 다음 프레임에 지워진다. 문자열 포함 검사만 하는
  // StudioAnimationContract의 게이트로는 "6파츠는 헬퍼, 나머지는 절대대입"이 통과하므로
  // 이 파일에서 파츠 대입문 전수를 본다.
  it('assigns part transforms only through the Studio composition helpers', () => {
    const assignments = source().match(/^\s*p\.\w+\.(rotation|position|scale)\.[xyz] = .*$/gm) ?? []
    expect(assignments.length).toBeGreaterThan(10)
    for (const line of assignments) {
      expect(line.trim(), 'base를 보존하지 않는 절대대입이다').toMatch(/= composeStudioPart(Rotation|Position|Scale)\(/)
    }
    expect(source()).toContain('<StudioTunedGroup itemId="player-rosari">')
  })

  it('uses the game inverted-hull outline system, not the room screen-space one', () => {
    const { model } = renderPlayer()
    const face = model.getObjectByName('coherent_head_skull_UV_image_face')
    const hull = face.children.find((child) => child.userData.studioRenderOutline)
    expect(hull).toBeTruthy()
    expect(face.material.stencilRef).toBe(3)
    expect(hull.material.stencilRef).toBe(3)
    expect(hull.material.side).toBe(THREE.BackSide)
    expect(hull.material.stencilFunc).toBe(THREE.NotEqualStencilFunc)
    let isOutlineMarkers = 0
    model.traverse((object) => { if (object.userData.isOutline) isOutlineMarkers += 1 })
    expect(isOutlineMarkers).toBe(0)
    expect(source()).toContain('addPlayerV9Outlines')
    for (const roomOnly of ['applyPixelOutlines', 'makeOutlineMaterial', 'updateOutlineUniforms', 'userData.isOutline =']) {
      expect(source(), `${roomOnly} 는 로자리 방 전용 아웃라인 경로다`).not.toContain(roomOnly)
    }
    // 피격 플래시는 헐을 건너뛴다 — 안 그러면 캐릭터가 확대된 흰 덩어리가 된다.
    expect(source()).toContain('if (!object.isMesh || object.userData.studioRenderOutline) return')
    // Studio의 outlineThickness는 헐 scale로만 간다.
    const before = hull.scale.x
    applyStudioTuning(face, { outlineThickness: 1.5, outlineColor: '#112233', outlineOpacity: 0.7 })
    expect(hull.scale.x).toBeCloseTo(before * 1.06)
    expect(hull.material.color.getHexString()).toBe('112233')
  })

  it('pulls the torso shell and shoulder caps into the rig without moving them', () => {
    runtime.scene.updateMatrixWorld(true)
    const expected = RIG_ORPHANS.map((name) => runtime.scene.getObjectByName(name).matrixWorld.clone())
    const { model } = renderPlayer()
    model.updateMatrixWorld(true)
    const sceneRoot = model.getObjectByName('pose_root_all_parts').parent
    const spine = model.getObjectByName('torso_spine_pivot')
    expect(sceneRoot.children.map((child) => child.name)).toEqual(['pose_root_all_parts'])
    const toSceneRoot = new THREE.Matrix4().copy(sceneRoot.matrixWorld).invert()
    for (const [index, name] of RIG_ORPHANS.entries()) {
      const moved = model.getObjectByName(name)
      expect(moved.parent, `${name} 가 리그 밖에 남았다`).toBe(spine)
      const actual = new THREE.Matrix4().multiplyMatrices(toSceneRoot, moved.matrixWorld)
      for (const [i, value] of expected[index].elements.entries()) {
        expect(actual.elements[i], `${name} 의 월드 변환이 바뀌었다`).toBeCloseTo(value, 12)
      }
    }
  })

  it('loads the rosari GLB from src/assets so Vite hashes it past the immutable asset cache', () => {
    const bundled = path.join(packageRoot, 'src/assets/models/PLAYER_wholebody_refined_t_efe49b7c.glb')
    const roomCopy = path.join(packageRoot, 'public/assets/rosari-room/PLAYER_wholebody_refined_t_efe49b7c.glb')
    expect(statSync(bundled).size).toBe(statSync(roomCopy).size)
    expect(source()).toContain("import playerRosariUrl from '../assets/models/PLAYER_wholebody_refined_t_efe49b7c.glb?url'")
    expect(source()).not.toContain('/assets/rosari-room/')
    expect(source()).toContain('PLAYER_ROSARI_RAW_HEIGHT = 3.1435834385248578')
    expect(source()).toContain('PLAYER_ROSARI_RAW_MIN_Y = 0.0044028037559165067')
    expect(source()).toContain('PLAYER_ROSARI_WORLD_HEIGHT = 3.35 * 0.2664')
  })

  // 위 테스트들은 합성 트리를 쓴다. 실제 GLB가 노드 이름이나 포즈를 바꿔 다시 export되면
  // PLAYER_ROSARI_PARTS 조회가 조용히 실패하고(useFrame이 early return) 주인공이 굳은 채로
  // 서 있게 된다 — 에러도 경고도 없다. 그래서 자산 쪽 사실을 직접 본다.
  it('matches the shipped GLB node names and baked pose that the parts map and base capture rely on', () => {
    const buffer = readFileSync(path.join(packageRoot, 'src/assets/models/PLAYER_wholebody_refined_t_efe49b7c.glb'))
    let offset = 12
    let json = null
    while (offset < buffer.length && !json) {
      const length = buffer.readUInt32LE(offset)
      if (buffer.readUInt32LE(offset + 4) === 0x4e4f534a) json = JSON.parse(buffer.toString('utf8', offset + 8, offset + 8 + length))
      offset += 8 + length
    }
    const byName = new Map(json.nodes.map((entry) => [entry.name, entry]))
    const scene = json.scenes[json.scene ?? 0]

    expect(scene.nodes.map((index) => json.nodes[index].name).sort()).toEqual([...RIG_ORPHANS, 'pose_root_all_parts'].sort())
    for (const name of [...Object.keys(BAKED), ...RIG_ORPHANS]) {
      expect(byName.has(name), `GLB에 ${name} 노드가 없다`).toBe(true)
    }
    for (const [name, spec] of Object.entries(BAKED)) {
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().fromArray(byName.get(name).rotation ?? [0, 0, 0, 1]),
        'XYZ',
      )
      for (const [index, axis] of ['x', 'y', 'z'].entries()) {
        expect(THREE.MathUtils.radToDeg(euler[axis]), `${name}.${axis} 베이크 회전이 바뀌었다`).toBeCloseTo(spec.r[index], 5)
      }
    }
  })

  it('keeps a Studio identity of its own and shows itself, not v9, in the Studio preview', () => {
    const item = GRAPHICS_STUDIO_CATALOG.find((entry) => entry.id === 'player-rosari')
    const v9Item = GRAPHICS_STUDIO_CATALOG.find((entry) => entry.id === 'player-v9')
    expect(item).toBeTruthy()
    expect(item.category).toBe('actor')
    expect(item.previewKind).toBe(v9Item.previewKind)
    expect(item.source).toBe('components/PlayerRosariModel.jsx')
    const preview = read('./GraphicsStudioPreview.jsx')
    expect(preview).toContain("'player-rosari': 'rosari'")
    expect(preview).toContain('comparisonModel={STUDIO_PLAYER_APPEARANCES[item.id] ?? item.id}')
    expect(read('./Player.jsx')).toContain("appearance === 'rosari'")
  })
})

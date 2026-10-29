import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const runtime = vi.hoisted(() => ({ scene: null, frame: null, cleanups: [] }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useMemo: (factory) => factory(),
  useRef: (current) => ({ current }),
  // 언마운트 정리(의상 액세서리·아웃라인 헐 해제)를 테스트에서 돌릴 수 있게 모아 둔다.
  useEffect: (effect) => { const cleanup = effect(); if (cleanup) runtime.cleanups.push(cleanup) },
}))
vi.mock('@react-three/fiber', () => ({ useFrame: (frame) => { runtime.frame = frame }, useThree: () => ({}) }))
vi.mock('@react-three/drei', () => ({ useGLTF: Object.assign(() => ({ scene: runtime.scene }), { preload: () => {} }) }))

import PlayerRosariModel, {
  PLAYER_ROSARI_RAW_HEIGHT,
  PLAYER_ROSARI_RAW_MIN_Y,
} from './PlayerRosariModel.jsx'
import StudioTunedGroup, { applySavedStudioPartTunings, applyStudioTuning, findStudioPartByKey } from './StudioTunedGroup.jsx'
import { GRAPHICS_STUDIO_CATALOG } from '../lib/graphicsStudioConfig.js'
import {
  ROSARI_BASE_COLORS,
  ROSARI_OUTFIT_TORSO_NODE,
  getRosariGarmentSlot,
  getRosariMaterialBaseName,
  resolveRosariOutfit,
} from '../lib/rosariOutfits.js'

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

// 출하 GLB의 (메시 노드, 머티리얼) 쌍 그대로다. 아래 'mirrors the shipped GLB garment
// surfaces' 테스트가 자산에서 직접 재확인하므로 이 표는 추측이 아니다.
// 의상 재색 대상(가먼트)과 대상이 아닌 표면(머리카락·목·손·가방·신발)을 함께 둬서,
// 재색이 번지는 회귀를 같은 픽스처에서 잡는다.
const FIXTURE_BASE_COLOR = '#1a2b3c'
const SPINE_SURFACES = [
  ['left_upper_sleeve_continuous_to_white_cuff', 'jacket'],
  ['right_upper_sleeve_continuous_to_white_cuff', 'jacket.001'],
  ['left_white_cuff_band_at_wrist', 'shirt'],
  ['right_white_cuff_band_at_wrist', 'shirt.001'],
  ['white_collar_left_triangle', 'collar'],
  ['white_collar_right_triangle', 'collar.001'],
  ['yellow_tie_knot', 'tie'],
  ['yellow_tie_long_drop', 'tie.001'],
  ['reference_tapered_pleated_skirt_shell', 'skirt'],
  ['continuous_fitted_reference_bob', 'hair'],
  ['short_neck_visible_below_complete_skull', 'skin'],
  ['left_simple_lowpoly_hand_mitten', 'skin.001'],
  ['rounded_square_blue_backpack_body', 'backpack'],
]
const LEG_SURFACES = {
  left: [
    ['left_upper_leg_tapered_thigh_to_knee', 'skin.006'],
    ['left_lower_leg_tapered_knee_to_sock', 'skin.005'],
    ['left_white_sock_six_ring_column', 'sock'],
    ['left_rounded_reference_shoe', 'roundedShoe'],
  ],
  right: [
    ['right_upper_leg_tapered_thigh_to_knee', 'skin.008'],
    ['right_lower_leg_tapered_knee_to_sock', 'skin.007'],
    ['right_white_sock_six_ring_column', 'sock.001'],
    ['right_rounded_reference_shoe', 'roundedShoe.001'],
  ],
}
const GARMENT_SURFACES = [...SPINE_SURFACES, ...LEG_SURFACES.left, ...LEG_SURFACES.right]

function node(name, { mesh = false, materialName = '' } = {}) {
  const spec = BAKED[name]
  const object = mesh
    ? new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ name: materialName, color: FIXTURE_BASE_COLOR }),
    )
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
    // 다리 표면은 무릎 **뒤에** 붙인다 — `${side}_knee_pivot`은 계속 children[0]이라
    // 저장된 Studio 파츠 인덱스 경로가 밀리지 않는다.
    for (const [meshName, materialName] of LEG_SURFACES[side]) {
      hip.add(node(meshName, { mesh: true, materialName }))
    }
    pelvis.add(hip)
    const shoulder = node(`${side}_shoulder_pivot`)
    shoulder.add(node(`${side}_elbow_pivot`))
    spine.add(shoulder)
  }
  spine.add(node('backpack_pivot'))
  const head = node('head_neck_pivot')
  head.add(node('coherent_head_skull_UV_image_face', { mesh: true, materialName: 'faceSkin' }))
  spine.add(head)
  // 몸통 표면도 어깨·가방·머리 다음에 붙어 spine.children[1] === right_shoulder_pivot 가 유지된다.
  for (const [meshName, materialName] of SPINE_SURFACES) {
    spine.add(node(meshName, { mesh: true, materialName }))
  }
  pelvis.add(spine)
  root.add(pelvis)
  scene.add(root)
  for (const name of RIG_ORPHANS) {
    // 몸통 외피와 어깨 캡 3개는 실제 GLB에서 같은 `jacket.002` 머티리얼 인덱스를 공유한다.
    const orphan = node(name, { mesh: true, materialName: 'jacket.002' })
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
  runtime.cleanups = []
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

// 방 옷장에서 고른 의상이 스테이지에서도 같은 모습으로 나오는지 — 값 존재가 아니라
// 클론의 머티리얼 색과 실제로 붙은 액세서리 메시를 본다.
describe('Player rosari gameplay outfit', () => {
  const WINTER = resolveRosariOutfit('winter').colors
  const hex = (material) => `#${material.color.getHexString()}`
  const surfaceByName = (model, name) => model.getObjectByName(name)
  const accessoriesOf = (model) => model
    .getObjectByName(ROSARI_OUTFIT_TORSO_NODE)
    .children
    .filter((child) => child.name.startsWith('outfit_'))

  it('mirrors the shipped GLB garment surfaces, so the fixture is not a guess', () => {
    const buffer = readFileSync(path.join(packageRoot, 'src/assets/models/PLAYER_wholebody_refined_t_efe49b7c.glb'))
    let offset = 12
    let json = null
    while (offset < buffer.length && !json) {
      const length = buffer.readUInt32LE(offset)
      if (buffer.readUInt32LE(offset + 4) === 0x4e4f534a) json = JSON.parse(buffer.toString('utf8', offset + 8, offset + 8 + length))
      offset += 8 + length
    }
    const shipped = new Map()
    for (const entry of json.nodes) {
      if (entry.mesh === undefined) continue
      shipped.set(entry.name, json.meshes[entry.mesh].primitives.map((primitive) => json.materials[primitive.material]?.name))
    }
    for (const [meshName, materialName] of [...GARMENT_SURFACES, ...RIG_ORPHANS.map((name) => [name, 'jacket.002'])]) {
      expect(shipped.get(meshName), `GLB에 ${meshName} 메시 노드가 없다`).toBeTruthy()
      expect(shipped.get(meshName), `${meshName} 의 머티리얼 이름이 바뀌었다`).toContain(materialName)
    }
    // base 팔레트는 머티리얼 이름으로만 붙는다. GLB를 다시 저작하면서 이름이 바뀌면 리컬러가
    // 조용히 멈추고 그 면만 출고 색으로 되돌아간다 — 그 회귀를 여기서 잡는다.
    const shippedBaseNames = new Set(json.materials.map((material) => getRosariMaterialBaseName(material.name)))
    for (const key of Object.keys(ROSARI_BASE_COLORS)) {
      expect(shippedBaseNames, `GLB에 ${key} 머티리얼이 없다 — base 팔레트가 적용되지 않는다`).toContain(key)
    }
  })

  // 색은 두 겹이다: 먼저 base 팔레트(ROSARI_BASE_COLORS, 머티리얼 base name 기준), 그 위에
  // 고른 의상의 가먼트 색. 둘 중 어느 쪽도 이름을 대지 않는 머티리얼(피부·얼굴)만 픽스처 색으로
  // 남는다. 그래서 "기본 의상은 아무것도 안 건드린다"는 옛 단정은 더 이상 성립하지 않는다.
  const expectedColor = (meshName, materialName, outfitId) => resolveRosariOutfit(outfitId).colors[getRosariGarmentSlot(meshName, materialName)]
    ?? ROSARI_BASE_COLORS[getRosariMaterialBaseName(materialName)]
    ?? FIXTURE_BASE_COLOR

  it('recolors every garment slot on the clone; hair, shoes and bag take the base palette and skin keeps its own', () => {
    const { model } = renderPlayer({ outfit: 'winter', gameplay: true })
    let recolored = 0
    for (const [meshName, materialName] of [...GARMENT_SURFACES, ...RIG_ORPHANS.map((name) => [name, 'jacket.002'])]) {
      const slot = getRosariGarmentSlot(meshName, materialName)
      const material = surfaceByName(model, meshName).material
      expect(hex(material), `${meshName} (${slot ?? 'base'}) 색이 두 겹 계약과 다르다`).toBe(expectedColor(meshName, materialName, 'winter'))
      if (slot) recolored += 1
    }
    // 블레이저 3(몸통 + 어깨캡 2) + 소매 2 + 커프 2 + 칼라 2 + 넥타이 2 + 스커트 1 + 레그웨어 6
    expect(recolored).toBe(18)
    expect(hex(surfaceByName(model, 'continuous_fitted_reference_bob').material)).toBe(ROSARI_BASE_COLORS.hair)
    expect(hex(surfaceByName(model, 'rounded_square_blue_backpack_body').material)).toBe(ROSARI_BASE_COLORS.backpack)
    expect(hex(surfaceByName(model, 'left_rounded_reference_shoe').material)).toBe(ROSARI_BASE_COLORS.roundedShoe)
    // 피부와 얼굴 텍스처 머티리얼은 두 겹 중 어느 쪽에도 없다.
    expect(hex(surfaceByName(model, 'left_simple_lowpoly_hand_mitten').material)).toBe(FIXTURE_BASE_COLOR)
    expect(hex(surfaceByName(model, 'coherent_head_skull_UV_image_face').material)).toBe(FIXTURE_BASE_COLOR)
  })

  it('paints the vivid base palette for the default outfit and attaches no accessory', () => {
    const { model } = renderPlayer({ outfit: 'default', gameplay: true })
    for (const [meshName, materialName] of [...GARMENT_SURFACES, ...RIG_ORPHANS.map((name) => [name, 'jacket.002'])]) {
      expect(hex(surfaceByName(model, meshName).material), `${meshName} 가 기본 의상 base 색과 다르다`).toBe(expectedColor(meshName, materialName, 'default'))
    }
    // 구형 v9 참고로 올린 핵심 네 덩어리가 실제 게임플레이 클론에 실려 있는지.
    expect(hex(model.getObjectByName(ROSARI_OUTFIT_TORSO_NODE).material)).toBe('#d42020')
    expect(hex(surfaceByName(model, 'reference_tapered_pleated_skirt_shell').material)).toBe('#2d8cff')
    expect(hex(surfaceByName(model, 'continuous_fitted_reference_bob').material)).toBe('#ff8fb0')
    expect(hex(surfaceByName(model, 'right_rounded_reference_shoe').material)).toBe('#8090a8')
    expect(accessoriesOf(model)).toEqual([])
    // 몸통의 자식으로는 아웃라인 헐만 남는다.
    const torso = model.getObjectByName(ROSARI_OUTFIT_TORSO_NODE)
    expect(torso.children.map((child) => child.userData.studioRenderOutline)).toEqual([true])
  })

  it('falls back to the default outfit for an unknown saved id instead of throwing', () => {
    const { model } = renderPlayer({ outfit: 'tuxedo', gameplay: true })
    expect(accessoriesOf(model)).toEqual([])
    expect(hex(model.getObjectByName(ROSARI_OUTFIT_TORSO_NODE).material)).toBe(ROSARI_BASE_COLORS.jacket)
  })

  it('attaches the three winter accessories to the torso with game toon materials in the outline pipeline', () => {
    const { model } = renderPlayer({ outfit: 'winter', gameplay: true })
    const accessories = accessoriesOf(model)
    expect(accessories.map((mesh) => mesh.name)).toEqual(['outfit_winter_shirtV', 'outfit_winter_lapels', 'outfit_winter_buttons'])
    expect(accessories.map((mesh) => hex(mesh.material))).toEqual([WINTER.shirt, '#5e1627', '#e6b04a'])
    let triangles = 0
    for (const accessory of accessories) {
      // 방의 ARCHIVE_TOON_GRADIENT 가 아니라 게임 toonMat 의 램프를 쓰고 stencil 도 표면과 같다.
      expect(accessory.material).toBeInstanceOf(THREE.MeshToonMaterial)
      expect(accessory.material.name).toBe('outfit_accessory')
      expect(accessory.material.gradientMap).toBe(model.getObjectByName('yellow_tie_knot').material.gradientMap)
      expect(accessory.material.stencilWrite).toBe(true)
      expect(accessory.material.stencilRef).toBe(3)
      expect(accessory.material.stencilFunc).toBe(THREE.AlwaysStencilFunc)
      expect(accessory.renderOrder).toBe(90)
      // 표면과 똑같이 자기 인버티드 헐을 갖는다 — 몸통 실루엣 안쪽이라 stencil 에 걸려
      // 아무것도 그리지 않지만, Studio 가 파츠를 키워 밖으로 나오면 외곽선이 생긴다.
      const hull = accessory.children.find((child) => child.userData.studioRenderOutline)
      expect(hull, `${accessory.name} 에 아웃라인 헐이 없다`).toBeTruthy()
      expect(hull.material.side).toBe(THREE.BackSide)
      expect(hull.material.stencilFunc).toBe(THREE.NotEqualStencilFunc)
      expect(hull.material.stencilRef).toBe(3)
      const position = accessory.geometry.attributes.position
      triangles += (accessory.geometry.index ? accessory.geometry.index.count : position.count) / 3
    }
    expect(triangles).toBeLessThanOrEqual(120)
    // 피격 플래시는 헐만 건너뛴다 — 액세서리는 표면이라 같이 흰색이 돼야 한다.
    expect(accessories.every((mesh) => !mesh.userData.studioRenderOutline)).toBe(true)
  })

  it('places the accessories where the room places them, despite the rig orphan reparenting', () => {
    runtime.scene.updateMatrixWorld(true)
    const sourceTorsoWorld = runtime.scene.getObjectByName(ROSARI_OUTFIT_TORSO_NODE).matrixWorld.clone()
    const { model } = renderPlayer({ outfit: 'winter', gameplay: true })
    const sceneRoot = model.getObjectByName('pose_root_all_parts').parent
    sceneRoot.updateMatrixWorld(true)
    const toSceneRoot = new THREE.Matrix4().copy(sceneRoot.matrixWorld).invert()
    for (const accessory of accessoriesOf(model)) {
      // 토르소 로컬 좌표로 저작된 지오메트리라 로컬 변환은 항등이어야 한다 — 방과 같은 조건.
      expect(accessory.position.lengthSq()).toBe(0)
      expect(accessory.scale.toArray()).toEqual([1, 1, 1])
      accessory.geometry.computeBoundingBox()
      const expected = accessory.geometry.boundingBox.clone().applyMatrix4(sourceTorsoWorld)
      const actual = accessory.geometry.boundingBox.clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toSceneRoot, accessory.matrixWorld))
      for (const bound of ['min', 'max']) {
        for (const axis of ['x', 'y', 'z']) {
          expect(actual[bound][axis], `${accessory.name}.${bound}.${axis} 가 밀렸다`).toBeCloseTo(expected[bound][axis], 12)
        }
      }
    }
  })

  it('releases the accessory geometry and the material it created on unmount', () => {
    const { model } = renderPlayer({ outfit: 'winter', gameplay: true })
    const accessories = accessoriesOf(model)
    expect(accessories).toHaveLength(3)
    const spies = accessories.flatMap((accessory) => [
      vi.spyOn(accessory.geometry, 'dispose'),
      vi.spyOn(accessory.userData.rosariOutfitMaterial, 'dispose'),
    ])
    expect(runtime.cleanups).toHaveLength(1)
    runtime.cleanups.forEach((cleanup) => cleanup())
    for (const spy of spies) expect(spy).toHaveBeenCalled()
  })

  it('applies the outfit once per clone, never from the frame loop', () => {
    expect(source()).toContain('const scene = useMemo(() => clonePlayerRosariScene(gltf.scene, gameplay, outfit), [gltf.scene, gameplay, outfit])')
    expect(source().slice(source().indexOf('useFrame((')), 'useFrame 안에서 의상을 적용하면 매 프레임 비용이 된다').not.toContain('applyRosariOutfit')
    expect((source().match(/applyRosariOutfit\(/g) ?? []).length).toBe(1)
    // 방과 같은 GLB라서 방의 적용 함수를 그대로 쓴다 — v9의 머티리얼/데칼 리맵은 필요 없다.
    expect(source()).toContain("from '../lib/rosariOutfits.js'")
    expect(source(), 'v9 전용 리맵을 import하면 안 된다').not.toMatch(/^import .*playerV9Outfits/m)
    // 게임플레이 로자리 분기도 의상을 받는다.
    expect(read('./Player.jsx')).toContain('<PlayerRosariModel movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} gameplay={gameplay} outfit={outfit} />')
  })
})

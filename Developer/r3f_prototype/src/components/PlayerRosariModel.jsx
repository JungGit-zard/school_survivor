import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { toonMat } from '../lib/toon.js'
import { PLAYER_OUTLINE_THICKNESS, PLAYER_OUTLINE_THICKNESS_PREVIEW, addPlayerV9Outlines } from '../lib/playerV9Outline.js'
import { DEFAULT_ROSARI_OUTFIT_ID, applyRosariOutfit } from '../lib/rosariOutfits.js'
import { bagSwingState, playerArmActionState } from '../lib/refs.js'
import { getActivePlayerArmAction, getPlayerArmPose } from '../lib/playerArmAction.js'
import StudioTunedGroup, {
  captureStudioPartBaseTransform,
  composeStudioPartPosition,
  composeStudioPartRotation,
} from './StudioTunedGroup.jsx'
import playerRosariUrl from '../assets/models/PLAYER_wholebody_refined_t_efe49b7c.glb?url'

// 로자리 리파인 전신 GLB의 실측 경계. 두 청크(JSON/BIN)를 직접 파싱해 모든 primitive의
// 정점을 노드 월드 변환으로 밀어 넣고 구한 값이다 — accessor의 min/max를 AABB 코너로
// 변환하는 방식은 어깨가 19° 회전해 있어서 전고를 3.1462로 과대평가한다. 같은 스크립트로
// v9를 재면 PLAYER_V9_RAW_HEIGHT / PLAYER_V9_RAW_MIN_Y와 비트 단위로 일치한다.
// 월드 전고(0.89244)는 세 외형이 공유하는 계약이므로 그대로 쓰고, 스케일만 재도출한다.
export const PLAYER_ROSARI_MODEL_URL = playerRosariUrl
export const PLAYER_ROSARI_RAW_HEIGHT = 3.1435834385248578
export const PLAYER_ROSARI_RAW_MIN_Y = 0.0044028037559165067
export const PLAYER_ROSARI_WORLD_HEIGHT = 3.35 * 0.2664
export const PLAYER_ROSARI_SCALE = PLAYER_ROSARI_WORLD_HEIGHT / PLAYER_ROSARI_RAW_HEIGHT
export const PLAYER_ROSARI_FLOOR_Y = -0.32 - PLAYER_ROSARI_RAW_MIN_Y * PLAYER_ROSARI_SCALE

// 게임 포즈 계약(head/slvL/slvR/legL/legR/bag)에 대응하는 로자리 리그 노드.
// 이름이 v9와 하나도 겹치지 않으므로 PLAYER_V9_PARTS를 재사용할 수 없다.
// 이 6개 노드는 GLB에 포즈 회전이 베이크되어 있다(어깨 z ∓18.97°, hip x ∓2°, head x 0.24°).
// 그 베이크값은 captureStudioPartBaseTransform이 base로 흡수하므로, 아래 useFrame은
// v9와 똑같이 base 인자에 0을 넘긴다. 자세한 근거는 composeStudioPartRotation 주석 참조.
const PLAYER_ROSARI_PARTS = Object.freeze({
  head: 'head_neck_pivot',
  slvL: 'left_shoulder_pivot',
  slvR: 'right_shoulder_pivot',
  legL: 'left_hip_pivot',
  legR: 'right_hip_pivot',
  bag: 'backpack_pivot',
})

// 씬 루트에 리그(`pose_root_all_parts`)와 **형제로** 몸통 외피와 어깨 캡 2개가 떠 있다.
// 그 상태로 Studio가 `torso_spine_pivot`에 회전을 주면 머리·팔·가방·넥타이만 돌고 몸통만
// 제자리에 남는다 — Studio UI의 정상 조작으로 도달 가능한 분리 버그다. attach()는 월드
// 변환을 보존하므로 실루엣·접지·bbox는 그대로고 트리만 v9처럼 단일 루트로 합쳐진다.
// 정본 해법은 `.blend`에서 부모를 고쳐 다시 export하는 것이고, 이 런타임 보정은 그때 지운다.
const PLAYER_ROSARI_RIG_ORPHANS = Object.freeze([
  'simple_closed_lego_torso_exterior_one_piece',
  'left_seated_shoulder_cap_underarm_bridge',
  'right_seated_shoulder_cap_underarm_bridge',
])

// 어깨 pivot 로컬 공간에서의 랜턴 부착 오프셋. v9는 (0, −0.76, +0.20)인데, 그 상수를
// 로자리에 그대로 쓰면 랜턴이 목표 위치에서 0.0949 world units(전고의 11.8%) 어긋난다 —
// 어깨 원점이 더 낮고 더 벌어져 있으며 z로 19° 기울어 있기 때문이다. 아래 값은 "손 메시
// 중심을 기준으로 v9와 같은 상대 위치"를 어깨 로컬로 역변환해 얻었다.
//   v9:     랜턴(0.34, 1.125, 0.42) − 손(0.69, 1.1625, 0.24) = (−0.35, −0.0375, +0.18)
//   로자리: 손(0.72866, 1.15573, 0.05724) + 위 델타 → 어깨 로컬 (−0.24267, −0.49427, +0.29204)
const PLAYER_ROSARI_LANTERN_OFFSET = new THREE.Matrix4().makeTranslation(-0.24267, -0.494274, 0.292035)
const PLAYER_ROSARI_LANTERN_LIGHT_LENGTH = 2.08 / 3 / 0.2664
const PLAYER_ROSARI_LANTERN_LIGHT_RADIUS = 1.8 / 3 / 0.2664
const PLAYER_ROSARI_LANTERN_LENS_Y = -0.36

// 랜턴 본체는 v9와 같은 raw 치수를 쓴다(두 GLB의 raw 스케일 차이가 1.8%뿐이다).
// PlayerV9Model.jsx의 PlayerV9LanternModel이 원본이며, 그쪽을 import하면 모듈 스코프의
// useGLTF.preload(PLAYER_v9_final.glb)까지 끌려와 쓰지 않는 389KB를 선로딩하게 된다.
const PLAYER_ROSARI_LANTERN_BLOCKS = Object.freeze([
  { size: [0.34, 0.2, 0.24], position: [0, -0.02, 0], color: 0x1f63c9, emissive: 0.18 },
  { size: [0.22, 0.08, 0.1], position: [0, 0.09, 0.03], color: 0x17498f, emissive: 0.12 },
  { size: [0.24, 0.06, 0.11], position: [0, 0.15, 0.04], color: 0x123f82, emissive: 0.1 },
  { size: [0.12, 0.05, 0.08], position: [0, 0.21, 0.06], color: 0xffd33d, emissive: 0.45 },
  { size: [0.18, 0.24, 0.28], position: [0, -0.24, 0.02], color: 0x202633, emissive: 0.04 },
  { size: [0.13, 0.035, 0.16], position: [0, -0.36, 0.02], color: 0xf2f4ff, emissive: 0.85 },
  { size: [0.04, 0.14, 0.05], position: [0, 0.27, -0.02], color: 0x111111, emissive: 0.02 },
])

function cloneMaterial(material) {
  if (!material) return material
  // GLTFLoader already supplies linear Color values and sRGB base-color maps.
  // Keep those values intact when adopting the game's toon lighting pipeline.
  const cloned = toonMat(material.color, material.emissiveIntensity ?? 0, material.side)
  for (const key of ['name', 'map', 'alphaMap', 'normalMap', 'emissiveMap', 'transparent', 'opacity', 'alphaTest', 'vertexColors']) {
    if (material[key] !== undefined) cloned[key] = material[key]
  }
  if (material.normalScale) cloned.normalScale.copy(material.normalScale)
  if (material.emissive) cloned.emissive.copy(material.emissive)
  cloned.emissiveMap = material.emissiveMap ?? material.map ?? null
  cloned.depthTest = true
  cloned.depthWrite = true
  cloned.stencilRef = 3
  cloned.needsUpdate = true
  return cloned
}

// 의상 액세서리 머티리얼. 로자리 방의 makeOutfitAccessoryMaterial을 그대로 쓸 수는 없다 —
// 그쪽은 방 전용 회색 5단 램프(ARCHIVE_TOON_GRADIENT)이고 stencil을 켜지 않으므로,
// 바로 옆 블레이저(게임 toonMat의 어두운 보라 램프)와 명암이 다른 단계에서 끊긴다.
// 그래서 cloneMaterial이 GLB 표면에 쓰는 것과 **같은** toonMat()을 쓴다. emissive는
// toonMat이 color로 잡고 intensity 0으로 두며, StudioTunedGroup의 applyStudioTuning이
// 마운트 시 모든 표면의 emissiveIntensity를 같은 값(0.14)으로 정규화한다.
// stencilRef는 toonMat이 1로 두지만 뒤따르는 addPlayerV9Outlines가 3으로 맞춰 준다.
function makeRosariOutfitAccessoryMaterial(color) {
  const material = toonMat(color, 0)
  material.name = 'outfit_accessory'
  material.depthTest = true
  material.depthWrite = true
  return material
}

export function reparentRosariRigOrphans(root) {
  const spine = root?.getObjectByName?.('torso_spine_pivot')
  if (!spine) return 0
  root.updateMatrixWorld(true)
  let moved = 0
  for (const name of PLAYER_ROSARI_RIG_ORPHANS) {
    const node = root.getObjectByName(name)
    if (!node || node.parent !== root) continue
    spine.attach(node)
    moved += 1
  }
  return moved
}

function clonePlayerRosariScene(scene, gameplay, outfit = DEFAULT_ROSARI_OUTFIT_ID) {
  const cloned = scene.clone(true)
  reparentRosariRigOrphans(cloned)
  cloned.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    object.renderOrder = 90
    object.frustumCulled = false
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material)
  })
  // 방과 같은 GLB이므로 방의 적용 함수를 그대로 쓴다(v9는 다른 GLB라서 playerV9Outfits.js의
  // 머티리얼/노드 이름 매핑과 데칼 텍셀 리맵이 필요했다 — 여기서는 전부 불필요하다).
  // 클론당 1회이며 기본 의상은 no-op이다. 액세서리를 아웃라인 **앞에** 붙이는 이유:
  // 그래야 GLB 표면과 똑같이 stencilRef 3을 쓰고 자기 헐을 갖는다. 액세서리는 몸통 실루엣
  // 안쪽(x −0.29..0.315 ⊂ 몸통 −0.40..0.43)이라 그 헐은 stencil NotEqual 3에 전부 걸려
  // 아무것도 그리지 않는다 — 실루엣이 깨질 수 없고, Studio가 파츠를 키워 액세서리가 밖으로
  // 나오는 경우에만 올바른 외곽선이 생긴다. 방의 스크린스페이스 아웃라인도 같은 stencil
  // 규칙(ref 3, NotEqual)이라 방에서 보이는 모습과 일치한다.
  // 액세서리는 몸통 노드의 children 끝에 붙으므로 기존 Studio 파츠 인덱스 경로는 밀리지 않는다.
  for (const accessory of applyRosariOutfit(cloned, outfit, makeRosariOutfitAccessoryMaterial)) {
    accessory.castShadow = true
    accessory.receiveShadow = true
    accessory.frustumCulled = false
    // Studio가 머티리얼을 isolate하면 accessory.material이 Studio 소유 clone으로 바뀐다.
    // 언마운트 때 우리가 만든 원본을 놓아 주려면 그 참조를 들고 있어야 한다.
    accessory.userData.rosariOutfitMaterial = accessory.material
  }
  // 게임 아웃라인 정본(인버티드 헐 + studioRenderOutline 마커 + stencilRef 3)만 쓴다.
  // 로자리 방의 스크린스페이스 압출 아웃라인은 userData.isOutline을 쓰기 때문에
  // ① Studio의 outlineThickness가 헐 scale을 키워 12% 확대 흑색 복제본을 만들고
  // ② 피격 플래시가 헐을 흰 머티리얼로 교체해 캐릭터를 흰 덩어리로 바꾼다.
  addPlayerV9Outlines(cloned, gameplay ? PLAYER_OUTLINE_THICKNESS : PLAYER_OUTLINE_THICKNESS_PREVIEW)
  return cloned
}

function setPlayerRosariFlash(root, flashMaterial, active) {
  root?.traverse((object) => {
    if (!object.isMesh || object.userData.studioRenderOutline) return
    if (active) {
      if (!object.userData.playerRosariBaseMaterial) object.userData.playerRosariBaseMaterial = object.material
      object.material = flashMaterial
      return
    }
    if (object.userData.playerRosariBaseMaterial) {
      object.material = object.userData.playerRosariBaseMaterial
      delete object.userData.playerRosariBaseMaterial
    }
  })
}

function PlayerRosariShadow() {
  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.44,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [],
  )

  return (
    <mesh name="player-rosari-shadow" rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAYER_ROSARI_RAW_MIN_Y + 0.01, 0.04]} scale={[0.78, 0.7, 1]} renderOrder={1} material={shadowMat}>
      <circleGeometry args={[1, 36]} />
    </mesh>
  )
}

function PlayerRosariLanternBlock({ name, size, position, color, emissive }) {
  const material = useMemo(() => new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: emissive }), [color, emissive])
  return (
    <mesh name={name} position={position} renderOrder={92} material={material}>
      <boxGeometry args={size} />
    </mesh>
  )
}

function PlayerRosariLanternLight() {
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffdf72,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  return (
    <mesh name="player-rosari-lantern-light" position={[0, PLAYER_ROSARI_LANTERN_LENS_Y - PLAYER_ROSARI_LANTERN_LIGHT_LENGTH / 2, 0.02]} renderOrder={93} material={material}>
      <coneGeometry args={[PLAYER_ROSARI_LANTERN_LIGHT_RADIUS, PLAYER_ROSARI_LANTERN_LIGHT_LENGTH, 4, 1, true]} />
    </mesh>
  )
}

function PlayerRosariLanternModel() {
  return (
    <group name="player-rosari-lantern-model" rotation={[0, 0, -0.05]}>
      {PLAYER_ROSARI_LANTERN_BLOCKS.map((block, index) => (
        <PlayerRosariLanternBlock key={index} name={`player-rosari-lantern-${index}`} {...block} />
      ))}
      <PlayerRosariLanternLight />
    </group>
  )
}

export default function PlayerRosariModel({ groupRef, movingRef, animateRef = null, hitFlashToken = 0, previewArmAction = null, gameplay = false, outfit = DEFAULT_ROSARI_OUTFIT_ID }) {
  const modelScale = PLAYER_ROSARI_SCALE * (gameplay ? 0.9 : 1)
  const floorY = -0.32 - PLAYER_ROSARI_RAW_MIN_Y * modelScale
  const gltf = useGLTF(PLAYER_ROSARI_MODEL_URL)
  const scene = useMemo(() => clonePlayerRosariScene(gltf.scene, gameplay, outfit), [gltf.scene, gameplay, outfit])
  const modelRef = useRef(null)
  const lanternRef = useRef(null)
  const parts = useRef({})
  const blend = useRef(0)
  const lastHitFlashToken = useRef(hitFlashToken)
  const hitFlashFrames = useRef(0)
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), [])
  flashMat.stencilWrite = true
  flashMat.stencilRef = 3
  flashMat.stencilFunc = THREE.AlwaysStencilFunc
  flashMat.stencilZPass = THREE.ReplaceStencilOp

  const setRoot = (el) => {
    if (groupRef) groupRef.current = el
  }

  useEffect(() => {
    const found = {}
    scene.traverse((object) => {
      for (const [key, nodeName] of Object.entries(PLAYER_ROSARI_PARTS)) {
        if (object.name === nodeName) {
          captureStudioPartBaseTransform(object)
          found[key] = object
        }
      }
    })
    parts.current = found
    return () => {
      scene.traverse((object) => {
        if (object.userData.studioRenderOutline) {
          object.geometry.dispose()
          object.material.dispose()
          return
        }
        // GLB 표면의 지오메트리는 useGLTF 캐시 소유라 건드리지 않는다. ownedGeometry가
        // 붙은 메시는 의상 액세서리뿐이고, 그 지오메트리와 머티리얼은 이 클론이 만든 것이다.
        if (!object.userData.ownedGeometry) return
        object.geometry.dispose()
        object.userData.rosariOutfitMaterial?.dispose()
        if (object.material !== object.userData.rosariOutfitMaterial) object.material?.dispose()
      })
    }
  }, [scene])

  useFrame(({ clock }, delta) => {
    const p = parts.current
    if (!p.legL || !p.legR || !p.slvL || !p.slvR) return
    // animateRef(선택): 숨겨진 상주 인스턴스(오니기리 미니 분신)는 비활성 동안 포즈 계산을 건너뛴다.
    if (animateRef && !animateRef.current) return

    if (hitFlashToken !== lastHitFlashToken.current) {
      lastHitFlashToken.current = hitFlashToken
      hitFlashFrames.current = 1
    }
    setPlayerRosariFlash(modelRef.current, flashMat, hitFlashFrames.current > 0)
    if (hitFlashFrames.current > 0) hitFlashFrames.current -= 1

    const isMoving = movingRef?.current ?? false
    blend.current += ((isMoving ? 1 : 0) - blend.current) * Math.min(1, delta * 10)
    const b = blend.current
    const t = performance.now() * 0.001
    const sw = Math.sin(t * 8.0) * 0.45 * b
    const breathe = Math.sin(t * 1.8) * 0.028 * (1 - b)
    const walkBob = Math.abs(Math.sin(t * 8.0)) * 0.022 * b
    const bob = breathe + walkBob

    // base 인자는 전부 0이다. composeStudioPartRotation은 userData.studioPartBaseRotation이
    // 있으면 그 값을 base로 쓰고, 없을 때만 이 인자로 떨어진다. 위 useEffect의
    // captureStudioPartBaseTransform(그리고 StudioTunedGroup의 마운트 시 전수 캡처)이
    // GLB 베이크 회전을 이미 base로 잡아 두므로, 여기서 베이크값을 다시 넘기면 두 번 더해진다.
    p.legL.rotation.x = composeStudioPartRotation(p.legL, 'x', 0, sw)
    p.legR.rotation.x = composeStudioPartRotation(p.legR, 'x', 0, -sw)

    const armAction = previewArmAction
      ? { type: previewArmAction, progress: 0.5 }
      : getActivePlayerArmAction(playerArmActionState, clock.elapsedTime * 1000)
    const armPose = getPlayerArmPose({ action: armAction, walkSwing: sw })
    const breatheArm = Math.sin(t * 1.8) * 0.03 * (1 - b)

    p.slvL.rotation.x = composeStudioPartRotation(p.slvL, 'x', 0, armPose.slvL.x)
    p.slvL.rotation.y = composeStudioPartRotation(p.slvL, 'y', 0, armPose.slvL.y)
    p.slvL.rotation.z = composeStudioPartRotation(p.slvL, 'z', 0, armPose.slvL.z + breatheArm)
    p.slvR.rotation.x = composeStudioPartRotation(p.slvR, 'x', 0, armPose.slvR.x)
    p.slvR.rotation.y = composeStudioPartRotation(p.slvR, 'y', 0, armPose.slvR.y)
    p.slvR.rotation.z = composeStudioPartRotation(p.slvR, 'z', 0, armPose.slvR.z - breatheArm)

    if (lanternRef.current) {
      lanternRef.current.visible = armAction?.type === 'lanternAim' || armAction?.type === 'lanternFlashlight'
      modelRef.current.updateWorldMatrix(true, false)
      p.slvR.updateWorldMatrix(true, false)
      lanternRef.current.matrix.copy(modelRef.current.matrixWorld).invert().multiply(p.slvR.matrixWorld).multiply(PLAYER_ROSARI_LANTERN_OFFSET)
      lanternRef.current.matrixAutoUpdate = false
    }

    if (bagSwingState.active) {
      const swingT = bagSwingState.progress
      const swingPower = Math.sin(swingT * Math.PI)
      const sweep = -1.25 + swingT * 2.5
      p.slvR.rotation.x = composeStudioPartRotation(p.slvR, 'x', 0, -1.55 * swingPower)
      p.slvR.rotation.y = composeStudioPartRotation(p.slvR, 'y', 0, -0.35 * swingPower)
      p.slvR.rotation.z = composeStudioPartRotation(p.slvR, 'z', 0, -0.25 - sweep * 0.78)
      p.slvL.rotation.x = composeStudioPartRotation(p.slvL, 'x', 0, -0.35 * swingPower)
      p.slvL.rotation.z = composeStudioPartRotation(p.slvL, 'z', 0, 0.24 * swingPower)
    }

    if (p.bag) {
      p.bag.rotation.z = composeStudioPartRotation(
        p.bag,
        'z',
        0,
        bagSwingState.active ? 0 : -0.05 + Math.sin(t * 5.5) * 0.03 * b,
      )
    }
    if (p.head) p.head.position.y = composeStudioPartPosition(p.head, 'y', 0, bob)
  })

  return (
    <group ref={setRoot}>
      <StudioTunedGroup itemId="player-rosari">
        <group name="player-rosari-model" ref={modelRef} position={[0, floorY, 0]} scale={[modelScale, modelScale, modelScale]}>
          <PlayerRosariShadow />
          <primitive object={scene} />
          <group name="player-rosari-lantern" ref={lanternRef} visible={false}>
            <PlayerRosariLanternModel />
          </group>
        </group>
      </StudioTunedGroup>
    </group>
  )
}

useGLTF.preload(PLAYER_ROSARI_MODEL_URL)

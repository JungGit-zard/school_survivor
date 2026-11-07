// E07 "웃는얼굴 좀비" 전용 몸통 렌더 레이어.
//
// 왜 InstancedMesh(ZombieInstanceLayer)가 아닌가:
// 이 좀비의 얼굴은 텍스처가 아니라 프래그먼트 셰이더로 직접 그린 평면이다
// (ProceduralFaceTestZombie). ZombieInstanceLayer는 "박스 파트 + 역할별 단색"을
// 전제로 만든 파이프라인이라(파트 테이블·color role·numeric path 매핑) 셰이더 얼굴을
// 넣으려면 그 정본 전체를 건드려야 한다. E07은 동시 등장 수가 한 자릿수라
// 인스턴싱 이득보다 그 개조 리스크가 크다.
//
// 분업:
//  - 시뮬레이션(이동·추격·접촉 데미지·HP·사망)  : enemyPool + enemySimulation (다른 잡몹과 동일)
//  - 그림자 / 미니 체력바 / 스폰 "펑" 연기       : ZombieInstanceLayer (type 15도 bodyVisible 대상)
//  - 몸통 비주얼                                  : 이 레이어
//
// 스튜디오 튜닝은 StudioTunedGroup itemId="zombie-procedural-face-test"로 그대로 먹는다.
// STUDIO_OUTER_MOTION_ONLY — 아래 useFrame은 StudioTunedGroup 바깥 그룹만 움직인다.
import { createRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { enemyPool, screenBounds } from '../lib/refs.js'
import { getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import { getFlashMat } from '../lib/toon.js'
import { PROCEDURAL_FACE_ZOMBIE_CAPACITY, isProceduralFaceZombieCandidate } from './PooledEnemyVisuals.js'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import ProceduralFaceTestZombie from './ProceduralFaceTestZombie.jsx'

// 슬롯 16개(슬롯당 드로콜 13개). 스테이지 3은 E07이 30기 넘게 동시에 살아 있으므로, 상한 밖의
// 개체는 ZombieInstanceLayer가 같은 분배 규칙(isProceduralFaceZombieCandidate)으로 표준 툰 박스 몸통을
// 그린다. 화면 밖 개체는 슬롯을 차지하지 않는다.
export { PROCEDURAL_FACE_ZOMBIE_CAPACITY }
const STUDIO_ITEM_ID = getStudioZombieItemId('E07')
const MAX_POOL_SLOTS = 200

// 피격 플래시: 몸통 박스 메시만 흰 플래시 재질로 바꿨다가 원래(스튜디오 소유) 재질로 되돌린다.
// 외곽선 헐(studioRenderOutline)과 셰이더 얼굴(studioNonTunable)은 건드리지 않는다.
function collectFlashMeshes(group, out) {
  group.traverse((node) => {
    if (node.isMesh && !node.userData.studioRenderOutline && !node.userData.studioNonTunable && !node.material?.isShaderMaterial) out.push(node)
  })
  return out
}

export function setProceduralFaceSlotFlash(meshes, flashing) {
  for (let i = 0; i < meshes.length; i += 1) {
    const mesh = meshes[i]
    if (flashing && !mesh.userData.faceLayerFlashRestore) {
      mesh.userData.faceLayerFlashRestore = mesh.material
      mesh.material = getFlashMat()
      mesh.userData.studioNonTunable = true
    } else if (!flashing && mesh.userData.faceLayerFlashRestore) {
      mesh.material = mesh.userData.faceLayerFlashRestore
      delete mesh.userData.faceLayerFlashRestore
      delete mesh.userData.studioNonTunable
    }
  }
}

export default function ProceduralFaceZombieLayer() {
  const slots = useMemo(
    () => Array.from({ length: PROCEDURAL_FACE_ZOMBIE_CAPACITY }, () => createRef()),
    [],
  )
  const flashMeshes = useMemo(() => slots.map(() => []), [slots])
  const flashState = useMemo(() => new Uint8Array(PROCEDURAL_FACE_ZOMBIE_CAPACITY), [])

  useFrame(() => {
    const pool = enemyPool
    let used = 0
    if (pool) {
      const max = Math.min(
        MAX_POOL_SLOTS - 1,
        Number.isInteger(pool.highestActive) ? pool.highestActive : MAX_POOL_SLOTS - 1,
      )
      for (let index = 0; index <= max && used < PROCEDURAL_FACE_ZOMBIE_CAPACITY; index += 1) {
        // 스폰 "펑" 정본: 연기가 먼저 뜨고 300ms 뒤에야 몸통이 드러난다(후보 판정에 포함).
        if (!isProceduralFaceZombieCandidate(pool, index, screenBounds)) continue
        const timer = pool.spawnTimer[index]
        const group = slots[used].current
        used += 1
        if (!group) continue
        const scale = (pool.visualScale[index] || 1) * 0.333
        // 보행감: 위아래 바운스 + 좌우 뒤뚱. 파트 회전이 아니라 바깥 그룹만 흔들어
        // 스튜디오 파트 튜닝과 절대 싸우지 않게 한다.
        const walk = timer * 0.007
        group.position.set(
          pool.posX[index],
          pool.posY[index] + Math.abs(Math.sin(walk)) * scale * 0.16,
          pool.posZ[index],
        )
        group.rotation.set(0, pool.yaw[index], Math.sin(walk) * 0.06)
        group.scale.setScalar(scale)
        group.visible = true
        const slot = used - 1
        const flashing = pool.hitFlashTimer[index] > 0 ? 1 : 0
        if (flashing !== flashState[slot]) {
          if (!flashMeshes[slot].length) collectFlashMeshes(group, flashMeshes[slot])
          setProceduralFaceSlotFlash(flashMeshes[slot], flashing === 1)
          flashState[slot] = flashing
        }
      }
    }
    for (let slot = used; slot < PROCEDURAL_FACE_ZOMBIE_CAPACITY; slot += 1) {
      const group = slots[slot].current
      if (group) group.visible = false
      if (flashState[slot]) { setProceduralFaceSlotFlash(flashMeshes[slot], false); flashState[slot] = 0 }
    }
  })

  return (
    <>
      {slots.map((ref, slot) => (
        <group key={slot} ref={ref} visible={false}>
          <StudioTunedGroup itemId={STUDIO_ITEM_ID}>
            <ProceduralFaceTestZombie />
          </StudioTunedGroup>
        </group>
      ))}
    </>
  )
}

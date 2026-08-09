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
import { enemyPool } from '../lib/refs.js'
import { ENEMY_TYPE_CODES } from '../lib/enemyEntityPool.js'
import { getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import { SPAWN_REVEAL_MS } from './PooledEnemyVisuals.js'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import ProceduralFaceTestZombie from './ProceduralFaceTestZombie.jsx'

// 스테이지2 60초 E07 5마리와 82초 E07 10마리가 모두 살아 있을 수 있어 최악 동시 생존은 15마리다.
// 상한을 넘은 개체는 시뮬레이션에는 살아 있지만 몸통이 안 보이므로 16개 슬롯으로 고정한다.
export const PROCEDURAL_FACE_ZOMBIE_CAPACITY = 16
const E07_TYPE_CODE = ENEMY_TYPE_CODES.E07
const STUDIO_ITEM_ID = getStudioZombieItemId('E07')
const MAX_POOL_SLOTS = 200

export default function ProceduralFaceZombieLayer() {
  const slots = useMemo(
    () => Array.from({ length: PROCEDURAL_FACE_ZOMBIE_CAPACITY }, () => createRef()),
    [],
  )

  useFrame(() => {
    const pool = enemyPool
    let used = 0
    if (pool) {
      const max = Math.min(
        MAX_POOL_SLOTS - 1,
        Number.isInteger(pool.highestActive) ? pool.highestActive : MAX_POOL_SLOTS - 1,
      )
      for (let index = 0; index <= max && used < PROCEDURAL_FACE_ZOMBIE_CAPACITY; index += 1) {
        if (pool.active[index] !== 1 || pool.type[index] !== E07_TYPE_CODE) continue
        // 스폰 "펑" 정본: 연기가 먼저 뜨고 300ms 뒤에야 몸통이 드러난다.
        const timer = pool.spawnTimer[index]
        if (timer < SPAWN_REVEAL_MS) continue
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
      }
    }
    for (let slot = used; slot < PROCEDURAL_FACE_ZOMBIE_CAPACITY; slot += 1) {
      const group = slots[slot].current
      if (group) group.visible = false
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

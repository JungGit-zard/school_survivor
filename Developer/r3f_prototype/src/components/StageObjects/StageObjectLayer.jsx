import { useMemo } from 'react'
import ClassroomDesk from './ClassroomDesk.jsx'
import ClassroomChair from './ClassroomChair.jsx'
import UnconsciousStudent from './UnconsciousStudent.jsx'
import ClassPresidentStudent from './ClassPresidentStudent.jsx'
import PressureCauldron from './PressureCauldron.jsx'
import { CorridorJanitorCart, CorridorLockerBank, CorridorLostFoundBoard } from './CorridorProps.jsx'
import {
  BallCart,
  BasketballCluster,
  BasketballHoop,
  GymBanner,
  GymBench,
  GymEquipmentSpill,
  GymExitDoor,
  GymMats,
  GymScoreboard,
  TrainingCones,
} from './GymProps.jsx'
import {
  KitchenClutter,
  KitchenCookLine,
  KitchenCrateStack,
  KitchenPrepTable,
  KitchenRefrigerator,
  KitchenShelfCart,
  KitchenSinkCounter,
  KitchenTrashBins,
  KitchenTrayRack,
} from './KitchenProps.jsx'
import {
  StaffroomClutter,
  StaffroomCopier,
  StaffroomDeskIsland,
  StaffroomEntranceDoor,
  StaffroomSpeaker,
  StaffroomViceDesk,
  StaffroomViceDeskNameplate,
} from './StaffroomProps.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { KaykitStagePropBatch } from './KaykitProps.jsx'
import { KAYKIT_STAGE_OBJECT_TYPES } from './kaykitPropRecipes.js'
import { useStagePropPlacementsVersion } from '../../lib/stagePropPlacements.js'

const STAGE_OBJECT_COMPONENTS = {
  classroomChair: ClassroomChair,
  classroomDesk: ClassroomDesk,
  unconsciousStudent: UnconsciousStudent,
  classPresidentStudent: ClassPresidentStudent,
  pressureCauldron: PressureCauldron,
  corridorLockerBank: CorridorLockerBank,
  corridorJanitorCart: CorridorJanitorCart,
  corridorLostFoundBoard: CorridorLostFoundBoard,
  basketballHoop: BasketballHoop,
  basketballBallCart: BallCart,
  basketballCluster: BasketballCluster,
  gymBench: GymBench,
  gymTrainingCones: TrainingCones,
  gymMats: GymMats,
  gymScoreboard: GymScoreboard,
  gymBanner: GymBanner,
  gymExitDoor: GymExitDoor,
  gymEquipmentSpill: GymEquipmentSpill,
  kitchenPrepTable: KitchenPrepTable,
  kitchenCookLine: KitchenCookLine,
  kitchenSinkCounter: KitchenSinkCounter,
  kitchenRefrigerator: KitchenRefrigerator,
  kitchenTrayRack: KitchenTrayRack,
  kitchenShelfCart: KitchenShelfCart,
  kitchenTrashBins: KitchenTrashBins,
  kitchenCrateStack: KitchenCrateStack,
  kitchenClutter: KitchenClutter,
  staffroomDeskIsland: StaffroomDeskIsland,
  staffroomViceDesk: StaffroomViceDesk,
  staffroomCopier: StaffroomCopier,
  staffroomEntranceDoor: StaffroomEntranceDoor,
  staffroomSpeaker: StaffroomSpeaker,
  staffroomClutter: StaffroomClutter,
}

// 같은 타입 배치 전부를 한 컴포넌트에 모아 InstancedMesh로 그린다. 단일 컴포넌트는 스튜디오·테스트용으로 남긴다.
// 2026-11-14: 책상·의자(S1·S2), 급식실 조리대·선반 카트(S4), 교무실 책상 섬·교감 책상·바닥 서류(S5)는
// KayKit Furniture Bits(CC0) 모델로 그린다 — 파츠마다 채움+외곽선 InstancedMesh 2개(kaykitPropRecipes.js).
// 콜라이더·시야 장애물·배치 타입은 그대로다(stageObjectColliders.js 무변경).
function makeKaykitBatch(type) {
  const Batch = ({ placements }) => (
    <>
      <KaykitStagePropBatch type={type} placements={placements} />
      {/* 교감 책상은 명패("교감")만 기존 박스로 얹어 정체성을 유지한다. */}
      {type === 'staffroomViceDesk' && placements.map(({ id, position, rotation = [0, 0, 0], scale = 1 }) => (
        <StaffroomViceDeskNameplate
          key={`nameplate:${id}`}
          position={position}
          rotation={Array.isArray(rotation) ? rotation : [0, rotation, 0]}
          scale={Array.isArray(scale) ? scale : [scale, scale, scale]}
        />
      ))}
    </>
  )
  Batch.displayName = `KaykitBatch(${type})`
  return Batch
}

export const STAGE_OBJECT_BATCH_COMPONENTS = Object.freeze(
  Object.fromEntries(KAYKIT_STAGE_OBJECT_TYPES.map((type) => [type, makeKaykitBatch(type)])),
)

// 배치 파이프라인이 렌더 가능한 전체 타입 목록(단일 정본).
// stagePropPlacements.js의 STAGE_PROP_TYPES가 이 집합을 전부 포함해야 한다(동기화 테스트가 단언).
export const STAGE_OBJECT_TYPES = Object.freeze(Object.keys(STAGE_OBJECT_COMPONENTS))

export default function StageObjectLayer({ stageId = 'stage1' }) {
  // 스튜디오 Apply 시 오버라이드가 바뀌면 version이 증가해 재계산·리렌더된다.
  const version = useStagePropPlacementsVersion()
  const placements = useMemo(() => getStageObjectPlacements(stageId), [stageId, version])
  const batches = useMemo(() => Object.entries(STAGE_OBJECT_BATCH_COMPONENTS)
    .map(([type, Component]) => [type, Component, placements.filter((placement) => placement.type === type)])
    .filter(([, , items]) => items.length > 0), [placements])

  return (
    <group name={`stage-object-layer-${stageId}`}>
      {batches.map(([type, Component, items]) => <Component key={`batch:${type}`} placements={items} />)}
      {placements.map(({ id, type, position, rotation = [0, 0, 0], scale = 1, props = {} }) => {
        if (STAGE_OBJECT_BATCH_COMPONENTS[type]) return null
        const Component = STAGE_OBJECT_COMPONENTS[type]
        if (!Component) return null

        const normalizedRotation = Array.isArray(rotation) ? rotation : [0, rotation, 0]
        const normalizedScale = Array.isArray(scale) ? scale : [scale, scale, scale]

        return (
          <Component
            key={id}
            position={position}
            rotation={normalizedRotation}
            scale={normalizedScale}
            {...props}
          />
        )
      })}
    </group>
  )
}

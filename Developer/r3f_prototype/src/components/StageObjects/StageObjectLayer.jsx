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
  StaffroomDeskIslandBatch,
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

// 같은 타입 배치 전부를 한 컴포넌트에 모아 그린다. 단일 컴포넌트는 스튜디오·테스트용으로 남긴다.
// 2026-11-14: 책상·의자(S1·S2), 급식실 조리대·선반 카트(S4), 교무실 책상 섬·교감 책상·바닥 서류(S5)에
// KayKit Furniture Bits(CC0) 모델을 들였다 — 파츠마다 채움+외곽선 InstancedMesh 2개(kaykitPropRecipes.js).
// 2026-11-15 Terry: "이미 만든 프랍, 에셋들 절대 지우지 마. 무료 에셋과 혼용해라." — 위 타입은 우리 프랍과
// KayKit을 한 장면에 섞어 그린다. 콜라이더·시야 장애물·배치 타입은 그대로다(stageObjectColliders.js 무변경):
// 어느 쪽을 그려도 발자국은 같다.

// 혼용 비율: 같은 타입 배치 중 KayKit으로 그리는 몫(0~1). 나머지는 우리 원래 프랍.
export const KAYKIT_MIX_RATIO = 0.5

// 배치 목록(저작 순서 = getStageObjectPlacements 순서)을 우리/KayKit으로 결정적으로 나눈다.
// - 무작위 없음: 인덱스만 쓰므로 새로고침·플레이어가 달라도 같은 배치는 항상 같은 쪽이다.
// - 인덱스 i가 KayKit ⇔ floor((i+1)·ratio) > floor(i·ratio) — 비율대로 고르게 엇갈린다(0.5면 0=우리, 1=KayKit, …).
// - 배치가 1개뿐이면(교감 책상 등) 우리 원래 프랍만 그린다.
// - 2개 이상이면 0<ratio<1에서 양쪽이 반드시 하나 이상 나온다(한 방이 한 종류로 쏠리지 않게).
export function splitKaykitMix(placements = [], ratio = KAYKIT_MIX_RATIO) {
  const count = placements.length
  if (count <= 1) return { ours: [...placements], kaykit: [] }
  const useKaykit = placements.map((_, index) => Math.floor((index + 1) * ratio) > Math.floor(index * ratio))
  if (ratio > 0 && ratio < 1) {
    if (!useKaykit.some(Boolean)) useKaykit[count - 1] = true
    if (useKaykit.every(Boolean)) useKaykit[0] = false
  }
  const ours = []
  const kaykit = []
  placements.forEach((placement, index) => (useKaykit[index] ? kaykit : ours).push(placement))
  return { ours, kaykit }
}

// 우리 프랍 중 원래부터 InstancedMesh 묶음이 있던 타입(33cf3972 이전과 같은 경로).
const OUR_BATCH_COMPONENTS = {
  staffroomDeskIsland: StaffroomDeskIslandBatch,
}

function renderOurPlacement(Component, { id, position, rotation = [0, 0, 0], scale = 1, props = {} }) {
  return (
    <Component
      key={id}
      position={position}
      rotation={Array.isArray(rotation) ? rotation : [0, rotation, 0]}
      scale={Array.isArray(scale) ? scale : [scale, scale, scale]}
      {...props}
    />
  )
}

function makeKaykitBatch(type) {
  const OurBatch = OUR_BATCH_COMPONENTS[type]
  const OurComponent = STAGE_OBJECT_COMPONENTS[type]
  const Batch = ({ placements }) => {
    const { ours, kaykit } = useMemo(() => splitKaykitMix(placements), [placements])
    return (
      <>
        {OurBatch
          ? ours.length > 0 && <OurBatch placements={ours} />
          : ours.map((placement) => renderOurPlacement(OurComponent, placement))}
        {kaykit.length > 0 && <KaykitStagePropBatch type={type} placements={kaykit} />}
        {/* KayKit 교감 책상에는 명패("교감")만 기존 박스로 얹어 정체성을 유지한다. */}
        {type === 'staffroomViceDesk' && kaykit.map(({ id, position, rotation = [0, 0, 0], scale = 1 }) => (
          <StaffroomViceDeskNameplate
            key={`nameplate:${id}`}
            position={position}
            rotation={Array.isArray(rotation) ? rotation : [0, rotation, 0]}
            scale={Array.isArray(scale) ? scale : [scale, scale, scale]}
          />
        ))}
      </>
    )
  }
  Batch.displayName = `KaykitMixBatch(${type})`
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

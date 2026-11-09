import ClassroomFloor from './ClassroomFloor.jsx'
import Stage5StaffroomDecor from './Stage5StaffroomDecor.jsx'
import Stage5CallLaneGroundWarning from './StageObjects/Stage5CallLaneGroundWarning.jsx'
import B10StampDeathMarkLayer from './B10StampDeathMark.jsx'
import StudioTunedGroup from './StudioTunedGroup.jsx'

// Stage 5 교무실(스펙 Part B §3-3): 절차적 리놀륨 바닥 + 벽 비주얼만 그린다.
// 프랍·콜라이더·자판기는 Floor가 stage5 정체성 그대로 마운트한다(StageObjectLayer · StageObjectColliderLayer).
// 체육관 바닥 재사용은 폐기했다. 바닥이 맵 경계에 정확히 맞으므로 보정 스케일이 없다.

// Floor.jsx 가드 호환 함수. 리놀륨 바닥은 stage5 경계로 직접 그려서 항상 [1, 1, 1]이다.
export function getStage5EnvironmentScale() {
  return [1, 1, 1]
}

export default function Stage5Environment() {
  return (
    <group name="stage5-environment">
      <StudioTunedGroup itemId="stage-floor-stage5" materialTuning={false}>
        <ClassroomFloor stageId="stage5" />
      </StudioTunedGroup>
      <Stage5StaffroomDecor />
      {/* 전교 호출 레인 바닥 표시 — 호출 상태가 없으면 숨김. 씬에 portal해 월드 좌표로 그린다. */}
      <Stage5CallLaneGroundWarning />
      {/* B10 사망 시 바닥에 남는 "決" 도장 자국(1.5s). */}
      <B10StampDeathMarkLayer />
    </group>
  )
}

// Stage4 가마솥 위험 경고 "경계"의 정본 수치와 표시 구간.
//
// 가마솥 피해 판정은 `isInsidePressureCauldronBlastRadius(x, z)` = `hypot(x, z) <= 3.2`,
// 즉 **world 원점 기준 반경 3.2 units / 0.8 blocks**다. 이 경계를 그리는 유일한 링은
// `StageObjects/Stage4CauldronGroundWarning.jsx`다. 그 링은 scene에 portal로 붙어
// 가마솥 루트의 0.4 base scale·Studio scale·흔들림을 전혀 상속하지 않으므로,
// 로컬 반경이 곧 world 반경이다.
import {
  PRESSURE_CAULDRON_DAMAGE_RADIUS,
  getPressureCauldronHazardVisual,
} from './stage4PressureCauldronHazard.js'

// 경계 바깥 테두리 = 실제 피해 반경. 1 block = 4 units.
export const PRESSURE_CAULDRON_WARNING_OUTER_RADIUS = PRESSURE_CAULDRON_DAMAGE_RADIUS // 3.2 units / 0.8 blocks

// 경계는 "주기 마지막 3000ms 전 구간"에 보여야 한다. boiling이 그 구간 정본이고,
// 발동 250ms(bursting) 동안에도 같은 경계를 유지해 실제 피해 반경이 끊기지 않는다.
// playing/stage4가 아니면 getPressureCauldronHazardVisual이 둘 다 false다.
export function isPressureCauldronWarningBoundaryVisible(elapsedMs, stageId, phase) {
  const { boiling, bursting } = getPressureCauldronHazardVisual(elapsedMs, stageId, phase)
  return boiling || bursting
}

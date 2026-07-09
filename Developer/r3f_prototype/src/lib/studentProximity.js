import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

// 플레이어가 쓰러진 학생 몸 위(이 반경, 월드 유닛)에 올라서면(밟으면) 말을 건다.
// 근처를 지나가는 정도가 아니라 학생 위에 완전히 올라섰을 때만 트리거되도록 작게 잡음.
export const STUDENT_DIALOGUE_RADIUS = 0.5

// 스테이지 배치에서 쓰러진 학생만 뽑아 { id, position } 목록으로 반환.
// (근접 판정에 필요한 최소 정보만 — variant/rotation은 무관.)
export function getUnconsciousStudents(stageId) {
  return getStageObjectPlacements(stageId)
    .filter((item) => item.type === 'unconsciousStudent')
    .map((item) => ({ id: item.id, position: item.position }))
}

// 반경 안에서 아직 말 걸지 않은(talkedIds에 없는) 첫 학생 id를 반환. 없으면 null.
// 순수 함수: playerPos와 학생 목록/이미 말한 집합만으로 판정(테스트 대상).
export function findStudentInRange(playerX, playerZ, students, talkedIds, radius = STUDENT_DIALOGUE_RADIUS) {
  const r2 = radius * radius
  for (const student of students) {
    if (talkedIds.has(student.id)) continue
    const dx = playerX - student.position[0]
    const dz = playerZ - student.position[2]
    if (dx * dx + dz * dz <= r2) return student.id
  }
  return null
}

import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

// 플레이어가 이 반경(월드 유닛) 안으로 들어오면 쓰러진 학생이 말을 건다.
export const STUDENT_DIALOGUE_RADIUS = 1.2

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

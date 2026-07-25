import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

// 플레이어가 쓰러진 학생 몸 위(이 반경, 월드 유닛)에 올라서면(밟으면) 말을 건다.
// 근처를 지나가는 정도가 아니라 학생 위에 완전히 올라섰을 때만 트리거되도록 작게 잡음.
export const STUDENT_DIALOGUE_RADIUS = 0.5
// 조사 물체는 "닿으면" 성립 — 원형 반경이 아니라 콜라이더 박스 표면까지의 거리로 판정한다.
// margin = 플레이어 half(콜라이더 0.136) + 프레임 스텝 여유. 표면에서 이 값 안(=사실상 접촉)에서만 발동.
export const OBJECT_CONTACT_MARGIN = 0.25

// halfX0/halfZ0 = 콜라이더 footprint 반-크기(scale 1·회전 전). stageObjectColliders의
// locker [1.34,_,0.54]→(0.67,0.27), lost-found [1.34,_,0.18]→(0.67,0.09)와 일치.
const INVESTIGABLE_OBJECTS = Object.freeze({
  corridorLockerBank: {
    subjectType: 'locker',
    subjectName: '사물함',
    line: '문이 살짝 열려 있다. 안쪽을 조심스럽게 조사했다.',
    halfX0: 0.67,
    halfZ0: 0.27,
  },
  corridorLostFoundBoard: {
    subjectType: 'bulletinBoard',
    subjectName: '불레틴보드',
    line: '낡은 게시물 사이에 쓸 만한 단서가 있는지 조사했다.',
    halfX0: 0.67,
    halfZ0: 0.09,
  },
})

// 스테이지 배치에서 쓰러진 학생만 뽑아 { id, position } 목록으로 반환.
// (근접 판정에 필요한 최소 정보만 — variant/rotation은 무관.)
export function getUnconsciousStudents(stageId) {
  return getStageObjectPlacements(stageId)
    .filter((item) => item.type === 'unconsciousStudent')
    .map((item) => ({ id: item.id, position: item.position }))
}

// 모든 스테이지의 쓰러진 학생과 스테이지 2의 사물함·불레틴보드를
// 동일한 조사 대상 형식으로 반환한다.
export function getInvestigationTargets(stageId) {
  return getStageObjectPlacements(stageId)
    .filter((item) => item.type === 'unconsciousStudent'
      || (stageId === 'stage2' && INVESTIGABLE_OBJECTS[item.type]))
    .map((item) => {
      if (item.type === 'unconsciousStudent') {
        return {
          id: item.id,
          position: item.position,
          subjectType: 'student',
          subjectName: '지친학생',
          radius: STUDENT_DIALOGUE_RADIUS,
        }
      }
      const obj = INVESTIGABLE_OBJECTS[item.type]
      // 배치 회전/스케일을 반영한 축정렬(AABB) 반-크기 — "닿으면" 박스 접촉 판정용.
      const sc = typeof item.scale === 'number' ? item.scale : 1
      const bx = obj.halfX0 * sc
      const bz = obj.halfZ0 * sc
      const rotY = item.rotation?.[1] ?? 0
      const cos = Math.abs(Math.cos(rotY))
      const sin = Math.abs(Math.sin(rotY))
      return {
        id: item.id,
        position: item.position,
        subjectType: obj.subjectType,
        subjectName: obj.subjectName,
        line: obj.line,
        halfX: bx * cos + bz * sin,
        halfZ: bx * sin + bz * cos,
      }
    })
}

export function findInvestigationTargetInRange(playerX, playerZ, targets, investigatedIds) {
  for (const target of targets) {
    if (investigatedIds.has(target.id)) continue
    const dx = playerX - target.position[0]
    const dz = playerZ - target.position[2]
    if (target.halfX != null) {
      // 물체: 콜라이더 박스 표면까지 거리 ≤ 접촉 margin일 때만(=닿으면) 발동. 원형 반경 아님.
      const ddx = Math.max(0, Math.abs(dx) - target.halfX)
      const ddz = Math.max(0, Math.abs(dz) - target.halfZ)
      if (ddx * ddx + ddz * ddz <= OBJECT_CONTACT_MARGIN * OBJECT_CONTACT_MARGIN) return target
      continue
    }
    // 학생: 몸 위에 올라섰을 때(원형 반경).
    const radius = target.radius ?? STUDENT_DIALOGUE_RADIUS
    if (dx * dx + dz * dz <= radius * radius) return target
  }
  return null
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

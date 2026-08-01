import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'
import { getStageObjectFootprint } from '../components/StageObjects/stageObjectColliders.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'

// 플레이어가 쓰러진 학생 몸 위(이 반경, 월드 유닛)에 올라서면(밟으면) 말을 건다.
// 근처를 지나가는 정도가 아니라 학생 위에 완전히 올라섰을 때만 트리거되도록 작게 잡음.
export const STUDENT_DIALOGUE_RADIUS = 0.5
// 조사 물체는 "닿으면" 성립 — 원형 반경이 아니라 콜라이더 박스 표면까지의 거리로 판정한다.
// margin = 플레이어 half(콜라이더 0.136) + 프레임 스텝 여유. 표면에서 이 값 안(=사실상 접촉)에서만 발동.
export const OBJECT_CONTACT_MARGIN = 0.25

const INVESTIGABLE_OBJECTS = Object.freeze({
  corridorLockerBank: {
    subjectType: 'locker',
    subjectName: '사물함',
    lines: [
      '사물함을 열었다. 교과서는 없고 ‘이번엔 진짜 공부함’이라 적힌 3년 묵은 계획표만 나왔다.',
      '안에서 체육복이 발견됐다. 체육복도 나를 보고 발견당한 표정을 짓고 있다.',
      '비밀번호는 0000이었다. 보안은 졸업했고 자물쇠만 유급한 모양이다.',
    ],
  },
  corridorJanitorCart: {
    subjectType: 'janitorCart',
    subjectName: '청소 카트',
    lines: [
      '청소 카트를 뒤졌다. 빗자루는 파업 중이고 대걸레가 노조 대표를 맡고 있다.',
      '세제 병에 ‘좀비 얼룩 전용’이라고 적혀 있다. 사용 후 환기는… 학교가 이미 환기됐다.',
      '바퀴 하나가 삐걱대며 고자질했다. 이 카트, 방금 전까지 누가 몰고 다닌 게 분명하다.',
    ],
  },
  corridorLostFoundBoard: {
    subjectType: 'bulletinBoard',
    subjectName: '불레틴보드',
    lines: [
      '분실물 공고: 양심을 찾습니다. 주운 사람도 같이 실종됐습니다.',
      '급식 만족도 조사 결과가 붙어 있다. 좀비 사태보다 먼저 종말이 왔던 모양이다.',
      '‘살아남는 법 특강 — 강사 결석’ 포스터가 아직도 당당하게 붙어 있다.',
    ],
  },
  classroomDesk: {
    subjectType: 'desk',
    subjectName: '교실 책상',
    lines: [
      '서랍에서 컨닝페이퍼를 찾았다. 답은 전부 ‘도망쳐’였다. 전교 1등으로 인정한다.',
      '책상 밑 낙서: ‘좀비 오면 자는 척’. 작성자는 끝까지 계획을 실천한 모양이다.',
      '서랍 속 급식빵은 돌처럼 단단하다. 무기 업그레이드 재료로도 손색이 없다.',
    ],
  },
})

const GENERIC_INVESTIGATION_LINES = Object.freeze({
  classroomChair: '의자를 조사했다. 등받이 낙서가 출석보다 결석이 더 설득력 있다고 주장한다.',
  basketballHoop: '농구 골대를 올려다봤다. 림은 멀쩡한데 슛 성공률은 이미 좀비가 가져갔다.',
  basketballBallCart: '공 카트를 뒤졌다. 공들은 체육 시간보다 탈출 훈련에 더 익숙해 보인다.',
  basketballCluster: '흩어진 농구공을 세었다. 하나가 굴러가며 출석 체크를 대신했다.',
  gymBench: '체육관 벤치 아래를 봤다. 먼지조차 스트레칭을 끝낸 자세로 누워 있다.',
  gymTrainingCones: '콘을 조사했다. 장애물 코스가 오늘만큼은 현실적인 진로 상담이 됐다.',
  gymMats: '매트를 들춰 봤다. 넘어져도 안전하다는 문구가 유난히 양심 없어 보인다.',
  gymScoreboard: '점수판은 0 대 0이다. 모두가 경기보다 생존에 몰입한 결과다.',
  gymBanner: '배너를 확인했다. 응원 문구가 탈출 안내보다 자신감만 넘친다.',
  gymExitDoor: '비상구를 살폈다. 비상 상황이 너무 성실하게 계속되고 있다.',
  gymEquipmentSpill: '흩어진 장비를 뒤졌다. 호루라이는 이미 구조 요청을 포기한 표정이다.',
  kitchenPrepTable: '조리대를 조사했다. 레시피의 첫 줄은 이제 불을 피하라고 적혀 있다.',
  kitchenCookLine: '쿠킹 라인을 확인했다. 오늘의 특식은 불안과 연기 향이다.',
  kitchenSinkCounter: '싱크대를 열어 봤다. 설거지보다 살아남을 접시가 더 적어 보인다.',
  kitchenRefrigerator: '냉장고를 열었다. 남은 반찬도 탈출 계획을 세우고 있는 듯하다.',
  kitchenTrayRack: '배식대 랙을 뒤졌다. 쟁반들이 급식 시간보다 조용히 줄 서 있다.',
  kitchenShelfCart: '선반 카트를 살폈다. 바퀴는 멀쩡한데 도망칠 방향이 없다.',
  kitchenTrashBins: '쓰레기통을 조사했다. 버려진 건 음식뿐 아니라 희망도 조금이다.',
  kitchenCrateStack: '상자 더미를 열어 봤다. 비축분보다 먼지가 더 체계적으로 쌓여 있다.',
  kitchenClutter: '주방 잡동사니를 뒤졌다. 국자 하나가 무기 전직을 진지하게 고민 중이다.',
})

const PALETTE_LABELS = new Map(STAGE_PROP_PALETTE.map(({ type, label }) => [type, label]))

function getInvestigationObject(type) {
  const custom = INVESTIGABLE_OBJECTS[type]
  if (custom) return custom

  const line = GENERIC_INVESTIGATION_LINES[type]
  const subjectName = PALETTE_LABELS.get(type)
  if (!line || !subjectName) return null
  return { subjectType: type, subjectName, lines: [line] }
}

function getFallbackFootprint(item) {
  const scale = Array.isArray(item.scale) ? item.scale : [item.scale ?? 1, item.scale ?? 1, item.scale ?? 1]
  const halfX = 0.75 * Math.abs(scale[0] ?? 1)
  const halfZ = 0.75 * Math.abs(scale[2] ?? scale[0] ?? 1)
  return { x: item.position[0], z: item.position[2], halfX, halfZ }
}

function pickInvestigationLine(lines, id) {
  const copyNumber = Number(id.match(/-copy-(\d+)$/)?.[1])
  if (Number.isFinite(copyNumber)) return lines[(copyNumber - 1) % lines.length]

  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash += id.charCodeAt(index) * (index + 1)
  return lines[hash % lines.length]
}

// 스테이지 배치에서 쓰러진 학생만 뽑아 { id, position } 목록으로 반환.
// (근접 판정에 필요한 최소 정보만 — variant/rotation은 무관.)
export function getUnconsciousStudents(stageId) {
  return getStageObjectPlacements(stageId)
    .filter((item) => item.type === 'unconsciousStudent')
    .map((item) => ({ id: item.id, position: item.position }))
}

// 모든 스테이지의 쓰러진 학생과 스테이지 2의 모든 배치 소품을
// 동일한 조사 대상 형식으로 반환한다.
export function getInvestigationTargets(stageId) {
  return getStageObjectPlacements(stageId)
    .filter((item) => item.type === 'unconsciousStudent'
      || (stageId === 'stage2' && getInvestigationObject(item.type)))
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
      const obj = getInvestigationObject(item.type)
      // 배치 회전/스케일을 반영한 축정렬(AABB) 반-크기 — "닿으면" 박스 접촉 판정용.
      const footprint = getStageObjectFootprint(item) ?? getFallbackFootprint(item)
      return {
        id: item.id,
        position: [footprint.x, item.position[1] ?? 0, footprint.z],
        subjectType: obj.subjectType,
        subjectName: obj.subjectName,
        line: pickInvestigationLine(obj.lines, item.id),
        halfX: footprint.halfX,
        halfZ: footprint.halfZ,
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

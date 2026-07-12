import { UNCONSCIOUS_STUDENT_PLAYER_SCALE } from '../../lib/characterVisualScale.js'
import { getStageBounds } from '../../lib/stageConfig.js'

// Rule: every stage1 object must satisfy Math.abs(x) >= 6 OR Math.abs(z) >= 12
// (keeps the central spawn/play zone clear).
// mapHalfX=7, so |x| 6-6.9 is valid near-wall placement for the center Z band.

export const STAGE_OBJECT_PLACEMENTS = {
  stage1: [
    // ── 기존 오브젝트 (X 좌표: mapHalfX 7 내로 조정, 중앙 스폰존 규칙 준수) ──
    {
      id: 'stage1-desk-nw-01',
      type: 'classroomDesk',
      position: [-5.8, 0, -15.8],
      rotation: [0, 0.42, 0],
      scale: 0.832,
      props: { variant: 'upright' },
    },
    {
      id: 'stage1-chair-nw-01',
      type: 'classroomChair',
      position: [-5.7, 0, -13.2],
      rotation: [0, -0.92, 0],
      scale: 0.736,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-desk-ne-01',
      type: 'classroomDesk',
      position: [5.9, 0, -15.2],
      rotation: [0, -0.72, 0],
      scale: 0.784,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-chair-ne-01',
      type: 'classroomChair',
      position: [5.6, 0, -13.6],
      rotation: [0, 1.28, 0],
      scale: 0.704,
      props: { variant: 'overturned' },
    },
    {
      id: 'stage1-desk-sw-01',
      type: 'classroomDesk',
      position: [-5.9, 0, 14.6],
      rotation: [0, 1.35, 0],
      scale: 0.816,
      props: { variant: 'overturned' },
    },
    {
      id: 'stage1-student-sw-01',
      type: 'unconsciousStudent',
      position: [-5.6, 0, 15.8],
      rotation: [0, -0.68, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-student-sw-02',
      type: 'unconsciousStudent',
      position: [-6.2, 0, 11.8],  // |x|>=6 (wall edge, |z|<12)
      rotation: [0, 2.16, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-student-south-01',
      type: 'unconsciousStudent',
      position: [-3.7, 0, 17.2],
      rotation: [0, 1.42, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-desk-se-01',
      type: 'classroomDesk',
      position: [5.8, 0, 15.4],
      rotation: [0, -1.18, 0],
      scale: 0.8,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-student-se-01',
      type: 'unconsciousStudent',
      position: [5.7, 0, 14.2],
      rotation: [0, 0.86, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-student-se-02',
      type: 'unconsciousStudent',
      position: [6.2, 0, 10.8],  // |x|>=6
      rotation: [0, -2.28, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-student-south-02',
      type: 'unconsciousStudent',
      position: [3.3, 0, 17.0],
      rotation: [0, -1.68, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-desk-west-02',
      type: 'classroomDesk',
      position: [-6.4, 0, -4.2],  // |x|>=6
      rotation: [0, 2.55, 0],
      scale: 0.768,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-chair-west-02',
      type: 'classroomChair',
      position: [-6.2, 0, 4.8],  // |x|>=6
      rotation: [0, -2.8, 0],
      scale: 0.688,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-student-west-01',
      type: 'unconsciousStudent',
      position: [-6.2, 0, 0.6],  // |x|>=6
      rotation: [0, -2.02, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-student-nw-01',
      type: 'unconsciousStudent',
      position: [-6.2, 0, -10.4],  // |x|>=6
      rotation: [0, 0.52, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-desk-east-02',
      type: 'classroomDesk',
      position: [6.4, 0, 4.4],  // |x|>=6
      rotation: [0, -2.35, 0],
      scale: 0.752,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-chair-east-02',
      type: 'classroomChair',
      position: [6.2, 0, -4.8],  // |x|>=6
      rotation: [0, 2.7, 0],
      scale: 0.672,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-east-01',
      type: 'unconsciousStudent',
      position: [6.2, 0, -0.4],  // |x|>=6
      rotation: [0, 1.94, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-student-ne-01',
      type: 'unconsciousStudent',
      position: [6.2, 0, -10.2],  // |x|>=6
      rotation: [0, -0.48, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },

    // ── 추가 오브젝트 (3배 밀도 달성: 책상 18, 의자 12, 학생 30) ──────────────
    // 북쪽 구역 (Z: -46 ~ -20)
    {
      id: 'stage1-desk-north-03',
      type: 'classroomDesk',
      position: [-4.8, 0, -44],
      rotation: [0, 0.28, 0],
      scale: 0.78,
      props: { variant: 'upright' },
    },
    {
      id: 'stage1-chair-north-03',
      type: 'classroomChair',
      position: [-3.6, 0, -42],
      rotation: [0, -1.15, 0],
      scale: 0.71,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-north-01',
      type: 'unconsciousStudent',
      position: [-5.6, 0, -46],
      rotation: [0, 0.75, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-student-north-02',
      type: 'unconsciousStudent',
      position: [2.9, 0, -44],
      rotation: [0, 1.82, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-desk-north-04',
      type: 'classroomDesk',
      position: [4.2, 0, -38],
      rotation: [0, -0.45, 0],
      scale: 0.82,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-chair-north-04',
      type: 'classroomChair',
      position: [3.1, 0, -36],
      rotation: [0, 2.34, 0],
      scale: 0.68,
      props: { variant: 'overturned' },
    },
    {
      id: 'stage1-student-north-03',
      type: 'unconsciousStudent',
      position: [5.6, 0, -40],
      rotation: [0, -2.62, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-student-north-04',
      type: 'unconsciousStudent',
      position: [1.4, 0, -38],
      rotation: [0, 0.94, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-desk-north-05',
      type: 'classroomDesk',
      position: [-5.2, 0, -30],
      rotation: [0, 1.72, 0],
      scale: 0.75,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-north-05',
      type: 'unconsciousStudent',
      position: [-3.2, 0, -32],
      rotation: [0, 2.04, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-desk-north-06',
      type: 'classroomDesk',
      position: [3.8, 0, -24],
      rotation: [0, -2.18, 0],
      scale: 0.80,
      props: { variant: 'overturned' },
    },
    // 중간 구역 — |z|<12 오브젝트는 반드시 |x|>=6 (벽면 배치)
    {
      id: 'stage1-desk-mid-01',
      type: 'classroomDesk',
      position: [-4.6, 0, -18],
      rotation: [0, 0.62, 0],
      scale: 0.77,
      props: { variant: 'upright' },
    },
    {
      id: 'stage1-chair-mid-01',
      type: 'classroomChair',
      position: [-5.7, 0, -16],
      rotation: [0, -1.88, 0],
      scale: 0.70,
      props: { variant: 'overturned' },
    },
    {
      id: 'stage1-student-mid-01',
      type: 'unconsciousStudent',
      position: [4.2, 0, -20],
      rotation: [0, 1.48, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-student-mid-02',
      type: 'unconsciousStudent',
      position: [-2.6, 0, -17],
      rotation: [0, -0.52, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-desk-mid-02',
      type: 'classroomDesk',
      position: [6.5, 0, -10],  // |z|<12 → |x|>=6
      rotation: [0, 2.76, 0],
      scale: 0.83,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-chair-mid-02',
      type: 'classroomChair',
      position: [6.5, 0, -8],  // |z|<12 → |x|>=6
      rotation: [0, 0.12, 0],
      scale: 0.676,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-mid-03',
      type: 'unconsciousStudent',
      position: [-5.4, 0, -12],
      rotation: [0, 2.62, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-student-mid-04',
      type: 'unconsciousStudent',
      position: [6.5, 0, -9],  // |z|<12 → |x|>=6
      rotation: [0, -1.24, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-desk-mid-03',
      type: 'classroomDesk',
      position: [-6.5, 0, 6],  // |z|<12 → |x|>=6
      rotation: [0, -0.84, 0],
      scale: 0.79,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-mid-05',
      type: 'unconsciousStudent',
      position: [6.5, 0, 4],  // |z|<12 → |x|>=6
      rotation: [0, 0.68, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-student-mid-06',
      type: 'unconsciousStudent',
      position: [6.5, 0, 8],  // |z|<12 → |x|>=6
      rotation: [0, -2.18, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-student-mid-07',
      type: 'unconsciousStudent',
      position: [-6.5, 0, 3],  // |z|<12 → |x|>=6
      rotation: [0, 1.32, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-desk-mid-04',
      type: 'classroomDesk',
      position: [4.9, 0, 14],
      rotation: [0, -1.62, 0],
      scale: 0.76,
      props: { variant: 'overturned' },
    },
    // 남쪽 구역 (Z: +20 ~ +50)
    {
      id: 'stage1-desk-south-01',
      type: 'classroomDesk',
      position: [-5.1, 0, 22],
      rotation: [0, 1.14, 0],
      scale: 0.74,
      props: { variant: 'upright' },
    },
    {
      id: 'stage1-chair-south-01',
      type: 'classroomChair',
      position: [-4.2, 0, 24],
      rotation: [0, -2.62, 0],
      scale: 0.71,
      props: { variant: 'overturned' },
    },
    {
      id: 'stage1-student-south-03',
      type: 'unconsciousStudent',
      position: [3.9, 0, 22],
      rotation: [0, 0.36, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-student-south-04',
      type: 'unconsciousStudent',
      position: [-2.8, 0, 26],
      rotation: [0, -1.52, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-desk-south-02',
      type: 'classroomDesk',
      position: [4.6, 0, 32],
      rotation: [0, -0.68, 0],
      scale: 0.81,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-chair-south-02',
      type: 'classroomChair',
      position: [5.6, 0, 30],
      rotation: [0, 1.42, 0],
      scale: 0.676,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-south-05',
      type: 'unconsciousStudent',
      position: [-5.6, 0, 30],
      rotation: [0, 2.78, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-student-south-06',
      type: 'unconsciousStudent',
      position: [2.2, 0, 34],
      rotation: [0, -0.24, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-desk-south-03',
      type: 'classroomDesk',
      position: [-4.9, 0, 40],
      rotation: [0, 2.32, 0],
      scale: 0.77,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-chair-south-03',
      type: 'classroomChair',
      position: [-3.6, 0, 38],
      rotation: [0, -1.74, 0],
      scale: 0.68,
      props: { variant: 'abandoned' },
    },
    {
      id: 'stage1-student-south-07',
      type: 'unconsciousStudent',
      position: [5.2, 0, 40],
      rotation: [0, 1.56, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage1-student-south-08',
      type: 'unconsciousStudent',
      position: [-1.8, 0, 42],
      rotation: [0, -2.44, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage1-student-south-09',
      type: 'unconsciousStudent',
      position: [3.4, 0, 38],
      rotation: [0, 0.84, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage1-desk-south-04',
      type: 'classroomDesk',
      position: [4.4, 0, 46],
      rotation: [0, 0.52, 0],
      scale: 0.79,
      props: { variant: 'overturned' },
    },
    {
      id: 'stage1-chair-south-04',
      type: 'classroomChair',
      position: [3.2, 0, 48],
      rotation: [0, -0.86, 0],
      scale: 0.73,
      props: { variant: 'tilted' },
    },
    {
      id: 'stage1-student-south-10',
      type: 'unconsciousStudent',
      position: [-5.4, 0, 46],
      rotation: [0, -1.38, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
  ],
  stage2: [
    {
      id: 'stage2-locker-bank-left-north',
      type: 'corridorLockerBank',
      position: [-6.25, 0, -14.2],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      id: 'stage2-janitor-cart-right-mid',
      type: 'corridorJanitorCart',
      position: [6.25, 0, 2.8],
      rotation: [0, -Math.PI / 2, 0],
      scale: 0.82,
    },
    {
      id: 'stage2-lost-found-board-left-south',
      type: 'corridorLostFoundBoard',
      position: [-6.92, 0, 13.4],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      id: 'stage2-desk-left-top',
      type: 'classroomDesk',
      position: [-5.2, 0, -11],
      rotation: [0, Math.PI / 2, 0],
      scale: 0.768,
    },
    {
      id: 'stage2-desk-right-mid',
      type: 'classroomDesk',
      position: [5.15, 0, -4],
      rotation: [0, -Math.PI / 2, 0],
      scale: 0.752,
    },
    {
      id: 'stage2-desk-left-low',
      type: 'classroomDesk',
      position: [-5.05, 0, 5],
      rotation: [0, Math.PI / 2 - 0.08, 0],
      scale: 0.784,
    },
    {
      id: 'stage2-desk-right-bottom',
      type: 'classroomDesk',
      position: [5.1, 0, 12],
      rotation: [0, -Math.PI / 2 + 0.06, 0],
      scale: 0.8,
    },
  ],
}

const FLIPPED_UNCONSCIOUS_STUDENT_VARIANTS = {
  faceUp: 'faceUpFlipped',
  sideLeft: 'sideLeftFlipped',
  sideRight: 'sideRightFlipped',
}

function shouldFlipUnconsciousStudent(id) {
  let hash = 0

  for (let index = 0; index < id.length; index += 1) {
    hash += id.charCodeAt(index) * (index + 1)
  }

  return hash % 2 === 0
}

function withMixedUnconsciousStudentFacing(item) {
  if (item.type !== 'unconsciousStudent' || !shouldFlipUnconsciousStudent(item.id)) {
    return item
  }

  const variant = item.props?.variant ?? 'faceUp'
  const flippedVariant = FLIPPED_UNCONSCIOUS_STUDENT_VARIANTS[variant]

  if (!flippedVariant) {
    return item
  }

  return {
    ...item,
    props: {
      ...item.props,
      variant: flippedVariant,
    },
  }
}

function enlargeScale(scale = 1) {
  return Array.isArray(scale)
    ? scale.map((value) => value * 1.1)
    : scale * 1.1
}

function seededUnit(key) {
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

function getDistributedPosition(stageId, key) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const xUnit = seededUnit(`${key}:x`)
  const zUnit = seededUnit(`${key}:z`)
  const side = Math.floor(seededUnit(`${key}:side`) * 4)

  if (stageId === 'stage2') {
    const x = (side % 2 === 0 ? -1 : 1) * ((halfX - 2.4) + xUnit * 1.25)
    const z = -halfZ + 0.8 + zUnit * (halfZ * 2 - 1.6)
    return [x, 0, z]
  }

  if (side < 2) {
    const x = (side === 0 ? -1 : 1) * (6.1 + xUnit * (halfX - 6.8))
    const z = -halfZ + 0.8 + zUnit * (halfZ * 2 - 1.6)
    return [x, 0, z]
  }

  const x = -halfX + 0.8 + xUnit * (halfX * 2 - 1.6)
  const z = (side === 2 ? -1 : 1) * (12 + zUnit * (halfZ - 12.6))
  return [x, 0, z]
}

function getPhysicalBlockerPosition(stageId, index, count) {
  if (stageId === 'stage2') {
    const column = index % 2
    const row = Math.floor(index / 2)
    return [column === 0 ? -6.9 : 6.9, 0, -12 + row * 8]
  }

  if (index < 24) {
    const sideIndex = Math.floor(index / 12)
    const sideOffset = index % 12
    const lane = Math.floor(sideOffset / 6)
    const row = sideOffset % 6
    return [(sideIndex === 0 ? -1 : 1) * 9.4, 0, -10 + row * 4 + lane * 2]
  }

  const endOffset = index - 24
  const endIndex = Math.floor(endOffset / 3)
  return [-3 + (endOffset % 3) * 3, 0, endIndex === 0 ? -13.8 : 13.8]
}

export function getStageObjectPlacements(stageId = 'stage1') {
  const authored = STAGE_OBJECT_PLACEMENTS[stageId] ?? []
  // stage1은 수제 배치 정본을 그대로 사용(2026-07-12 사용자 지시로 복원).
  // 복제(×5)/해시 분산/×1.1 확대 파이프라인은 stage1에 적용하지 않는다.
  if (stageId === 'stage1') return authored.map(withMixedUnconsciousStudentFacing)
  const blockingItems = authored.filter(({ type }) => type === 'classroomDesk' || type === 'classroomChair')
  const blockingIndexById = new Map(blockingItems.map(({ id }, index) => [id, index]))

  return authored.flatMap((item) => (
    Array.from({ length: 5 }, (_, copyIndex) => {
      const id = `${item.id}-copy-${copyIndex + 1}`
      const blockingIndex = blockingIndexById.get(item.id)
      const isPhysicalBlocker = copyIndex === 0 && blockingIndex !== undefined
      return withMixedUnconsciousStudentFacing({
        ...item,
        id,
        blocking: isPhysicalBlocker,
        position: isPhysicalBlocker
          ? getPhysicalBlockerPosition(stageId, blockingIndex, blockingItems.length)
          : getDistributedPosition(stageId, id),
        scale: enlargeScale(item.scale),
      })
    })
  ))
}

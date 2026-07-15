import { UNCONSCIOUS_STUDENT_PLAYER_SCALE } from '../../lib/characterVisualScale.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { getStagePropOverride } from '../../lib/stagePropPlacements.js'

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
      rotation: [0, Math.PI / 4, 0],
    },
    {
      id: 'stage2-desk-left-top',
      type: 'classroomDesk',
      position: [-5.2, 0, -11],
      rotation: [0, Math.PI / 2, 0],
      scale: 0.768,
    },
    {
      id: 'stage2-desk-right-bottom',
      type: 'classroomDesk',
      position: [5.1, 0, 12],
      rotation: [0, -Math.PI / 2 + 0.06, 0],
      scale: 0.8,
    },
    {
      id: 'stage2-student-east-north',
      type: 'unconsciousStudent',
      position: [3.2, 0, -9.8],
      rotation: [0, 0.4, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage2-student-west-mid',
      type: 'unconsciousStudent',
      position: [-3.4, 0, 0.8],
      rotation: [0, -0.85, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
    {
      id: 'stage2-student-south',
      type: 'unconsciousStudent',
      position: [0.8, 0, 10.6],
      rotation: [0, 1.2, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
  ],
  stage3: [
    {
      id: 'stage3-hoop-north-normal',
      type: 'basketballHoop',
      position: [0, 0, -16.4],
      rotation: [0, 0, 0],
      scale: 1.18,
    },
    {
      id: 'stage3-hoop-south-damaged',
      type: 'basketballHoop',
      position: [0, 0, 16.4],
      rotation: [0, Math.PI, 0],
      scale: 1.18,
      props: { damaged: true },
    },
    {
      id: 'stage3-ball-cart-nw',
      type: 'basketballBallCart',
      position: [-13.6, 0, -12.6],
      rotation: [0, 0.48, 0],
      scale: 1.05,
    },
    {
      id: 'stage3-balls-ne-scattered',
      type: 'basketballCluster',
      position: [12.4, 0, -12.4],
      rotation: [0, -0.28, 0],
      scale: 1.15,
      props: { count: 6 },
      blocking: false,
    },
    {
      id: 'stage3-bench-west-long',
      type: 'gymBench',
      position: [-15.2, 0, -2.8],
      rotation: [0, Math.PI / 2, 0],
      scale: 1.08,
    },
    {
      id: 'stage3-bench-east-knocked',
      type: 'gymBench',
      position: [14.5, 0, 3.2],
      rotation: [0, -Math.PI / 2 + 0.18, 0],
      scale: 1.02,
      props: { knockedOver: true },
    },
    {
      id: 'stage3-cones-mid-left-zigzag',
      type: 'gymTrainingCones',
      position: [-7.6, 0, 6.2],
      rotation: [0, -0.58, 0],
      scale: 1.1,
      blocking: false,
    },
    {
      id: 'stage3-mats-east-stack',
      type: 'gymMats',
      position: [13.8, 0, -4.8],
      rotation: [0, -0.38, 0],
      scale: 1.12,
    },
    {
      id: 'stage3-scoreboard-north-wall',
      type: 'gymScoreboard',
      position: [-8.8, 0, -17.0],
      rotation: [0, 0.08, 0],
      scale: 1.0,
    },
    {
      id: 'stage3-banner-south-wall',
      type: 'gymBanner',
      position: [7.8, 0, 17.0],
      rotation: [0, Math.PI + 0.08, 0],
      scale: 1.05,
      blocking: false,
    },
    {
      id: 'stage3-exit-door-east-wall',
      type: 'gymExitDoor',
      position: [17.0, 0, -9.2],
      rotation: [0, -Math.PI / 2, 0],
      scale: 1.0,
    },
    {
      id: 'stage3-equipment-spill-sw',
      type: 'gymEquipmentSpill',
      position: [-12.8, 0, 11.4],
      rotation: [0, 0.34, 0],
      scale: 1.08,
      blocking: false,
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
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16
  return (hash >>> 0) / 4294967296
}

const STAGE2_SCATTERED_PROP_COUNTS = {
  corridorLockerBank: 3,
  corridorJanitorCart: 2,
  corridorLostFoundBoard: 3,
}

function getInstanceCount(stageId, item) {
  if (stageId !== 'stage2') return 5
  if (item.type === 'classroomDesk' || item.type === 'unconsciousStudent') return 1
  return STAGE2_SCATTERED_PROP_COUNTS[item.type] ?? 5
}

function getDistributedPosition(stageId, key, stage2Index = 0) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const xUnit = seededUnit(`${key}:x`)
  const zUnit = seededUnit(`${key}:z`)
  const side = Math.floor(seededUnit(`${key}:side`) * 4)

  if (stageId === 'stage2') {
    // 사용자 지시(2026-07-12): 테두리 배치 절대 금지 — 스테이지 전역에 시드 랜덤 균등 산포.
    const columns = 4
    const cell = (stage2Index * 13 + 5) % 36
    const column = cell % columns
    const row = Math.floor(cell / columns)
    const x = -3.6 + column * 2.4 + (xUnit - 0.5) * 0.62
    const z = -12.4 + row * 3.1 + (zUnit - 0.5) * 1.1
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

function getStage2Rotation(item, id) {
  if (item.type === 'corridorLockerBank') {
    // Locker doors are on local +Z; the gameplay camera sits on +Z as well.
    // Keep their fronts visible, with only a deliberate slight natural tilt.
    return [0, (seededUnit(`${id}:rotation`) - 0.5) * 0.32, 0]
  }

  if (item.type === 'corridorLostFoundBoard') {
    // 게시판의 안내면은 local +Z다. 카메라(+Z)를 향해 45°로 기울여
    // 옆면이 아니라 게시물과 코르크 전면을 읽을 수 있게 한다.
    return [0, Math.PI / 4 + (seededUnit(`${id}:rotation`) - 0.5) * 0.24, 0]
  }

  return [0, (item.rotation?.[1] ?? 0) + (seededUnit(`${id}:rotation`) - 0.5) * 0.8, 0]
}

// 기본(오버라이드 미적용) 배치 파이프라인. 그래픽 스튜디오 에디터가 pristine 시드로 쓴다.
export function computeDefaultStageObjectPlacements(stageId = 'stage1') {
  const authored = STAGE_OBJECT_PLACEMENTS[stageId] ?? []
  // stage1/stage3 are curated authored layouts. Stage2 alone uses copy/scatter to fill the corridor.
  if (stageId === 'stage1' || stageId === 'stage3') return authored.map(withMixedUnconsciousStudentFacing)
  return authored.flatMap((item, itemIndex) => (
    Array.from({ length: getInstanceCount(stageId, item) }, (_, copyIndex) => {
      const id = `${item.id}-copy-${copyIndex + 1}`
      const isPhysicalBlocker = item.type !== 'unconsciousStudent'
      const scatterIndex = itemIndex * 5 + copyIndex
      return withMixedUnconsciousStudentFacing({
        ...item,
        id,
        blocking: isPhysicalBlocker,
        position: getDistributedPosition(stageId, id, scatterIndex),
        rotation: stageId === 'stage2'
          ? getStage2Rotation(item, id)
          : item.rotation,
        scale: enlargeScale(item.scale),
      })
    })
  ))
}

// 게임 런타임이 소비하는 배치. 사용자 오버라이드가 있으면 그것을 정본으로,
// 없으면 기본 파이프라인(computeDefaultStageObjectPlacements)을 반환한다.
// 오버라이드 항목에도 학생 방향 다양화(withMixedUnconsciousStudentFacing)는 유지한다.
export function getStageObjectPlacements(stageId = 'stage1') {
  const override = getStagePropOverride(stageId)
  if (override) return override.map(withMixedUnconsciousStudentFacing)
  return computeDefaultStageObjectPlacements(stageId)
}

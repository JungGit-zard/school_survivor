import { UNCONSCIOUS_STUDENT_PLAYER_SCALE } from '../../lib/characterVisualScale.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { getStagePropOverride } from '../../lib/stagePropPlacements.js'

// Rule: every stage1 object must satisfy Math.abs(x) >= 6 OR Math.abs(z) >= 12
// (keeps the central spawn/play zone clear).
// mapHalfX=10, so |x| 6-6.9 is valid near-wall placement for the center Z band.
// Rule: stage4(급식실/주방, mapHalfX=14.4 / mapHalfZ=16)는 모든 프랍이 |x| <= 13.8,
// |z| <= 15.5 안에 있어야 한다. 벽면 프랍의 rotation Y 기준 — 북 0 / 남 Math.PI /
// 서 +Math.PI/2 / 동 -Math.PI/2.
// 중앙에는 원화(st4_concept.png)의 조리대 열 4기만 들어간다(2026-07-25 사용자 결정).
// 대형 가구 8종은 콜라이더가 붙으므로 관통이 없고, 나머지 타입은 중앙 진입 금지.
// kitchenClutter만 콜라이더 없이 통과 가능(BLOCKING_STAGE_OBJECT_TYPES에서 타입 제외).

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

    // 중간 구역 — |z|<12 오브젝트는 반드시 |x|>=6 (벽면 배치)
    {
      id: 'stage1-chair-mid-01',
      type: 'classroomChair',
      position: [-5.7, 0, -16],
      rotation: [0, -1.88, 0],
      scale: 0.70,
      props: { variant: 'overturned' },
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
      position: [0, 0, -17.0],
      rotation: [0, 0, 0],
      scale: 1.18,
    },
    {
      id: 'stage3-hoop-south-damaged',
      type: 'basketballHoop',
      position: [0, 0, 17.0],
      rotation: [0, Math.PI, 0],
      scale: 1.18,
      props: { damaged: true },
    },
    {
      id: 'stage3-ball-cart-nw',
      type: 'basketballBallCart',
      position: [-5.5, 0, -11.8],
      rotation: [0, 0.48, 0],
      scale: 1.05,
    },
    {
      id: 'stage3-balls-ne-scattered',
      type: 'basketballCluster',
      position: [5.0, 0, -12.1],
      rotation: [0, -0.28, 0],
      scale: 1.15,
      props: { count: 6 },
      blocking: false,
    },
    {
      id: 'stage3-bench-west-long',
      type: 'gymBench',
      position: [-5.7, 0, -2.8],
      rotation: [0, Math.PI / 2, 0],
      scale: 1.08,
    },
    {
      id: 'stage3-bench-east-knocked',
      type: 'gymBench',
      position: [5.6, 0, 3.2],
      rotation: [0, -Math.PI / 2 + 0.18, 0],
      scale: 1.02,
      props: { knockedOver: true },
    },
    {
      id: 'stage3-cones-mid-left-zigzag',
      type: 'gymTrainingCones',
      position: [-5.0, 0, 6.8],
      rotation: [0, -0.58, 0],
      scale: 1.1,
      blocking: false,
    },
    {
      id: 'stage3-mats-east-stack',
      type: 'gymMats',
      position: [5.4, 0, -4.8],
      rotation: [0, -0.38, 0],
      scale: 1.12,
    },
    {
      id: 'stage3-scoreboard-north-wall',
      type: 'gymScoreboard',
      position: [-4.8, 0, -17.6],
      rotation: [0, 0.08, 0],
      scale: 1.0,
    },
    {
      id: 'stage3-banner-south-wall',
      type: 'gymBanner',
      position: [4.7, 0, 17.6],
      rotation: [0, Math.PI + 0.08, 0],
      scale: 1.05,
      blocking: false,
    },
    {
      id: 'stage3-exit-door-east-wall',
      type: 'gymExitDoor',
      position: [6.8, 0, -8.7],
      rotation: [0, -Math.PI / 2, 0],
      scale: 1.0,
    },
    {
      id: 'stage3-equipment-spill-sw',
      type: 'gymEquipmentSpill',
      position: [-5.0, 0, 11.4],
      rotation: [0, 0.34, 0],
      scale: 1.08,
      blocking: false,
    },
  ],
  // stage4: 급식실/주방(mapHalfX 14.4 · mapHalfZ 16). 원화 st4_concept.png 매핑.
  // 프랍은 전부 시각 전용(blocking: false) — 충돌체가 없으므로 중앙 전투 공간은 완전히 비운다.
  stage4: [
    // ── 북벽: 쿡라인 + 후드(최대 랜드마크), 북서 냉장고 열, 북동 싱크대 ──
    {
      id: 'stage4-cookline-north-center',
      type: 'kitchenCookLine',
      position: [-0.6, 0, -14.6],
      rotation: [0, 0, 0],
      scale: 1.16,
    },
    {
      id: 'stage4-refrigerator-north-west-closed',
      type: 'kitchenRefrigerator',
      position: [-12.6, 0, -14.4],
      rotation: [0, 0.12, 0],
      scale: 1.08,
      props: { open: false },
    },
    {
      id: 'stage4-refrigerator-north-west-open',
      type: 'kitchenRefrigerator',
      position: [-9.6, 0, -14.6],
      rotation: [0, -0.18, 0],
      scale: 1.05,
      props: { open: true },
    },
    {
      id: 'stage4-crates-north-west-corner',
      type: 'kitchenCrateStack',
      position: [-13.2, 0, -11.6],
      rotation: [0, 0.36, 0],
      scale: 1.02,
      props: { count: 3 },
    },
    {
      id: 'stage4-clutter-north-cookline-spill',
      type: 'kitchenClutter',
      position: [3.6, 0, -14.2],
      rotation: [0, -0.24, 0],
      scale: 1.0,
      props: { variant: 'pots' },
      blocking: false,
    },
    {
      id: 'stage4-sink-north-east',
      type: 'kitchenSinkCounter',
      position: [7.4, 0, -14.5],
      rotation: [0, 0.08, 0],
      scale: 1.12,
    },
    {
      id: 'stage4-crates-north-east-corner',
      type: 'kitchenCrateStack',
      position: [10.8, 0, -12.6],
      rotation: [0, -0.42, 0],
      scale: 0.96,
      props: { count: 2 },
    },
    {
      id: 'stage4-trayrack-north-east-inner',
      type: 'kitchenTrayRack',
      position: [9.2, 0, -9.4],
      rotation: [0, -0.62, 0],
      scale: 1.06,
    },
    // ── 동벽: 배식 랙 · 선반 · 사이드 카운터 · 쓰레기통 라인 ──
    {
      id: 'stage4-shelfcart-east-north',
      type: 'kitchenShelfCart',
      position: [12.6, 0, -10.4],
      rotation: [0, -Math.PI / 2 + 0.16, 0],
      scale: 1.04,
    },
    {
      id: 'stage4-shelfcart-east-upper',
      type: 'kitchenShelfCart',
      position: [12.9, 0, -7.2],
      rotation: [0, -Math.PI / 2 - 0.12, 0],
      scale: 1.0,
    },
    {
      id: 'stage4-preptable-east-side-counter',
      type: 'kitchenPrepTable',
      position: [12.5, 0, -4.0],
      rotation: [0, -Math.PI / 2 + 0.1, 0],
      scale: 1.06,
      props: { variant: 'side' },
    },
    {
      id: 'stage4-trash-east-wheelie',
      type: 'kitchenTrashBins',
      position: [13.3, 0, -0.8],
      rotation: [0, -Math.PI / 2 - 0.22, 0],
      scale: 1.02,
      props: { variant: 'wheelie' },
    },
    {
      id: 'stage4-trayrack-east-mid',
      type: 'kitchenTrayRack',
      position: [12.7, 0, 2.6],
      rotation: [0, -Math.PI / 2 + 0.24, 0],
      scale: 1.08,
    },
    {
      id: 'stage4-crates-east-mid',
      type: 'kitchenCrateStack',
      position: [13.2, 0, 5.8],
      rotation: [0, -0.28, 0],
      scale: 1.05,
      props: { count: 4 },
    },
    {
      id: 'stage4-clutter-east-trays',
      type: 'kitchenClutter',
      position: [12.2, 0, 8.8],
      rotation: [0, -0.52, 0],
      scale: 0.98,
      props: { variant: 'trays' },
      blocking: false,
    },
    {
      id: 'stage4-preptable-east-south-counter',
      type: 'kitchenPrepTable',
      position: [12.8, 0, 11.6],
      rotation: [0, -Math.PI / 2 - 0.14, 0],
      scale: 1.04,
      props: { variant: 'side' },
    },
    // ── 서벽: 선반 카트 · 냄비 더미 · 쓰레기통 · 서측 싱크대 ──
    {
      id: 'stage4-shelfcart-west-north',
      type: 'kitchenShelfCart',
      position: [-12.7, 0, -8.8],
      rotation: [0, Math.PI / 2 - 0.18, 0],
      scale: 1.06,
    },
    {
      id: 'stage4-clutter-west-pots',
      type: 'kitchenClutter',
      position: [-13.2, 0, -5.6],
      rotation: [0, 0.44, 0],
      scale: 1.0,
      props: { variant: 'pots' },
      blocking: false,
    },
    {
      id: 'stage4-trash-west-wheelie',
      type: 'kitchenTrashBins',
      position: [-13.4, 0, -3.2],
      rotation: [0, Math.PI / 2 + 0.2, 0],
      scale: 1.0,
      props: { variant: 'wheelie' },
    },
    {
      id: 'stage4-sink-west-mid',
      type: 'kitchenSinkCounter',
      position: [-13.4, 0, 1.0],
      rotation: [0, Math.PI / 2 + 0.06, 0],
      scale: 1.1,
    },
    {
      id: 'stage4-trash-west-round',
      type: 'kitchenTrashBins',
      position: [-13.0, 0, 4.8],
      rotation: [0, 0.32, 0],
      scale: 0.96,
      props: { variant: 'round' },
    },
    {
      id: 'stage4-clutter-west-bags',
      type: 'kitchenClutter',
      position: [-12.4, 0, 7.4],
      rotation: [0, 0.66, 0],
      scale: 1.02,
      props: { variant: 'bags' },
      blocking: false,
    },
    {
      id: 'stage4-shelfcart-west-south',
      type: 'kitchenShelfCart',
      position: [-12.9, 0, 10.6],
      rotation: [0, Math.PI / 2 + 0.22, 0],
      scale: 1.02,
    },
    {
      id: 'stage4-crates-south-west-corner',
      type: 'kitchenCrateStack',
      position: [-13.2, 0, 13.2],
      rotation: [0, 0.5, 0],
      scale: 1.0,
      props: { count: 3 },
    },
    // ── 남벽: 배식 카운터 라인 + 적재 상자 + 잔반 정리 구역 ──
    {
      id: 'stage4-preptable-south-serving-left',
      type: 'kitchenPrepTable',
      position: [-3.4, 0, 15.0],
      rotation: [0, Math.PI + 0.08, 0],
      scale: 1.1,
      props: { variant: 'side' },
    },
    {
      id: 'stage4-preptable-south-serving-right',
      type: 'kitchenPrepTable',
      position: [1.8, 0, 15.1],
      rotation: [0, Math.PI - 0.1, 0],
      scale: 1.1,
      props: { variant: 'side' },
    },
    {
      id: 'stage4-crates-south-west-stack',
      type: 'kitchenCrateStack',
      position: [-10.8, 0, 14.6],
      rotation: [0, Math.PI - 0.34, 0],
      scale: 1.04,
      props: { count: 3 },
    },
    {
      id: 'stage4-crates-south-center-stack',
      type: 'kitchenCrateStack',
      position: [-7.2, 0, 15.1],
      rotation: [0, Math.PI + 0.26, 0],
      scale: 0.98,
      props: { count: 2 },
    },
    {
      id: 'stage4-clutter-south-trays',
      type: 'kitchenClutter',
      position: [5.8, 0, 14.9],
      rotation: [0, Math.PI - 0.42, 0],
      scale: 1.0,
      props: { variant: 'trays' },
      blocking: false,
    },
    {
      id: 'stage4-trash-south-round',
      type: 'kitchenTrashBins',
      position: [8.6, 0, 14.6],
      rotation: [0, Math.PI + 0.18, 0],
      scale: 0.98,
      props: { variant: 'round' },
    },
    {
      id: 'stage4-trayrack-south-east',
      type: 'kitchenTrayRack',
      position: [11.6, 0, 14.4],
      rotation: [0, Math.PI - 0.12, 0],
      scale: 1.05,
    },
    // ── 중앙 조리대 4기(원화 정본 위치) ──
    // st4_concept.png의 중앙 세로 조리대 열: 상단 1기 · 중단 좌우 2기 · 하단 1기.
    // 콜라이더가 붙는 solid 가구라 관통 클리핑이 없고, 중앙 전투 공간의 엄폐/동선 분할을 만든다.
    // 플레이어 시작점(0,0)에서 최근접 5.5 유닛 이상 — 시작 즉시 끼는 일이 없다.
    {
      id: 'stage4-preptable-center-north',
      type: 'kitchenPrepTable',
      position: [-0.3, 0, -5.5],
      rotation: [0, 0, 0],
      scale: 1.12,
      props: { variant: 'cutting' },
    },
    {
      id: 'stage4-preptable-center-mid-west',
      type: 'kitchenPrepTable',
      position: [-5.9, 0, 1.1],
      rotation: [0, Math.PI / 2, 0],
      scale: 1.12,
      props: { variant: 'pans' },
    },
    {
      id: 'stage4-preptable-center-mid-east',
      type: 'kitchenPrepTable',
      position: [5.6, 0, 0.7],
      rotation: [0, Math.PI / 2, 0],
      scale: 1.12,
      props: { variant: 'bare' },
    },
    {
      id: 'stage4-preptable-center-south',
      type: 'kitchenPrepTable',
      position: [0.0, 0, 7.4],
      rotation: [0, 0, 0],
      scale: 1.12,
      props: { variant: 'pans' },
    },
  ],
}

const FLIPPED_UNCONSCIOUS_STUDENT_VARIANTS = {
  faceUp: 'faceUpFlipped',
  sideLeft: 'sideLeftFlipped',
  sideRight: 'sideRightFlipped',
}

export const STAGE1_VISIBLE_PROP_PADDING = 3

export function isStage1VisiblePropPlacement({ position: [x, , z] }) {
  const { halfX, halfZ } = getStageBounds('stage1')
  return Math.abs(x) <= halfX + STAGE1_VISIBLE_PROP_PADDING
    && Math.abs(z) <= halfZ + STAGE1_VISIBLE_PROP_PADDING
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
  // stage1/stage3/stage4 are curated authored layouts. Stage2 alone uses copy/scatter to fill the corridor.
  if (stageId === 'stage1' || stageId === 'stage3' || stageId === 'stage4') {
    return authored.map(withMixedUnconsciousStudentFacing)
  }
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
  const placements = override ?? computeDefaultStageObjectPlacements(stageId)
  const visiblePlacements = stageId === 'stage1'
    ? placements.filter(isStage1VisiblePropPlacement)
    : placements
  return visiblePlacements.map(withMixedUnconsciousStudentFacing)
}

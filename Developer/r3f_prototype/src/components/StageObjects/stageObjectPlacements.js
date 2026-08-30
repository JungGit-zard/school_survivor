import { UNCONSCIOUS_STUDENT_PLAYER_SCALE } from '../../lib/characterVisualScale.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { getStagePropOverride } from '../../lib/stagePropPlacements.js'

// Rule: every stage1 object must satisfy Math.abs(x) >= 6 OR Math.abs(z) >= 12
// (keeps the central spawn/play zone clear).
// mapHalfX=10, so |x| 6-6.9 is valid near-wall placement for the center Z band.
// Rule: stage4(급식실/주방, mapHalfX=9.36 / mapHalfZ=16)는 프랍 X를 새 가로 경계에 맞게 재배치하고,
// |z| <= 15.5 안에 있어야 한다. 벽면 프랍의 rotation Y 기준 — 북 0 / 남 Math.PI /
// 서 +Math.PI/2 / 동 -Math.PI/2.
// 중앙에는 사용자 정본인 압력 가마솥 1기만 정확히 [0, 0, 0]에 들어간다.
// 대형 가구와 중앙 가마솥은 콜라이더가 붙으므로 관통이 없고, 나머지 타입은 중앙 진입 금지.
// kitchenClutter만 콜라이더 없이 통과 가능(BLOCKING_STAGE_OBJECT_TYPES에서 타입 제외).

export const STAGE_OBJECT_PLACEMENTS = {
  stage1: [
    {
      "id": "stage1-chair-nw-01",
      "type": "classroomChair",
      "position": [-4.418, 0, -11.61],
      "rotation": [0, -0.92, 0],
      "scale": 0.736,
      "props": {
        "variant": "tilted"
      }
    },
    {
      "id": "stage1-desk-ne-01",
      "type": "classroomDesk",
      "position": [-3.567, 0, 8.968],
      "rotation": [0, -0.72, 0],
      "scale": 0.784,
      "props": {
        "variant": "abandoned"
      }
    },
    {
      "id": "stage1-chair-ne-01",
      "type": "classroomChair",
      "position": [7.361, 0, -10.182],
      "rotation": [0, 1.28, 0],
      "scale": 0.704,
      "props": {
        "variant": "overturned"
      }
    },
    {
      "id": "stage1-desk-sw-01",
      "type": "classroomDesk",
      "position": [-4.558, 0, 12.308],
      "rotation": [0, 1.35, 0],
      "scale": 0.816,
      "props": {
        "variant": "overturned"
      }
    },
    {
      "id": "stage1-student-sw-02",
      "type": "unconsciousStudent",
      "position": [-7.104, 0, 9.732],
      "rotation": [0, 2.16, 0],
      "scale": 0.3673,
      "props": {
        "variant": "sideRightFlipped"
      }
    },
    {
      "id": "stage1-student-south-01",
      "type": "classPresidentStudent",
      "position": [-5.796, 0, -0.031],
      "rotation": [0, 1.42, 0],
      "scale": 0.3673,
      "props": {
        "variant": "sideLeftFlipped"
      }
    },
    {
      "id": "stage1-desk-se-01",
      "type": "classroomDesk",
      // 안쪽으로 당김(개방): 남벽 +Z 틈 0.391 → 0.914 (좀비 직경 0.747 통과).
      "position": [7.043, 0, 12.6],
      "rotation": [0, -1.18, 0],
      "scale": 0.8,
      "props": {
        "variant": "abandoned"
      }
    },
    {
      "id": "stage1-student-se-02",
      "type": "unconsciousStudent",
      "position": [7.582, 0, 10.126],
      "rotation": [0, -2.28, 0],
      "scale": 0.3673,
      "props": {
        "variant": "faceUpFlipped"
      }
    },
    {
      "id": "stage1-desk-west-02",
      "type": "classroomDesk",
      "position": [-6.526, 0, -4.805],
      "rotation": [0, 2.55, 0],
      "scale": 0.768,
      "props": {
        "variant": "tilted"
      }
    },
    {
      "id": "stage1-chair-west-02",
      "type": "classroomChair",
      // 관통 해소 + 개방: stage1-desk-mid-03와 0.067 겹침 → Z 틈 0.873.
      "position": [-6.2, 0, 3.86],
      "rotation": [0, -2.8, 0],
      "scale": 0.688,
      "props": {
        "variant": "abandoned"
      }
    },
    {
      "id": "stage1-student-nw-01",
      "type": "unconsciousStudent",
      "position": [-5.715, 0, -2.374],
      "rotation": [0, 0.52, 0],
      "scale": 0.3673,
      "props": {
        "variant": "sideLeftFlipped"
      }
    },
    {
      "id": "stage1-desk-east-02",
      "type": "classroomDesk",
      "position": [7.679, 0, 5.01],
      "rotation": [0, -2.35, 0],
      "scale": 0.752,
      "props": {
        "variant": "abandoned"
      }
    },
    {
      "id": "stage1-student-east-01",
      "type": "unconsciousStudent",
      "position": [7.439, 0, 1.888],
      "rotation": [0, 1.94, 0],
      "scale": 0.3673,
      "props": {
        "variant": "sideRightFlipped"
      }
    },
    {
      "id": "stage1-student-ne-01",
      "type": "unconsciousStudent",
      "position": [7.202, 0, -7.318],
      "rotation": [0, -0.48, 0],
      "scale": 0.3673,
      "props": {
        "variant": "faceUpFlipped"
      }
    },
    {
      "id": "stage1-student-mid-02",
      "type": "unconsciousStudent",
      "position": [0.933, 0, -12.42],
      "rotation": [0, -0.52, 0],
      "scale": 0.3673,
      "props": {
        "variant": "faceUp"
      }
    },
    {
      "id": "stage1-desk-mid-02",
      "type": "classroomDesk",
      "position": [6.63, 0, -4.247],
      "rotation": [0, 2.76, 0],
      "scale": 0.83,
      "props": {
        "variant": "abandoned"
      }
    },
    {
      "id": "stage1-chair-mid-02",
      "type": "classroomChair",
      // 개방 유지: stage1-desk-mid-02와의 Z 틈 0.671 → 0.897.
      "position": [7.918, 0, -2.32],
      "rotation": [0, 0.12, 0],
      "scale": 0.676,
      "props": {
        "variant": "tilted"
      }
    },
    {
      "id": "stage1-student-mid-03",
      "type": "unconsciousStudent",
      "position": [-6.769, 0, -8.613],
      "rotation": [0, 2.62, 0],
      "scale": 0.3673,
      "props": {
        "variant": "sideLeftFlipped"
      }
    },
    {
      "id": "stage1-desk-mid-03",
      "type": "classroomDesk",
      "position": [-6.5, 0, 6],
      "rotation": [0, -0.84, 0],
      "scale": 0.79,
      "props": {
        "variant": "tilted"
      }
    },
    {
      "id": "stage1-student-mid-07",
      "type": "unconsciousStudent",
      "position": [-7.437, 0, 2.661],
      "rotation": [0, 1.32, 0],
      "scale": 0.3673,
      "props": {
        "variant": "sideLeftFlipped"
      }
    },
    {
      "id": "user-classPresidentStudent-msl7serx-1",
      "type": "classPresidentStudent",
      "position": [-4.54, 0, -6.587],
      "rotation": [0, 0, 0],
      "scale": 0.3673,
      "props": {
        "variant": "faceUp"
      }
    }
  ],
  stage2: [
    {
      "id": "stage2-locker-bank-left-north-copy-1",
      "type": "corridorLockerBank",
      "position": [-1.539, 0, -14.226],
      "rotation": [0, -0.1391, 0],
      "scale": 1.1,
      "blocking": true
    },
    {
      "id": "stage2-locker-bank-left-north-copy-2",
      "type": "corridorLockerBank",
      "position": [5.139, 0, -1.163],
      "rotation": [0, -0.0101, 0],
      "scale": 1.1,
      "blocking": true
    },
    {
      "id": "stage2-locker-bank-left-north-copy-3",
      "type": "corridorLockerBank",
      "position": [4.933, 0, 10.563],
      "rotation": [0, 0.1418, 0],
      "scale": 1.1,
      "blocking": true
    },
    {
      "id": "stage2-janitor-cart-right-mid-copy-1",
      "type": "corridorJanitorCart",
      "position": [0.104, 0, 15.191],
      "rotation": [0, -1.4914, 0],
      "scale": 0.902,
      "blocking": true
    },
    {
      "id": "stage2-janitor-cart-right-mid-copy-2",
      "type": "corridorJanitorCart",
      "position": [5.19, 0, -5.792],
      "rotation": [0, -1.2703, 0],
      "scale": 0.902,
      "blocking": true
    },
    {
      "id": "stage2-lost-found-board-left-south-copy-1",
      "type": "corridorLostFoundBoard",
      "position": [5.036, 0, 5.626],
      "rotation": [0, 0.733, 0],
      "scale": 1.1,
      "blocking": true
    },
    {
      "id": "stage2-lost-found-board-left-south-copy-2",
      "type": "corridorLostFoundBoard",
      "position": [-3.183, 0, -11.552],
      "rotation": [0, 0.8004, 0],
      "scale": 1.1,
      "blocking": true
    },
    {
      "id": "stage2-lost-found-board-left-south-copy-3",
      "type": "corridorLostFoundBoard",
      "position": [-5.033, 0, 0.071],
      "rotation": [0, 0.7486, 0],
      "scale": 1.1,
      "blocking": true
    },
    {
      "id": "stage2-desk-left-top-copy-1",
      "type": "classroomDesk",
      "position": [-2.361, 0, 6.037],
      "rotation": [0, 1.1784, 0],
      "scale": 0.8448,
      "blocking": true
    },
    {
      "id": "stage2-desk-right-bottom-copy-1",
      "type": "classroomDesk",
      "position": [-4.416, 0, -6.1],
      "rotation": [0, -1.3915, 0],
      "scale": 0.88,
      "blocking": true
    },
    {
      "id": "stage2-student-east-north-copy-1",
      "type": "unconsciousStudent",
      "position": [3.135, 0, -11.14],
      "rotation": [0, 0.4107, 0],
      "scale": 0.404,
      "blocking": false,
      "props": {
        "variant": "faceUpFlipped"
      }
    },
    {
      "id": "stage2-student-west-mid-copy-1",
      "type": "unconsciousStudent",
      "position": [-3.081, 0, 8.917],
      "rotation": [0, -0.4588, 0],
      "scale": 0.404,
      "blocking": false,
      "props": {
        "variant": "sideLeft"
      }
    },
    {
      "id": "stage2-student-south-copy-1",
      "type": "unconsciousStudent",
      "position": [-4.827, 0, 11.591],
      "rotation": [0, 1.5193, 0],
      "scale": 0.404,
      "blocking": false,
      "props": {
        "variant": "sideRightFlipped"
      }
    }
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
      id: 'stage3-hoop-south-playful',
      type: 'basketballHoop',
      position: [0, 0, 16.0],
      rotation: [0, Math.PI, 0],
      scale: 1.18,
      props: { playful: true },
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
      // 안쪽으로 당김(개방): 동벽 +X 틈 0.590 → 0.890. 문 뒤에 플레이어만 숨는
      // 무적포켓이었다. 벽 밀착(밀폐)은 불가 — stage3 시야 장애물은 벽에서 0.4 이상
      // 안쪽이어야 하고(0.4는 포켓 구간 안), 그래서 개방만이 유일한 해다.
      // 조사 접촉면은 문 기준 상대 위치라 조사 트리거는 영향받지 않는다.
      position: [6.5, 0, -8.7],
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
    {
      id: 'stage3-student-captain-west',
      type: 'unconsciousStudent',
      position: [-6.35, 0, 0.2],
      rotation: [0, Math.PI / 2, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideRight' },
    },
    {
      id: 'stage3-student-facilities-east',
      type: 'unconsciousStudent',
      position: [6.15, 0, 7.3],
      rotation: [0, -Math.PI / 2, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
  ],
  // stage4: 급식실/주방(mapHalfX 9.36 · mapHalfZ 16). 원화 st4_concept.png 매핑.
  // 프랍은 전부 시각 전용(blocking: false) — 충돌체가 없으므로 중앙 전투 공간은 완전히 비운다.
  stage4: [
    // ── 북벽: 쿡라인 + 후드(최대 랜드마크), 북서 냉장고 열, 북동 싱크대 ──
    {
      id: 'stage4-cookline-north-center',
      type: 'kitchenCookLine',
      // 북벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-0.39, 0, -13.75],
      rotation: [0, 0, 0],
      scale: 1.16,
    },
    {
      id: 'stage4-refrigerator-north-west-closed',
      type: 'kitchenRefrigerator',
      // 북·서벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-7.35, 0, -13.72],
      rotation: [0, 0.12, 0],
      scale: 1.08,
      props: { open: false },
    },
    {
      id: 'stage4-refrigerator-north-west-open',
      type: 'kitchenRefrigerator',
      // 북벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-5.85, 0, -13.72],
      rotation: [0, -0.18, 0],
      scale: 1.05,
      props: { open: true },
    },
    {
      id: 'stage4-crates-north-west-corner',
      type: 'kitchenCrateStack',
      // 서벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-7.12, 0, -11.45],
      rotation: [0, 0.36, 0],
      scale: 1.02,
      props: { count: 3 },
    },
    {
      id: 'stage4-clutter-north-cookline-spill',
      type: 'kitchenClutter',
      position: [2.15, 0, -13.42],
      rotation: [0, -0.24, 0],
      scale: 1.0,
      props: { variant: 'pots' },
      blocking: false,
    },
    {
      id: 'stage4-sink-north-east',
      type: 'kitchenSinkCounter',
      position: [4.45, 0, -13.72],
      rotation: [0, 0.08, 0],
      scale: 1.12,
    },
    {
      id: 'stage4-crates-north-east-corner',
      type: 'kitchenCrateStack',
      position: [6.45, 0, -12.25],
      rotation: [0, -0.42, 0],
      scale: 0.96,
      props: { count: 2 },
    },
    {
      id: 'stage4-trayrack-north-east-inner',
      type: 'kitchenTrayRack',
      // 개방 유지: 동쪽 선반카트와의 X 틈 0.626 → 0.876 (좀비 직경 0.747 통과).
      position: [5.3, 0, -9.2],
      rotation: [0, -0.62, 0],
      scale: 1.06,
    },
    // ── 동벽: 배식 랙 · 선반 · 사이드 카운터 · 쓰레기통 라인 ──
    {
      id: 'stage4-shelfcart-east-north',
      type: 'kitchenShelfCart',
      position: [7.08, 0, -10.15],
      rotation: [0, -Math.PI / 2 + 0.16, 0],
      scale: 1.04,
    },
    {
      id: 'stage4-shelfcart-east-upper',
      type: 'kitchenShelfCart',
      position: [7.08, 0, -7.0],
      rotation: [0, -Math.PI / 2 - 0.12, 0],
      scale: 1.0,
    },
    {
      id: 'stage4-preptable-east-side-counter',
      type: 'kitchenPrepTable',
      position: [6.96, 0, -3.9],
      rotation: [0, -Math.PI / 2 + 0.1, 0],
      scale: 1.06,
      props: { variant: 'side' },
    },
    {
      id: 'stage4-trash-east-wheelie',
      type: 'kitchenTrashBins',
      // 동벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [7.04, 0, -0.72],
      rotation: [0, -Math.PI / 2 - 0.22, 0],
      scale: 1.02,
      props: { variant: 'wheelie' },
    },
    {
      id: 'stage4-trayrack-east-mid',
      type: 'kitchenTrayRack',
      position: [7.02, 0, 2.52],
      rotation: [0, -Math.PI / 2 + 0.24, 0],
      scale: 1.08,
    },
    {
      id: 'stage4-crates-east-mid',
      type: 'kitchenCrateStack',
      // 동벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [7.06, 0, 5.62],
      rotation: [0, -0.28, 0],
      scale: 1.05,
      props: { count: 4 },
    },
    {
      id: 'stage4-clutter-east-trays',
      type: 'kitchenClutter',
      position: [6.86, 0, 8.52],
      rotation: [0, -0.52, 0],
      scale: 0.98,
      props: { variant: 'trays' },
      blocking: false,
    },
    {
      id: 'stage4-preptable-east-south-counter',
      type: 'kitchenPrepTable',
      // 개방 유지: 남동 배식랙과의 Z 틈 0.812 → 0.862.
      position: [6.94, 0, 11.2],
      rotation: [0, -Math.PI / 2 - 0.14, 0],
      scale: 1.04,
      props: { variant: 'side' },
    },
    // ── 서벽: 선반 카트 · 냄비 더미 · 쓰레기통 · 서측 싱크대 ──
    {
      id: 'stage4-shelfcart-west-north',
      type: 'kitchenShelfCart',
      position: [-7.08, 0, -8.58],
      rotation: [0, Math.PI / 2 - 0.18, 0],
      scale: 1.06,
    },
    {
      id: 'stage4-clutter-west-pots',
      type: 'kitchenClutter',
      position: [-6.92, 0, -5.45],
      rotation: [0, 0.44, 0],
      scale: 1.0,
      props: { variant: 'pots' },
      blocking: false,
    },
    {
      id: 'stage4-trash-west-wheelie',
      type: 'kitchenTrashBins',
      // 서벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-7.05, 0, -3.08],
      rotation: [0, Math.PI / 2 + 0.2, 0],
      scale: 1.0,
      props: { variant: 'wheelie' },
    },
    {
      id: 'stage4-sink-west-mid',
      type: 'kitchenSinkCounter',
      // 서벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-6.98, 0, 0.95],
      rotation: [0, Math.PI / 2 + 0.06, 0],
      scale: 1.1,
    },
    {
      id: 'stage4-trash-west-round',
      type: 'kitchenTrashBins',
      position: [-7.04, 0, 4.62],
      rotation: [0, 0.32, 0],
      scale: 0.96,
      props: { variant: 'round' },
    },
    {
      id: 'stage4-clutter-west-bags',
      type: 'kitchenClutter',
      position: [-6.92, 0, 7.18],
      rotation: [0, 0.66, 0],
      scale: 1.02,
      props: { variant: 'bags' },
      blocking: false,
    },
    {
      id: 'stage4-shelfcart-west-south',
      type: 'kitchenShelfCart',
      position: [-7.08, 0, 10.25],
      rotation: [0, Math.PI / 2 + 0.22, 0],
      scale: 1.02,
    },
    {
      id: 'stage4-crates-south-west-corner',
      type: 'kitchenCrateStack',
      // 서벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-7.10, 0, 12.85],
      rotation: [0, 0.5, 0],
      scale: 1.0,
      props: { count: 3 },
    },
    // ── 남벽: 배식 카운터 라인 + 적재 상자 + 잔반 정리 구역 ──
    {
      id: 'stage4-preptable-south-serving-left',
      type: 'kitchenPrepTable',
      // 남벽에서 한 타일 이상 떨어진 시각 안전 여백.
      position: [-2.02, 0, 13.72],
      rotation: [0, Math.PI + 0.08, 0],
      scale: 1.1,
      props: { variant: 'side' },
    },
    {
      id: 'stage4-preptable-south-serving-right',
      type: 'kitchenPrepTable',
      // 개방 유지: 좌측 배식대와의 X 틈 0.633 → 0.853.
      position: [1.3, 0, 13.72],
      rotation: [0, Math.PI - 0.1, 0],
      scale: 1.1,
      props: { variant: 'side' },
    },
    {
      id: 'stage4-crates-south-west-stack',
      type: 'kitchenCrateStack',
      position: [-6.45, 0, 13.78],
      rotation: [0, Math.PI - 0.34, 0],
      scale: 1.04,
      props: { count: 3 },
    },
    {
      id: 'stage4-crates-south-center-stack',
      type: 'kitchenCrateStack',
      // 안쪽으로 당김(개방): 벽 틈 0.525 → 0.905.
      // 개방 유지: 좌측 배식대와의 X 틈 0.684 → 0.854.
      position: [-4.52, 0, 13.82],
      rotation: [0, Math.PI + 0.26, 0],
      scale: 0.98,
      props: { count: 2 },
    },
    {
      id: 'stage4-clutter-south-trays',
      type: 'kitchenClutter',
      position: [3.42, 0, 13.68],
      rotation: [0, Math.PI - 0.42, 0],
      scale: 1.0,
      props: { variant: 'trays' },
      blocking: false,
    },
    {
      id: 'stage4-trash-south-round',
      type: 'kitchenTrashBins',
      position: [4.92, 0, 13.78],
      rotation: [0, Math.PI + 0.18, 0],
      scale: 0.98,
      props: { variant: 'round' },
    },
    {
      id: 'stage4-trayrack-south-east',
      type: 'kitchenTrayRack',
      position: [6.72, 0, 13.7],
      rotation: [0, Math.PI - 0.12, 0],
      scale: 1.05,
    },
    // Canonical Stage 4 center landmark: one pressure cauldron exactly at [0, 0, 0].
    // The Stage 4 player uses the safe southern start [0, 0, 7].
    {
      id: 'stage4-pressure-cauldron-center',
      type: 'pressureCauldron',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      blocking: true,
    },
    {
      id: 'stage4-student-serving-south',
      type: 'unconsciousStudent',
      position: [2.28, 0, 11.65],
      rotation: [0, Math.PI, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'faceUp' },
    },
    {
      id: 'stage4-student-kitchen-northeast',
      type: 'unconsciousStudent',
      position: [4.95, 0, -6.2],
      rotation: [0, -2.5, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
      props: { variant: 'sideLeft' },
    },
  ],
}

const STAGE4_LEGACY_CENTER_PREP_TABLE_IDS = new Set([
  'stage4-preptable-center-north',
  'stage4-preptable-center-mid-west',
  'stage4-preptable-center-mid-east',
  'stage4-preptable-center-south',
])

export const STAGE4_PRESSURE_CAULDRON_PLACEMENT = Object.freeze({
  id: 'stage4-pressure-cauldron-center',
  type: 'pressureCauldron',
  position: Object.freeze([0, 0, 0]),
  rotation: Object.freeze([0, 0, 0]),
  scale: 1,
  blocking: true,
})

function withStage4PressureCauldron(placements) {
  return [
    ...placements.filter(({ id }) => (
      id !== STAGE4_PRESSURE_CAULDRON_PLACEMENT.id
      && !STAGE4_LEGACY_CENTER_PREP_TABLE_IDS.has(id)
    )),
    STAGE4_PRESSURE_CAULDRON_PLACEMENT,
  ]
}

const STAGE4_LEGACY_FULL_WIDTH_HALF_X = 14.4

function withStage4CurrentWidthOverrideCoordinates(placements) {
  const { halfX } = getStageBounds('stage4')
  if (!placements.some(({ position: [x] }) => Math.abs(x) > halfX)) return placements
  const legacyToCurrentXScale = halfX / STAGE4_LEGACY_FULL_WIDTH_HALF_X
  return placements.map((placement) => ({
    ...placement,
    position: [placement.position[0] * legacyToCurrentXScale, placement.position[1], placement.position[2]],
  }))
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
  if (!['unconsciousStudent', 'classPresidentStudent'].includes(item.type) || !shouldFlipUnconsciousStudent(item.id)) {
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

function withDedicatedClassPresidentModel(item) {
  if (item.id !== 'stage1-student-south-01' || item.type !== 'unconsciousStudent') {
    return item
  }

  return {
    ...item,
    type: 'classPresidentStudent',
    props: Object.fromEntries(
      Object.entries(item.props ?? {}).filter(([key]) => key !== 'uniformColor'),
    ),
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
  // Stage defaults are now the canonical Graphics Studio placements baked into the release.
  // Do not regenerate/scatter stage2 here: that path re-created the old corridor look in signed-out AABs.
  return authored.map(withMixedUnconsciousStudentFacing)
}

// 게임 런타임이 소비하는 배치. 사용자 오버라이드가 있으면 그것을 정본으로,
// 없으면 기본 파이프라인(computeDefaultStageObjectPlacements)을 반환한다.
// 오버라이드 항목에도 학생 방향 다양화(withMixedUnconsciousStudentFacing)는 유지한다.
export function getStageObjectPlacements(stageId = 'stage1') {
  const override = getStagePropOverride(stageId)
  const placements = override
    ? (stageId === 'stage4' ? withStage4CurrentWidthOverrideCoordinates(override) : override)
    : computeDefaultStageObjectPlacements(stageId)
  const canonicalPlacements = stageId === 'stage4'
    ? withStage4PressureCauldron(placements)
    : placements
  const visiblePlacements = stageId === 'stage1'
    ? canonicalPlacements.filter(isStage1VisiblePropPlacement)
    : canonicalPlacements
  return visiblePlacements
    .map(withDedicatedClassPresidentModel)
    .map(withMixedUnconsciousStudentFacing)
}

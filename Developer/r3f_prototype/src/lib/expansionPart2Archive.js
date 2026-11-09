// 2부 후보 보존 데이터 — Stage 6 「금서 도서관」 원안(2026-11-08 운동장 교체 전, 스펙 Part C 부록 C-A).
// 런타임 어디에도 연결하지 않는다(import 금지 대상 아님, 그냥 아무도 읽지 않는다). 삭제 금지.
// 2부에서 되살릴 때는 새 stage id와 새 typeCode를 받는다 — 17~19(E19~E21)·32(B05)는 운동장이 쓴다.
// 비주얼(expansionVisuals·expansionEnvironment 금서 분기)·조명·로케일 원안은 git blob 1c085b2d에 있다.
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v) } return v }
export const EXPANSION_PART2_LIBRARY_ARCHIVE = freeze({
  "source": "1c085b2d:Developer/r3f_prototype/src/lib/expansionContent.js",
  "note": "2026-11-08 Stage 6 운동장 교체 전 금서 도서관 원안. 런타임 미연결 데이터. 2부에서 새 id·새 typeCode로 옮긴다(17~19·32는 운동장 사용).",
  "stage": {
    "id": "stage6",
    "order": 6,
    "nameKo": "금서 도서관",
    "themeKey": "library",
    "palette": "남색·금색",
    "spectacle": "끝없이 솟은 서가, 공중을 흐르는 책 띠, 거대한 원형 천창",
    "lesson": "책장 사이 길 찾기 → 원형 착탄 회피",
    "enemyIds": [
      "E19",
      "E20",
      "E21"
    ],
    "bossId": "B05",
    "durationSec": 240,
    "bossSec": 150,
    "portalSec": 210,
    "matildaWarningSec": 205,
    "matildaSec": 210,
    "mapHalfXUnits": 7.5,
    "mapHalfXBlocks": 1.875,
    "mapHalfZUnits": 19.2,
    "mapHalfZBlocks": 4.8,
    "unlockClearsKey": "stage5Clears",
    "unlockClearsRequired": 1,
    "clearRecordKey": "stage6Clears",
    "bestRecordKey": "stage6BestSurvivalSec",
    "nextStageId": "stage7",
    "spawnClock": "gameplayElapsedSec",
    "stageHpMultiplier": 1,
    "newEnemyHpMode": "absolute",
    "existingEnemyHpMultiplier": 2.4883199999999994,
    "milestones": [
      {
        "sec": 48,
        "gold": 6
      },
      {
        "sec": 144,
        "gold": 8
      },
      {
        "sec": 192,
        "gold": 12
      },
      {
        "sec": 240,
        "gold": 22
      }
    ],
    "events": [
      {
        "sec": 5,
        "type": "E19",
        "count": 6
      },
      {
        "sec": 24,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 40,
        "type": "E20",
        "count": 2
      },
      {
        "sec": 60,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 60,
        "type": "E20",
        "count": 3
      },
      {
        "sec": 72,
        "type": "E21",
        "count": 1
      },
      {
        "sec": 96,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 96,
        "type": "E20",
        "count": 4
      },
      {
        "sec": 110,
        "type": "E07",
        "count": 3
      },
      {
        "sec": 110,
        "type": "E02",
        "count": 3
      },
      {
        "sec": 120,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 120,
        "type": "E21",
        "count": 2
      },
      {
        "sec": 144,
        "type": "E20",
        "count": 4
      },
      {
        "sec": 144,
        "type": "E21",
        "count": 2
      },
      {
        "sec": 150,
        "type": "B05",
        "count": 1
      },
      {
        "sec": 168,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 168,
        "type": "E20",
        "count": 3
      },
      {
        "sec": 184,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 184,
        "type": "E21",
        "count": 2
      },
      {
        "sec": 200,
        "type": "E20",
        "count": 4
      },
      {
        "sec": 216,
        "type": "E19",
        "count": 8
      },
      {
        "sec": 216,
        "type": "E20",
        "count": 3
      },
      {
        "sec": 216,
        "type": "E21",
        "count": 2
      }
    ],
    "bonusEvents": [
      {
        "sec": 90,
        "type": "E08",
        "count": 1
      },
      {
        "sec": 180,
        "type": "E08",
        "count": 1
      }
    ],
    "overtime": {
      "startSec": 300,
      "intervalSec": 30,
      "count": 30,
      "mixedTypes": [
        "E19",
        "E20",
        "E21"
      ],
      "scaleStartSec": 300,
      "scaleIntervalSec": 90,
      "scaleStep": 0.1
    },
    "scoreStageBonus": 300,
    "spawnPolicy": {
      "minDistanceUnits": 8.5,
      "minDistanceBlocks": 2.125,
      "maxDistanceUnits": 12.5,
      "maxDistanceBlocks": 3.125,
      "maxAttempts": 16,
      "unsafeAction": "skip_individual",
      "introSpecialDelayMs": 2500,
      "formation": "ring_safe_candidates",
      "bossSpawnDistanceUnits": 6,
      "bossSpawnDistanceBlocks": 1.5
    },
    "layout": {
      "layoutId": "expansion_library",
      "centralSafeHalfXUnits": 2,
      "centralSafeHalfXBlocks": 0.5,
      "clearLaneWidthUnits": 2,
      "clearLaneWidthBlocks": 0.5,
      "obstacles": [
        {
          "id": "exp_s6_prop_1",
          "xUnits": -4,
          "xBlocks": -1.0,
          "zUnits": -10,
          "zBlocks": -2.5,
          "halfXUnits": 0.6,
          "halfXBlocks": 0.15,
          "halfZUnits": 1,
          "halfZBlocks": 0.25
        },
        {
          "id": "exp_s6_prop_2",
          "xUnits": 4,
          "xBlocks": 1.0,
          "zUnits": -5,
          "zBlocks": -1.25,
          "halfXUnits": 0.6,
          "halfXBlocks": 0.15,
          "halfZUnits": 1,
          "halfZBlocks": 0.25
        },
        {
          "id": "exp_s6_prop_3",
          "xUnits": -4,
          "xBlocks": -1.0,
          "zUnits": 2,
          "zBlocks": 0.5,
          "halfXUnits": 0.6,
          "halfXBlocks": 0.15,
          "halfZUnits": 1,
          "halfZBlocks": 0.25
        },
        {
          "id": "exp_s6_prop_4",
          "xUnits": 4,
          "xBlocks": 1.0,
          "zUnits": 9,
          "zBlocks": 2.25,
          "halfXUnits": 0.6,
          "halfXBlocks": 0.15,
          "halfZUnits": 1,
          "halfZBlocks": 0.25
        }
      ],
      "portalAnchorUnits": [
        0,
        0,
        -16
      ],
      "portalAnchorBlocks": [
        0,
        0,
        -4
      ]
    }
  },
  "enemies": [
    {
      "id": "E19",
      "typeCode": 17,
      "nameKo": "서가운반 좀비",
      "stageId": "stage6",
      "hp": 48,
      "speedUnitsPerSec": 0.58,
      "speedBlocksPerSec": 0.145,
      "contactDamage": 10,
      "xpPerTextbook": 10,
      "textbookChance": 0.3,
      "goldDrop": 0,
      "scale": 1.1,
      "contactDistUnits": 0.3,
      "contactDistBlocks": 0.075,
      "behaviorId": "chase",
      "silhouette": "책등을 쌓은 각진 배낭과 한쪽 긴 팔",
      "studioItemId": "zombie-e19",
      "modelKey": "expansion-e19",
      "maxConcurrentSpecial": 2
    },
    {
      "id": "E20",
      "typeCode": 18,
      "nameKo": "색인질주 좀비",
      "stageId": "stage6",
      "hp": 24,
      "speedUnitsPerSec": 1.12,
      "speedBlocksPerSec": 0.28,
      "contactDamage": 8,
      "xpPerTextbook": 7,
      "textbookChance": 0.3,
      "goldDrop": 0,
      "scale": 0.85,
      "contactDistUnits": 0.24,
      "contactDistBlocks": 0.06,
      "behaviorId": "sidestep",
      "silhouette": "부채꼴 색인 탭 머리와 비대칭 짧은 다리",
      "studioItemId": "zombie-e20",
      "modelKey": "expansion-e20",
      "maxConcurrentSpecial": 2
    },
    {
      "id": "E21",
      "typeCode": 19,
      "nameKo": "반납투척 좀비",
      "stageId": "stage6",
      "hp": 60,
      "speedUnitsPerSec": 0.48,
      "speedBlocksPerSec": 0.12,
      "contactDamage": 10,
      "xpPerTextbook": 14,
      "textbookChance": 0.3,
      "goldDrop": 0,
      "scale": 1,
      "contactDistUnits": 0.28,
      "contactDistBlocks": 0.07,
      "behaviorId": "lob",
      "silhouette": "열린 반납함 가슴과 책 한 권을 든 높은 팔",
      "studioItemId": "zombie-e21",
      "modelKey": "expansion-e21",
      "maxConcurrentSpecial": 2
    }
  ],
  "boss": {
    "id": "B05",
    "typeCode": 32,
    "nameKo": "금서관장",
    "stageId": "stage6",
    "hp": 1800,
    "speedUnitsPerSec": 0.5,
    "speedBlocksPerSec": 0.125,
    "contactDamage": 20,
    "scale": 2,
    "contactDistUnits": 0.4,
    "contactDistBlocks": 0.1,
    "xp": 0,
    "studioItemId": "zombie-b05",
    "modelKey": "expansion-b05",
    "silhouette": "거대한 펼친 책 망토, 초승달 책갈피 왕관",
    "enrageHpRatio": 0.5,
    "enrageTransitionMs": 1500,
    "firstAttackDelayMs": 2500,
    "textbooks": 3,
    "textbookXp": 40,
    "gold": 8,
    "patterns": [
      {
        "id": "b05_p1",
        "nameKo": "책장십자",
        "windupMs": 1400,
        "activeMs": 350,
        "recoveryMs": 1400,
        "cooldownMs": 6000,
        "phase2CooldownMs": 5200,
        "rangeUnits": 4,
        "rangeBlocks": 1.0,
        "widthUnits": 0.8,
        "widthBlocks": 0.2,
        "damage": 18,
        "maxHitsPerTarget": 1,
        "shape": "cross",
        "origin": "boss_snapshot",
        "angleDeg": 45,
        "targetLockedAtWindupStart": true
      },
      {
        "id": "b05_p2",
        "nameKo": "낙장고리",
        "windupMs": 1600,
        "activeMs": 350,
        "recoveryMs": 1400,
        "cooldownMs": 6000,
        "phase2CooldownMs": 5200,
        "rangeUnits": 1.8,
        "rangeBlocks": 0.45,
        "widthUnits": 0.4,
        "widthBlocks": 0.1,
        "damage": 18,
        "maxHitsPerTarget": 1,
        "shape": "annulus",
        "origin": "boss_snapshot",
        "targetLockedAtWindupStart": true
      }
    ]
  }
})

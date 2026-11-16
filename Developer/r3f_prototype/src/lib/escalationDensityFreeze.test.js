// A3 바이트 동일 가드 (zombie15_time_escalation_balance_20261031.md v1.4 §10.2 A3, §11.1 T-B1·T-B2).
//
// 시간 난이도 감독은 기존 밀도 역산 경로 밖에 있어야 한다. 아래 값은 감독 도입 전(2026-10-31, origin/zombie_only
// e508a34) 정본 모듈 출력을 그대로 박제한 것이다(JSON 왕복 정밀도, toBe로 비교). 감독·신규 종 작업 중 이 테스트가
// 깨지면 밀도 경로가 오염된 것이다 — 기대값을 고치지 말고 오염 경로를 되돌린다. 의도된 밀도 변경(별도 승인)일 때만
// 같은 커밋에서 값을 갱신한다.
//
// 참고: 런타임은 20~40초 웨이브를 발화하지 않는다(Enemies.jsx usePlayingFrame). 밀도 배율은 분석 함수와 웨이브 기반
// 하네스(stageBalanceProbe·gameplaySoak)에만 들어간다. 그래도 §7.1 부하 표와 기존 분석 회귀가 이 값을 쓰므로 고정한다.
import { describe, expect, it } from 'vitest'
import {
  JARMOB_HP_TYPES,
  STAGE_DENSITY_MULTIPLIER,
  STAGE_JARMOB_HP_MULTIPLIER,
  stageBurstJarmobBaseHp,
  stageExpectedBaseJarmobHp,
  stageExpectedJarmobHp,
  stageJarmobLoadWindows,
} from '../components/Enemies.jsx'
import { getBurstEventsForStage, getRuntimeBurstEventsForStage, getRuntimeSpawnEventsForStage } from './burstEvents.js'
import { enemyTypeToCode } from './enemyEntityPool.js'
import { directorExpectedLoadWindows, DIRECTOR_LOAD_IMPLEMENTED } from './directorExpectedLoad.js'

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4']

// 2026-11-04 신규 좀비 분산 재배치(levelmini, balanceqa 검수): 의도된 버스트 표 변경이라 값을 갱신했다.
//   stage3: E40 1기를 216s → 168s로 당겨 구간 8(160–180s) +5.04, 구간 10(200–220s) −5.04. base·burst·expected·구간 합은 그대로.
//   stage4: 행 순서가 바뀌어 구간 0·2의 부동소수 합산 순서만 달라졌다(마지막 자리). 실제 부하 변화 없음.
// 2026-11-04 투사체 좀비 15종 배치(Terry 지시 "투사체 15종도 게임에 넣어", levelmini): 의도된 버스트 표 변경.
//   15종은 hp가 host와 같은 맞교환이라 base·burst·expected는 비트 그대로다. 같은 분 안에서 한 마리씩 옮긴 행만 구간이 바뀐다.
//   stage2: 216s E34 1기 → 184s E46(hp 8) — 구간 9(180–200s) +0.48, 구간 10(200–220s) −0.48.
//   stage3: 216s E05 1기 → 72s E57(hp 70) — 구간 3(60–80s) +5.04 / 구간 10(200–220s) −5.04.
//   stage4: 108s E44 1기 → 72s E50(hp 16) — 구간 3 +1.38 / 구간 5 −1.38,
//           216s E05 1기 → 184s E59(hp 70) — 구간 9 +6.05 / 구간 10 −6.05. 구간 0은 행 순서로 마지막 자리만 달라졌다.
// 2026-11-14 블록 좀비 18종 배치(vend 스레드): 전부 hp가 host와 같은 맞교환이라 base·burst·expected는 비트 그대로다.
//   stage3: 5s E01 6 → 4 + E85 + E74(hp 8), 24s E03 2 → 1 + E80(hp 10) — 행이 늘어 구간 0·1의 부동소수 합산 순서만
//   달라졌다(마지막 자리, 4e-15).
//   실제 부하 변화 없음. 나머지 스테이지 값은 그대로 통과한다.
// 2026-11-15 2차 신규 좀비 1차분(levelmini, 블록 좀비 위로 옮김): 아래 값은 트렁크(블록 좀비 반영) 그대로 통과한다.
//   같은 hp 맞교환(E93·E94·E97·E99·E103)은 밀도 예산이 그대로이고, 스3 E96은 순증이라 치프처럼 JARMOB 밖이다.
// 2026-11-16 좀비 배치 총검토(Terry 승인 "제안대로 모두 적용", balanceqa 판정표 76건): 의도된 버스트 표 변경이라 값을 갱신했다.
//   종을 스테이지 사이로 옮기고 시각을 바꿨다(배치만 — 스탯·행동 불변). stage1은 총량 그대로(burst 2,560)이고 구간 곡선만 움직였다
//   (24초 E01 2기 → 40초, E35·E36 첫 등장 당김, 거대 168 → 184초 등). stage2 burst 2,012 → 2,072(E57·E74·E65 받음, E83·E72 내보냄),
//   stage3 1,810 → 1,850(S3 재결정: 기존 표 + 184초 E58·E82·E62 + 216초 E82 복습, 216초 E40 복습 삭제), stage4 3,228 → 3,238. 밀도 배율은 그 결과로 다시 풀린 값이다(분석 전용 — 런타임 스폰과 무관).
const FROZEN = {
  density: { stage2: 0.8731323303525842, stage3: 1.2015224983072685, stage4: 1.1930987008545382 },
  hpMult: { stage2: 1.2, stage3: 1.44, stage4: 1.728 },
  stages: {
    stage1: {
      base: 4379.766933333333,
      burst: 2560,
      expected: 6939.766933333333,
      windows: [8.266666666666666, 7.0666666666666655, 11.969333333333333, 27.549599999999998, 12.766666666666666, 25.234213333333336, 37.66799999999999, 45.31706666666667, 38.800133333333335, 65.71106666666667, 38.04266666666667, 28.59626666666667],
    },
    stage2: {
      base: 7403.309866666666,
      burst: 2072,
      expected: 11275.283035445933,
      windows: [17.215496174225905, 17.62274528475737, 40.819893700414774, 24.0722238859719, 15.785170803861012, 46.5662330062278, 33.580564372742465, 96.22560834528262, 92.60641865210462, 93.94059193956484, 51.159695738193236, 34.169509868950165],
    },
    stage3: {
      base: 4500.387733333334,
      burst: 1850,
      expected: 11060.536642296716,
      windows: [19.401759631661186, 21.892597341365963, 25.529779775631006, 72.86106260620784, 25.206596309288386, 60.2134722242842, 63.76202926504002, 66.87393355567163, 42.16079343583141, 93.76137517128834, 37.660443742486095, 38.10298905607967],
    },
    stage4: {
      base: 4423.834,
      burst: 3238,
      expected: 14715.76999368292,
      windows: [15.555842473434492, 22.618863410358408, 43.38542638485468, 54.650117958149224, 60.028595993421675, 120.61304041377441, 96.93172676227341, 86.88608125912758, 51.83411014549163, 90.05611685873036, 69.4071655453527, 23.82141247917755],
    },
  },
}

// 2026-11-04 Terry 지시("투사체 15종도 게임에 넣어")로 E46~E60은 감독이 아니라 버스트 표 맞교환으로 들어갔다.
// 그래서 15종은 이제 잡몹(JARMOB_HP_TYPES)이고 버스트 표에 있다 — 아래 "15종 배치" describe가 그 반대를 단언한다.
// 감독(directorExpectedLoad.js)은 여전히 미구현이고, E59 분열 미니(typeCode 64)는 아직 어디에도 없다.
const PROJECTILE_ZOMBIE_IDS = Array.from({ length: 15 }, (_, i) => `E${46 + i}`)
// 'E61'은 2026-11-07 2차 10종의 급식판 좀비(typeCode 65)로 실제 버스트 표에 들어갔으므로 감독 종 후보에서 뺐다.
const NOVEL_ESCALATION_IDS = ['E59m', 'E59_MINI', 'E59mini']
const NOVEL_ESCALATION_TYPE_CODES = [64]

describe('A3 밀도 경로 바이트 동일', () => {
  it('STAGE_DENSITY_MULTIPLIER·STAGE_JARMOB_HP_MULTIPLIER가 감독 도입 전 값과 비트 동일하다', () => {
    // 2026-11-08 Stage 5 교무실: 분석용 밀도 배율에 stage5 키가 새로 생겼다(_STAGE_BLEND_IDS). stage2~4 값은 아래에서 비트 동일.
    expect(Object.keys(STAGE_DENSITY_MULTIPLIER).sort()).toEqual(['stage2', 'stage3', 'stage4', 'stage5'])
    expect(Object.keys(STAGE_JARMOB_HP_MULTIPLIER).sort()).toEqual(['stage2', 'stage3', 'stage4', 'stage5'])
    for (const stageId of ['stage2', 'stage3', 'stage4']) {
      expect(STAGE_DENSITY_MULTIPLIER[stageId]).toBe(FROZEN.density[stageId])
      expect(STAGE_JARMOB_HP_MULTIPLIER[stageId]).toBe(FROZEN.hpMult[stageId])
    }
  })

  it.each(STAGES)('%s: 기대 HP 함수 4종과 구간 부하 곡선이 비트 동일하다', (stageId) => {
    const frozen = FROZEN.stages[stageId]
    expect(stageExpectedBaseJarmobHp(stageId)).toBe(frozen.base)
    expect(stageBurstJarmobBaseHp(stageId)).toBe(frozen.burst)
    expect(stageExpectedJarmobHp(stageId)).toBe(frozen.expected)
    const windows = stageJarmobLoadWindows(stageId)
    expect(windows).toHaveLength(frozen.windows.length)
    windows.forEach((value, index) => expect(value).toBe(frozen.windows[index]))
  })
})

describe('A3 반대 방향 단언', () => {
  it('E59 미니는 JARMOB_HP_TYPES에 없다', () => {
    for (const id of NOVEL_ESCALATION_IDS) expect(JARMOB_HP_TYPES.has(id)).toBe(false)
  })

  it('투사체 좀비 15종은 잡몹이라 JARMOB_HP_TYPES에 있다(없으면 보스용 배수를 타 host와 HP가 갈라진다)', () => {
    for (const id of PROJECTILE_ZOMBIE_IDS) expect(JARMOB_HP_TYPES.has(id)).toBe(true)
  })

  it.each(STAGES)('%s: 감독 종은 버스트 표(SCHEDULE_BURST가 소비하는 런타임 표)를 거치지 않는다', (stageId) => {
    const tables = [getBurstEventsForStage(stageId), getRuntimeBurstEventsForStage(stageId), getRuntimeSpawnEventsForStage(stageId)]
    for (const table of tables) {
      for (const evt of table) {
        expect(NOVEL_ESCALATION_IDS).not.toContain(evt.type)
        for (const mixed of evt.mixedTypes ?? []) expect(NOVEL_ESCALATION_IDS).not.toContain(mixed)
        expect(NOVEL_ESCALATION_TYPE_CODES).not.toContain(enemyTypeToCode(evt.type))
      }
    }
  })
})

describe('directorExpectedLoadWindows 스텁 (§2-4a, T-B2 자리)', () => {
  it.each(STAGES)('%s: 감독 미구현 상태에서는 30초 구간 8개가 모두 0이다', (stageId) => {
    expect(DIRECTOR_LOAD_IMPLEMENTED).toBe(false)
    const windows = directorExpectedLoadWindows(stageId, { kiteScore: 0 })
    expect(windows).toHaveLength(8)
    windows.forEach((window, index) => {
      expect(window).toEqual({ startSec: index * 30, endSec: (index + 1) * 30, expectedHp: 0, expectedCount: 0, expectedEffectiveHp: 0 })
    })
    expect(directorExpectedLoadWindows(stageId, { kiteScore: 1 })).toEqual(windows)
  })

  it('탈출 라운드 구간(240s 이후)도 같은 30초 격자로 늘어난다', () => {
    const windows = directorExpectedLoadWindows('stage2', { totalSec: 420 })
    expect(windows).toHaveLength(14)
    expect(windows.at(-1)).toMatchObject({ startSec: 390, endSec: 420 })
  })

  it('잘못된 입력은 조용히 넘기지 않는다', () => {
    expect(() => directorExpectedLoadWindows('')).toThrow(TypeError)
    expect(() => directorExpectedLoadWindows('stage1', { kiteScore: 1.5 })).toThrow(RangeError)
  })

  it('감독 부하 함수를 불러도 밀도 경로 값은 그대로다', () => {
    for (const stageId of STAGES) directorExpectedLoadWindows(stageId, { kiteScore: 0.7 })
    expect(stageJarmobLoadWindows('stage2')[8]).toBe(FROZEN.stages.stage2.windows[8])
    expect(STAGE_DENSITY_MULTIPLIER.stage3).toBe(FROZEN.density.stage3)
  })
})

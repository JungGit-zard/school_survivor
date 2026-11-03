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
const FROZEN = {
  density: { stage2: 0.8766327815877557, stage3: 1.205324260259222, stage4: 1.1939640195114065 },
  hpMult: { stage2: 1.2, stage3: 1.44, stage4: 1.728 },
  stages: {
    stage1: {
      base: 4379.766933333333,
      burst: 2560,
      expected: 6939.766933333333,
      windows: [8.266666666666666, 7.866666666666665, 10.169333333333332, 28.1496, 12.766666666666666, 37.33421333333333, 30.267999999999994, 45.31706666666667, 54.00013333333334, 50.11106666666667, 34.14266666666667, 28.59626666666667],
    },
    stage2: {
      base: 7403.309866666666,
      burst: 2012,
      expected: 11234.38094564649,
      windows: [17.261422094431353, 18.28136893779855, 40.86471471018874, 27.011206265255662, 15.848454705644212, 44.740070302579284, 37.399590738004974, 96.45887869563056, 103.74400833001876, 74.02586939772162, 51.776965177283024, 34.306497927767865],
    },
    stage3: {
      base: 4500.387733333334,
      burst: 1810,
      expected: 11027.574182405935,
      windows: [19.444923802784416, 21.936352689514134, 25.60326894123535, 67.90953477722606, 25.286353017066986, 60.345218203157515, 63.91593850634526, 67.00852870269094, 42.27824809881898, 87.12283001984201, 46.703960857264015, 38.22355150435108],
    },
    stage4: {
      base: 4423.834,
      burst: 3228,
      expected: 14705.104822775234,
      windows: [16.25381289939266, 30.92766296629734, 37.87450921331853, 69.71044540246208, 60.07213293133093, 121.35650064097032, 96.98448270159159, 93.83239732155536, 53.24307512366532, 84.02894089481242, 47.13259160911555, 23.838689434249606],
    },
  },
}

// 신규 15종 E46~E60과 E59 분열 미니. 미니의 ID는 감독 단계에서 정한다 — 후보 이름을 모두 막는다.
const NOVEL_ESCALATION_IDS = [
  ...Array.from({ length: 15 }, (_, i) => `E${46 + i}`),
  'E59m', 'E59_MINI', 'E59mini', 'E61',
]
// §14 threemini 배선 지점: typeCode 49~63(E46~E60), 64(E59 미니).
const NOVEL_ESCALATION_TYPE_CODES = Array.from({ length: 16 }, (_, i) => 49 + i)

describe('A3 밀도 경로 바이트 동일', () => {
  it('STAGE_DENSITY_MULTIPLIER·STAGE_JARMOB_HP_MULTIPLIER가 감독 도입 전 값과 비트 동일하다', () => {
    expect(Object.keys(STAGE_DENSITY_MULTIPLIER).sort()).toEqual(['stage2', 'stage3', 'stage4'])
    expect(Object.keys(STAGE_JARMOB_HP_MULTIPLIER).sort()).toEqual(['stage2', 'stage3', 'stage4'])
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
  it('신규 15종과 E59 미니는 JARMOB_HP_TYPES에 없다', () => {
    for (const id of NOVEL_ESCALATION_IDS) expect(JARMOB_HP_TYPES.has(id)).toBe(false)
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

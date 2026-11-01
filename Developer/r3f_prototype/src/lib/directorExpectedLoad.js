// 시간 난이도 감독의 기대 부하 함수 — 스텁(§2-4a, T-B2, zombie15_time_escalation_balance_20261031.md v1.4).
//
// 이 파일은 감독(timeEscalationDirector) 구현 전 단계의 자리다. 감독 코드는 프로브 확장과 REF_BUILD_V1
// 기준선이 고정된 뒤(§14 2단계)에만 쓴다. 그때 이 함수가 해금표·동시 목표·종별 상한·kiteBias 가중을 넣은
// 30초 구간 기대 HP·마릿수·실효 HP를 내도록 채우고, §7.1 표를 이 출력의 스냅샷(T-B2)으로 고정한다.
//
// 밀도 경로와 분리한다(§1 함정, A3): 이 함수는 stageExpectedBaseJarmobHp / stageBurstJarmobBaseHp /
// stageJarmobLoadWindows / STAGE_DENSITY_MULTIPLIER 를 읽지도 쓰지도 않는다. 기존 밀도 역산이 감독 부하를 보면
// 웨이브가 깎여 난이도 상승이 상쇄된다.
//
// 스텁 동작: 감독이 없으므로(전 스테이지 꺼짐과 같다) 모든 구간이 0이다. 구간 모양(30초, 0~240s + 탈출 라운드)은
// 구현 뒤에도 그대로 둔다.

export const DIRECTOR_LOAD_WINDOW_SEC = 30
export const DIRECTOR_LOAD_DEFAULT_TOTAL_SEC = 240
export const DIRECTOR_LOAD_IMPLEMENTED = false

/**
 * @param {string} stageId
 * @param {{ kiteScore?: number, windowSec?: number, totalSec?: number }} [options]
 * @returns {Array<{ startSec:number, endSec:number, expectedHp:number, expectedCount:number, expectedEffectiveHp:number }>}
 */
export function directorExpectedLoadWindows(stageId, { kiteScore = 0, windowSec = DIRECTOR_LOAD_WINDOW_SEC, totalSec = DIRECTOR_LOAD_DEFAULT_TOTAL_SEC } = {}) {
  if (typeof stageId !== 'string' || !stageId) throw new TypeError('directorExpectedLoadWindows: stageId required')
  if (!(kiteScore >= 0 && kiteScore <= 1)) throw new RangeError('directorExpectedLoadWindows: kiteScore must be in [0, 1]')
  if (!(windowSec > 0) || !(totalSec > 0)) throw new RangeError('directorExpectedLoadWindows: windowSec/totalSec must be > 0')
  const count = Math.ceil(totalSec / windowSec)
  const windows = []
  for (let i = 0; i < count; i += 1) {
    windows.push({
      startSec: i * windowSec,
      endSec: Math.min(totalSec, (i + 1) * windowSec),
      expectedHp: 0,
      expectedCount: 0,
      expectedEffectiveHp: 0,
    })
  }
  return windows
}

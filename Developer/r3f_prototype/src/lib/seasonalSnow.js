// 2026-11-24 Terry: "2월 20일까지 눈내리는 효과 타이틀에 넣어"
// 타이틀 눈은 플레이어 기기의 현지 시각으로 2027-02-20까지(그날 포함) 보인다.
// 2027-02-21 00:00(현지)부터는 꺼지고, 타이틀은 눈 효과를 넣기 전과 완전히 같다.

// 현지 시각 기준 종료 시점(이 순간부터 꺼짐). monthIndex는 Date 규칙대로 0=1월.
export const TITLE_SNOW_END_EXCLUSIVE = Object.freeze({ year: 2027, monthIndex: 1, day: 21 })

export function titleSnowEndTime() {
  const { year, monthIndex, day } = TITLE_SNOW_END_EXCLUSIVE
  return new Date(year, monthIndex, day, 0, 0, 0, 0).getTime()
}

export function isTitleSnowActive(date = new Date()) {
  const time = date instanceof Date ? date.getTime() : Number.NaN
  if (!Number.isFinite(time)) return false
  return time < titleSnowEndTime()
}

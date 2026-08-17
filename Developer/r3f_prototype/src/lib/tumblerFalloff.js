// 텀블러 연속 타격 감쇠 — 사용자 확정 사양(2026-08-17).
//
// 텀블러가 때린 순서대로 위력이 10%씩 깎이고, 5타 주기로 1.00에 복귀한다.
//   타격  1     2     3     4     5     6     7
//   배율  1.00  0.90  0.80  0.70  0.60  1.00  0.90
//
// 카운터는 "어느 적을 때렸는지"와 무관한 텀블러 전역 순번이다. 적 A를 세 번 때린 뒤
// 적 B를 때리면 B가 받는 건 4타째(0.70)다. 사용자 원문이 "현재 이루어지는 모든 타격에
// 대해서"였고, 의도는 밀집 좀비를 "다다다닥" 훑을 때 위력이 점점 내려가는 손맛이다.
//
// 시간 경과 회복은 넣지 않는다. 넣으면 "잠깐 떨어졌다 다시 붙기"가 최적 플레이가 돼
// 조작이 지저분해진다. 순수 순환이며, 리셋은 없다.
//
// 밸런스 의도(2026-08-16 balanceqa 텀블러 하향 후보 건의 대안):
// 잡몹은 대개 주기가 한 바퀴 돌기 전에 죽으므로 물량 처리력은 거의 그대로 두고,
// 오래 버티는 보스·정예 상대 지속 화력만 평균 80%로 깎는다.
// hitsPerSecond·base.damage는 건드리지 않는다 — 타격 구조만 바꾼 조정이다.

export const TUMBLER_FALLOFF_CYCLE = 5
export const TUMBLER_FALLOFF_STEP = 0.1

// 0-based 타격 순번 n → 1 - 0.1 * (n % 5). 음수·비정수 입력도 주기 안으로 접는다.
export function tumblerHitMultiplier(hitIndex) {
  const n = Number.isFinite(hitIndex) ? Math.floor(hitIndex) : 0
  const phase = ((n % TUMBLER_FALLOFF_CYCLE) + TUMBLER_FALLOFF_CYCLE) % TUMBLER_FALLOFF_CYCLE
  return 1 - TUMBLER_FALLOFF_STEP * phase
}

// 한 주기 평균 배율 = (1.0+0.9+0.8+0.7+0.6)/5 = 0.80.
// 마틸다처럼 오래 버티는 단일 대상은 이 감쇠를 정통으로 맞으므로, DPS 추정기가
// 텀블러 지속 화력에 이 값을 곱해야 마틸다 HP가 부당하게 부풀지 않는다.
// (하드코딩 대신 주기에서 파생시켜, 주기가 바뀌면 추정기도 자동으로 따라오게 한다.)
export const TUMBLER_SUSTAINED_MULTIPLIER = (() => {
  let sum = 0
  for (let i = 0; i < TUMBLER_FALLOFF_CYCLE; i += 1) sum += tumblerHitMultiplier(i)
  return Math.round((sum / TUMBLER_FALLOFF_CYCLE) * 1e6) / 1e6
})()

// 텀블러 내구력 — 사용자 지시(2026-10-30) "텀블러 내구력 넣어라 밸런스 잡아서 넣어".
//
// 텀블러(궤도체)마다 내구력을 따로 갖는다. 실제로 피해가 들어간 타격 1회 = 내구력 1 소모.
// 0이 되면 그 텀블러만 깨져 사라지고 rechargeMs 뒤 같은 궤도 자리에서 다시 생겨 내구력이 가득 찬다.
// 오리요강(lib/compassBlade.js)의 요강별 리스폰과 같은 구조다.
//
// 상태는 "남은 내구력"이 아니라 "다시 생긴 뒤 쓴 횟수(used)"로 들고 있는다.
// 레벨업으로 최대 내구력이 오르면 살아 있는 텀블러도 즉시 그만큼 더 버틴다.
//
// 수치 정본은 weaponCatalog.js tumbler.base(durability·rechargeMs)와 upgrades.js 텀블러 카드 bonus다.

// 밀집 군중 기준 텀블러 1개당 초당 유효타(설계 가정값). 궤도 반경 1.0·각속도 2.8rad/s·판정 반경 0.46이면
// 초당 ≈2.6u²를 훑는데, 넉백 3.0이 붙은 좀비가 링에서 밀려나므로 실효 3~5타/s로 보고 중간값 4를 쓴다.
// balanceqa 실측 프로브로 갱신할 값이다.
export const TUMBLER_DENSE_HITS_PER_SECOND = 4

// 깨짐 판정. used가 durability에 닿으면 깨진다. durability가 비정상이면 내구력 없음(안 깨짐)으로 본다.
export function isTumblerDurabilitySpent(used, durability) {
  if (!Number.isFinite(durability) || durability <= 0) return false
  return used >= durability
}

// 유효타 1회 처리. 깨지면 brokenUntilMs를 돌려준다(그 전까지 사라짐). 순수 함수.
export function consumeTumblerDurability({ used = 0, durability, rechargeMs, nowMs = 0 }) {
  const nextUsed = used + 1
  if (!isTumblerDurabilitySpent(nextUsed, durability)) return { used: nextUsed, broken: false, brokenUntilMs: 0 }
  const recharge = Number.isFinite(rechargeMs) && rechargeMs > 0 ? rechargeMs : 0
  return { used: 0, broken: true, brokenUntilMs: nowMs + recharge }
}

// 장기 가동률 = 살아 있는 시간 / (살아 있는 시간 + 재생 시간).
// 살아 있는 시간 = durability / 그 텀블러 하나가 받는 초당 유효타.
export function tumblerDurabilityUptime({ durability, rechargeMs, hitsPerSecond }) {
  if (!Number.isFinite(durability) || durability <= 0) return 1
  if (!Number.isFinite(rechargeMs) || rechargeMs <= 0) return 1
  if (!Number.isFinite(hitsPerSecond) || hitsPerSecond <= 0) return 1
  const aliveSec = durability / hitsPerSecond
  return aliveSec / (aliveSec + rechargeMs / 1000)
}

// 마틸다(단일 대상) 지속 화력용 가동률. 적별 타격 게이트(hitsPerSecond)가 텀블러 전체에 공유되므로
// 마틸다 한 명이 주는 유효타는 초당 hitsPerSecond이고, 텀블러 count개가 나눠 받는다고 본다.
// count ≥ 2면 하나가 깨져도 남은 텀블러가 계속 때리므로 이 값은 손실을 약간 과대평가한다
// (= 마틸다 HP를 약간 낮게 잡는 쪽, 플레이어에게 유리한 편향).
export function tumblerSingleTargetUptime(weapon) {
  if (!weapon) return 1
  const count = Math.max(1, Math.min(3, Math.floor(weapon.count ?? 1) || 1))
  const hps = Number.isFinite(weapon.hitsPerSecond) && weapon.hitsPerSecond > 0 ? weapon.hitsPerSecond : 0
  return tumblerDurabilityUptime({
    durability: weapon.durability,
    rechargeMs: weapon.rechargeMs,
    hitsPerSecond: hps / count,
  })
}

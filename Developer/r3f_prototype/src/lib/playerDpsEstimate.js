// 마틸다(탈출 추격자) HP 산출 전용 플레이어 DPS 추정기.
//
// 신 지정 사양(2026-08-09) S2/S3:
//  - 마틸다 HP = "쉬지 않고 30분을 공격해야 하는 정도" = 플레이어 DPS × 1800초.
//  - DPS는 마틸다가 등장하는 순간에 1회 산출해 고정한다(재계산 없음).
//  - "주인공 능력에 관계없이"는 HP 숫자가 고정이라는 뜻이 아니라, 결과(30분)가
//    플레이어 강함과 무관하게 일정하다는 뜻이다. 그래서 HP를 DPS에서 파생시킨다.
//
// ── 근사 방식과 그 한계 ───────────────────────────────────────────────────────
// 이 값은 "마틸다 한 명(단일 대상)에게 초당 꽂히는 기대 피해"의 근사다.
// 실측 시뮬레이션이 아니라 무기 스탯에서 계산한 이론값이다.
//
// 포함하는 것:
//  - 무기별 현재 damage (레벨업/영구강화/might/치비코 보정이 이미 반영된 런타임 값)
//  - 발사 주기: cooldown(ms) → 초당 발동 횟수, 또는 궤도형의 hitsPerSecond
//  - 단일 대상에 겹쳐 들어가는 다중 타격: projectileCount(연필), count(궤도 무기),
//    strikeCount(스타링크)
//  - 기대 치명타 배율: 1 + critChance × (critMultiplier - 1)
//
//  - damage 필드로 표현되지 않는 2차 피해 (2026-08-15 추가, weaponSecondaryDamagePerSecond):
//    scienceFlask 웅덩이 존 틱, lineDraw 잔류 절단선 통과 피해, bikittyCutter 사이클.
//
// 의도적으로 제외하는 것 (제외 사유가 전부 "단일 대상에는 안 들어간다"):
//  - pierce(관통), chainCount(전기 체인), bounces(오니기리 바운스):
//    전부 '다른 적'으로 번지는 능력이라 마틸다 혼자를 때릴 때 DPS를 올리지 않는다.
//  - 명중률/사거리/이동으로 인한 가동률 손실: 100% 명중 가정이다. 마틸다는 계속
//    돌진 이동 중이라 실제 가동률은 이보다 낮다.
//
// 편향 방향: 제외 항목(관통·체인·바운스·존)은 DPS를 낮추는 쪽, 100% 명중 가정은
// 높이는 쪽이다. 순 편향은 무기 구성에 따라 갈리므로 30분은 정확한 보장이 아니라
// 목표 근사치다. 정밀도가 필요하면 실측 프로브로 교체하면 된다.

import { bikittyCycleDps } from './bikittyCutter.js'

// 신 지정: 30분.
export const MATILDA_ATTACK_SECONDS = 1800

// 플라스크 웅덩이 틱 주기. 정본은 components/Weapons/Flask.jsx의 ZONE_TICK_MS(1000)다.
const FLASK_ZONE_TICK_MS = 1000

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

// 기대 치명타 배율. critChance 0이면 1.0.
export function expectedCritMultiplier(weapon) {
  const chance = Number.isFinite(weapon?.critChance) ? weapon.critChance : 0
  const multiplier = Number.isFinite(weapon?.critMultiplier) ? weapon.critMultiplier : 1
  if (chance <= 0 || multiplier <= 1) return 1
  return 1 + chance * (multiplier - 1)
}

// 초당 발동 횟수.
//  1) 궤도/오라형(텀블러·오리요강): hitsPerSecond가 곧 초당 타격 수.
//  2) 랜턴형(점등 지속 + 일정 간격 타격): 한 사이클 타격 수 ÷ 사이클 길이.
//  3) 그 외 쿨다운형: 1000 / cooldown.
export function weaponHitsPerSecond(weapon) {
  if (!weapon) return 0
  const orbitalRate = positiveNumber(weapon.hitsPerSecond, 0)
  if (orbitalRate > 0) return orbitalRate

  const cooldownMs = positiveNumber(weapon.cooldown, 0)
  if (cooldownMs <= 0) return 0

  const durationMs = positiveNumber(weapon.durationMs, 0)
  const hitIntervalMs = positiveNumber(weapon.hitIntervalMs, 0)
  if (durationMs > 0 && hitIntervalMs > 0) {
    return (durationMs / hitIntervalMs) / (cooldownMs / 1000)
  }
  return 1000 / cooldownMs
}

// 한 번 발동할 때 "단일 대상에게" 겹쳐 들어가는 타격 수.
//
// 2026-08-15: 여기서 projectileCount·count·strikeCount를 곱하던 것을 걷어냈다. 셋 다 단일 대상에
// 겹치는 게 아니라 서로 다른 적으로 퍼지는 능력이라, 단일 대상 DPS를 최대 5×4×3배까지 부풀렸다.
//   - pencilThrow.projectileCount: Pencil.jsx가 서로 다른 적 N명에게 1발씩 던진다.
//   - tumbler/onigiri.count: weaponTargeting.js의 break와 적별 lastHit 게이트 때문에 궤도체를
//     늘려도 한 적이 받는 타격률은 hitsPerSecond로 고정된다.
//   - starlink.strikeCount: pickStrikeTargets가 서로 다른 적 위치를 고른다.
// 이 값은 마틸다 HP(= 스폰 시점 DPS × 1800초, Enemies.jsx)의 직접 입력이라, 부풀린 만큼
// 마틸다가 그대로 단단해져 "30분 컷" 설계가 실제로는 훨씬 긴 전투가 돼 있었다.
//
// 다단히트 무기가 실제로 생기면(같은 적에게 같은 발동으로 2회 이상) 그 무기의 필드를 여기 더한다.
export function weaponOnTargetHits(weapon) {
  if (!weapon) return 0
  return 1
}

// damage 필드 하나로는 표현되지 않는 2차 피해의 "초당 기대 피해"(치명타 적용 전).
// 예전에는 estimateWeaponDps가 damage만 봐서 아래 두 무기를 통째로 과소계상했다.
//   - scienceFlask: 착탄 자리에 남는 화학 웅덩이가 1초(FLASK_ZONE_TICK_MS)마다 zoneTickDamage.
//     한 쿨다운 사이클 안에 들어가는 틱만 센다 — 존이 쿨다운보다 길어도 두 겹으로 세지 않는다.
//   - lineDraw: 잔류 절단선을 가로지를 때 lineCrossDamage. 단일 대상(마틸다)은 한 사이클에
//     1회 통과로 본다. lineCrossCooldownMs(600) 덕에 그 이상은 밀집 상황에서만 나온다.
export function weaponSecondaryDamagePerSecond(weapon) {
  if (!weapon) return 0
  const cooldownSec = positiveNumber(weapon.cooldown, 0) / 1000
  if (cooldownSec <= 0) return 0

  let perCycle = 0
  const tickDamage = positiveNumber(weapon.zoneTickDamage, 0)
  if (tickDamage > 0) {
    const zoneMs = Math.min(positiveNumber(weapon.zoneDurationMs, 0), cooldownSec * 1000)
    perCycle += tickDamage * Math.floor(zoneMs / FLASK_ZONE_TICK_MS)
  }
  perCycle += positiveNumber(weapon.lineCrossDamage, 0)
  return perCycle / cooldownSec
}

// damage 필드가 매 타격 그대로 들어가지 않는 무기의 "지속 화력 보정"(2026-08-17 추가).
// 정본은 각 무기의 weaponCatalog base.sustainedDamageMultiplier다. 없으면 1(보정 없음).
//
// 현재 유일한 사용처는 텀블러다. 연속 타격 감쇠(lib/tumblerFalloff.js)로 5타 주기 배율이
// 1.0/0.9/0.8/0.7/0.6이라 주기 평균이 0.80인데, 이 추정기는 damage × 발사율만 보므로
// 감쇠를 모르면 텀블러 기여분을 25% 과대계상한다. 마틸다는 단일 대상이고 오래 버티므로
// 감쇠를 정통으로 맞는데(= 평균 배율에 수렴), 그 HP가 이 추정값에서 그대로 파생되기
// 때문에(Enemies.jsx: DPS × 1800초) 보정 없이는 마틸다만 부당하게 단단해진다.
function sustainedDamageMultiplier(weapon) {
  const value = weapon?.sustainedDamageMultiplier
  return Number.isFinite(value) && value > 0 ? value : 1
}

// 무기 1종의 단일 대상 기대 DPS. 비활성 무기는 0.
export function estimateWeaponDps(weapon) {
  if (!weapon?.active) return 0
  // 바이키티 커터칼은 "8단 성장 + 부러짐 산탄"이 한 사이클을 이뤄 damage×발사율로 못 뽑는다.
  // 정본 사이클 계산(lib/bikittyCutter.js)이 이미 있으므로 그걸 그대로 쓴다(추정 8.44 → 실측 11.49).
  if (Number.isFinite(weapon.segments) && Number.isFinite(weapon.snapDamage)) {
    return bikittyCycleDps(weapon) * expectedCritMultiplier(weapon)
  }
  const damage = Number.isFinite(weapon.damage) ? weapon.damage : 0
  const secondary = weaponSecondaryDamagePerSecond(weapon)
  if (damage <= 0 && secondary <= 0) return 0
  const primary = damage * weaponOnTargetHits(weapon) * weaponHitsPerSecond(weapon) * sustainedDamageMultiplier(weapon)
  return (primary + secondary) * expectedCritMultiplier(weapon)
}

// 장착 무기 전체 합산 DPS. weapons는 useGameStore의 weapons 맵.
export function estimatePlayerDps(weapons) {
  if (!weapons || typeof weapons !== 'object') return 0
  let total = 0
  for (const weapon of Object.values(weapons)) {
    total += estimateWeaponDps(weapon)
  }
  return total
}

// 마틸다 HP = 스폰 시점 DPS × 1800초.
// 신 지정값을 clamp/보정하지 않는다 — 나온 값을 그대로 쓴다.
export function matildaHpFromWeapons(weapons) {
  return estimatePlayerDps(weapons) * MATILDA_ATTACK_SECONDS
}

// 밸런스 프로브 성장 모델 REF_BUILD_V1 (§10.1 T-P4). 감독(timeEscalationDirector) 코드보다 먼저 고정한다.
//
// 규칙(문서 그대로): 레벨업마다 연필 피해 ×1.12, 쿨다운 ×0.97, 5레벨마다 관통 +1.
// 시작 피해 배수: S1~S5 모두 1.0으로 고정하고 클리어율에 맞추지 않는다(balanceqa 2026-10-31 결정,
//   zombie15_probe_review_20261031.md 2절). 배수 0.5~1.5배 그리드에서 클리어율이 시드 잡음 이상으로 움직이지 않아,
//   배수를 고르면 잡음에 맞추게 된다. 기준 KITE 클리어율은 목표가 아니라 측정 기록이다.
//   값을 바꾸면 감독 AK 판정의 기준선 전체가 무효가 된다 — 바꿔야 하면 REF_BUILD_V2를 새로 만들고 기준선을 다시 잰다.
//
// 보정 기록과 기준선 수치: Developer/agent_room/zombie15_probe_baseline_results_20261031.md
//
// 한계(문서 §10.1 T-P4): 연필 1종이라 실제 빌드 다양성을 반영하지 못한다. 치명타는 모델링하지 않는다
// (시작 피해 배수가 흡수한다). 레벨업 카드 선택 일시정지는 없다(프로브 시간은 멈추지 않는다).

export const REF_BUILD_V1 = Object.freeze({
  id: 'REF_BUILD_V1',
  perLevelDamageMultiplier: 1.12,
  perLevelCooldownMultiplier: 0.97,
  pierceEveryLevels: 5,
  // 스테이지별 시작 피해 배수(고정, 맞춤 없음). 연필 base damage(weaponCatalog pencilThrow.base)에 곱한다.
  startDamageMultiplier: Object.freeze({
    stage1: 1,
    stage2: 1,
    stage3: 1,
    stage4: 1,
    stage5: 1,
  }),
  // 기준선에 탈출 이후 +10% 주기 웨이브(749d779)가 들어 있다.
  includesPostEscapeTenPercentWave: true,
  // calibrated: 값이 확정됐다는 뜻. calibrationMethod 'fixed' = 클리어율에 맞추지 않고 1.0으로 고정했다.
  calibrated: true,
  calibrationMethod: 'fixed',
})

// 레벨(1부터)에 대한 연필 스탯. base는 weaponCatalog.pencilThrow.base 형식.
export function refBuildPencilStats(base, level, stageId, build = REF_BUILD_V1) {
  const steps = Math.max(0, Math.floor(level) - 1)
  const start = build.startDamageMultiplier[stageId] ?? 1
  return {
    ...base,
    damage: base.damage * start * build.perLevelDamageMultiplier ** steps,
    cooldown: base.cooldown * build.perLevelCooldownMultiplier ** steps,
    pierce: base.pierce + Math.floor(steps / build.pierceEveryLevels),
  }
}

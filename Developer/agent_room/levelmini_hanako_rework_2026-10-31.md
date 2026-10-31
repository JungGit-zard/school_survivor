# levelmini — 하나코 능력 재설계 (Terry 2026-10-31, receipt 5bcfc83f)
| 하나코 Lv | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 20초마다 회복 = 현재 HP × | 10% | 15% | 20% | 25% | 30% |
| 전 무기 치명타 피해 보너스 | +10% | +15% | +20% | +25% | +30% |
- 정본 비율: `src/lib/hanako.js` `getHanakoRatio(level)` = catalog healPercent 0.10 + 0.05×(Lv−1). 회복은 `computeHanakoHealAmount(player.hp, level)`(Hanako.jsx 루프).
- 치명타: `criticalHits.js` 모듈 변수 → 치명타 타격만 1.5×(1+bonus). 확률 불변, 폭발 비치명 유지.
  store `subscribe(getHanakoCritDamageBonus(weapons))`가 갱신 — 등장 조건(`shouldRenderHanakoCompanion`)과 같을 때만 >0.
- 카드: `upgrades.js` `hanakoUpgrade`(stat healPercent +0.05, cap 0.30) ×4 = Lv5.
- 미완: HUD.jsx `UPGRADES`에 `hanakoUpgrade` 항목이 없어 실게임 카드 풀에 안 뜬다(HUD 영역 금지라 미수정). acquireHanako 문구도 "최대 체력 5%"로 옛 값.
- balanceqa 핸드오프: 현재 HP 기준이라 빈사 구간 회복량이 작다(HP 10 → Lv5 3). 치명타 보너스가 DPS 추정(playerDpsEstimate)엔 미반영.
- 테스트: `npx vitest run src/lib/hanako.test.js src/lib/criticalHits.test.js src/lib/upgrades.test.js src/lib/weaponCatalog.test.js src/store/useGameStore.test.js src/components/Weapons/Hanako.test.jsx src/components/Weapons/Hanako.runtime.test.jsx --testTimeout=60000` (관련 20파일 358 통과)

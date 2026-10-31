# levelmini — 커터칼 피해 상향 / 연필 카드 정리 (2026-11-01)

- 트리: ezs-cf `zombie_only` @ 2bc08084 (커밋 안 함). 영수증 5bcfc83f.
- Terry 지시(2026-11-01): "커터칼 피해 늘려라", "연필 니 추천대로 수정".
- 근거: `Developer/agent_room/balanceqa_weapon_balance_remeasure_2026-10-31.md` 후보 ⑥, 연필 항목(73~75행).

## 1. 커터칼 (boxCutter)

| 키 | 이전 | 이후 |
|---|---|---|
| boxCutterDamage.damageMultiplier | 1.15 | 1.30 |
| boxCutterPower.damageMultiplier | 1.15 | 1.30 |

- 커터칼에는 피해 카드가 Damage, Power 두 장 있고 둘 다 ×1.15였다. balanceqa 후보 ⑥의 목표치(8.87)는 두 장을 모두 1.30으로 올렸을 때 나오는 값이라(6.94 × (1.30/1.15)² = 8.87) 두 장 모두 올렸다. Damage만 올리면 7.85에 그친다.
- 바이키티(bikittyCutterDamage/Power, 1.15)는 별도 키라 그대로 두었다.
- 수치(balanceqa 모델, 단일 대상 DPS): Lv1 5.16(변동 없음), 4장 6.94 → 8.87, 성장 1.35× → 1.72×. 2.0× 정본에는 아직 못 미친다(1.40이면 10.29).
- 피해 표시(치명타, 카탈로그 기본 + 피해 카드 4장): 19 → 31. B01 + 치비코 10%: 22 → 36.
- 카드 라벨은 배수에서 자동으로 계산된다: "커터칼 피해/위력 +15%" → "+30%". desc 문구에는 퍼센트가 없어서 고치지 않았다.
- 코드 주석: `// Terry 2026-11-01: 커터칼 피해 상향 (balanceqa 1.15→1.30)`

## 2. 연필 (pencilThrow)

- 2a. `pencilCrit` 삭제 완료. HUD.jsx UPGRADES, PENCIL_UPGRADE_KEYS, upgrades.js UPGRADE_EFFECTS, en/ja 로케일 label·desc를 지웠다. store·firebase·functions에서 저장 경로로 참조하는 곳은 없었다(grep 결과 0건). 영구강화의 연필 치명타(weaponPermanentUpgrades의 CRIT_CHANCE_LEVELS)와 기본 critChance 0.08은 별개 시스템이라 그대로 두었다.
- 2b. 카드 순서: Damage → Power → Count → Pierce(→ Crit)에서 **Damage → Count → Power → Pierce**로 바꿨다. HUD.jsx와 upgrades.js 선언 순서를 똑같이 맞췄다.
- 수치(balanceqa 73~74행): Lv3 군중 18.2 → 27.2, Lv3 단일 9.08 → 6.81. Lv5 최종값(단일 13.61, 군중 54.5, 2.00×)은 그대로다.

## 테스트 갱신

- upgrades.test.js: 커터칼 배수와 기대값을 1.15에서 1.30으로 바꿨다(82.8 → 93.6, 표시 19 → 31). pencilCrit은 크리 카드 목록 두 곳에서 뺐다. crit effect 단위 테스트는 bagCrit(같은 +0.02 스텝)으로 바꿨다.
- HUD.test.jsx: 커터칼 라벨 +15%를 +30%로 바꿨다(2곳). 연필 옵션 목록에서 pencilCrit을 빼고, 회전 테스트는 새 4장 순서로 바꿨다.
- useGameStore.test.js: 커터칼 ×1.30, 표시 22 → 36.

## 테스트 결과 (요청 세트 + 커터/연필/바이키티 관련 15파일)

- 297건 중 296건 통과, 1건 실패. 실패 1건은 i18nCoverage "레벨업 카드 문구가 en·ja에 있다"이고 원인은 hanakoUpgrade label/desc 누락이다. HEAD에서도 똑같이 실패해서(stash 후 확인) 이번 변경과 무관하다. 연필로 인해 새로 생긴 실패는 없다.

## balanceqa 핸드오프

- 커터칼 1.30이 들어간 상태에서 4장 단일·군중 DPS를 다시 재고, 1.72×가 Terry 기준으로 충분한지 판정해 달라. 2.0×까지 가려면 1.40이 후보다.
- 연필 Count 선행 이후 S1 첫 2~3회 레벨업 구간의 체감(Lv3 단일 6.81)이 너무 약해지지 않는지 확인해 달라.

## 전체 스위트 (참고)

- 4137건 중 4094건 통과, 10건 실패, 33건 스킵.
- 실패는 전부 연필·커터칼과 무관한 파일에서 났다: i18n hanakoUpgrade, audio audition, App.virtualJoystick, Enemies.lowDensityAllStages ×2, Enemies.stage5, GraphicsStudio.undo ×2, Lobby 10,000회 루프, MiniRosari 스케일.
- 따로 다시 돌린 7개 파일(63건) 중 실패는 audition과 virtualJoystick 2건이었고, 둘 다 원래 있던 실패로 기록돼 있다. 나머지는 전체를 한꺼번에 돌릴 때 부하로 실패한 것으로 보인다.

## 1.40 follow-up (Terry 2026-11-01 "커터칼 올려")

- 커터칼 피해/위력 카드 배율을 1.30에서 1.40으로 올렸다(`r3f_prototype/src/lib/upgrades.js`). 바이키티 커터칼은 1.15 그대로다.
- 피해 카드 4장 기준 DPS는 10.29(balanceqa 계산)이고, 성장폭은 1.99배다. 기본 7.2 피해가 4장 뒤 7.2 × 1.40⁴ = 27.66, 치명타 표시는 41이다. B01과 치비코가 붙으면 31.95, 치명타 표시는 48이다.
- 테스트 기대값을 바꾼 파일은 `src/lib/upgrades.test.js`, `src/store/useGameStore.test.js`, `src/components/HUD.test.jsx`(카드 표시 +30% → +40%)이다. 테스트 이름의 30%도 40%로 바꿨다.
- 지정 4개 파일은 190건 모두 통과했다. boxCutter 카드를 다루는 테스트 파일 4개(bossPassiveItems 포함)는 201건 모두 통과했다. 실패했던 6건은 이제 통과한다.

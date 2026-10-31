# levelmini — 하나코 회복 기준 변경 (잃은 HP 기준) 2026-10-31

## 지시 (Terry 2026-10-31, 원문)
"하나코는 피해량 복구 기준을 바꾼다. 현재까지 피해를 받아 없어진 량의 15퍼센트를 복구로 바꿔 업글시 1프로씩 증가"

## 사양
- 20초마다 회복량 = (maxHp - hp) × healRatio
- healRatio Lv1~5 = 15 / 16 / 17 / 18 / 19% (기본 0.15 = weaponCatalog hanako.base.healPercent, Lv당 +0.01)
- 풀피(hp >= maxHp) 또는 입력이 유한수가 아니면 0
- 치명타 피해 보너스는 그대로: 10 / 15 / 20 / 25 / 30% (Lv당 +5%). 회복 비율과 분리된 별도 상수
- 예: maxHp 100, hp 40 → Lv1 9 회복, Lv5 11.4 회복
- 카드: hanakoUpgrade stat healPercent step 0.01 cap 0.19 (4장 = Lv5)

## 부가 (balanceqa 요청)
- useGameStore.damagePlayer: 이누콘이 흡수한 피해도 logDamageTaken(absorbed, player.hp)로 기록 (플레이테스트 피격 합계 누락 방지)

## 수정 파일 (Developer/r3f_prototype)
- src/lib/hanako.js — getHanakoHealRatio / getHanakoCritRatio 분리, computeHanakoHealAmount(currentHp, maxHp, level)
- src/components/Weapons/Hanako.jsx — 호출부에 player.maxHp 전달
- src/lib/weaponCatalog.js — hanako healPercent 0.1 → 0.15
- src/lib/upgrades.js — hanakoUpgrade step 0.01 cap 0.19
- src/components/HUD.jsx — acquireHanako / hanakoUpgrade 설명 문구
- src/store/useGameStore.js — 이누콘 흡수 피해 telemetry 1줄
- 테스트: src/lib/hanako.test.js, src/components/Weapons/Hanako.test.jsx, src/components/Weapons/Hanako.runtime.test.jsx, src/lib/upgrades.test.js, src/lib/weaponCatalog.test.js

## 검증
npx vitest run (hanako, Hanako, Hanako.runtime, upgrades, useGameStore, HUD.questInventory, gameplaySoak, HUD, TitleScreen.settings, lineDraw, weaponCatalog, weaponUnlocks)
→ 12 files / 289 tests 전부 통과

## balanceqa 핸드오프
- 회복 체감이 저체력일수록 커진다(잃은 HP 비례). 풀피 근처에서는 사실상 0. 저체력 구간 생존 연장 폭을 S1~5 소크에서 확인 요망
- en/ja 로케일 사전에는 새 한국어 설명 문구 항목이 없다(기존 문구도 없었음) — 번역 필요 시 별건

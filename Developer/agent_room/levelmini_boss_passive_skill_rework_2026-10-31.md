# levelmini — B02~B04 보스 패시브 재설계 (2026-10-31, Terry 지시)

B01 삼각자와 같은 "보스 스킬 → 같은 성질의 무기 3종 공격력 ×1.05" 형태로 통일. id(Firebase `bossPassiveUnlocks` 키)는 불변.

| id | 이름 | 대상 무기 | 근거(보스 스킬) |
|---|---|---|---|
| b01SetSquare | 삼각자(변경 없음) | boxCutter, schoolBag, bikittyCutter | 삼각자 휘두르기 |
| b02CorridorPass | 복도 통제선 | lineDraw, bell, studentLantern | 통제선 2줄 = 바닥 선/링/빛 상자 |
| b03GymWhistle | 체육관 호루라기 | miniRosari, chibiko, onigiri | 3배속 왕복 달리기 = 왕복·동반·바운스 |
| b04ServingLadle | 급식 국자 | tumbler, scienceFlask, eraserBomb | 포격·국물 대폭발 = 던지고 터지는 급식 |

네 세트는 서로소(12종 중복 없음, 테스트로 단언).

삭제: B03 이동속도 +5%(`applyBossPassiveMovementSpeed`), B04 최대 체력 +5%(`applyBossPassiveMaxHp`), maxHealth 카드의 ×1.05 증가분(이제 항상 +7).
기존 보유자 영향: 해금 플래그는 그대로 남고 다음 런부터 효과만 새 무기 damage로 바뀐다. 이동속도·최대 체력 5% 이점은 사라진다(B04 보유자는 시작 maxHp가 5% 낮아짐).
주의: scienceFlask는 `damage`만 ×1.05, 웅덩이 `zoneTickDamage`는 기존 helper 계약대로 변하지 않는다.

테스트: `npx vitest run src/lib/bossPassiveItems.test.js src/store/useGameStore.bossPassiveItems.test.js src/components/HUD.questInventory.test.jsx src/lib/firebaseProgress.test.js src/store/bossDefeatUnlock.test.js src/lib/databaseRules.test.js src/components/EnemyVisual.test.js --testTimeout=60000` → 7 files / 151 tests 통과.
balanceqa 핸드오프: 세트별 DPS 체감 차이(랜턴·치비코는 저데미지 다타) 실플레이 확인 요망.

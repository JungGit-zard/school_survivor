# balanceqa 검증: 하나코 회복 기준 "잃은 HP × 15% (+1%/Lv)" (2026-10-31, receipt c272adba)

- 대상: `C:\Users\admin\AppData\Local\Temp\ezs-cf` zombie_only, c35d7e9d 위 미커밋 변경 11파일 (levelmini 노트 `levelmini_hanako_lost_hp_heal_2026-10-31.md`)
- 범위: 코드 읽기 + 단위/소크 테스트 실행 + 계산 모델. 런타임 브라우저 플레이는 하지 않았다(미검증).

## 판정: APPROVE WITH NOTES

코드 결함 없음. 노트 3건(텔레메트리 출처 구분 없음, 카드 healPercent는 표시용 거울값, S5 피해 모델 없음).

## 1. 코드 정확성

| 항목 | 결과 | 근거 |
|---|---|---|
| 공식 | PASS | `hanako.js` computeHanakoHealAmount = (maxHp − max(0,hp)) × (0.15 + 0.01×(Lv−1)). Lv1~5 = 15/16/17/18/19% |
| 클램프 | PASS | Lv은 1~5로 클램프(floor, NaN→1). hp ≥ maxHp, hp/maxHp 비유한수 → 0. hp ≤ 0이면 maxHp 기준 회복이 나오지만 그 시점은 이미 gameover라 무해 |
| 치명타 분리 | PASS | getHanakoCritRatio = 0.10 + 0.05×(Lv−1), 기존 10~30% 그대로. criticalHits 경로는 getHanakoCritDamageBonus만 사용 |
| 삭제된 `getHanakoRatio` / `HANAKO_LEVEL_STEP` 호출부 | PASS | src 전체(테스트 포함) 0건. 남은 언급은 옛 문서 `agent_room/levelmini_hanako_rework_2026-10-31.md`뿐(코드 아님) |
| 호출부 | PASS | Hanako.jsx:165 `computeHanakoHealAmount(player.hp, player.maxHp, weapons.hanako?.level)`. 다른 호출부 없음 |
| upgrades.js 거울값 | PASS | step 0.01 cap 0.19. 부동소수 누적 0.15→0.16→0.17→0.18000000000000002→0.19(Math.min으로 정확히 0.19), 0.19 < 0.19 false → 카드 4장 후 정확히 차단, Lv5 |
| 치비코 10% 강화와 충돌 | PASS | CHIBIKO_INCREASE_STATS에 healPercent 없음 → 거울값이 1.1배로 부풀어 카드가 Lv4에서 막히는 일 없음 |
| 영구 강화 | 영향 없음(전/후 동일) | weaponPermanentUpgrades.js:261-264의 healPercent 스케일은 `if (id === 'inucon')` 블록 안이라 하나코에 적용 안 됨. 게다가 hanako.js는 런타임 weapon.healPercent를 읽지 않고 카탈로그 base(HANAKO_HEAL_RATIO) + 레벨 공식만 쓴다. 따라서 변경 전에도 후에도 영구 강화는 하나코 회복에 영향 없음. 런타임 `weapons.hanako.healPercent`는 카드 상한 판정용 거울값일 뿐 |
| 문구 | PASS | HUD.jsx UPGRADES 2줄 갱신. src에 "현재 남은 체력" 잔존 0건. en/ja 사전에 하나코 항목 없음(기존과 동일, 별건) |

## 2. 텔레메트리 (`logDamageTaken(absorbed, player.hp)`)

- 이중 집계: **없음.** `amount -= absorbed` 뒤 남은 피해만 `logDamageTaken(amount, hp)`로 기록. 합계 = 원래 피해량.
- 둘째 인자: helper는 `record('hit', { damage, hp, totalDamageTaken })`이고 기존 호출은 **피해 적용 후 hp**를 넘긴다. 흡수분은 주인공 hp를 깎지 않으므로 `player.hp`가 곧 적용 후 hp → 올바름.
- 노트(N1): 한 번의 접촉이 일부 흡수되면 같은 시각 'hit' 이벤트가 2건 생기고, 이벤트에 출처 필드가 없다. `stats.totalDamageTaken`의 의미가 "주인공 피해"에서 "주인공 + 이누콘 대신 맞은 피해"로 바뀐다. 분석 시 구분하려면 `logDamageTaken(absorbed, player.hp, { absorbedBy: 'inucon' })` 같은 필드 추가를 권고(필수 아님). 현재 'hit' 이벤트 개수를 세는 소비자는 src에 없음(grep 확인).

## 3. 밸런스 수치

회복 HP/s = 잃은 HP × 비율 / 20초. 받는 피해는 `balanceqa_incoming_damage_vs_healing_2026-10-31.md` N=3 모델: S1 15.0, S2 15.0, S3 16.5, S4 22.5 HP/s. **S5는 그 문서에 모델이 없어 미산정.**

| maxHp | hp | 잃은 HP | 신 Lv1 | 신 Lv5 | 구(현재HP) Lv1 10% | 구 Lv5 30% | 신 Lv5 1회 회복량 |
|---|---|---|---|---|---|---|---|
| 100 | 30% | 70 | 0.525 | 0.665 | 0.150 | 0.450 | 13.3 |
| 100 | 50% | 50 | 0.375 | 0.475 | 0.250 | 0.750 | 9.5 |
| 100 | 80% | 20 | 0.150 | 0.190 | 0.400 | 1.200 | 3.8 |
| 150 | 30% | 105 | 0.788 | 0.998 | 0.225 | 0.675 | 20.0 |
| 150 | 50% | 75 | 0.563 | 0.713 | 0.375 | 1.125 | 14.3 |
| 150 | 80% | 30 | 0.225 | 0.285 | 0.600 | 1.800 | 5.7 |

받는 피해 대비 상쇄율 (신 Lv5):

| 상태 | S1/S2 (15.0) | S3 (16.5) | S4 (22.5) |
|---|---|---|---|
| 100HP, hp 30% (0.665) | 4.4% | 4.0% | 3.0% |
| 100HP, hp 50% (0.475) | 3.2% | 2.9% | 2.1% |
| 100HP, hp 80% (0.190) | 1.3% | 1.2% | 0.8% |
| 150HP, hp 30% (0.998) | 6.7% | 6.0% | 4.4% |
| 150HP, hp 50% (0.713) | 4.8% | 4.3% | 3.2% |
| 150HP, hp 80% (0.285) | 1.9% | 1.7% | 1.3% |

- 구 규칙과 교차점: Lv1은 hp 60%, Lv5는 hp 38.8% 아래에서 신 규칙이 더 많이 회복한다. 그 위에서는 신 규칙이 약하다(80%에서 Lv5 1.20 → 0.19, 약 1/6).
- 이론 상한(hp→0, Lv5): 100HP 0.95 HP/s(1회 19), 150HP 1.42 HP/s(1회 28.5). 100HP 상한 0.95는 이누콘 기본 1.00 HP/s보다 작고, 1회량 19는 자판기 35보다 작다.
- 이전 회복 합계 3.57 HP/s(하나코 0.25 포함)에 하나코 자리를 신 Lv5로 바꾸면: 100HP hp30% 3.99 HP/s(S1 N=3 대비 26.6%), 이론 상한 4.27 HP/s(28.5%).
- 평형: S1 N=3(15 HP/s)에서 하나코 Lv5 단독으로 피해와 맞먹으려면 잃은 HP가 1579 필요 → 어떤 maxHp에서도 도달 불가. 즉 저체력 폭주(무한 버티기) 없음.
- "저체력 Lv5가 너무 센가"에 대한 숫자 답: 최대 0.95 HP/s(100HP) / 1.42 HP/s(150HP), S1 N=3 받는 피해의 6.3% / 9.4%. 구 규칙 Lv5 최대(풀피 근처 1.20~1.80 HP/s, 단 대부분 낭비)보다 작다.
- 주의: 20초 주기 이산 회복이라 위 HP/s는 평균값이다. S1 N=3에서 hp 30(100HP)은 회복 없이 2.0초 생존이고, 그 2초 안에 회복 틱이 떨어질 확률은 약 10%(2/20)다. 저체력 구원 효과는 평균보다 운에 좌우된다.

## 4. 테스트 (직접 실행)

```
cd C:/Users/admin/AppData/Local/Temp/ezs-cf/Developer/r3f_prototype
npx vitest run --maxWorkers=1 --no-file-parallelism src/lib/hanako.test.js src/components/Weapons/Hanako.test.jsx src/components/Weapons/Hanako.runtime.test.jsx src/lib/upgrades.test.js src/lib/weaponCatalog.test.js src/lib/gameplaySoak.test.js src/store/useGameStore.test.js
→ Test Files 7 passed (7), Tests 155 passed (155), 17.10s
```

- 요청 6파일 + useGameStore.test.js(텔레메트리 줄 회귀) 포함. 이누콘 흡수 텔레메트리 줄을 직접 단언하는 테스트는 없음(N2, 추가 권고).

## 노트 / 미검증

- N1: 텔레메트리 'hit' 이벤트에 흡수 출처 구분 없음(위 2절).
- N2: 흡수 경로 logDamageTaken 단위 테스트 없음.
- N3: S5 받는 피해 모델 없음 → S5 상쇄율 미산정. 런타임 소크로 실제 피격률·하나코 회복 기여 계측은 하지 않음.

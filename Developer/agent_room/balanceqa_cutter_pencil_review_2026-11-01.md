# balanceqa — 커터칼 피해 상향 / 연필 카드 정리 검수 (2026-11-01)

- 트리: `C:\Users\admin\AppData\Local\Temp\ezs-cf` `zombie_only` @ 2bc08084 + 미커밋 변경 (영수증 c272adba). 리뷰 전용, 코드 수정·커밋 없음.
- 대상: levelmini `Developer/agent_room/levelmini_cutter_pencil_2026-11-01.md`
- Terry 지시(2026-11-01): "커터칼 피해 늘려라", "연필 니 추천대로 수정"

## 판정: APPROVE WITH NOTES

차단 사유 없음. 노트 2건(커터칼 1.40 권고, 연필 Lv3 E02 TTK 증가)은 후속 판단용이다.

## (a) 커터칼 boxCutterDamage/Power 1.15 → 1.30

모델: 단일 DPS = Lv1 5.16 × 배수² × 치명타 카드 계수 1.017 (Range는 단일 0). 10-31 재측정 문서의 6.94를 역산해 계수를 맞췄다.

| 배수 | 4장 단일 DPS | 성장(÷Lv1) | 군중(추정, 13.9 기준 비례) |
|---|---|---|---|
| 1.15 (이전) | 6.94 | 1.35× | 13.9 |
| **1.30 (적용)** | **8.87** | **1.72×** | 17.8 |
| 1.40 (후보) | 10.29 | 1.99× | 20.6 |

- Lv1 5.16 변동 없음 확인: 배수는 카드 적용 시에만 곱해진다(`upgrades.js` UPGRADE_EFFECTS, kind 'damage').
- 1.72×는 2.0× 정본에 못 미치지만 Terry 지시는 "피해 증가"이지 특정 수치가 아니므로 수용한다(+28% DPS).
- **권고(비차단): 1.40.** 1.40이어도 4장 10.29로 무기 중앙값 11.28 아래에 머물러 상위 이상치가 되지 않고, 성장 1.99×로 정본을 정확히 맞춘다. 1.30(8.87)은 여전히 중앙값의 0.79배로 하위권이다. 결정은 Terry 몫.

## (b) 연필 Damage→Count→Power→Pierce 재정렬 — S1 웨이브 1~3

모델 수치(10-31 문서 73~74행과 동일): Lv3 단일 9.08 → 6.81, 군중 18.2 → 27.2, Lv5 최종(13.61 / 54.5, 2.00×) 불변.

S1 웨이브 1~3(0~72초)은 E01(hp 8) 위주, E03(10) 3~10%, E02(70)는 60초부터 10%다(`waveTimelines.js` BASE_WAVE_PHASES). S1은 HP 앵커라 원 HP 그대로다. `Pencil.jsx:193-205`는 projectileCount만큼 서로 다른 최근접 적을 조준하므로 군중 모델이 실제 동작과 맞다.

치명타 8% 제외 타수와 처치 처리량(쿨다운 550ms):

| Lv3 상태 | 발당 피해 | E01 타수 | E03 타수 | E02 타수 | E01 처치/초 | 웨이브3 혼합 처치/초 |
|---|---|---|---|---|---|---|
| 이전 (Dmg+Power, 1발) | 4.8 | 2 | 3 | 15 (8.3s) | 0.91 | 0.53 |
| 이후 (Dmg+Count, 2발) | 3.6 | 3 | 3 | 20 (11.0s) | 1.21 | 0.77 |

- 웨이브 1~3 잡몹 처리량은 +33%(E01만) ~ +44%(웨이브3 혼합)로 오히려 늘었다. 초반 군중 정리 속도가 빨라지는 방향이라 S1 페이싱을 느리게 만들지 않는다.
- 유일한 퇴행: 단일 E02 처치 8.3초 → 11.0초(+33%). 웨이브3 비중 10%이고 다른 연필이 동시에 잡몹을 치우므로 허용 범위로 본다.
- E01 브레이크포인트: 3.6×2 = 7.2 < 8이라 Lv3에서 발당 3타가 된다. Lv2(양 순서 공통 3.6)와 같은 타수라 Lv2→Lv3에서 개체당 체감 퇴행은 없고 대상만 2배가 된다.
- **정직 표기:** 이전 balanceqa 문서에 "S1 웨이브 1~3 클리어 시간"의 수치 상·하한은 정의돼 있지 않다(웨이브 target은 동시 생존 수다). 따라서 "범위 안"은 위 처리량 프록시로 판정했고, 실기 플레이 계측은 하지 않았다. 미검증.

## (c) pencilCrit 잔존 참조

- `git grep pencilCrit` (agent_room·QA 기록 제외): 코드 0건. 남은 1건은 `HUD.jsx:175` 삭제 사유 주석뿐이다.
- `src`, `functions`, `scripts`, `public` 재귀 grep: 동일 결과.
- 레벨업 후보는 `UPGRADES` 배열에서만 생성되고(`HUD.jsx:476`) 나머지 조회는 `UPGRADE_EFFECTS[key]?.` 가드라, 옛 키가 남은 상태라도 크래시 경로가 없다. 스토어 저장 경로 참조 0건.
- 영구강화 연필 치명타(CRIT_CHANCE_LEVELS)와 기본 critChance 0.08은 별개 시스템으로 유지 — 정상.

## (d) 바이키티

- `upgrades.js:173-174` bikittyCutterDamage / bikittyCutterPower 둘 다 `damageMultiplier: 1.15` 그대로. diff에 바이키티 변경 없음.

## 테스트

```
cd C:\Users\admin\AppData\Local\Temp\ezs-cf\Developer\r3f_prototype
npx vitest run --maxWorkers=1 --no-file-parallelism src/lib/upgrades.test.js src/components/HUD.test.jsx src/store/useGameStore.test.js
```

결과: Test Files 3 passed (3), Tests 178 passed (178), 10.77s.

전체 스위트는 이번 검수에서 돌리지 않았다. levelmini 보고의 기존 실패(i18n hanakoUpgrade 등)는 재확인하지 않았다.

## 남은 일

1. Terry 판단: 커터칼 1.30 유지 또는 1.40 (balanceqa 권고 1.40, 비차단).
2. 선택: S1 실기 1런에서 Lv3 도달 시각과 웨이브3 생존 수 계측(이번 판정은 수치 모델 기반).

# 무기 위력 수치적용 검수 + 스테이지2 HP 역전 수정 (2026-08-15)

선행 분석: `levelmini_weapon_damage_audit_2026-08-15.md`, `balanceqa_stage2_pencil_anomaly_2026-08-15.md`
기준 HEAD: `b7518b1`. 위임 워커 2기가 세션 한도로 중단돼 Advisor가 직접 착지시켰다.

## 1. 스테이지2 "연필이 더 세다" — 연필 무죄, 잡몹이 물렀다

`Pencil.jsx`에 `stage` 문자열이 없다. 원인은 잡몹 HP 정규화였다.

### 수정 (`src/components/Enemies.jsx` 3곳)

| # | 위치 | 내용 |
|---|---|---|
| A | 앵커 파생 | `stageExpectedBaseJarmobHp('stage1')` → `+ stageBurstJarmobBaseHp('stage1')`. 주석은 "앵커=stage1 총량"이라 선언했는데 실제로는 웨이브 base만 읽어 stage1 버스트 2336(총량의 34.8%)이 통째로 빠져 있었다. |
| C | `remaining` | `stage2GuardChaseFixedHp` 차감 추가. 확정 HP 1888이 계산만 되고 예산에서 빠지지 않아 m을 더 깎았다. `stageExpectedJarmobHp`에도 같은 항 추가. |
| E | `JARMOB_HP_TYPES` | `E07` 편입. E07은 `Enemy.jsx:303`에 "E01의 정확히 2배"로 못 박힌 잡몹인데 이 집합에서 빠져 보스·런크루용 곡선을 타고 있었다. |

### 실측 (전 → 후)

실전달 잡몹 총 HP의 stage1 대비 배율. **목표는 1 / 1.21 / 1.331 / 1.4641.**

| | stage1 | stage2 | stage3 | stage4 |
|---|---|---|---|---|
| 전 | 1.0000 | **0.7891** | **0.8680** | **0.9548** |
| 후 | 1.0000 | **1.2100** | **1.3310** | **1.4641** |

전 상태는 **전 스테이지가 stage1보다 총량이 낮았다** — 스2만의 문제가 아니라 +10%/스테이지 사다리 전체가 무너져 있었다. 수정 후 표와 정확히 일치한다.

마리당 HP 배율 m: stage2 0.5671 → 0.6465, stage3 0.7468 → **1.0623**, stage4 1.0055 → **1.3230**.

E07 2배 불변식 복구: stage2에서 E01 5 / E07 **18**(3.6배) → E01 5 / E07 **10**(정확히 2배).

### 테스트 정본 정리 (`Enemies.test.jsx`)

이 영역 회귀 가드는 **HEAD에서 이미 레드로 방치**돼 있었고(8 failed / 87 passed), 원인은 테스트끼리 정본이 모순됐기 때문이다.

- `pins each stage total to anchor x its target factor` — 앵커를 웨이브 base로 잡아 stage1 자신의 비율이 1.599가 나왔다. **stage1 버스트가 0이어야만 통과하는 원리적 불가능 단언.** 앵커를 실전달 총량으로 정정.
- `lands stage2 ... 5330 ±3%` — 5330은 stage1 실전달 7004보다 **낮다**. 이 테스트가 사용자 신고한 역전을 그대로 명문화하고 있었다. 목표를 8475(= 7003.8 × 1.21)로 정정.
- `totalFor` 헬퍼 — `stageExpectedJarmobHp`의 손복제였고 호위 추격조 항이 빠진 채 굳어 정본 변경을 따라오지 않았다. 삭제하고 정본 export를 쓴다.

결과: **8 failed → 6 failed.** 밸런스 관련 3건 중 2건 그린.

## 2. 무기 위력 체인 — 19종 전수

### 수정

| 파일 | 내용 | 영향 |
|---|---|---|
| `store/useGameStore.js` | `Math.round(damage*10)/10` 양자화 제거 | `studentLantern 0.15→0.2`, `chibiko 1.25→1.3`이 사라짐. 랜턴은 공격력 패시브 만렙에도 위력이 **0% 오르지 않았다**(0.15×1.12=0.168 → 반올림 0.2 = 강화 전과 동일) |
| `lib/playerDpsEstimate.js` | `weaponOnTargetHits`에서 `projectileCount × count × strikeCount` 제거 | 셋 다 **다른 적으로 퍼지는** 능력인데 단일 대상 DPS에 곱하고 있었다 |
| `components/Weapons/StudentLantern.jsx` | 폴백 `?? 0.6` → `?? 0.15` | 카탈로그에서 이미 제거된 죽은 값이 컴포넌트에만 남아 있었다(×4) |
| `components/Weapons/Flask.jsx` | 폴백 `zoneTickDamage ?? 6` → `?? 1.5` | 카탈로그 실제값의 ×4 |
| `lib/weaponCatalog.js`, `lib/upgrades.js` | 랜턴 틱 주석·카드 문구를 "1초 3타" → "0.3초 10타" | 데이터(`hitIntervalMs: 300`)와 ×4.44 충돌. **구현·추정기 모두 데이터를 따르므로 문서를 고쳤다 — 동작 변경 0** |

### 실측

- **19종 전부 카탈로그 damage == 스토어 damage.** 전에는 2종 불일치.
- 만렙 근사 로드아웃 마틸다 HP: **365,755 → 194,139** (팽창 ×1.884). 무기별 과대계상은 pencilThrow ×4, tumbler ×3, starlink ×3, compassBlade ×3.
- 마틸다 HP는 `Enemies.jsx:1411`에서 실제로 쓰인다(죽은 코드 아님). HP = 추정DPS × 1800초이므로, 추정이 1.884배 부풀면 실제 전투 시간이 **30분 설계 → 약 56분**이 된다.
- 초기 로드아웃 마틸다 HP 8168.7은 전후 동일 — 레벨1에서는 퍼짐 스탯이 아직 1이라 차이가 안 난다.

### 신규 회귀 가드 (`lib/matildaSpec.test.js`)

- `projectileCount·count·strikeCount는 단일 대상 DPS를 바꾸지 않는다`
- `강화 없는 초기 무기 damage가 카탈로그 선언값과 정확히 같다`

## 3. 이상 없음 (검사하고 통과한 것)

`umbrellaGuard` 유형의 컴포넌트 하드코딩 재발 **0건** — 19종 전부 스토어 값을 읽는다. 업그레이드 카드가 가리키는 무기 id 오타 0, 죽은 stat 카드 0, damage 카드 이중 적용 0, 연필 관통 중복타격 차단 정상, 폭발 5종 크리 제외 배선 정상. 폴백 리터럴 16개 중 14개는 카탈로그와 일치(어긋난 2개만 수정).

## 4. 미해결 — 결정 필요

### (a) 스테이지2 20초 구간 부하 — 유일하게 남은 밸런스 레드

`never lets any stage2 20s window fall below 0.85x the stage1 load` : 0.643 → **0.782**. 개선했지만 기준 미달.

근본 원인은 **stage2 콘텐츠가 1.21 예산에 비해 2배 가까이 무겁다**는 것이다. 마리당 HP를 stage1 이상으로 올리려면(m ≥ 1):

- 필요 총량 = 웨이브 6594.7 + 버스트 5924 + 호위 1888 = **14406.7** → factor **2.06**
- 버스트를 0으로 지워도 웨이브+호위만 8482.7 > 예산 8474.6이라 **m ≥ 1이 불가능**

즉 "총 HP +21%"와 "좀비가 stage1만큼 단단함"은 현재 stage2 콘텐츠에서 **동시에 성립할 수 없다**. 셋 중 하나를 골라야 한다.

1. stage2 factor 1.21 → ~2.06 (좀비 단단해짐, 스테이지가 훨씬 어려워짐)
2. stage2 스폰 물량 대폭 감축 (적고 단단하게, 총량 유지)
3. 현행 유지 (많고 무른 물량 = 스테이지 정체성으로 수용)

### (b) 2차 데미지 필드가 성장에 무반응

`zoneTickDamage`(1.5), `lineCrossDamage`(14), `snapDamage`(30)이 무기 Lv5·might·영구강화 어디에도 반응하지 않는다. 레벨업·패시브가 전부 `damage` 하나만 건드린다. 결함이 아니라 미구현 설계라 이번 범위에서 제외했다.

### (c) 추정기가 bikittyCutter 사이클 규칙을 모름

`lib/bikittyCutter.js:77`에 정식 `bikittyCycleDps()`가 있는데 추정기가 안 쓴다(Lv1 8.438 vs 실측 11.494). `lineDraw.lineCrossDamage`도 누락. 마틸다 HP를 과소계상하는 방향이라 (a)와 함께 재조정하는 게 맞다.

## 5. 검증 근거

- `npx vitest run src/lib/matildaSpec.test.js src/components/Weapons src/lib/upgrades.test.js src/lib/weaponCatalog.test.js src/lib/gameplaySoak.test.js src/components/Enemies.test.jsx` → **258 passed / 8 failed**
- 남은 8건 내역: Enemies 5건(보스 시각 192 vs 173, 소스 문자열 매칭 2건, 마틸다 배선 — threemini 진행 중 영역) + 스2 20초 구간 1건(위 4-a) + Hanako·Bell 소스 문자열 2건(미수정 파일)
- `src/lib` 전체 28건 실패는 boss 시각·firebaseStudio·stageConfig 등 **다른 에이전트 미커밋 영역**. `Enemies.jsx`를 import하는 lib 모듈은 `gameplaySoak.js`·`stageBalanceProbe.js` 둘뿐이고 **둘 다 통과**한다.
- 측정은 임시 vitest 프로브로 수행 후 삭제(`__probe_stage2.test.jsx`, `__probe_weapons.test.js`). `stageBalanceProbe`는 기록된 비결정성 때문에 **사용하지 않았다.**
- 바이트 토글 기준선 측정은 시도했으나 소스 덮어쓰기라 차단됐다. 대신 의존 방향(누가 `Enemies.jsx`를 import하는가)으로 파급 범위를 한정했다.

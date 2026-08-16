# [balanceqa] 스테이지2 "연필이 더 세다" 제보 — 원인 규명 보고

- 작성: balanceqa (밸검미니)
- 일자: 2026-08-15
- 범위: 원인 규명·검증 전용. **코드 수정 없음, 커밋 없음.**
- 워크트리: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype` (공유 워크트리, checkout/stash/reset 미사용)

---

## 0. 결론 (한 줄)

**버그 맞다. 단, 연필이 세진 게 아니라 스테이지2 잡몹이 43% 물러진 것이다.**
스테이지2 잡몹(E01~E06) HP 배율 `m = 0.5671`이 적용되어, 스테이지1보다 **적 HP가 43% 낮다**. 연필 데미지는 전 스테이지 동일(2.4)이므로 처치 타수만 25~43% 줄어 "연필이 세졌다"로 체감된다.

---

## 1. 검증 환경과 결정성

- 측정 방법: 임시 vitest 파일을 만들어 `Enemies.jsx`의 정본 export(`STAGE_JARMOB_HP_MULTIPLIER`, `stageHpOverride`, `stageExpectedBaseJarmobHp`, `stageExpectedJarmobHp`, `stageBurstJarmobBaseHp`, `waveSizeForStageAtTime`, `midWaveSizeForStage`, `getRuntimeBurstEventsForStage`)를 직접 호출해 수치를 덤프. **측정 후 임시 파일 삭제 완료**(`git status`로 확인).
- **`stageBalanceProbe`는 일절 사용하지 않았다.** 프로젝트 기록된 비결정성(같은 시드에도 결과가 갈림)을 피하기 위해 순수 함수/모듈 상수만 읽었다.
- **결정성 확인**: 동일 측정을 3회 반복 실행 → 출력 md5 3개 전부 동일(`8aa4a9f56bff4949e4005ad0430a5f64`). 분산 0.
- 실행 명령:
  - `npx vitest run src/components/__balanceqa_tmp_stage2_pencil.test.jsx --maxWorkers=1 --no-file-parallelism` (3회)
  - `npx vitest run src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism`

### 워킹트리 주의 (판정에 미치는 영향: 없음)

측정 시점 `git status` 기준 **밸런스 경로 파일은 전부 HEAD와 동일(미커밋 변경 없음)**:
`Enemies.jsx`, `Enemy.jsx`(ENEMY_STATS), `waveTimelines.js`, `burstEvents.js`, `weaponCatalog.js`, `Pencil.jsx` — 모두 clean.
미커밋 상태인 파일은 `stageConfig.js`(threemini), `App.jsx`, `firebaseStudio.js`, `stageObjectPlacements.js`뿐이며, 이 중 어느 것도 잡몹 HP 정규화 경로(`getDefaultWavePhases` → `stageExpectedBaseJarmobHp` → `STAGE_JARMOB_HP_MULTIPLIER`)에 들어가지 않는다.
→ **아래 수치는 HEAD(`9a94d89`) 기준으로 그대로 유효하다.**

---

## 2. 세 가설 분리 판정

| 가설 | 판정 | 근거 |
|---|---|---|
| (a) 스테이지2에서 **연필 데미지가 올라간다** | **아니다 (기각)** | `weaponCatalog.js:26` `base: { damage: 2.4, cooldown: 550, pierce: 1, projectileCount: 1, ... }` 는 스테이지 무관. `Pencil.jsx` 전체 235줄에 `stage` 문자열 0회. `upgrades.js:68` `pencilPierce`도 레벨업 카드라 스테이지 무관. **실효 DPS 4.36 = 전 스테이지 동일.** |
| (b) 스테이지2에서 **적 HP가 내려간다** | **그렇다 (확정, 주원인)** | `STAGE_JARMOB_HP_MULTIPLIER.stage2 = 0.5671`. E01~E06 전 타입이 스테이지1 대비 HP 56.7%. 아래 3절 표. |
| (c) **관통(pierce)이 더 많은 적을 때린다** | **부분적, 부차적** | 기본 `pierce: 1` = 발당 1명(관통 없음). 레벨업 `pencilPierce`(cap 3)를 찍은 경우에만 다수 명중이 생기고, 스테이지2 실전달 잡몹 마릿수가 **323.6 vs 스1 242.4 (+33%)**라 밀집도가 높아 캡을 더 자주 채운다. 다만 이는 조건부·2차 효과이며 43% 타수 감소를 설명하지 못한다. |
| (d, 추가) **시야 차단이 적어 조준이 잘 걸린다** | **부차적** | `weaponTargeting.js:11-12`가 `stageId`로 `getStageObjectSightObstacles`를 읽는다. 실측 sight obstacle 수: **stage1=15, stage2=10, stage3=44, stage4=30**. 스2가 스1보다 시야 차단이 적어 타깃 획득이 더 안정적이다. 체감에 기여하나 주원인 아님. |

---

## 3. 현상 재현 — 연필 1발 기준 실효 TTK (실측)

연필 base damage **2.4**, cooldown 550ms, pierce 1 (크리 8%/×1.5는 스테이지 무관이라 제외).

| 타입 | base HP | stage1 HP (타수) | **stage2 HP (타수)** | stage3 | stage4 | 스2 타수 변화 |
|---|---|---|---|---|---|---|
| E01 | 8 | 8 (**4발**) | **5 (3발)** | 6 (3발) | 8 (4발) | **−25%** |
| E02 | 70 | 70 (**30발**) | **40 (17발)** | 52 (22발) | 70 (30발) | **−43%** |
| E03 | 10 | 10 (**5발**) | **6 (3발)** | 7 (3발) | 10 (5발) | **−40%** |
| E04 | 32 | 32 (**14발**) | **18 (8발)** | 24 (10발) | 32 (14발) | **−43%** |
| E05 | 70 | 70 (**30발**) | **40 (17발)** | 52 (22발) | 70 (30발) | **−43%** |
| E06 | 320 | 320 (**134발**) | **181 (76발)** | 239 (100발) | 322 (135발) | **−43%** |
| E07 | 16 | 16 (7발) | **18 (8발) ↑** | 19 (8발) | 21 (9발) | **+14% (역방향)** |

- 스테이지별 **마리당 평균 실전달 HP**: stage1 **27.7** → stage2 **20.2** (−27%) → stage3 33.8 → stage4 50.9.
- **E07(웃는얼굴 좀비)만 반대로 올라간다.** `JARMOB_HP_TYPES`(`Enemies.jsx:727`)가 `E01~E06`만 담고 있어 E07은 √c 정규화 대상이 아니고 `STAGE_HP_MULTIPLIER`(+10%/스테이지)를 탄다. E07은 스2에서 버스트로 20마리 등장한다 → **같은 화면에서 녹색좀비는 3발, 웃는좀비는 8발**이라는 어긋난 체감을 만든다.

이것이 제보의 실체다: 스테이지2에 들어가면 녹색좀비가 4발→3발, 탱커/원거리가 30발→17발, 14발→8발로 무너진다.

---

## 4. 난이도 역전 — 총량 실측 비교표

정본 목표(`STAGE_JARMOB_TOTAL_HP_FACTOR`, `Enemies.jsx:823-828`): 스1을 앵커로 **스2 = ×1.21**, 스3 = ×1.331, 스4 = ×1.4641.

| 항목 | stage1 | **stage2** | stage3 | stage4 |
|---|---|---|---|---|
| 웨이브 base(추정기) | 4379.8 | 6594.7 | 4500.4 | 4172.6 |
| 버스트 잡몹 base | 2336 | **5604** | 2768 | 2182 |
| 런크루 확정 HP | 0 | 0 | 1252 | 0 |
| 가드추격 확정 HP | 0 | 1888 | 0 | 0 |
| `m` (HP=밀도 배율) | 1 (앵커) | **0.5671** | 0.7468 | 1.0055 |
| **모델 추정 총량** | 6715.8 | **5299.5** | 5829.5 | 6412.4 |
| **런타임 실전달 잡몹 총 HP** | **6716** | **6528** | 4541 | 6368 |
| **실전달 / 스1** | 1.000 | **0.972** | 0.676 | 0.948 |
| **목표** | 1.000 | **1.210** | 1.331 | 1.464 |
| 실전달 잡몹 마릿수 | 242.4 | 323.6 | 134.3 | 125.2 |

**판정: 난이도 역전 수치로 성립한다.**
- 스2 실전달 잡몹 총 HP는 스1의 **0.972배** — 목표 1.21배 대비 **−20%**. 즉 스2가 스1보다 총량마저 (근소하게) 쉽다.
- 스3는 스1의 **0.676배**로 더 심하다. 스4도 0.948배. **스1~스4 전 구간이 단조 증가에 실패**했고, 실제 순서는 스1 ≳ 스2 > 스4 ≫ 스3다.

### 20초 구간별 부하(HP/s) — 스2/스1 비율

| 구간 | 0-20 | 20-40 | 40-60 | 60-80 | 80-100 | 100-120 | 120-140 | 140-160 | 160-180 | 180-200 | 200-220 | 220-240 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 스2/스1 | **0.643** | 1.551 | 4.246 | **0.305** | 3.086 | **0.376** | 1.748 | **0.480** | **0.687** | 1.048 | 2.188 | **0.367** |

12구간 중 **7구간에서 스2가 스1보다 낮다.** 특히 도입부(0~20s) 0.64, 60~80s 0.31, 100~120s 0.38 — "스2 들어가니 갑자기 쉬워졌다"는 체감과 정확히 일치한다.

---

## 5. 근본 원인 (기여도 순)

### 원인 1 (최대) — √c 블렌드가 "총 HP"만 고정하고 **마리당 HP 하한이 없다**

**`Developer/r3f_prototype/src/components/Enemies.jsx:839-851`** (m 파생) + **`:908-916`** (`stageHpOverride`)

```
const m = remaining > 0 ? (-b + Math.sqrt(b * b + 4 * a * remaining)) / (2 * a) : 0.5
STAGE_JARMOB_HP_MULTIPLIER[stageId] = m
STAGE_DENSITY_MULTIPLIER[stageId] = m
```

목표 총량은 고정인데 **버스트 항 `b`는 count가 리터럴이라 `m`의 1제곱으로만 들어가고 웨이브 항 `a`는 `m²`로 들어간다.** 스테이지2의 버스트 잡몹 base HP가 **5604 (스1의 2.4배)**로 불어나면서, 고정 예산을 맞추려 방정식이 웨이브 몫을 깎는다 → `m`이 1 밑으로 떨어진다. `m`은 HP 배율과 밀도 배율에 **동시에** 쓰이므로, 마리당 HP가 그대로 43% 내려간다.

반사실 실측(앵커 수정본 기준):

| 조건 | m | E01 HP (연필 타수) | E04 HP (타수) |
|---|---|---|---|
| 현재 코드 | **0.5671** | **5 (3발)** | **18 (8발)** |
| 앵커만 수정 | 0.7637 | 6 (3발) | 24 (10발) |
| **스2 버스트가 스1 수준(2336)이었다면** | **0.9470** | **8 (4발)** | **30 (13발)** |

→ **스테이지2 버스트 팽창이 단독으로 `m`을 0.947 → 0.567로 끌어내린 지배 인자다.** 버스트 구성 실측: `stage2` 21건/176마리, HP 내역 `{E02: 3500, E01: 680, E03: 270, E05: 770, E06: 320, E04: 64}` — **E02 탱커 3500이 절반 이상**. (`stage1`은 17건/82마리/2336.)

관련 커밋(버스트 팽창 흐름): `c7ba6fa` Add Stage 2 timed mixed reinforcements(count 15 ×4건 추가, 그중 E02 선언 2건), `7e09f5e` Add Stage 2 smiling zombie bursts, `c5c09ef` Speed every zombie up 10%, grow stage 1-2 spawns.

### 원인 2 (증폭) — 정규화 **앵커가 스테이지1 총량이 아니라 웨이브 base만** 읽는다

**`Developer/r3f_prototype/src/components/Enemies.jsx:836`**

```
const _jarmobHpAnchor = stageExpectedBaseJarmobHp('stage1')
```

- 바로 위 주석(`:816-818`, `:831`)은 **"앵커 = stage1 총량"**이라고 선언하는데, 실제 값은 **웨이브 base 4379.8**이다.
- 스테이지1의 실제 잡몹 총량은 **6715.8**(웨이브 4379.8 + 버스트 2336). **34.8%가 앵커에서 누락**된다.
- 결과: 스2~스4의 목표 총량이 전부 35% 낮게 잡힌다 → `m` 추가 하락(0.7637 → 0.5671) + 총량 역전.
- **부작용 경로**: 스테이지1에 버스트 보강을 추가하면(`923464c` Add-Stage-1-one-minute-zombie-reinforcement, `b47c0be`) 스1 실부하만 오르고 앵커는 그대로다 → 상위 스테이지 목표가 따라오지 못해 역전이 깊어진다. 이 구조 때문에 **"스1을 강화할수록 스2가 상대적으로 쉬워진다."**

### 원인 3 — `STAGE2_SPAWN_MULTIPLIER = 1.5`가 **런타임에만 적용되고 추정기에는 없다**

**`Enemies.jsx:510`** 정의 → **`:546-554` `waveSizeForStageAtTime`**, **`:608-613` `midWaveSizeForStage`**에서 곱해진다.
그런데 정규화 추정기 `stageExpectedBaseJarmobHp`(`:757-777`)는 `rawWaveSizeForStage`(`:538-542`) / `rawMidWaveSize`(`:601-605`)만 쓰는데 **이 둘에는 ×1.5가 없다**.

- 결과: 모델은 스2 총량을 5299.5로 보는데 실전달은 **6528 — 괴리 ×1.232**. 다른 스테이지 괴리는 1.000 / 0.779 / 0.993.
- 이 항목은 마리당 HP를 낮추지는 않는다(오히려 총량을 올려 역전을 *가린다*). 하지만 **정규화기와 회귀 가드가 스2 실부하의 23%를 못 본다**는 뜻이라, 앵커만 고쳐도 착지점이 예측과 어긋난다.

### 원인 4 — `stage2GuardChaseFixedHp`(1888)가 계산만 되고 **예산에서 차감되지 않는다**

**`Enemies.jsx:845`**

```
const remaining = _jarmobHpAnchor * factor - stageRunCrewFixedHp(stageId)
```

`stage2GuardChaseFixedHp`(`:806-814`)는 1888을 산출하지만 여기서 빠지지 않는다. `stageExpectedJarmobHp`(`:856-861`)와 `stageJarmobLoadWindows` 총량에도 안 들어간다. 스2에만 존재하는 1888 HP가 모델 밖에 있다.

### 원인 5 (모델 사각) — 버스트 `mixedTypes` 랜덤 구성이 모델링되지 않는다

`stageBurstJarmobBaseHp`(`:783-790`)는 `evt.type`(선언 타입)만 읽는다. 스2 버스트 다수가 `mixedTypes: ['E02','E03','E04','E05']` 등으로 런타임에 타입이 갈리므로, 실제 전달 HP는 모델값과 매 판 달라진다.

### 원인 6 — `E07`이 정규화 집합에서 빠져 반대 방향으로 움직인다

`JARMOB_HP_TYPES`(`:727`)에 E07 없음 → `STAGE_HP_MULTIPLIER`(+10%) 적용. 스2에서 E01은 8→5로 내려가는데 E07은 16→18로 올라간다. E01의 정확히 2배 스탯으로 설계된 형제 타입인데 스테이지 곡선이 반대다.

---

## 6. 이미 레드인 회귀 가드 (블로커)

**관찰이 아니라 블로커다.** 이 역전을 잡으라고 만든 회귀 테스트가 **현재 HEAD에서 이미 실패 중이며 방치돼 있다.**

`npx vitest run src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism` → **8 failed / 87 passed**

이번 건 직결 3건:

1. `jarmob expected total HP ... > pins each stage total to anchor x its target factor` (`Enemies.test.jsx:649`)
   `AssertionError: expected 1.533361714346322 to be close to 1` — **stage1조차 앵커 대비 1.533**. 원인 2(앵커 누락)의 직접 증거.
2. `... > keeps the delivered jarmob total strictly ascending at +10% per stage` (`Enemies.test.jsx:661`)
   `AssertionError: expected 5299.517989333333 to be greater than 6715.766933333333` — **난이도 역전의 직접 증거.**
3. `... > never lets any stage2 20s window fall below 0.85x the stage1 load before the boss window` (`Enemies.test.jsx:688`)
   `AssertionError: expected 0.6430248079426873 to be greater than or equal to 0.85` — 도입부 부하 붕괴.

나머지 5건(보스 버스트 시각 192 vs 173, 소스 문자열 매칭 3건, 마틸다 배선 1건)은 이번 건과 별개 이슈다.
※ 사전 고지된 `firebaseProgress` `vi.mock` 실패는 별건이며 본 보고의 발견에 포함하지 않는다.

---

## 7. 수정 방향 제안 (구현하지 않음, 최소 변경 우선)

우선순위 순. **각 단계마다 `Enemies.test.jsx` 3건이 그린으로 돌아오는지 확인해야 한다.**

### 제안 A (1줄, 최소) — 앵커를 스테이지1 실총량으로

`Enemies.jsx:836`
```
- const _jarmobHpAnchor = stageExpectedBaseJarmobHp('stage1')
+ const _jarmobHpAnchor = stageExpectedBaseJarmobHp('stage1') + stageBurstJarmobBaseHp('stage1')
```
(스1은 배율이 없어 `stageExpectedJarmobHp('stage1')`와 동일하지만, 순환 참조를 피하려면 위 형태가 안전하다.)
효과: 스2 `m` 0.5671 → **0.7637**, E01 5 → 6. 총량 역전은 해소되나 **마리당 HP는 여전히 스1 미만**이라 "연필이 더 세다"는 부분적으로만 사라진다.

### 제안 B (핵심) — 마리당 HP 배율에 하한 1.0을 건다

`Enemies.jsx:849` 부근에서 HP 배율과 밀도 배율을 분리:
```
STAGE_JARMOB_HP_MULTIPLIER[stageId] = Math.max(1, m)   // 마리당 HP는 절대 전 스테이지 밑으로 안 간다
STAGE_DENSITY_MULTIPLIER[stageId] = m * m / Math.max(1, m)  // 총량 보존은 밀도가 흡수
```
설계 의도(총량 균등 +10%)를 지키면서 **"상위 스테이지 좀비가 더 물러지는 일"만 구조적으로 금지**한다. 사용자 제보를 근본적으로 없애는 건 이 항목이다.
단, `m < 1`인 현재 스2/스3에서는 밀도가 크게 오르므로 `MAX_CONCURRENT_ZOMBIES`/스폰 드레인 상한 재검증 필요.

### 제안 C — 모델과 런타임을 일치시킨다

1. `rawWaveSizeForStage`(`:538`)·`rawMidWaveSize`(`:601`)에 `STAGE2_SPAWN_MULTIPLIER`를 포함시켜 추정기가 실전달을 보게 한다. (또는 반대로 ×1.5를 `STAGE_DENSITY_MULTIPLIER`에 흡수시켜 이중 경로 자체를 없앤다 — 이쪽이 더 깨끗하다.)
2. `Enemies.jsx:845` `remaining`에서 `stage2GuardChaseFixedHp(stageId)`도 차감.
3. `stageExpectedJarmobHp`/`stageJarmobLoadWindows`에 가드추격 항 추가.

### 제안 D — 버스트 팽창의 자동 반영

스테이지2 버스트 잡몹 base 5604(E02 3500 편중)가 지배 인자이므로, 버스트 표를 늘릴 때 `m`이 조용히 무너지지 않도록 **`m`에 하한을 두는 제안 B가 사실상 이 항목의 방어책**이다. 추가로 `stageBurstJarmobBaseHp`가 `mixedTypes` 기대값(풀 평균 HP)을 쓰도록 바꾸면 모델 정확도가 오른다.

### 제안 E — E07을 `JARMOB_HP_TYPES`에 편입

`Enemies.jsx:727`에 `'E07'` 추가. E01의 2배 스탯 형제인데 스테이지 곡선만 반대인 상태를 해소. (총량 모델의 `jarmobHpPerSpawn`도 함께 E07을 세게 되므로 `m` 재산출 영향 확인 필요.)

---

## 8. 라우팅 / 후속

- 본 건은 **난이도·웨이브 밸런스 구현 영역**이다. 실제 수정은 `levelmini`(웨이브·HP 곡선 구현)에 위임하고, 착지 후 **balanceqa 재검증**을 반드시 태울 것 (CLAUDE.md 도메인 라우팅 표: 밸런스·난이도·웨이브 구현은 구현 담당 + balanceqa 동반).
- 재검증 완료 기준(제안):
  1. `npx vitest run src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism` 에서 위 3건 그린.
  2. 실전달 잡몹 총 HP가 스1→스4 단조 증가하며 각 단계 ×1.10 ±1%.
  3. 마리당 HP(=`stageHpOverride`)가 어느 타입에서도 상위 스테이지에서 하위 스테이지보다 낮지 않음.
  4. 연필 base 2.4 기준 E01 처치 타수가 스2에서 스1 이상(4발 이상).
- **본 보고 시점 커밋 없음.** 임시 측정 파일은 삭제했고 워킹트리에 balanceqa가 만든 잔여물은 없다.

# 무기 19종 위력 전수 검수 — 선언값 → 실효 데미지 체인

작성: levelmini / 2026-08-15
범위: `WEAPON_CATALOG.base.damage` → `buildInitialWeapons` → 레벨업 카드 → 영구강화 → 컴포넌트 → 히트 처리 → `playerDpsEstimate`
성격: **검수·보고 전용. 코드 수정 없음. 커밋 없음.**
직전 커밋 `f25ee27`에서 닫은 카탈로그 결함 6건은 본 문서 범위에서 제외한다.

## 실행한 검증

| 명령 | 결과 |
|---|---|
| 카탈로그 스탯키 vs 컴포넌트 참조키 대조 스크립트 (scratchpad `statXref.mjs`) | 미참조 키 9건 → 전수 추적 결과 전부 `lib/` 헬퍼에서 소비됨(오탐), 실결함 0 |
| 폴백 리터럴 vs 카탈로그값 대조 스크립트 (scratchpad `fallbackXref.mjs`) | 불일치 8건 검출 (실질 7건) |
| 임시 vitest 프로브 (`src/store/__levelminiWeaponAudit.test.js`, 실행 후 삭제) | 선언/스토어 damage 표, 카드 누적, DPS 내역, might 양자화 실측 |
| `npx vitest run src/lib/weaponCatalog.test.js src/lib/weaponPermanentUpgrades.test.js src/lib/bikittyCutter.test.js src/lib/lineDraw.test.js src/components/Weapons` | 24 파일 161건 **전량 통과** |

마지막 줄이 중요하다. **아래 결함은 단 한 건도 기존 테스트에 덮여 있지 않다.**

## 1. 선언 damage → 실효 damage 표 (might 0, 영구강화 0)

| # | 무기 | 선언 | 스토어 실효 | 일치 | 배율 |
|---|---|---|---|---|---|
| 1 | pencilThrow 연필 | 2.4 | 2.4 | O | |
| 2 | schoolBag 30cm 자 | 12 | 12 | O | |
| 3 | boxCutter 커터칼 | 24 | 24 | O | |
| 4 | tumbler 텀블러 | 6 | 6 | O | |
| 5 | scienceFlask 과학 플라스크 | 7.5 | 7.5 | O | |
| 6 | bell 벨 | 10 | 10 | O | |
| 7 | stunGun 전기 | 18 | 18 | O | |
| 8 | onigiri 오니기리 | 21 | 21 | O | |
| 9 | **chibiko 치비코** | **1.25** | **1.3** | **X** | **×1.040** |
| 10 | hanako 하나코 | (없음) | 0 | O | 힐 전용, 정상 |
| 11 | guidedMissile 보조배터리 미사일 | 16 | 16 | O | |
| 12 | sharkMissile 상어미사일 | 20.8 | 20.8 | O | |
| 13 | starlink 고장난 스타링크 | 28 | 28 | O | |
| 14 | compassBlade 오리요강 | 7 | 7 | O | |
| 15 | umbrellaGuard 우산 방어막 | 12 | 12 | O | |
| 16 | eraserBomb 지우개 폭탄 | 26 | 26 | O | |
| 17 | **studentLantern 학생용 랜턴** | **0.15** | **0.2** | **X** | **×1.333** |
| 18 | bikittyCutter 바이키티 커터칼 | 18 | 18 | O | |
| 19 | lineDraw 선긋기 | 20 | 20 | O | |

17/19 일치. 불일치 2건은 §2-2의 반올림 결함.

## 2. 결함 목록 (심각도 순)

### S1-1. `playerDpsEstimate`의 다중타격 계수가 **세 항목 전부** 틀렸다 → 마틸다 HP 최대 ×5 부풀림

`src/lib/playerDpsEstimate.js:69-74`

```js
export function weaponOnTargetHits(weapon) {
  return positiveNumber(weapon.projectileCount, 1)
    * positiveNumber(weapon.count, 1)
    * positiveNumber(weapon.strikeCount, 1)
}
```

주석은 "단일 대상에 겹쳐 들어가는 다중 타격"이라 적혀 있으나, 세 스탯 모두 **서로 다른 적에게 퍼지는** 능력이다. 단일 대상에는 어느 것도 겹치지 않는다.

| 스탯 | 무기 | 실제 구현 | 단일 대상 실효 | 추정기 최대 배수 | 과대평가 |
|---|---|---|---|---|---|
| `projectileCount` | 연필 | `Pencil.jsx:178` `scanClosestEnemiesInto(scratch, range, count)` — 서로 다른 적 count명을 잡아 1명당 1발 | ×1 | 카드 cap 4 + 영구 Lv10 +1 = **5** | **×5** |
| `count` | 텀블러 | `Tumbler.jsx:83,108` — `scanOrbitEnemiesInto`가 적별 첫 궤도체에서 `break`(`weaponTargeting.js:349`), 이후 적별 `lastHitRef.times[index]` 인터벌 게이트 | ×1 | 카드 cap 3 + 영구 Lv10 +1 = **4** | **×4** |
| `count` | 오리요강 | `CompassBlade.jsx:331,357` — 동일 구조 | ×1 | 카드 cap **3** | **×3** |
| `strikeCount` | 스타링크 | `Starlink.jsx:274` `pickStrikeTargets` — 후보(서로 다른 적 위치) 셔플 후 N개 슬라이스. 단일 대상이면 후보 1개 | ×1 | 카드 cap **3** | **×3** |

궤도 무기가 결정적이다. 궤도체를 3개로 늘려도 **한 적이 받는 타격률은 `hitsPerSecond`(2.5/s)로 고정**된다. 궤도체 수는 커버리지만 늘린다. 추정기는 이를 DPS 3~4배로 계산한다.

실제 게임 영향: `matildaHpFromWeapons = estimatePlayerDps × 1800`(playerDpsEstimate.js:96-98). 이 4종을 만렙으로 갖춘 빌드에서 해당 무기 기여분이 3~5배로 계산되어, **"쉬지 않고 30분" 설계가 실제로는 90~150분짜리 HP**가 된다. 밸런스 판단이 아니라 게임이 성립하지 않는 수준의 이탈이다.

### S1-2. `buildInitialWeapons`의 1자리 반올림이 소수 damage 무기를 왜곡

`src/store/useGameStore.js:79` — `damage: Math.round(baseDamage * mightMult * 10) / 10`
(`src/lib/weaponPermanentUpgrades.js:228`도 동일한 1자리 반올림)

- **studentLantern**: 0.15 → `Math.round(1.5)/10` = **0.2** (×1.333)
- **chibiko**: 1.25 → `Math.round(12.5)/10` = **1.3** (×1.040)

JS `Math.round`는 .5를 올림하므로 두 값 모두 정확히 경계에 걸린다.

파생 결과 — 공격력 패시브(`might`, 4%/lv, `passiveCatalog.js:38-46` maxLevel 3)가 먹힌다:

| 무기 | base | might0 | might1 | might2 | might3 | Lv3 실효 | 의도 |
|---|---|---|---|---|---|---|---|
| **studentLantern** | 0.15 | 0.2 | 0.2 | 0.2 | 0.2 | **+0.0%** | +12% |
| **chibiko** | 1.25 | 1.3 | 1.3 | 1.4 | 1.4 | **+7.7%** | +12% |
| (나머지 16종) | — | — | — | — | — | +11.4 ~ +12.5% | +12% |

**랜턴은 공격력 패시브를 3레벨까지 다 찍어도 위력이 1도 오르지 않는다.** 0.15×1.12 = 0.168 → 여전히 0.2. 상점에서 돈을 쓴 효과가 완전히 소실된다.

### S1-3. studentLantern 틱 간격 — 데이터와 문서가 정면으로 다르다 (×4.44)

| 출처 | 주장 |
|---|---|
| `weaponCatalog.js:189` 주석 | "durationMs 1레벨 3초 → **3타** (점등 즉시 1타 + 이후 **1초 간격**)" |
| `upgrades.js:119` 주석 | "레벨업마다 지속 +1초 = 타격 +1회 (**초당 1타**)" |
| `weaponCatalog.js:195` 데이터 | `hitIntervalMs: 300` |
| `StudentLantern.jsx:154,195` 구현 | `const intervalMs = w.hitIntervalMs ?? 300` — 데이터를 그대로 사용 |

실제: 3초 점등 = **10틱**. 사이클 피해 10 × 0.2 = **2.0**
문서 설계: 3틱 × 0.15 = **0.45**
→ **×4.44**

`playerDpsEstimate.weaponHitsPerSecond`(playerDpsEstimate.js:61-63)는 데이터 편(300ms)이라 추정기와 구현은 일치한다. 즉 **틀린 것은 문서이거나 데이터이지 구현이 아니다.** 어느 쪽이 정본인지 결정이 필요하다. 카드 문구가 "레벨업마다 타격 +1회"인데 실제로는 +3.3회이므로, 플레이어에게 표시되는 약속과도 어긋난다.

### S2-1. 추정기가 bikittyCutter 사이클 규칙을 모른다 (21~27% 과소평가)

`lib/bikittyCutter.js:77`에 이미 정식 계산식 `bikittyCycleDps()`가 있는데 `playerDpsEstimate`가 쓰지 않는다. 추정기는 `damage × 1000/cooldown`만 계산해 `segmentDamageStep`(단수당 +12% 가산)·`snapDamage`(30)·`reloadMs`(1200)를 전부 누락한다.

| 레벨 | damage | 추정기 | `bikittyCycleDps` 실측 | 비율 |
|---|---|---|---|---|
| Lv1 | 18 | 8.438 | 11.494 | 0.734 |
| Lv5 | 34 | 15.938 | 20.404 | 0.781 |

(사이클: Lv1 234.48 피해 / 20400ms — 카탈로그 주석의 검산값과 정확히 일치)

`lineDraw`의 `lineCrossDamage`(14)도 같은 성격으로 빠져 있다. `playerDpsEstimate.js:20-26`의 "의도적으로 제외하는 것" 목록에는 pierce/chain/bounce/플라스크 존만 적혀 있고 이 둘은 언급조차 없다 — 문서화되지 않은 누락이다.

### S2-2. 2차 데미지 필드가 어떤 성장에도 반응하지 않는다

| 무기 | 2차 필드 | base | 무기 Lv5 후 | 같은 구간 주 damage |
|---|---|---|---|---|
| scienceFlask | `zoneTickDamage` | 1.5 | **1.5** | 7.5 → 23.5 |
| lineDraw | `lineCrossDamage` | 14 | **14** | 20 → 40 |
| bikittyCutter | `snapDamage` | 30 | **30** | 18 → 34 |

- 레벨업 카드: `upgrades.js:156` `kind:'damage'`는 `wpn.damage`만 더한다.
- might 패시브: `useGameStore.js:79` `damage`만 곱한다.
- 영구강화: `weaponPermanentUpgrades.js:228` `out.damage`만 곱한다. (플라스크는 `'틱 피해'` 요약을 찾는 분기가 `:256`에 있으나, `scienceFlask` 플랜 어느 레벨에도 `'틱 피해'` 문구가 없어 영구 사문화)
- 치비코 전 무기 보너스: `upgrades.js:13-18` `CHIBIKO_INCREASE_STATS`에 셋 다 없다.

결과적으로 플라스크 웅덩이·선긋기 절단선·바이키티 산탄은 런이 진행될수록 기여도가 상대적으로 소멸한다. 특히 바이키티는 `snapDamage` 30이 사이클 피해의 12.8%(Lv1)를 차지하는 설계 요소인데 Lv5에서 7.2%로 내려앉는다.

### S2-3. 죽은/틀린 폴백 리터럴 7건

현재는 `buildInitialWeapons`가 base를 통째로 spread하므로 **도달 불가(latent)**. 다만 값이 하나라도 `undefined`가 되는 순간 조용히 다른 수치로 도는 지뢰다.

| 위치 | 코드 | 카탈로그 | 발동 시 배율 |
|---|---|---|---|
| `StudentLantern.jsx:200` | `damage ?? 0.6` | 0.15 | **×4.0** |
| `Flask.jsx:251` | `zoneTickDamage ?? 6` | 1.5 | **×4.0** |
| `Onigiri.jsx:245` | `bounces ?? 2` | 6 | ×0.33 |
| `SchoolBag.jsx:67` | `triggerRange ?? 0.387` | 1.0 | ×0.39 |
| `SchoolBag.jsx:94` | `swingMs ?? 420` | 260 | ×1.62 |
| `BoxCutter.jsx:222` | `range ?? 1.275` | 1.4 | ×0.91 |
| `BoxCutter.jsx:249` | `range ?? 1.275` | 1.4 | ×0.91 |

첫 줄이 특히 나쁘다. **커밋 `f25ee27`이 카탈로그에서 "죽은 값"이라고 지운 0.6이, 컴포넌트 폴백으로 그대로 살아남아 있다.** 결함 정리가 절반만 된 상태다.

(`lib/sharkMissileRuntime.js:51` `cooldown ?? 0`도 스캔에 걸렸으나 0으로 나누기 방지 가드라 정상.)

### S3-1. 플라스크 크리 카드가 착탄 피해에는 먹지 않는다

- 카탈로그 `scienceFlask.base.critChance: 0.03`, `flaskCrit` 카드는 `chanceCap: 0.19`까지 올린다.
- 그런데 `Flask.jsx:217`은 착탄 폭발에 `canCrit:false, damageType:'explosive'`를 준다 → 착탄 7.5에 크리 미적용.
- 크리가 실제로 적용되는 곳은 웅덩이 틱(`Flask.jsx:136`, 피해 1.5)뿐이다.

카드가 약속하는 대상과 실제 적용 대상이 다르다. 추정기는 착탄 7.5에 기대 크리 1.015를 곱하므로 약 1.5% 추가 과대평가.

## 3. 이상 없음 — 검사하고 통과한 항목

- **선언 damage → 스토어 damage**: 19종 중 17종 완전 일치(§1 표).
- **`UPGRADE_EFFECTS`의 무기 id**: 전 카드 실존. 오타 0건.
- **stat 카드 17종**: 대상 stat이 전부 base에 실존하고 cap이 base보다 크다. **죽은 카드 0건.** `bikittyCutterRange`가 가리키는 `segmentRangeStep`은 `lib/bikittyCutter.js:41`에서 실제 소비된다(교차검증 스크립트의 초기 오탐을 추적해 확인).
- **같은 무기·같은 스탯 이중 적용**: `scienceFlask.zoneDurationMs`를 3장(`flaskDamage`/`flaskRadius`/`flaskCrit`)이 공유하나, "모든 플라스크 레벨업은 존 +1초"라는 명시 설계(`upgrades.js:83-84`)라 **정상**. 그 외 이중 적용 0건.
- **damage 카드 누적**: 16종 전부 합연산으로 정상 누적, 4회 적용 후 `level` 5 도달, 곱연산 혼입 없음.
- **관통 중복타격**: `Pencil.jsx:77-79`가 `hitIndices`/`hitGenerations`/`hitSpecial` 3중 키로 같은 적 재타격을 차단. 같은 프레임 중복 0.
- **궤도 무기 프레임 중복타격**: `weaponTargeting.js:349`의 `break` + 적별 인터벌 게이트로 차단.
- **`BoxCutter`의 slashCount 반복 타격**(`BoxCutter.jsx:231-234`): 영구강화 Lv10 "추가 절단" 퍽의 의도된 동작. 결함 아님.
- **폭발 계열 크리 제외**: `Missile.jsx:275`, `SharkMissile.jsx:281`, `UmbrellaGuard.jsx:176`, `Flask.jsx:217`, `eraserBombImpact.js:13` 전부 `canCrit:false` + `damageType:'explosive'`로 정상 배선.
- **컴포넌트의 카탈로그 무시 하드코딩**(umbrellaGuard knockback 유형의 재발): **추가 발견 0건.** 담당 컴포넌트 19종 전부 스토어 무기 객체를 읽고 있다. §S2-3의 폴백은 하드코딩이 아니라 폴백이며 현재 도달 불가다.
- **기존 무기 테스트**: 24 파일 161건 전량 통과.

## 4. Balance_QA_Mini(balanceqa) 핸드오프

수정 브리프는 Advisor가 별도로 낸다. 수정이 들어갈 경우 아래를 acceptance로 잡을 것을 권한다.

1. **S1-1 수정 후 회귀**: `weaponOnTargetHits`를 1로 고정하거나 무기별 실효식으로 교체했을 때, 마틸다 HP가 실제 전투 시간 30분 ±10%에 들어오는지 실측. 무기 구성 최소 3종(궤도 중심 / 투사체 중심 / 혼합)으로 통제 비교. `stageBalanceProbe`는 같은 시드로도 결과가 갈리므로 반드시 통제 비교로만 판정.
2. **S1-2 수정 후 회귀**: 반올림 정밀도를 올릴 경우 `weaponPermanentUpgrades.test.js`의 기대값 다수(예: `damage: 24.1`)가 함께 움직인다. 19종 전부의 might 0~3 실효 증가율이 +12% ±1%에 들어오는지 표로 재확인.
3. **S1-3은 밸런스 결정이 선행**: 300ms를 정본으로 채택하면 카탈로그·카드 주석을 고치고 랜턴 DPS를 재평가해야 하고, 1000ms를 채택하면 랜턴이 현재의 1/3.3로 약화되어 해금 가치 재검토가 필요하다. **구현 수정 전에 기획 결정부터.**
4. **S2-3은 무동작 확인이 acceptance**: 폴백 리터럴을 카탈로그값으로 맞추는 수정은 현재 도달 불가 경로이므로 게임 동작이 **변하지 않아야** 정상이다. 동작이 변하면 어딘가에서 실제로 undefined가 흐르고 있다는 뜻이므로 그 경로를 먼저 찾아야 한다.
5. 위 결함은 기존 161건 테스트에 전혀 걸리지 않았다. 수정 시 회귀 테스트 신설이 필수다.

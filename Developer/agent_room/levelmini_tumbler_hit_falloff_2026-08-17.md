# 텀블러 연속 타격 감쇠 구현 리포트 (levelmini, 2026-08-17)

브랜치 `zombie_only` / 워크트리 `D:/JungSil/2.Minigame_project/school_survivor-integration` / 앱 루트 `Developer/r3f_prototype`.
**커밋하지 않았다.** Advisor 검증 후 커밋 대상이다.

## 1. 확정 사양

사용자 확정(정정본 반영). 텀블러가 **때린 순서대로** 위력이 10%씩 깎이고 **5타 주기**로 100%에 복귀한다.

| 타격 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| 배율 | 1.00 | 0.90 | 0.80 | 0.70 | 0.60 | **1.00** | 0.90 | 0.80 |

- 0-based 순번 n → `1 - 0.1 * (n % 5)`. 0.50은 쓰지 않는다(바닥은 0.60).
- 주기 평균 = (1.0+0.9+0.8+0.7+0.6)/5 = **0.80**.
- **카운터는 텀블러 전역이다.** 어느 적을 때렸는지 무관 — 적 A를 3번 때린 뒤 적 B를 때리면 B는 4타째(0.70)다.
  의도: 밀집 좀비를 훑을 때 "다다다닥 하며 위력이 점점 내려가는" 손맛.
- **시간 경과 회복 없음.** 순수 순환이라 "잠깐 떨어졌다 다시 붙기"가 최적 플레이가 되지 않는다.
- `hitsPerSecond`(2.5)와 `base.damage`(6)는 건드리지 않았다. 타격 구조만 바꾼 조정이다.

## 2. 변경 파일 (6개, 신규 2 / 수정 4)

| 경로 | 내용 |
|---|---|
| `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/lib/tumblerFalloff.js` | **신규.** 감쇠 정본. `TUMBLER_FALLOFF_CYCLE=5`, `tumblerHitMultiplier(n)`, `TUMBLER_SUSTAINED_MULTIPLIER`(주기에서 파생, 0.8) |
| `.../src/components/Weapons/Tumbler.jsx` | `hitSeqRef` 1개 추가, 피해 적용점에 배율 곱, 유효타에만 카운터 증가 |
| `.../src/lib/weaponCatalog.js` | `tumbler.base.sustainedDamageMultiplier = TUMBLER_SUSTAINED_MULTIPLIER` 추가 |
| `.../src/lib/playerDpsEstimate.js` | `sustainedDamageMultiplier(weapon)` 헬퍼 추가, primary DPS에 곱 |
| `.../src/lib/tumblerFalloff.test.js` | **신규.** 배율 수열·카탈로그·추정기 통합 검증 |
| `.../src/components/Weapons/Tumbler.test.jsx` | 프로덕션 프레임 루프 실행 테스트 5건 추가(기존 4건 유지) |

### 런타임 핵심 (Tumbler.jsx)

```js
// 연속 타격 감쇠: 5타 주기로 1.00 → 0.60 → 다시 1.00 (lib/tumblerFalloff.js).
const falloffDamage = w.damage * tumblerHitMultiplier(hitSeqRef.current)
if (!applyEnemyHit(rb, generation, falloffDamage, impact)) continue
hitSeqRef.current += 1
```

- `applyEnemyHit`이 false면 `continue`가 먼저 걸려 카운터가 오르지 않는다 — 실제로 안 맞은 타격은 세지 않는다.
- 적별 `times[index]` / `specialTimes[slot]` 게이트와 `generation` 리셋(102~105행)은 **손대지 않았다.** 그건 타격률 게이트지 감쇠와 무관하다.
- `counts` / `specialCounts` 배열은 추가하지 않았다. 전역 카운터라 ref 하나면 충분하다.

### 추정기 배선 (하드코딩 회피)

무기별 `if (id === 'tumbler')` 대신 카탈로그 필드로 뺐다. `buildInitialWeapons`가 `...permanentBase`로 base를 통째로 스프레드하므로 런타임 무기 객체까지 그대로 흘러간다. `applySafeNumericPermanentEffects`는 명시적 prop 화이트리스트만 스케일하므로 새 필드가 영구강화에 오염되지 않는다. `gameplaySoak.js:210`의 수치 필드 검사도 유한수라 통과한다(확인 완료).

## 3. 텀블러 지속 DPS 실측

**측정 방법**: 신규 테스트 `src/lib/tumblerFalloff.test.js`에서 프로덕션 `estimateWeaponDps()`를 카탈로그 값으로 직접 호출해 assert했다(전부 통과). 손계산이 아니라 프로덕션 함수 출력이다.

| 구간 | 감쇠 전 | **감쇠 후** | 스탯 근거 |
|---|---|---|---|
| Lv1 | 15.30 | **12.24** | damage 6 × 2.5/s × crit 1.02 |
| 도달 최대(Lv5) | 30.64 | **24.51** | damage 11.4 × 2.5/s × crit 1.075 |

- 최대 레벨 = `MAX_WEAPON_LEVEL` 5. acquire 이후 카드 4장 전부(`tumblerDamage`+2.7 / `tumblerPower`+2.7 / `tumblerCount` 1→2 / `tumblerCrit` chance 0.04→0.06, mult 1.5→2.25).
- `count`는 추정기에 영향 없다(`weaponOnTargetHits`가 1 고정 — 궤도체를 늘려도 한 적이 받는 타격률은 `hitsPerSecond`로 고정).
- might 패시브·영구강화 미적용 카탈로그 기준값이다.
- 정확히 0.80배임을 별도 assert로 고정했다.

**마틸다 HP 영향**: 마틸다 HP = 스폰 시점 플레이어 DPS × 1800초(`Enemies.jsx:1411`). 텀블러 기여분이 이제 25% 과대계상되지 않으므로, 텀블러 보유 시 마틸다 HP가 그만큼 내려간다. 텀블러 단독 최대 레벨 기준 파생 HP는 55,148 → **44,118**.

## 4. 테스트 대조

명령: `npx vitest run src/lib src/components/Weapons --maxWorkers=1 --no-file-parallelism`

| | Test Files | Tests |
|---|---|---|
| **변경 전 baseline** | 9 failed / 117 passed (126) | 14 failed / 1102 passed (1116) |
| **변경 후** | 9 failed / 118 passed (127) | 14 failed / **1116** passed (1130) |

**신규 실패 0건.** 실패 14건의 테스트 이름이 baseline과 완전히 동일하다:

- `enemySimulation.parity.test.js` × 2 (hp / scale 패리티)
- `firebaseProgress.test.js` × 1, `firebaseStudio.test.js` × 2, `graphicsStudioConfig.test.js` × 2, `stagePropPlacements.test.js` × 1, `projectAdminRules.test.js` × 1 (firebase fail-closed 계열)
- `studentProximity.test.js` × 2, `waveTimelines.test.js` × 2, `Weapons/Hanako.test.jsx` × 1

전부 내 변경과 무관한 기존 실패다. 통과 수가 정확히 +14 = 내가 추가한 테스트 수(lib 9 + Weapons 5)다.

주의: 두 실행 사이에 다른 에이전트의 `CompassBlade` 계열 미커밋 변경이 워킹트리에 들어왔다. 실패 집합이 양쪽 동일하므로 대조는 성립하지만, 완전 통제 비교는 아니다.

### 추가한 검증 (14건)

프레임 루프 테스트는 소스 문자열 대조가 아니라 **`Tumbler.jsx`의 `usePlayingFrame` 본문을 그대로 떼어내 실행**한다(`StunGunNearestTargetRegression.test.jsx`와 같은 방식). `applyEnemyHit`에 실제로 넘어가는 피해값을 관측하므로 배율이 진짜로 꽂히는지 고정된다.

1. 한 적 연속 7타 → `[1.0, 0.9, 0.8, 0.7, 0.6, 1.0, 0.9]`
2. **전역 카운터**: A 3타 후 B 첫 타격이 0.70
3. 같은 프레임 3적 동시 타격도 순서대로 1.0 / 0.9 / 0.8
4. `applyEnemyHit` false는 카운터를 올리지 않음(2회 실패 후 첫 유효타가 1.0)
5. 30초 공백 후에도 이어짐(시간 기반 리셋 없음)
6. 주기 평균 0.80 = 카탈로그 필드 = 추정기 입력 일치
7. 다른 18종 무기에 `sustainedDamageMultiplier`가 없음(보정 1배)

임시 프로브는 만들지 않았다. `git status`에 내 산출물은 위 6개 파일뿐이다(나머지 `Enemies.test.jsx`, `burstEvents.test.js`, `CompassBlade*`, `compassBlade.js`, `Planner/*`는 타 에이전트 것이라 그대로 뒀다).

## 5. 밸런스 판정 — balanceqa 핸드오프

**핵심 정정: 이 변경은 "단일 대상만 깎는 조정"이 아니다.**

앞선 브리프의 밸런스 근거는 "잡몹은 주기가 돌기 전에 죽으니 물량 처리력은 거의 그대로, 보스·정예 지속 화력만 깎는다"였다. 그건 **적별 카운터**였을 때의 이야기다. 사용자 확정 사양인 **전역 카운터**에서는 다르다:

- 카운터가 리셋되지 않고 계속 도므로, 텀블러가 내보내는 **모든 피해**의 장기 평균 배율이 정확히 **0.80**이다.
- 밀집 상황에서 좀비 개개인이 받는 첫 타격의 위상은 0.6~1.0에 균일 분포한다. 즉 **물량 처리력도 똑같이 80%로 내려간다.**
- 결과적으로 텀블러 총 출력이 전 구간 일률 −20%다. 사실상 `base.damage` 6 → 4.8과 산술적으로 등가이되, "다다다닥 위력이 내려가는" 체감이 붙는다.

**주력 15종 내 순위 영향** (Lv1 단일 대상 기준, 직전 커밋 `ad54c4f` 감사표 대비):

- 텀블러 15.30 → 12.24. 1위 자리는 유지되지만 2위권과의 격차가 크게 좁는다.
- 최하위 벨(3.20) 대비 배수 4.8배 → **3.8배**로 축소. balanceqa가 지목했던 상하위 격차 문제가 실제로 완화된다.

**검증 요청 항목**:

1. 스테이지1~4 실플레이에서 텀블러 물량 처리 체감이 −20%를 견디는지(특히 텀블러가 주력인 초반 빌드의 Lv2~3 구간). 필요하면 `base.damage`를 6 → 6.5~7로 되올려 **의도한 순감쇠폭만** 남기는 재조정을 검토해야 한다 — 다만 그건 사용자 확정 범위 밖이라 별도 승인 필요.
2. 마틸다 전투 길이. 텀블러 보유 빌드에서 파생 HP가 20% 내려갔으므로 "30분 컷" 목표에 오히려 근접했을 가능성이 높다. `stageBalanceProbe`는 기록된 비결정성이 있으므로 단일 실행을 근거로 쓰지 말 것 — 통제 비교(같은 시드 다회 실행) 필요.
3. 좀비 처치 타이밍이 위상에 따라 갈리는 문제. 같은 좀비가 어떤 때는 3타, 어떤 때는 4타에 죽는다. 이건 사양상 의도된 변동이지 버그가 아니지만, 체감 일관성 리뷰가 필요하다.

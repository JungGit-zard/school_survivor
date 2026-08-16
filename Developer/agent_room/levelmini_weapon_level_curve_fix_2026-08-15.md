# 무기 레벨 곡선 수정 결과 (2026-08-15)

선행 조사: `Developer/agent_room/weapon_level_curve_audit_2026-08-15.md`
커밋하지 않았다. Advisor 검증 후 pathspec 커밋 대상.

## 측정 방법 (전/후 동일)

고정 가상 좀비 1마리, HP 100, 저항 없음. `WEAPON_CATALOG → applyUpgradeToWeapon →
estimateWeaponDps` 체인을 직접 호출하는 임시 vitest 프로브로 측정하고, 측정 후 프로브를
삭제한 뒤 `git status`로 잔여물 없음을 확인했다. `stageBalanceProbe`는 쓰지 않았다.

**정본 경로** = 선언 순서대로 서로 다른 카드를 한 장씩, `MAX_WEAPON_LEVEL`(5)에 도달하면 중단.
선행 조사와 같은 경로이며, 여기에 레벨 상한만 추가했다(연필이 카드 5장이 되면서 처음 걸린다).
"전" 수치는 옛 카드/옛 base/옛 추정기를 프로브 안에서 복원해 같은 실행에서 뽑았다.

## 1. 19종 × 레벨별 단일 대상 DPS (전 → 후)

| 무기 | 적용카드 | 도달Lv | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | 성장 전 | 성장 후 |
|---|---|---|---|---|---|---|---|---|---|
| pencilThrow | 4→4 | 5→5 | 4.54 → 4.54 | 5.96 → 6.81 | 5.96 → 9.08 | 5.96 → 9.08 | 6.44 → 9.08 | 1.42x | **2.00x** |
| schoolBag | 3→4 | 4→5 | 9.55 → 9.55 | 13.53 → 13.69 | 13.53 → 17.83 | 14.55 → 17.83 | – → 19.17 | 1.52x | **2.01x** |
| boxCutter | 3→4 | 4→5 | 8.31 → 8.31 | 10.04 → 11.15 | 10.04 → 13.98 | 11.93 → 13.98 | – → 16.63 | 1.44x | **2.00x** |
| tumbler | 3→4 | 4→5 | 15.30 → 15.30 | 15.30 → 22.18 | 20.40 → 29.07 | 21.50 → 29.07 | – → 30.64 | 1.41x | **2.00x** |
| scienceFlask | 3→4 | 4→5 | 0.91 → 1.81 | 1.39 → 2.55 | 1.39 → 3.29 | 1.45 → 3.47 | – → 3.63 | 1.61x | **2.00x** |
| bell | 2→3 | 3→4 | 2.28 → 3.20 | 3.19 → 4.61 | 3.38 → 6.02 | – → 6.39 | | 1.49x | **1.99x** |
| stunGun | 3→4 | 4→5 | 6.18 → 6.18 | 7.90 → 8.89 | 7.90 → 11.60 | 8.43 → 11.60 | – → 12.39 | 1.36x | **2.01x** |
| onigiri | 3→4 | 4→5 | 4.37 → 4.37 | 5.72 → 6.22 | 5.72 → 8.07 | 6.19 → 8.07 | – → 8.73 | 1.42x | **2.00x** |
| guidedMissile | 2→3 | 3→4 | 4.00 → 4.00 | 5.50 → 6.00 | 5.50 → 8.00 | – → 8.00 | | 1.38x | **2.00x** |
| sharkMissile | 2→3 | 3→4 | 2.97 → 4.95 | 4.40 → 7.43 | 4.40 → 9.90 | – → 9.90 | | 1.48x | **2.00x** |
| starlink | 3→4 | 4→5 | 7.63 → 7.63 | 10.35 → 10.89 | 10.35 → 14.16 | 11.13 → 14.16 | – → 15.22 | 1.46x | **2.00x** |
| compassBlade | 3→4 | 4→5 | 17.94 → 14.35 | 23.06 → 20.70 | 23.06 → 27.06 | 24.47 → 27.06 | – → 28.71 | 1.36x | **2.00x** |
| umbrellaGuard | 2→3 | 3→4 | 3.33 → 3.33 | 5.00 → 5.00 | 5.00 → 6.67 | – → 6.67 | | 1.50x | **2.00x** |
| eraserBomb | 2→3 | 3→4 | 4.33 → 4.33 | 5.67 → 6.50 | 5.67 → 8.67 | – → 8.67 | | 1.31x | **2.00x** |
| studentLantern | 2→3 | 3→4 | 0.19 → 0.19 | 0.25 → 0.27 | 0.27 → 0.36 | – → 0.38 | | 1.40x | **2.00x** |
| bikittyCutter | 3→4 | 4→5 | 8.44 → 12.93 | 10.31 → 17.32 | 10.31 → 21.70 | 12.26 → 21.70 | – → 25.80 | 1.45x | **2.00x** |
| lineDraw | 3→4 | 4→5 | 6.43 → 10.93 | 8.04 → 14.43 | 8.04 → 17.94 | 9.81 → 17.94 | – → 21.89 | 1.53x | **2.00x** |
| chibiko | 1→2 | 2→3 | 1.16 → 1.16 | 1.24 → 1.72 | – → 1.83 | | | 1.06x | 1.57x |
| hanako | 0→0 | 1→1 | – | | | | | – | – |

Lv1이 오른 5종(scienceFlask·sharkMissile·bikittyCutter·lineDraw + bell)의 성격이 다르다.

- **scienceFlask 0.91→1.81, bikittyCutter 8.44→12.93, lineDraw 6.43→10.93**은 상향이 아니라
  **측정 정정**이다(6절 추정기 수정). 게임 안 위력은 예전과 같다 — 예전 숫자가 틀렸던 것이다.
- **sharkMissile 2.97→4.95**는 쿨다운 하향(3절), **bell 2.28→3.20**은 격차 완화용 상향(4절).
- **compassBlade 17.94→14.35**는 격차 완화용 하향(4절).

## 2. 성장폭 — 목표 2.0x 달성 여부

**16종 달성**(2.00~2.01x). 나머지 3종:

| 무기 | 성장폭 | 판정 |
|---|---|---|
| bell | 1.99x | 달성(반올림 오차) |
| chibiko | 1.57x | **의도적 미달.** 전 무기 10% 버프 동반자라 폭을 보수적으로 잡으라는 지시대로 |
| hanako | – | 힐 전용, 데미지 카드 제외 대상 |

참고로 실제 게임에서는 카드가 반복 획득되므로(4절 아래 참고) **데미지 카드만 4번 뽑는 최대 경로**는
전 무기 2.28~3.00x다. 정본 경로 2.0x는 "카드를 골고루 뽑았을 때"의 하한선이다.

## 3. 같은 레벨 기준 무기 간 최대 격차 — 목표 5배 이내

**주력 무기 15종 기준 전 레벨에서 달성했다.**

| 레벨 | 전 | 후 |
|---|---|---|
| Lv1 | 7.88x (compassBlade 17.94 / bell 2.28) | **4.78x** (tumbler 15.30 / bell 3.20) |
| Lv2 | 7.23x | **4.81x** |
| Lv3 | 6.82x | **4.83x** |
| Lv4 | 4.11x | **4.55x** |
| Lv5 | – | **3.51x** (tumbler 30.64 / onigiri 8.73) |

**비교 집합에서 제외한 4종과 근거:**

- `hanako` — 피해 0, 힐 전용.
- `studentLantern` — 지시대로 제외. 0.15 × 10틱 ÷ 8초는 실제값이며, 빛 상자 안 전원을 때리는
  광역 무기라 단일 대상 화력이 낮은 게 정상이다.
- `scienceFlask` — 같은 이유. 리워크로 "범위폭탄 → 화학 웅덩이 존"이 된 광역 지속 무기다.
- `chibiko` — 전 무기 10% 버프가 본체인 동반자. 자기 화력으로 재면 이중 계상된다.

**예외 4종을 포함하면 Lv1 격차는 94.25x → 80.39x다**(최소값이 여전히 studentLantern 0.19).
지시가 랜턴을 억지로 올리지 말라고 했으므로 이 숫자는 좁힐 수 없고, 좁혀서도 안 된다.

**어느 쪽을 골랐나 — 하향과 상향 둘 다 했다.**

- `compassBlade.hitsPerSecond` 2.5 → **2.0** (Lv1 17.94 → 14.35, −20%).
  `damage` 7은 그대로 뒀다 — base damage는 Lv1 무기 간 균형의 기준선이라 손대지 말라는 지시를 지켰다.
  타격 빈도를 내리면 같은 결과를 얻으면서 "한 대의 무게"는 유지된다.
- `bell.cooldown` 4500 → **3200** (2.28 → 3.20, +40%).
  벨은 주력 15종 중 최하위였다. 최상위만 깎아서는 5배 안에 못 들어와서 바닥을 같이 올렸다.
  `damage` 10은 유지 — 8방향 충격파 한 발의 위력은 그대로다.
- 하향만으로 맞추려면 `tumbler`(15.30)까지 함께 깎아야 했다. 텀블러는 지시에 없었고, 사용자가
  지금 좀비 체력을 보정 중이라 스타터 무기의 화력을 건드리는 위험이 더 크다고 판단했다.
  결과적으로 **텀블러가 새 최상위(Lv1 15.30)**가 됐다. 다음 밸런스 패스의 후보로 남긴다.

## 4. 도달 가능 레벨 분포 — 선행 조사의 사실오류 정정

**선행 조사 3절 "19종 중 18종은 Lv5에 절대 닿지 못한다"는 사실이 아니다.**

카드는 반복 획득된다. `isUpgradeAvailable`은 `kind: 'damage'` 카드에 cap을 두지 않고
레벨 상한만 본다(`upgrades.js:192`). 스탯 카드도 cap까지, 치명타 카드도 두 cap까지 반복된다.
그래서 데미지 카드가 한 장뿐이어도 그걸 네 번 뽑으면 Lv5다.

`isUpgradeAvailable` 기반으로 그리디하게 최대 레벨을 재보면:

| 도달 상한 | 전 | 후 |
|---|---|---|
| Lv5 | **18종** (hanako 제외 전부) | **18종** (동일) |
| Lv1 | hanako | hanako |

선행 조사의 "도달Lv"는 **서로 다른 카드를 한 장씩만 뽑는 경로의 길이**였다 — 측정 규약이지
게임 제약이 아니다. 그래서 이 항목은 **HUD 수정이 필요 없다**:

- `MAX_WEAPON_LEVEL` 5는 19종 중 18종에서 실제로 도달 가능하다.
- 게임 어디에도 "Lv x / 5" 게이지 표기가 없다. HUD의 유일한 레벨 문구는 데미지 카드 라벨의
  `(Lv{level})`이고(`HUD.jsx:87`), 그건 무기의 실제 다음 레벨을 그대로 찍는다.
- **여전히 Lv5에 못 닿는 무기: `hanako` 1종.** 레벨업 카드가 0장이라 영원히 Lv1이다.
  힐 간격/힐량 카드를 주면 해결되지만 이번 범위 밖이라 손대지 않았다.

정본 경로 기준 분포(참고): Lv5 11종 / Lv4 6종 / Lv3 chibiko / Lv1 hanako.
연필은 카드가 5장이 됐지만 레벨 상한 때문에 한 런에 4장까지만 들어간다.

## 5. 만렙 로드아웃 마틸다 HP (전/후)

로드아웃 정의: 스타터 8종(`pencilThrow, schoolBag, boxCutter, tumbler, scienceFlask, bell,
stunGun, onigiri`), 각각 정본 경로 종단. `MAX_OWNED_WEAPONS`가 8이라 슬롯을 꽉 채운 구성이다.

| | 합산 DPS | 마틸다 HP (= DPS × 1800초) |
|---|---|---|
| 전 | 73.88 | **132,992** |
| 후 | 106.65 | **191,973** (+44.3%) |
| 전 (데미지 카드 ×4 최대치) | 118.20 | 212,766 |
| 후 (데미지 카드 ×4 최대치) | 144.45 | 260,014 (+22.2%) |

지시대로 마틸다는 별도 조정하지 않았다. HP가 스폰 시점 DPS에서 파생되므로 자기보정된다.
증가분의 상당 부분은 성장폭 2.0x가 아니라 **추정기 정정**에서 온다(플라스크 존·바이키티 사이클이
이제 제대로 세어진다). 즉 예전 마틸다는 실제 플레이어 화력보다 낮게 계산된 HP를 갖고 있었고,
30분 설계가 실제로는 더 짧았다. 그 오차가 지금 메워진 것이다.

## 6. 추정기 2차 피해 반영 (`lib/playerDpsEstimate.js`)

`weaponSecondaryDamagePerSecond(weapon)`를 추가하고 `estimateWeaponDps`에 합산했다.

- **scienceFlask** — `zoneTickDamage` × (한 쿨다운 사이클 안에 들어가는 틱 수). 틱 주기 1000ms는
  `Flask.jsx`의 `ZONE_TICK_MS` 정본과 같은 값이다. 존이 쿨다운보다 길어도 겹쳐 세지 않는다.
  0.91 → **1.81**.
- **lineDraw** — `lineCrossDamage`(14)를 사이클당 1회. 단일 대상은 한 번 통과로 본다
  (`lineCrossCooldownMs` 600 덕에 그 이상은 밀집 상황에서만 나온다). 6.43 → **10.93**.
- **bikittyCutter** — `segments`+`snapDamage`가 있으면 정본 `bikittyCycleDps()`(`lib/bikittyCutter.js:77`)를
  그대로 쓰고 기대 치명타만 곱한다. 8.44 → **12.93** (사이클 검산값 11.49 × 치명타 1.125).
- **studentLantern 0.19은 건드리지 않았다.** 사각이 아니라 실제값이라는 판정 그대로다.

## 7. 남은 평평 구간 (정직한 한계)

`tumbler`의 첫 레벨업 무증가는 없앴다(15.30 → 22.18, +45%). 데미지 카드를 `tumblerCount` 앞으로
옮겼고, **모든 무기의 첫 카드가 데미지 카드가 되도록 선언 순서를 맞췄다.** 첫 레벨업이 체감 0인
무기는 이제 없다.

다만 정본 경로 **뒤쪽**에는 여전히 평평한 구간이 남는다 — 유틸 카드가 단일 대상 DPS를 안 올리기 때문이다.

| 무기 | 평평한 구간 | 원인 카드 |
|---|---|---|
| pencilThrow | Lv3→4→5 | pencilCount, pencilPierce |
| schoolBag / boxCutter / stunGun / starlink / bikittyCutter / lineDraw / compassBlade / tumbler | Lv3→Lv4 | range·chainCount·strikeCount·count·segmentRangeStep·lineDurationMs |
| guidedMissile / sharkMissile / umbrellaGuard / eraserBomb | Lv3→Lv4 (마지막 카드) | radius |

이 카드들이 무가치하다는 뜻은 아니다(다수의 적을 상대할 때 값을 한다). 단일 대상 기준으로만
평평하다. 완전히 없애려면 선행 조사 권고 2번("유틸 카드에 소량의 데미지를 겸하게")이 필요한데,
이번 범위 밖이라 하지 않았다.

## 8. 변경 파일

| 파일 | 변경 |
|---|---|
| `src/lib/upgrades.js` | 데미지 카드 18장 추가(`<무기>Power` 16 + `lanternDamage` + `chibikoDamage`), 기존 데미지 카드 스텝 재조정, 텀블러 카드 순서 정정, 선긋기 데미지 카드에 `lineCrossDamage` bonus 추가 |
| `src/lib/weaponCatalog.js` | `sharkMissile.cooldown` 7000→4200, `compassBlade.hitsPerSecond` 2.5→2.0, `bell.cooldown` 4500→3200 |
| `src/lib/playerDpsEstimate.js` | `weaponSecondaryDamagePerSecond` 추가, 바이키티 사이클 DPS 사용 |
| `src/components/HUD.jsx` | 새 카드 18장 항목 **추가만**(기존 줄 미변경, Write 미사용) |
| `src/lib/locales/en.js` / `ja.js` | `up.<key>.label` / `.desc` 36개 추가, 선긋기 데미지 카드 desc 정정 |
| `src/lib/upgrades.test.js` | 옛 수치 고정 테스트 4건 갱신 + 회귀 가드 1건 추가 |
| `src/lib/weaponCatalog.test.js` | compassBlade `hitsPerSecond`, sharkMissile `cooldown` 기대값 갱신 |

**ko 로케일 주의:** `src/lib/locales/ko.js`에는 `up.*` 키가 **원래 0개**다(en 137 / ja 137 / ko 0).
한국어 문구의 정본은 `HUD.jsx`의 리터럴 `label`/`desc`이고 `translate(key, ..., fallback)`가
그걸 폴백으로 쓴다. 그 기존 패턴을 따라 한국어는 HUD.jsx에 넣었다. ko.js에만 새 키를 넣으면
이 파일 하나만 규칙이 달라진다. `i18nCoverage.test.js`는 en·ja만 검사하며 통과했다.

## 9. 테스트 결과

`npx vitest run src/lib src/components/Weapons --maxWorkers=1 --no-file-parallelism`

| | 파일 | 테스트 |
|---|---|---|
| 변경 전(baseline) | 11 failed / 115 passed (126) | 27 failed / 1084 passed (1111) |
| 변경 후 | 11 failed / 115 passed (126) | **27 failed / 1086 passed (1113)** |

실패 목록을 정렬해 `comm`으로 대조한 결과 **신규 실패 0건, 사라진 실패 0건**이다.
27건 전부 기존부터 깨져 있던 것이며 내 변경과 무관하다:

- Firebase fail-closed 계열 (`firebaseStudio` 2, `graphicsStudioConfig` 2, `firebaseProgress` 1,
  `stagePropPlacements` 1, `projectAdminRules` 1)
- 보스/웨이브 타임라인 계열 (`burstEvents` 11, `waveTimelines` 2)
- 적 수치 패리티 (`enemySimulation.parity` 2) — 사용자의 좀비 체력 보정 작업 중이라 예상된 실패
- 소스 문자열 매칭 (`Hanako.test.jsx` 1, `AoeWeaponSfx.test.jsx` 1)
- `studentProximity` 2

추가 확인: `src/components/HUD.test.jsx` 37 passed (HUD.jsx를 편집했으므로 별도 실행).

중간에 `burstEvents.test.js`의 "Stage 1 첫 좀비 스폰 시각" 1건이 잠깐 새로 실패했는데,
다른 에이전트가 `src/lib/burstEvents.js`를 편집 중이던 순간에 걸린 것이고 재실행에서 통과했다.
내 변경 파일 목록에 `burstEvents.js`는 없다.

## 10. Balance_QA_Mini(balanceqa) 핸드오프

검증 요청 항목:

1. **스테이지 1~4 클리어 난이도 재측정.** 만렙 플레이어 화력이 정본 경로 기준 1.4x → 2.0x가 됐고,
   실측 로드아웃 DPS가 73.88 → 106.65(+44%)다. 사용자가 진행 중인 좀비 HP 보정과 반드시 함께 본다.
2. **마틸다 30분 설계 재확인.** HP 132,992 → 191,973. 추정기 정정분이 포함돼 있어 "이제야 맞는 값"인지,
   아니면 30분이 너무 길어졌는지 실플레이 판정이 필요하다.
3. **compassBlade 하향 체감** (Lv1 17.94 → 14.35). 해금 보상으로서 여전히 매력적인지.
4. **bell 상향 체감** (쿨다운 4.5초 → 3.2초). 8방향 충격파가 너무 잦아 화면이 시끄럽지 않은지 —
   `soundmini` 확인 필요(충격파 SFX 발동 빈도가 40% 늘었다).
5. **sharkMissile 쿨다운 4.2초.** guidedMissile(4.0초)과 발사 간격이 거의 같아졌다. 두 미사일이
   시각적으로 구분되는지.
6. **텀블러가 새 최상위**(Lv1 15.30, Lv5 30.64). 다음 패스에서 하향 대상인지 판정.
7. **레벨업 카드 풀이 커졌다** (18장 추가). `limitDuplicateWeaponUpgradeOptions`가 무기당 1장만
   보여주므로 화면 밀도는 그대로지만, 무기별 데미지 카드 출현 확률이 1/3 → 2/4로 올라 체감
   성장 속도가 빨라진다. 초반 스노볼 여부 확인.

## 11. 하지 않은 것

- 커밋하지 않았다.
- `Enemies.jsx` / `Enemy.jsx` / `stageConfig.js`를 건드리지 않았다.
- `HUD.jsx`는 Edit로 항목 추가만 했다. 기존 줄과 파일 전체 재작성은 하지 않았다.
- `useGameStore.js` / `matildaSpec.test.js` / `Weapons/StudentLantern.jsx` / `Weapons/Flask.jsx`의
  Advisor 변경을 되돌리지 않았다(작업 중 다른 에이전트가 커밋해 working tree에서 사라졌고,
  matildaSpec 회귀 가드 2종은 통과 상태다).
- `hanako`에 카드를 주지 않았다. base damage는 어떤 무기도 건드리지 않았다.

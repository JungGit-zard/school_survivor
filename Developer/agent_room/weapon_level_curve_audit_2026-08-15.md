# 무기 레벨별 위력 전수조사 — 시험 좀비 1마리 기준 (2026-08-15)

## 방법

고정 가상 좀비 **1마리, HP 100, 저항 없음**. 좀비 체력 보정 작업이 진행 중이라 스테이지 HP 배율에
의존하지 않는 고정 표적을 썼다 — 이 조사 결과는 보정 중인 수치와 무관하게 유효하다.

각 무기를 카탈로그 base(Lv1)에서 시작해 그 무기의 레벨업 카드를 **선언 순서대로** 하나씩 적용하며
`estimateWeaponDps`(단일 대상 기대 DPS)를 측정했다. 패시브·영구강화·치비코 버프는 전부 제외한 순수 무기값.
카드 수가 `MAX_WEAPON_LEVEL`(5)보다 적은 무기는 도달 가능 레벨까지만 나온다.

## 결과표

| 무기 | 카드 | 도달Lv | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | Lv1→최대 |
|---|---|---|---|---|---|---|---|---|
| compassBlade | 3 | 4 | **17.94** | 23.06 | 23.06 | 24.47 | | 1.36x |
| tumbler | 3 | 4 | **15.30** | 15.30 | 20.40 | 21.50 | | 1.41x |
| schoolBag | 3 | 4 | 9.55 | 13.53 | 13.53 | 14.55 | | 1.52x |
| bikittyCutter | 3 | 4 | 8.44 | 10.31 | 10.31 | 12.26 | | 1.45x |
| boxCutter | 3 | 4 | 8.31 | 10.04 | 10.04 | 11.93 | | 1.44x |
| starlink | 3 | 4 | 7.63 | 10.35 | 10.35 | 11.13 | | 1.46x |
| lineDraw | 3 | 4 | 6.43 | 8.04 | 8.04 | 9.81 | | 1.53x |
| stunGun | 3 | 4 | 6.18 | 7.90 | 7.90 | 8.43 | | 1.36x |
| pencilThrow | 4 | **5** | 4.54 | 5.96 | 5.96 | 5.96 | 6.44 | 1.42x |
| onigiri | 3 | 4 | 4.37 | 5.72 | 5.72 | 6.19 | | 1.42x |
| eraserBomb | 2 | 3 | 4.33 | 5.67 | 5.67 | | | 1.31x |
| guidedMissile | 2 | 3 | 4.00 | 5.50 | 5.50 | | | 1.38x |
| umbrellaGuard | 2 | 3 | 3.33 | 5.00 | 5.00 | | | 1.50x |
| sharkMissile | 2 | 3 | 2.97 | 4.40 | 4.40 | | | 1.48x |
| bell | 2 | 3 | 2.28 | 3.19 | 3.38 | | | 1.49x |
| chibiko | 1 | 2 | 1.16 | 1.24 | | | | 1.06x |
| scienceFlask | 3 | 4 | 0.91* | 1.39* | 1.39* | 1.45* | | 1.61x |
| studentLantern | 2 | 3 | 0.19 | 0.25 | 0.27 | | | 1.40x |
| hanako | 0 | 1 | — | | | | | — |

`*` 추정기가 못 세는 부수 피해가 있는 무기(아래 5절).

## 1. 레벨 곡선의 모양이 전 무기 동일하다 — 그리고 절반이 헛레벨이다

**19종 전부 데미지 카드가 정확히 1장뿐이다.** 나머지는 유틸 스탯 1~2장 + 치명타 1장이다.
결과적으로 모든 무기가 같은 모양을 그린다:

```
Lv1 → Lv2 : 데미지 카드   +30~50%   (유일한 실질 상승)
Lv2 → Lv3 : 유틸 카드     +0%       ← 단일 대상 기준 완전히 무증가
Lv3 → Lv4 : 치명타 카드   +3~8%
```

무증가 구간을 만드는 카드: `pencilCount`(projectileCount), `pencilPierce`, `bagRadius`(range),
`boxCutterRange`, `flaskRadius`, `stunChain`(chainCount), `onigiiriBounce`, `starlinkCount`(strikeCount),
`compassBladeCount`, `missileRadius`, `sharkMissileRadius`, `umbrellaRadius`, `eraserRadius`,
`bikittyCutterRange`, `lineDrawDuration`, `tumblerCount`.

**이 카드들이 무가치하다는 뜻은 아니다** — 사거리·범위·개수·관통은 다수의 적을 상대할 때 값을 한다.
다만 "좀비 1마리를 얼마나 빨리 죽이는가"로 보면 **레벨업 절반이 체감 0**이다. 카드 3장 중 1장을
뽑는 구조라 유틸 카드만 연달아 뽑으면 레벨이 3 올라도 위력이 그대로일 수 있다.

## 2. 최대 성장폭이 너무 좁다 — 1.31x ~ 1.61x

Lv1에서 도달 가능한 최대 레벨까지 올려도 위력이 **1.5배도 안 되는 무기가 대부분**이다.
가장 큰 scienceFlask가 1.61x, 가장 작은 eraserBomb이 1.31x. 뱀서라이크에서 무기를 만렙까지
키웠을 때 기대하는 체감과 크게 어긋난다. 레벨업이 "강해진다"가 아니라 "조금 나아진다"로 읽힌다.

## 3. MAX_WEAPON_LEVEL 5는 사실상 도달 불가능하다

`upgrades.js:147`이 상한을 5로 잡았지만 실제 도달 레벨은 카드 장수가 결정한다.

| 도달 상한 | 무기 수 | 무기 |
|---|---|---|
| Lv5 | **1** | pencilThrow |
| Lv4 | 10 | schoolBag, boxCutter, tumbler, scienceFlask, stunGun, onigiri, starlink, compassBlade, bikittyCutter, lineDraw |
| Lv3 | 6 | bell, guidedMissile, sharkMissile, umbrellaGuard, eraserBomb, studentLantern |
| Lv2 | 1 | chibiko |
| Lv1 | 1 | hanako |

**19종 중 18종은 Lv5에 절대 닿지 못한다.** HUD에 레벨을 5까지 표기한다면 플레이어에게는
영원히 안 차는 게이지로 보인다. 상한을 무기별 실제 카드 수로 표기하든지, 카드를 채우든지
둘 중 하나가 필요하다.

## 4. 무기 간 격차가 크다 — 같은 레벨에서 최대 94배

Lv1 단일 대상 DPS: compassBlade **17.94** ↔ studentLantern **0.19**.
추정기 사각(5절)인 flask·lantern을 빼도 compassBlade 17.94 ↔ bell 2.28 = **7.9배**.

특히 눈에 띄는 것:

- **compassBlade(계정 해금)가 Lv1만으로 다른 17종의 만렙을 전부 앞선다** (tumbler 만렙 21.50만 예외).
  해금 무기가 스타터를 압도하는 건 의도일 수 있으나 폭이 과하다.
- **sharkMissile(2.97) < guidedMissile(4.00).** 상위 미사일이 기본 미사일보다 단일 대상에서 약하다.
  base damage는 20.8 vs 16으로 상어가 높은데 쿨다운이 뒤집는다. 상위 호환이 하위 호환이 됐다.
- **eraserBomb은 base damage 26으로 19종 최고인데 DPS는 4.33으로 하위권.** cooldown 6000ms가 원인.
  "가장 센 한 방"이라는 정체성은 맞지만 지속 화력에서 손해가 크다.
- **tumbler는 Lv1→Lv2가 완전 평평하다**(15.30 → 15.30). 첫 카드가 `tumblerCount`라 단일 대상에
  아무 변화가 없다. 첫 레벨업이 체감 0인 유일한 무기다.

## 5. 추정기 사각 — 이 숫자들은 과소계상이다 (확정)

`estimateWeaponDps`는 `damage` 필드 하나만 본다. 다음은 실제보다 낮게 나온 값이다:

- **scienceFlask 0.91**: 웅덩이 지속 피해(`zoneTickDamage` 1.5, 5초 지속)가 전혀 안 세어졌다.
- **lineDraw 6.43**: `lineCrossDamage` 14(절단선 통과 시 1회) 누락.
- **bikittyCutter 8.44**: 사이클 규칙 미반영. `lib/bikittyCutter.js:77`에 정식 `bikittyCycleDps()`가
  있는데 추정기가 쓰지 않는다(실측 11.49).
- **studentLantern 0.19**: 이건 사각이 아니라 **실제값이 맞다**. damage 0.15 × 10틱 ÷ 8초 쿨 = 0.1875.
  단일 대상 화력이 사실상 0인 광역·유틸 무기다.

따라서 flask·lineDraw·bikittyCutter의 순위는 위 표보다 올라간다. 정확한 재판정은 추정기가
2차 피해 필드를 반영하도록 고친 뒤에 해야 한다.

## 6. 권고 (우선순위 순)

1. **무기당 데미지 카드를 1장 더 준다.** 곡선이 평평한 근본 원인이 "데미지 카드 1장뿐"이다.
   가장 적은 변경으로 성장폭 1.4x → 2.0x대를 만든다.
2. **유틸 카드에 소량의 데미지를 겸하게 한다.** 어떤 카드를 뽑아도 체감 0이 없도록. 1번과 택일 가능.
3. **레벨 상한 표기를 무기별 실제 카드 수에 맞춘다.** 또는 카드가 2장뿐인 6종에 카드를 보충한다.
4. **sharkMissile 쿨다운 하향** — 상위 무기가 하위 무기보다 약한 역전만이라도 먼저 없앤다.
5. **compassBlade 하향 또는 나머지 상향** 검토. 현 격차 7.9~94배는 무기 선택을 무의미하게 만든다.
6. **추정기의 2차 피해 반영**(4·5절). 이걸 고치기 전에는 밸런스 판정 자체가 반쪽이다.

## 7. 검증 근거

임시 vitest 프로브로 `WEAPON_CATALOG` → `applyUpgradeToWeapon` → `estimateWeaponDps` 체인을 직접
호출해 측정했고, 측정 후 프로브 파일을 삭제했다(`git status`로 잔여물 없음 확인).
`stageBalanceProbe`는 기록된 비결정성 때문에 사용하지 않았다.
**소스 파일은 이 조사에서 한 줄도 수정하지 않았다** — 좀비 체력 보정 작업과 충돌하지 않는다.

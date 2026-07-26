# 연필 Zombie Meter 발사 범위 QA 기록 (2026-07-26)

## 판정

**PASS (코드·문서·focused test 기준)**

검증 대상은 연필의 최초 발사 대상 선정 범위다. Browser, Firebase, Graphics Studio 데이터에는 접근하거나 변경하지 않았다.

## 구현 확인

- `src/lib/gameplayUnits.js`가 단일 gameplay 데이터 경로로 다음 값을 정의한다.
  - `ZOMBIE_METER_WORLD_UNITS = 0.75`
  - `PENCIL_FIRE_DIAMETER_ZM = 6`
  - `PENCIL_FIRE_RADIUS_ZM = 3`
  - `PENCIL_FIRE_RANGE_WORLD_UNITS = 2.25`
- `weaponCatalog`의 Pencil base `range`와 `PencilThrow`의 fallback이 같은 `PENCIL_FIRE_RANGE_WORLD_UNITS`를 사용한다. 과거의 `22` fallback은 이 두 경로에 남아 있지 않다.
- `scanClosestEnemiesInto`의 기존 planar player-center → enemy-center 거리 비교를 그대로 사용한다. 비교는 `distance > rangeSq`만 제외하므로 정확히 2.25는 포함하고 2.250001은 제외한다.
- LOS는 scanner의 기존 기본 정책을 그대로 쓴다. 사정권 안이어도 sight blocker가 true인 target은 후보가 아니다.
- target이 0개면 `if (targetCount === 0) return`이 `emitSfx({ id: 'pencilFire' })`보다 먼저 실행된다. 따라서 범위 밖/LOS 차단만 존재할 때 발사와 fire SFX가 발생하지 않는다.

## Range 데이터 경로

| 경로 | 결과 |
| --- | --- |
| Catalog → store 초기화 | PASS. `buildInitialWeapons`가 catalog base range 2.25를 runtime weapon에 복사한다. Might는 damage만 변경한다. |
| Pencil 일반 카드·permanent upgrade | PASS. Pencil은 damage/count/pierce/crit 및 speed/count 관련 permanent 효과만 가지며 range를 직접 올리지 않는다. |
| Chibiko | PASS. `CHIBIKO_INCREASE_STATS`의 `range`가 명시적 runtime Range Buff를 적용한다. `PencilThrow`는 `w.range`를 base fallback보다 우선하므로 이 보정은 의도대로 허용된다. Zombie Meter와 3zm base 정의 자체는 바꾸지 않는다. |
| E2E override | PASS. E2E는 무기 active/level, cooldown, HP만 조정하며 range를 덮어쓰지 않는다. |

## 범위 밖 동작 및 비범위 확인

- Projectile homing, speed `12`, 3.5초 수명, pierce sweep과 damage/cooldown에는 Pencil production diff가 없다. 2.25는 **발사 대상 선정** 반지름이며 비행 수명이나 관통 판정 거리가 아니다.
- 새로운 원 mesh, ring, decal, HUD marker 또는 Studio item을 추가하지 않았다.
- Firebase/Studio 저장·hydrate·Apply 경로는 수정하지 않았다.

## 문서 일관성

`CONCEPTS.md`, `UBIQUITOUS_LANGUAGE.md`, `Planner/game_contents/pencil_zombie_meter_range_2026-07-26.md`, `Developer/pencil_zombie_meter_range_implementation_2026-07-26.md`, LevelMini/ThreeMini 기록이 모두 다음을 일치시킨다.

- `1zm = 0.75 world units`는 E01 외형/Studio scale과 독립적인 고정 gameplay 단위다.
- Pencil Base Range는 지름 6zm, 반지름 3zm, 2.25 world units의 center-based inclusive circle이다.
- Range Buff는 runtime 반지름을 넓힐 수 있으나 Zombie Meter 또는 base 정의를 재정의하지 않는다.
- 과거 base range `22`는 새 Planner 결정 문서에서 명시적으로 대체된다.

과거 날짜의 계획/기록에 남은 `22 units` 표기는 역사 수치다. 새 Planner 결정이 supersession을 명시하므로 현행 구현 정본과 충돌하지 않는다.

## 자동 검증

`Developer/r3f_prototype`에서 다음을 실행했다.

```text
npm test -- src/lib/gameplayUnits.test.js src/lib/weaponCatalog.test.js src/components/Weapons/Pencil.test.jsx src/lib/weaponTargeting.test.js src/lib/e2eAuth.test.js src/lib/upgrades.test.js src/lib/weaponPermanentUpgrades.test.js src/store/useGameStore.weaponPermanentUpgrades.test.js
```

결과: 테스트 파일 8개, 테스트 150개 모두 통과.

범위 대상 코드·테스트·문서에 대해 `git diff --check`를 실행했다. 공백 오류는 없었다. 기존 작업 파일의 LF→CRLF 경고만 있었으며 오류나 소스 의미 변경은 아니다.

## 잔여 위험

- 범위 경계는 enemy **center** 기준이다. center가 2.25 밖이지만 collider edge/outline이 원과 닿는 적은 대상이 아니다. 이를 collider-edge 판정으로 바꾸려면 별도의 밸런스 결정과 scanner 변경이 필요하다.
- focused test는 pooled target의 exact/epsilon/LOS 경계를 직접 검증한다. special Map target도 production scanner에서 같은 `distance > rangeSq`와 LOS 규칙을 사용하지만, special target 전용 경계 사례는 추가 회귀 강화 후보다.
- 현재 범위 밖에서 SFX가 없다는 증명은 scanner 경계 테스트와 Pencil의 early-return-before-SFX 구조 검증을 결합한 코드 수준 증거다. Browser 실행은 요청 범위상 수행하지 않았다.

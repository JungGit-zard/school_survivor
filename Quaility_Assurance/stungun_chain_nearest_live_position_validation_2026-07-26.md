# 전기충격기 체인 최근접 live-position QA 기록 (2026-07-26)

## 판정

**FAIL — 일반 stale-grid 경로는 통과했지만, 32비트 `spatialRevision`이 한 바퀴(2^32회) 돌아 이전 grid와 같은 값으로 재진입하는 ABA 경우에는 `isCurrentFor()`가 stale grid를 current로 오판할 수 있다.**

이 판정은 요청된 “uint32 wrap에서도 freshness 오판이 없는가”를 포함한 전체 수용 기준에 따른 것이다. 일상적인 spawn·move·despawn·reset 및 전기충격기 1차/체인 최근접 선택은 통과했다. Firebase, 브라우저, Graphics Studio는 사용하거나 변경하지 않았다.

## 확인 결과

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| 1차 player-nearest stale grid | PASS | grid snapshot 뒤 `setPosition()`이 X/Z를 바꾸면 revision이 증가하고 `grid.isCurrentFor(pool)`은 false가 된다. `findClosestEnemy()`는 grid 사용을 포기하고 live pool 전체를 읽어 현재 최근접을 고른다. 회귀 테스트가 (7,0)→(1,0) 이동 뒤 1-unit 적을 선택했다. |
| 체인 impact-nearest stale grid | PASS | `pickStunGunChainTarget(hitX, hitZ, ...)`는 `scanRadiusEnemiesInto()`를 사용한다. stale grid에서는 live pool fallback으로 radius 후보를 거리순 정렬하므로 player-nearer가 아니라 impact-nearer를 고른다. 회귀 테스트가 (1,0) 충돌점에서 (1,1.5)를 선택했다. |
| live handle/generation/active | PASS | scan 결과는 `resolveWeaponTarget()`와 `isEnemyHitLive()`를 다시 거치며, 체인 `hitSet`은 stable rb identity를 제외한다. spawn/despawn의 revision 증가와 generation 계약은 유지됐다. |
| 동일 X/Z `setPosition` | PASS | 입력값을 Float32로 반올림해 현재 X/Z와 비교하므로 Y만 바뀌거나 동일 X/Z이면 revision을 증가시키지 않는다. 공간 cell membership이 바뀌지 않는 경우와 일치한다. |
| reset, spawn/despawn | PASS | pool reset/spawn/despawn은 모두 revision을 증가시킨다. runtime grid reset은 `cellsX/cellsZ=0`이어서 pool revision과 우연히 같아도 current가 될 수 없고, 다음 rebuild가 현재 revision을 캡처한다. |
| uint32 wrap freshness | **FAIL** | `spatialRevision = (revision + 1) >>> 0`와 `poolSpatialRevision === pool.spatialRevision` 비교만으로는 이전 revision 0 grid가 정확히 2^32회 공간 변경 뒤 다시 0이 된 pool과 activeCount/highestActive까지 같을 때 stale임을 구별하지 못한다. 현 테스트는 wrap 직후 새 grid를 rebuild하는 경우만 다루며, 이전 snapshot ABA는 검증하지 않는다. |
| simulation revision 비용/최종 grid | PASS | normal movement는 `spatialChanged` boolean으로 집계하고 frame 끝에 `markSpatialChanged()`를 한 번만 호출한다. 그 뒤 final `grid.rebuild()`가 현재 revision을 캡처한다. lifecycle despawn은 별도의 실제 membership 변경이므로 pool API에서 revision을 증가시킨다. |
| 타깃 최적화·그래픽·체인 계약 보존 | PASS | `StunGun.jsx`와 `stunGun.js`의 target handle, impact-origin 체인, range 4.5, weapon damage/cooldown/chainCount 변경 diff는 없다. 이번 diff는 pool/grid freshness와 회귀 테스트에 한정된다. |
| direct `posX`/`posZ` write 누락 | PASS | production 검색상 pool 좌표 직접 쓰기는 `enemyEntityPool.js`의 lifecycle/API와 `enemySimulation.js`의 집계된 simulation write뿐이다. 후자는 `spatialChanged` 뒤 한 번 bump하고 final rebuild한다. |
| debug log | PASS | 검토 대상 production/test 파일에서 `console.log/debug/warn/error` 검색 결과가 없다. |

## 실행한 검증

작업 위치: `Developer/r3f_prototype`

```text
npx vitest run src/lib/stunGunChainNearestRegression.test.js src/lib/enemyEntityPool.test.js src/lib/enemySimulation.test.js src/components/Weapons/StunGun.test.jsx src/components/Weapons/StunGunNearestTargetRegression.test.jsx src/lib/stunGun.test.js
```

결과: 테스트 파일 6개, 테스트 60개 모두 통과.

```text
git diff --check -- Developer/r3f_prototype/src/lib/enemyEntityPool.js Developer/r3f_prototype/src/lib/enemySimulation.js Developer/r3f_prototype/src/lib/stunGunChainNearestRegression.test.js
```

결과: 공백 오류 없음. Git은 두 기존 수정 파일의 LF→CRLF 안내만 출력했다.

## 수정 전 필수 보완

- `spatialRevision` ABA를 막아야 한다. 가장 작은 안전한 방법은 unsigned wrap 수치만 비교하지 않고, wrap 시 별도 epoch를 증가시켜 grid가 `{ epoch, revision }`을 함께 캡처·비교하는 것이다. 또는 JavaScript 안전 정수 범위에서 단조 증가하는 revision을 사용한다.
- 위 보완 후에는 “revision 0인 grid snapshot → pool의 revision을 `0xffffffff`로 설정 → 1회 bump로 0 wrap” 상황에서, old snapshot이 `isCurrentFor()` false가 되는 회귀 테스트를 추가해야 한다.

## ABA 수정 재검증 (2026-07-26)

### 재검증 판정

**PASS** — 최초 FAIL의 uint32 ABA는 안전 정수 단조 revision과 영구 `-1` sentinel fallback으로 제거됐다.

### 새 계약 확인

- `spatialRevision`은 `0`부터 안전 정수로만 증가한다. 현재 값이 `Number.MAX_SAFE_INTEGER`이면 다음 공간 변경에서 `-1`이 되고, 이미 `-1`이거나 안전 정수가 아닌 값도 계속 `-1`로 유지된다. 따라서 값이 순환해 과거 grid revision과 다시 같아질 수 없다.
- `EnemySpatialGrid.isCurrentFor()`는 pool revision이 non-negative safe integer일 때만 true를 허용한다. sentinel `-1`에서는 `rebuild()`가 이를 캡처한 뒤에도 false를 반환하므로 `weaponTargeting`은 전수검색 fallback을 사용한다.
- 새 `EnemySimulation spatial revision` 경계 테스트는 revision 0 grid를 만든 뒤 pool을 `Number.MAX_SAFE_INTEGER`에서 한 번 변경해 sentinel으로 보내고, rebuild 전후 모두 `isCurrentFor() === false`, 그 뒤 변경도 `-1` 유지임을 검증한다.
- 기존 stale-grid 1차 player-nearest 및 impact-nearest 체인 시나리오도 그대로 통과했다. 범위·피해·쿨다운·그래픽 방향·impact-origin 계약과 direct coordinate write 소유 경로는 바뀌지 않았다.

### 재실행한 검증

작업 위치: `Developer/r3f_prototype`

```text
npx vitest run src/lib/stunGunChainNearestRegression.test.js src/lib/enemyEntityPool.test.js src/lib/enemySimulation.test.js src/components/Weapons/StunGun.test.jsx src/components/Weapons/StunGunNearestTargetRegression.test.jsx src/lib/stunGun.test.js
```

결과: 테스트 파일 6개, 테스트 61개 모두 통과.

```text
git diff --check -- Developer/r3f_prototype/src/lib/enemyEntityPool.js Developer/r3f_prototype/src/lib/enemySimulation.js Developer/r3f_prototype/src/lib/enemyEntityPool.test.js Developer/r3f_prototype/src/lib/enemySimulation.test.js Developer/r3f_prototype/src/lib/stunGunChainNearestRegression.test.js
```

결과: 공백 오류 없음. Git의 LF→CRLF 안내만 출력됐다.

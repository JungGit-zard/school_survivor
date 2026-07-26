# 연필 관통 후 연속 발사 QA 기록 (2026-07-26)

## 판정

**PASS** — 관통 업그레이드 후에도 기존 관통탄을 보존한 채, 다음 550ms 재사용 대기시간에 새 연필탄이 추가된다.

검증 범위는 런타임 코드와 자동 테스트로 한정했다. 브라우저, Firebase, Graphics Studio는 사용하거나 변경하지 않았다.

## 필수 확인 결과

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| 사용자 증상 | PASS | `PencilPierceFireRegression.test.jsx`가 실제 `applyUpgrade('pencilPierce')`로 `pierce: 1 → 2`를 만든 뒤, HP 100인 사거리 내 단일 적의 첫 관통 피격 후 550ms 경과 시 연필 모델 2개를 확인한다. |
| 기존 탄 보존 + 새 탄 추가 | PASS | `PencilThrow`는 활성 목록을 앞부분에 순서대로 복사하고 유효한 새 타깃만 뒤에서 연속 인덱스로 추가한다. 새 발사가 기존 탄을 교체하거나 삭제하지 않는다. |
| 업그레이드 상한 | PASS | `UPGRADE_EFFECTS.pencilPierce`는 `step: 1`, `cap: 3`이고 공통 stat 적용은 `Math.min(cap, ...)`이다. 따라서 `1 → 2 → 3` 후 더 증가하지 않는다. |
| 기존 전투 계약 | PASS | 이번 `Pencil.jsx` diff는 active-projectile 게이트 제거와 발사 이벤트의 목록 병합뿐이다. 기본 3zm/2.25-unit range, damage, speed, crit, closest-target scan, 3.5초 수명, hit set, 첫 적 피격 뒤 homing 해제는 변경되지 않았다. |
| 만료와 발사의 같은 프레임 상호작용 | PASS | `PencilThrow`의 `useFrame` 등록은 자식 `Projectile`보다 먼저이며, 발사 후 같은 프레임에 자식이 만료되면 `remove()`은 `pendingRef.current`(새 탄을 포함한 병합 배열)에서 만료 id만 제거한다. 그래서 새 탄은 남고 만료 탄은 되살아나지 않는다. |
| 다중 발사체/부분 stale 타깃 | PASS | 1차 검증에서 유효 타깃 수만 계산해 정확한 배열 길이를 할당하고, 2차 생성은 `nextIndex`를 성공할 때만 증가시킨다. JS 프레임 콜백 중 두 동기 루프 사이에 풀 상태를 변경하는 코드가 없으므로 양쪽 resolve 결과가 일치하며 holes/`undefined`/중복 key가 생기지 않는다. |
| 프레임 비용 | PASS | 새 배열과 두 번의 타깃 resolve는 cooldown 발사 이벤트에서만 실행된다. projectile 이동 프레임에는 새 배열/추가 타깃 스캔이 도입되지 않았고, 발사 수 `projectileCount`에 비례하는 두 선형 순회뿐이며 O(N²)은 없다. |
| 디버그 출력 | PASS | `Pencil.jsx`, 회귀 테스트에서 `console.log/debug/warn/error` 검색 결과가 없다. |

## 실행한 검증

작업 위치: `Developer/r3f_prototype`

```text
npx vitest run src/components/Weapons/PencilPierceFireRegression.test.jsx src/components/Weapons/Pencil.test.jsx src/lib/pencilRangeBoundary.test.js src/lib/weaponTargeting.test.js src/store/useGameStore.test.js src/lib/upgrades.test.js
```

결과: 테스트 파일 6개, 테스트 104개 모두 통과.

```text
npm run build
```

결과: Vite production build 성공, legacy B02 source/artifact gate 통과. 기존 vendor-three chunk-size 경고만 발생했고 실패는 없었다.

```text
git diff --check -- Developer/r3f_prototype/src/components/Weapons/Pencil.jsx Developer/r3f_prototype/src/components/Weapons/PencilPierceFireRegression.test.jsx
```

결과: 출력 없음(공백 오류 없음).

## 잔여 위험

- 회귀 테스트는 jsdom의 프레임 콜백 모형을 사용한다. 실제 R3F 렌더러의 장시간 고밀도 전투에서 프레임 드롭까지 포함한 시각적 확인은 이번 읽기 전용 QA 범위에 포함하지 않았다.
- 스캔 직후에 타깃이 무효화되는 비정상 외부 변경이 생기면 발사는 쿨다운을 소비하고 유효 탄 0개가 될 수 있다. 현재 단일 JS 프레임의 두 동기 루프 사이에는 그런 변경 경로가 없으며, 이번 사용자 증상과 무관한 기존 동작이다.

# balanceqa 연필 관통 후 연속 발사 라우팅 기록 (2026-07-26)

## Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: 관통 업그레이드 뒤 남아 있는 연필 투사체가 다음 쿨다운 발사를 막는 전투 회귀 수정의 독립 QA가 필요했다.
- Specialist: `balanceqa`
- Artifact: `Quaility_Assurance/pencil_pierce_continuous_fire_validation_2026-07-26.md`

## 필수 확인 사항

- 반드시 실제 `useGameStore.applyUpgrade('pencilPierce')` 상태 전이로 `pierce: 1 → 2`를 검증한다.
- 반드시 HP 100인 단일 사거리 내 적에서 기본 탄이 만료되고, 관통탄의 첫 피격 후에는 기존 탄과 새 탄이 함께 남는지 확인한다.
- 반드시 기본 발사 반지름 3zm(2.25 world units), 관통 상한 3, 3.5초 수명, damage/speed/crit/closest-target scan 계약이 바뀌지 않았는지 확인한다.
- 반드시 `useDeferredProjectileState`의 pending/remove 순서와 parent-first R3F frame 등록 순서를 검토하여 만료 탄 부활 또는 새 탄 유실이 없는지 판단한다.

## 검증 결과

- `PencilPierceFireRegression.test.jsx`는 실제 store 업그레이드, 첫 관통 피격, 550ms 뒤 2개 투사체 렌더링을 통과했다.
- `PencilThrow`는 기존 목록을 보존하고 유효 새 batch만 append한다. `projectileCount > 1`에서 일부 타깃이 stale이어도 `nextIndex`가 성공 생성에만 증가하므로 배열 hole과 `undefined` key가 생기지 않는다.
- `onExpire()`가 같은 프레임에 발사 뒤 실행될 때, deferred state의 `remove()`은 pending 병합 배열에서 만료 id만 제외한다. 새 batch는 보존된다.
- 발사 이벤트 외 매 프레임 할당이나 O(N²) 탐색을 추가하지 않았다.
- 지정 Vitest 6파일 104개 통과, production build 및 scoped `git diff --check` 통과.

## 권고 및 범위

- 판정은 **PASS**다.
- 브라우저/Firebase/Graphics Studio는 이 검증에서 사용하지 않았고, 프로덕션 코드는 수정하지 않았다.
- 추후 실제 저프레임 대규모 전투를 수동 QA할 경우, 기존 탄 만료와 다음 cooldown 발사가 같은 렌더 사이클에 겹치는 장면을 별도 관찰한다.

# 연필 관통 첫 좀비 끼임 수정 QA — 2026-07-26

## 판정

**PASS.** 코드 diff와 집중 회귀 테스트를 검토했다. Firebase, Graphics Studio, 브라우저 및 실제 사용자 데이터에는 접근하지 않았다.

## 원인별 검증

- **주원인 해소:** `applyEnemyHit`가 성공한 직후 `releasePencilHomingTargetAfterHit`가 실행된다. 최초 homing target과 일치할 때만 `targetRef`를 clear하고, 다음 frame부터 steering guard가 `resolveWeaponTarget`을 건너뛰어 마지막 속도로 직진한다. 이미 맞은 첫 적을 계속 추적해 끼이는 경로가 닫혔다.
- **다른 victim 보호:** pooled target은 `index`와 `generation`이 모두 같을 때만 clear한다. sweep 중 다른 pooled 적을 맞거나, 같은 slot의 다른 generation을 맞으면 초기 homing target은 유지된다. special enemy는 객체 identity가 같을 때만 clear한다.
- **sweep 후보 부족 해소:** 후보 수는 `min(scratch capacity, hitsLeft + hitCount)`이다. 이미 맞은 적이 segment 시작점에서 `t=0`으로 다시 선두가 되어도 hit history가 그 후보를 건너뛰고 다음 적을 볼 수 있다. 현재 관통 상한 3에서는 이전 hit 최대 2 + 남은 hit 1 = 3 후보이므로 필요한 후보를 모두 포함한다.
- **pooled 재사용 안전성:** hit history와 homing release 모두 index+generation을 함께 확인한다. 재사용된 slot은 stale target으로 조향하거나 과거 hit와 혼동하지 않는다. special enemy는 별도 identity 경로를 유지한다.
- **성능/상태:** 변경된 frame 경로에는 새 object, array, `Vector3`, `Quaternion`, React state update 또는 새 의존성이 없다. 후보 예산은 scalar 계산이며 기존 scratch를 재사용한다.
- **모델·정본 불변:** `PencilModel`, `StudioTunedGroup itemId="weapon-pencil"`, 물성/mesh, Firebase 및 Graphics Studio 입력 경로는 변경하지 않았다.

## 실행 검증

```text
npx vitest run src/components/Weapons/Pencil.test.jsx src/lib/weaponTargeting.test.js src/lib/weaponCollision.test.js src/components/Weapons/WeaponHitSfx.test.jsx

Test Files  4 passed (4)
Tests  49 passed (49)
```

`git diff --check`도 Pencil 및 targeting 범위에서 오류 없이 통과했다. 출력된 LF→CRLF 메시지는 줄 끝 형식 안내이며 whitespace 오류가 아니다.

## 잔여 위험

- 실제 플레이 화면에서 3관통 연필이 같은 frame에 3개 적을 관통하는 시각 수동 검증은 수행하지 않았다.
- hit history 저장소는 16개다. 현재 관통 상한 3에는 충분하지만, 향후 관통 상한을 16 이상으로 올리면 history/scratch 계약을 함께 확장하거나 제한해야 한다.
- 투사체의 3.5초 age 만료 경로는 기존과 같이 deferred unmount 전 만료 요청을 반복할 수 있다. 이번 ‘첫 적 끼임’ 수정 범위와는 독립적이다.

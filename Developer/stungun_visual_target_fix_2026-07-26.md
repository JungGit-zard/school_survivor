# 스턴건 전기 스파크 표적 방향 수정 (2026-07-26)

## 원인

`LightningBoltModel`의 `THREE.Shape` 장축은 local Y(`y=-0.48..0.48`)다. `StunBoltProjectile`은 Y축 yaw만 `atan2(dx, dz)`로 바꾸고 있었으므로, 장축 자체는 수직으로 남아 표적을 향한 XZ 방향과 일치하지 않았다.

## 수정

- `getStunBoltVisualPose(dx, dz)`가 `x = PI/2`, `y = atan2(dx, dz)`, `z = 0`, `order = 'YXZ'` pose를 제공한다.
- Three.js `YXZ` 회전 순서에서 local +Y를 먼저 X축으로 눕힌 다음 yaw하므로 local +Y가 정규화한 `(dx, 0, dz)`와 일치한다.
- `StunBoltProjectile`은 yaw 단독 대입 대신 이 pose를 `rotation.set(...)`으로 즉시 적용한다.
- 0 또는 비정상 delta는 기본 yaw `0`을 사용한다.

## RULE-0.2

pose 객체는 모듈 스코프의 단일 객체를 갱신해 반환한다. 따라서 프레임 루프에서 object, array, Vector3, Quaternion을 새로 만들지 않는다.

## 검증

RED (수정 전):

```text
npx vitest run src/components/Weapons/StunGun.test.jsx
3 tests | 2 failed
- getStunBoltVisualPose: expected undefined to be type of 'function'
- source에 helper/rotation.set 적용 없음, rotation.y = Math.atan2(dx, dz) 존재
```

GREEN (수정 후):

```text
npx vitest run src/components/Weapons/StunGun.test.jsx src/lib/stunGun.test.js src/lib/weaponTargeting.test.js
Test Files  3 passed (3)
Tests  40 passed (40)
```

## 미변경 범위

이 수정은 StunBoltProjectile의 시각 pose에만 한정했다. 이동, 명중, 체인 아크, pooled `{rb, generation}`, `StudioTunedGroup`, Firebase 및 Graphics Studio 값은 변경하지 않았다.

---

## 체인 아크 stale endpoint 수정

### 원인

`ChainArcVisual`은 처음 명중한 순간의 `fromX/fromZ/toX/toZ`로 segment를 `useMemo`해 0.22초 동안 고정했다. 따라서 플레이어 또는 동일 generation의 적이 이동하면 호의 끝이 허공에 남았다. 반대로 pooled 슬롯이 despawn 뒤 재사용되면 같은 proxy가 새 generation의 좌표를 가리키므로, 이를 그대로 읽으면 이전 명중 호가 다른 적에게 점프할 위험이 있었다.

### live/fallback 정책

- player endpoint는 매 프레임 최신 `playerPos.x/z`를 사용한다.
- 적 endpoint는 `isEnemyHitLive(rb, generation)`이 참이고 translation의 x/z가 유한할 때만 최신 좌표를 사용한다.
- 사망, generation 불일치, 비정상 좌표는 명중 시 기록한 fallback impact 좌표를 계속 사용한다.
- endpoint resolver는 caller가 준 `out` 객체만 갱신해 프레임별 할당이 없다.

`ChainArcVisual`은 endpoint descriptor를 이벤트 시점에만 받고, 매 프레임 두 재사용 point와 5개의 고정 segment ref를 직접 갱신한다. geometry의 local +Z 길이는 1이고 매 프레임 `scale.z`에 실제 길이를 반영한다. 첫 transform 전에는 segment를 숨겨 원점 flash를 막는다.

개발 HMR에서 구형 arc state가 남아 `from`/`to` descriptor가 아직 없을 수 있으므로, point ref 초기값도 optional-safe하게 `(0, 0)` fallback으로 시작한다. resolver의 undefined endpoint 정책과 같아 새 `ChainArcVisual` mount가 fallback 읽기에서 중단되지 않는다.

체인 만료는 `doneRef`로 `onDone(id)`를 한 번만 호출해 React unmount 전의 중복 `setArcs`를 막는다. 또한 opacity 갱신은 `mats.forEach` 대신 index `for` loop를 사용해 프레임별 arrow callback 할당을 만들지 않는다.

### 검증

RED (구현 전):

```text
npx vitest run src/components/Weapons/StunGun.test.jsx
5 tests | 2 failed
- resolveStunArcEndpoint export가 undefined
- ChainArcVisual이 static useMemo([fromX, fromZ, toX, toZ])에만 의존
```

GREEN (구현 후):

```text
npx vitest run src/components/Weapons/StunGun.test.jsx src/lib/stunGun.test.js src/lib/weaponTargeting.test.js
Test Files  3 passed (3)
Tests  42 passed (42)
```

이 변경은 endpoint/segment 시각 갱신과 descriptor 배선에만 한정했다. 스턴건 이동·명중 규칙, chain damage 선택, 효과 색·수명·opacity, `StudioTunedGroup`, Firebase 및 Graphics Studio 값은 변경하지 않았다.

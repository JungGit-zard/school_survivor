# 스턴건 전기 스파크 조준·체인 endpoint 수정 QA — 2026-07-26

## 최종 판정

**통과.** `StunGun.jsx`의 투사체와 체인 호 시각 경로를 코드 검토하고, 지정된 회귀 테스트를 직접 실행했다. 별도의 Advisor 검증에서는 localhost E2E 새 게임으로 실제 발사·타격과 런타임 오류 0건을 확인했다. Firebase, Graphics Studio 또는 실제 사용자 데이터에는 접근하지 않았다.

## 검증 결과

- **투사체 조준 축:** `LightningBoltModel`의 긴 축인 local `+Y`를 `YXZ` Euler의 `x = π/2`, `y = atan2(dx, dz)`, `z = 0`으로 회전한다. `YXZ`에서 local `+Y`는 먼저 local `+Z`가 되고, yaw 뒤에는 `(sin(y), 0, cos(y)) = normalize(dx, 0, dz)`가 된다. cardinal 4방향과 `(3, 4)` 대각선을 수학 회귀 테스트로 확인했다.
- **체인 live endpoint:** 첫 호의 source는 매 프레임 `playerPos`를 읽고, 적 endpoint는 같은 generation에서만 현재 `translation()`을 읽는다. 적 사망·generation 불일치·좌표 비정상이면 마지막 impact fallback 좌표를 유지하므로, 재사용된 pool slot의 새 위치로 점프하지 않는다.
- **HMR 안전성:** 구형 arc state의 `from`/`to`가 없더라도 ref 초기화와 resolver가 `(0, 0)` fallback을 사용한다. undefined endpoint 회귀 테스트가 포함됐다.
- **5개 segment 갱신:** 각 프레임 5개 고정 group ref의 `position`, `rotation.y`, `scale.z`를 직접 갱신한다. local `+Z` 길이 1 geometry에 `scale.z`를 적용하므로 segment 길이도 실제 endpoint 거리를 반영한다.
- **초기 flash 방지:** segment group은 최초 `visible={false}`이며, 첫 transform 계산 뒤에만 `visible = true`가 된다.
- **프레임 경로 비용:** 신규 pose/endpoint point는 module singleton 또는 `useRef` 객체를 재사용한다. frame loop에 새 배열·객체·`Vector3`·`Quaternion` 생성이 없고, opacity도 `for` 인덱스 loop로 갱신한다. arrow `forEach` 할당은 제거됐다.
- **상태 갱신:** `doneRef`가 arc 만료 `onDone(id)`를 한 번만 호출해 unmount 전 중복 `setArcs`를 막는다. 이벤트 시점의 bolt/arc state 변경 외에 frame 중 React state 변경은 없다.
- **불변 범위:** 이동·타격·chain target 선택·pooled `{rb, generation}` hit guard·SFX·`StudioTunedGroup itemId="weapon-stun-gun"`·Firebase/Graphics Studio 입력 계약은 변경하지 않았다.

## RED / GREEN

RED 증거는 개발 기록에 남아 있다. 구 구현은 local `+Y` bolt에 yaw만 적용해 axis helper/`rotation.set` 계약 테스트 2건이 실패했고, static `fromX/fromZ/toX/toZ` chain 구현은 live endpoint resolver 및 frame transform 계약 테스트 2건을 통과하지 못했다. 따라서 두 RED는 각각 ‘목표 방향과 무관하게 수직인 전기 스파크’와 ‘이동/재사용 뒤 오래된 endpoint로 향하는 호’를 직접 잡는다.

GREEN은 다음을 직접 재실행해 확인했다.

```text
npx vitest run src/components/Weapons/StunGun.test.jsx src/lib/stunGun.test.js src/lib/weaponTargeting.test.js src/components/Weapons/AoeWeaponSfx.test.jsx src/components/Weapons/WeaponHitSfx.test.jsx

Test Files  5 passed (5)
Tests  56 passed (56)
```

`StunGun.test.jsx`는 축의 cardinal/diagonal 수학, 실제 `rotation.set` 적용, player/동일 generation live 좌표, 재사용 slot fallback, undefined endpoint fallback, frame endpoint/segment 갱신을 함께 검사한다. source 결합 assertion만으로 helper를 고쳐 놓고 runtime이 구 yaw 경로를 계속 쓰는 가짜 GREEN도 방지한다.

## Scoped diff 검증

지정 StunGun·targeting·SFX·문서 범위에 `git diff --check`을 실행했다. 오류는 없었다. 출력된 LF→CRLF 경고는 작업 트리 줄 끝 형식 안내이며 whitespace 오류가 아니다.

## 미실시

- 실제 게임 화면에서 220ms chain lifetime 동안 player/적을 이동시키는 수동 시각 검증은 수행하지 않았다.
- localhost E2E 브라우저 검증은 수행했지만, 라이브 Firebase와 Graphics Studio 화면 및 데이터는 사용하지 않았다.

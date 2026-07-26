# 전기충격기 최근접 타깃·그래픽 정렬 검증 — 2026-07-26

## 최종 판정: PASS

최근접 적 선택, 투사체 이동/그래픽 방향, 저프레임 오버슈트 방지와 기존 2.5초 playing-time 수명 계약을 모두 통과했다. 최초 검증에서 발견한 수명 회귀는 수정 후 독립 재검증으로 해소했다.

## 범위와 불변 조건

- 코드 변경은 하지 않았다. 이 기록과 `Developer/agent_room/` 라우팅 기록만 작성했다.
- 브라우저, Firebase, Graphics Studio를 사용하지 않았다.
- `StudioTunedGroup itemId="weapon-stun-gun"`, 효과 스케일 `scaleEffectVisual(0.38)`, 재질 생성 경로에는 변경이 없음을 확인했다.

## 실행 증거

2026-07-26 KST에 `Developer/r3f_prototype`에서 실행했다.

```powershell
npx vitest run src/components/Weapons/StunGunNearestTargetRegression.test.jsx src/components/Weapons/StunGun.test.jsx src/lib/stunGun.test.js src/lib/weaponTargeting.test.js src/components/Weapons/AoeWeaponSfx.test.jsx src/components/Weapons/WeaponHitSfx.test.jsx
```

- 결과: 6 test files, 57 tests passed.

```powershell
npm run build
```

- 결과: branch guard 통과, Legacy B02 source/artifact gate 통과, Vite production build 통과.
- 기존 500 kB 초과 chunk 경고만 있으며 이번 변경의 실패는 아니다.

```powershell
git diff --check -- Developer/r3f_prototype/src/components/Weapons/StunGun.jsx Developer/r3f_prototype/src/components/Weapons/StunGunNearestTargetRegression.test.jsx
```

- 결과: 출력 없음, 공백 오류 없음.

## 통과 확인

1. 최초 발사는 `findClosestEnemy(STUN_GUN_TARGET_RANGE)`의 반환값만 사용한다. 만들어지는 bolt state는 동일한 `nearest.rb`와 `nearest.generation`을 보관한다.
2. `StunBoltProjectile`는 보관한 `targetRb`/`targetGeneration`의 `isEnemyHitLive`와 `targetRb.translation()`만 사용한다. 비행 중 더 먼 적을 재탐색하거나 타깃을 교체하는 코드와 그래픽 endpoint 분리는 없다.
3. 이동과 회전은 동일 프레임의 `tt.x/z - posRef.current.x/z` 델타를 공유한다. `getStunBoltVisualPose(dx, dz)`는 LightningBoltModel의 local +Y 장축을 그 델타로 정렬한다.
4. 이동 거리는 `travel = Math.min(BOLT_SPEED * frameDelta, dist)`다. 따라서 각 프레임 이동량은 `dist` 이하이며, 표적을 넘겨 반대 방향을 보는 현상은 발생할 수 없다.
5. RED 회귀 시나리오(플레이어 0, 최근접 1, 더 먼 적 2, `delta=.1` 두 번)는 생산 코드 콜백을 직접 실행한다. 수정 전 예상 위치 `[1.6, 0]` 및 두 번째 프레임 그래픽 반전과 달리, 수정 후 위치는 약 `[0.5333, 1]`이고 +X 방향을 유지한다.
6. generation 불일치/사망 시 `isEnemyHitLive(targetRb, targetGeneration)`에서 만료한다. 체인 호 endpoint도 같은 generation일 때만 live translation을 쓰고, 슬롯 재사용 시 저장된 fallback으로 고정한다. 기존 live endpoint/orientation 변경은 유지된다.
7. `frameDelta = Math.min(delta, 1 / 30)`로 RULE-5.1의 프레임 이동 상한을 지킨다. 이동 경로에는 새 배열·객체 생성이 없고 재사용 ref/pose를 사용하므로 RULE-0.2 위반은 확인되지 않았다.

## 최초 FAIL 발견 이력: 2.5초 수명 의미 변경

현재 구현은 다음 순서다.

```js
const frameDelta = Math.min(delta, 1 / 30)
ageRef.current += frameDelta
if (ageRef.current > 2.5) { ... }
```

이전에는 `ageRef.current += delta`였다. 따라서 `delta = 1`초가 반복되는 1 FPS/긴 프레임 상황에서 실제 2.5초 후가 아니라 최대 약 75 프레임(약 75초) 뒤에 만료된다. 표적이 사거리 상한 부근에 있거나 지연이 길면 투사체가 원래보다 훨씬 오래 남고, 뒤늦게 맞거나 체인을 만들 수 있다. 이는 단순한 시각 보정이 아니라 게임플레이 수명 계약의 명백한 변경이다.

## 수정 및 재검증 결과

- 수정 구현은 `frameDelta = Math.min(delta, 1 / 30)`를 이동/포즈에만 사용하고, 수명은 `ageRef.current += delta`로 실제 playing-time 기준을 복원한다.
- 새 회귀 테스트는 `delta=.1`을 26회 실행해 2.6초에 `onExpire(id)`가 정확히 한 번 호출됨을 확인하고, 추가 10회에도 중복 호출이 없음을 확인한다.
- 수정 후 재실행 명령:

```powershell
npx vitest run src/components/Weapons/StunGunNearestTargetRegression.test.jsx src/components/Weapons/StunGun.test.jsx src/lib/stunGun.test.js src/lib/weaponTargeting.test.js src/components/Weapons/AoeWeaponSfx.test.jsx src/components/Weapons/WeaponHitSfx.test.jsx
npm run build
git diff --check -- Developer/r3f_prototype/src/components/Weapons/StunGun.jsx Developer/r3f_prototype/src/components/Weapons/StunGunNearestTargetRegression.test.jsx
```

- 최종 결과: Vitest 6 test files, **58 tests passed**. branch guard, Legacy B02 source/artifact gate, production build 및 scoped diff check 모두 통과했다.

## 잔여 위험

- 수명 연장 회귀는 이제 자동 테스트로 검증한다.
- 브라우저 수동 시각 검증은 수행하지 않았다. 실제 저FPS 환경의 시각적 체감은 별도 수동 QA 위험으로 남는다.

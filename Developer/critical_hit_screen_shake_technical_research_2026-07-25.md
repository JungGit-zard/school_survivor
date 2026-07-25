# 크리티컬 화면 흔들림 기술 조사

작성일: 2026-07-25  
상태: 구현 및 자동 검증 완료 — 실제 기기 플레이테스트 튜닝 대기

## 현재 확정 경로

크리티컬은 무기 발사 시점이 아니라 `resolveCriticalHit` 결과가 나온 피해 적용 경로에서 확정된다.

- 풀 기반 일반 좀비 경로: `Developer/r3f_prototype/src/components/Enemies.jsx`의 `pooledHitBridgeRef.current`에서 `resolveCriticalHitInto(...)` 뒤 `critical.isCritical`을 얻는다.
- 레거시/특수 적 경로: `Developer/r3f_prototype/src/components/Enemy.jsx`의 `_enemyHit`에서 `resolveCriticalHit(...)` 뒤 `criticalHit.isCritical`을 얻는다.
- 두 경로 모두 같은 프레임에 기존 damage number와 hit spark를 넣는다. 화면 흔들림 이벤트도 이 지점에서 한 번 발행해야 한다. `requestAnimationFrame`으로 데미지 숫자 큐를 drain하는 시점에서 흔들림을 시작하면 한 프레임 늦고, 중복 통합도 어려워진다.

## 권장 아키텍처

1. `critical.isCritical`/`criticalHit.isCritical`일 때만 positional scalar API인 `emitCriticalScreenShake(impactX, impactZ, strong)`를 호출한다. `strong`은 일반/강한 두 단계만 둔다.
2. 모듈 단일 이벤트/ref 상태는 최신 요청의 발생 시각, 강도, 방향, 종료 시각만 가진다. React state, localStorage, Firebase는 사용하지 않는다.
3. `Game.jsx`의 단일 follow camera rig가 `useFrame` 마지막 단계에서 이 상태를 읽는다. 기존 `camera.position.lerp(_camTarget, 0.08)`와 `camera.lookAt(fx, 0, fz)`로 기준 pose를 만든 후, 위치에만 transient offset을 더한다.
4. elapsed time에서 감쇠 펄스 값을 계산하고 종료되면 0으로 되돌린다. 다음 프레임에 기준 pose를 다시 만들므로 camera drift가 남지 않아야 한다.
5. 80ms coalesce 동안에는 최대 severity 하나만 유지하고, 140ms cooldown에서는 강도를 최대 1.25배로 제한한다. 배열/큐를 계속 쌓지 않는다.

## 반드시 지켜야 할 사항

- 반드시 `Game.jsx`를 유일한 카메라 적용 지점으로 한다. 무기나 적 컴포넌트가 카메라를 직접 조작하지 않는다.
- 반드시 프레임 경로에서는 사전 할당한 ref/숫자만 읽고 쓴다. `setState`, 객체/배열 생성, timer, `requestAnimationFrame`, projection matrix 갱신을 하지 않는다.
- 반드시 카메라 위치 offset만 적용한다. rotation, FOV, zoom은 1차에서 바꾸지 않는다.
- 반드시 reduced-motion (`matchMedia('(prefers-reduced-motion: reduce)')`) 또는 `document.documentElement.dataset.reducedEffects === 'true'`에서 이벤트를 무시하거나 강도 0으로 처리한다.
- 반드시 방향 계산은 화면 좌/우의 impact 위치로 하되, 화면 좌표가 없을 때에도 NaN이 나지 않는 결정론적 fallback을 둔다.

## 절대로 하면 안 되는 사항

- 절대로 damage number 이벤트 drain, 적 시각 컴포넌트, 무기별 effect에서 별개 shake를 시작하지 않는다.
- 절대로 hit마다 React 렌더 또는 카메라 `updateProjectionMatrix()`를 유발하지 않는다.
- 절대로 흔들림 offset을 카메라 기본 위치에 영구 누적하지 않는다.
- 절대로 1차 구현에 hit-stop, 시간 배율 변경, SFX/진동 파라미터 변경을 포함하지 않는다. 오디오는 별도 `soundmini` 검토가 필요한 범위다.

## 테스트 경로

- 순수 helper 테스트: impulse 감쇠, 90/140ms 종료, 80ms coalesce, 140ms cooldown, max 1.25배, 0/NaN 입력 fallback.
- 컴포넌트/소스 계약 테스트: 두 피해 확정 경로가 crit일 때만 이벤트를 내고 non-crit은 내지 않는지, `Game.jsx`가 기준 follow 계산 뒤 position-only offset을 적용하는지 확인.
- 회귀/성능 테스트: 10,000 critical event에서 배열 증가·React state flush·프레임 객체 할당이 없는지, 0.5초 후 base camera position과 lookAt이 정확히 복귀하는지 확인.
- 모바일 수동 검수: iPhone SE 비율, Android 저사양, reduced motion, 연사·광역 무기에서 HUD·가상 조이스틱·적 위치가 읽히는지 확인.

## 2026-07-25 구현 결과

### 실제 변경 파일

- `Developer/r3f_prototype/src/lib/criticalScreenShake.js`: 저장소·타이머·React state 없이 동작하는 단일 bounded runtime 상태와 감쇠 펄스 샘플러를 추가했다.
- `Developer/r3f_prototype/src/components/Enemies.jsx`: 풀 기반 적의 `resolveCriticalHitInto(...)` 직후 crit일 때만 emitter를 한 번 호출한다.
- `Developer/r3f_prototype/src/components/Enemy.jsx`: 특수/레거시 적의 `resolveCriticalHit(...)` 직후 crit일 때만 emitter를 한 번 호출한다.
- `Developer/r3f_prototype/src/components/Game.jsx`: 단일 follow camera rig에서만 화면 흔들림 위치 offset을 적용한다.
- `Developer/r3f_prototype/src/lib/criticalScreenShake.test.js`, `Developer/r3f_prototype/src/components/CriticalScreenShakeWiring.test.js`: 순수 런타임과 소스 배선 계약을 검증한다.

### 구현 구조

- 피격 경로는 객체 리터럴을 만들지 않는 positional scalar emitter `emitCriticalScreenShake(impactX, impactZ, strong, requestedStrength, nowMs)`만 호출한다. `impactX`/`impactZ`는 플레이어에서 적까지의 지면 방향이며, 0 또는 NaN은 결정론적 +X fallback으로 처리한다.
- emitter는 배열·큐·timer·`requestAnimationFrame` 없이 모듈 내부 숫자 상태 하나만 유지한다. 80ms coalesce 창에서는 더 강한 요청만 남기며 기존 시작 시각을 연장하지 않는다. 80~140ms 구간은 cooldown으로 새 요청을 무시한다.
- `matchMedia('(prefers-reduced-motion: reduce)')` 결과는 모듈에서 lazy 1회 캐시하고 이후에는 `.matches`만 읽는다. 테스트 reset hook은 이 cache도 비운다. `data-reduced-effects='true'`는 매 샘플에서 확인한다.
- `Game.jsx`는 프레임 시작 시 이전 camera offset을 제거한 후 기존 follow `lerp`와 `lookAt`으로 clean base pose를 만든다. 그 뒤 사전 할당한 camera-local right/up 벡터에 position offset만 더하고, 이번 offset을 다음 프레임 제거용 ref에 보관한다. rotation, FOV, zoom, HUD, CSS transform은 변경하지 않는다.
- reduced-motion이 실행 중에 켜지면 활성 impulse를 즉시 취소한다. 설정을 다시 꺼도 취소된 이전 흔들림은 재개하지 않으며, 기존 cooldown 시각은 유지한다.

### 구현 수치

| 구분 | 지속시간 | 가로 진폭 | 세로 진폭 |
| --- | ---: | ---: | ---: |
| 일반 crit | 90ms | 화면폭 0.7% | 화면폭 0.35% |
| strong crit | 140ms | 화면폭 1.15% | 화면폭 0.55% |

- strong 조건은 보스 처치 또는 최종 피해가 유효한 대상 최대 체력의 25% 이상일 때다. 최대 체력이 유효하지 않으면 일반 crit으로 처리한다.
- 펄스는 시작 충격 뒤 세 번의 결정론적 방향 반전과 quadratic 감쇠를 사용한다.
- coalesce는 80ms, cooldown은 140ms, 요청 strength 상한은 1.25배다.

## 참고 자료

- Unity Cinemachine event/source/listener impulse: https://docs.unity3d.com/ja/Packages/com.unity.cinemachine%402.6/manual/CinemachineImpulseSource.html
- Unreal Camera Shake duration/scale/blend/single instance: https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-shakes-in-unreal-engine
- Web reduced-motion 표준: https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion
- 위 자료는 exact timing 표준이 아니다. 본 수치와 구조 선택은 이 프로젝트를 위한 조사 기반 권장 초안이며 플레이테스트 튜닝 대상이다.

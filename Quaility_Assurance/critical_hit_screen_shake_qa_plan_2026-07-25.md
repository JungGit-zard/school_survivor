# 크리티컬 화면 흔들림 QA 계획

작성일: 2026-07-25  
상태: 자동 검증 완료 — 데스크톱·모바일 수동 검수 대기

## 검증 전제

1차 구현 기준은 일반 crit 90ms, X 화면폭 0.7%/Y 0.35%(또는 2~4px 상당), strong crit 140ms/X 1.15%/Y 0.55%, 80ms coalesce, 140ms cooldown, 최대 1.25배다. 이 값은 조사 기반 권장 초안이며 플레이테스트로 확정한다.

## 반드시 지켜야 할 사항

- 반드시 일반 피해, miss, 시야 차단 피해, 공격 시작에는 shake event가 0회인지 확인한다.
- 반드시 풀 기반 `Enemies.jsx`와 특수/레거시 `Enemy.jsx`의 크리티컬 피해 확정 경로 각각에서 정확히 1회 event가 나오는지 확인한다.
- 반드시 일반 crit이 90ms 이내에 0으로 복귀하고, strong crit만 140ms 프로필을 쓰는지 확인한다.
- 반드시 80ms 안의 다발 crit은 가장 강한 하나로 coalesce되고, 140ms cooldown 동안 무한한 겹침이 발생하지 않으며 최대 강도가 1.25배를 넘지 않는지 확인한다.
- 반드시 `prefers-reduced-motion: reduce`와 `data-reduced-effects='true'` 각각에서 카메라 이동이 0인지 확인한다. 대신 critical damage number/색상/피격 flash는 유지되어야 한다.
- 반드시 각 shake 종료 후 0.5초 이내 camera position, lookAt target, FOV, zoom이 shake 직전의 follow 계산 결과와 동일한지 확인한다. NaN/Infinity와 누적 drift는 실패다.
- 반드시 10,000 crit event soak에서 pool 누수, 배열 증가, React render 폭증, 프레임당 객체 생성, 카메라 projection 갱신이 없는지 점검한다.
- 반드시 iPhone SE급 좁은 화면과 Android 저사양 실기기/에뮬레이터에서 HUD, 가상 조이스틱, 적·플레이어 위치가 계속 판독 가능한지 수동 검수한다.

## 절대로 하면 안 되는 사항

- 절대로 테스트 편의상 reduced-motion gate를 비활성화하거나 사용자 설정을 덮어쓰지 않는다.
- 절대로 연속 crit 테스트 중 카메라 기준 위치·FOV·zoom을 테스트 후 다른 값으로 남기지 않는다.
- 절대로 hit-stop, 사운드, 진동을 이번 화면 흔들림 검수에 포함된 것으로 보고하지 않는다. 이들은 1차 범위 밖이다.
- 절대로 단일 데스크톱 화면만 보고 모바일 연출 검수를 완료로 처리하지 않는다.

## 통과 기준

| 항목 | 통과 조건 |
| --- | --- |
| Crit 전용성 | 두 피해 확정 경로에서 crit만 event 1회, non-crit 0회 |
| 다발 제어 | 80ms coalesce/140ms cooldown/max 1.25배 준수 |
| 카메라 안전성 | position-only, FOV/zoom/rotation 불변, 종료 후 drift 0 |
| 접근성 | OS reduced motion과 게임 연출 줄이기에서 shake 0 |
| 성능 | 10,000 event soak에서 NaN·누수·프레임 경로 할당 없음 |
| 모바일 | 좁은 화면/저사양에서 조작과 전투 가독성 유지 |

## 조사 근거

- Apple은 빠른 이동·점멸 효과의 멀미/주의 분산 위험과 reduced motion 대응을 안내한다. https://developer.apple.com/design/human-interface-guidelines/accessibility/
- Android는 모바일 haptic에서 과도한 피드백을 피하고, 이벤트 중요도·빈도에 맞는 강도를 쓰며, 시각·음향·촉각을 동기화해 설계하라고 안내한다. 향후 진동을 별도 검토할 때의 원칙이며 이번 구현 범위에는 진동을 추가하지 않는다. https://developer.android.com/develop/ui/views/haptics/haptics-principles
- Unity와 Unreal의 camera shake 문서는 impulse, duration, scale, single-instance 같은 제어 모델을 제공하지만 크리티컬의 exact timing 표준을 정의하지 않는다. 따라서 본 QA 수치는 조사 기반 권장 초안이며 플레이테스트 튜닝 대상이다. https://docs.unity3d.com/ja/Packages/com.unity.cinemachine%402.6/manual/CinemachineImpulse.html / https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-shakes-in-unreal-engine

## 2026-07-25 구현 자동 검증 결과

아래 항목은 메인 Advisor가 직접 실행해 확인한 자동 검증 결과다. 자동 검증 통과는 실제 기기에서의 체감·가독성 검수를 대체하지 않는다.

| 명령 | 결과 |
| --- | --- |
| `npm exec -- vitest run src/lib/criticalScreenShake.test.js src/lib/criticalHits.test.js src/components/CriticalScreenShakeWiring.test.js src/components/Enemies.test.jsx --reporter=verbose` | 4 files, 93 tests 통과 |
| `npm run build` | 통과. prebuild의 branch guard와 Legacy B02 source gate, postbuild의 Legacy B02 artifact gate 모두 통과 |
| `git diff --check` | 통과 |

- 빌드 중 `vendor-three` minified chunk가 500kB를 초과한다는 Vite 경고가 출력됐다. 이번 화면 흔들림 구현이 새로 만든 실패가 아니라 기존 빌드의 chunk-size 경고이며, 빌드는 성공했다.
- 순수 런타임 테스트는 normal/strong duration, 시작 펄스·감쇠·종료 0, 80ms coalesce, 140ms cooldown, 1.25배 상한, NaN fallback, reduced-motion, reset isolation, 10,000 rapid crit bounded state를 포함한다.
- 소스 배선 계약 테스트는 풀 기반/특수 적의 crit-only positional emitter 호출과 `Game.jsx`의 이전 offset 제거 후 position-only 적용을 검사한다.

### 아직 미실시·대기

- 데스크톱 실제 플레이 체감 검수는 아직 미실시다.
- iPhone SE급 화면과 Android 저사양 실기기/에뮬레이터의 실제 체감·HUD·가상 조이스틱 가독성 검수는 아직 미실시다.
- 실제 브라우저에서 OS `prefers-reduced-motion`을 켜고 끄는 수동 검수는 아직 미실시다.

위 항목들은 완료로 처리하지 않으며, 별도 수동 검수 증거가 생길 때까지 대기 상태다.

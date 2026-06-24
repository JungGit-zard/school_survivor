# CompassBlade black screen fix - 2026-06-25

## Request

- 게임 플레이 중 갑자기 화면이 검게 변하는 현상을 의심 지점까지 전수조사한다.
- 재현되는 원인이 있으면 코드 수정과 검증까지 진행한다.

## Investigation summary

- 기존 QA 로그 `Quaility_Assurance/stage1_visual_loop_screenshot_pass_2026-06-24.output.json`에는 `GL_OUT_OF_MEMORY`, `CONTEXT_LOST_WEBGL`, `THREE.WebGLRenderer: Context Lost.`가 있었다.
- 이번 브라우저 재현에서는 보스/다수 무기 스트레스 이후 Rapier WASM 예외가 먼저 발생했다.
- 예외 메시지는 `RuntimeError: unreachable`, `recursive use of an object detected`, `null pointer passed to rust`, `expected instance of EA`였다.
- 스택은 `src/components/Weapons/CompassBlade.jsx`의 `rbRefs.current[i]?.setTranslation(...)` 경로를 가리켰다.
- `compassBlade`를 끄고 같은 스트레스를 걸면 오류가 사라졌고, `compassBlade`만 켜도 오류가 재현되어 원인을 `CompassBlade`로 좁혔다.

## Root cause

`CompassBlade`는 5회 타격 폭발 후 5초 리스폰 창에 들어갈 때 `RigidBody`와 시각 그룹을 조건부 렌더링에서 제거했다.

이후 프레임 루프가 이전 Rapier rigid body ref를 다시 움직이려 하면서, 이미 해제된 WASM 객체에 `setTranslation`을 호출하는 상황이 생겼다. Rapier 내부에서 이 상태가 안전하지 않은 객체 재사용으로 처리되어 런타임 예외가 났고, 앱에는 Canvas 주변 ErrorBoundary가 없어 예외가 화면 전체 공백/블랙처럼 보이는 증상으로 이어졌다.

## Code change

- `src/lib/compassBlade.js`
  - `shouldRenderCompassBladeHitBodies({ active })`를 추가했다.
  - 활성 무기인 동안에는 리스폰 중에도 Rapier hit body를 유지하도록 규칙을 테스트 가능한 순수 함수로 분리했다.

- `src/components/Weapons/CompassBlade.jsx`
  - 리스폰 중 hit `RigidBody`를 언마운트하지 않는다.
  - 대신 `PARKED_BLADE_POSITION`으로 멀리 주차하고 시각 그룹만 숨긴다.
  - ref callback에서 `node ?? null`을 저장해 unmount 시 오래된 ref가 남지 않게 했다.
  - 리스폰 종료 후 시각 그룹을 다시 보이게 한다.

- `src/components/Weapons/CompassBlade.test.jsx`
  - 리스폰 중에도 활성 `compassBlade` hit body가 렌더링되어야 한다는 회귀 테스트를 추가했다.

## Additional suspicious areas checked

- `App.jsx`에는 Canvas를 감싸는 ErrorBoundary가 없다. 이번 수정으로 직접 원인은 해결됐지만, 다른 런타임 예외가 생기면 여전히 전체 화면이 비는 식으로 보일 수 있다.
- `SchoolBag`은 물리 바디를 제거하지 않고 멀리 주차하는 방식이라 이번 유형과 같은 고위험 패턴은 아니었다.
- `Tumbler`, `Player`, `Enemy`, 투사체 무기들의 `setTranslation`/`setLinvel` 사용처를 검색했지만, 리스폰 중 물리 바디를 제거하면서 같은 ref를 계속 움직이는 패턴은 `CompassBlade`가 유일하게 직접 확인됐다.
- `document.body.innerHTML = ''`, 게임 런타임에서 canvas 제거, 검은 배경으로 덮는 로직은 발견되지 않았다.

## Follow-up risk

- 기존 QA 로그의 WebGL 메모리 부족/컨텍스트 로스트는 브라우저/그래픽 드라이버 경로에서 별도로 발생할 수 있는 잔여 위험이다.
- 이번 패치는 직접 재현된 Rapier 예외성 블랙스크린 원인을 해결한다.
- 장기적으로는 Canvas 근처 ErrorBoundary를 추가하면 비슷한 예외가 나도 완전한 블랙/공백 화면 대신 복구 UI를 보여줄 수 있다.

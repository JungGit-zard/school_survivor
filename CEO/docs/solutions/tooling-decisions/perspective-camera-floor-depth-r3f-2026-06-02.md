---
title: "원근 카메라로 바닥 깊이감 주기 (직교 투영은 원근 후퇴가 불가능) — R3F"
date: 2026-06-02
category: tooling-decisions
module: r3f-prototype-rendering
problem_type: tooling_decision
component: frontend_stimulus
severity: low
applies_when:
  - "탑다운 바닥/지면이 화면 상단으로 갈수록 멀어지는 3D 깊이감을 원할 때"
  - "react-three-fiber에서 카메라 투영(직교 orthographic vs 원근 perspective)을 결정할 때"
  - "직교 룩을 거의 유지하면서 아주 미세한 입체감만 더하고 싶을 때"
applies_when_not:
  - "순수 2D/평면 룩이 의도된 경우 — 직교 유지가 맞다"
  - "넓은 FOV의 강한 원근 왜곡이 탑다운 가독성을 해치는 경우"
tags: [react-three-fiber, three-js, camera, perspective, orthographic, camera-follow, floor]
related_components: [app, game, classroom-floor]
---

# 원근 카메라로 바닥 깊이감 주기 (직교 투영은 원근 후퇴가 불가능) — R3F

## Context

`Escape! zombie school`은 탑다운 카메라가 45°로 플레이어를 따라다니는 R3F 게임이다.
Stage1 바닥을 타일 이미지(`tile_stage01`)로 이어붙인 뒤, "화면 상단으로 갈수록
아주 미세하게 멀어지는" 3D 깊이감을 추가하려 했다. 처음 제안은 **"바닥 메시를
살짝 눕히면 된다"**였는데, 이게 동작하지 않는 이유를 먼저 이해해야 했다.

핵심 제약: 카메라가 **직교 투영(`<Canvas orthographic>`)**이었다. 직교는 평행
투영이라 거리에 따른 축소(원근 후퇴)가 없다. 따라서:

1. **직교에서 바닥을 기울여도** "상단일수록 멀어지는" 그라데이션이 안 생긴다 —
   바닥 전체가 균일하게 납작해질 뿐이다.
2. 바닥(96×96)은 월드 원점 고정인데 캐릭터는 `y=0`에 서므로, 큰 바닥을 기울이면
   먼 가장자리가 `y=0`에서 크게 벌어져 **화면 위쪽 캐릭터가 바닥에서 뜬다.**

## Guidance

원근 후퇴(상단일수록 멀어짐)의 정확한 도구는 **원근 카메라(perspective)**다.
바닥을 기울이지 말고 카메라 투영을 바꾼다. 두 가지를 반드시 같이 챙긴다:

1. **좁은 FOV로 미세하게.** `fov ~24–32°`면 직교에 가까운 룩을 유지하면서
   아주 약한 깊이감만 더한다. FOV가 넓을수록 원근 왜곡이 강해진다.
2. **카메라 추적을 두 곳에서 동기화.** R3F에서 `<Canvas camera={...}>`는 *초기*
   카메라만 정한다. 매 프레임 추적은 별도 `useFrame`에서 `camera.position`을
   갱신한다. 두 곳의 위치(거리)가 다르면 첫 프레임에 점프하거나 의도와 다른 줌이 된다.

또 하나의 함정: **같은 카메라 위치에서 직교→원근으로 바꾸면 화면이 줌아웃된다.**
직교 `zoom`과 원근 `fov`는 프레이밍 척도가 달라서, fov 30°·동일 위치는 기존 직교보다
더 넓은 영역을 보여준다. 그래서 전환 후 **카메라를 당겨(추적 거리 축소)** 프레이밍을
복원해야 한다. 이때도 위 2곳을 함께 바꾼다.

전환 전 안전 점검: 코드 어디서도 `camera.zoom`을 읽거나 직교를 가정한 3D→2D
좌표 변환을 하지 않는지 확인한다(`grep`). 빌보드(예: `camera.quaternion` 복사)와
추적 로직은 두 투영 모두에서 동일하게 동작한다.

## Why This Matters

- 직교를 고수한 채 "바닥 눕히기"로 깊이감을 내려는 시도는 **근본적으로 막다른
  길**이다(평행 투영엔 그라데이션이 없음 + 정렬 붕괴). 투영을 바꾸는 게 정답이다.
- 카메라 종류 전환은 전역 비주얼을 바꾸므로, 프레이밍(줌)·추적 동기화를 함께
  처리하지 않으면 "왜 멀어졌지?" 같은 후속 버그가 따라온다(실제로 전환 직후
  줌아웃이 보고됐고, 추적 거리 `20 → 17`로 당겨 해결).
- `<Canvas>` 카메라 종류 변경은 HMR로 완전히 안 바뀔 수 있다 — 평평해 보이면
  페이지 새로고침(F5)이 필요하다.

## When to Apply

- 탑다운/쿼터뷰 바닥이 상단으로 후퇴하는 입체감이 필요할 때
- 직교 룩을 거의 유지하면서 미세 깊이만 원할 때(→ 좁은 FOV)
- 반대로, 의도가 순수 평면이면 직교를 유지(이 패턴 적용 안 함)

## Examples

**Before — 직교 (원근 후퇴 불가):** `src/App.jsx`

```jsx
<Canvas
  orthographic
  camera={{ zoom: 60, position: [0, 20, 20], near: 0.1, far: 500 }}
  shadows
  gl={{ stencil: true }}
>
```

**After — 좁은 FOV 원근 + 당긴 거리:** `src/App.jsx`

```jsx
<Canvas
  // 좁은 화각(fov)으로 직교에 가깝되, 상단으로 갈수록 미세하게 멀어지는 깊이감.
  camera={{ fov: 30, position: [0, 17, 17], near: 0.1, far: 500 }}
  shadows
  gl={{ stencil: true }}
>
```

**추적은 반드시 같은 거리로 동기화:** `src/components/Game.jsx`

```js
// smooth camera follow — App.jsx 초기 위치와 같은 거리(17)로 맞춘다
_camTarget.set(playerPos.x, 17, playerPos.z + 17)
camera.position.lerp(_camTarget, 0.08)
camera.lookAt(playerPos.x, 0, playerPos.z)
```

참고로 바닥 자체는 절차적 캔버스 텍스처 대신 타일 이미지를 `RepeatWrapping`으로
이어붙였다(`src/components/ClassroomFloor.jsx`). 깊이감은 카메라가, 패턴은 타일이
담당하도록 책임을 분리한 것이 핵심이다 — 바닥 메시를 건드리지 않는다.

```js
const tex = new THREE.TextureLoader().load(FLOOR_TILE.src)
tex.wrapS = tex.wrapT = THREE.RepeatWrapping
tex.repeat.set(FLOOR_TILE.repeat, FLOOR_TILE.repeat) // 밀도 = repeat
tex.colorSpace = THREE.SRGBColorSpace
```

## Related

- 커밋 `6134978` (바닥 타일링 + 직교→원근 전환), `84f5a86` (카메라 당김 20→17)
- `CEO/docs/solutions/architecture-patterns/` — 게임 구조 패턴 모음

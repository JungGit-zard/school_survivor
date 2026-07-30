# 포털 흡입 프레임 시계 정합성 수정 (2026-07-30)

## 반드시 지킬 사항

- 포털 흡입 완료는 `gameplayFrameTime.js`의 Rapier 정합 계약(최대 0.5초 clamp, 1/60초 fixed step, residual 유지)만 사용한다.
- `phase !== 'playing'`에서는 회전과 흡입 시간이 모두 진행하지 않는다.
- 포털 반경, SFX, Firebase/Studio 데이터와 시각 자산은 변경하지 않는다.

## 변경

`src/lib/portalSuctionClock.js`는 공통 fixed-step clock을 감싼 최소 포털 전용 시간 상태다. `EscapePortal`은 raw render delta를 이 clock에 전달하고, helper가 공통 clamp와 residual 처리를 수행한다. 회전은 같은 clamp된 delta만 사용한다.

흡입 시각 전환은 React 상태를 쓰지 않는다. `suckingRef`가 유일한 흡입 정본이며, 시작 순간 `portalVisualState.js`가 ring/glow material과 point light ref에 기존 흰색·발광·투명도·광량 값을 직접 적용한다. 따라서 `useFrame` 안의 React setter와 그에 따른 리렌더가 없다.

흡입을 시작한 프레임은 타이머를 0으로 재설정하고 SFX만 재생한다. 그 프레임의 delta는 흡입 시간에 넣지 않으며, 다음 `playing` 프레임부터 1/60초 step을 소비한다. 따라서 숨김 탭에서 돌아온 큰 delta가 포털 진입과 완료를 같은 프레임에 건너뛰지 않는다.

## 검증 기준

- 1초 raw delta 한 번은 0.5초만 반영되어 완료되지 않는다.
- 0.5초 raw delta 두 번은 정확히 1.0초로 완료 조건에 도달한다.
- 120Hz에서는 두 렌더가 1개의 1/60초 흡입 step을 만든다.
- clock은 완료 도달 프레임에만 `completedNow: true`를 한 번 반환하고, `clearedRef` 기존 가드가 완료 콜백과 완료 SFX를 정확히 한 번으로 제한한다.
- `EscapePortal`에는 `useState`/`setSucking`이 없고, ring/glow material 및 point light ref를 통해 기존 시각값을 적용한다.

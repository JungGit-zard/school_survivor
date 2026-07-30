# 포털 방향·거리 목표 HUD 구현 기록

- 날짜: 2026-07-30
- 범위: Stage 1~4의 활성 탈출 포털을 향한 HUD 안내만 추가

## 구현

- `EscapePortal`은 마운트 시 선택한 `x/z`를 `portalTarget` 런타임 ref에 1회 게시하고, 언마운트 및 런타임 reset 시 완전히 정리한다.
- `HUD`는 `phase === 'playing'` 및 `escapePortalActive`일 때만 250ms interval로 `playerPos`와 `portalTarget`을 읽는다. R3F `useFrame` 안에서 React state를 갱신하지 않는다.
- 방향은 `Game.jsx` 카메라 정본(`camera=(fx, 17, fz+17)` → `focus=(fx, 0, fz)`)에 따라 월드 `-z`를 화면 위쪽으로 하는 8방향 화살표다. 즉 `-z→↑`, `+x/-z→↗`, `+x→→`, `+x/+z→↘`, `+z→↓`, `-x/+z→↙`, `-x→←`, `-x/-z→↖`로 변환한다. 거리는 정본 `ZOMBIE_METER_WORLD_UNITS = 0.75`를 사용해 올림한 `zm`이다. 따라서 0이 아닌 거리에는 0zm이 표시되지 않는다.
- 기존 3초 `탈출구가 나타났다!` toast는 유지했다. 목표 HUD는 하단 중앙(`bottom: 102px`)에 배치해 상단 시간·골드·일시정지와 보스 경고 영역을 침범하지 않으며, 입력 요소가 아니다.

## 경계

- Firebase, Graphics Studio, 인증, 브라우저 저장소를 읽거나 변경하지 않았다.
- 포털의 3D 링·플레이어 외곽선·월드 마커를 추가하거나 변경하지 않았다.

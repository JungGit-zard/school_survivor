# 포털 방향·거리 목표 HUD 검증

- 날짜: 2026-07-30
- 실행 위치: `Developer/r3f_prototype`

## 자동 검증

실행:

```text
npm.cmd test -- src/lib/portalObjective.test.js src/components/EscapePortal.target.test.jsx src/components/HUD.test.jsx
```

결과: **3 files / 38 tests PASS**.

- `Game.jsx` 카메라 정본에 맞춰 8방향 월드 좌표 `-z`, `+x/-z`, `+x`, `+x/+z`, `+z`, `-x/+z`, `-x`, `-x/-z`가 각각 `↑↗→↘↓↙←↖`로 변환됨을 확인한다.
- 1zm = 0.75 world units 정본을 사용하고, 안내 거리를 올림 처리함을 확인했다.
- `EscapePortal` 마운트 시 target 게시, 언마운트 시 `{ active: false, x: 0, z: 0 }` 정리를 확인했다.
- playing+active 상태의 HUD에서 시각 목표·정적 screen-reader status를 확인했고, paused 전환 시 숨김을 확인했다.

## 정적 확인

- `HUD.jsx`에는 `useFrame` import/call이 없으며, 목표 표시의 React state 갱신은 250ms interval에서만 발생한다.
- Firebase/Graphics Studio/localStorage 접근 또는 3D 장면 오브젝트 추가가 이번 diff에 없다.

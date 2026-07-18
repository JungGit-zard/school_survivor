# E06 Late Wave Spawn Pressure 2 Percent Implementation - 2026-05-30

## 연결 파일

- 기획: `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Monster_Wave/e06_late_wave_spawn_pressure_2_percent_2026-05-30.md`
- 구현: `Developer/r3f_prototype/src/components/Enemies.jsx`
- 테스트: `Developer/r3f_prototype/src/components/Enemies.test.jsx`

## 구현 내용

- `WAVE_PHASES`를 테스트에서 검증할 수 있도록 export했다.
- `210-240s` 구간의 `E06` weight를 `0.03`에서 `0.02`로 낮췄다.
- 전체 weight 합계가 1을 유지하도록 `E01` weight를 `0.20`에서 `0.21`로 올렸다.
- `BURST_EVENTS`의 `210s E06 x1`은 첫 등장 신호용이라 유지했다.

## 의도

- 후반 큰 좀비 부담만 낮추고, 전체 적 밀도와 스테이지 흐름은 유지한다.

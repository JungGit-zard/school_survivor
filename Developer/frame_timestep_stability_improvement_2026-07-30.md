# 프레임 타임스텝 안정화 기록 — 2026-07-30

## 변경 근거

- `GameCanvas`의 Rapier `timeStep="vary"`는 렌더 프레임 delta를 그대로 물리 스텝에 사용해 기기 FPS에 따라 충돌과 넉백 결과가 달라질 수 있었다.
- `enemySimulation`은 이미 최대 `1 / 30`초를 사용하지만, `Game`, `usePlayingFrame`, `Player`는 각각 `0.1`초 또는 원본 delta를 사용했다. 탭 복귀나 느린 프레임에서 게임 시간, 카메라 추적, 플레이어 넉백·무적 시간이 서로 다른 만큼 진행될 수 있었다.
- `@react-three/rapier` 1.4 설치 문서에서 숫자형 `timeStep`(예: `timeStep={1 / 30}`)과 가변 문자열 `"vary"`를 각각 지원함을 확인했다. 따라서 `timeStep={1 / 60}`으로 명시했다.

## 적용 내용

- Rapier는 `1 / 60`초 고정 timestep을 사용한다. 기존 `key={gameKey}`, gravity, `paused={phase !== 'playing'}` 계약은 유지했다.
- `src/lib/gameplayFrameTime.js`에 최대 `1 / 30`초 단일 정책을 두고 Game runtime/camera follow, `usePlayingFrame`, Player의 넉백·방향 전환·무적 타이머가 같은 정책을 사용한다.
- 런타임 정본의 구조는 변경하지 않았고, `advanceRuntimeTime`에 전달되는 한 프레임 진행량만 clamp했다. useFrame에 새 store 갱신이나 scheduler/accumulator는 추가하지 않았다.

## 안정화 규칙 §6 진단 결과

1. 재현 입력을 30/60/120Hz 정상 frame delta와 탭 복귀를 대표하는 0.2s/1s spike로 고정했다.
2. 기존 `StageEntryRuntimeDiagnostics`, 적 풀 수/NaN·경계 검사 경로를 확인했다. 이번 최소 수정에는 별도 HUD/계측을 추가하지 않았다.
3. 적 simulation의 유한값 검사와 풀 불변식을 확인했고, 이 변경은 새 프레임 객체·React state 갱신을 만들지 않는다.
4. 위험 분기는 고정 물리 timestep 부재와 frame delta 정책 불일치로 분류했다. frustum, instance matrix, stale body 경로는 이번 근거에서 원인이 아니었다.
5. 공통 순수 함수로 시간 정책만 축소해 적용했다. 새로운 프레임 scheduler 또는 accumulator는 만들지 않았다.
6. 정상 delta 보존, spike clamp, Physics 고정 step, pause 계약 및 각 소비자의 공통 정책 사용을 대상 회귀 테스트로 검증한다.

## 한계와 검증 범위

- 대상 테스트: `npm.cmd exec -- vitest run src/lib/gameplayFrameTime.test.js src/lib/usePlayingFrame.test.js src/components/GameCanvas.test.js src/components/Game.runtimeTime.test.js src/components/Player.test.js` — 5 files, 12 tests 통과.
- `git diff --check` 통과. 다른 worker 변경과 충돌할 수 있어 전체 build는 이번 작업에서 실행하지 않았다.
- 실제 Android Canvas/Rapier 30/60/120Hz 통합 soak 및 visibility 반복 검증은 별도 작업이다. 이번 테스트는 순수 정책과 소스 wiring을 검증한다.
- Firebase, Graphics Studio, localStorage 및 저장 경로는 변경하지 않았다.

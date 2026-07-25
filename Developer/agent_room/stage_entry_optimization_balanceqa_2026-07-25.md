# 스테이지 진입 최적화 balanceqa 수용 검토

일자: 2026-07-25  
담당: balanceqa (Terra Worker)

## 확인한 구현

- 로비는 게임 청크를 idle 시점에, 선택 스테이지의 텍스처를 카드 focus/hover 및 쇼타임 시작 시점에 미리 요청한다. 별도 Canvas를 만들지 않아 GPU 컨텍스트를 중복 생성하지 않는다.
- `GameCanvas`는 유지하고 `Physics`만 `gameKey`로 교체한다. 피해 숫자, 일반 좀비, 적 투사체의 GPU 풀은 Rapier 밖에 유지하며 `resetKey`에서 기존 인스턴스 행렬을 동기 초기화한다.
- `StageEntryRuntimeDiagnostics`는 실제 게임 Canvas에서 shader compile을 시작한다. 재시작의 새 Physics subtree도 예열하도록 `gameKey`별 1회로 수정했다. DEV 이외에는 metric mark/event를 만들지 않으며 storage를 사용하지 않는다.
- Stage 1 책상·의자·쓰러진 학생은 1×1×1 BoxGeometry와 toon/outline material cache를 공유한다. `StudioTunedGroup`은 동일 `itemId`와 자식 트리를 유지하며, Firebase Studio 재질 수정은 각 Object3D의 clone으로 격리되어 공유 원본을 오염시키지 않는다.
- `ClassroomFloor`는 R3F loader cache를 사용한다. Stage 2 끝벽은 Stage 2에서만 요청하고 loader cache texture는 dispose하지 않는다. Stage 3 절차 텍스처/재질만 로컬 소유로 해제한다. Stage 4는 전용 cafeteria tile과 preload를 사용한다.
- 일반 풀 적은 FIFO 순서를 유지하며 RAF당 최대 3개를 소비한다. stage/game token, pause/resume, reset/unmount cleanup이 이전 run 적의 유입을 막는다. 보스 special은 즉시 경로를 유지한다.

## 검수 중 수정한 결함

1. retained Canvas에서 boolean 예열 가드가 새 `gameKey`의 Physics subtree compile을 막던 문제를 `lastWarmupGameKeyRef`로 변경했다.
2. Zombie reset이 health trail/flash 및 instance alpha를 남기던 문제를 초기화했다. 다만 체력바 기본/현재 HP와 그림자는 프레임 경로가 alpha를 매 프레임 다시 쓰지 않으므로 1, trail/smoke만 0으로 복원하도록 수정했다.

## 검증

- focused Vitest: 8 files, 118 tests passed.
- production build: passed (`vite build`, legacy B02 source/artifact gate passed).
- stage-entry 대상 파일 `git diff --check`: passed. 전체 작업트리 검사에는 동시 작업 중인 `StageObjects/stageObjectPlacements.{js,test.js}`의 기존 CRLF trailing-whitespace가 남아 있어 실패하며, 본 검수 범위에서는 수정하지 않았다.
- localStorage/sessionStorage: 이번 최적화 경로에 추가·변경 없음.

## 남은 릴리스 전 외부 게이트

- 실기기/Android WebView에서 stage1 첫 진입·재시작의 frame time, draw calls, texture/geometry 수를 계측한다.
- 첫 wave가 3마리 단위로 실제 프레임에 분산되고 보스가 지연 없이 보이는지 실플레이로 확인한다.
- 전체 `npm test -- --run`은 현재 환경에서 RUN 헤더 후 85초 이상 결과 없이 정지했다. 기본 풀 2회와 one-worker 1회를 중지했으며, 수용 근거는 위 focused tests와 build다.

## Subagent mandatory routing

Board: `escape-zombie-school`  
Trigger: Three/R3F stage-entry performance optimization acceptance  
Specialists involved: `threemini`, `levelmini`, `balanceqa`  
Artifacts: `Developer/agent_room/stage_entry_optimization_threemini_2026-07-25.md`, `Developer/agent_room/stage_entry_optimization_levelmini_2026-07-25.md`, this document

# E2E 런타임 성능 프로브 구현 기록

## 반드시 지킬 사항

- `?e2e=1&e2eperf=1`인 개발 환경에서만 실행한다. 일반 E2E와 프로덕션에서는 DOM, RAF, 이벤트 리스너를 만들지 않는다.
- Firebase, Graphics Studio, localStorage에는 접근하거나 값을 저장하지 않는다.
- RAF 중에는 React/Zustand 상태를 갱신하지 않고, 완료 시 결과를 한 번만 렌더한다.
- 숨김 탭 프레임은 p50/p95/p99에서 제외하고 visibility 전환만 기록한다.

## 구현

- `src/lib/e2eRuntimePerformance.js`: 기간 clamp(기본 60초, 5~600초), percentile, long-frame, Canvas/메모리 스냅샷, 최종 JSON 계약.
- `src/components/E2ERuntimePerformanceDiagnostics.jsx`: 실제 게임 Canvas의 RAF 및 `webglcontextlost`, 기존 stage-entry 이벤트를 읽는다.
- `ReadyGameApp` 게임 화면에만 시각적으로 숨긴 `data-testid` 상태/JSON 영역을 조건부로 연결했다.

측정하지 않는 GPU 메모리와 LUFS는 결과의 limitations에 명시적으로 제외했다.

# E2E 런타임 성능 프로브 검증 기록

## 검증 기준

- strict DEV URL gate: `?e2e=1&e2eperf=1`만 허용.
- `e2eperfseconds` 기본 60초, 5~600초 clamp, 잘못된 값은 기본값.
- 첫 RAF baseline은 표본에서 제외하고 숨김 상태 프레임도 percentile에서 제외.
- 결과 DOM 계약: `e2e-runtime-performance-status`, `e2e-runtime-performance-json`.
- cleanup: RAF, visibility, stage-entry, WebGL context-loss 리스너 해제.
- 결과에는 Canvas 크기/DPR, stage-entry renderer 요약, WebGL context-loss, 지원 여부를 포함한 performance.memory만 포함하며 GPU 메모리/LUFS를 주장하지 않음.

## 실행 예정 명령

```powershell
npm.cmd test -- src/lib/e2eAuth.test.js src/lib/e2eRuntimePerformance.test.js src/components/E2ERuntimePerformanceDiagnostics.test.jsx
npm.cmd run build
git diff --check
```

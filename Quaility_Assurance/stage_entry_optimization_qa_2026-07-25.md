# 스테이지 진입 최적화 QA 결과

일자: 2026-07-25  
결론: 코드 수용, 모바일 실측은 릴리스 전 필수

## 통과

- Stage 1 프롭 공유 geometry/material 및 Studio 재질 clone 격리
- Stage 1~4 바닥 텍스처 매핑, Stage 2 끝벽 조건 로드, loader-cache texture 비-dispose
- actual gameplay Canvas의 gameKey별 shader warmup, DEV 한정 metric event
- retained damage/zombie/projectile 풀의 resetKey 행렬·health·alpha 초기화
- 일반 적 FIFO, 3마리/RAF 제한, stale token/reset/pause cleanup, 보스 즉시 생성
- 추가 localStorage/Firebase 변경 없음

## 자동 검증

- 영향 테스트 8파일 / 118개 통과
- `npm run build` 통과
- stage-entry 대상 `git diff --check` 통과. 전체 작업트리 검사는 동시 작업의 `stageObjectPlacements` CRLF trailing-whitespace로 보류

## 보류

- 전체 Vitest는 이 환경에서 결과 출력 없이 정지하여 자동 완주 증거가 없다. 기본 병렬 실행 2회와 maxWorkers=1 실행 모두 85초 이상 대기 후 종료했다.
- 실제 모바일에서 첫 진입/재시작 프레임 시간, draw call, GPU texture/geometry 개수를 수집해야 한다.
- Stage 1 첫 wave의 3마리 단위 분산과 보스 즉시성을 Android WebView에서 확인해야 한다.

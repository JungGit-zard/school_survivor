# 일시정지 타이틀 복귀 랭킹 QA 기록

## 자동 테스트

- 명령: `npm test -- HUD.test.jsx`
- 결과: 통과
- 검증 항목:
  - 일시정지 화면에 `타이틀로 돌아가기` 버튼이 표시된다.
  - 첫 클릭은 타이틀로 이동하지 않고 확인 UI를 연다.
  - 확인 전에는 플레이어 기록이 저장되지 않는다.
  - `돌아가기` 확인 후 타이틀 이동 콜백이 호출된다.
  - 현재 생존 시간 42초가 로컬 랭킹 후보 점수에 반영된다.
  - 중도 종료는 클리어로 기록되지 않는다.

## 추가 검증 예정

## 추가 검증 결과

- 명령: `npm run build`
- 결과: 통과
- 비고: Vite의 큰 청크 경고가 있으나 기존 번들 크기 경고이며 빌드 실패는 아니다.

## 남은 위험

- 명령: `npm test`
- 결과: 실패 1건, 통과 319건
- 실패: `src/lib/playerMovementBounds.test.js`
- 원인: 현재 `stage1.mapHalfX` 값이 7이라 실제 Stage 1 이동 X 범위가 `-5~5`로 계산되지만, 기존 테스트는 `-12~12`를 기대한다.
- 판단: 일시정지 타이틀 복귀/랭킹 저장 변경과 직접 관련 없는 Stage 1 이동 경계 기대값 불일치다.
- 필요 조치: Stage 1 교실 폭 축소가 의도된 변경인지 확인한 뒤 테스트 기대값 또는 맵 경계값을 별도 작업으로 정리한다.

## 브라우저 수동 검증

- 환경: Chrome headless, `390x844`, `http://localhost:5173`
- 결과: 통과
- 확인:
  - 타이틀에서 닉네임 입력 후 게임 시작 가능.
  - 게임 HUD에 일시정지 버튼이 표시된다.
  - 일시정지 후 `계속하기`, `타이틀로 돌아가기`가 표시된다.
  - `타이틀로 돌아가기` 클릭 후 확인 UI가 표시된다.
  - 확인 UI에는 `취소`, `돌아가기`가 표시된다.
  - `돌아가기` 확인 후 타이틀 화면으로 복귀한다.
  - `school_survivor:playerRecords`에 `totalRuns`, `totalSurvivalSeconds`, `bestSurvivalSeconds`가 기록된다.
- 스크린샷:
  - `Quaility_Assurance/pause_return_title_game_2026-06-28.png`
  - `Quaility_Assurance/pause_return_title_paused_2026-06-28.png`
  - `Quaility_Assurance/pause_return_title_confirm_2026-06-28.png`
  - `Quaility_Assurance/pause_return_title_after_confirm_2026-06-28.png`

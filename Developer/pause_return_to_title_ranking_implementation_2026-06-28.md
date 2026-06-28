# 일시정지 타이틀 복귀 구현 기록

## 변경 요약

- `useGameStore`에 `quitPausedRun` 액션을 추가했다.
- `quitPausedRun`은 `phase === 'paused'`일 때만 실행되며, 기존 `_onRunEnd('quit')` 경로로 현재 런 기록을 저장한다.
- `HUD` 일시정지 패널에 `타이틀로 돌아가기` 버튼과 확인 UI를 추가했다.
- 확인 버튼을 누르면 기록 저장 후 `onGoToTitle` 콜백으로 타이틀 화면에 복귀한다.

## 구현 기준

- 새 점수 계산식을 만들지 않고 기존 `getRankingScore` 정책을 재사용한다.
- `quit` 종료는 `cleared: false`로 처리한다.
- 첫 클릭은 확인 UI만 열고 기록/화면 이동은 하지 않는다.

## 수정 파일

- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.test.jsx`

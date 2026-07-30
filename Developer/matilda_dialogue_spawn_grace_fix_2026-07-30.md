# 마틸다 등장 대사 스폰 유예 수정

## 증상과 원인

- Stage 1 180초에 `matildaSpawned=true`가 된 직후 HUD는 4.5초 등장 대사를 표시했다.
- 같은 상태 변경을 구독하는 `Enemies.jsx`는 마틸다 실체와 AI를 즉시 추가했다.
- 대사는 HUD의 표시 상태일 뿐 게임 phase나 AI를 멈추지 않는다. 따라서 플레이어는 대사를 읽는 동안 기존 즉사급 충돌 피해를 피할 반응 시간이 없었다.

## 수정 계약

- `MATILDA_DIALOGUE_MS=4500`을 `src/lib/matildaEntryGrace.js`의 단일 상수로 두고 HUD와 Enemies가 함께 사용한다.
- `matildaSpawned`는 대사를 즉시 시작하지만, 마틸다 실체와 AI는 4500ms의 **게임 진행 시간** 전까지 생성하지 않는다.
- 유예는 `setTimeout` 벽시계가 아니라 `usePlayingFrame`의 고정 step에서만 감소한다. pause 또는 레벨업 선택 중에는 남은 시간이 보존된다.
- 60Hz 고정 step을 270회 적용하면 부동소수점 잔여 오차를 허용치로 정리해 정확히 270번째 step에서 한 번 완료한다.
- 4500ms의 진행 시간이 지나도 예약 당시 `gameKey`와 `currentStageId`가 현재 런과 같고, 마틸다 트리거가 유효하며 런이 종료되지 않은 경우에만 정확히 한 번 스폰한다.
- reset, 같은 스테이지 재시작, 스테이지 변경, 컴포넌트 언마운트에서는 effect cleanup이 pending entry를 취소한다.
- 마틸다의 HP, 즉사급 충돌 피해, 이동속도, 돌진 스탯과 AI는 변경하지 않았다.
- 전체 게임 phase, 일반 적, 웨이브와 스테이지 타임라인은 변경하지 않았다.

## 회귀 테스트

- `matildaEntryGrace.test.js`
  - 4.4초의 게임 진행 시간에는 스폰하지 않는다.
  - 남은 0.1초의 게임 진행 후 정확히 한 번 스폰한다.
  - 1/60초 step 269회에는 미스폰이고 270번째 step에서 정확히 한 번 스폰한다.
  - pause/레벨업 중에는 프레임 step이 호출되지 않아 남은 유예 시간이 변하지 않는다.
  - 이후 시간을 더 진행해도 중복 스폰하지 않는다.
  - cleanup 후에는 stale 스폰하지 않는다.
  - stage/run token, gameover/cleared가 stale이면 스폰 자격을 폐기한다.
- `Enemies.test.jsx`
  - 즉시 `addEnemies`가 아니라 게임 진행 step 유예가 끝난 뒤 스폰하는 연결을 검증한다.
  - `gameKey`, `currentStageId`, terminal stale 방어와 cleanup을 검증한다.
- `HUD.test.jsx`
  - 등장 대사 표시 시간도 같은 `MATILDA_DIALOGUE_MS`를 사용한다.

검증 명령:

`npm.cmd test -- --run src/lib/matildaEntryGrace.test.js src/components/Enemies.test.jsx src/components/HUD.test.jsx`

결과: 3 files, 103 tests 통과.

Firebase 실데이터, Graphics Studio, localStorage에는 접근하거나 변경하지 않았다.

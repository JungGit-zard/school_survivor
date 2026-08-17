# 전 스테이지 마틸다 210초 런타임 반영

- 모든 `stageConfig`의 `matildaWarningSec`은 205초, `matildaSec`은 210초다.
- `Game.jsx`는 205초에 등장 대사를 시작하고, `Enemies.jsx`는 `matildaSec - matildaWarningSec` 5초 grace가 끝난 뒤 실제 AI/실체를 한 번 스폰한다.
- 따라서 실제 등장 시각은 210초다.
- Stage 3 overtime 시작 설정과 보스 150초 설정은 변경하지 않았다.

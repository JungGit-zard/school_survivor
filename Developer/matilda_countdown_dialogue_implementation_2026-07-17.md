# 마틸다 5초 카운트다운 및 등장 대사 구현 기록

## 변경 파일

- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.test.jsx`
- `Developer/r3f_prototype/src/assets/character/matilda_conversation.png`

## 구현 내용

- 마틸다 카운트다운 상수 `MATILDA_COUNTDOWN_SECONDS = 5`를 추가했다.
- HUD 카운트다운 시작점을 기존 `stageConfig.matildaWarningSec` 대신 `stageConfig.matildaSec - 5`로 계산하도록 바꿨다.
- `matildaSpawned`가 `false`에서 `true`로 바뀌는 순간 HUD 내부 상태 `matildaDialogueVisible`을 켜고, 4.5초 후 자동으로 닫히게 했다.
- 요청 원본 이미지 `Graphic_designer/graphic_asset/boss_etc/matilda_conversation.png`를 앱 번들에서 안정적으로 import할 수 있도록 `src/assets/character/matilda_conversation.png`로 복사해 사용했다.
- 하단 RPG식 대사창을 추가했다.
  - 이름: `마틸다`
  - 대사: `오호호호! 떡하나주면 안잡아먹지!`

## 테스트 보강

- `HUD.test.jsx`에 마틸다 등장 연출 테스트를 추가했다.
  - 스테이지 3 기준 스폰 6초 전에는 카운트다운이 보이지 않는다.
  - 스폰 5초 전에는 `5`, 1초 전에는 `1`이 표시된다.
  - 스폰 시 마틸다 프로필 이미지, 이름, 대사가 표시되고 4.5초 후 사라진다.

## 검증 메모

- 현재 실행 환경은 WSL 1 Node 실행 문제로 자동 테스트를 수행하지 못했다.
- 실패 메시지: `WSL 1 is not supported. Please upgrade to WSL 2 or above. Could not determine Node.js install directory`
- Windows `cmd.exe` 우회 실행도 현재 컨테이너에서 `Exec format error`로 실행되지 않았다.

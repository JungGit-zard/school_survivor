# 타이틀 닉네임 시작 흐름 구현 기록 - 2026-06-21

## 구현 요약

- `TitleScreen.jsx`에서 `게임 시작` 버튼을 누르면 닉네임 입력 모달을 열도록 변경했다.
- 닉네임을 저장한 뒤에만 `onStart(stageId)`를 호출해 실제 게임이 시작된다.
- `userNickname.js`를 추가해 닉네임 정규화, 검증, uid별 저장/읽기를 분리했다.
- `firebaseProgress.js`의 `buildCloudUserProfile()`이 `profile.nickname`을 포함하도록 확장했다.
- `userRanking.js`는 저장된 닉네임을 Google 표시명보다 우선 사용한다.

## 닉네임 규칙

- 앞뒤 공백 제거.
- 여러 공백은 하나로 축약.
- 2글자 이상 12글자 이하.
- Google 로그인 유저는 `uid` 기준으로 저장.
- 비로그인 유저는 `local` 기준으로 저장.

## 주요 파일

- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/lib/userNickname.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/userRanking.js`
- `Developer/r3f_prototype/src/lib/userNickname.test.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.test.js`
- `Developer/r3f_prototype/src/lib/userRanking.test.js`
- `Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx`

## 검증

- 닉네임 관련 테스트를 먼저 실패시킨 뒤 구현했다.
- 전체 Vitest 테스트와 Vite 빌드를 통과했다.
- 브라우저에서 게임 시작 버튼, 닉네임 입력, 저장 후 게임 진입, localStorage 저장을 확인했다.

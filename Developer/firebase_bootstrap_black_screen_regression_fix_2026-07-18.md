# Firebase 부트스트랩 검정 화면 회귀 수정

## 증상

- 게임 루트에 접속하거나 새로고침하면 화면이 완전히 검게 남고 React UI가 나타나지 않았다.
- Firebase 계정 진행도 hydrate 이전에 `not-hydrated` 예외가 발생하여 로그인 화면과 오류 안내도 마운트되지 못했다.

## 원인

- `App.jsx`가 게임 런타임 모듈을 정적으로 불러왔다.
- 그 모듈 그래프에는 `TitleScreen`, `useGameStore`, 진행도 기반 설정 로더가 포함되어 있었다.
- Firebase 인증 확인과 원격 진행도 hydrate가 끝나기 전에 게임 런타임이 평가·렌더되어 fail-closed 예외가 React 부트 UI보다 먼저 발생했다.

## 수정

- `App.jsx`를 Firebase 부트 경계로 제한했다.
- 게임 런타임은 `ReadyGameApp.jsx`로 분리하고, 인증된 사용자의 원격 진행도 hydrate가 성공한 뒤에만 지연 로드한다.
- 미로그인 상태에서는 기존 `GoogleAccountPanel`을 렌더한다.
- 원격 진행도 로딩 중에는 빈 root 대신 명시적인 준비 화면을 렌더한다.
- 원격 읽기 실패 시 `role="alertdialog"` 오류 UI로 실행을 중단하며 로컬 데이터로 대체하지 않는다.
- 게임 저장소, 타이틀 설정, 플레이테스트 로거, 키보드 입력 초기화는 Firebase 부트 경계를 통과하기 전에는 실행되지 않는다.
- Graphics Studio의 Firebase 단일 저장 정책과 Apply 차단 정책은 변경하지 않았다.

## 회귀 테스트

- `App.firebaseBootstrap.test.jsx`
  - 미로그인 Google 로그인 UI
  - hydrate 중 비어 있지 않은 로딩 UI
  - 원격 실패 alertdialog
  - hydrate 성공 뒤에만 게임 런타임 로드
- 기존 `App.virtualJoystick.test.jsx`는 지연 로딩 완료를 기다린 뒤 UI 동작을 검증하도록 조정했다.

## 검증

- focused test: 4개 파일, 26개 테스트 통과
- Advisor focused test: 5개 파일, 51개 테스트 통과
- `npm run build`: 통과
- `git diff --check` 대상 파일: 통과


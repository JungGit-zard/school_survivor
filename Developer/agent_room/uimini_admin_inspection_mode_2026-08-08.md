# UIMini 점검 모드 UI 작업 기록

## 수행 범위

- 관리자 페이지에 `점검 모드` 탭을 추가했다.
- 점검 시작/종료 시각, 안내문, 원격 상태, 점검 시작 및 즉시 종료 제어를 Firebase 점검 모드 계약으로 연결했다.
- 일반 게임 경로에는 활성 점검 기간에만 전면 점검 화면을 표시했다.
- `/admin`과 `/graphics-studio` 경로는 점검 화면을 우회해 관리와 Studio 접근을 유지했다.

## 안전 기준

- 입력과 원격 상태에는 `firebaseInspectionMode` 계약만 사용하며 브라우저 저장소를 사용하지 않는다.
- 구독 실패는 일반 게임 경로를 차단하지 않는 fail-open 처리다.
- App은 점검 시작과 종료 시각에 타이머로 상태를 재평가하며 정리(cleanup)한다.

## 검증

- `AdminPage.test.jsx`: 기간/안내문 점검 시작과 즉시 종료 호출을 확인했다.
- `InspectionModeScreen.test.jsx`: 안내문과 남은 시간 갱신을 확인했다.
- `App.firebaseBootstrap.test.jsx`: 활성 화면, 만료 상태, 관리자 우회, 구독 실패 fail-open, 예약 시작/종료 자동 전환을 확인했다.

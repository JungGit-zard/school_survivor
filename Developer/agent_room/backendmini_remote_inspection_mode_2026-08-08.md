# Backendmini — 원격 점검 모드 경계

## 작업 범위

- RTDB 정본 경로: `runtimeControl/v1/inspection`
- 공개 앱은 읽기 및 실시간 구독만 가능하다.
- 쓰기는 Firebase Authentication에서 검증된 Google 최고관리자 `zard5388@gmail.com`만 가능하다.
- 브라우저 저장소는 사용하지 않는다. 실제 Firebase 데이터 접근·배포는 수행하지 않았다.

## 구현 근거

- `src/lib/firebaseInspectionMode.js`가 Firebase 기존 설정과 프로젝트 관리자 판별을 재사용한다.
- 시작은 정수 밀리초, 종료가 시작보다 뒤, 최대 7일, 서버 시각 기준 과거 5분·미래 7일 이내만 허용한다.
- 구독의 누락·손상 데이터 또는 권한/네트워크 오류는 안전한 비활성 상태와 `status: 'error'`로 전달한다.
- RTDB 규칙은 공개 읽기, Google 최고관리자 전용 쓰기, 명시한 7개 필드 이외 거부를 강제한다.

## 검증 기준

- `firebaseInspectionMode.test.js`: 정상 시작/정지, 최고관리자 확인, 기간·메시지 검증, 구독 오류 fail-closed.
- `databaseRules.test.js`: 점검 제어 경로의 공개 읽기, 관리자 쓰기, 기간/스키마/$other 거부 규칙.

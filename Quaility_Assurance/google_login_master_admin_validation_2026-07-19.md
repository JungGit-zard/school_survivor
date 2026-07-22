# Google 로그인 최고관리자 검증 — 2026-07-19

## 검증 범위

- 이미 완료된 기존 타이틀 `게임 시작 → Google 로그인` 절차를 변경하지 않음
- `zard5388@gmail.com` 최고관리자 판정
- 이메일 미검증·비Google 공급자·유사 이메일·E2E 사용자 거부
- `/admin` 미로그인·일반 사용자·최고관리자 경계
- Realtime Database 소유자 또는 서버 검증 최고관리자 Rules
- 기존 Capacitor native Google credential 연결과 메모리 전용 인증 지속성 보존

## 보안 판정

최고관리자는 다음 조건을 모두 만족할 때만 인정한다.

1. 이메일을 정규화한 결과가 정확히 `zard5388@gmail.com`
2. Firebase Authentication의 `emailVerified`가 `true`
3. 로그인 공급자에 `google.com`이 존재

클라이언트에서는 화면과 `/admin` 진입을 차단하고, Realtime Database Rules에서는 Firebase가 발급한 인증 토큰의 다음 값을 다시 검사한다.

- `auth.token.email`
- `auth.token.email_verified`
- `auth.token.firebase.sign_in_provider`

인증 토큰·Google OAuth 토큰·Firebase ID/갱신 토큰을 Realtime Database 또는 브라우저 저장소에 복제하는 코드는 추가하지 않았다.

## 자동 검증

- 최고관리자 판정, Firebase 사용자 정규화, Rules 구조, 기존 database rules: 19 tests passed
- App 일반 루트 및 `/admin` 인증 경계: 7 tests passed
- Google 계정 패널 최고관리자 표시: 4 tests passed
- 기존 타이틀 Google 로그인 시작 절차: 1 test passed
- 합계: 35 tests passed

추가 검증:

- `database.rules.json` JSON parse 통과
- 인증 관련 변경 파일 `git diff --check` 통과
- `npm run build` 통과
- branch guard 통과
- Legacy B02 source/artifact gate 통과

React `act(...)` 경고와 Three.js 번들 크기 경고는 기존 테스트·빌드 환경 경고이며 실패는 아니다.

## 판정

로컬 코드 및 자동 검증 기준 PASS.

- 일반 사용자는 기존 타이틀 Google 로그인 절차 하나로 진입한다.
- 최고관리자는 별도 로그인 절차 없이 같은 Google 로그인으로 판정된다.
- 일반 계정이나 검증되지 않은 동일 이메일 문자열은 관리자 권한을 얻지 못한다.

## 미수행

- 최고관리자 실제 Google 계정 로그인
- Firebase Console 설정 변경
- Realtime Database Rules 배포
- Android/AAB 생성 및 실기기 로그인

따라서 최고관리자 Rules가 운영 Firebase에 적용되려면 검토 후 별도 Rules 배포가 필요하다.

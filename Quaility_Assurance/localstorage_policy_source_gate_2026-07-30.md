# localStorage 소스 정책 게이트 — 2026-07-30

## 판정 기준

- `src/lib/localStoragePolicy.test.js`가 `src`의 `.js`/`.jsx` 소스를 검사한다.
- 주석과 문자열은 검사 대상이 아니다.
- 실행 가능한 `localStorage.getItem`, `setItem`, `removeItem`, `clear`, `key` 호출만 검사한다.
- 일반 production 파일에서는 호출이 0개여야 한다.
- 테스트 호출은 아래 전용 음성 테스트 두 파일만 허용한다.
  - `lib/firebaseProgress.test.js`: 플레이어 데이터 키의 storage 접근이 fatal error가 되는지 검증.
  - `lib/studioLocalStorageGuard.test.js`: Graphics Studio storage 접근이 fatal error가 되는지 검증.

## Firebase 안전 경계

- 테스트는 Firebase 정본을 읽거나 쓰지 않는다. 기존 in-memory test helper와 mock client만 사용한다.
- 실제 `localStorage` 초기화나 상태 확인을 테스트 격리 수단으로 사용하지 않는다.
- Graphics Studio의 Firebase-only guard 구현은 유지한다.

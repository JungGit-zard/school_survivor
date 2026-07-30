# localStorage 정책 테스트 정리 — 2026-07-30

## 변경

- Firebase 메모리 테스트 레이어로 전환된 뒤 남은 `localStorage.clear`, `removeItem`, `getItem`, `length` 초기화·검증을 테스트에서 제거했다.
- 계정 진행도, 플레이 기록, 무기 해금, 패시브·타이틀 설정 검증은 기존 Firebase 메모리 테스트 helper와 런타임 스냅샷만 사용한다.
- 금지 접근이 실제로 예외를 내는 전용 음성 테스트만 유지했다.
  - `src/lib/firebaseProgress.test.js`
  - `src/lib/studioLocalStorageGuard.test.js`
- 새 `src/lib/localStoragePolicy.test.js`는 주석·문자열을 제외하고 실행 가능한 저장소 메서드 호출만 검사한다. 일반 production 소스와 allowlist 밖 테스트에서 호출이 발견되면 실패한다.

## 범위 및 안전성

- Firebase Realtime Database와 실제 브라우저 저장소에는 접근하지 않았다.
- Graphics Studio guard 동작은 변경하지 않았다.
- 이번 작업은 테스트 코드와 정적 정책 게이트만 변경하며 production 동작을 변경하지 않는다.

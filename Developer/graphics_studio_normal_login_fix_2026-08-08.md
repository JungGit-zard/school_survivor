# Graphics Studio normal login fix — 2026-08-08

## 반드시 지킬 사항

- Firebase Auth는 `initializeAuth(app, { persistence: inMemoryPersistence })`로만 시작한다.
- `getAuth()` 후 persistence를 바꾸는 경로, `browserLocalPersistence`, `browserSessionPersistence` 선택·fallback은 사용하지 않는다.
- 새 페이지의 `/graphics-studio`는 Firebase `onAuthStateChanged`가 이번 페이지에서 성공한 Google 로그인 사용자를 전달하기 전까지 로그인 게이트만 표시한다.
- Studio 권한은 기존의 정확한 마스터 Google 계정 검증(`email`, `emailVerified`, `google.com`)을 유지한다.

## 검증

- `src/lib/firebaseAuth.test.js`: 메모리 전용 초기화와 fail-closed 동작을 검증한다.

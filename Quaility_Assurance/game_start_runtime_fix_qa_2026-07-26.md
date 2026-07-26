# 게임 시작 런타임 수정 QA — 2026-07-26

## Advisor 실제 검증 결과

- Firebase/타이틀 관련 Vitest: 4 files, 45 tests PASS
- 시각 풀 관련 Vitest: 3 files, 19 tests PASS
- `npm run build`: PASS
- Playwright `localhost` E2E: 타이틀 → 로비 → Stage 1 인트로 → 전투 timer `00:04` 확인
  - canvas: 1
  - errors: 0
- Firebase `users` subtree 전후 SHA256: `223cf1504f2d26095a814ac9bc6d67840a719b299c3a7728067780464016d9c9`로 동일

## 미검증 범위

- AAB 빌드·실기기 WebView 검증은 수행하지 않았다.
- 실제 Google 로그인 검증은 수행하지 않았다.

# 게스트 FirebaseProgressError 집중 회귀 검증

- 관련 카드: `t_80e18a74`, backendmini 수정 / balanceqa 범위의 Advisor 실화면 재검증.
- 사용자 증상과 같은 `ensureHydrated → readFirebasePlayerProgress → weaponUnlocks → HUD useMemo` 오류를 실제 HUD 렌더 후 XP 획득으로 재현했다. 게임오버/클리어 미리보기와 게스트 진동설정 조회도 수정 전 실패를 확인했다.
- 수정 후 집중 테스트 4개 파일, 23/23 통과(2026-10-05 KST).
- 검사: guest levelup 카드4개 표시, gameover/cleared 미리보기, guest 계정 snapshot 불변(uid 없음/progress=null), 로그인 uid가 있는 미hydrate 실패 보존, 실제 hydrate 진동 true/false 준수, 기존 무기 해금/무기도감 회귀.
- 실제 사용자 Firebase 정본을 대상으로 테스트하지 않았다. 자동 테스트는 메모리 snapshot과 기존 fake transport만 사용했다. 계정/Auth/로컬 캐시를 만들지 않았다.
- Advisor 실제 로컬 브라우저 게스트 35초 재검증 PASS: `errors: []`. Stage 1 `00:22` 게임오버 정상 결과 UI(다시시작/타이틀/코인상점/랭킹)에 도달했다. 기존 ensureHydrated ErrorBoundary와 진동설정 pageerror가 재발하지 않았다.
- 인증/Firebase 구현은 변경하지 않았으며, 이번 게스트 실행은 실제 OAuth 로그인 검증을 대신하지 않는다.

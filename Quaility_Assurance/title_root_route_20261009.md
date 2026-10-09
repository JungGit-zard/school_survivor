# 타이틀 기본 경로·홈페이지 링크 QA 및 배포 — 2026-10-09

- 사용자 최신 요청: `/`에 게임 타이틀, 타이틀의 `홈페이지로`는 `/landing`, 기존 `/game` 유지. 기존 `/` 랜딩 잠금에 대한 이번 명시 요청을 우선 적용했다.
- 배포 소스: `91648ecb`. live/preview version: `4a480f372ee18d1f`. release: `2026-10-09T05:50:41.052Z`.
- 격리 clone: `C:/Users/admin/AppData/Local/Temp/escape-route-release-20261009`. 소스·배포 승인과 최종 시각 검토는 Advisor 담당.

## 검증 결과

- `npm test -- src/App.firebaseBootstrap.test.jsx src/components/TitleScreen.settings.test.jsx src/components/WebLandingPage.test.jsx src/lib/i18nCoverage.test.js`: pretest 필수 검사 통과, 65개 중 64개 통과. 실패 1개는 기존 치트 모달의 `hanako` 해금 기대값(`TitleScreen.settings.test.jsx`)이다. Worker가 변경 전 HEAD 원본 두 파일의 임시 복사본에서도 같은 실패(line 397)를 재현했다고 Advisor가 확인했다. 전체 통과로 기록하지 않는다. 경로·홈페이지 링크·번역·랜딩 검사는 통과했다.
- release 담당 증거: Studio 45개 검사, 프로덕션 빌드, Hosting 자산 55개 검사 통과 후 preview에서 live로 승격했다.
- Advisor는 실제 `https://escapezombie.com/` HTTP 200 및 HTML이 빌드 dist와 동일함을 확인했다(`index-DE8J3Zjn.js`).
- 로컬 `http://localhost:5187/`와 배포 후 fresh 세션 `https://escapezombie.com/`에서 타이틀 표시 → `홈페이지로` 클릭 → `/landing` 공식 홈페이지 → 상단 `게임 시작` 클릭 → `/game` 타이틀 표시를 직접 확인했다.
- 로컬 390×844 화면에서 게임 시작·로그인 없이 들어가기·홈페이지로 버튼 모두 화면 내 표시되고 잘리지 않았다. 검토 캡처: `C:/Users/admin/AppData/Local/Temp/route-title-mobile-20261009.png`.
- live 확인 중 CLI `wait --url` 한 번이 소켓 응답 제한으로 실패했다. 별도 `get url`과 DOM snapshot으로 실제 `/landing` 도착 및 이후 `/game` 왕복을 확인했다.

## 데이터·검증 경계

브라우저는 새 격리 세션에서 시작했고 첫 사이트 방문 전에 `**/*.firebasedatabase.app/**`, `**/*.firebaseio.com/**` 요청을 차단했다. 실제 사용자 Firebase 정본·revision 조회나 수정, 로그인 시도, 게임 시작 버튼을 통한 런 진입은 하지 않았다. 따라서 사용자 데이터 스냅샷을 만들거나 복구할 원격 변경도 없었다. 이번 브라우저 판정은 경로·링크·버튼 표시이며 차단 상태의 모델 시각 품질이나 실제 인증 성공을 검증했다는 뜻이 아니다. 테스트 브라우저 세션을 닫았으며 기존 5173 개발 서버는 변경하지 않았다.

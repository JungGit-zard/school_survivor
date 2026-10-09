# 홈페이지 레이아웃 QA — 2026-10-10

- 대상: `escape-landing-layout-20261010` 격리 clone, `http://localhost:5188/landing`.
- balanceqa 필독 checker common/ui/qa 통과. receipt `426e865305304af5b51853819201ca953be6526c07cb9070692d0d58d215ffc2`. Kanban 라우팅은 Advisor 관리, QA 관련성은 반응형·CTA·키보드 동작 검수다.
- 코드 수정 없이 브라우저 검수하고 Worker에게 수정 요청을 전달했다. 자동 테스트는 중복 실행하지 않았으며 Worker가 WebLandingPage 10/10 통과를 보고했다.

## 실제 브라우저 결과

- 1280×720: 주 플레이 버튼이 첫 화면 y391~446에 완전히 보인다. 기존 하단 중복 `모바일에서 바로 플레이` 제거를 재확인했다. 우측 기존 3D 장면은 표시된다. 안내 카드가 장면의 하단 일부를 덮는 기존 구성은 유지된다.
- 390×844: 페이지 전체 가로 넘침 없음(390/390). 주 버튼55px, 보조 버튼44px 높이. 최초 화면 sticky 버튼 없음. 기존 nav/hero/sticky 3중 CTA 경쟁이 해소됐다.
- 320×844: 일본어·영어 문구가 줄바꿈되고 hero 가로 넘침 없음. 영어 주·보조 버튼 영역 y459~580, 첫 화면에 보임. 긴 일본어 보조 문구도 버튼 안에 표시됐다.
- 짧은 메뉴의 너비25px 문제를 발견해 Worker에 전달했고 `min-width:44px` 반영 후 음악·영상·새소식 각각44px를 재확인했다. 메뉴 높이44px, 긴 메뉴는 가로 스크롤로 접근한다.
- hero 버튼이 보일 때 sticky=false, 850px 스크롤 후 hero 버튼 하단 -270px에서 sticky=true. 초기 이중 버튼 노출 없음.
- 영어 `How to Play` 메뉴 클릭으로 `#section-start` 도착, 대상 상단 y132 확인. 메뉴 앵커 이동 정상.
- Tab으로 본문 건너뛰기 초점 접근 확인. 주 플레이 링크 focus-visible 보라색4px 테두리 확인. 주 플레이 링크 실제 클릭 후 `/game` 도착 확인.

## 근거

Temp 폴더 `C:/Users/admin/AppData/Local/Temp/`:

- 이전: `landing-before-20261010.png`, `landing-mobile-before-20261010.png`.
- 최종 desktop/mobile: `landing-after-desktop-20261010.png`, `landing-after-mobile-20261010.png`.
- 좁은 화면: `landing-after-320-ja-20261010.png`, `landing-after-320-en-20261010.png`.

기존 `homepage_play_cta_adversarial_benchmark_2026-10-04.md`의 모바일 CTA 과밀·데스크톱 주 CTA 낮은 즉시성 지적과 비교했다. 최종 desktop/mobile 캡처에는 키보드 확인에 따른 본문 건너뛰기 focus 표시가 포함된다.

## 데이터 경계

새 격리 브라우저에서 최초 사이트 방문 전 Firebase RTDB 두 도메인을 차단했다. 공개 홈페이지 DOM·링크·화면만 검사했고 실제 사용자 정본·revision 조회나 수정, 로그인, 게임 런 실행은 하지 않았다. 원격 데이터 테스트나 복구를 주장하지 않는다. 언어 변경은 해당 테스트 화면의 휘발성 상태이며 브라우저 세션을 닫았다. 기존5173 서버를 변경하지 않았다. 라이브 배포 후 검증은 이 기록 시점의 범위 밖이다.

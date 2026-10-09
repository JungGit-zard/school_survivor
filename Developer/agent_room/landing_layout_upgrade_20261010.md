# 홈페이지 레이아웃 개선

- 사용자 요청: 현재 `/landing` 홈페이지를 조사하고 레이아웃을 업그레이드한다.
- 기준: `origin=https://github.com/JungGit-zard/school_survivor.git`, `zombie_only`, `ff7f28f`. 독립 clone `C:/Users/admin/AppData/Local/Temp/escape-landing-layout-20261010`에서 작업했다. 기존 F 작업공간의 다른 작업 변경은 포함하지 않았다.
- 관찰: Advisor의 desktop 1264×568/mobile 390×844 캡처에서 큰 hero와 세 줄 모바일 nav가 첫 화면 CTA를 밀고, 흰 덮개가 3D 장면을 흐리며, 고정 CTA가 hero 콘텐츠와 중복되는 것을 확인했다. 기존 `Quaility_Assurance/homepage_play_cta_adversarial_benchmark_2026-10-04.md`도 CTA 과밀/우선순위 문제를 지적한다.
- 참고: `Planner/Essential_game_plan/title_landing_screen_plan_2026-05-10.md`, `Planner/homepage_play_cta_adversarial_improvement_proposal_2026-10-04.html`. 이번에는 새 카피·스토어 버튼·자산을 추가하지 않는다.

## 변경

- `WebLandingPage.jsx`: 데스크톱 hero 높이/여백 압축, 읽기 영역과 우측 기존 3D 장면 사이의 흰 덮개 조정.
- 모바일 nav를 브랜드/언어 + 횡스크롤 메뉴 두 줄로 구성하고 중복 nav 시작 버튼은 숨긴다. 메뉴·버튼 최소 높이 44px 유지.
- 시각 QA 후 모바일 메뉴 폭도 최소 44px로 보정했다. facts 뒤의 중복 `모바일에서 바로 플레이` 링크는 제거하여 desktop의 전폭 중복 버튼과 모바일 hero/sticky 경쟁을 없앴다. 번역 사전은 변경하지 않았다.
- hero 주 CTA는 전폭으로, 기존 보조 링크는 두 열로 정리한다. 기존 카피/번역/미디어 섹션은 보존한다.
- hero 액션을 위로 지나쳤을 때만 모바일 고정 CTA를 표시하고, 되돌아오거나 만화 팝업이 열리면 숨긴다. IntersectionObserver 해제도 포함한다. nav 높이에 맞춘 모바일 anchor 여백을 둔다.
- 인증·세션·Firebase·게임·타이틀 모델/그래픽/BGM 소스 및 자산은 변경하지 않는다. 변경된 장면 표시값은 홈페이지 wrapper의 opacity/scrim뿐이다.

## 라우팅 및 검증

- uimini checker 정상, receipt `7fd8cced463987a1165ba96d9adfdc28340a2babe32f43943a1f87921bba94a1`.
- Kanban `escape-zombie-school` / uimini `t_5f1824bd`, run1536. Hermes는 이전 D 경로의 필수 checker가 exit127로 실패하여 실제 검토 전에 blocked 처리했다. Native Worker와 별도 QA로 진행하며 전역 프로필은 변경하지 않았다.
- `npx vitest run src/components/WebLandingPage.test.jsx`: 1파일 10개 통과. 새 테스트는 sticky CTA의 아래/위/재진입 및 만화 팝업 상태·observer 정리를 검증한다. 실제 Firebase 접근 없이 DOM/mock만 사용했다.
- `git diff --check` 통과. 실제 화면 검증은 별도 QA 기록을 따른다. 구현 Worker는 커밋·푸시·배포하지 않았다.

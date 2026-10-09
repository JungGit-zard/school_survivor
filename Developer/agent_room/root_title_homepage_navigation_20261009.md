# 루트 게임 타이틀과 홈페이지 이동

- 사용자 명시 결정: `escapezombie.com/` 접속 시 기존 게임 시작 타이틀을 표시하고, `홈페이지로` 버튼으로 기존 홈페이지에 진입한다.
- 구현: `App.jsx`의 홈페이지 분기를 `/landing`으로 한정. 기존 `/game`과 `/index.html` 게임 경로는 유지. 타이틀의 기존 시작 버튼 아래에 44px 이상 높이의 `/landing` 링크를 추가하고 ko/en/ja 문구를 연결했다.
- `project_develop_policy.md`의 공식 홈페이지 경로 문단만 이번 사용자 결정으로 갱신했다. 기존 홈페이지 콘텐츠, 인증·세션, 게임 모델·그래픽·BGM 구현은 변경하지 않았다.
- 변경 테스트: `App.firebaseBootstrap.test.jsx`는 `/` 게임 타이틀과 `/landing` 홈페이지를 검증하고, `TitleScreen.settings.test.jsx`는 홈페이지 링크 목적지·문구·최소 높이와 게임 시작 버튼 보존을 확인한다.

## 라우팅 및 검증 경계

- Board: `escape-zombie-school`, uimini 카드 `t_d7cc7ed8`.
- Reuse decision: 메뉴·타이틀 UI·웹 경로는 기존 uimini 역할을 사용한다.
- Hermes 실행 run 1529는 오래된 `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1` 경로에서 exit 127로 차단되어 실제 검토를 수행하지 못했다. 전역 프로필은 변경하지 않았다.
- Codex Worker는 현재 F 작업공간에서 uimini 필수 checker를 정상 수행했다. Receipt: `cc39be1ce5f2ab317ccd53b30325e784cdc71af5474b3a42e9ba7ec606e2d9e2`. gstack 설치 확인 성공. Native Worker 구현과 별도 QA 검토로 이어갔다.
- 이번 8개 기존 파일의 diff만 `git apply --check` 후 최신 원격 `34e0eee0` 기반 `C:/Users/admin/AppData/Local/Temp/escape-route-release-20261009`에 적용했다. 기존 F 작업공간의 다른 로컬 커밋·SNS 작업 변경은 릴리스 작업에 포함하지 않았다.
- 테스트는 별도 QA가 release clone에서 일원화해 실행한다. 이 구현 Worker는 실제 Firebase 데이터 읽기·쓰기, 로그인, 커밋·푸시·배포를 수행하지 않았다. 테스트와 실화면 결과는 QA 기록 및 Advisor 최종 보고를 따른다.

## 기존 테스트 실패 분리

- Advisor의 집중 테스트 결과는 64개 통과, 기존 실패 1개였다. 실패는 `TitleScreen.settings.test.jsx`의 `unlocks every non-starter weapon from the cheat modal action`에서 `hanako`의 영구 해금을 기대하는 부분이다.
- 이번 변경 전 release clone `HEAD`의 `TitleScreen.jsx`와 해당 테스트를 임시 파일로 분리하여 문제 테스트만 실행했고, 동일하게 `hanako: expected false to be true`가 재현됐다. 코드상 하나코는 런 중 조합 무기라 `setUnlocked`/`getAllUnlocked`의 계정 영구 해금 대상에서 제외되지만 기존 테스트는 모든 non-starter를 기대한다.
- 이 범위 밖 실패는 수정하지 않았다. 임시 원본 컴포넌트·테스트 2파일은 검증 직후 제거했으며 이번 경로 변경과 무관한 소스 변경은 없다.

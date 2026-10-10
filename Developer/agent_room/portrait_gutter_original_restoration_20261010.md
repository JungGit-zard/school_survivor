# 유실된 세로 게임 프레임·좌우 일러스트 원본 복원

## 원본 증거

- 사용자 정정에 따라 신규 디자인을 만들지 않고 기존 구현을 조사·복원했다.
- 원본 source diff: `C:/Users/admin/.codex/sessions/2026/10/03/rollout-2026-10-03T15-15-11-01a10066-fa9b-7440-bb22-a414b8f9d275.jsonl` 68행 tool output, `ReadyGameApp.jsx`의 import 및 viewportStyle/viewport/phoneFrame hunks. 당시 파일 blob 표기 `0b47cbb4..f4355e7f`이며 Git 커밋 SHA로 오인하지 않는다.
- 독립 source 확인: `rollout-2026-10-03T11-40-53-01a0ffa2-c71f-7e03-934a-4958b2e5eeac.jsonl`의 동일 source diff. 147행에는 side-gutter 회귀 테스트 전체 원문이 남아 있다.
- 배포 원본 교차 확인: Hosting preview `t-c6a7dc7d`, version `e48fdbce53d219bc`, 2026-10-03T09:12:56Z. `https://escape-zombie-school--t-c6a7dc7d-e60g12dk.web.app/assets/ReadyGameApp-CyqWWlwl.js`, SHA256 `ab0147e7ac91fd64b62308c400302105a85d85b244a123a81578692977742b76`.
- 기존 배경 helper bundle `webBackgroundAssets-C_OkLwiC.js`, SHA256 `60d6dbdf3f85571a116932bdec3c719ffc15756e1c1a8e52515bb1dc93ab25f1`. 기존 지정 외부 일러스트 URL 및 cover/center/no-repeat 연결이 source와 일치한다.

## 복원 파일과 범위

- 기준 clone: `C:/Users/admin/AppData/Local/Temp/escape-portrait-restore-20261010`, origin `https://github.com/JungGit-zard/school_survivor.git`, `zombie_only`의 `6bf31a0acdc161b2ca1171d3195dbc838ece600d`.
- `Developer/r3f_prototype/src/components/ReadyGameApp.jsx`: 원본 `getSelectedWebBackgroundStyle` import/viewport 합성과 viewport/phoneFrame 스타일만 복원했다. 너비 `min(100vw, 720px, 56.25dvh)`, 비율 `9 / 16`, 높이 `auto`, 최대 높이 `min(100vh, 100dvh, 1280px)` 및 원래 터치·넘침 속성을 그대로 사용한다.
- 같은 과거 diff에 섞인 인증·진행도 gate 변경은 복원하지 않았다. 현재 인증/게임 진입·타이틀·모델·BGM·Firebase 동작은 수정하지 않았다. 자산 신규 생성·교체 없음.
- `ReadyGameApp.test.jsx`: 147행에서 유실된 side-gutter 회귀 테스트를 복원했다. 현재 테스트 하네스의 이름 `renderReadyWithoutEntering`에 맞추고 이전 두 번째 인자를 제거했으며, source raw/helper import를 연결했다.
- `App.virtualJoystick.test.jsx`: 전체 화면을 기대하던 테스트 이름과 기대값을 복원 규격에 맞춰 정정했다. 기존 첫 자식 선택은 프레임이 아닌 TapFeedbackBurst를 검사하므로 mock joystick의 부모인 실제 프레임을 선택한다. jsdom이 `min(...dvh)`를 해석하지 못해 너비는 원문 source로, 높이/비율은 DOM으로 확인한다. 이 수정은 **원본 테스트 복원으로 주장하지 않는다**. 기존 sessionStorage 처리 등 다른 내용은 변경하지 않았다.

## 라우팅과 검증 경계

- uimini 필수 checker receipt `42c5969cf28df204b67cf33fe0acebe9559f225688c52fc22cb2d88b986d4c25`.
- `escape-zombie-school` uimini 카드 `t_b46e15a0`, run1544는 이전 D 경로 checker exit127로 실제 검토 전 blocked. Native Worker와 별도 QA로 진행했고 전역 프로필은 바꾸지 않았다.
- 최초 npx 테스트 시도는 node_modules 미연결/기존 D npm cache 경로 문제로 ENOENT 실패했다. 새 패키지 설치는 이루어지지 않았다. 기존 검증 clone의 node_modules를 junction으로 연결한 뒤 로컬 Vitest 경로로 실행한다.
- 실제 Firebase 접근/쓰기, 커밋·푸시·배포는 구현 Worker가 수행하지 않는다. 원본 F 작업공간과 기존 landing clone의 dirty 파일은 보존했다.
- `node node_modules/vitest/vitest.mjs run src/components/ReadyGameApp.test.jsx src/App.virtualJoystick.test.jsx`: 2파일 17개 통과. 첫 실행에서 위 기존 잘못된 DOM 선택과 jsdom 단위 파싱 한계를 확인하고 테스트만 정정한 뒤 통과했다. 실제 너비·일러스트 표시 여부는 별도 브라우저 QA가 확인한다.

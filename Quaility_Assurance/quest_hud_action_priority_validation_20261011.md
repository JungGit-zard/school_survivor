# Quest HUD action priority validation — 2026-10-11

## 범위
- Kanban: `t_7e0fe793` / 부모 `t_5c122f57`
- 대상 커밋: `d38b30e49a9400dee3ffbb060e2d29cb38826000` (`Prioritize quest actions and compact quest notifications`)
- 작업 원칙: 코드 읽기 전용 검토 + 테스트 실행 + Advisor 제공 브라우저 실측 증거 명시. 실제 Firebase 저장/`completeQuest` 호출은 수행하지 않았다.

## 필수 게이트
- 실행 명령:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "quest HUD mobile QA"`
- 결과:
  - `matched_domains`: `ui`, `qa`
  - `match_evidence`: `hud` → ui, `qa` → qa
  - `combined_receipt_sha256`: `ab266faea54226d05162badbc22b009316ee67ccba3ac3497c9f1a7385bfec4a`
- READ_REQUIRED 문서: checker가 반환한 AGENTS/Bang_Rules/CLAUDE/project policy/SESSION_CONTINUITY/SESSION_MEMORY 최신 엔트리/mandatory wiring/manifest/README/uimini 최신/QA 최신/balanceqa 최신/UI postmortem 문서를 읽고 진행했다.
- gstack 확인: `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING` → `GSTACK_OK`.

## Diff 검토 결과
- `Developer/r3f_prototype/src/components/HUD.jsx`
  - `QUEST_TRANSIENT_BASE_MS = 2000`, `QUEST_TRANSIENT_HALF_MS = 1000`로 item/completed transient toast 정리 시간을 절반으로 축소.
  - item toast cleanup은 현재 toast의 `type`/`questId`가 timer 시작 시점과 같을 때만 `clearQuestToast()`를 호출해 replacement timer가 새 toast를 지우지 않도록 방어.
  - item toast는 더 이상 `toggleQuestInventory()`를 자동 호출하지 않는다. 가방은 수동 버튼으로만 열린다.
  - completed toast는 동일성 확인 뒤 `clearQuestToast()` 및 `pauseSource === 'dialogue'`일 때 `closeStudentDialogue()`를 호출해 stray dim/catcher를 제거하고 재개 경로를 확보한다.
  - quest start/acceptance UI는 portrait left + NPC text right + 별도 acceptance notice + next action 큰 sans-serif 계층으로 재배치했다.
  - compact transient toast는 top center 및 `scale(0.5)` 적용, width/maxWidth를 `min(calc(100% - 24px), calc(56.25dvh - 24px), 560px)`로 제한해 desktop portrait frame 폭에 맞춘다.
- `Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx`, `HUD.test.jsx`
  - item toast가 자동으로 quest inventory를 열지 않는 기대값, 1000ms cleanup, replacement timer 보호, 수동 가방 동작, completed dialogue close/resume 관련 기대값을 갱신/추가했다.

## 테스트 실행
- 명령: `npm test -- src/components/HUD.questInventory.test.jsx src/components/HUD.test.jsx`
- 사전 게이트 출력:
  - branch guard OK (`branch=zombie_only`, `head=d38b30e49a9400dee3ffbb060e2d29cb38826000`)
  - `Legacy B02 source gate passed.`
  - `Dialogue store gate passed (451 Korean IDs).`
  - `Studio-game sync source contract passed.`
- Vitest 결과: `Test Files 2 passed (2)`, `Tests 74 passed (74)`, duration `5.28s`.

## 브라우저/시각 증거
직접 새 브라우저 세션을 다시 열지 않았다. 이전 balanceqa 시도는 browser tool discovery에서 stalled/reclaimed 되었고, Advisor가 이미 실제 브라우저 360x800/1280x800 검증과 스크린샷을 완료했다는 보드 지시가 있어 재탐색을 중단하고 해당 증거를 명시적으로 "Advisor 제공 증거"로 기록한다.

### Advisor 제공 최종 실측
- 모바일 360x800 item popup baseline: `336 × 131.890625`, top `334.0546875`.
- 최종 모바일 item popup: `168 × 65.9453125`, left `96`, top `12`, centerX `180` → baseline의 시각적 절반 폭/높이 및 top center 요건 충족.
- 1.13초 뒤 item toast 상태: `toast=null`, `bag=false` → 1000ms cleanup 및 자동 가방 열림 제거 확인.
- completed popup: `168 × 120.992`, top `12`; dialogue/pausesource cleared, 약 1초 뒤 resume 확인. 실제 `completeQuest` 저장 호출은 피하고 guest memory의 `questToast/studentDialogue` 상태로 시뮬레이션했다.
- acceptance metrics: portrait/dialogue small hierarchy 유지, computed font `12.24 / 13 / 23.04px`, rect `336` mobile.
- desktop 1280x800 최초 검출: acceptance width `560`, x `360..920`으로 450px portrait frame `x=415..865`를 넘쳐 FAIL.
- 최종 CSS correction 후 desktop: acceptance width `426`, x `427..853`, portrait frame `x=415..865` 내부로 PASS. Mobile width는 기존 `336` 유지.

### 보관한 스크린샷
Advisor 산출물을 QA evidence 폴더로 복사했다.
- `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-before-correction-advisor.png` — 268009 bytes
- `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-after-correction-advisor-interim.png` — 284306 bytes
- `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-after-desktop-advisor-final.png` — 1404056 bytes

## PASS/FAIL 판정
- PASS: small portrait LEFT + NPC dialogue RIGHT + 별도 acceptance notice + next action 22–24px sans-serif 우선순위는 코드/Advisor computed metrics 기준 충족.
- PASS: item/completed notifications는 top center game frame, 시각적 절반 크기, 2000→1000ms lifecycle 요건 충족.
- PASS: item alert 뒤 quest inventory 자동 오픈 제거, 수동 가방 열기 유지.
- PASS: completion dialogue close/resume 및 stray dim/catcher 방지는 focused tests와 Advisor simulated browser state 기준 충족.
- PASS: replacement timer cleanup은 focused tests 및 code path에서 동일 toast만 삭제하도록 방어됨.
- PASS: desktop portrait frame overflow는 초기 FAIL 발견 후 final CSS correction으로 `427..853` inside `415..865`로 해소.

## 제한 및 미검증
- 직접 브라우저 세션을 새로 reserve/open해 재측정하지 않았다. 브라우저 관련 PASS는 Advisor가 제공한 실제 browser 검증과 스크린샷에 근거한다.
- completed visual은 실제 Firebase 저장을 피하기 위해 `completeQuest`를 호출하지 않고 guest memory 상태 조작으로 표시했다. 따라서 실제 저장 경로 검증은 범위 밖이다.
- dev server/HMR 세션은 건드리지 않았고 Advisor session은 이미 closed 상태였다는 보드 코멘트를 따랐다.

## Blockers
- 없음. 위 제한은 범위 제한이며 현재 요청을 막는 blocker는 아니다.

## Advisor 최종 운영 사이트 확인
- 2026-10-11 KST: `npm.cmd run deploy:hosting:safe -- quest-action-ui-20261011` exit 0. 최종 코드 `d38b30e4` 빌드, 동기화 45/45 및 Hosting JavaScript 56개 검증 후 live 승격 성공.
- 새 세션의 `https://escapezombie.com/` 타이틀, `홈페이지로` → `/landing`, 게스트 로비 → Stage 1 → 도입 대사 3회 탭을 확인했다.
- 운영 번들의 기존 store를 통해 게스트 메모리에서 퀘스트 UI를 표시했다. 실제 NPC 접촉/퀘스트 보상 저장을 재현한 검증은 아니다. Firebase 변경은 하지 않았다.
- 최종 모바일 수락창: 336 × 224.921875px, x=12, 모서리 0px, 대사/수락/행동 글자 크기 12.24/13/23.04px. 탭 후 playing 복귀.
- 아이템: 168 × 65.9453125px, x=96, top=12; 1.1초 뒤 toast=null, bag=false.
- 완료 대화: 168 × 120.9921875px, x=96, top=12; 1.1초 뒤 phase=playing, pauseSource=null, studentDialogue=null, questToast=null.
- 기존 독립 완료 토스트는 2000→1000ms이며, 기존 탭 전까지 유지되던 완료 대화창에는 1000ms 자동 종료를 새로 적용했다.
- 최종 운영 스크린샷: `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-live-mobile-final.png`. 검증용 브라우저 세션은 닫았다.

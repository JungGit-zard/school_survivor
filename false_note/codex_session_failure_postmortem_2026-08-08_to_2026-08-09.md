# 2026-08-08~2026-08-09 Codex 세션 실패 종합 회고

## 1. 목적과 증거 표기

- 목적: 2026-08-08부터 2026-08-09까지 Codex 세션에서 실패했거나 완료되지 않은 작업을 한 문서로 묶어 재발 방지 기준을 남긴다.
- [confirmed] 도구 출력, Kanban 카드 상태, git status, 기존 회고 문서로 확인한 내용이다.
- [user report] 사용자가 보고한 현상이나 중단 지시이며, 이 문서 작업에서 런타임으로 재확인하지 않은 내용이다.
- [inference] 확인된 사실을 바탕으로 한 운영상 추론이며, 완료나 원인 단정으로 쓰지 않는다.
- 이 문서는 책임 회피가 아니라 다음 작업자가 같은 실패를 반복하지 않게 하는 운영 기록이다.

## 2. Executive summary

- [confirmed] 8월 8일에는 AAB versionCode·업로드 대상·HUD 실제 화면 검증·최종 보고 재조회에서 실패가 있었다.
- [confirmed] 8월 9일에는 Apply 즉시 동기화, 메기 프로세스 정리, 좀비도감, Apply ACK 구현에서 작업 drift와 미완료가 이어졌다.
- [confirmed] `t_f8df5223` Apply audit은 1차 worker가 60 iteration을 소진해 timed_out 되었고, 2차 worker가 FAIL audit을 남겼다.
- [confirmed] Apply audit 결론은 여섯 dataset 저장·소비 경로는 확인됐지만 cold-load 즉시 동기화에는 READY/ACK 보장이 없었다는 것이다.
- [confirmed] `t_e3ba1afb`는 5173 PID 4684와 localhost 게임 창을 보존했고, 종료할 다른 agent-launched game/Studio/test browser가 없다고 완료했다.
- [confirmed] `t_f3e361fd` 좀비도감 1차 worker는 60 iteration을 소진하고 blocked/gave_up 상태가 되었다.
- [confirmed] `t_c5eacd05` 좀비도감 continuation은 archived/reclaimed 되었고 완료 기록이 없다.
- [confirmed] `t_b5a35715` Apply-until-game-ACK worker도 archived/reclaimed 되었고 완료 기록이 없다.
- [confirmed] 현재 git status에는 Hanako 관련 미커밋/신규 파일과 좀비도감/Apply 관련 partial 파일이 섞여 있다.
- [confirmed] 최신 작업들은 사용자 지시 때문에 test/build/browser/game/Firebase 검증을 실행하지 않았다.
- [inference] 따라서 소스 점검과 런타임 검증은 반드시 분리해 말해야 하며, 미검증 partial을 완료로 부르면 안 된다.

## 3. Aug 8 timeline

- [confirmed] 기존 `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`가 8월 8일 실패의 1차 근거다.
- [confirmed] AAB 산출물의 이전 상태와 새 상태를 같은 경로에서 덮어써 PRE/POST 라벨이 흐려졌다.
- [confirmed] 이전 AAB versionCode 26, 소스 versionCode 27, 이후 새 AAB versionCode 27이라는 상태가 혼재했다.
- [confirmed] 업로드 직전 대상 파일을 고유 파일명·해시로 고정하지 못했다.
- [confirmed] 보스카드 점검에서는 중복 Vitest가 병렬 실행되어 orphan Node/Vitest 프로세스 15개가 확인됐다.
- [confirmed] 집중 재실행 결과는 66개 통과, 4개 실패였고 그 실패는 당시 해결되지 않았다.
- [confirmed] 사용자가 정상 자산이라고 말한 무기 아이콘/학생 프로필 이미지를 먼저 의심해 자산 검수를 수행했다.
- [confirmed] HUD 문제는 실제 브라우저·기기 RED/GREEN 없이 jsdom 테스트와 `zIndex` 변경만으로 push되었다.
- [confirmed] 최종 보고 직전에 build.gradle을 재조회하지 않아 versionCode 관련 보고가 오래된 상태를 담았다.
- [confirmed] 8월 8일 회고는 확인된 사실, 사용자 보고, 추정/미검증을 나눠 적는 기준을 세웠다.

## 4. Aug 9 timeline

- [user report] critical-hit 요청은 “정확히 오른쪽 → 아래 → 원위치 화면 흔들림”과 “별도 재생성 SFX/subagent 필요”에서 drift가 발생했다.
- [confirmed] 해당 critical-hit 요청의 최종 완료는 이 문서의 증거 범위에서 확인되지 않았다.
- [confirmed] 메기 의미가 한때 잘못 해석되어 5173 keeper가 방해받았고, 이후 5173 보존 규칙이 재확인됐다.
- [confirmed] `t_e3ba1afb`는 5173 PID 4684와 localhost 게임 창을 보존하는 형태로 완료됐다.
- [confirmed] `t_f8df5223`는 Apply 즉시 동기화 audit을 수행했고 1차 timed_out, 2차 FAIL audit으로 끝났다.
- [confirmed] audit은 all six canonical datasets 저장·소비를 확인했지만 game cold-load 즉시 sync 보장은 실패로 판정했다.
- [confirmed] 좀비도감 최초 작업 `t_f3e361fd`는 partial backend encounter file과 partial title UI 상태를 남긴 채 iteration budget을 소진했다.
- [confirmed] continuation `t_c5eacd05`는 archived/reclaimed 되었고, TitleScreen partial 변경은 직접 되돌려 원래 title animation이 복구된 상태를 확인했다.
- [confirmed] Apply ACK 강제 구현 `t_b5a35715`는 사용자 중단으로 archived/reclaimed 되었고 완료 기록이 없다.
- [confirmed] Mandatory document loading과 compaction이 반복적으로 worker budget을 소모했다.
- [confirmed] 최신 작업들에서 사용자가 테스트 금지를 지시했으므로 테스트·빌드·브라우저 검증은 실행되지 않았다.

## 5. Incident table

| 작업 | 의도 | 실제 실패 | 사용자 영향 | 근본 원인 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| 8월 8일 AAB/보고 | 정확한 릴리스 산출물 안내 | PRE/POST와 대상 파일 고정 실패 | 업로드 혼선 위험 | 덮어쓰기 경로와 최종 재조회 부족 | 기존 회고에 기록됨 |
| 8월 8일 HUD | 아이콘 표시 회귀 해결 | 실제 화면 검증 없이 push | 해결 확신 불가 | DOM 테스트를 시각 검증처럼 취급 | 미검증 기록 유지 |
| critical-hit/SFX | 지정 연출과 SFX 완성 | 최신 지시 drift, SFX 별도 요구 흐림 | 원하는 연출 완료 불명 | 최신 요청 고정 실패 | 완료 미확인 |
| 메기/5173 | agent-launched 창 정리 | 5173 keeper까지 건드릴 위험 발생 | 개발 서버 중단 위험 | “메기” 의미 오해 | 5173 보존 규칙 재확인 |
| Apply audit | Apply 즉시 게임 반영 감사 | 1차 60 iteration timed_out, JSON metadata quoting 실패 | audit 지연 | 필독/조사 범위 과대와 기록 처리 미흡 | 2차 FAIL audit 완료 |
| 좀비도감 | title bottom button/modal과 Firebase 진행도 | partial backend/UI 후 60 iteration 소진 | 기능 미완성, title 회귀 위험 | 범위 대비 budget 부족, title 격리 부족 | incomplete |
| Apply ACK | 게임 ACK까지 Apply 재전송 | worker 중단, partial unverified work | Apply 완료 보장 불명 | ACK 기준 구현 완료 전 중단 | incomplete |
| dirty tree | 동시 작업 보존 | Hanako 등 unrelated work와 partial이 혼재 | blame/rollback 위험 | allowlist 기준 부족 | untouched, 보존 필요 |
| iteration exhaustion | worker 완료 | 문서 필독·compaction이 예산 잠식 | 반복 중단/재스폰 | 작업 단위와 필독 비용 불균형 | 예방 규칙 필요 |

## 6. Detailed incidents

### 6.1 Prior Aug 8

- [confirmed] 기존 회고는 AAB versionCode 혼선, 중복 테스트, 자산 선행 검수, HUD 실제 화면 없는 push, 오래된 versionCode 보고를 기록했다.
- [confirmed] 핵심 실패는 “확인한 것”과 “완료라고 말한 것” 사이의 차이를 줄이지 못한 것이다.
- [confirmed] 이 기록은 8월 9일 작업에도 그대로 적용되는 선례다.

### 6.2 Critical hit and SFX drift

- [user report] 사용자의 최신 요구는 정확한 흔들림 방향과 별도 재생성 SFX/subagent 요구를 포함했다.
- [confirmed] 이 문서의 Kanban/파일 증거 범위에서는 최종 완료가 확인되지 않는다.
- [inference] 최신 요청을 별도 checklist로 고정하지 않으면 “비슷한 연출”이 “요청한 연출”로 둔갑할 위험이 있다.
- [inference] SFX는 `soundmini` 관여가 필요한 영역이므로 독립 카드/산출물 없이 완료 처리하면 안 된다.

### 6.3 Megi and 5173

- [confirmed] 이 세션에서 사용자가 확정한 `메기` 규칙은 5173 dev server와 keepalive/watchdog을 절대 건드리지 말고 agent-launched game, Graphics Studio, test browser만 닫는 것이다.
- [confirmed] `t_e3ba1afb` 결과는 5173 PID 4684와 localhost game window 보존, 종료 대상 없음, 사용자 앱/automation 미접촉이다.
- [inference] 메기는 “프로젝트 서버 전부 종료”가 아니라 “5173 보존 하에 agent-launched 부속 창만 정리”로 읽어야 한다.

### 6.4 Apply audit orchestration

- [confirmed] `t_f8df5223` 1차 run #438은 60/60 iteration budget exhausted로 timed_out 되었다.
- [confirmed] 2차 run #439는 FAIL source audit을 완료했다.
- [confirmed] 결론은 여섯 canonical dataset은 저장·소비되지만 sendGameSync가 800ms retry 이후 READY/ACK 보장 없이 끝나 cold-load 즉시 sync가 보장되지 않는다는 것이다.
- [confirmed] 작업 본문은 metadata JSON quoting 실패도 증거로 다루라고 요구했다.
- [inference] 장문 필독과 넓은 audit 범위는 60 iteration worker에게 과했으며, audit/implementation/metadata 기록을 분리했어야 한다.

### 6.5 Encyclopedia and title regression

- [confirmed] `t_f3e361fd`는 title zombie encyclopedia 구현 카드였고 run #442가 gave_up/timed_out 되었다.
- [confirmed] 카드 본문은 `src/lib/zombieEncyclopedia.js`, `src/lib/firebaseProgress.js`, `src/components/Enemies.jsx`, `src/components/TitleScreen.jsx` partial 상태를 continuation 근거로 남겼다.
- [confirmed] `t_c5eacd05` continuation은 archived/reclaimed 되었고 완료 handoff가 없다. 이후 TitleScreen에 남아 있던 도감 partial UI는 직접 되돌려 원래 title animation을 복구했다.
- [confirmed] 요구사항은 기존 title wording, start button, title scene, character/model/light/camera/BGM, login flow를 바꾸지 말라는 것이었다.
- [inference] TitleScreen partial UI는 title 정본 잠금과 충돌 위험이 있으므로 격리·되돌림 기준이 없으면 회귀를 만든다.
- [confirmed] 기능은 현재 incomplete로 취급해야 한다.

### 6.6 Apply ACK partial

- [confirmed] `t_b5a35715`는 Apply 후 game ACK까지 재전송하고 matching ACK 전에는 Game applied라고 보이지 않게 하는 구현 카드였다.
- [confirmed] run #451은 archived/reclaimed 되었고 완료 summary가 없다.
- [confirmed] 카드 본문은 `GraphicsStudio.jsx`, `App.jsx`, `studioGameBridge.js`만 필요 시 패치하라고 제한했다.
- [confirmed] 현재 git status에는 `GraphicsStudio.jsx`와 `App.studioGameSync.test.jsx` 등 partial 가능 파일이 보인다.
- [inference] 이 상태는 “부분 구현 가능성”이지 “ACK 보장 완료”가 아니다.

### 6.7 Dirty tree

- [confirmed] current git status는 Hanako 관련 파일, 좀비도감 파일, Graphics Studio/Apply 파일, 다수 테스트 파일이 섞인 dirty tree를 보여준다.
- [confirmed] 신규 파일에는 `15_wea_hanako.svg`, `Hanako.jsx`, `hanako.js`, `zombieEncyclopedia.js`, `App.studioGameSync.test.jsx` 등이 포함된다.
- [confirmed] 이 문서 작업은 dirty tree를 보존해야 하며 unrelated Hanako work를 이번 실패 blame에 포함하지 않는다.
- [inference] 다음 작업자는 카드별 allowlist와 `git diff -- <paths>` 비교 없이는 변경 원인을 단정하면 안 된다.

### 6.8 Iteration exhaustion

- [confirmed] `t_f8df5223`와 `t_f3e361fd`에서 60 iteration exhaustion이 발생했다.
- [confirmed] mandatory precommand 문서 로딩은 공통+domain 문서를 매번 요구하며, `SESSION_MEMORY.md`는 latest entry만 읽어야 한다.
- [inference] 필독 문서 자체는 필요하지만, task를 너무 크게 만들면 문서 읽기와 compaction만으로 worker 예산이 소진된다.
- [inference] 긴 구현은 “audit”, “narrow patch”, “static verify”로 나누고 완료 기준을 한 줄 ACK로 제한해야 한다.

## 7. Residual risks

- [confirmed] 좀비도감 feature는 완료되지 않았다.
- [confirmed] Apply ACK 보장은 완료되지 않았다.
- [confirmed] critical-hit/SFX 최종 완료는 확인되지 않았다.
- [confirmed] dirty tree에는 unrelated concurrent Hanako work가 포함되어 있다.
- [confirmed] 최신 작업은 테스트 금지 지시 때문에 runtime verification이 없다.
- [inference] 다음 worker가 partial 파일을 완성본으로 오해할 위험이 크다.
- [inference] title 관련 partial은 기존 title animation/정본을 회귀시킬 위험이 있다.

## 8. Resolved checklist

- [x] 8월 8일 실패 회고가 별도 문서로 남아 있다.
- [x] 5173 PID 4684 보존이 `t_e3ba1afb`에서 확인됐다.
- [x] `메기`의 좁은 의미가 AGENTS.md에 기록되어 있다.
- [x] Apply audit은 최소한 source-only FAIL 결과를 남겼다.
- [x] 이 문서 작업은 test/build/browser/Firebase/5173 조작 없이 문서만 작성했다.

## 9. Unresolved checklist

- [ ] critical-hit exact right-down-return screen shake 완료 여부 확인.
- [ ] regenerated SFX와 soundmini 관여 여부 확인.
- [ ] Apply game ACK 재전송 구현 완료 및 static/runtime 검증.
- [ ] 좀비도감 backend encounter 기록, title modal, locale string, title animation 보존 확인.
- [ ] 좀비도감 UI를 다시 구현할 경우 현재 복구된 원래 title animation 보존 확인.
- [ ] Hanako 등 unrelated dirty-tree 변경과 이번 실패 범위 분리.
- [ ] blocked/archived/reclaimed 카드가 완료처럼 전달되지 않게 board 상태 정리.

## 10. Hard prevention rules

- 최신 요청이 이전 브리프보다 우선한다.
- critical-hit처럼 방향·순서가 있는 요청은 “오른쪽 → 아래 → 원위치” 같은 문구를 그대로 checklist화한다.
- `메기`의 정확한 의미는 5173 보존 하의 agent-launched game/Studio/test-browser 정리다.
- 5173, PID 4684, keeper, watchdog은 절대 종료하지 않는다.
- 작업 brief는 한 worker가 끝낼 수 있게 bounded scope로 자른다.
- blocked, archived, reclaimed, gave_up 카드는 절대로 complete로 부르지 않는다.
- 사용자가 test/build/browser를 금지하면 source-only verification이라고 명시한다.
- source inspection과 runtime verification을 같은 말로 쓰지 않는다.
- dirty tree에서는 카드별 allowlist path만 비교한다.
- unrelated Hanako work는 보존하고 blame에서 제외한다.
- Graphics Studio Apply는 matching syncId/revision ACK 전 완료로 주장하지 않는다.
- Apply가 Firebase positive canonical revision을 받기 전 runtime/game에 unsaved draft를 보내지 않는다.
- title 작업은 기존 wording, start button, title scene, model, light, camera, BGM, animation과 분리한다.
- title partial 변경은 기능 완성 전 원래 title animation을 훼손하지 않는지 우선 확인한다.
- 프로세스 종료는 우리가 시작한 정확한 process tree만 대상으로 한다.
- 종료 전에는 대상이 5173/keeper가 아닌지 별도 확인한다.
- partial, unverified, source-only, user-stopped 상태를 보고서에 명확히 붙인다.
- metadata JSON은 도구가 받는 형식으로 미리 단순화하고 quoting 실패를 방지한다.
- mandatory document loading 비용이 큰 작업은 audit/patch/verify 카드로 쪼갠다.
- 사운드/SFX는 soundmini 관여 없이 완료 처리하지 않는다.

## 11. Evidence appendix

- [confirmed] `t_f8df5223` — Apply audit. 1차 timed_out, 2차 FAIL source audit.
- [confirmed] `t_e3ba1afb` — Megi cleanup preserve 5173. PID 4684와 localhost window 보존.
- [confirmed] `t_f3e361fd` — Implement title zombie encyclopedia. blocked/gave_up after 60 iterations.
- [confirmed] `t_c5eacd05` — Finish zombie encyclopedia title modal. archived/reclaimed, completion 없음.
- [confirmed] `t_b5a35715` — Force Studio Apply until game ACK. archived/reclaimed, completion 없음.
- [confirmed] Prior postmortem: `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/App.jsx`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/lib/studioGameBridge.js`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/lib/zombieEncyclopedia.js`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/lib/firebaseProgress.js`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/components/Enemies.jsx`.
- [confirmed] Relevant source paths named by cards: `Developer/r3f_prototype/src/components/TitleScreen.jsx`.
- [confirmed] Current git status shows many modified/untracked files, including Hanako files and partial Apply/zombie encyclopedia files.

## 12. Documentation-task boundary statement

- [confirmed] 이 documentation task는 test를 실행하지 않았다.
- [confirmed] 이 documentation task는 build를 실행하지 않았다.
- [confirmed] 이 documentation task는 browser/game을 열거나 조작하지 않았다.
- [confirmed] 이 documentation task는 Firebase를 읽거나 쓰지 않았다.
- [confirmed] 이 documentation task는 port 5173, PID 4684, keeper, watchdog을 건드리지 않았다.
- [confirmed] 이 documentation task가 생성/수정한 파일은 `Developer/agent_room/codex_session_failure_postmortem_2026-08-08_to_2026-08-09.md` 하나뿐이다.

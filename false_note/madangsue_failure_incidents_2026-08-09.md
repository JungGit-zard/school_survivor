# Madang_sue 세션 실패 및 비간섭 사고 기록 — 2026-08-09

## 1. 증거 표기

- [confirmed] Kanban 카드 본문·상태·run metadata·comment, 지정된 기존 파일, 또는 이번 카드 본문에 명시된 named evidence로 확인한 내용이다.
- [user report] 사용자가 현재 대화에서 보고했으나, 이 기록 작업의 허용 증거 범위 안에서는 독립적으로 재현·확인하지 못한 내용이다.
- [inference] 확인된 사실에서 도출한 운영상 추론이다. 확인 사실처럼 쓰지 않는다.

## 2. 짧은 요약

- [confirmed] Madang_sue의 `t_b07c00e3` 작업은 227초 동안 실행되어 종합 회고 문서를 만들었지만, Advisor review에서 사실 결함 3개가 발견되어 수정됐다.
- [confirmed] 같은 `t_b07c00e3` 작업 로그 증거에 따르면 같은 prior postmortem을 두 번 읽어, 필독·증거 처리 비용을 늘렸다.
- [confirmed] `t_13669c90` 작업은 151초 동안 세 기록 복사와 비간섭 규칙 1건 생성을 수행했고, 세 복사본은 source/target sha256 및 cmp 검증이 모두 일치했다.
- [confirmed] `t_13669c90`은 데이터 부패가 아니라 운영 오버헤드·비효율 사례로 기록한다.
- [user report] 사용자는 Madang_sue가 다른 에이전트에 간섭했다고 보고했다. 현재 허용 증거만으로는 정확한 간섭 사건을 독립 확인하지 못했다.
- [confirmed] 이 기록 작업은 테스트, 빌드, 브라우저, 게임, Firebase, 프로세스 조작을 수행하지 않았고 5173도 건드리지 않았다.

## 3. 확인된 실패 표

| 이슈 | 증거 | 영향 | 교정/상태 |
| --- | --- | --- | --- |
| 종합 회고의 사실 결함 3개 | [confirmed] `t_b07c00e3` Advisor comment: Megi rule 출처, TitleScreen animation 상태, unconfirmed false_note filename 수정 | 운영 기록을 그대로 믿으면 잘못된 원인·상태가 전파될 수 있음 | Advisor review에서 세 결함이 수정됨 |
| Megi rule 출처 오기 | [confirmed] 결함 1: Megi rule을 AGENTS.md에서 온 것으로 썼으나 실제로는 사용자 세션 지시에서 온 내용 | 규칙 출처를 잘못 적어 이후 worker가 권한·우선순위를 오해할 수 있음 | session-source Megi rule로 교정됨 |
| TitleScreen animation 상태 오기 | [confirmed] 결함 2: 복구된 TitleScreen animation을 unresolved/ambiguous처럼 남김 | 이미 복구된 상태를 미해결로 오해해 불필요한 재작업 또는 회귀 위험 발생 | confirmed restoration으로 교정됨 |
| 미확인 false_note 파일명 기재 | [confirmed] 결함 3: 확인되지 않은 false_note filename을 listing함 | 존재·정본 여부가 검증되지 않은 파일명이 증거처럼 전파될 수 있음 | unconfirmed filename 제거됨 |
| 동일 prior postmortem 중복 읽기 | [confirmed] `t_b07c00e3` worker log evidence | 제한된 worker budget에서 반복 읽기로 시간·컨텍스트 비용 증가 | 재발 방지: 증거별 1회 읽기와 reading ledger 필요 |
| 과도한 운영 오버헤드 | [confirmed] `t_13669c90`은 3개 파일 복사와 1개 규칙 작성에 151초 소요 | 단순 보존 작업도 필수 문서·검증·메타데이터 비용으로 커짐 | 결과물 해시는 일치. 데이터 부패는 확인되지 않음 |
| 비간섭 규칙 사후 생성 | [confirmed] `false_note/madangsue_non_interference_rule_2026-08-09.md` 존재 | 사전 방지가 아니라 사고 후 통제 문서가 된 성격이 있음 | 앞으로 Madang_sue 작업 전 범위 제한 기준으로 사용 |

## 4. 사용자 보고: 다른 에이전트 간섭

- [user report] 사용자는 현재 대화에서 Madang_sue가 다른 에이전트에 간섭했다고 보고했다.
- [confirmed] 이 카드의 허용 증거는 `t_b07c00e3`, `t_13669c90`, 지정된 false_note 문서, 그리고 카드 본문에 적힌 named evidence로 제한된다.
- [confirmed] 이 허용 범위 안에는 “어느 에이전트의 어떤 카드·파일·프로세스·브라우저·workspace가 언제 어떻게 간섭당했는지”를 독립 증명하는 원자료가 없다.
- [inference] 따라서 간섭 보고는 심각한 리스크 신호로 다루되, 이 문서에서는 confirmed incident로 격상하지 않는다.
- [confirmed] 현재 적용 가능한 직접 예방책은 `false_note/madangsue_non_interference_rule_2026-08-09.md`의 allowlist-only 원칙이다.

## 5. 근본 원인

- [inference] mandatory document overhead: Escape! zombie school 필수 precommand와 required document reading은 필요하지만, 단순 기록·복사 작업에서도 worker 시간을 크게 소모했다.
- [inference] overly broad context handling: `t_b07c00e3`은 여러 사건을 한 문서에 통합하면서 출처·상태·파일명 경계를 끝까지 좁히지 못했다.
- [inference] inadequate final fact-check: 최종 문서가 제출되기 전에 “출처, 현재 상태, 파일 존재 여부” 3가지를 독립 체크하는 단계가 부족했다.
- [inference] self-review risk: 기록 작성자가 자기 운영 영역의 실패를 다루면, 사소해 보이는 출처 오기와 미확인 listing이 그대로 통과할 위험이 있다.

## 6. 영구 예방 규칙

- [confirmed] Madang_sue는 자기 Kanban 카드의 정확한 allowlist에 적힌 대상만 만진다.
- [confirmed] Madang_sue는 다른 에이전트의 Kanban card, files, processes, browser, workspace, branch, uncommitted work를 수정·중지·reclaim·archive·reassign·overwrite·delete·reset·clean 하거나 간섭하지 않는다.
- [confirmed] Madang_sue는 port 5173, PID 4684, keeper/watchdog을 확인·종료·재시작·정리·점유 해제·대체 실행 등 어떤 명목으로도 조작하지 않는다.
- [confirmed] 작업 allowlist와 다른 에이전트 대상 사이에 겹침 가능성이 있으면 Madang_sue는 자기 작업을 멈추고 충돌을 보고한다.
- [confirmed] Terry의 명시 지시 없이는 Madang_sue가 commit 또는 push를 하지 않는다.
- [inference] 기록 작업은 증거 파일별 reading ledger를 남기고, 같은 evidence를 반복 읽으면 이유를 기록해야 한다.
- [inference] 문서 완료 전에는 출처, 현재 상태, 파일명/경로 존재 여부를 별도 checklist로 검토해야 한다.
- [inference] 자기 영역 실패 기록은 독립 reviewer가 최소 1회 검토해야 한다.

## 7. 현재 상태

- [confirmed] `t_13669c90`의 세 copied records는 source/target sha256 및 cmp 비교가 모두 일치한다.
- [confirmed] `t_b07c00e3` 종합 문서의 세 결함은 Advisor review에서 교정됐다.
- [confirmed] `t_13669c90`에서 데이터 부패 증거는 없다. 확인된 것은 운영 오버헤드와 비효율이다.
- [confirmed] 기존 비간섭 규칙은 `false_note/madangsue_non_interference_rule_2026-08-09.md`에 있다.
- [confirmed] 이 문서화 작업은 5173, PID 4684, keeper/watchdog을 건드리지 않았다.
- [confirmed] 이 문서화 작업은 테스트·빌드·브라우저·게임·Firebase·프로세스 조작을 수행하지 않았다.

## 8. 증거 부록

- [confirmed] Card `t_b07c00e3` — `Write consolidated Codex session failure postmortem`; 완료 시간 227초; artifact `Developer/agent_room/codex_session_failure_postmortem_2026-08-08_to_2026-08-09.md`.
- [confirmed] `t_b07c00e3` Advisor comment — Megi rule 출처, TitleScreen animation restoration, unconfirmed filename 관련 세 결함을 수정했다고 기록.
- [confirmed] `t_b07c00e3` worker log evidence — 같은 prior postmortem을 두 번 읽었다는 named evidence.
- [confirmed] Card `t_13669c90` — `Archive all session failure records in false_note`; 완료 시간 151초; 세 복사본 hash/cmp match.
- [confirmed] Existing prevention rule — `false_note/madangsue_non_interference_rule_2026-08-09.md`.
- [confirmed] Existing consolidated evidence — `false_note/codex_session_failure_postmortem_2026-08-08_to_2026-08-09.md`.
- [confirmed] Output of this task — `false_note/madangsue_failure_incidents_2026-08-09.md`.

## 9. 경계 선언

- [confirmed] 이 기록은 Madang_sue 실패와 비간섭 리스크를 사실 기반으로 남기는 문서다.
- [confirmed] 이 기록은 사용자 보고를 지우지 않지만, 독립 확인되지 않은 간섭 사건을 confirmed fact로 쓰지 않는다.
- [confirmed] 이 기록 작업은 허용된 단일 파일 외의 소스 코드, Hanako work, Firebase, browser, game, process, automation, branch, workspace를 수정하지 않았다.
- [confirmed] 이 기록은 후속 구현 지시가 아니라 사고 재발 방지를 위한 제한 범위 문서다.

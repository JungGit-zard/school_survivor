# Auto-deploy notification / reminder hygiene note

Date: 2026-06-24 23:40 KST
Role: Jabda_Reminder_Manager / 잡다알림관리자
Kanban task: `t_c12f27a3`
Project: Escape! zombie school

## 결론

이번 Escape! zombie school 서브에이전트 자동 투입 건은 별도 신규 cron job을 만들 필요가 없다.

이 작업은 사용자에게 주기적으로 알릴 개인 리마인더가 아니라, Kanban board 안에서 각 역할별 산출물과 handoff를 남기는 1차 자동 투입 wave다. 따라서 알림/노티 정리는 "새 알림 생성"이 아니라 "중복·소음·오발송 방지 규칙"으로 처리한다.

## 적용할 hygiene rules

1. 자동 투입 결과는 Telegram/Discord 반복 노티가 아니라 Kanban task summary/comment와 프로젝트 로컬 산출물로 남긴다.
2. `jabdareminder`와 `madangsue`가 같은 알림/운영 장부를 중복 생성하지 않는다. 이 프로젝트 wave에서는 `jabdareminder`가 notification hygiene 판단만 맡고, 기존 잡다 알림 장부는 그대로 둔다.
3. 새 cron job은 다음 조건이 모두 충족될 때만 만든다.
   - Terry가 특정 시간/반복/전달 대상을 명시한다.
   - 현재 ledger 또는 cron 목록에 같은 목적의 active job이 없다.
   - user-facing 노티가 실제로 필요한 운영 리스크가 있다.
4. 자동 배포/자동 투입 모니터링이 필요해지더라도 기본값은 `deliver=local` 또는 Kanban board handoff다. Telegram `origin`으로 보내는 반복 노티는 명시 요청 전까지 만들지 않는다.
5. 알림 문구가 생길 경우 사용자 원문을 보존하고, 토큰·계정·결제 식별자 등 민감정보는 장부/노티에 저장하지 않는다.
6. 완료·만료·취소된 알림은 삭제보다 상태 전환으로 추적성을 보존한다.

## 현재 상태 점검

- `C:/Users/admin/AppData/Local/hermes/schedules/jabda_reminders/ledger.md`는 이미 잡다 알림의 canonical ledger로 존재한다.
- 해당 ledger에는 일일 local-only maintenance cron `95d538d56c38`가 기록되어 있다.
- 이 작업에서 `cronjob(action="list")`를 실행했을 때 현재 실행 profile 기준 반환 job 수는 `0`이었다. 따라서 이 세션 컨텍스트에서는 pause/remove/update할 대상 job을 확인하지 못했고, 기존 job 변경은 하지 않았다.
- ledger의 2026-06-24 09:05 KST 기록에는 기존 cron 확인 job 수 `15`가 적혀 있으므로, 실제 운영 장부는 이미 별도 maintenance 흐름으로 관리 중인 것으로 본다.

## 파일 읽음

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` 최근 구간
- `Developer/agent_room/subagent_auto_deployment_2026-06-24.toh`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Jabda_Reminder_Manager.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/escape-zombie-school-deployment/README.md`
- `C:/Users/admin/AppData/Local/hermes/schedules/jabda_reminders/ledger.md`
- skill reference: `local-operations-stewardship/references/jabda-reminder-manager.md`

## 파일 변경

- Created: `Developer/agent_room/auto_deploy_notification_hygiene_2026-06-24.md`

## 실행한 명령 / 도구

- `kanban_show(t_c12f27a3)`
- `skill_view(local-operations-stewardship)`
- `skill_view(local-operations-stewardship, references/jabda-reminder-manager.md)`
- `read_file(...)` for required startup and role-relevant docs
- `wc -l SESSION_MEMORY.md && test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING && git status --short --branch`
- `cronjob(action="list")`
- `date '+%Y-%m-%d %H:%M:%S %Z' && git diff -- -- Developer/agent_room/auto_deploy_notification_hygiene_2026-06-24.md`

## 검증 결과

- gstack check: `GSTACK_OK`
- Git status before artifact: branch `feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 6]`, many pre-existing modified/untracked files present.
- No commit/push performed.
- No existing user/other-agent project files were overwritten by this note.

## Blockers

없음. 이전 run의 blocker였던 `~/.claude/skills/gstack/bin` 누락은 이번 run에서 `GSTACK_OK`로 해소되어 산출물을 작성했다.

## Handoff

현재 자동 투입 wave에는 별도 사용자-facing 반복 알림이 필요하지 않다. 이후 Terry가 "자동 투입 결과를 매일/매주 알려줘"처럼 명시하면 그때 기존 ledger와 cron 목록을 먼저 대조한 뒤, 중복 없는 local-first 또는 origin 전달 job을 별도 생성하면 된다.

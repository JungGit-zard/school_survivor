# Jabda Reminder hourly subagent routing monitor

Created: 2026-08-09
Owner: jabdareminder
Project: Escape! zombie school
Board: escape-zombie-school

## Purpose

User canonical requirement: check automatic subagent routing every 1 hour.

This installs a durable local Windows hourly audit monitor for this checkout. The monitor is read-only toward game code, Firebase, and Kanban task state. It writes only operations artifacts under `Developer/agent_room/operations/`.

## Windows Scheduled Task

- Task name: `EscapeZombieSchool-Hourly-Subagent-Routing-Monitor`
- Schedule: hourly, `PT1H`
- Start boundary from verified XML: `2026-08-09T11:21:00`
- Next run observed by `schtasks /Query`: `2026-08-09 12:21:00` local time
- Duplicate handling: task registration uses the same explicit task name with `/F`, so re-install updates that one named task instead of creating additional named copies. A post-query found only `\EscapeZombieSchool-Hourly-Subagent-Routing-Monitor` matching the task name.
- Verified task definition export: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.task.xml`

Verified action from exported XML:

```xml
<Command>powershell.exe</Command>
<Arguments>-NoProfile -ExecutionPolicy Bypass -File D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.ps1</Arguments>
```

## Audit script and artifacts

- Idempotent audit script: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.ps1`
- PASS/FAIL operations log: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\logs\jabdareminder_hourly_subagent_routing_monitor.log`
- Last-status artifact: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.last.json`
- Scheduled Task XML snapshot: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.task.xml`

## Immediate invocation result

Immediate audit command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/operations/jabdareminder_hourly_subagent_routing_monitor.ps1
```

Actual output:

```text
2026-08-09 11:27:57+09:00	PASS	checks=41	failures=0	last_status=D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.last.json
```

## Checks performed by each audit run

1. Verifies required project policy and routing files exist:
   - `AGENTS.md`
   - `Bang_Rules.md`
   - `CLAUDE.md`
   - `project_develop_policy.md`
   - `SESSION_CONTINUITY.md`
   - `SESSION_MEMORY.md`
   - `Developer/agent_room/mandatory_precommand/README.md`
   - `Developer/agent_room/mandatory_precommand/manifest.json`
   - `Developer/agent_room/mandatory_precommand/check-required-documents.ps1`
   - `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
   - `Developer/agent_room/game_development_kanban_process.md`
   - `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
   - `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
   - `Developer/agent_room/escape_zombie_school_subagent_autoinput_handoff_2026-07-17.md`
   - `Developer/agent_room/antigravity_ide_subagent_handoff.md`
   - `.claude/settings.json`
   - `.claude/hooks/require-subagent-routing-for-project.sh`
   - `.claude/hooks/require-subagent-routing-for-prompt.sh`
2. Verifies `.claude/settings.json` references both:
   - `mandatory_precommand/check-required-documents.ps1`
   - `require-subagent-routing-for-project.sh`
3. Verifies `.claude/settings.json` has `UserPromptSubmit` wired to:
   - `require-subagent-routing-for-prompt.sh`
4. Runs the central mandatory precommand checker with:
   - profile: `jabdareminder`
   - domain: `auto`
   - safe summary: `hourly-subagent-routing-monitor`
5. Confirms the checker matched the operations domain:
   - `matched_domains=operations`
   - `match_evidence={"domain":"operations","keyword":"agent"}`
   - `combined_receipt_sha256=9659684d1217483c19b5b5d9e202af5d3b6c3176016244b1a3f7fea780680f3f`
6. Verifies Hermes CLI exists at:
   - `C:/Users/admin/AppData/Local/hermes/hermes-agent/venv/Scripts/hermes.exe`
7. Verifies board reachability with read-only command:
   - `hermes kanban --board escape-zombie-school stats`
8. Verifies real registered assignees with read-only command:
   - `hermes kanban --board escape-zombie-school assignees`
9. Confirms all required real profiles are `ON DISK yes`:
   - `threemini`
   - `uimini`
   - `levelmini`
   - `balanceqa`
   - `bizmini`
   - `launchmini`
   - `backendmini`
   - `englishgradmini`
   - `madangsue`
   - `jabdareminder`
   - `soundmini`
   - `corpopsmini`
10. Verifies Hermes routing readiness basics via `hermes status --all`:
   - command succeeds
   - configured provider has OpenAI Codex OAuth logged in
   - terminal backend is local

## Observed board snapshot during immediate audit

`hermes kanban --board escape-zombie-school stats` succeeded. Snapshot in the last-status artifact showed:

```text
triage=0, todo=21, scheduled=0, ready=0, running=2, blocked=72, done=155
```

The monitor does not act on these counts; they are evidence only.

## Limitations and non-actions

- The monitor does not dispatch backlog.
- The monitor does not edit gameplay, graphics, audio, Firebase data, or Kanban task state.
- The monitor does not run tests, builds, browser automation, commits, pushes, or Google Play/store operations.
- `hermes status --all` reported Hermes gateway service as stopped during the immediate audit; this is recorded as a limitation in `last.json`, not auto-fixed by this read-only monitor.
- The task runs with Windows Task Scheduler `InteractiveToken`, so it is intended for this local Windows user session context.

## Files changed for this task

- `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.ps1`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.last.json`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\logs\jabdareminder_hourly_subagent_routing_monitor.log`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\operations\jabdareminder_hourly_subagent_routing_monitor.task.xml`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\agent_room\jabdareminder_hourly_subagent_routing_monitor_2026-08-09.md`

## Verification commands run

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile jabdareminder -Domain auto -TaskSummary hourly-subagent-routing-monitor
hermes kanban --board escape-zombie-school stats
hermes kanban --board escape-zombie-school assignees
hermes status --all
powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/operations/jabdareminder_hourly_subagent_routing_monitor.ps1
schtasks.exe /Create /TN EscapeZombieSchool-Hourly-Subagent-Routing-Monitor /SC HOURLY /MO 1 /TR <script action> /F
schtasks.exe /Query /TN EscapeZombieSchool-Hourly-Subagent-Routing-Monitor /FO LIST /V
schtasks.exe /Query /TN EscapeZombieSchool-Hourly-Subagent-Routing-Monitor /XML
```

No commit or push was performed.

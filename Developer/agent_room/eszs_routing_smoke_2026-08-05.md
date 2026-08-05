# ESZS mandatory subagent routing smoke — 2026-08-05

Task: `t_4246cce4`
Scope: no code changes; read/verify mandatory subagent auto-routing wiring.
Workspace: `D:/Jungsil/2.Minigame_project/school_survivor-integration`

## Files read

- `AGENTS.md`
  - Mandatory rule found at lines 164–171: every non-empty Escape! zombie school request must run the routing check before completion.
  - Real Hermes/Kanban profiles listed: `threemini`, `uimini`, `levelmini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`, `corpopsmini`.
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
  - Absolute rule found: no silent direct-work bypass.
  - Accepted trails: Kanban card, `Developer/agent_room/` artifact, or `.claude/agents/<profile>.md` review trail.
  - Routing map includes graphics/UI/gameplay/QA/business/launch/backend/English/ops/reminder/sound/corporate-ops domains.
- `.claude/settings.json`
  - JSON parsed successfully.
  - PreToolUse hooks register `.claude/hooks/require-subagent-routing-for-project.sh` for `Write`, `Edit`, and `MultiEdit`.
- `.claude/hooks/require-subagent-routing-for-project.sh`
  - Hook checks edit/write-like tool payloads and returns an `ask` permission decision with the mandatory routing gate message.

## Command outputs

### `pwd`

```text
/d/Jungsil/2.Minigame_project/school_survivor-integration
```

### `git status --short --branch`

```text
## zombie_only...origin/zombie_only [ahead 1]
 M Developer/r3f_prototype/database.rules.json
 M Developer/r3f_prototype/src/lib/databaseRules.test.js
 M Developer/r3f_prototype/src/lib/upgrades.js
 M Developer/r3f_prototype/src/lib/weaponCatalog.js
 M Developer/r3f_prototype/src/lib/weaponCatalog.test.js
 M Developer/r3f_prototype/src/lib/weaponPermanentUpgrades.test.js
?? Developer/agent_room/soundmini_better_minigame_bgm_research_and_implementation_plan_2026-08-05.md
?? Developer/r3f_prototype/src/lib/i18nCallsites.audit.mjs
?? Developer/r3f_prototype/src/lib/i18nCoverage.audit.mjs
?? Developer/r3f_prototype/src/lib/i18nExtra.audit.mjs
?? marketing/google_playstore_image/
```

Note: the existing working-tree changes above were already present during this smoke. This task only added this artifact.

### `.claude/settings.json` parse and hook registration check

Command:

```bash
python - <<'PY'
import json
from pathlib import Path
p=Path('.claude/settings.json')
d=json.loads(p.read_text(encoding='utf-8-sig'))
pts=d.get('hooks',{}).get('PreToolUse',[])
print('valid JSON')
for name in ['Write','Edit','MultiEdit']:
    matches=[x for x in pts if x.get('matcher')==name]
    found=any('require-subagent-routing-for-project.sh' in h.get('command','') for m in matches for h in m.get('hooks',[]))
    print(f'{name}: require-subagent-routing-for-project.sh registered={found}')
PY
```

Output:

```text
valid JSON
Write: require-subagent-routing-for-project.sh registered=True
Edit: require-subagent-routing-for-project.sh registered=True
MultiEdit: require-subagent-routing-for-project.sh registered=True
```

### Hook syntax check

Command:

```bash
bash -n .claude/hooks/require-subagent-routing-for-project.sh && echo 'bash -n OK'
```

Output:

```text
bash -n OK
```

### Hook dry run: edit/write payload

Command:

```bash
printf '{"tool_name":"Write"}' | .claude/hooks/require-subagent-routing-for-project.sh
```

Output:

```text
stdout:
{"permissionDecision":"ask","message":"Escape! zombie school mandatory subagent routing gate: confirm relevant specialist involvement/trail before this edit proceeds."}

stderr:
SUBAGENT ROUTING REQUIRED: Escape! zombie school project edits must run the mandatory subagent routing check before completion.

Read: Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md
Use board: escape-zombie-school
Real profiles: threemini, uimini, levelmini, balanceqa, bizmini, launchmini, backendmini, englishgradmini, madangsue, jabdareminder, soundmini, corpopsmini.
Hard gates: sound/audio -> soundmini; corporate/tax/revenue-settlement -> corpopsmini.
Accepted trail: Kanban card, Developer/agent_room artifact, or .claude/agents/<profile>.md review trail.
```

Exit code: `0`

### Hook dry run: non-edit payload

Command:

```bash
printf '{"tool_name":"Read"}' | .claude/hooks/require-subagent-routing-for-project.sh
```

Output:

```text
{}
rc=0
```

### Kanban board assignees

Command:

```bash
hermes kanban --board escape-zombie-school assignees
```

Output:

```text
NAME                  ON DISK   COUNTS
backendmini           yes       blocked=2, done=4, todo=2
balanceqa             yes       blocked=7, done=9, todo=4
bizmini               yes       done=2
corpopsmini           yes       (idle)
default               yes       (idle)
englishgradmini       yes       done=2
jabdareminder         yes       done=2
launchmini            yes       done=4
levelmini             yes       blocked=3, done=6
madangsue             yes       done=7, running=1
soundmini             yes       blocked=2, done=4
threemini             yes       blocked=10, done=14
uimini                yes       blocked=4, done=8, todo=2
```

### Kanban board stats

Command:

```bash
hermes kanban --board escape-zombie-school stats
```

Output:

```text
By status:
  triage    0
  todo      8
  scheduled  0
  ready     0
  running   1
  blocked   28
  done      62

By assignee:
  backendmini           blocked=2, done=4, todo=2
  balanceqa             blocked=7, done=9, todo=4
  bizmini               done=2
  englishgradmini       done=2
  jabdareminder         done=2
  launchmini            done=4
  levelmini             blocked=3, done=6
  madangsue             done=7, running=1
  soundmini             blocked=2, done=4
  threemini             blocked=10, done=14
  uimini                blocked=4, done=8, todo=2
```

### Agent-room TOMLs present

Command:

```bash
python - <<'PY'
import re
from pathlib import Path
root=Path('C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents')
print('root exists:', root.exists())
for p in sorted(root.glob('*.toml')):
    txt=p.read_text(encoding='utf-8-sig')
    vals={}
    for k in ['id','name','display_name','status']:
        m=re.search(r'^'+k+r'\s*=\s*["\']([^"\']+)', txt, re.M)
        if m: vals[k]=m.group(1)
    print(f"{p.name}: id={vals.get('id')} name={vals.get('name')} status={vals.get('status')}")
PY
```

Output:

```text
root exists: True
Backend_Mini.toml: id=minigame_backend_realtime_identity_specialist name=Backend_Mini status=active
Balance_QA_Mini.toml: id=game_difficulty_leveling_qa_specialist name=Balance_QA_Mini status=active
Biz_Mini.toml: id=minigame_business_model_specialist name=Biz_Mini status=active
Corp_Ops_Mini.toml: id=corporate_operations_tax_specialist name=Corp_Ops_Mini status=active
English_Grad_Mini.toml: id=english_literature_grad_assignment_specialist name=English_Grad_Mini status=active
Jabda_Reminder_Manager.toml: id=jabda_reminder_manager name=Jabda_Reminder_Manager status=active
Launch_Mini.toml: id=google_play_minigame_launch_specialist name=Launch_Mini status=active
Level_Mini.toml: id=web_minigame_leveling_planner name=Level_Mini status=active
Madang_sue.toml: id=madang_sue name=Madang_sue status=active
Sound_Mini.toml: id=minigame_sound_voice_rnd_specialist name=Sound_Mini status=active
Three_Mini.toml: id=mini_game_graphics_implementation_agent name=Three_Mini status=active
UI_Mini.toml: id=minigame_ui_development_specialist name=UI_Mini status=active
```

## Routing profile conclusion

The mandatory routing rule points to real Kanban profiles on board `escape-zombie-school`:

- `threemini` — ON DISK yes
- `uimini` — ON DISK yes
- `levelmini` — ON DISK yes
- `balanceqa` — ON DISK yes
- `bizmini` — ON DISK yes
- `launchmini` — ON DISK yes
- `backendmini` — ON DISK yes
- `englishgradmini` — ON DISK yes
- `madangsue` — ON DISK yes
- `jabdareminder` — ON DISK yes
- `soundmini` — ON DISK yes
- `corpopsmini` — ON DISK yes

The agent-room registry also maps these runnable `hermes_profile` names to active TOML records under `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/`.

## Conclusion

PASS. The project docs, Claude settings, hook script, Kanban board assignees, and agent-room TOMLs are consistent enough for mandatory Escape! zombie school subagent routing enforcement. The hook is registered for `Write`, `Edit`, and `MultiEdit`, passes shell syntax validation, asks for routing confirmation on edit/write payloads, and stays silent for non-edit payloads.

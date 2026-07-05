# Sound_Mini Wiring Check

Date: 2026-07-05 11:35 KST  
Project: Escape! zombie school  
Board: `escape-zombie-school`

## Result

- `soundmini` is a real spawnable Hermes profile according to `hermes profile list` / `hermes profile show soundmini`.
- Profile config exists at `C:/Users/admin/AppData/Local/hermes/profiles/soundmini/config.yaml`.
- Profile `SOUL.md` exists at `C:/Users/admin/AppData/Local/hermes/profiles/soundmini/SOUL.md`.
- Profile gstack path exists at `C:/Users/admin/AppData/Local/hermes/profiles/soundmini/home/.claude/skills/gstack/bin`.
- `soundmini` appears in `hermes kanban --board escape-zombie-school assignees` with `ON DISK yes`.
- Board stats at check time: `todo=0`, `ready=0`, `running=0`, `blocked=0`, `done=33`.
- Global registry contains `Sound_Mini` with `hermes_profile = "soundmini"`; display name updated to `사운드미니`.
- Project routing docs map sound/SFX/BGM/voice/WebAudio/audio licensing work to `soundmini`.
- Claude Code auto-delegation mirror added: `.claude/agents/soundmini.md`.

## Commands / inspections used

```bash
hermes profile list
hermes profile show soundmini
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
find Developer/r3f_prototype/public/sfx -type f
```

## Fixes applied in this pass

- Added `.claude/agents/soundmini.md` so Claude Code has an auto-use mirror for sound/audio work.
- Updated `Developer/agent_room/ide_agent_subagent_autocall_handoff.md` so `soundmini` appears in the real spawnable profile list and sound routing map.
- Updated `Developer/agent_room/subagent_system_wiring_2026-07-03.md` Claude Code layer from five to six mirrored development profiles by adding `soundmini`.
- Updated Sound_Mini durable knowledge with Terry's Atari-grade machine sound expression-expansion training focus.

## Note

A previous 2026-07-04 wiring check looked for `SOUL.md` under `profiles/soundmini/home/SOUL.md`, but the actual profile-level `SOUL.md` lives at `profiles/soundmini/SOUL.md`. The profile file is present.

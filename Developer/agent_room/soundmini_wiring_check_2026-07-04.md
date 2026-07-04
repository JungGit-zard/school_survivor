# Sound_Mini Wiring Check

Date: 2026-07-04

## Result

- `soundmini` is registered on the `escape-zombie-school` Kanban board.
- `soundmini` appears in `hermes kanban --board escape-zombie-school assignees` with `ON DISK yes`.
- Board stats include `soundmini done=1`; current board totals are `todo=0`, `ready=0`, `running=0`, `blocked=0`, `done=33`.
- Global registry contains `Sound_Mini` with `hermes_profile = "soundmini"`.
- Global agent TOML exists at `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Sound_Mini.toml`.
- Sound workspace exists at `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_sound_voice_rnd_specialist`.
- Profile gstack path exists at `C:/Users/admin/AppData/Local/hermes/profiles/soundmini/home/.claude/skills/gstack/bin`.
- Project routing docs map sound/SFX/BGM/voice/WebAudio/audio licensing work to `soundmini`.

## Commands Rechecked

- `hermes kanban --board escape-zombie-school assignees`
- `hermes kanban --board escape-zombie-school stats`
- `Test-Path` checks for the global TOML, workspace, profile gstack path, and profile `SOUL.md`
- Registry lookup for `Sound_Mini`, `soundmini`, and `minigame_sound_voice_rnd_specialist`

## Fix Applied

- Updated `project_develop_policy.md` so the mandatory real profile list includes `soundmini`.

## Note

- `C:/Users/admin/AppData/Local/hermes/profiles/soundmini/home/SOUL.md` was not found. Kanban spawning is still verified by board assignee presence and prior `soundmini` done task, but the missing `SOUL.md` should be treated as a profile hygiene follow-up if that file is required by future worker bootstrap.
- `hermes kanban status` is not a valid Hermes subcommand. Use `hermes kanban --board escape-zombie-school stats` for board state.

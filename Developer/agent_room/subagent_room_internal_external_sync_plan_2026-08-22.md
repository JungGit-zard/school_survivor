# Sub-Agent Room internal/external sync plan

Date: 2026-08-22 KST
Project: Escape! zombie school
Owner direction: Terry
Status: structural decision / pending implementation

## 1. Terry's decision

Terry decided that the sub-agent room problem will be organized by keeping matching structures in both places:

1. Project-internal sub-agent room
2. External/global Hermes sub-agent room wrapper

The two should be made visibly parallel and synchronized by push/sync operations.

## 2. Intended structure

### External/global wrapper

Canonical existing external room:

`C:/Users/admin/AppData/Local/hermes/sub-agent-room/`

This is the global Hermes/custom-agent wrapper and registry. It contains global agent TOMLs, global knowledge rooms, registry, and long-term cross-project learning.

### Project-internal room

Target project-local mirror should live under the Escape! zombie school repository, most likely under:

`D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/project-local-sub-agent-room/`

This project-local room is where Escape! zombie school agents should directly work, learn, and leave project-specific state/artifacts.

## 3. Required relationship

The relationship is not "external only".

Correct model:

```text
External/global sub-agent-room
↔ synchronized with
Project-internal sub-agent-room mirror
↔ directly attached to Escape! zombie school repo/work
```

The project-internal room should be close to the code and project artifacts so subagents can directly participate in the project rather than only existing in an external wrapper.

## 4. Sync/push principle

Terry's direction:

- Make one matching structure inside the project.
- Keep one matching structure outside in the global wrapper.
- Mark/label them clearly so it is obvious which side is internal and which side is external.
- Work and learning happen inside the project when the work is project-specific.
- Push/sync the relevant learning/agent-room state between the internal and external structures.

## 5. Implementation notes for future agent

Do not silently scatter sub-agent files.

When implementing this structure:

1. Preserve the current existing project records under:
   - `Developer/agent_room/`
   - `project_subagents/`
2. Create a clear project-local mirror directory rather than replacing existing logs.
3. Include a README explaining:
   - this is the Escape! zombie school project-local mirror,
   - the external canonical wrapper is `C:/Users/admin/AppData/Local/hermes/sub-agent-room/`,
   - sync/push is intentional.
4. Add registry/manifest files that map internal agents to external agents, e.g.:
   - `soundmini` ↔ `Sound_Mini.toml` ↔ `minigame_sound_voice_rnd_specialist`
   - `threemini` ↔ `Three_Mini.toml` ↔ `mini_game_graphics_implementation_agent`
   - `uimini` ↔ `UI_Mini.toml` ↔ `minigame_ui_development_specialist`
   - etc.
5. Add sync direction docs:
   - `sync_from_external.md`
   - `sync_to_external.md`
   - or a single `SYNC.md`
6. Do not perform destructive moves/deletes without Terry's explicit approval.

## 6. Current known state at time of note

Existing project-side structures:

- `Developer/agent_room/`
- `project_subagents/`

Existing external/global structure:

- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/`

Missing at last check:

- `school_survivor-integration/sub-agent-room`
- `school_survivor-integration/Developer/sub-agent-room`
- `school_survivor-integration/Developer/agent_room/sub-agent-room`
- `school_survivor-integration/Developer/agent_room/project-local-sub-agent-room`
- `school_survivor-integration/Developer/agent_room/global-agent-room`

## 7. Short summary

Terry wants two visibly matching sub-agent-room structures:

```text
external/global Hermes wrapper
project-internal ESZS room
```

They should be synchronized/pushed so the project-local agents can work and learn inside the repo while still feeding the external/global wrapper.

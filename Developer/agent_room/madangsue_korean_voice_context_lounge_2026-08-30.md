# Madangsue — korean_voice_context lounge resident creation report (2026-08-30)

Kanban: `t_a81be958`
Profile: `madangsue`
Project: Escape! zombie school
Project workdir: `D:/JungSil/2.Minigame_project/school_survivor-integration`
External lounge: `C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo`
External remote: `https://github.com/JungGit-zard/-subagent_lounge.git`
External branch: `add-weapon-item-balance-role`

## Mandatory pre-command gate

Command run:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile madangsue -Domain auto -TaskSummary 'korean-voice-context-lounge-resident'
```

Result:

- exit_code: `0`
- resolved_domains: `common`, `audio`, `operations`
- matched_domains: `audio`
- match_evidence: `voice`
- combined_receipt_sha256: `173ed7e853822ee83b4a00d67730ea281cac4a7684a9a479d9bed6ba9b737667`

All emitted `read_required` documents were read completely except `SESSION_MEMORY.md`, which was read according to the central rule as the latest single session entry only: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`.

## Reuse decision

No registered Escape! zombie school Hermes profile fully covers a durable Korean STT context interpreter:

- `soundmini` covers audible voice/audio/SFX/BGM/WebAudio boundaries, but this task is text-context interpretation rather than audio production.
- `madangsue` covers operations, normalization ledgers, routing, and agent-room hygiene, but is not a reusable read-only Korean STT context interpreter role.

Existing deterministic project normalizer was reused as the implementation reference:

- `Developer/voice_input/prompt_normalizer.py`
- `Developer/voice_input/escape_zombie_school_voice_lexicon.json`
- `Developer/voice_input/test_prompt_normalizer.py`
- `.claude/hooks/normalize-voice-prompt.sh`
- `.claude/settings.json`
- `Developer/agent_room/madangsue_voice_prompt_normalizer_2026-08-30.md`
- `Developer/agent_room/soundmini_voice_input_normalizer_review_2026-08-30.md`

Only the missing lounge catalog role was created. No Hermes registration, attach/import/install, scheduling, commit, push, Firebase access, browser profile access, or private log access was performed.

## External files changed

Exactly three Markdown files in the allowlist were changed in the external lounge:

1. `roles/korean_voice_context/SYSTEM_PROMPT.md` — new role identity and full read-only Korean voice-context system prompt.
2. `agent-definitions/korean-voice-context.md` — new Claude-compatible agent definition.
3. `docs/HOW-TO-CALL.md` — added the `korean-voice-context` catalog row.

The agent definition YAML frontmatter is:

```yaml
name: korean-voice-context
model: opus
tools: Read, Grep, Glob, Bash
```

Identity/path/call-name consistency:

- Call name: `korean-voice-context`
- Role path/name: `korean_voice_context`
- System prompt path: `roles/korean_voice_context/SYSTEM_PROMPT.md`
- Agent definition path: `agent-definitions/korean-voice-context.md`

## Project files changed

1. `AGENTS.md` — restored the unrelated deleted title-policy header at the top while preserving the existing voice/받아쓰기 section.
2. `Developer/agent_room/korean_voice_context_lounge_resident_2026-08-30.toh` — TOH record with persona, role, viewpoint, authority, gates, output folder, triggers, non-triggers, and safety boundaries.
3. `Developer/agent_room/madangsue_korean_voice_context_lounge_2026-08-30.md` — this operational report.

## Contract output for the resident

The resident must return JSON-compatible fields:

```json
{
  "raw_prompt": "<verbatim user/STT prompt>",
  "normalized_prompt": "<high-confidence normalized candidate>",
  "corrections": [
    {"from": "<source>", "to": "<candidate>", "reason": "<why>", "confidence": "high|medium|low"}
  ],
  "protected_literals": ["<verbatim literals>"],
  "ambiguities": [
    {"term": "<ambiguous term>", "candidates": ["<candidate>"], "reason": "<why ambiguous>", "review_required": true}
  ],
  "review_required": true
}
```

`review_required` may be false only when no ambiguity and no destructive-command candidate remain.

## Verification commands and results

```bash
cd Developer/voice_input && python -m unittest test_prompt_normalizer.py
```

Result:

```text
............
----------------------------------------------------------------------
Ran 12 tests in 0.062s

OK
```

```bash
git -C C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo status --short --untracked-files=all
```

Result:

```text
 M docs/HOW-TO-CALL.md
?? agent-definitions/korean-voice-context.md
?? roles/korean_voice_context/SYSTEM_PROMPT.md
```

External allowlist script result:

```text
paths= ['docs/HOW-TO-CALL.md', 'agent-definitions/korean-voice-context.md', 'roles/korean_voice_context/SYSTEM_PROMPT.md']
allowlist_exact= True
all_markdown= True
count= 3
```

Agent definition YAML check result:

```text
name: korean-voice-context OK
model: opus OK
tools: Read, Grep, Glob, Bash OK
```

```bash
git status --short -- AGENTS.md Developer/agent_room/korean_voice_context_lounge_resident_2026-08-30.toh Developer/agent_room/madangsue_korean_voice_context_lounge_2026-08-30.md
```

Result:

```text
 M AGENTS.md
?? Developer/agent_room/korean_voice_context_lounge_resident_2026-08-30.toh
?? Developer/agent_room/madangsue_korean_voice_context_lounge_2026-08-30.md
```

TOH required-section check result:

```text
## Persona
## Role
## Main viewpoint
## Authority
## Gates
## Output folder
## Triggers
## Non-triggers
## Safety boundaries
```

## Safety boundaries observed

- No product code changed.
- No Firebase personal data or credentials read.
- No tokens, browser profiles, or private logs read or recorded.
- No lounge attach/import/install or Hermes registration performed.
- No schedule created.
- No commit or push performed.
- Existing unrelated dirty project worktree entries were preserved.

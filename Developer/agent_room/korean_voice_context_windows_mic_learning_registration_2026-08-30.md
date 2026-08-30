# Korean voice-context Windows microphone learning registration — 2026-08-30

Project: Escape! zombie school
Owner profile: madangsue
Kanban card: t_77d89987
Smoke task: t_ff2de29d

## Mandatory pre-command receipt

Command:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile madangsue -Domain auto -TaskSummary "finish-voice-registration-push-report"
```

Result:

```text
exit_code: 0
resolved_domains: common, audio, operations
matched_domains: audio
match_evidence: audio keyword voice
combined_receipt_sha256: 447b1f52df97bfce86fb936aeaf836e243280fd4633407bf98366c67bfc28bac
```

All emitted READ_REQUIRED documents were read completely except `SESSION_MEMORY.md`, which was read as the latest single entry only (`Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`).

## Project changes

- `AGENTS.md` now has the narrow always-normalize rule for every non-empty Escape! zombie school prompt.
- The rule keeps normalization as interpretation context only and keeps raw text as source of truth.
- Exact literals remain protected: numbers, paths, URLs, IDs, quoted values, and similar user-specified values.
- No game runtime code, product audio, Firebase data, browser profile, build output, AAB/APK, release lane, or title/audio asset was changed.
- No project commit or project push was performed.

## Global Codex/Orca skill change

Updated global skill:

```text
C:/Users/admin/AppData/Roaming/orca/codex-runtime-home/home/skills/escape-zombie-school-voice-normalizer/SKILL.md
```

Recorded policy:

- Use the normalizer for every non-empty Escape! zombie school prompt, including speech-to-text, microphone dictation, typed Korean shorthand, or mixed Korean/English commands.
- Raw prompt remains the source of truth.
- `normalized_prompt` is only an interpretation aid.
- Explicit user corrections must use the safe ledger CLI `add-correction`.
- Agent observations/guesses/one-off examples remain inactive unless explicitly confirmed by the user.

## Hermes/local profile registration evidence

Profile TOML:

```text
C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Korean_Voice_Context.toml
```

Evidence read from TOML:

```text
id = korean_voice_context
name = Korean_Voice_Context
display_name = 한국어음성문맥
status = active
hermes_profile = koreanvoicecontext
workspace = C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/korean_voice_context
project_workdir = D:/JungSil/2.Minigame_project/school_survivor-integration
canonical_normalizer = D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/voice_input/prompt_normalizer.py
canonical_lexicon = D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/voice_input/escape_zombie_school_voice_lexicon.json
default_personal_ledger = C:/Users/admin/AppData/Local/hermes/voice_input/korean_personal_pronunciation_ledger.json
```

Profile show:

```text
Profile: koreanvoicecontext
Path:    C:\Users\admin\AppData\Local\hermes\profiles\koreanvoicecontext
Model:   gpt-5.5 (openai-codex)
Gateway: stopped
Skills:  90
.env:    not configured
SOUL.md: exists
```

Assignee evidence:

```text
koreanvoicecontext    yes       done=1
madangsue             yes       blocked=6, done=63, running=1
soundmini             yes       blocked=4, done=20, todo=3
```

## Normalizer and ledger CLI usage

Validation command:

```text
python -m unittest Developer/voice_input/test_prompt_normalizer.py
```

Safe explicit correction command pattern:

```text
python Developer/voice_input/prompt_normalizer.py add-correction "<spoken-or-misheard>" "<canonical>"
```

Inactive observation command pattern:

```text
python Developer/voice_input/prompt_normalizer.py observe-variant "<observed-variant>" "<candidate>" --source recurring
```

Hook mode:

```text
python Developer/voice_input/prompt_normalizer.py --hook-json
```

Help output confirms subcommands:

```text
add-correction      Add an explicit user-approved personal STT correction if it passes safety guards.
observe-variant     Record a safe recurring STT variant as inactive evidence only.
--hook-json         Read Claude UserPromptSubmit hook JSON and emit hookSpecificOutput JSON.
```

## Raw-audio prohibition and safety boundary

The Korean voice-context role is for text prompt interpretation and personal pronunciation-ledger stewardship only.

Prohibited in this registration scope:

- raw audio recording collection
- private microphone audio storage
- voice cloning or real-person imitation
- SFX/BGM/WebAudio/audio asset production
- Firebase, credentials, browser profiles, private logs, and secrets
- automatic promotion of observations into active correction behavior
- destructive commands generated from ambiguous STT

Sound/audio production remains under `soundmini`; this role only interprets Korean text context safely.

## Smoke task evidence

Smoke task:

```text
t_ff2de29d — Smoke Korean voice OSS resident
assignee: koreanvoicecontext
status: done
run: 909
summary: koreanvoicecontext profile spawned/claimed successfully; read-only OSS smoke completed.
```

Smoke conclusion:

- Best official open-source ASR candidates: OpenAI Whisper and Vosk.
- Neither candidate was treated as proof of automatic personal pronunciation adaptation.
- Existing safe ledger/post-correction layer remains necessary.

## External GitHub Lounge branch and commit

External repo:

```text
C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo
```

Branch:

```text
add-korean-voice-context-role
```

Commit:

```text
2d2efe7 Add Korean voice context role
```

Remote verification:

```text
2d2efe7a4c0545295a03afeda70c6bf3d0947c28 refs/heads/add-korean-voice-context-role
```

Committed allowlist only:

```text
agent-definitions/korean-voice-context.md
docs/HOW-TO-CALL.md
roles/korean_voice_context/SYSTEM_PROMPT.md
```

External repo final status:

```text
## add-korean-voice-context-role
changed_paths=0
```

No merge to master was performed.

## Verification results

19-test result:

```text
...................
----------------------------------------------------------------------
Ran 19 tests in 0.080s

OK
{"ok": true, "action": "add-correction"}
{"ok": true, "action": "observe-variant"}
{"ok": false, "action": "observe-variant"}
```

Hook smoke command:

```text
printf '%s' '{"prompt":"탈출 좀비 학교 그래픽 스타지오에서 D:/tmp/a 그래픽 스타지오/file.glb revision=rev-2026-08-30 확인"}' | ./.claude/hooks/normalize-voice-prompt.sh
```

Hook smoke result:

```text
raw_prompt_preserved: true
normalized_prompt: Escape! zombie school Graphics Studio에서 D:/tmp/a 그래픽 스타지오/file.glb revision=rev-2026-08-30 확인
corrections: 탈출 좀비 학교 -> Escape! zombie school; 그래픽 스타지오 -> Graphics Studio
ambiguities: []
review_required: false
protected_literals_count: 2
```

Global skill readback confirmed the new every-non-empty prompt rule, raw source-of-truth rule, safe `add-correction` rule, inactive-observation rule, and unittest validation command.

AGENTS readback confirmed lines 199-203 contain the narrow always-normalize rule.

## Final note

This card completed registration/push/report operations only. It did not redo discovery or profile creation, did not create additional cards, and did not commit/push the Escape! zombie school project repository.

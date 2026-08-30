# Sound_Mini — Korean voice-context resident safety boundary review (2026-08-30)

- Kanban: `t_710504b0`
- Reviewer: `soundmini`
- Project: Escape! zombie school
- Project workdir: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- Scope: read-only safety review of `korean-voice-context` lounge role and deterministic project voice normalizer. No product code, audio files, lounge role files, AGENTS/settings/registration, commit, push, install, attach, or scheduling changes.
- Output file only: `Developer/agent_room/soundmini_korean_voice_context_lounge_review_2026-08-30.md`

## Verdict

BLOCK / PASS not granted.

The role boundary itself is mostly well separated from audible game audio, and the normalizer unit tests pass. However one focused literal-preservation probe found a blocking defect: an unquoted Windows/URL-style path containing a space and a project term can be rewritten inside the path. That violates the stated exact literal preservation boundary.

## Mandatory pre-command gate

Command run from project root:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile soundmini -Domain auto -TaskSummary 'korean-voice-context-resident-review'
```

Result:

```text
exit_code: 0
resolved_domains: common, qa, audio
matched_domains: qa, audio
match_evidence:
- qa: review
- audio: voice
combined_receipt_sha256: d5e58f42a06956cba1a5ca44c0bf2bf3090ac6494b7c9e7305c70ff6ede24c53
```

All emitted `read_required` documents were read completely except `SESSION_MEMORY.md`, which was read as the latest single entry only: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`. Additional Sound_Mini mandatory voice/audio methodology documents read: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`, and `Developer/agent_room/soundmini_animalese_voice_methodology_2026-07-15.md`.

## Files inspected

Project files:

- `Developer/voice_input/prompt_normalizer.py`
- `Developer/voice_input/escape_zombie_school_voice_lexicon.json`
- `Developer/voice_input/test_prompt_normalizer.py`
- `.claude/settings.json`
- `.claude/hooks/normalize-voice-prompt.sh`
- `Developer/agent_room/korean_voice_context_lounge_resident_2026-08-30.toh`
- `Developer/agent_room/madangsue_korean_voice_context_lounge_2026-08-30.md`

External lounge allowlist files:

- `C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo/roles/korean_voice_context/SYSTEM_PROMPT.md`
- `C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo/agent-definitions/korean-voice-context.md`
- `C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo/docs/HOW-TO-CALL.md`

## Boundary checks

### 1. Raw prompt authority

PASS.

- `prompt_normalizer.py:153-161` returns both `original` / `raw_prompt` and `normalized` / `normalized_prompt`.
- `hook_specific_output()` injects additional context only; it does not replace the submitted prompt.
- `.claude/hooks/normalize-voice-prompt.sh:15-21` emits hook JSON and exits non-blocking on failure with `{}`.
- `.claude/settings.json:48-60` registers this as a `UserPromptSubmit` hook after the subagent-routing prompt hook.

### 2. Exact literal preservation

BLOCKING FAIL.

The normalizer protects many literal classes, but `PROTECTED_PATTERNS` at `Developer/voice_input/prompt_normalizer.py:25-27` stops path spans at whitespace. This lets project-term replacements run inside an unquoted path with spaces.

Focused probe:

```bash
python Developer/voice_input/prompt_normalizer.py <<'EOF'
D:/tmp/a 그래픽 스타지오/file.glb 확인
EOF
```

Observed result:

```text
"original": "D:/tmp/a 그래픽 스타지오/file.glb 확인\n"
"normalized": "D:/tmp/a Graphics Studio/file.glb 확인\n"
"protected_literals": ["D:/tmp/a", "file.glb"]
"review_required": false
```

Why this is blocking:

- The path-like literal changed from `D:/tmp/a 그래픽 스타지오/file.glb` to `D:/tmp/a Graphics Studio/file.glb`.
- The output also failed to list the full path as one protected literal.
- The role contract and AGENTS voice-input rule both require exact values, paths, filenames, and explicit literals to be preserved.

Non-blocking note: a similar probe with `D:/tmp/그래픽 스타지오/file.glb` happened to preserve the visible string because only partial spans were open to replacement, but the audit list still split the path into partial literals. The failure above proves the protection is not deterministic enough for paths with spaces.

### 3. Conservative context correction

PASS for covered non-literal text.

Unit tests and focused probe show high-confidence project terms such as `탈출 좀비 학교` and `그래픽 스타지오` are normalized only in open text. Ordinary Korean such as `하나만 더 확인` produced `{}` in hook mode.

Focused hook probe:

```bash
printf '%s' '{"prompt":"하나만 더 확인"}' | python Developer/voice_input/prompt_normalizer.py --hook-json
```

Observed result:

```text
{}
```

### 4. Ambiguity visibility

PASS.

Focused probe with `오르카` emitted an ambiguity marker and `review_required: true`:

```text
[[AMBIGUOUS: 오르카 -> Orca / orca CLI / ORCA?]]
review_flags: ["ambiguity_present"]
review_required: true
```

### 5. Destructive-command hard gate

PASS for tested aliases.

Focused hook probes:

```bash
printf '%s' '{"prompt":"메기"}' | python Developer/voice_input/prompt_normalizer.py --hook-json
printf '%s' '{"prompt":"메 기 실행해"}' | python Developer/voice_input/prompt_normalizer.py --hook-json
```

Observed result:

- Exact `메기`: preserved as `normalized_prompt: "메기"`, `review_required: true`, ambiguity reason `Known workflow command; raw prompt remains authoritative and requires review.`
- Spaced `메 기 실행해`: preserved as `normalized_prompt: "메 기 실행해"`, `review_required: true`, ambiguity reason `Not normalized because destructive intent is ambiguous.`

No shell/git command was generated.

### 6. Separation from audible game audio

PASS.

- `Developer/agent_room/korean_voice_context_lounge_resident_2026-08-30.toh:42-49` explicitly forbids product code, Firebase/local storage/build output, Hermes registration, commit/push, destructive commands, and audio/SFX/BGM/WebAudio changes.
- External `roles/korean_voice_context/SYSTEM_PROMPT.md:9-10` and `:33-38` mark audio production and SFX/BGM/WebAudio implementation as non-scope.
- External `agent-definitions/korean-voice-context.md:26-27` also excludes audio production and implementation.
- This review made no audio asset or product-code changes.

### 7. External YAML / identity / call-name

PARTIAL PASS with one portability concern.

Verified:

```text
frontmatter_name_ok= True
frontmatter_model_ok= True
frontmatter_tools_ok= True
call_name_in_how_to_call= True
role_identity_in_system_prompt= True
```

Concern:

- `agent-definitions/korean-voice-context.md:16` points to `C:\Users\brick\.claude\agent-room\roles\korean_voice_context\` while this run and project environment use `C:/Users/admin/...` and the external inspected lounge repo is under `C:/Users/admin/AppData/Local/Temp/...`.
- I did not mark this as the primary blocker because the external lounge docs already use `brick` generically in other call instructions, but it is a real host-specific path portability risk if the definition is installed on this admin machine.

### 8. External changed-file allowlist

PASS.

Command:

```bash
git -C C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo status --porcelain=v1 --untracked-files=all
```

Observed changed paths:

```text
M docs/HOW-TO-CALL.md
?? agent-definitions/korean-voice-context.md
?? roles/korean_voice_context/SYSTEM_PROMPT.md
```

Allowlist check result:

```text
external_changed_paths= ['docs/HOW-TO-CALL.md', 'agent-definitions/korean-voice-context.md', 'roles/korean_voice_context/SYSTEM_PROMPT.md']
allowlist_exact= True
all_markdown= True
count= 3
```

## Tests and focused probes run

### Normalizer unit tests

Command:

```bash
python -m unittest Developer/voice_input/test_prompt_normalizer.py
```

Result:

```text
............
----------------------------------------------------------------------
Ran 12 tests in 0.024s

OK
```

### Mixed normalization / literal / ambiguity probe

Command:

```bash
python Developer/voice_input/prompt_normalizer.py <<'EOF'
탈출 좀비 학교 그래픽 스타지오에서 D:/tmp/그래픽 스타지오/file.glb revision=rev-2026-08-30 33% `알 쓰리 에프` 오르카 확인
EOF
```

Key result:

```text
Escape! zombie school Graphics Studio에서 D:/tmp/그래픽 스타지오/file.glb revision=rev-2026-08-30 33% `알 쓰리 에프` [[AMBIGUOUS: 오르카 -> Orca / orca CLI / ORCA?]] 확인
review_required: true
```

This preserves visible literal text but exposes the same partial protected-literal issue for paths with spaces.

### Audio-separation probe

Command:

```bash
printf '%s' '{"prompt":"도지 사망 보이스 파일은 public/sfx/enemies/dogeDeath.ogg 수정하지 말고 텍스트 문맥만 검토"}' | python Developer/voice_input/prompt_normalizer.py --hook-json
```

Observed result:

```text
normalized_prompt: "Doji 사망 보이스 파일은 public/sfx/enemies/dogeDeath.ogg 수정하지 말고 텍스트 문맥만 검토"
corrections: [{"from":"도지","to":"Doji"}]
ambiguities: []
review_required: false
```

Interpretation: the normalizer only added text context; it did not touch audio files or create audio instructions. The role docs keep audible audio work under `soundmini`.

## Blocking defect list

1. `Developer/voice_input/prompt_normalizer.py:25-27` — path/file protected-span regexes do not cover unquoted paths with spaces, so `D:/tmp/a 그래픽 스타지오/file.glb` is rewritten to `D:/tmp/a Graphics Studio/file.glb`. This violates exact literal/path preservation and must be fixed before PASS.

## Non-blocking risks / follow-up notes

1. `C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo/agent-definitions/korean-voice-context.md:16` hardcodes `C:\Users\brick\...`; current machine/profile context is `admin`. Confirm whether this is intentionally lounge-global documentation or should be made portable before installing the definition on this host.
2. Unit tests do not currently cover unquoted paths with spaces containing replaceable project terms. Add a regression test before or with the fix.

## Final safety note

No product code, audio file, lounge file, settings file, AGENTS file, registration, install, attach, schedule, commit, push, Firebase data, browser profile, secret, or private log was modified by this review. Only this review report was written in the project output path.

# Sound_Mini — Korean voice learning registration review (2026-08-30)

- Kanban: `t_32a7d2dd`
- Reviewer: `soundmini`
- Project: Escape! zombie school
- Workdir: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- Scope: verification-only review after `t_77d89987`. No product/Firebase/audio changes. No project commit or push.
- Output file: `Developer/agent_room/soundmini_korean_voice_context_windows_mic_learning_review_2026-08-30.md`

## Verdict

PASS.

The Korean voice-context registration passes the requested soundmini/privacy/safety boundary review. The deterministic normalizer test suite is green at 19/19; the hook preserves raw prompts and protected literals while surfacing ambiguity/destructive aliases for review; no recorder/keylogger/raw-audio capture path was found in the inspected voice-input/hook surface; the global skill frames normalization as interpretation only; `koreanvoicecontext` is a real Hermes/Kanban profile; the external Lounge branch exists at the expected commit and contains exactly the three allowlisted committed files; and this review did not commit or push the project.

## Mandatory pre-command gate

Command run from project root:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile soundmini -Domain auto -TaskSummary 'review-korean-voice-registration'
```

Result:

```text
exit_code: 0
resolved_domains: common, qa, audio
matched_domains: qa, audio
match_evidence:
- qa: review
- audio: voice
combined_receipt_sha256: 4b8adf6a3ef630414db9cc8ddca58665a5897ede7ca659de0e994be624ccca20
```

All emitted `read_required` documents were read completely, except `SESSION_MEMORY.md`, which was read as the latest single entry only: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`. Additional Sound_Mini mandatory voice/audio documents were also read: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`, and `Developer/agent_room/soundmini_animalese_voice_methodology_2026-07-15.md`.

## Evidence

### 1. Full normalizer tests / hook behavior

Command:

```bash
PYTHONDONTWRITEBYTECODE=1 python -B -m unittest -v Developer/voice_input/test_prompt_normalizer.py
```

Result:

```text
Ran 19 tests in 0.097s
OK
```

Relevant passing test names included:

```text
test_hook_output_normalizes_every_prompt_as_interpretation_context ... ok
test_preserves_numbers_paths_urls_hashes_ids_and_quoted_text ... ok
test_preserves_unquoted_paths_with_spaces_and_project_terms ... ok
test_explicit_personal_correction_is_authoritative_but_rejects_sensitive_or_destructive_literals ... ok
test_observed_variants_reject_literals_ids_hashes_paths_quotes_and_destructive_aliases ... ok
test_marks_destructive_dictation_ambiguity_without_creating_a_command ... ok
test_exact_command_requires_review_but_is_not_rewritten ... ok
```

The test command also printed the expected CLI-learning smoke results:

```text
{"ok": true, "action": "add-correction"}
{"ok": true, "action": "observe-variant"}
{"ok": false, "action": "observe-variant"}
```

Interpretation: explicit correction and safe observation paths work, while a rejected observation returns `ok: false` instead of silently learning an unsafe/protected value.

### 2. Raw prompt and protected literals preserved

Hook command:

```bash
printf '%s' '{"prompt":"D:/tmp/a 그래픽 스타지오/file.glb revision=rev-2026-08-30 `알 쓰리 에프` 오르카 확인"}' | ./.claude/hooks/normalize-voice-prompt.sh
```

Observed key fields:

```text
raw_prompt_preserved: true
normalized_prompt: "D:/tmp/a 그래픽 스타지오/file.glb revision=rev-2026-08-30 `알 쓰리 에프` [[AMBIGUOUS: 오르카 -> Orca / orca CLI / ORCA?]] 확인"
review_required: true
review_flags: ["ambiguity_present"]
protected_literals_count: 3
policy: "protected spans preserved; high-confidence terminology only; ambiguity marked without invention"
```

Focused protected-path probe:

```bash
printf '%s' 'C:/tmp/오르카/그래픽 스타지오/file.glb 안의 그래픽 스타지오 확인' | python -B Developer/voice_input/prompt_normalizer.py
```

Observed key fields:

```text
original: "C:/tmp/오르카/그래픽 스타지오/file.glb 안의 그래픽 스타지오 확인"
normalized: "C:/tmp/오르카/그래픽 스타지오/file.glb 안의 Graphics Studio 확인"
protected_literals: ["C:/tmp/오르카/그래픽 스타지오/file.glb"]
```

Interpretation: the project term inside the path stayed Korean and protected; the same term in open text normalized to `Graphics Studio`.

### 3. Destructive aliases are not turned into commands

Commands:

```bash
printf '%s' '{"prompt":"메기"}' | ./.claude/hooks/normalize-voice-prompt.sh
printf '%s' '{"prompt":"메 기 실행해"}' | ./.claude/hooks/normalize-voice-prompt.sh
```

Observed key fields:

```text
exact 메기:
normalized_prompt: "메기"
review_required: true
review_flags: ["ambiguity_present", "destructive_command_alias_present"]
reason: "Known workflow command; raw prompt remains authoritative and requires review."

spaced 메 기:
normalized_prompt: "메 기 실행해"
review_required: true
review_flags: ["ambiguity_present", "ambiguous_destructive_command_candidate"]
reason: "Not normalized because destructive intent is ambiguous."
```

Interpretation: destructive workflow aliases remain text requiring review; no shell/git command is synthesized.

### 4. No raw audio / recorder / keylogger surface found

Search command covered `Developer/voice_input`, `.claude/hooks`, `.claude/settings.json`, and `AGENTS.md` for recorder/keylogger/raw-audio indicators:

```text
MediaRecorder|getUserMedia|audio/webm|audio/wav|recorder|keylogger|microphone|mic|keydown|keypress|keyup
```

Result:

```text
total_count: 0
```

Interpretation: the inspected registration/normalizer/hook surface is text-only; it does not introduce raw audio capture, microphone recording, recorder persistence, or keyboard logging behavior.

### 5. Global skill frames normalization as interpretation only

Inspected file:

```text
C:/Users/admin/AppData/Roaming/orca/codex-runtime-home/home/skills/escape-zombie-school-voice-normalizer/SKILL.md
```

Observed key lines:

```text
12|Keep the raw prompt as the source of truth. Normalization is only an interpretation aid; it must never replace, overwrite, or hide the original user text.
21|Interpret work from `normalized_prompt`, but preserve the raw prompt as the authoritative command record. Do not overwrite quoted/backticked text, numbers, units, percentages, coordinates, ports, paths, URLs, emails, hashes, IDs, filenames, Firebase revisions, or explicit user values.
```

Interpretation: global guidance is aligned with the project rule that normalized voice context is only interpretation, not an authoritative replacement.

### 6. `koreanvoicecontext` is real, spawnable, and read-only scoped

Profile command:

```bash
hermes profile show koreanvoicecontext
```

Observed:

```text
Profile: koreanvoicecontext
Path:    C:\Users\admin\AppData\Local\hermes\profiles\koreanvoicecontext
Model:   gpt-5.5 (openai-codex)
SOUL.md: exists
```

Kanban assignee evidence:

```bash
hermes kanban --board escape-zombie-school assignees | grep -i -C 2 koreanvoicecontext
```

Observed:

```text
koreanvoicecontext    yes       done=1
```

Read-only scope evidence from the parent handoff and registration artifacts: `t_77d89987` verified profile show/assignee evidence and smoke task `t_ff2de29d done`; the role registration describes the profile as voice/STT prompt interpretation context rather than audio production or runtime mutation. No Firebase/product/audio file changes were made by this review.

### 7. External Lounge commit exactly matches the allowlist and remote branch exists

External repo:

```text
C:/Users/admin/AppData/Local/Temp/subagent_lounge_weapon_balance_170964/repo
```

Commands:

```bash
git -C "$EXT" status --short --branch
git -C "$EXT" rev-parse HEAD
git -C "$EXT" show --name-only --pretty=format:'COMMIT %H%nSUBJECT %s' HEAD
git -C "$EXT" ls-remote --heads origin add-korean-voice-context-role
```

Observed:

```text
## add-korean-voice-context-role
2d2efe7a4c0545295a03afeda70c6bf3d0947c28
COMMIT 2d2efe7a4c0545295a03afeda70c6bf3d0947c28
SUBJECT Add Korean voice context role
agent-definitions/korean-voice-context.md
docs/HOW-TO-CALL.md
roles/korean_voice_context/SYSTEM_PROMPT.md
2d2efe7a4c0545295a03afeda70c6bf3d0947c28	refs/heads/add-korean-voice-context-role
```

Interpretation: the external Lounge commit contains exactly the three allowlisted files and the remote branch exists at the same SHA.

### 8. Project not committed/pushed by this review

Before review commands:

```text
## zombie_only...origin/zombie_only
HEAD: 3d759c5c (origin/zombie_only) Nerf Starlink cadence and rotate LineDraw
```

After verification commands, before writing this report, `git status --short --branch` still showed the same branch/head relationship and the pre-existing dirty working tree. This review performed no `git add`, `git commit`, or `git push`. The only intended new file from this task is this report.

## Final note

PASS is limited to the requested registration/safety boundary. This review did not approve unrelated dirty working-tree changes already present in the project, did not run product builds, did not modify Firebase, and did not change audio assets or runtime game audio.

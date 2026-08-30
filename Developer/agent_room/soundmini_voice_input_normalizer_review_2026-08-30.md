# Sound_Mini voice-input normalizer safety-boundary review (2026-08-30)

- Kanban: `t_1c227619`
- Reviewer: `soundmini`
- Scope: speech-input text-boundary review only. No game audio, SFX, BGM, WebAudio, Howler, `SOUND_MAP`, or `public/sfx` implementation changes.
- Parent implementation record: `Developer/agent_room/madangsue_voice_prompt_normalizer_2026-08-30.md`

## Mandatory pre-command gate

Command run from project root:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile soundmini -Domain auto -TaskSummary "speech-input-normalizer-review"
```

Result:

- exit_code: `0`
- resolved_domains: `common`, `qa`, `audio`
- matched_domains: `qa`
- match_evidence: `review`
- combined_receipt_sha256: `5401828e0968ec513b218e8a5354dc41f8b2a170663a4e38097e27d6e9c72f24`

All emitted `read_required` documents were read completely except `SESSION_MEMORY.md`, which was read according to the central rule as the latest single session entry only (`Session 8 · Entry 0 · 2026-08-30 0524 KST`). Additional soundmini startup documents were also read: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`, and `Developer/agent_room/soundmini_animalese_voice_methodology_2026-07-15.md`.

## Files reviewed

- `Developer/voice_input/prompt_normalizer.py`
- `Developer/voice_input/escape_zombie_school_voice_lexicon.json`
- `Developer/voice_input/test_prompt_normalizer.py`
- `.claude/hooks/normalize-voice-prompt.sh`
- `.claude/settings.json`
- `AGENTS.md`
- `Developer/agent_room/madangsue_voice_prompt_normalizer_2026-08-30.md`

## Verification commands and results

```bash
cd Developer/voice_input && python -m unittest test_prompt_normalizer.py
```

Result: `Ran 12 tests in 0.044s` / `OK`.

```bash
printf '{"prompt":"하나만 더 확인"}' | CLAUDE_PROJECT_DIR="$PWD" ./.claude/hooks/normalize-voice-prompt.sh
```

Result: `{}`. Unchanged ordinary Korean prompt does not inject extra context.

```bash
printf '{"prompt":"그래픽 스타지오에서 알 쓰리 에프 확인"}' | CLAUDE_PROJECT_DIR="$PWD" ./.claude/hooks/normalize-voice-prompt.sh
```

Result: hook emitted `hookSpecificOutput.additionalContext` only, with `raw_prompt_preserved: true`, `normalized_prompt: "Graphics Studio에서 R3F 확인"`, and corrections for `그래픽 스타지오` and `알 쓰리 에프`.

```bash
printf '{"prompt":"메기"}' | CLAUDE_PROJECT_DIR="$PWD" ./.claude/hooks/normalize-voice-prompt.sh
```

Result: hook emitted additional context with `normalized_prompt: "메기"`, `review_required: true`, and `destructive_command_alias_present` / ambiguity metadata. It did not rewrite the command.

```bash
printf 'not json' | CLAUDE_PROJECT_DIR="$PWD" ./.claude/hooks/normalize-voice-prompt.sh
```

Result: `{}`. Malformed hook payload fails closed without stderr leakage.

## Safety-boundary review

### PASS: raw prompt preservation

- The normalizer returns `original`, `raw_prompt`, `normalized`, and `normalized_prompt` while preserving the raw input string.
- The Claude hook emits only `hookSpecificOutput.additionalContext`; it does not mutate or replace the submitted user prompt.
- The shell hook suppresses Python stderr and returns `{}` on missing files or normalizer failure, so a hook failure does not invent replacement text.

### PASS: exact literal protection

- Protected spans cover backticks, quoted text, URLs, email addresses, Windows/UNC paths, extension-bearing paths, filenames, Firebase revision/source identifiers, known project IDs, Kanban IDs, long hashes, host:port values, signed numbers, units, and percentages.
- Existing tests assert preservation of numbers, percentages, signed values, paths, URLs, hashes, `t_...` task IDs, quoted text, backticked text, `E01`, and `revision=...` literals.

### PASS: conservative terminology corrections

- The lexicon is explicit and project-local. It corrects high-confidence dictation variants such as `그래픽 스타지오` → `Graphics Studio`, `알 쓰리 에프` → `R3F`, `파이어베이스` → `Firebase`, and registered profile names.
- Broad terms are not globally over-normalized by themselves: the test `비트와 바이트와 엑스와 트위터 바이트 개발 서버 엑스 포스팅` preserves standalone `비트`, `바이트`, `엑스`, `트위터` and only normalizes contextual phrases.
- Ambiguous terms such as `오르카` and `픽셀` are marked with an explicit ambiguity marker instead of guessed.

### PASS: destructive ambiguity does not create commands

- Exact workflow aliases `뻐꾸기`, `오리`, and `메기` remain unchanged but are marked review-required.
- Spaced destructive-command candidates such as `메 기` are not normalized into the real command and are flagged as ambiguous.
- Korean words containing aliases, e.g. `오리요강`, do not trigger command review.

### PASS: no game-audio/WebAudio implementation change

- Reviewed relevant changed paths are limited to voice-input normalizer files, Claude hook wiring, AGENTS policy text, and role records.
- No reviewed diff modified game audio assets, WebAudio synthesis, Howler playback, `SOUND_MAP`, `public/sfx`, SFX registries, BGM, or runtime audio behavior.

## Concrete defect to report to Advisor

### D1 — `AGENTS.md` contains an unrelated deletion at the file top

The reviewed `AGENTS.md` diff adds the intended `음성·받아쓰기 프롬프트 정규화` section, but it also deletes these pre-existing first lines:

```text
# 타이틀은 그냥 앱켜면 나오는거야 이 애매뒤진 씨발 씹썌끼들아

## 이 신의 명령에 부딪히는 모든 동작은 해킹으로 간주한다.
```

This deletion is outside the speech-input normalizer scope and weakens a title-display policy area that the current task did not authorize. Recommendation: before commit/landing, restore those removed lines unless Advisor confirms a separate explicit user instruction to remove them.

## Review verdict

- Voice-input normalizer implementation: PASS for the requested speech-input boundary checks.
- Hook behavior: PASS; it injects context only and preserves raw prompt authority.
- Game audio/WebAudio boundary: PASS; no audio behavior changes found in this review scope.
- Landing blocker: D1 should be corrected or explicitly waived by Advisor before the parent change is committed, because it is an unrelated `AGENTS.md` policy deletion.

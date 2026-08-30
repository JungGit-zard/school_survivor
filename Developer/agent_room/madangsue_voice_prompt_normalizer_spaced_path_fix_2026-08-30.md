# Madang_sue — voice prompt normalizer spaced-path literal preservation fix (2026-08-30)

- Kanban: `t_ea1123e8`
- Profile: `madangsue`
- Project: Escape! zombie school
- Scope: deterministic Korean voice prompt normalizer literal-protection fix only.
- No commit, push, install, attachment, Hermes registration, or scheduling performed.

## Mandatory pre-command gate

Command run from project root:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile madangsue -Domain auto -TaskSummary 'voice normalizer spaced path literal preservation'
```

Result:

```text
exit_code: 0
resolved_domains: common, audio, corporate, operations
matched_domains: audio, corporate
match_evidence:
- audio: voice
- corporate: vat
combined_receipt_sha256: 5bea8997f8e85c4000dc0136b1b50ad5434161f9a72fa875da54c475238d947b
```

All emitted `read_required` files were read completely, except `SESSION_MEMORY.md`, which was read only as the latest single entry per the central rule: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`.

## Root cause

`Developer/voice_input/prompt_normalizer.py` protected Windows/absolute path spans only until whitespace. For an unquoted path like `D:/tmp/a 그래픽 스타지오/file.glb`, the path was split into `D:/tmp/a` and `file.glb`, leaving `그래픽 스타지오` open to replacement. That changed the literal path to `D:/tmp/a Graphics Studio/file.glb` and failed to report the full path as a protected literal.

## Changed files

- `Developer/voice_input/prompt_normalizer.py`
  - Added a path-with-extension protected-span regex that can cover unquoted absolute paths containing spaces before the filename extension.
  - Existing whitespace-delimited path, URL, email, ID, numeric, quoted, and destructive-command boundaries were left in place.
- `Developer/voice_input/test_prompt_normalizer.py`
  - Added regression test `test_preserves_unquoted_paths_with_spaces_and_project_terms`.
- `Developer/agent_room/madangsue_voice_prompt_normalizer_spaced_path_fix_2026-08-30.md`
  - This operational record.

## Commands and results

### Reproduction before fix

```bash
python Developer/voice_input/prompt_normalizer.py <<'EOF'
D:/tmp/a 그래픽 스타지오/file.glb 확인
EOF
```

Observed before fix:

```text
normalized: D:/tmp/a Graphics Studio/file.glb 확인
protected_literals: ["D:/tmp/a", "file.glb"]
review_required: false
```

### RED regression test

```bash
python -m unittest Developer/voice_input/test_prompt_normalizer.py
```

Observed before implementation:

```text
Ran 13 tests in 0.227s
FAILED (failures=1)
FAIL: test_preserves_unquoted_paths_with_spaces_and_project_terms
AssertionError: 'D:/tmp/a Graphics Studio/file.glb 확인' != 'D:/tmp/a 그래픽 스타지오/file.glb 확인'
```

### GREEN full normalizer unittest

```bash
python -m unittest Developer/voice_input/test_prompt_normalizer.py
```

Observed after fix:

```text
.............
----------------------------------------------------------------------
Ran 13 tests in 0.022s

OK
```

### Focused hook/direct probes

Command:

```bash
python - <<'PY'
import json, subprocess, sys
prompts = ["메기", "메 기 실행해", "오르카", "하나만 더 확인", "D:/tmp/a 그래픽 스타지오/file.glb 확인"]
for prompt in prompts:
    payload = json.dumps({"prompt": prompt}, ensure_ascii=False)
    proc = subprocess.run([sys.executable, "Developer/voice_input/prompt_normalizer.py", "--hook-json"], input=payload, text=True, capture_output=True)
    print("---HOOK", prompt)
    print("exit", proc.returncode)
    print(proc.stdout.strip())
print("---DIRECT path-space")
proc = subprocess.run([sys.executable, "Developer/voice_input/prompt_normalizer.py"], input="D:/tmp/a 그래픽 스타지오/file.glb 확인", text=True, capture_output=True)
print("exit", proc.returncode)
print(proc.stdout.strip())
PY
```

Key observed results:

```text
HOOK 메기 -> exit 0, normalized_prompt "메기", review_required true, destructive command alias preserved for review.
HOOK 메 기 실행해 -> exit 0, normalized_prompt "메 기 실행해", review_required true, ambiguous destructive command candidate preserved.
HOOK 오르카 -> exit 0, normalized_prompt "[[AMBIGUOUS: 오르카 -> Orca / orca CLI / ORCA?]]", review_required true.
HOOK 하나만 더 확인 -> exit 0, {}
HOOK D:/tmp/a 그래픽 스타지오/file.glb 확인 -> exit 0, {}
DIRECT path-space -> exit 0, normalized equals original, changes [], protected_literals ["D:/tmp/a 그래픽 스타지오/file.glb"], review_required false.
```

### Repository hygiene checks

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
```

Results:

```text
GSTACK_OK
git status showed many pre-existing tracked/untracked changes in the project tree. This task only intentionally changed Developer/voice_input/prompt_normalizer.py, Developer/voice_input/test_prompt_normalizer.py, and this Developer/agent_room report.
Kanban assignees/stats commands completed successfully; madangsue running=1, board running=2 at the time of check.
```

## Final assessment

PASS for this card's acceptance scope. The spaced-path literal stays unchanged, the full path is reported as one protected literal, raw prompt authority remains intact, destructive-command prompts still require review, ordinary unchanged Korean still emits `{}` in hook mode, and ambiguity visibility for `오르카` remains intact.

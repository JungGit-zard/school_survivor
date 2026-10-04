# 삭제 차단 누락 수정 독립 QA — t_bc09f049

일시: 2026-10-04
담당: madangsue
범위: Git global-option operand 우회, eventless `exec_command` payload, 사용자 global Codex matcher 등록.

## 전제와 제한

- 실제 삭제 명령은 실행하지 않았다.
- 모든 검증은 guard 함수에 synthetic 문자열/JSON payload를 주입하는 방식으로만 수행했다.
- 파괴적 probe, 파일 삭제, Git clean/rm 실행, commit/push는 수행하지 않았다.
- 중앙 mandatory checker 결과: `matched_domains=["qa"]`, `match_evidence=[{"domain":"qa","keyword":"qa"}]`, `combined_receipt_sha256=4e8f6831a23a0ad94564e22076b33ff3441d1c573c6799f8e3c90940d926d412`.

## 확인한 수정점

- `Developer/agent_room/guards/destructive_shell_deletion_guard.py`
  - `SHELL_TOOL_NAMES`에 `exec_command`가 포함됨.
  - Git global option prefix가 별도 operand와 quoted operand를 처리하도록 확장됨.
- `Developer/agent_room/guards/test_destructive_shell_deletion_guard.py`
  - Git `-C`, `-c`, `--git-dir`, `--work-tree` operand 후 `clean`/`rm` 차단 테스트가 추가됨.
  - eventless `exec_command` deny 및 safe allow 테스트가 추가됨.
- `C:/Users/admin/.codex/hooks.json`
  - `PreToolUse` matcher가 `Bash|PowerShell|shell_command|terminal|exec_command`로 확인됨.

## 실행 검증

```text
python Developer/agent_room/guards/test_destructive_shell_deletion_guard.py
PASS test_destructive_patterns_are_blocked
PASS test_benign_reads_are_allowed
PASS test_hook_payload_blocks_terminal_command_with_fail_closed_json
PASS test_codex_claude_bash_payload_shape_blocks
PASS test_unrelated_payload_allows_empty_json
PASS test_git_global_option_operands_cannot_bypass
PASS test_eventless_exec_command_is_guarded
```

```text
python Developer/agent_room/guards/test_ten_confirmation_dialog.py
Ran 13 tests in 0.004s
OK
```

```text
python Quaility_Assurance/destructive_guard_synthetic_review_2026-10-04.py
blockedSamples=15
safeSamples=5
payloadVariants=10
gapObservations.exec_command_without_event.action=block
gapObservations.git_C_path_clean=true
gapObservations.encoded_shell=false
gapObservations.indirect_script=false
gapObservations.safe_documentation_false_positive=true
```

```text
python Quaility_Assurance/destructive_guard_gap_closure_review_2026-10-04.py
independentBlocked=5
independentSafe=3
payloadKeys=[cmd, command, bash, powershell, script]
globalCodexMatchers=[Bash|PowerShell|shell_command|terminal|exec_command]
globalCodexMissing=[]
```

```text
git diff --check -- Developer/agent_room/guards/destructive_shell_deletion_guard.py Developer/agent_room/guards/test_destructive_shell_deletion_guard.py Developer/agent_room/destructive_guard_gap_fix_2026-10-04.md Quaility_Assurance/destructive_guard_synthetic_review_2026-10-04.py
exit_code=0
```

## 판정

독립 합성 QA 기준으로 이번 카드의 세 누락 범위는 닫힌 것으로 판정한다.

- Git global-option operand 뒤의 `clean`/`rm`은 차단된다.
- event 없는 `exec_command` payload도 shell payload로 취급되며 missing/invalid command는 deny된다.
- 사용자 global Codex matcher에는 `terminal`과 `exec_command`가 포함되어 있다.

## 남는 한계

- `powershell -EncodedCommand ...`, 삭제를 수행하는 외부 Python/Node script, OS 파일 API를 통한 간접 삭제는 이 classifier만으로 완전 차단하지 못한다.
- `Write-Output "rm example"` 같은 문서화 문자열 false positive는 기존 제한으로 남는다.
- 설정 파일에 matcher가 존재한다는 사실은 실제 클라이언트가 이미 재로딩했다는 증명은 아니다.
- broad root/drive 대상과 raw shell 실행 deny 정책, 세 번의 별도 터미널 검토 질문 정책은 유지된다.

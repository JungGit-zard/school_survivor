# 파괴적 삭제 차단 독립 QA

2026-10-04 / balanceqa / 사용자 승인 GPT-6 대체. 중앙 checker 영수증 `5d60807c0088f0aac39082e572d8c388f744d2bf6944aac50042c529a3fe53bf`.

실제 삭제 명령은 실행하지 않았다. 테스트는 명령 문자열 분류, JSON payload 평가, 모의 입력과 모의 Popen만 사용했다. guard 구현과 설정은 수정하지 않았다.

## 현재 정본 요구

최신 commit `b6e37d5`와 `project_develop_policy.md`는 이전 열 번 코드 입력을 세 번의 별도 터미널 `할 거예요? [y/N]` 질문으로 교체했다. 이전 `104f255`의 10회 규칙은 역사적 상태다. 현재 세 번 확인 성공도 실행 승인이 아니며 쉘 차단을 유지한다. 루트/드라이브 대상은 질문창 없이 영구 차단한다.

## 실행 결과

- `python Developer/agent_room/guards/test_destructive_shell_deletion_guard.py`: 5 test functions PASS, 삭제 유형 11 / 안전 명령 4.
- `python Developer/agent_room/guards/test_ten_confirmation_dialog.py`: 13 tests PASS. 세 번 질문, 두 번 부족, 빈입력·거절·일괄답변·EOF·Ctrl+C 취소, 가짜 approval 무시, deny 먼저 출력, launcher 실패 시 deny 유지 확인. Popen은 mock이다.
- `python Quaility_Assurance/destructive_guard_synthetic_review_2026-10-04.py`: 추가 삭제 문자열 15 / 안전 명령 5 / event-tool payload 조합 10 PASS.
- 주요 차단 확인: cmd rmdir/rd /s, PowerShell Remove-Item -Recurse, rm -rf 및 분리 flags, del /s, 직접 git clean/git rm, POSIX root 및 D drive/MSYS/extended path, caret 분할 이름, nested shell.

## 발견한 차단 누락

합성 입력만 평가한 결과:

```text
classify_command('git -C C:/work clean -fdx').blocked = False
evaluate_payload({'tool_name':'exec_command','tool_input':{'cmd':'cmd.exe /c rmdir /s /q D:\\'}}) = {}
```

첫 경우 git 옵션 뒤 값(C:/work)을 현재 정규식이 처리하지 않는다. 두 번째는 SHELL_TOOL_NAMES에 exec_command가 없으며 hook_event_name 누락 시 shell로 인식하지 않는다. 정상 event가 있으면 exec_command도 차단한다.

사용자 global `C:/Users/admin/.codex/hooks.json`의 matcher는 Bash/PowerShell/shell_command만 포함하며 terminal/exec_command가 없다. 프로젝트 `.codex/hooks.json`과 `.claude/settings.json`에는 두 이름 모두 등록되어 있다.

## 등록 및 제한

- Hermes default config와 12개 등록 profile(backendmini/bizmini/englishgradmini/jabdareminder/corpopsmini/launchmini/levelmini/balanceqa/uimini/threemini/madangsue/soundmini)에서 canonical guard path 등록 확인.
- 사용자 global default.rules에 직접 rm/rmdir/rd/del/erase/Remove-Item/git clean/git rm 금지 prefix 존재. nested shell 및 옵션 변형 전체를 처리하는 계층은 아니다.
- 설정 파일의 등록 확인과 현재 호스트에서 hook가 실제 실행·신뢰되었다는 증명은 다르다. 재시작/trust 여부와 같은 계정의 hook 수정 방지는 본 QA가 보장하지 않는다.
- `powershell -EncodedCommand ...`, 삭제를 수행하는 외부 Python script 같은 간접 실행은 classifier만으로 차단하지 못한다. OS 권한/파일 API의 보안 경계가 아니다.
- `Write-Output "rm example"` 같은 문서 문자열도 차단하는 false positive가 있다.
- 안전 삭제 승인 broker는 없다. 질문 세 번은 검토 수집이며 자동 실행 경로가 없다. 실제 Windows 창 사용자 상호작용은 mock 테스트 범위 밖이다.

판정: 일반 요청 유형의 합성 테스트 통과. 위 확인된 차단 누락 때문에 모든 agent 삭제를 완전히 예방했다고 보고할 수 없다. Advisor에게 최소 수정 대상으로 전달했다. 커밋/푸시/삭제/라이브 상태 변경 없음.

## t_bc09f049 최소 패치 독립 재검증

중앙 checker 영수증 `a6746e4ac2e4a1a5658c6387260a90419c064e8e0e31fcf0ad929980c6691252`.

- guard diff 직접 검토: SHELL_TOOL_NAMES에 exec_command 추가, Git 옵션의 별도 값/인용 값을 허용하는 prefix 수정. 실제 삭제 실행 경로 추가 없음.
- worker guard 테스트 7 functions PASS, dialog mock 13 tests PASS, 독립 QA 15 삭제/5 안전/10 payload PASS. scoped diff check PASS.
- `git -C C:/work clean`, `git -C "C:/work tree" clean`, `-c`, `--git-dir`, `--work-tree`, 반복 `-C`, `--git-dir=value` 삭제 차단 확인. `git -C C:/work status/log`와 일반 안전 명령 허용.
- 이벤트 없는 exec_command 삭제/잘못된 명령 deny, 안전 `git status` allow 확인.
- 사용자 전역 Codex/프로젝트 Codex/프로젝트 Claude 세 matcher가 모두 `Bash|PowerShell|shell_command|terminal|exec_command`이며 canonical guard를 연결한다.

추가 edge 합성 분류 결과:

```text
git -C "C:/work&tree" clean -fdx => blocked False
git -C "C:/work;tree" clean -fdx => blocked False
git -C clean status => blocked True (안전 명령 오탐)
```

인용 경로 내부의 `&`/`;`를 현재 prefix가 shell 구분자로 취급하기 때문에 유효 인용 경로에서 차단 누락이 남는다. 이 결과는 문자열 평가만 했으며 어떤 Git 삭제도 실행하지 않았다. Advisor에게 전달했다. 기존 세 gap은 수정되었으나 위 추가 edge 때문에 전면 차단 성공은 아직 보장하지 않는다. guard 구현/전역 설정은 QA가 수정하지 않았다.

### 최종 quoted 경로 수정 이후 판정

Worker가 quoted operand 내부의 separator를 허용하도록 수정한 최종 diff를 직접 검토했다. 기존 위 누락은 이제 해결되었다.

- 다시 guard 7 functions / dialog 13 tests / QA 15 삭제·5 안전·10 payload 모두 PASS.
- 별도 독립 assertion: double/single quoted `&`/`;` 경로와 여러 Git 옵션의 clean/rm 4개 모두 block; 같은 quoted 경로의 status/log 등 안전 4개 모두 allow.
- scoped diff check PASS. 실제 삭제, 질문창 실행, guard/config 직접 수정 0회.
- 최종 요청된 세 gap과 추가 quoted 경로 gap에 대한 합성 회귀 검증 PASS. `git -C clean status`의 보수적 오탐, encoded shell/간접 API, host activation/trust 제한은 유지한다.

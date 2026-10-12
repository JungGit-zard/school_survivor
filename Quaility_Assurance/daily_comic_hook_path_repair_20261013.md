# 일일 만화 예약용 프로젝트 훅 경로 복구 검증

- Kanban `t_6d307728`, madangsue Worker. 필수 precommand receipt `2c2a83671a31b00d636b9e2a9cde97e6ff87558538e2f8aac88f60e742e41dfa`.
- 수정: `.codex/hooks.json`의 기존 8개 handler·matcher는 보존하고 폐기된 D 절대 경로를 `git rev-parse --show-toplevel` 기준 경로로 교체했다.
- Windows override는 변수 없는 투명한 PowerShell 호출로 `Developer/agent_room/hooks/run-project-hook.ps1 -Hook <고정값>`을 실행한다. launcher는 `ValidateSet`으로 기존 5종 handler만 호출하며 실제 Git 루트와 네이티브 종료 코드 및 stdin을 보존한다. 인코딩 명령을 사용하지 않는다.
- Role hook은 폐기된 Spark 전용 marker 검사와 모델 강제 문구만 제거했다. 즉시 실행·최소 변경·범위·최소 검증 검사 및 Advisor/Worker 역할 분담은 유지했다.

## 실제 실행 증거

- `node --test Developer/agent_room/hooks/project-hooks.test.mjs` → **3개 통과**. 8개 override 각각을 PowerShell 및 cmd.exe 부모에서 저장소 루트와 app 하위 폴더로 실행했다. cmd.exe 검사는 설치 Codex 0.160.0의 raw outer-quote 형태를 사용했다. 시작 요약과 역할 훅의 실제 문구, 나머지 훅의 실제 JSON 출력을 확인했다.
- Python 삭제 훅과 Bash Stage 2 훅에 synthetic JSON을 stdin으로 전달했고 실제 deny JSON을 확인했다. 요청 문자열은 실행하지 않았다. 삭제 훅의 광범위 드라이브 문자열을 사용해 추가 확인창 생성도 피했다.
- `python Developer/agent_room/guards/test_destructive_shell_deletion_guard.py` → 기존 합성 검사 **7개 통과**. 실제 삭제 명령은 실행하지 않았다.
- 최소 검증 marker가 빠진 격리 AGENTS fixture에 기존 역할 hook을 적용했을 때 실패하는 것을 확인했다. 임시 fixture 파일과 폴더는 개별 파일 삭제·빈 폴더 제거로 정리했다.

## 실행기 근거와 한계

- [공식 훅 문서](https://learn.chatgpt.com/docs/hooks)는 `commandWindows` 및 세션 cwd, 저장소 Git 루트 기준 경로 사용을 설명한다.
- 설치 CLI는 `codex-cli 0.160.0`. [동일 태그 session source](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/session/mod.rs) `build_hooks_config`는 환경의 선택 shell을 전달한다. [동일 태그 command runner](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/hooks/src/engine/command_runner.rs)는 전달된 shell을 사용하며 없는 경우 Windows COMSPEC으로 실행한다. 그래서 두 부모 shell 모두 검사했다.
- Global hook, trust·사용자 설정, 음성 normalizer, 기존 Bash/Python 보안 판정 코드는 수정하지 않았다. 이 검사는 훅 호출 경로와 보안 판정 증거이며 새 hook 신뢰 승인이나 Orca 예약의 실제 재개 성공을 의미하지 않는다. 새 신뢰 검토는 사용자에게 표시해야 한다.

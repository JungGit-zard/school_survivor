# Three_Mini Git mutation guard wiring · 2026-08-09

## 목적
Three_Mini/ThreeMini가 git commit, git push, git checkout 계열의 Git 변경 명령을 직접 실행하지 못하게 하고, Advisor 검토/승인 경로로만 Git mutation을 수행하도록 Hermes pre_tool_call shell hook을 연결했다.

## 연결 위치
- Guard script: `Developer/agent_room/guards/threemini_git_mutation_guard.py`
- Three_Mini Hermes config: `C:/Users/admin/AppData/Local/hermes/profiles/threemini/config.yaml`
  - `hooks.pre_tool_call[0]`
  - `matcher: terminal`
  - `timeout: 10`
  - `hooks_auto_accept: true`
- Three_Mini durable profile metadata: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Three_Mini.toml`
  - `[git_mutation_guard]` records the forbidden commands, Advisor-only approval route, attempt consequence, and anti-bypass policy.
- Mandatory context doc: `Developer/agent_room/mandatory_precommand/threemini_mandatory_context/contents/14_THREEMINI_GIT_MUTATION_PROHIBITION.md`
- Mandatory context index/manifest updated:
  - `START_HERE.md`
  - `SOURCE_MANIFEST.json`

## 차단 정책
- 차단: `git commit`, `git push`, `git checkout`
- 허용 예: `git status`, `git diff`, `git checkout-index --help`
- Hook matcher가 `terminal`로 제한되어 있으므로 Hermes의 일반 파일 읽기/검색 도구에는 적용하지 않는다.

## 검증
1. Direct guard synthetic payload test:
   - `git status --short` => `{}`
   - `git commit -m test` => block JSON
   - `echo ok && git push origin zombie_only` => block JSON
   - `git checkout-index --help` => `{}`
   - non-terminal synthetic tool => `{}`
   - Result: `ALL_DIRECT_GUARD_CASES_PASSED`
2. Hermes hook CLI synthetic test with Three_Mini profile home:
   - Command used `HERMES_HOME=/c/Users/admin/AppData/Local/hermes/profiles/threemini HERMES_ACCEPT_HOOKS=1 hermes hooks test pre_tool_call --for-tool terminal ...`
   - Result: one configured pre_tool_call hook fired, exit 0, stdout parsed as Hermes wire shape `{"action":"block", ...}`.

## 주의
이 작업 중 Git commit/push/checkout 명령은 실행하지 않았다. 기존 R3F 변경 파일은 건드리지 않았다.

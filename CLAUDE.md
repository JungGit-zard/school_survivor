# Claude Project Instructions

## Session Memory

세션 메모리 / 시작 시 필독 / 3시간 요약 관련 모든 규정은 `SESSION_CONTINUITY.md` 단일 정본을 따른다. 본 파일에 중복 기재하지 않는다.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Git Workflow — Direct Trunk (2026-06-14)

모든 AI 에이전트는 **`main` 브랜치에 직접 누적 커밋**한다. 단기 task 브랜치를 만들지 않는다.

### 워크트리 구조

| 디렉터리 | 로컬 브랜치 | push 대상 |
|---|---|---|
| `school_survivor-integration/` | `main` | `origin/main` (통합·검증) |
| `school_survivor-claude/` | `claude-dev` | `origin/main` (자동 설정됨) |
| `school_survivor/` (codex) | `codex-dev` | `origin/main` (자동 설정됨) |

### Claude 워크플로우

```bash
# 작업 전 최신 main 동기화
git fetch origin && git reset --hard origin/main

# 작업 후 커밋 → origin/main으로 직접 push
git add <files>
git commit -m "feat/fix/chore: ..."
git push                          # → origin/main으로 자동 push
```

### 규칙

- `claude/<task>` 단기 브랜치 **절대 만들지 않는다**.
- 커밋 전 반드시 `git fetch && git reset --hard origin/main`으로 최신화.
- 충돌 시 `git pull --rebase origin main` 후 재push.
- 서브에이전트는 `project_subagents/`에서 먼저 찾는다. 새로 만들지 않는다.

## Documented Solutions

`CEO/docs/solutions/` — 과거 문제 해결 기록(버그·베스트프랙티스·아키텍처/디자인 패턴·컨벤션)을 카테고리별로 YAML 프론트매터(`module`, `tags`, `problem_type`)와 함께 정리. 문서화된 영역에서 구현·디버깅 시 참고.

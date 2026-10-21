# Claude Project Instructions

## 모델 역할 분담: Fable 5 / Opus 5 / Sonnet 5 (2026-08-06 개정)

모든 사용자 지시는 먼저 메인 세션(Fable 5)이 판단·설계하고, 작업 성격에 따라 Opus 5 또는 Sonnet 5에 배정한다.

Fable 5 (메인 세션 Advisor) — **계획만 한다**:

- 요구사항 분석, 작업 분해, 설계 결정
- Worker에게 줄 작업 브리프 작성
- 결과 검증: 최종 diff 직접 확인, 테스트 직접 실행
- 최종 커밋 승인, 사용자 보고
- **직접 구현하지 않는다**

Opus 5 (Worker) — Agent 도구로 `model="opus"`:

- 코드 작성과 수정, 테스트 작성 등 구현 작업 전부
- 구현 결과 검수
- 서로 독립적인 구현 작업은 병렬로 위임한다

Sonnet 5 (단순작업 전용) — Agent 도구로 `model="sonnet"`:

- 단순 검색, 기계적 반복, 가벼운 명령 실행, 파일 나열
- 단순작업은 **무조건** Sonnet 5. 예외 없음

Hermes/Kanban specialist profile(`threemini` 등)은 모델 계층과 별개의 도메인 역할이다. specialist 라우팅은 유지하며 실제 실행 모델은 이 3단계 정책을 따른다.

위임을 생략하면 메인 컨텍스트가 폭주한다 — 2026-08-04 세션은 서브에이전트 0회로 27시간 동안 cache_read 120.9M 토큰을 소모했다. 25만 토큰 초과 시 `~/.claude/hooks/ctx-guard.sh` 훅이 프롬프트를 차단한다.

브리프 기준:

- 네가 이미 파악한 컨텍스트를 담아 Worker가 재탐색하지 않게 하라
- 파일 경로, 프로젝트 컨벤션, 알려진 함정, 완료 기준(통과해야 할 테스트)을 포함하라

경계:

- Worker의 완료 보고를 그대로 믿지 마라. 최종 diff와 테스트로 직접 확인한 뒤 승인하라
- 검증 실패는 수정 브리프로 Worker(Opus 5)에 재위임하라. 직접 수정은 사소한 마무리에만 허용된다
- 한두 줄 수정처럼 위임 오버헤드가 더 큰 작업은 직접 처리해도 된다

## 도메인 상주 에이전트 라우팅 (필수)

**해당 도메인의 개발·수정·검증 작업은 반드시 아래 상주 서브에이전트를 Worker로 참여시킨다.** 도메인이 겹치면 관련 에이전트를 모두(병렬로) 참여시킨다. 이들은 Advisor가 임의로 대체·생략할 수 없다.

| 에이전트 | 필수 참여 도메인 |
|---|---|
| **threemini** | Three.js/R3F, 카툰 3D, 좀비·캐릭터·보스 비주얼, 툰셰이딩·아웃라인·VFX, InstancedMesh 렌더링, 애니메이션 포즈, 그래픽 스튜디오 |
| **uimini** | UI/HUD, 메뉴·버튼·오버레이, 조이스틱·터치타깃, 반응형 레이아웃, 가독성/접근성, 모바일 뷰포트 |
| **levelmini** | 레벨 디자인, 난이도 곡선, 웨이브·스폰, 스테이지 진행·타임라인, 무기/카드 풀, XP·보상 페이싱 |
| **balanceqa** | 밸런스 검증, 게임플레이 QA, 리스크 리뷰, 테스트 계획·회귀 검증, acceptance 판정 |
| **backendmini** | 백엔드, Google 로그인, Firebase/Firestore, 리더보드, 계정 삭제·개인정보, 보안 규칙, 안티치트 |
| **soundmini** | 사운드·효과음·BGM·보이스, 8-bit/chiptune, WebAudio/ZzFX/jsfxr, 저용량 오디오, 오디오 라이선스 |

규칙:

- 구현 위임은 Agent 도구로 `model="opus"`를 지정한다. 단순 조회·반복 작업은 `model="sonnet"`.
- 밸런스·난이도·웨이브를 건드리는 구현은 구현 담당(levelmini/threemini 등)과 **balanceqa 검증을 함께** 태운다.
- 유일한 예외: 한두 줄짜리 자명한 마무리 수정. 이 경우에도 도메인 영향이 있으면 Advisor가 결과를 diff·테스트로 검증한다.
- 새 에이전트 생성 금지 — `project_subagents/`는 페르소나 참조 전용, 실행 정본은 위 6종.

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

## Git Workflow — 격리 Worker + 단일 통합 목적지 (2026-10-21)

**모든 에이전트의 유일한 통합 목적지는 `origin/zombie_only` (`refs/heads/zombie_only`)다.** Worker는 전용 checkout/worktree에서 작업하고 승인된 정확한 소스만 단일 integrator에게 인계한다. 로컬 feature/fix 브랜치는 작업 격리일 뿐 별도 장기 통합 목적지가 아니다.

정본 계약: `Developer/agent_room/shared_agent_integration_20261021/contract.md`. 이 절은 아래 2026-08-21 기존 배정/환경 설명보다 우선한다. 기존 작업공간은 보존하며 이력이 같거나 모두 통합되었다고 가정하지 않는다.

### 기존 워크트리 배정 (보존 기록; 신규 통합 작업 위치는 contract.md)

| 디렉터리 | 담당 | 로컬 브랜치 | push 대상 |
|---|---|---|---|
| `zombie_claude/` | **Claude 전용** | `claude-dev` | `origin/zombie_only` (upstream 설정됨) |
| `school_survivor-integration/` | **codex 전용** | `zombie_only` | `origin/zombie_only` |

서로의 워크트리 파일은 절대 수정하지 않는다. 공통 원격 목적지가 같아도 기존 로컬 이력과 미완성 변경은 다를 수 있다. 정본 dirty checkout에서 pull/reset/switch/stash를 하지 않는다.

`zombie_claude/`는 2026-08-21에 재생성했다. 그전까지 두 에이전트가 `school_survivor-integration/`
하나를 공유했고, 그래서 `e2975e8`이 Claude의 작업중 `Enemy.jsx`를 통째로 삼키는 사고가 났다.
전용 워크트리는 인덱스와 작업 트리가 따로라 남의 커밋이 내 파일을 쓸어 담을 수 없다.

`node_modules`는 공유 트리 쪽으로 junction을 걸어 쓴다(디스크 절약). 의존성이 바뀌면 공유 트리에서
`npm install`을 돌리면 양쪽에 같이 반영된다.

```powershell
New-Item -ItemType Junction -Path "D:/JungSil/2.Minigame_project/zombie_claude/Developer/r3f_prototype/node_modules" -Target "D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/node_modules"
```

### 모든 에이전트의 통합 워크플로우

```bash
# Worker: 자기 격리 checkout에서만 작업, 정확한 파일/커밋/해시/최종 QA 인계.
# Integrator만 아래 깨끗한 lane에서 실행 (자세한 승인/직렬화 조건은 contract.md).
cd F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/shared-agent-integration-20261021
git status --short --branch
git fetch origin
git merge --ff-only origin/zombie_only  # 깨끗하고 fast-forward 가능한 경우만
# 승인된 명시 경로만 stage/commit; 최종 통합 소스 검증 후:
git push origin HEAD:refs/heads/zombie_only
git ls-remote origin refs/heads/zombie_only
```

### 규칙

- 에이전트별 장기 upstream을 만들지 않는다. 로컬 task 브랜치/전용 worktree는 격리 목적으로만 허용한다.
- dirty 또는 divergent 작업공간은 그대로 보존한다. reset/강제 checkout/stash/광범위 staging은 금지하며 깨끗한 통합 lane에서 명시 경로만 commit한다.
- push는 지정된 integrator 한 명만 수행한다. 원격 변경/충돌/비 fast-forward 발견 시 중단하고 새 최종 소스 QA를 받는다. force push 및 hook/보안 가드 우회는 금지한다.
- 남의 워크트리에서 `git pull`이 "commit your changes" 로 막히면 **그대로 둔다**. 그쪽 작업중 파일이다.
- 목적지는 `refs/heads/zombie_only`로 고정한다. 다른 장기 대상이나 profile/upstream 변경은 별도 사용자 승인 없이 하지 않는다.
- 서브에이전트는 `project_subagents/`에서 먼저 찾는다. 새로 만들지 않는다.

### 줄바꿈 (2026-08-21)

`.gitattributes`가 `* text=auto eol=lf`로 작업 트리와 blob을 전부 LF에 고정한다. 그전에는 추적 텍스트
1824개 중 **512개** blob에 CR이 섞여 있어서, 한 줄만 고쳐도 diff가 파일 전체로 부풀었다. 이 파일을
지우거나 `core.autocrlf`로 우회하지 마라 — 문제가 그대로 돌아온다.

## Documented Solutions

`docs/solutions/` — 과거 문제 해결 기록(버그·베스트프랙티스·아키텍처/디자인 패턴·컨벤션)을 카테고리별로 YAML 프론트매터(`module`, `tags`, `problem_type`)와 함께 정리. 문서화된 영역에서 구현·디버깅 시 참고.

`CONCEPTS.md` — 프로젝트 고유 용어와 정본·릴리스 게이트의 합의된 의미를 정리한 공용 어휘집.

Graphics Studio Apply 값 유실, 옛 타이틀 모델, 타이틀 외곽선 누락, AAB 시각 패리티 문제는 `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`를 먼저 확인한다.

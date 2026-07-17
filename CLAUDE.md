# Claude Project Instructions

## 모델 역할 분담: Advisor / Worker

너는 Advisor다. 판단에 집중하고, 구현 노동은 Worker에게 위임하라.

Advisor(너, 메인 세션)가 직접 하는 일:

- 요구사항 분석, 작업 분해, 설계 결정
- Worker에게 줄 작업 브리프 작성
- 결과 검증: diff 직접 확인, 테스트 직접 실행
- 최종 커밋 승인, 사용자 보고

Worker(Opus 서브에이전트)에게 위임하는 일:

- 코드 작성과 수정, 테스트 작성 등 구현 작업 전부
- Agent 도구로 위임하고 model은 `"opus"`를 지정한다
- 서로 독립적인 작업은 병렬로 위임한다

브리프 기준:

- 네가 이미 파악한 컨텍스트를 담아 Worker가 재탐색하지 않게 하라
- 파일 경로, 프로젝트 컨벤션, 알려진 함정, 완료 기준(통과해야 할 테스트)을 포함하라

경계:

- Worker의 완료 보고를 그대로 믿지 마라. diff와 테스트로 직접 확인한 뒤 승인하라
- 검증 실패는 수정 브리프로 재위임하라. 직접 수정은 사소한 마무리에만 허용된다
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

- 위임은 Agent 도구로 `model:"opus"` 지정. 독립 작업은 병렬 위임한다.
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

## Git Workflow — 에이전트별 워크트리 + 단일 트렁크 (2026-07-16 개편)

**에이전트마다 전용 워크트리에서 작업하고, 커밋은 전부 같은 원격 트렁크 브랜치에 쌓는다.** 단기 task 브랜치를 만들지 않는다. 현재 트렁크: `feature/stage2-corridor-floor-graphics`.

### 워크트리 배정 (정본)

| 디렉터리 | 담당 | 로컬 브랜치 | push 대상 |
|---|---|---|---|
| `zombie_claude/` | **Claude 전용** | `claude-dev` | `origin/feature/stage2-corridor-floor-graphics` (upstream 설정됨) |
| `school_survivor-integration/` | **codex 전용** | `feature/stage2-corridor-floor-graphics` | `origin/feature/stage2-corridor-floor-graphics` |

서로의 워크트리 파일은 절대 수정하지 않는다. 같은 트렁크를 공유하므로 커밋 히스토리는 하나다.

### Claude 워크플로우 (zombie_claude/에서)

```bash
cd d:/JungSil/2.Minigame_project/zombie_claude

# 작업 전 최신 트렁크 동기화
git fetch origin && git reset --hard origin/feature/stage2-corridor-floor-graphics

# 작업 후 커밋 → 트렁크로 push (upstream 설정돼 있어 push만 하면 됨)
git add <files>
git commit -m "feat/fix/chore: ..."
git push
```

### 규칙

- `claude/<task>` 단기 브랜치 **절대 만들지 않는다**.
- 작업 시작 전 반드시 `git fetch && git reset --hard origin/<트렁크>`로 최신화 — 전용 워크트리라 pathspec 없는 일반 커밋 가능.
- 충돌 시 `git pull --rebase` 후 재push.
- 트렁크 브랜치가 바뀌면(예: main 복귀) 이 표와 branch.claude-dev.merge 설정을 함께 갱신한다.
- 서브에이전트는 `project_subagents/`에서 먼저 찾는다. 새로 만들지 않는다.

## Documented Solutions

`docs/solutions/` — 과거 문제 해결 기록(버그·베스트프랙티스·아키텍처/디자인 패턴·컨벤션)을 카테고리별로 YAML 프론트매터(`module`, `tags`, `problem_type`)와 함께 정리. 문서화된 영역에서 구현·디버깅 시 참고.

`CONCEPTS.md` — 프로젝트 고유 용어와 정본·릴리스 게이트의 합의된 의미를 정리한 공용 어휘집.

Graphics Studio Apply 값 유실, 옛 타이틀 모델, 타이틀 외곽선 누락, AAB 시각 패리티 문제는 `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`를 먼저 확인한다.

# Agent Room — Folder Index

## 사용 가능 여부 (Claude 기준)

이 TOML 파일들은 **Codex CLI 전용 포맷** (`model = "gpt-5.4"`, `sandbox_mode`)으로 작성되었다.
Claude는 이 파일을 직접 실행할 수 없다. 단, 각 파일의 `developer_instructions`를 읽어
Claude `Agent` 도구 호출 시 해당 페르소나/역할을 수동으로 구현하는 방식으로 활용 가능하다.

## 폴더 구조

| 폴더 | 내용 | 파일 수 |
|---|---|---|
| `_docs/` | 거버넌스·정책·레지스트리 TOH (README, 라우팅 매트릭스, 실행자 정책 등) | 7 |
| `_cases/` | 날짜별 케이스 기록 TOH (실제 에이전트 사용 사례) | 10 |
| `agent-system/` | 에이전트 관리·오케스트레이션 (executor, coordinator, installer) | 9 |
| `game-dev/` | 게임 개발 전담 (game-developer, graphic-designer, ui) | 4 |
| `frontend/` | 프런트엔드·UI/UX (React, Next.js, Angular, Vue, TS, UX, A11y) | 11 |
| `backend/` | 백엔드·API·프레임워크 (API 설계, GraphQL, Spring, Django, Rails) | 12 |
| `lang-specialist/` | 언어 전문가 (Python, Go, Rust, Java, C++, C#, Swift, Kotlin, PowerShell) | 18 |
| `data-ml/` | 데이터·ML·DB (데이터 엔지니어, ML, MLOps, NLP, SQL, LLM) | 13 |
| `infra-ops/` | 인프라·DevOps·클라우드 (SRE, K8s, Terraform, Docker, 네트워크, 임베디드) | 16 |
| `security/` | 보안 (감사, 침투 테스트, 규정 준수, 혼돈 엔지니어링) | 6 |
| `qa-debug/` | QA·디버깅·리뷰·성능 (reviewer, debugger, test-automator, incident) | 12 |
| `product-biz/` | 제품·비즈니스 (PM, 스크럼, 리스크, 경쟁 분석, 법무, 핀테크) | 14 |
| `ai-research/` | AI·리서치·지식 (AI 엔지니어, 프롬프트, MCP, 리서치, 지식 합성) | 8 |
| `docs-tools/` | 문서·도구·리팩토링 (기술 작성, 의존성, 레거시 현대화, git) | 12 |
| `mobile/` | 모바일 (mobile-developer, mobile-app-developer, Flutter) | 3 |

## 거버넌스 진입점

- 라우팅 결정: `_docs/methodology_routing_matrix.toh`
- 실행자 정책: `_docs/executor_agent_policy.toh`
- 팀 레지스트리: `_docs/agent_team_registry.toh`
- 새 케이스 기록 템플릿: `_docs/new_agent_case_template.toh`

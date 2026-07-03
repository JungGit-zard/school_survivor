# Escape! zombie school Project Development Policy

## Policy Authority

- This document is the highest-priority project policy for Escape! zombie school.
- Any non-empty rule written in this document is mandatory for project work.
- When this document conflicts with `AGENTS.md`, role workspace notes, planning documents, or previous project notes, follow this document first.
- If this document conflicts with the user's latest explicit request, stop and explain the conflict before changing files.
- Before planning, implementation, asset work, QA, Git workflow changes, folder-structure changes, or project-direction decisions, check this document for relevant rules.
- If a rule in this document is unclear, follow the safest narrow interpretation and ask the user when the decision could change project direction.

## Session Memory

세션 메모리 / 시작 시 필독 / 3시간 요약 관련 규정은 `SESSION_CONTINUITY.md` 단일 정본을 따른다. 본 정책 문서에 중복 기재하지 않는다.

## 기록 규칙

- 이 문서에 적힌 비어 있지 않은 항목은 Escape! zombie school 프로젝트의 필수 규칙으로 취급한다.
- 다른 문서와 충돌하면 이 문서를 우선한다.
- 새 규칙을 추가할 때는 가능한 한 짧고 명확하게 작성한다.
- 반드시 작업 지시가 어떤 타이밍에 들어오더라도 큰 구분을 먼저 적용해, 기획 기록은 `Planner/`, 개발 구현과 기술 기록은 `Developer/`, 그래픽 콘셉트와 시각 검토 기록은 `Graphic_designer/`에 각각 저장한다.
- 반드시 한 작업이 기획, 개발, 그래픽을 함께 포함하면 각 역할에 해당하는 기록을 해당 폴더에 나누어 저장한다.

## 부서별 정책 작성 규칙

- 각 부서 정책은 `반드시 지켜야 할 사항`과 `절대로 하면 안 되는 사항`으로 나누어 작성한다.
- `반드시` 또는 `절대로`로 시작하는 문장은 명령문으로 취급한다.
- 부서별 정책은 해당 부서의 작업 폴더, 산출물, 의사결정 범위, 검증 기준을 명확히 제한해야 한다.
- 정책을 추가하거나 바꿀 때는 기존 정책과 충돌하는지 먼저 확인한다.
- 충돌이 있으면 새 정책 아래에 충돌 사유와 우선순위를 함께 기록한다.

## CEO 부서 정책

### 반드시 지켜야 할 사항

- 반드시 제품 방향, 기술 전략, 사업 판단, 우선순위 결정은 `CEO/` 폴더에 기록한다.

### 절대로 하면 안 되는 사항

- 절대로 실행 세부 구현을 CEO 기록만으로 확정하지 않는다.

## Planner 부서 정책

### 반드시 지켜야 할 사항

- 반드시 게임 기획, 콘텐츠 구조, 규칙, 난이도, 진행 방식은 `Planner/` 폴더에 기록한다.

### 절대로 하면 안 되는 사항

- 절대로 기획 근거 없이 게임 규칙이나 콘텐츠 방향을 임의로 바꾸지 않는다.

## Developer 부서 정책

### 반드시 지켜야 할 사항

- 반드시 코드 구현, 기술 검토, 프로토타입 기록은 `Developer/` 폴더에 기록한다.

### 절대로 하면 안 되는 사항

- 절대로 플레이 가능한 동작보다 장식적인 구조를 우선하지 않는다.

## Graphic Designer 부서 정책

### 반드시 지켜야 할 사항

- 반드시 그래픽 콘셉트, 아트 방향, 에셋 조사, 시각적 검토는 `Graphic_designer/` 폴더에 기록한다.
- 반드시 모든 그래픽 작업은 먼저 2D 원화 또는 2D 콘셉트 시안을 기준으로 방향을 확정한 뒤 3D 산출물 제작이나 구현에 들어간다.
- 반드시 캐릭터, 몬스터, 캐릭터 행동 연출, 몬스터 행동 연출은 무조건 3D로 만든다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터는 3D 카툰 렌더링 방식으로 구현한다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터에는 카툰 렌더링을 무조건 적용한다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터는 `three.js`의 `MeshToonMaterial` 또는 동등한 toon shader 방식으로 명암이 단계적으로 끊기는 카툰 셰이딩을 적용한다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터는 카툰 렌더링과 함께 외곽선 표현을 적용한다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터는 `three.js`를 이용해 3D로 표현한다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터의 움직임과 행동 연출은 `three.js` 3D 애니메이션으로 표현한다.
- 반드시 그래픽 구현 전에 `Graphic_designer/Bang_survivor_Graphic_concept.md`의 레퍼런스를 무조건 확인하고 참조한다.
- 반드시 플레이어 캐릭터와 몬스터 캐릭터 그래픽은 `Graphic_designer/Bang_survivor_Graphic_concept.md`에 적힌 three.js 카툰 렌더링, 외곽선, 고품질 예제 레퍼런스를 기준으로 만든다.
- 반드시 주인공 3D 모델의 화면 위치는 플레이어의 실제 게임 좌표와 일치해야 한다.
- 반드시 주인공 3D 모델은 이동, 회전, 애니메이션 중에도 플레이어 좌표에서 떨어져 보이지 않게 유지한다.

### 절대로 하면 안 되는 사항

- 절대로 기존 그래픽 콘셉트와 충돌하는 시각 스타일을 근거 없이 적용하지 않는다.
- 절대로 기획 문서만 보고 곧바로 3D 산출물을 만들지 않는다. 3D 작업 전에는 반드시 2D 원화 또는 2D 콘셉트 시안을 먼저 확인한다.
- 절대로 플레이어 캐릭터와 몬스터 캐릭터를 일반적인 실사형 PBR 렌더링, 평면색 무명암 렌더링, 기본 재질 렌더링만으로 구현하지 않는다.
- 절대로 플레이어 캐릭터와 몬스터 캐릭터에서 카툰 렌더링 또는 외곽선 표현을 생략하지 않는다.
- 절대로 플레이어 캐릭터와 몬스터 캐릭터를 2D 이미지, 2D 스프라이트, 2D 픽셀 캐릭터로 표현하지 않는다.
- 절대로 플레이어 캐릭터와 몬스터 캐릭터의 애니메이션을 2D 프레임 교체, 2D 스프라이트 시트, 2D 픽셀 애니메이션으로 구현하지 않는다.
- 절대로 `Graphic_designer/Bang_survivor_Graphic_concept.md`의 레퍼런스를 확인하지 않고 캐릭터, 몬스터, 그래픽 스타일을 구현하지 않는다.
- 절대로 캐릭터와 몬스터를 임시 도형, 단순 표식, 2D 대체 이미지로 최종 그래픽처럼 취급하지 않는다.
- 절대로 주인공 주변에 플레이어를 대신하는 이상한 원, 조준 원, 디버그 원, 위치 보정용 표시를 일반 플레이 화면에 노출하지 않는다.
- 절대로 주인공 3D 모델이 플레이어 실제 좌표, 그림자, 충돌 중심과 분리되어 보이게 구현하지 않는다.

## Quality Assurance 부서 정책

### 반드시 지켜야 할 사항

- 반드시 테스트 계획, 검증 결과, 버그 위험, 리뷰 기록은 `Quaility_Assurance/` 폴더에 기록한다.

### 절대로 하면 안 되는 사항

- 절대로 검증하지 않은 기능을 검증 완료로 기록하지 않는다.

## Kanban 서브에이전트 개발 프로세스 정책

### 반드시 지켜야 할 사항

- 반드시 여러 역할이 필요한 게임 개발, 마일스톤, 릴리스 준비, QA 게이트, 그래픽/개발/기획 통합 작업은 `escape-zombie-school` Kanban 보드와 등록된 Hermes 프로필을 통해 분해·배정·검증한다.
- 반드시 Kanban 서브에이전트 투입 절차는 `Developer/agent_room/game_development_kanban_process.md`를 따른다.
- 반드시 프로젝트 내부 서브에이전트 연결 정본은 `Developer/agent_room/subagent_system_wiring_2026-07-03.md`로 확인한다.
- 반드시 Kanban 카드의 담당자는 실제 spawn 가능한 프로필명(`threemini`, `levelmini`, `uimini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`) 중 하나로 지정한다.
- 반드시 worker 실행 전 프로필 HOME의 `~/.claude/skills/gstack/bin` 게이트가 통과하는지 확인한다.
- 반드시 implementation wave 완료 선언 전 `todo=0`, `ready=0`, `running=0`, `blocked=0` 상태를 확인한다.

### 절대로 하면 안 되는 사항

- 절대로 `game-developer`, `balance_qa`처럼 spawn 불가능한 임시 assignee를 그대로 방치하지 않는다.
- 절대로 `review-required`로 막힌 코드 작업을 테스트/빌드/정적 점검 없이 완료 처리하지 않는다.
- 절대로 Kanban worker가 만든 변경을 검증 없이 릴리스 가능 또는 완료로 취급하지 않는다.

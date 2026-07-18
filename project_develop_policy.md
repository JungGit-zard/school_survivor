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
- 반드시 AAB를 새로 산출할 때마다 Android `versionCode`를 이전 산출물보다 증가시킨다.

### 절대로 하면 안 되는 사항

- 절대로 플레이 가능한 동작보다 장식적인 구조를 우선하지 않는다.
- 절대로 `http://172.22.41.219:5173/` 주소를 게임 실행, 로그인, 테스트, 브라우저 열기 또는 사용자 안내에 사용하지 않는다. 이 주소는 이 프로젝트에서 영구 금지한다.
- 절대로 `http://127.0.0.1:5173/` 주소를 게임 실행, Graphics Studio, 로그인, 테스트, 브라우저 열기 또는 사용자 안내에 사용하지 않는다. 이 주소는 이 프로젝트에서 영구 금지한다.

## Graphics Studio 정본 및 릴리스 패리티 정책

### Studio·게임·타이틀 캐릭터 절대 동일성 법칙

- 반드시 `Graphics Studio의 캐릭터 = 실제 게임의 캐릭터 = 타이틀 화면의 캐릭터`로 구현한다.
- 반드시 세 화면은 동일한 캐릭터 모델 원천, 동일한 모델 트리, 동일한 파츠 구성과 동일한 Firebase Studio 값을 사용한다.
- 반드시 Studio에서 캐릭터를 변형하면 Firebase 저장 성공과 현재 revision 확인 직후 실제 게임과 타이틀에 동일한 값이 즉시 적용된다.
- 반드시 타이틀 캐릭터는 Firebase Studio의 루트, 파트, 그룹, 재질, 색상, 외곽선, 데칼 및 그 밖의 모든 캐릭터 값을 하나도 누락하지 않고 먼저 완전히 적용한 모델이어야 한다.
- 반드시 타이틀 전용 위치, 회전, 스케일 및 애니메이션은 Firebase Studio의 모든 값을 완전히 적용한 동일 캐릭터의 바깥쪽 연출 계층에서만 추가한다.
- 반드시 타이틀 전용 연출은 Studio 값을 대체하거나 초기화하거나 덮어쓰지 않고, 완성된 Studio 캐릭터 전체에 후처리로 합성한다.
- 반드시 타이틀 전용 위치, 회전, 스케일 및 애니메이션을 제거했을 때 타이틀 캐릭터는 Studio와 게임의 캐릭터와 완전히 동일해야 한다.
- 반드시 Studio 캐릭터가 변경되는 동안 게임과 타이틀은 같은 Firebase revision으로 함께 갱신되어야 하며, 어느 한 화면만 과거 revision을 표시하면 즉시 치명적인 버그로 판정한다.
- 반드시 이 절대 동일성 법칙의 전체 원문은 프로젝트 루트 `STUDIO_GAME_TITLE_CHARACTER_ABSOLUTE_LAW.md`를 정본으로 함께 따른다.

### Studio·게임·타이틀 캐릭터 절대 금지 사항

- 절대로 타이틀 전용 캐릭터 모델, 복제 메시, 프록시 모델, 화면 캡처 재구성 모델 또는 별도 기본 형상을 만들지 않는다.
- 절대로 타이틀에서 Firebase Studio 값을 적용하지 않은 로컬 원천 모델만 직접 렌더하지 않는다.
- 절대로 로컬 시드, `localStorage`, 소스 기본값, 과거 revision, 임시 JSON, 다른 브랜치·작업공간·빌드 산출물의 변형값을 캐릭터에 적용하지 않는다.
- 절대로 Studio 값 중 일부만 적용한 뒤 나머지를 타이틀 전용 값으로 대신하지 않는다.
- 절대로 타이틀 전용 위치, 회전, 스케일 또는 애니메이션이 Studio의 루트·파트·그룹 값을 초기화하거나 덮어쓰게 하지 않는다.
- 절대로 “같은 컴포넌트나 파일을 import한다”는 사실만으로 Studio·게임·타이틀 캐릭터 동일성을 통과 처리하지 않는다. 동일 Firebase revision과 모든 값의 적용 결과를 검증해야 한다.
- 절대로 이 절대법칙 이외의 과거 구현, 기록, 복구 방식, 연결 방식 또는 방법론을 현재 작업에 사용하지 않는다. 전부 치명적인 버그로 분류하고 즉시 삭제한다.

### 반드시 지켜야 할 사항

- 반드시 Graphics Studio의 모든 입력값은 Firebase에 영구 저장된 현재 사용자 스냅샷만 정본으로 사용한다.
- 반드시 Studio, 타이틀, 게임은 Firebase에서 성공적으로 hydrate한 동일 revision의 값만 소비한다.
- 반드시 Firebase 로그인, 연결, hydrate, revision 또는 payload 검증이 실패하면 저장과 렌더 적용을 즉시 중단하고 fail-closed 처리한다.
- 반드시 `Source-Controlled Player Seed`, `sourceRevision`, `graphicsStudioPlayerSource.js`, 브라우저 `localStorage`, 소스 기본값 또는 과거 스냅샷을 이용한 초기화·복구·마이그레이션·fallback 방법론 전체를 치명적인 버그로 분류한다.
- 반드시 위 로컬 시드/fallback 방법론이 코드, 테스트, 문서, 빌드 산출물 또는 다른 작업공간에서 발견되면 현재 구현에 유입하지 말고 즉시 제거한다.
- 반드시 사용자가 Graphics Studio에서 확정한 Apply 값은 루트, 파트, 그룹 키와 값을 그대로 보존하고, 검증된 마이그레이션 없이 기본값이나 과거 값으로 덮어쓰지 않는다.
- 반드시 Stage 2 보스/B02의 모델, 파트, 크기, 화면 배치, Studio 상태 또는 저장 경로를 변경하기 전에는 `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md`를 먼저 확인한다. 과거 구현의 복구·참조·변환이 발견되면 즉시 작업을 중단한다.
- 반드시 Studio, 타이틀, 실제 게임의 시각 결과가 승인된 동일 상태와 일치하는지 화면별로 검증하고, 어느 한 화면이라도 매핑되지 않거나 다르게 보이면 릴리스를 중단한다.
- 반드시 AAB 릴리스 전에 전체 테스트, 프로덕션 빌드, 데스크톱·모바일 실제 화면 검증, 깨끗한 Capacitor 동기화, `versionCode` 증가, 로컬·원격 Git SHA 일치, AAB 해시·크기·서명 검증을 모두 기록한다.
- 반드시 AAB에 Git SHA가 내장되지 않은 경우 소스 SHA와 AAB의 관계를 바이너리 증명이 아니라 빌드 기록에 의한 절차적 provenance로 명시한다.
- 반드시 Firebase Visual Canonical State를 도입할 때는 최소한 payload, schema version, 서버 발급 revision, content hash, 작성자, 관리자 승인자, 작성·승인·적용 시각, 이전 revision 또는 rollback target, 상태를 저장한다.
- 반드시 Firebase Visual Canonical State의 쓰기·승인·롤백 권한은 서버가 검증한 관리자 권한으로 제한하고, 일반 사용자 로그인만으로 승인된 정본을 변경하지 못하게 한다.
- 반드시 Firebase Visual Canonical State 소비자는 승인 상태, schema version, revision, content hash를 검증하고 Studio·타이틀·게임이 같은 승인 revision을 ACK한 경우에만 적용한다. 누락, 미승인, 해시 불일치, 미지원 schema, 권한 오류에서는 로컬 기본값으로 조용히 대체하지 말고 fail-closed 처리한다.

### 절대로 하면 안 되는 사항

- 절대로 숫자 자식 경로 대신 `id:b02-face-texture`로 런타임 대상을 탐색하지 않는다. 이 연결과 이를 복구·호환·변환하는 모든 경로는 구형 B02 전용 치명적 버그로 분류하고 즉시 삭제한다.
- 절대로 사용자가 확정한 Studio 값을 화면 캡처, 브라우저 방문 기록, 추측한 신체 부위 이름, 오래된 소스 기본값으로 재구성하지 않는다.
- 절대로 Studio 입력값을 브라우저 `localStorage`, 소스 파일, Git seed, 빌드 번들, 임시 JSON, 창 간 메시지 또는 다른 로컬 저장소에 저장하거나 그곳에서 가져오지 않는다.
- 절대로 `Source-Controlled Player Seed`, `sourceRevision` 또는 과거 Apply 스냅샷으로 Firebase 상태를 초기화·보완·복구·마이그레이션하지 않는다.
- 절대로 Firebase 값이 없거나 읽기 실패한 경우 로컬 기본값이나 fallback으로 계속 실행하지 않는다.
- 절대로 과거 문서에 남은 로컬 저장·시드·fallback 절차를 현재 작업의 구현 근거로 사용하지 않는다. 해당 기록은 폐기된 치명적 버그의 증거일 뿐이다.
- 절대로 Vite/dev-server 브라우저 화면이나 AAB 내부 코드 포함 증거만으로 실제 AAB 시각 패리티를 통과했다고 기록하지 않는다. Android 에뮬레이터 또는 실기기 WebView에서 해당 AAB를 실행한 증거가 있어야 한다.
- 절대로 푸시되지 않았거나 원격 SHA와 다른 소스에서 프로덕션 AAB를 산출하지 않는다.

## 타이틀 사각 조명 영구 폐기 정책

### 반드시 지켜야 할 사항

- 반드시 2026-07-17 타이틀 화면에서 삭제된 좌우 사각 조명은 영구 폐기된 레거시 요소로 취급한다.
- 반드시 해당 조명의 복구 요청을 받으면 기존 원천 코드는 완전히 삭제되어 그대로 복구할 수 없으며, 다시 필요하면 사용자의 새 사양을 받아 처음부터 새로 제작해야 한다고 안내한다.
- 반드시 새 조명을 제작하게 되더라도 기존 좌우 대칭 사각 박스, 과거 위치값, 과거 외곽선 메시를 재사용하지 않고 별도의 신규 기획·그래픽 검토·구현·QA 절차를 거친다.
- 반드시 `TitleScene3D` 회귀 테스트에서 폐기된 `ToonBox` 타이틀 조명 컴포넌트가 다시 등장하지 않는지 검사한다.

### 절대로 하면 안 되는 사항

- 절대로 Git 이력, 이전 커밋, 문서의 코드 예시, 빌드 산출물 또는 다른 작업 트리에서 폐기된 타이틀 사각 조명 코드를 복사하거나 복원하지 않는다.
- 절대로 `TitleScene3D`에 폐기된 좌우 사각 조명 배치나 이를 위한 전용 `ToonBox` 컴포넌트를 다시 추가하지 않는다.
- 절대로 파랑·보라 조명 아래의 장면 요소 복구와 폐기된 사각 조명 박스 복구를 같은 작업으로 취급하지 않는다.

## Stage 2 보스 전면 재구현 실행 정책

### 반드시 지켜야 할 사항

- 반드시 사용자가 `스테이지2 다시 다 만들어`, `스테이지2 보스 다시 만들어`, `B02 처음부터 다시 만들어`, `B02 재구현 시작` 또는 같은 의미의 명확한 지시를 하면 `Planner/stage2_boss_complete_rebuild_plan_2026-07-17.md`를 읽고 Phase 0부터 즉시 실행한다.
- 반드시 위 실행 지시가 들어오면 착수 여부를 다시 질문하지 않고, 현재 혼합 작업 트리와 분리된 깨끗한 B02 전용 작업공간을 확보하는 일부터 시작한다.
- 반드시 구형 B02 구현을 보정하거나 복구하지 않고, 계획서에 정의된 삭제 게이트를 통과한 뒤 새 `stage2-boss-v2` Module로 전면 교체한다.
- 반드시 로컬에서 확인 가능한 사항은 질문 없이 조사·확정하고 안전하게 진행 가능한 Phase를 계속 수행한다.
- 반드시 새 2D 콘셉트 선택처럼 결과를 바꾸는 사용자 결정이나 Firebase 원격 데이터의 실제 영구 삭제처럼 별도 확인이 필요한 외부 변경에서만 필요한 선택을 요청한다.

### 절대로 하면 안 되는 사항

- 절대로 실행 트리거를 받은 뒤 다시 계획만 작성하거나 착수 여부를 묻지 않는다.
- 절대로 과거 B02 코드, legacy tuning, preview scale 보정 또는 source revision 복구 코드를 새 구현의 기반으로 재사용하지 않는다.
- 절대로 현재의 혼합 변경 작업 트리에서 기존 사용자 변경을 훼손하며 B02 삭제를 시작하지 않는다.

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
- 반드시 Kanban 카드의 담당자는 실제 spawn 가능한 프로필명(`threemini`, `levelmini`, `uimini`, `balanceqa`, `bizmini`, `launchmini`, `backendmini`, `englishgradmini`, `madangsue`, `jabdareminder`, `soundmini`) 중 하나로 지정한다.
- 반드시 worker 실행 전 프로필 HOME의 `~/.claude/skills/gstack/bin` 게이트가 통과하는지 확인한다.
- 반드시 implementation wave 완료 선언 전 `todo=0`, `ready=0`, `running=0`, `blocked=0` 상태를 확인한다.
- 반드시 탈출좀비학교의 모든 사운드 제작/수정/교체/검수 작업에는 `soundmini` / Sound_Mini / 사운드미니가 관여해야 한다. 작은 1파일 수정이라도 예외가 아니며, SFX/BGM/보이스/기계음/8-bit/chiptune/WebAudio/ZzFX/jsfxr/Howler `SOUND_MAP`/`public/sfx`/오디오 라이선스/음량·쿨다운·폴리포니 예산 변경은 `soundmini` 카드, `soundmini` 산출물, 또는 `.claude/agents/soundmini.md` 기반 검토 흔적을 남긴 뒤 진행한다.
- 반드시 탈출좀비학교 관련 작업은 먼저 단일 에이전트 직접처리인지, 아니면 등록된 서브에이전트 자동투입 대상인지 분류한다. 작은 1단계 작업을 제외하고, 여러 역할·마일스톤·검수·릴리즈·그래픽·UI·기획·개발·백엔드·현지화·BM·사운드 중 하나라도 걸리면 `Developer/agent_room/escape_zombie_school_subagent_autoinput_handoff_2026-07-17.md`와 `escape-zombie-school` Kanban 보드 기준으로 관련 프로필을 자동 투입한다.

### 절대로 하면 안 되는 사항

- 절대로 `game-developer`, `balance_qa`처럼 spawn 불가능한 임시 assignee를 그대로 방치하지 않는다.
- 절대로 `review-required`로 막힌 코드 작업을 테스트/빌드/정적 점검 없이 완료 처리하지 않는다.
- 절대로 Kanban worker가 만든 변경을 검증 없이 릴리스 가능 또는 완료로 취급하지 않는다.
- 절대로 `soundmini` 관여 없이 사운드 파일, 사운드 registry, 오디오 파라미터, BGM/보이스/라이선스 정책을 직접 확정하지 않는다.
# 게임 브라우저 동시 실행 상한

- Escape! zombie school의 수동 Chrome, CDP Chrome, Playwright/브라우저 테스트 루트 인스턴스는 모두 합쳐 최대 3개까지만 허용한다.
- Chrome이 창 하나를 위해 자동 생성하는 renderer/GPU/utility 하위 프로세스는 개수에 포함하지 않는다.
- 새 게임 브라우저나 브라우저 테스트를 실행하기 직전에 `Developer/r3f_prototype`에서 `npm run browser:reserve`를 실행해야 한다.
- 가드가 실패하면 기존 인스턴스를 종료하기 전까지 새 브라우저나 브라우저 테스트를 실행하지 않는다.

# Escape! zombie school 개발 정책

2026-11-03 정리판. 282줄 구판을 작업 기준으로 다시 묶었다. 규칙의 뜻은 유지하고 중복·폐기 항목만 걷어냈다.

## 0. 이 문서의 자리

- 프로젝트 최상위 정책이다. `AGENTS.md`, `CLAUDE.md`, 작업 노트와 충돌하면 이 문서가 우선한다.
- 사용자(Terry)가 현재 대화에서 직접 내린 지시가 이 문서와 충돌하면, 충돌을 한 줄로 알리고 지시대로 진행한다.
- 규칙이 불분명하면 가장 좁고 안전한 해석을 따르고, 방향이 바뀌는 결정만 사용자에게 묻는다.
- 새 규칙은 짧게 쓴다. 기존 규칙과 충돌하면 새 규칙 아래에 사유와 우선순위를 적는다.
- 여기에 중복 기재하지 않는 정본: 세션 메모리는 `SESSION_CONTINUITY.md`, git 공유 트리 규칙·모델 분담·도메인 에이전트 표는 `CLAUDE.md`, 용어는 `CONCEPTS.md`.

## 1. 역할과 작업 흐름

- 메인 세션은 Advisor다. 분석·브리프·검증·보고를 맡고, 구현은 Worker(`model="opus"`), 단순 조회·반복은 `model="sonnet"`에 맡긴다. 한두 줄짜리 자명한 수정은 직접 해도 된다.
- 도메인 작업은 상주 에이전트를 반드시 태운다. 3D·스튜디오는 `threemini`, UI/HUD는 `uimini`, 레벨·스폰·밸런스는 `levelmini`, 검증·acceptance는 `balanceqa`, 백엔드·Firebase는 `backendmini`, 사운드는 `soundmini`. 사운드는 1파일 수정도 예외 없다. 법인·세무·정산 자료는 `corpopsmini`.
- 밸런스·난이도·웨이브를 건드리면 구현 담당과 `balanceqa` 검증을 함께 태운다.
- 관여 흔적은 Kanban 카드, `Developer/agent_room` 산출물, `.claude/agents/<profile>.md` 기반 검토 중 하나로 남긴다. 절차 정본은 `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`와 `Developer/agent_room/game_development_kanban_process.md`.
- Kanban 담당자는 실제 spawn 가능한 프로필명만 쓴다. `game-developer`, `balance_qa` 같은 placeholder 금지. wave 완료 선언 전 `todo=0, ready=0, running=0, blocked=0` 확인.
- Worker 보고를 그대로 믿지 않는다. 최종 diff와 테스트를 직접 돌려 확인한 뒤 승인한다. 검증하지 않은 것을 검증 완료로 적지 않는다.

## 2. 기록 위치

| 폴더 | 내용 |
|---|---|
| `CEO/` | 제품 방향, 기술 전략, 사업 판단, 우선순위 |
| `Planner/` | 기획, 콘텐츠 구조, 규칙, 난이도, 진행 방식 |
| `Developer/` | 코드 구현, 기술 검토, 프로토타입 기록 |
| `Graphic_designer/` | 그래픽 콘셉트, 아트 방향, 시각 검토 |
| `Quaility_Assurance/` | 테스트 계획, 검증 결과, 리뷰 기록 (폴더명 오타는 그대로 둔다) |

한 작업이 기획·개발·그래픽을 함께 포함하면 역할별로 나눠 저장한다. CEO 기록만으로 구현 세부를 확정하지 않고, 기획 근거 없이 게임 규칙을 바꾸지 않는다.

## 3. 개발 환경

- dev 서버는 `http://localhost:5173/`만 쓴다. `http://127.0.0.1:5173/`과 `http://172.22.41.219:5173/`은 실행·로그인·테스트·안내 어디에도 쓰지 않는다.
- 사용자가 정확히 `개구리`라고 말하면 묻지 않고 `Developer/agent_room/operations/keep_port_5173_dev_server.ps1`을 실행한다. 이미 listening이면 유지한다. 5분 주기 예약 `SchoolSurvivor-Keep-5173`은 항상 켜 둔다.
- 게임 브라우저 인스턴스(수동 Chrome + CDP Chrome + Playwright 루트)는 합쳐서 최대 3개. 새로 띄우기 전 `Developer/r3f_prototype`에서 `npm run browser:reserve`를 실행하고, 실패하면 기존 인스턴스를 닫기 전에는 띄우지 않는다.
- 셸 삭제 차단 훅은 2026-11-03에 폐지했다. 삭제는 일반 명령이다. 단, 공유 작업 트리에서의 `git add -A`, `reset --hard`, `checkout -- .`, 추적외 파일 일괄 삭제 금지는 `CLAUDE.md` 그대로다.
- 플레이 가능한 동작이 장식적 구조보다 우선한다.

## 4. 릴리스

- AAB를 새로 만들 때마다 Android `versionCode`를 올린다.
- 프로덕션 AAB는 push된 원격 SHA와 일치하는 소스에서만 만든다.
- 릴리스 기록에 남길 것: 전체 테스트, 프로덕션 빌드, 데스크톱·모바일 실제 화면 확인, 깨끗한 Capacitor 동기화, `versionCode`, 로컬·원격 SHA 일치, AAB 해시·크기·서명. AAB에 SHA가 내장되지 않으면 빌드 기록에 의한 절차적 provenance로 명시한다.
- AAB 시각 패리티는 Android 에뮬레이터 또는 실기기 WebView에서 그 AAB를 실행한 증거로만 통과시킨다. dev 서버 화면이나 번들 내부 코드 포함 증거로는 안 된다.
- 홈페이지·타이틀 관련 배포 후에는 `https://escapezombie.com/`을 새 브라우저 세션에서 열어 확인한다. 로컬 주소 확인만으로 완료 보고하지 않는다.

## 5. 경로와 계정

- `/`는 게임 타이틀 화면이다(2026-10-09 사용자 결정). `/game` 진입 경로는 계속 지원한다. 공식 홈페이지 `WebLandingPage`는 `/landing`에서 표시하고 타이틀의 `홈페이지로` 버튼으로 이동한다.
- 홈페이지의 내용·디자인·자산·애니메이션·버튼·경로는 사용자가 현재 대화에서 직접 지시하지 않는 한 바꾸지 않는다.
- 최고관리자 Google 계정 `zard5388@gmail.com`은 로그인 성공 즉시 로그인 완료로 판정한다. Studio·진행도·revision 읽기 실패가 인증을 취소하거나 로비 진입을 막으면 안 된다. 진행정보가 늦게 오면 같은 화면에서 다시 읽어 반영한다.
- 계정 매칭 관측 기준: 표시 이름 `정실장`, 골드 `205`, 최고 기록 S1 `12:46` / S2 `6:06` / S3 `5:21` / S4 `8:01`, Stage 1~4 클리어·입장 가능. 이 자리에 빈값, 다른 사용자, 초기 기록, 잠긴 스테이지가 보이면 계정 매칭 버그다. 이 수치는 시드로 덮어쓸 값이 아니라 검증 기준이다.

## 6. Graphics Studio 정본

- 정본은 Firebase 하나다. Studio 입력은 Firebase 전역 정본 저장 성공과 같은 revision 확인 뒤에만 Studio·타이틀·게임에 적용한다. 저장 실패면 어떤 렌더 적용도 하지 않는다. 읽기·hydrate·revision·payload 검증 실패는 fail-closed다.
- Studio에 진입·저장할 수 있는 계정은 최고관리자 Google 계정뿐이다.
- Studio 캐릭터 = 게임 캐릭터 = 타이틀 캐릭터. 같은 모델 원천, 같은 트리, 같은 파츠, 같은 Firebase revision. 전문은 `STUDIO_GAME_TITLE_CHARACTER_ABSOLUTE_LAW.md`. 타이틀 전용 위치·회전·스케일·애니메이션은 Studio 값을 전부 적용한 캐릭터의 바깥 연출 계층에만 붙이고, 그 연출을 떼면 세 화면이 완전히 같아야 한다. 한 화면만 과거 revision이면 치명 버그다.
- 금지: 타이틀 전용 모델·복제 메시·프록시·캡처 재구성; `localStorage`·로컬 시드·`Source-Controlled Player Seed`·`sourceRevision`·`graphicsStudioPlayerSource.js`·과거 스냅샷·임시 JSON·창 간 메시지·다른 트리 값으로 초기화·복구·마이그레이션·fallback; Firebase 값이 없을 때 로컬 기본값으로 계속 실행; 과거 문서의 시드·fallback 절차를 근거로 사용. 발견하면 유입시키지 말고 제거한다.
- 사용자가 Apply한 값은 루트·파트·그룹 키와 값을 그대로 보존한다. 검증된 마이그레이션 없이 기본값이나 과거 값으로 덮어쓰지 않는다.
- 런타임 대상은 숫자 자식 경로로 찾는다. `id:b02-face-texture` 탐색과 그 호환·변환 경로는 구형 B02 치명 버그다.
- "같은 컴포넌트를 import한다"는 사실만으로 동일성을 통과 처리하지 않는다. 화면별로 같은 revision과 값 적용 결과를 검증하고, 한 화면이라도 다르면 릴리스를 멈춘다.
- Stage 2 보스(B02)의 모델·파츠·크기·배치·Studio 상태·저장 경로를 바꾸기 전에 `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md`를 읽는다. 구형 B02 코드·legacy tuning·preview scale 보정·source revision 복구는 재사용하지 않는다.
- 사용자가 `스테이지2 다시 다 만들어`, `B02 처음부터 다시 만들어`, `B02 재구현 시작` 또는 같은 뜻으로 말하면 `Planner/stage2_boss_complete_rebuild_plan_2026-07-17.md`를 읽고 묻지 않고 Phase 0부터 시작한다. 혼합 작업 트리와 분리된 깨끗한 B02 작업공간 확보가 첫 단계다. 결과를 바꾸는 사용자 결정이나 Firebase 원격 데이터 영구 삭제만 물어본다.
- Firebase Visual Canonical State를 도입할 때는 payload, schema version, 서버 발급 revision, content hash, 작성자, 승인자, 작성·승인·적용 시각, 이전 revision(롤백 대상), 상태를 저장한다. 쓰기·승인·롤백은 서버가 검증한 관리자 권한으로 제한하고, 소비자는 승인 상태·schema·revision·hash를 검증한 뒤 세 화면이 같은 revision을 ACK한 경우에만 적용한다.

## 7. 그래픽 스타일

- 캐릭터·몬스터와 그 행동 연출은 `three.js` 3D 카툰이다. `MeshToonMaterial` 또는 동등한 toon shader로 명암이 단계적으로 끊기고, 외곽선을 넣는다. 2D 스프라이트·픽셀·프레임 교체, 실사 PBR, 무명암 평면색, 기본 재질만으로는 만들지 않는다.
- 3D 작업 전에 2D 원화 또는 2D 콘셉트 시안으로 방향을 확정한다. 레퍼런스는 `Graphic_designer/Bang_survivor_Graphic_concept.md`를 먼저 본다.
- 임시 도형·단순 표식·2D 대체 이미지를 최종 그래픽처럼 취급하지 않는다.
- 주인공 3D 모델은 이동·회전·애니메이션 중에도 플레이어 좌표·그림자·충돌 중심과 일치한다. 플레이 화면에 조준 원·디버그 원·위치 보정 표시를 노출하지 않는다.

## 8. 잠금 (사용자가 현재 대화에서 직접 지시할 때만 해제)

- **타이틀 전면**: 문구·카피, UI·버튼·입력, 레이아웃·좌표·크기, 캐릭터·모델·텍스처·재질·외곽선, 조명·배경·카메라, 애니메이션, 오디오·BGM, 설정, Studio 연결, 자산·runtime source를 바꾸지 않는다. 비평 점수, 품질, 최적화, 접근성, 라이선스, 리팩터링, 테스트 편의는 해제 사유가 아니다. 타이틀 표현을 바꾸려고 공유 gameplay 코드를 건드리는 것도 금지.
- **타이틀 BGM**: `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`는 bytes `998122`, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`의 영구 정본이다. 모든 dev 실행·빌드·AAB에 포함하고, 삭제·교체·변환·재생 경로 변경·대체 생성을 하지 않는다. 매니페스트는 권리·출처를 확인했다는 주장을 하지 않는다.
- **타이틀 좌우 사각 조명**: 2026-07-17에 삭제된 레거시다. Git 이력·문서·다른 트리에서 복원하지 않고, `TitleScene3D`에 전용 `ToonBox` 조명을 다시 넣지 않는다. 회귀 테스트로 재등장을 막는다. 다시 필요하면 새 사양으로 기획·그래픽 검토·구현·QA를 처음부터 거친다. 파랑·보라 조명 아래 장면 요소 복구와는 다른 작업이다.
- **Stage 1 쓰러진 학생 대사**: `Developer/r3f_prototype/src/lib/studentDialogueLines.js`의 한국어 원본 52줄 뒤에 248줄을 더한 300줄이 정본이고 en/ja는 1:1이다. Stage 1 `unconsciousStudent`와 `classPresidentStudent`의 일반 접촉 대사는 이 300줄 풀에서 고른다. 비학생 조사 기물은 타입별 정확히 5줄(기존 2줄 + 추가 3줄). 퀘스트 start/completion 대사가 일반 대사보다 우선한다. Stage 2~4 조사문은 변경 대상이 아니다. 원본 52줄 삭제·수정·축소, 고정 2줄 대체, 타화자 독백 대체, 런타임 연결 제거는 금지이며 `studentDialogueLines.test.js`와 `StudentDialogueTrigger.test.jsx`의 해시·인덱스·런타임 연결 테스트를 깨는 변경은 치명 버그다. 리팩터링·i18n·퀘스트·배치 변경이 대사의 내용·개수·화자·무작위 선택·출력에 영향을 주면 멈추고 Terry의 허락을 받는다. (commit `f85c84b`의 52줄 제거는 무단 대사 훼손으로 분류한다. 특정 인물을 침입자로 단정하지는 않는다.)

## 9. 폐기된 규칙 (기록용)

- 파괴적 쉘 삭제 차단 훅, 10회 코드 입력 검토, 터미널 3회 확인 하니스: 2026-11-03 Terry 지시로 폐지(commit `9e08e66d`).
- "하나(Hana) Advisor" 명칭: 현재 메인 세션(Fable 5.1) 역할로 대체. 분담 정본은 `CLAUDE.md`.

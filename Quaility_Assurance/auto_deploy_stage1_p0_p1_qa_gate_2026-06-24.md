# Auto Deploy Stage 1 P0/P1 QA Gate - 2026-06-24

프로젝트: Escape! zombie school
역할: Balance_QA_Mini / 밸검미니
범위: Stage 1 모바일 플레이어블 루프 안정성, P0/P1 리스크, 기존 QA 기록, 현재 미커밋 변경 위험
결론: 조건부 No-Go. 단위 테스트와 웹 빌드는 통과했지만, 실제 Android/WebView 모바일 루프와 Playwright 모바일 자동 스모크는 이번 실행에서 검증 완료로 표시할 수 없다.

## 1. 판정 요약

### Gate 판정

No-Go / 차단 유지 권고

이유:
1. `CLAUDE.md`가 모든 작업 전 gstack 전역 설치 확인을 요구하지만 `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING` 결과가 `GSTACK_MISSING`이다.
2. Stage 1 핵심 자동 테스트와 빌드는 통과했지만, 현재 우선순위인 모바일 플레이어블 루프는 실제 Android 기기 또는 Android WebView 릴리스 빌드에서 재검증하지 못했다.
3. Playwright 모바일 자동 스모크 스크립트는 작성했으나 로컬 Playwright 브라우저 실행 파일이 없어 실행이 차단되었다.
4. 작업트리에 다수의 미커밋 변경과 미추적 QA/그래픽/개발 산출물이 있으며, 자동 배포 전 변경 소유권과 검증 범위를 분리해야 한다.

### 통과로 볼 수 있는 것

- `npx vitest run --maxWorkers=1 --no-file-parallelism`: 57 files passed, 304 tests passed.
- `npm run build`: Vite production build completed.
- 데스크톱 브라우저 수동 스모크: 타이틀 → 닉네임 저장 → Stage 1 시작 → HUD/일시정지 버튼/플레이어/적/바닥 렌더링 → 약 23초 진행 후 Level Up 모달 도달 확인.
- Stage 1 E04 회귀 방지 단위 테스트 존재 및 전체 테스트에서 통과: `src/components/Enemies.test.jsx`가 Stage 1 wave/burst에 E04가 없음을 검사.
- 가상 조이스틱 관련 단위 테스트 존재 및 전체 테스트에서 통과: `VirtualJoystick.test.jsx`, `App.virtualJoystick.test.jsx`, `mobileInput.test.js`.

### 검증 완료로 표시하면 안 되는 것

- 실제 Android 기기 터치 조작 안정성.
- Android WebView 백그라운드/복귀 후 입력 상태.
- 릴리스 AAB에서 Stage 1 240초 1회 완주.
- 모바일 세로 화면에서 레벨업/일시정지/결과 모달 전체 터치 QA.
- Playwright 모바일 자동 스모크. 이번 실행은 브라우저 실행 파일 부재로 실패했다.

## 2. 이번에 읽은 파일

필수 시작/정책:
- `AGENTS.md`
- `project_develop_policy.md`
- `Bang_Rules.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` 최근 엔트리 1개

기존 QA 및 릴리스/모바일 관련 기록:
- `Quaility_Assurance/current_risk_register.md`
- `Quaility_Assurance/player_head_torso_attachment_validation_2026-06-24.md`
- `Quaility_Assurance/graphics_studio_ingame_parity_postfix_validation_2026-06-23.md`
- `Quaility_Assurance/virtual_joystick_mobile_validation_2026-05-23.md`
- `Quaility_Assurance/title_mobile_chase_validation_2026-06-14.md`
- `Quaility_Assurance/stage2_google_play_pre_internal_test_qa_gate_2026-06-06.md`
- `Quaility_Assurance/google_play_internal_test_android_build_validation_2026-06-02.md`

코드/구성:
- `Developer/r3f_prototype/package.json`
- grep로 `Developer/r3f_prototype/src` 내 Stage 1/Stage 2 E04, pause/resume, joystick, level-up 관련 참조 확인

## 3. 실행 명령과 실제 결과

### Git / 정책 / 환경

```bash
git status --short --branch && printf '\n--- recent commits ---\n' && git log --oneline -8 && printf '\n--- gstack check ---\n' && test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
```

결과 요약:
- 브랜치: `feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 6]`
- 다수의 수정/미추적 파일 존재.
- gstack: `GSTACK_MISSING`

```bash
python - <<'PY'
from pathlib import Path
p=Path('SESSION_MEMORY.md')
text=p.read_text(encoding='utf-8', errors='replace') if p.exists() else ''
parts=text.split('\n## Session ')
if len(parts)>1:
    latest='## Session '+parts[-1]
else:
    latest=text[-3000:]
print(latest[:5000])
PY
printf '\n--- diff stat ---\n'
git diff --stat
printf '\n--- untracked summary ---\n'
git ls-files --others --exclude-standard | sed -n '1,120p'
```

결과 요약:
- 최근 세션 메모리 확인.
- tracked diff: 23 files changed, 280 insertions(+), 188 deletions(-).
- untracked에 Developer/Graphic_designer/Quaility_Assurance 산출물과 스크린샷 다수 존재.

### 코드/리스크 grep

처음 실행은 `Developer/r3f_prototype` 하위에서 잘못된 경로를 지정해 실패했다.

```bash
printf '%s\n' '--- stage/mobile risk greps ---'
grep -R "E04\|STAGE_DURATION_SEC\|VirtualJoystick\|joystick\|pause\|resume\|LevelUp\|level-up" -n src | sed -n '1,260p'
```

결과 요약:
- `src/lib/stageConfig.js`: `STAGE_DURATION_SEC = 240` 확인. `Bang_Rules.md` 상단의 2026-06-11 4분 정책과 일치한다.
- `src/components/Enemies.test.jsx`: Stage 1 E04 제외 테스트 존재.
- `src/components/Enemies.jsx`: Stage 2 wave/burst에는 E04가 존재하지만 Stage 1 제외 테스트로 보호 중.
- `src/App.jsx`: `visibilitychange`, `pagehide`, `blur`에서 auto pause 호출 확인.
- `src/components/HUD.jsx`: pause/resume UI 확인.
- `src/components/VirtualJoystick.jsx`, `src/components/Player.jsx`, `src/lib/refs.js`: 모바일 joystickDir 연결 확인.

### 자동 테스트 / 빌드

```bash
npx vitest run --maxWorkers=1 --no-file-parallelism
```

결과:
- Test Files: 57 passed (57)
- Tests: 304 passed (304)
- Duration: 82.81s
- 반복 경고: React `act(...)` 테스트 환경 경고 다수. 테스트 실패는 아님.

```bash
npm run build
```

결과:
- Vite production build 성공.
- 주요 경고: `dist/assets/index-BD7GkOHM.js` 3,333.11 kB / gzip 1,121.92 kB, Vite 500 kB 초과 chunk warning.
- 이 경고는 기존 `QA-010` 번들 크기 위험과 연결된다. 빌드 실패는 아니지만 모바일 초기 로딩/메모리 리스크로 P1/P2 경계에서 추적 필요.

### 브라우저 수동 스모크

```bash
npm run dev -- --host 127.0.0.1
curl -I --max-time 5 http://127.0.0.1:5173/
```

결과:
- dev server HTTP 200 OK.
- 브라우저 도구로 `http://127.0.0.1:5173/` 접속.
- 타이틀 표시, `게임 시작` 클릭, 닉네임 `QA테스트` 입력 후 `저장하고 시작` 클릭.
- Stage 1 게임 화면 렌더링 확인: 바닥, 플레이어, 적, HP bar, Stage 1, 타이머, Lv.1, 일시정지/Restart 버튼 확인.
- 약 23초 지점에서 Level Up 모달 도달 확인.
- 콘솔 메시지: Vite 연결 로그, React DevTools 안내, `THREE.WebGLRenderer: Context Lost.` 1회. JS uncaught error는 0개.

주의: 이 브라우저 스모크는 데스크톱 뷰포트에서의 기본 루프 확인이다. 모바일 터치 검증으로 승격하지 않는다.

### Playwright 모바일 자동 스모크 시도

작성한 보조 스크립트:
- `Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs`

실행 1차:
```bash
node ../../Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs
```

결과:
- 실패: `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright' imported from .../Quaility_Assurance/...mjs`

조치:
- 스크립트에서 `createRequire('.../Developer/r3f_prototype/package.json')`로 프로젝트 `node_modules`를 기준으로 `playwright`를 불러오도록 수정.

실행 2차:
```bash
node ../../Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs
```

결과:
- 실패: Playwright Chromium 실행 파일 없음.
- 에러 핵심:
  - `Executable doesn't exist at C:\Users\admin\AppData\Local\ms-playwright\chromium_headless_shell-1223\...`
  - 안내: `npx playwright install`

판정:
- 모바일 자동 스모크는 검증 실패가 아니라 검증 환경 차단이다.
- 이 상태에서 모바일 루프를 검증 완료로 표시하면 안 된다.

## 4. 현재 작업트리 변경 위험

현재 작업트리는 자동 배포/자동 병합에 부적합하다.

확인된 tracked 변경 범위:
- `Developer/r3f_prototype/src/components/Floor.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
- `Developer/r3f_prototype/src/components/Player.jsx`
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- `Developer/r3f_prototype/src/components/VFXLayer.jsx`
- `Developer/r3f_prototype/src/components/Weapons/*.jsx` 다수
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js`

확인된 미추적 주요 산출물:
- `Developer/agent_room/auto_deploy_operations_ledger_2026-06-24.md`
- `Developer/agent_room/subagent_auto_deployment_2026-06-24.toh`
- `Developer/graphics_studio_shared_visuals_implementation_2026-06-23.md`
- `Developer/player_mesh_head_torso_attachment_2026-06-24.md`
- `Developer/r3f_prototype/src/components/EnemyProjectileVisual.jsx`
- `Developer/r3f_prototype/src/components/PlayerMesh.test.js`
- `Graphic_designer/graphics_studio_ingame_visual_parity_2026-06-23.md`
- `Graphic_designer/player_head_torso_attachment_review_2026-06-24.md`
- `Quaility_Assurance/graphics_studio_ingame_parity_postfix_validation_2026-06-23.md`
- `Quaility_Assurance/graphics_studio_ingame_parity_verification_2026-06-23.md`
- `Quaility_Assurance/player_head_torso_attachment_validation_2026-06-24.md`
- `Quaility_Assurance/screenshots/*.png` 다수

QA 해석:
- 테스트와 빌드는 현재 워킹트리 기준으로 통과했다.
- 그러나 변경 소유자와 리뷰 상태가 분리되어 있지 않아 자동 배포 게이트에서는 No-Go다.
- 특히 플레이어 메시/그래픽 스튜디오/무기 시각 컴포넌트 변경은 Stage 1 플레이어블 루프의 시각 안정성에 직접 영향을 줄 수 있으므로 리뷰 없이 배포하면 안 된다.

## 5. P0/P1 리스크 레지스터 리프레시

| ID | 심각도 | 상태 | 리스크 | 이번 근거 | Gate 액션 |
|---|---|---|---|---|---|
| QA-AUTO-001 | P0 | blocked | gstack 전역 필수 조건 미충족 | `GSTACK_MISSING`; `CLAUDE.md`는 STOP 요구 | gstack 설치/정책 예외 명시 전 자동 배포 금지 |
| QA-AUTO-002 | P0 | testing-not-complete | 실제 모바일/Android WebView Stage 1 루프 미검증 | 자동/데스크톱 검증만 수행, 실제 기기 없음 | Android 실기기 또는 릴리스 WebView 1판 검증 전 Go 금지 |
| QA-AUTO-003 | P0 | pass-automated-only | 테스트 회귀 | 57 files / 304 tests passed | 자동 테스트는 통과. 하지만 수동 모바일 검증 필요 |
| QA-AUTO-004 | P0 | pass-web-smoke-only | Stage 1 시작/레벨업 기본 루프 | 데스크톱 브라우저에서 시작 및 Lv.2 모달 도달 | 모바일 터치와 결과/재시작까지 추가 필요 |
| QA-AUTO-005 | P1 | open | Playwright 모바일 스모크 환경 미준비 | Chromium headless shell 미설치 | `npx playwright install chromium` 또는 브라우저 경로 고정 후 재실행 |
| QA-AUTO-006 | P1 | open | 작업트리 미커밋/미추적 변경 과다 | 23 tracked changed files + 다수 untracked | 변경 소유권/리뷰/QA 증거 정리 전 자동 배포 금지 |
| QA-AUTO-007 | P1 | observed | WebGL context lost 로그 | 브라우저 콘솔에 `THREE.WebGLRenderer: Context Lost.` 1회, JS error 0 | 반복 여부 확인. 실제 기기에서 반복되면 P0로 승격 |
| QA-AUTO-008 | P1 | open | Vite 번들 크기/모바일 로딩 위험 | build chunk 3.33 MB / gzip 1.12 MB 경고 | 저사양 Android 로딩/메모리 스모크 필요 |
| QA-AUTO-009 | P1 | automated-pass | 모바일 조이스틱 자동 테스트만 통과 | 기존 QA와 전체 테스트에서 joystick tests 통과 | 실제 iPhone/Android 터치 QA 없이는 verified 금지 |
| QA-AUTO-010 | P1 | automated-pass | pause/resume/비플레이 상태 정지 자동 보호 | `usePlayingFrame.test.js`, store pause tests 통과 | 실제 백그라운드/복귀와 HUD 터치 QA 필요 |

## 6. 자동 배포 전 필수 차단 조건

아래 중 하나라도 실패하면 No-Go다.

1. `npx vitest run --maxWorkers=1 --no-file-parallelism` 통과.
2. `npm run build` 통과.
3. Stage 1 웹 스모크: 타이틀 → 시작 → 30초 이상 생존 → 레벨업 카드 선택 → pause/resume → restart가 끊기지 않음.
4. 모바일 스모크: 390x844 또는 실제 Android에서 터치 이동, pause/resume, level-up 카드 터치, restart 확인.
5. Android WebView 또는 AAB/APK 설치 스모크: 첫 실행 검은 화면 없음, 1판 게임오버 또는 240초 클리어까지 진행 가능.
6. 작업트리 변경 목록과 QA 증거가 리뷰어가 이해 가능한 단위로 정리됨.
7. 개발 치트/관리 버튼 노출 정책이 Play 테스트 트랙 기준과 일치함.
8. `gstack` 필수 조건은 설치하거나, 이번 작업에 대한 명시적 정책 예외를 보드 댓글로 남김.

## 7. 권장 후속 검증 순서

1. `npx playwright install chromium` 실행 가능 여부 확인 후 `Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs` 재실행.
2. 실제 Android 기기 1대에서 Stage 1 240초 또는 자연 게임오버까지 플레이.
3. 같은 기기에서 pause/resume, 앱 전환/복귀, level-up 카드 터치, result/restart 확인.
4. `THREE.WebGLRenderer: Context Lost.`가 반복되는지 콘솔 또는 원격 디버깅으로 확인.
5. 현재 미커밋 변경을 기능 단위로 분리하고, 각 기능별 QA 기록과 스크린샷이 연결되는지 확인.
6. 그 후에만 자동 배포/릴리스 작업을 다음 담당자에게 넘긴다.

## 8. 이번 작업에서 생성/수정한 파일

- 생성: `Quaility_Assurance/auto_deploy_stage1_p0_p1_qa_gate_2026-06-24.md`
- 생성/수정: `Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs`

스크린샷 생성은 실패했다. Playwright 브라우저 실행 파일 부재로 `Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png`는 생성되지 않았다.

## 9. 블로커와 관찰 사항 분리

### 블로커

- `GSTACK_MISSING`: 프로젝트 `CLAUDE.md` 기준으로는 전역 gstack 부재가 작업 차단 조건이다.
- Playwright 모바일 자동 검증 환경 미준비: Chromium headless shell 없음.
- 실제 Android/WebView 모바일 루프 미검증.
- 작업트리 미커밋/미추적 변경 과다로 자동 배포 안전성 판단 불가.

### 관찰 사항

- 현재 워킹트리 기준 단위 테스트와 production build는 통과했다.
- 데스크톱 브라우저에서 Stage 1 시작과 초기 전투/레벨업 진입은 확인했다.
- 콘솔에 WebGL context lost 로그가 1회 있었다. 치명적 JS error는 없었다.
- build chunk-size warning은 계속 존재한다.

## 10. 구현 담당자에게 넘길 재현/검증 절차

1. 프로젝트 루트에서 `git status --short --branch`로 변경 목록을 고정한다.
2. `Developer/r3f_prototype`에서 `npx vitest run --maxWorkers=1 --no-file-parallelism` 실행.
3. `Developer/r3f_prototype`에서 `npm run build` 실행.
4. `Developer/r3f_prototype`에서 `npm run dev -- --host 127.0.0.1` 실행.
5. 브라우저에서 `http://127.0.0.1:5173/` 접속.
6. 타이틀에서 시작, 닉네임 저장, Stage 1 진입.
7. 30초 이상 플레이, Level Up 카드 선택, pause/resume, Restart 확인.
8. 모바일 검증은 `npx playwright install chromium` 후 `node ../../Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs`를 재실행하거나 실제 Android 기기에서 같은 절차를 수행한다.
9. 실제 Android에서 검증한 경우 기기명, Android 버전, 빌드 산출물, 스크린샷/영상 경로를 QA 기록에 추가한다.

## 11. 최종 QA 의견

현재 상태는 “자동 테스트는 건강하지만 모바일 출시 게이트는 아직 닫혀 있음”이다. Stage 1 모바일 플레이어블 루프 안정성을 우선한다는 현재 목표 기준에서는, 실제 모바일 또는 Android WebView에서 1판 루프를 통과하기 전까지 자동 배포를 Go로 표시하면 안 된다.

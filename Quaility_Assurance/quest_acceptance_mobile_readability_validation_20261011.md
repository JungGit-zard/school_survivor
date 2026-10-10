# 퀘스트 수락 모바일 가독성 검증 — 2026-10-11

## 판정

PASS — 현재 uncommitted 퀘스트 수락 HUD 변경은 모바일 세로 화면에서 NPC 대사는 보조 정보로 작아지고, 받은 퀘스트 제목과 다음 행동은 더 크고 인접하게 표시된다. 검증 범위에서 퀘스트 로직, localization 문자열, tap-to-close, Firebase, 그래픽, 타이틀, unrelated HUD 동작 변경은 발견하지 않았다.

## 검증 범위

- 프로젝트: Escape! zombie school
- 작업공간: `C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011`
- 브랜치: `zombie_only`
- 검토 대상 uncommitted 파일:
  - `Developer/r3f_prototype/src/components/HUD.jsx`
  - `Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx`
  - `Developer/quest_acceptance_mobile_readability_20261011.md`
- 신규 QA 기록:
  - `Quaility_Assurance/quest_acceptance_mobile_readability_validation_20261011.md`
- 스크린샷 증거:
  - `Quaility_Assurance/screenshots/quest_acceptance_mobile_readability_20261011/mobile_360x800_quest_acceptance.png`

## 필수 게이트

명령:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary quest-mobile-HUD-QA
```

결과:

```text
exit_code=0
resolved_domains: common, ui, qa
matched_domains: ui, qa
match_evidence: ui/hud, qa/qa
combined_receipt_sha256: 7f21855db5d67894a57f55cfc57c21d6a89d992cab7fccc54a815d0343907a38
```

읽은 문서:

- `AGENTS.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `Developer/agent_room/balanceqa_zombie_obstacle_avoidance_2026-07-25.md`
- `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `Developer/agent_room/mandatory_precommand/manifest.json`
- `Developer/agent_room/mandatory_precommand/README.md`
- `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md`
- `project_develop_policy.md`
- `Quaility_Assurance/로그인_타이틀_BGM_계정표시_검증_2026-08-08.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최신 엔트리 1개만: `Session 9 - Entry 1 - 2026-10-10 2323 KST`

추가 정책 게이트:

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
```

결과: `GSTACK_OK`

## Git 상태

명령:

```bash
git status --short --branch
```

필수 문서 확인 직후 결과:

```text
## zombie_only...origin/zombie_only
 M Developer/r3f_prototype/src/components/HUD.jsx
 M Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx
?? Developer/quest_acceptance_mobile_readability_20261011.md
```

## Diff 검토 결과

명령:

```bash
git diff -- Developer/r3f_prototype/src/components/HUD.jsx Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx Developer/quest_acceptance_mobile_readability_20261011.md
```

확인 사항:

- `HUD.jsx`
  - 퀘스트 대화 팝업에서 `questToastMessage`와 `questPopupNextAction`을 `questDialoguePrimary` 블록으로 묶어 두 핵심 메시지가 바로 붙어 보이도록 변경.
  - 팝업 폭을 `min(calc(100vw - 24px), 560px)`로 조정하고 `maxHeight: calc(100dvh - 48px)`, `overflowY: auto`를 추가해 세로 모바일에서 화면 밖으로 밀릴 위험을 낮춤.
  - NPC 초상은 `clamp(56px, 18vw, 76px)`로 좁은 화면에 맞춤.
  - NPC 대사 `questDialogueLine`은 `fontSize clamp(12px, 3.5vw, 13px)`, `fontWeight 700`, `lineHeight 1.34`, `padding 6px 8px`로 보조화.
  - 퀘스트 획득 제목 `questDialogueNotice`는 `fontSize clamp(21px, 6vw, 25px)`, `lineHeight 1.16`으로 유지/강조.
  - 다음 행동 `questDialogueNextAction`은 `fontSize clamp(16px, 4.6vw, 19px)`, `lineHeight 1.24`로 제목 바로 아래에 표시.
- `HUD.questInventory.test.jsx`
  - DOM 순서, 핵심 블록 adjacency, lineHeight/weight/padding, popup overflow 스타일을 확인하는 회귀 assertions 추가.
- `Developer/quest_acceptance_mobile_readability_20261011.md`
  - 구현자 기록. 변경 목적, 테스트, 빌드 게이트 차단 사유가 기록되어 있음.

범위 외 변경 여부:

- 퀘스트 상태 전이 함수, 보상/진행 로직 변경 없음.
- localization 문자열 추가/수정/삭제 없음.
- tap-to-close handler는 기존 `onPointerDown -> clearQuestToast() -> closeStudentDialogue()` 흐름 유지.
- Firebase, 그래픽/타이틀, 오디오, Stage 밸런스, unrelated HUD 스타일 변경 없음.

## 집중 테스트

명령:

```bash
NPM_CONFIG_CACHE='./.npm-cache' npm run test -- src/components/HUD.questInventory.test.jsx
```

결과:

```text
pretest:
branch guard: ok
Legacy B02 source gate passed.
Dialogue store gate passed (451 Korean IDs).
Studio-game sync source contract passed.

vitest:
Test Files  1 passed (1)
Tests       10 passed (10)
Duration    3.79s
```

판정: PASS.

## 모바일 세로 시각/레이아웃 스모크

브라우저 실행 전 가드:

```bash
npm run browser:reserve
```

결과:

```text
branch guard: ok
GAME_BROWSER_INSTANCES=1 LIMIT=3 MODE=reserve
```

개발 서버:

```bash
NPM_CONFIG_CACHE='./.npm-cache' npm run dev -- --host 127.0.0.1
curl -I --max-time 5 http://localhost:5173/ || true
```

결과:

```text
HTTP/1.1 200 OK
Content-Type: text/html
```

Playwright 설치 브라우저 확인 중 기본 bundled chromium은 없었고 `npx playwright install chromium`은 이 임시 Windows 환경에서 `ENOENT: no such file or directory, mkdir '\\?'`로 실패했다. 대체로 시스템 Chrome channel을 사용해 360x800 모바일 viewport 스모크를 실행했다.

시각 스모크 조건:

- viewport: 360x800, mobile/touch emulation
- render target: 실제 `HUD.jsx`, 실제 `useGameStore`, 실제 `getStageQuestDefinitions('stage1')`
- 상태: Stage 1 첫 퀘스트 시작 대화 팝업
- screenshot: `Quaility_Assurance/screenshots/quest_acceptance_mobile_readability_20261011/mobile_360x800_quest_acceptance.png`

측정 결과:

```json
{
  "viewport": { "width": 360, "height": 800 },
  "popup": { "x": 12, "y": 258.4765625, "width": 336, "height": 283.046875, "overflowY": "auto" },
  "line": {
    "text": "난 말을 잘 못하거든… '말빨기술책'이 있다면!!!",
    "fontSize": "12.6px",
    "lineHeight": "16.884px",
    "fontWeight": "700"
  },
  "notice": {
    "text": "말문을 책으로 배운다 퀘스트를 얻었습니다!",
    "fontSize": "21.6px",
    "lineHeight": "25.056px",
    "fontWeight": "1000"
  },
  "next": {
    "text": "다음 행동: 교실 반대편에서 말빨기술책을 찾아 학생에게 돌려주자.",
    "fontSize": "16.56px",
    "lineHeight": "20.5344px",
    "fontWeight": "800"
  },
  "order": [
    "NPC dialogue",
    "quest received notice",
    "next action"
  ],
  "popupCountAfterTap": 0
}
```

판정:

- 360px 폭에서 팝업 폭 336px로 좌우 12px 여백 확보: PASS.
- 팝업 높이 283px로 800px 세로 화면 안에 안정적으로 표시: PASS.
- NPC dialogue 12.6px/700, quest notice 21.6px/1000, next action 16.56px/800으로 시각 위계가 의도대로 분리됨: PASS.
- quest received notice와 next action이 연속 블록으로 인접 표시됨: PASS.
- 탭 후 팝업 count 0으로 tap-to-close 유지: PASS.

## 리스크 / 제한

- 기본 Playwright bundled chromium은 설치되어 있지 않았고 설치 명령은 환경 경로 오류로 실패했다. 시스템 Chrome channel로 대체 검증했으므로, 이 QA의 실제 브라우저 증거는 Chrome headless 기반이다.
- 실제 Android WebView/AAB 실기기 검증은 이번 카드 범위가 아니며 수행하지 않았다.
- QA 카드 자체에서는 생산 빌드를 재실행하지 않았다. 이후 Advisor가 기존 release `.env`를 내용 노출 없이 clean checkout에 복사해 `npm.cmd run build`를 실행했고, Firebase release env gate, Studio/game sync 45 tests, Vite build, Hosting asset 56개 검증까지 모두 PASS했다.

## 최종 결론

이 변경은 Stage 1 모바일 playable loop 안정성 관점에서 수용 가능하다. 핵심 퀘스트 수락 정보가 작게 묻히던 위험은 완화되었고, 검토한 diff와 집중 테스트/360x800 시각 스모크에서 quest logic, localization, tap-to-close, Firebase, graphics/title, unrelated HUD 회귀는 발견하지 않았다.

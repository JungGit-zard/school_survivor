# Playwright mobile smoke environment restore — 2026-06-24

Project: Escape! zombie school
Kanban task: `t_bcda3c3c`
Role: Madang_sue / 마당쇠
Scope: Restore the existing Stage 1 Playwright mobile smoke environment on Windows/Git-Bash/Hermes. No game logic changes. No commit/push.

## 1. Result summary

Environment blocker resolved enough for the Playwright Chromium mobile smoke script to launch headless Chromium and run against the dev server at `http://127.0.0.1:5173/`.

Final smoke command exited with code 0 and produced screenshot:

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png`

Important limitation: this is an automated 390x844 Playwright browser smoke. It does not replace real Android device QA or Android WebView/AAB install QA.

## 2. Startup reads completed

Required startup reads for this task were completed:

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- latest relevant `SESSION_MEMORY.md` section
- `Quaility_Assurance/auto_deploy_stage1_p0_p1_qa_gate_2026-06-24.md`
- `Quaility_Assurance/auto_deploy_integration_gate_2026-06-24.md`
- `Developer/agent_room/auto_deploy_operations_ledger_2026-06-24.md`

Policy reminders observed:

- Do not change game logic for this task.
- QA records belong under `Quaility_Assurance/`.
- Do not commit unless Terry explicitly asks.
- Stage length is 240 seconds; older 300-second references in `Bang_Rules.md` must be read through the 2026-06-11 x0.8 rule.

## 3. Environment / git status commands

Command:

```bash
pwd && printf 'HOME=%s\n' "$HOME" && test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK_HOME || echo GSTACK_MISSING_HOME; test -d /c/Users/admin/.claude/skills/gstack/bin && echo GSTACK_OK_USER || echo GSTACK_MISSING_USER; git status --short --branch
```

Result summary:

```text
/d/JungSil/2.Minigame_project/school_survivor-integration
HOME=/c/Users/admin/AppData/Local/hermes/profiles/madangsue/home
GSTACK_OK_HOME
GSTACK_OK_USER
## feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 6]
```

The worktree already had many tracked and untracked changes before this task. This run only changed QA smoke/report artifacts listed below.

## 4. Playwright Chromium install / verification

Install command:

```bash
npx playwright install chromium
```

Working directory:

```text
D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
```

Observed result:

```text
exit_code: 0
stdout: empty
stderr: empty
```

Dry-run verification command:

```bash
npx playwright install chromium --dry-run
```

Observed output:

```text
Chrome for Testing 148.0.7778.96 (playwright chromium v1223)
  Install location:    C:\Users\admin\AppData\Local\ms-playwright\chromium-1223
  Download url:        https://cdn.playwright.dev/builds/cft/148.0.7778.96/win64/chrome-win64.zip

FFmpeg (playwright ffmpeg v1011)
  Install location:    C:\Users\admin\AppData\Local\ms-playwright\ffmpeg-1011
  Download url:        https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-win64.zip
  Download fallback 1: https://playwright.download.prss.microsoft.com/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-win64.zip
  Download fallback 2: https://cdn.playwright.dev/builds/ffmpeg/1011/ffmpeg-win64.zip

Chrome Headless Shell 148.0.7778.96 (playwright chromium-headless-shell v1223)
  Install location:    C:\Users\admin\AppData\Local\ms-playwright\chromium_headless_shell-1223
  Download url:        https://cdn.playwright.dev/builds/cft/148.0.7778.96/win64/chrome-headless-shell-win64.zip

FFmpeg (playwright ffmpeg v1011)
  Install location:    C:\Users\admin\AppData\Local\ms-playwright\ffmpeg-1011
  Download url:        https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-win64.zip
  Download fallback 1: https://playwright.download.prss.microsoft.com/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-win64.zip
  Download fallback 2: https://cdn.playwright.dev/builds/ffmpeg/1011/ffmpeg-win64.zip

Winldd (playwright winldd v1007)
  Install location:    C:\Users\admin\AppData\Local\ms-playwright\winldd-1007
  Download url:        https://cdn.playwright.dev/dbazure/download/playwright/builds/winldd/1007/winldd-win64.zip
  Download fallback 1: https://playwright.download.prss.microsoft.com/dbazure/download/playwright/builds/winldd/1007/winldd-win64.zip
  Download fallback 2: https://cdn.playwright.dev/builds/winldd/1007/winldd-win64.zip
```

## 5. Dev server check

Command:

```bash
curl -I --max-time 5 http://127.0.0.1:5173/ || true
```

Observed result:

```text
HTTP/1.1 200 OK
Vary: Origin
Content-Type: text/html
Cache-Control: no-cache
Etag: W/"393-eBrU89cPIvX5WjK7Cmj5UKWRWJc"
Date: Wed, 24 Jun 2026 14:53:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

The dev server was already running on port 5173, so this task did not start a new persistent server process.

## 6. Smoke script adjustment

File updated:

- `Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs`

Reason: after Chromium was installed, the original script launched but stayed on the title screen because the current nickname storage key is `school_survivor:userNicknames`; the old smoke setup wrote obsolete keys and then tapped the screen without guaranteeing Stage 1 entry. The QA script was adjusted to:

- seed `localStorage` with `school_survivor:userNicknames = { local: 'QA모바일' }`,
- click `게임 시작`,
- handle the nickname modal if it appears,
- wait for `Stage 1` and HP HUD,
- exercise a mobile viewport touch/drag,
- pause and resume,
- wait 26 seconds for level-up observation,
- click Restart,
- save a screenshot,
- print structured JSON checkpoints.

No game code or game logic was changed.

Syntax verification command:

```bash
node --check ../../Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs && test -f ../../Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png && echo SCREENSHOT_EXISTS
```

Observed result:

```text
SCREENSHOT_EXISTS
```

## 7. Final smoke run

Command:

```bash
node ../../Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs
```

Working directory:

```text
D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
```

Observed result:

```json
{
  "status": "completed",
  "url": "http://127.0.0.1:5173/",
  "title": "Escape! zombie school",
  "checkpoints": [
    {
      "name": "title-loaded",
      "bodyText": "G\nGoogle 로그인 설정 필요\nFirebase .env 설정 후 사용\nGoogle 로그인\n치트\n⚙\nEscape! zombie school\nEscape!\nzombie school\n\n감염된 학교에서 4분만 버티면, 교문이 열린다\n\n게임 시작\n🪙 코인상점\n유저랭킹"
    },
    {
      "name": "stage1-started",
      "bodyText": "Stage 1\n00:00\nLv.1\nHP\n100/100\n연필\n0\nⅡ\nR"
    },
    {
      "name": "touch-joystick-dragged",
      "bodyText": "Stage 1\n00:00\nLv.1\nHP\n100/100\n연필\n0\nⅡ\nR"
    },
    {
      "name": "pause-opened",
      "bodyText": "Stage 1\n00:01\nLv.1\nHP\n100/100\n연필\n0\n▶\nR\nPAUSED\n계속하기"
    },
    {
      "name": "pause-resumed",
      "bodyText": "Stage 1\n00:01\nLv.1\nHP\n100/100\n연필\n0\nⅡ\nR"
    },
    {
      "name": "level-up-not-reached-after-26s",
      "bodyText": "Stage 1\n00:28\nLv.1\nHP\n92/100\n연필\n0\nⅡ\nR"
    },
    {
      "name": "restart-clicked",
      "bodyText": "Stage 1\n00:00\nLv.1\nHP\n100/100\n연필\n0\nⅡ\nR"
    }
  ],
  "finalBodyText": "Stage 1\n00:01\nLv.1\nHP\n100/100\n연필\n0\nⅡ\nR",
  "buttons": [
    "Ⅱ",
    "R"
  ],
  "consoleMessages": [
    "debug: [vite] connecting...",
    "debug: [vite] connected.",
    "info: %cDownload the React DevTools for a better development experience: https://reactjs.org/link/react-devtools font-weight:bold",
    "warning: [.WebGL-0x95400194800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels",
    "warning: [.WebGL-0x95400194800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels",
    "warning: [.WebGL-0x95400194800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels",
    "warning: [.WebGL-0x95400194800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)",
    "debug: [vite] connecting...",
    "debug: [vite] connected.",
    "info: %cDownload the React DevTools for a better development experience: https://reactjs.org/link/react-devtools font-weight:bold",
    "log: THREE.WebGLRenderer: Context Lost."
  ],
  "pageErrors": [],
  "screenshot": "Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png",
  "note": "Automated 390x844 Playwright smoke is not a replacement for real Android device/WebView QA."
}
```

## 8. Remaining blockers / QA interpretation

Resolved:

- Playwright Chromium/headless shell missing environment blocker for this Windows/Hermes setup.
- The smoke script now launches Chromium and reaches Stage 1 in a 390x844 mobile viewport.

Still blocked or incomplete:

- Real Android device QA is still required. This automated browser smoke does not prove Android WebView touch/input/render stability.
- Android AAB/APK install smoke remains unverified.
- Full 240-second Stage 1 clear or natural gameover remains unverified in this task.
- The 26-second automated wait did not reach a level-up in this run; the run still confirms title → Stage 1 → touch drag → pause/resume → restart. Level-up card touch remains a follow-up automated-script tuning or real-device QA item.
- Console contained WebGL/GPU warnings and `THREE.WebGLRenderer: Context Lost.` once. There were no page errors. If repeated on real devices, treat as P1/P0-boundary risk.

## 9. Files changed by this task

Changed/created:

- `Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs`
- `Quaility_Assurance/screenshots/auto-deploy-mobile-playable-loop-2026-06-24.png`
- `Quaility_Assurance/playwright_mobile_smoke_environment_restore_2026-06-24.md`

No game logic files changed. No commits or pushes performed.

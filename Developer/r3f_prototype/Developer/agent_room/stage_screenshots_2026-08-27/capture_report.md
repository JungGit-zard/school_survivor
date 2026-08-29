# Stage 1–4 screenshot capture report — 2026-08-27

## Terry request interpretation
- Gmail automation decision is confirmed as IMAP + Google app password.
- Separate task: open/check the R3F app stage visuals and provide screenshots for Stage 1 through Stage 4.
- Also record token/usage information and verify Hermes default profile keeps unused built-in toolsets disabled.

## Screenshot artifacts
- `stage1.png` — Stage 1 교실 생존
- `stage2.png` — Stage 2 복도 투사체 시험
- `stage3.png` — Stage 3 체육관 총력전
- `stage4.png` — Stage 4 급식실 대탈출
- `stage1-4_combined.png` — 4장 합본

## Capture method
- Used real `GameCanvas` + `useGameStore.resetGame(stage)` through a temporary Vite HTML capture harness.
- This bypassed Firebase/login/lobby gates but rendered the actual R3F gameplay canvas per stage.
- Browser: Playwright Chromium headless.
- Viewport: 390 x 844, deviceScaleFactor 2.
- Served with Vite on localhost:5174.
- Temporary harness/scripts were removed after capture.
- Vite server started by this run was killed after capture.

## Image verification
- `stage1.png`: 780x1688, non-zero pixel stddev, not blank.
- `stage2.png`: 780x1688, non-zero pixel stddev, not blank.
- `stage3.png`: 780x1688, non-zero pixel stddev, not blank.
- `stage4.png`: 780x1688, non-zero pixel stddev, not blank.
- `stage1-4_combined.png`: 1614x3506, generated successfully.

## Capture warnings
Only headless/WebGL performance warnings were observed:
- GPU stall due to ReadPixels
- KHR_parallel_shader_compile extension not supported

No stage-capture-blocking page exception remained after fixing the harness imports.

## Hermes token / usage record checked with `hermes insights --days 1`
Note: this is the currently available Hermes aggregate for Aug 27, not a perfect per-turn-only token bill.

- Sessions: 5
- Messages: 293
- Tool calls: 125
- User messages: 34
- Input tokens: 838,697
- Output tokens: 55,878
- Total tokens: 8,926,831
- Active time: ~15h 31m
- Model: gpt-5.5 via openai-codex
- Telegram tokens: 8,811,677
- Cron tokens: 115,154
- Top tools: terminal 80, skill_view 36, read_file 4, skill_manage 4, patch 1

## Hermes default profile built-in toolset check
Checked with `hermes tools list` and config file.

Current default profile status:
- Enabled: `terminal`, `skills`
- Disabled: web, browser, file, code_execution, vision, video, image_gen, video_gen, x_search, moa, tts, todo, memory, context_engine, session_search, clarify, delegation, cronjob, messaging, homeassistant, spotify, yuanbao, computer_use

Config confirmation:
- Global `toolsets`: only `terminal`
- `platform_toolsets.cli`: `terminal`, `skills`
- `platform_toolsets.telegram`: `terminal`, `skills`
- `platform_toolsets.discord`: empty
- `memory.memory_enabled`: false
- `memory.user_profile_enabled`: true

Conclusion:
- The “unused built-in toolsets stay off by default” rule is currently being respected.
- For this Telegram/default profile, only the minimal working pair (`terminal`, `skills`) is active.
- Toolset changes require a fresh session/reset to fully apply.

## Repo status after cleanup
- Temporary capture harness and scripts were removed.
- Only screenshot artifact folder remains untracked: `Developer/agent_room/stage_screenshots_2026-08-27/`.

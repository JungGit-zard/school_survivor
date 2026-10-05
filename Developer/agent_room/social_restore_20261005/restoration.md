# Social posting restoration — 2026-10-05

## Changes

- `marketing/x_daily_zombie_school_posting/posting_config.json`: replaced only 34 occurrences of `D:/JungSil/2.Minigame_project/school_survivor-integration` with `F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration`. Exact comparison against the original backup after that replacement returned `True`; the four pre-existing image replacements and all other bytes/content were preserved.
- `marketing/x_daily_zombie_school_posting/Invoke-XDailyZombieSchoolPostingRecovery.ps1`: added `-ReportOnly`. It reads the requested cycle receipt, evaluates it with `Test-CycleComplete`, and writes through the existing single-cycle report helper with `attempts=0`; the branch returns before invoking the posting wrapper.
- `marketing/x_daily_zombie_school_posting/Test-XDailyZombieSchoolPostingRecovery.ps1`: added offline coverage for ReportOnly output and existing single-cycle report shape.
- `포스팅/Install-ZombieSchoolFiveSlotPostingSchedule.ps1` registered the existing orchestrator for the five configured times. The existing `EscapeZombieSchool-XPostingDailyReport` task action was rebound to the current workspace and the ReportOnly mode.

## Schedule readback

- `EscapeZombieSchool-SocialPostingFiveSlots`: enabled, Ready; daily 02:00, 06:00, 11:00, 17:00, 21:00 Asia/Seoul; next run 2026-10-06 02:00 KST. Executable and working directory point to the F: workspace.
- `EscapeZombieSchool-XPostingDailyReport`: enabled, Ready; daily 23:55 KST; next run 2026-10-05 23:55 KST. It calls `Invoke-XDailyZombieSchoolPostingRecovery.ps1 -ReportOnly` with receipts at `Developer/agent_room/x_posting_receipts`.
- Legacy `EscapeZombieSchool-XPosting` and `EscapeZombieSchool-FacebookPosting` remain disabled.
- The ReportOnly verification read cycle `2026-10-05-2100` from the configured receipt directory and returned `status=incomplete`, `attempts=0`, exit code 0. Its generated report went to OS temp; no browser/UI was opened and no source receipt was changed.

## Backups

- Exact original config bytes and pre-change XML exports for both tasks are retained under `C:/Users/admin/AppData/Local/Temp/escape-social-posting-restore-20261005-234424137/`.
- The installer also retained its normal registration rollback evidence in `Developer/agent_room/social_posting_schedule_rollback_t_77083b1f/`.

## Offline checks

- Passed: `marketing/Test-ZombieSchoolSocialPosting.ps1` (`ZOMBIE_SOCIAL_WRAPPER_TEST_OK`).
- Passed: `포스팅/Test-ZombieSchoolFiveSlotPosting.ps1` (`FIVE_SLOT_SOCIAL_POSTING_TEST_OK`).
- Passed: `marketing/x_daily_zombie_school_posting/Test-XDailyZombieSchoolPostingRecovery.ps1` (9 assertions, `RECOVERY_TEST_OK`).
- Passed: `marketing/facebook_daily_zombie_school_posting/Test-FacebookDailyZombieSchoolPosting.ps1` (`FACEBOOK_POSTING_TEST_OK`).
- Passed: `marketing/facebook_daily_zombie_school_posting/Test-FacebookScheduledPosting.ps1` (exit 0, `FACEBOOK_SCHEDULE_TEST_OK`).
- `marketing/x_daily_zombie_school_posting/Test-XPostingVariants.ps1` stops at its first cycle-selection case: its fixtures use 09:00/12:00/18:00 IDs, while the current config permits 02:00/06:00/11:00/17:00/21:00. This is a fixture/config schedule mismatch; the production schedule was left as configured.

No Git staging, commit, or push was performed. No X/Facebook publishing UI was used in this restoration phase.

## ReportOnly default-path fix — 2026-10-05 23:59 KST

- The first scheduled 23:55 attempt had `LastTaskResult=1`: PowerShell evaluated the parameter defaults containing `Join-Path $PSScriptRoot ...` before the script body, where the scheduled invocation exposed an empty path.
- Changed the directory parameters to empty strings and resolved defaults after strict mode/error setup, relative to the script directory. Explicitly supplied directories keep their existing behavior.
- Extended `Test-XDailyZombieSchoolPostingRecovery.ps1` to copy only the runner, receipt helper, and config into a unique OS-temp campaign, run ReportOnly with no directory arguments, and verify the report stays in that temp campaign. Cleanup validates the exact temp-root and unique test-directory name first.
- Recovery test passed all 11 assertions. Running the exact registered action arguments returned exit 0; it wrote `marketing/x_daily_zombie_school_posting/reports/2026-10-05.json` for cycle `2026-10-05-2100` with `attempts=0`, `complete=false`, and 0 verified posts. The scheduled task was also started through Task Scheduler and read back as `Ready`, `LastTaskResult=0`, next run 2026-10-06 23:55 KST.
- No posting UI was opened or invoked.

## Five-slot sleep/wake audit — 2026-10-06 00:04 KST

- Read back `EscapeZombieSchool-SocialPostingFiveSlots`: enabled/Ready; five daily KST triggers remain 02:00, 06:00, 11:00, 17:00, 21:00; next run 2026-10-06 02:00 KST. Principal is `InteractiveToken`; task action and working directory still point to this F: workspace.
- The original task XML omitted `WakeToRun`, which is the default `false`. Before changing it, exported the complete XML to `C:/Users/admin/AppData/Local/Temp/EscapeZombieSchool-SocialPostingFiveSlots.before-wake-20261006-000308448.xml`. Set only the task's `WakeToRun` setting to `true`. After removing that one added XML element, the resulting full task XML exactly matches the saved original (`priorXMLIdenticalAfterRemovingWake=true`).
- Preserved `StartWhenAvailable=false` (no missed-slot backfill), `MultipleInstances=IgnoreNew`, `ExecutionTimeLimit=PT3H`, allow-start-on-battery=true, stop-on-battery=false, no `RunOnlyIfIdle` condition, and no network condition. Existing idle tuning remains present but is not a run condition. The project installer now sets and verifies `WakeToRun=true` for future re-registration.
- `powercfg /query` readback: AC sleep timeout is 0 (never), DC sleep timeout is 600 seconds, AC wake timers are enabled, DC wake timers are disabled. No system power settings were changed.
- Offline `포스팅/Test-ZombieSchoolFiveSlotPosting.ps1` passed (`FIVE_SLOT_SOCIAL_POSTING_TEST_OK`). Scheduler readback showed last run 2026-10-05 21:00 KST with `LastTaskResult=2147942667`; no conclusion about a successful post is inferred from schedule registration.
- This setting lets Task Scheduler request wake from supported sleep states while the computer remains powered. It cannot start a powered-off computer, enable DC wake timers, create a logged-in interactive session, or make visible Chrome automation publish while the desktop is locked. No-backfill remains in place, so a missed slot is not replayed later.
- No trigger times, system-wide power settings, credentials, or shared Git index were changed.

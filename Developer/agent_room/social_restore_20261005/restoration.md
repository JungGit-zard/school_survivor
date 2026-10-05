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

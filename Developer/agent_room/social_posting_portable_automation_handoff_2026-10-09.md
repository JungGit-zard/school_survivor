# Social posting automation: portable PC handoff

Date: 2026-10-09 (Asia/Seoul)
Scope: X (`@jungsilx`) and Facebook campaign automation in this repository.

## Purpose

Run the existing four-language campaign (`ja`, `en`, `vi`, `ko`) from a different Windows PC without depending on this PC's `F:`/`D:` drives, Chrome profile, credential vault, or temporary folders. The repository is the portable program and asset package; each execution PC supplies its own interactive browser session and OS-protected credentials.

## What needs to exist

The required program is a **Windows PowerShell 5.1 (64-bit, STA) campaign runner**, invoked by **Windows Task Scheduler** in a logged-on interactive desktop session. For X, the portable package uses `marketing/x_daily_zombie_school_posting/Install-XDailyZombieSchoolPostingSchedule.ps1`, `Invoke-XDailyZombieSchoolPostingRecovery.ps1`, `Invoke-XDailyZombieSchoolPosting.ps1`, `WindowsXPosting.ps1`, and `XCredentialVault.ps1`. It pins a stable cycle ID, selected text/image pair, and evidence receipt, and checks the visible timeline before any retry. Facebook remains on its separate platform runner and schedule.

Do not build this as a Windows service, headless browser, browser-protocol/CDP client, or API poster: the existing campaign uses visible native desktop UI automation. The runner must detect and stop on an unexpected account, login challenge, CAPTCHA/2FA, lost focus, ambiguous prior Publish/Post click, or unverifiable result. Five-minute indefinite retry is requested but is not in the canonical platform installers in this package. The combined five-slot prototype in the development workspace conflicts with those schedules and is excluded from this portable package. Do not describe indefinite retry as deployed until a platform-specific supervisor is implemented and verified. No program can guarantee a post at an exact second when Windows is asleep, powered off, locked, signed out, disconnected, or the platform blocks the account.

## Destination-PC requirements

- Windows 10/11, continuously powered on, with a dedicated Windows user signed in and its desktop unlocked at the configured times. Use a stable always-on PC or dedicated always-on Windows VM if this is an operational requirement.
- Windows PowerShell 5.1, 64-bit, launched with `-NoProfile -STA -ExecutionPolicy Bypass` (STA is required for the desktop UI automation libraries).
- Google Chrome installed for that Windows user. Sign in to the intended X and Facebook accounts in the visible normal Chrome profile on the destination PC; do not copy this PC's Chrome profile or cookies.
- Internet access and correct Windows time zone (`Asia/Seoul`). Preserve the campaign schedules already defined by the platform-specific installers: X at 09:00, 12:00, and 18:00 KST; Facebook at 11:00 and 17:00 KST. A past 21:00 failure is a historical incident, not authorization to replace those schedules.
- A fresh clone/check-out of this repository containing the runner, campaign configuration, image pool, and receipts needed for reconciliation. Keep paths repository-relative; do not rely on `F:\...`, `D:\...`, `C:\Users\admin\...`, Temp, or a drive letter that exists only on this PC.
- Store X credentials, if interactive login recovery is needed, in the **destination PC user's** Windows Credential Manager under generic credential target `EscapeZombieSchool-XPosting`. Never put the password in this repository, a command line, scheduled-task arguments, logs, receipts, or this handoff. Do not populate that credential on the current PC for the other PC's run. The destination operator must add it locally and should prefer a platform-supported app password/session method where available.
- To add that entry on the destination PC, open **Control Panel → Credential Manager → Windows Credentials → Add a generic credential**; use target `EscapeZombieSchool-XPosting`, username `@jungsilx`, and enter the password directly into the vault dialog. The password value must not be typed into a script or terminal command.
- Facebook login is also performed in the destination user's visible Chrome session. Do not copy authentication cookies, browser data, or tokens between PCs.

## Portable path rule

All program defaults derive from `$PSScriptRoot` / the repository root. The image resolver maps legacy absolute paths by their `image_pool` suffix into the current checkout and rejects paths that escape the approved image root; newly added image entries are repository-relative. Receipt and report roots default under `Developer/agent_room/`. Before activating the task on a new PC, run path validation for every configured image and runner from that checkout. Existing legacy strings in `posting_config.json` and old receipts may still show this PC's drive prefix for compatibility, but runtime resolution must never access that drive.

## Schedule and operator commands

The intended destination program is the repository's PowerShell campaign runner, Windows Task Scheduler, visible Chrome UI, and the destination Windows user's Credential Manager. Keep the existing platform schedules separate: `marketing/x_daily_zombie_school_posting/Install-XDailyZombieSchoolPostingSchedule.ps1` registers X at 09:00, 12:00, and 18:00 KST; `marketing/facebook_daily_zombie_school_posting/Install-FacebookPostingSchedule.ps1` registers Facebook at 11:00 and 17:00 KST. A combined five-slot queue prototype under `포스팅/` uses 02:00/06:00/11:00/17:00/21:00, conflicts with those canonical platform installers, and is excluded from this portable package.

Before registering/enabling on a destination PC:

1. Run the repository's pre-command document check for `jabdareminder` and read its emitted required files.
2. Run validation-only checks for the canonical platform schedules, the four language pairs, repository-relative image paths, account identity guards, and receipt recovery. Validation must not publish or touch the desktop.
3. Run one explicitly authorized live cycle and reconcile its four URLs in the intended account. Do not enable unattended tasks until the receipts and live timeline agree.
4. Register the platform-specific tasks for the dedicated logged-on user, verify each trigger and task action against its canonical times, then enable them. Keep tasks disabled if any preflight fails.

The code-only preflight commands are:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Test-WindowsXPostingLaunch.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Test-XPostingVariants.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Test-XDailyZombieSchoolPostingRecovery.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\facebook_daily_zombie_school_posting\Test-FacebookScheduledPosting.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Install-XDailyZombieSchoolPostingSchedule.ps1 -WhatIf
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\facebook_daily_zombie_school_posting\Install-FacebookPostingSchedule.ps1 -WhatIf
Get-ScheduledTask -TaskName 'EscapeZombieSchool-XPosting','EscapeZombieSchool-FacebookPosting'
```

Manual immediate run: launch PowerShell 5.1 as the dedicated logged-on user and invoke `Invoke-XDailyZombieSchoolPostingRecovery.ps1` with an explicit current KST `-CycleId yyyy-MM-dd-HHmm`. Reconcile before any historical run; never infer cycle IDs from receipt listings. Existing X recovery retries known transient failures every 300 seconds for at most 16 attempts and 75 minutes, and stops on authentication/security challenges, account mismatch, focus loss, or uncertain publication. It does not yet meet the requested indefinite-retry behavior. A matching visible post must be recorded as verified without clicking Post again.

## Current state on 2026-10-09

- Five new square anime-style campaign images were generated for each of `ja`, `en`, `vi`, and `ko` and added to the project image pool. Each language now has eight configured localized candidates; path, file decode, square dimensions, and locale selection tests pass.
- The current working tree has X launch safeguards and an X launch test. Validation reports `X_POSTING_LAUNCH_TEST_OK`, `ACCOUNT_IDENTITY_TEST_OK`, `VARIANT_TEST_OK`, and `RECOVERY_TEST_OK`; these checks do not prove unattended end-to-end execution on another PC.
- X cycle `2026-10-06-0200` has four verified posts. The other inventoried X cycles and Facebook receipts are incomplete; receipts alone do not prove whether a post exists. Reconcile before any historical click.
- The current checkout has not installed tasks on the destination PC. The visible combined task `EscapeZombieSchool-SocialPostingFiveSlots` on this PC is **Disabled** and is not the canonical X/Facebook schedule. Keep it disabled; install and read back the platform-specific tasks on the destination PC only.
- The config and old receipts retain some legacy absolute `F:` strings, but the runtime resolver now maps their `image_pool` suffix to the current clone; the path validation test verifies this from an alternate-drive fixture. New image entries are relative.
- The combined five-slot queue/retry implementation is excluded prototype code, not a verified destination deployment. Do not claim indefinite retries or use it to change canonical task times.
- The destination PC's Chrome sign-in and Windows Credential Manager are not configured from this PC. No password is included here.
- Operate from one designated PC at a time. The durable queue and receipts live in that checkout, so two PCs running the same campaign concurrently would not share an atomic queue or lock.

## Definition of ready

Portable means a clean checkout on a different Windows PC passes path/config validation without any source-PC drive, user profile, secret, or Temp dependency; its logged-on Chrome session is verified against the intended accounts; a test-only run does not publish; one authorized live cycle yields four distinct verified URLs; and Task Scheduler shows the canonical platform-specific KST triggers (X: 09:00/12:00/18:00; Facebook: 11:00/17:00). A posting success is reported only from verified platform evidence, never from a launched process or a receipt write alone.

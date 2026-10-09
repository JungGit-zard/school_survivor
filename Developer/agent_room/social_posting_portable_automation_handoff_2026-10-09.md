# Social posting automation: portable PC handoff

Date: 2026-10-09 (Asia/Seoul)
Scope: X (`@jungsilx`) and Facebook campaign automation in this repository.

## Purpose

Run the existing four-language campaign (`ja`, `en`, `vi`, `ko`) from a different Windows PC without depending on this PC's `F:`/`D:` drives, Chrome profile, credential vault, or temporary folders. The repository is the portable program and asset package; each execution PC supplies its own interactive browser session and OS-protected credentials.

## What needs to exist

The required program is a **Windows PowerShell 5.1 (64-bit, STA) campaign runner**, invoked by **Windows Task Scheduler** in a logged-on interactive desktop session. It runs the repository entrypoint `포스팅/Invoke-ZombieSchoolFiveSlotPosting.ps1`, which sequences Facebook and X, keeps one stable cycle ID, and writes per-platform receipts. A separate backlog supervisor must enumerate explicit missed cycle IDs, reconcile each against the live account timeline before acting, and retry only safe failures after five minutes using the same ID and frozen receipt intent. A single mutex must prevent scheduled and backlog runs from controlling the desktop at once.

Do not build this as a Windows service, headless browser, browser-protocol/CDP client, or API poster: the existing campaign uses visible native desktop UI automation. The runner must detect and stop on an unexpected account, login challenge, CAPTCHA/2FA, lost focus, ambiguous prior Publish/Post click, or unverifiable result. “Retry forever” means the supervisor remains scheduled and retries a *known safe transient failure* every 300 seconds; it must never repeat an uncertain publish action. No program can guarantee a post at an exact second when Windows is asleep, powered off, locked, signed out, disconnected, or the platform blocks the account.

## Destination-PC requirements

- Windows 10/11, continuously powered on, with a dedicated Windows user signed in and its desktop unlocked at the configured times. Use a stable always-on PC or dedicated always-on Windows VM if this is an operational requirement.
- Windows PowerShell 5.1, 64-bit, launched with `-NoProfile -STA -ExecutionPolicy Bypass` (STA is required for the desktop UI automation libraries).
- Google Chrome installed for that Windows user. Sign in to the intended X and Facebook accounts in the visible normal Chrome profile on the destination PC; do not copy this PC's Chrome profile or cookies.
- Internet access and correct Windows time zone (`Asia/Seoul`). The task schedule uses KST slots 02:00, 06:00, 11:00, 17:00, and 21:00.
- A fresh clone/check-out of this repository containing the runner, campaign configuration, image pool, and receipts needed for reconciliation. Keep paths repository-relative; do not rely on `F:\...`, `D:\...`, `C:\Users\admin\...`, Temp, or a drive letter that exists only on this PC.
- Store X credentials, if interactive login recovery is needed, in the **destination PC user's** Windows Credential Manager under generic credential target `EscapeZombieSchool-XPosting`. Never put the password in this repository, a command line, scheduled-task arguments, logs, receipts, or this handoff. Do not populate that credential on the current PC for the other PC's run. The destination operator must add it locally and should prefer a platform-supported app password/session method where available.
- Facebook login is also performed in the destination user's visible Chrome session. Do not copy authentication cookies, browser data, or tokens between PCs.

## Portable path rule

All program defaults must derive from `$PSScriptRoot` / the repository root. Configuration image paths should be repository-relative (for example `marketing/x_daily_zombie_school_posting/image_pool/marketing_social_30_20261004/ko/01_bell_escape.png`) and resolved against the repository root. Receipt and report roots should default under `Developer/agent_room/`. Before activating the task on a new PC, run a path audit for absolute drive paths and validate every configured image and runner path from that checkout. The current configuration still contains `F:` absolute paths; the current implementation is therefore **not yet portable** until that is repaired and validated.

## Schedule and operator commands

The Windows Scheduled Task name is `EscapeZombieSchool-SocialPostingFiveSlots`. The intended triggers are daily at 02:00, 06:00, 11:00, 17:00, and 21:00 KST, with `InteractiveToken`, `IgnoreNew`, and no “start when available” backfill. Keep the five-slot entrypoint as the one scheduler action; do not create one task per language or allow overlapping desktop automation.

Before registering/enabling on a destination PC:

1. Run the repository's pre-command document check for `jabdareminder` and read its emitted required files.
2. Run validation-only checks for all five cycle slots, the four language pairs, repository-relative image paths, account identity guards, receipt recovery, and the serial mutex. Validation must not publish or touch the desktop.
3. Run one explicitly authorized live cycle and reconcile its four URLs in the intended account. Do not enable unattended backlog retries until the receipts and live timeline agree.
4. Register the task for the dedicated logged-on user, verify all five triggers and the task action, then enable it. The task must remain disabled if any preflight fails.

Manual immediate run: launch PowerShell 5.1 as the dedicated logged-on user and invoke the repository five-slot runner with the explicit current KST `-RunId yyyy-MM-dd-HHmm`. Historical recovery must use the backlog supervisor with an explicit ordered list of cycle IDs; it must not infer or fabricate IDs from a receipt directory listing. Before each retry, reconcile any `publish_intent` or existing verified entry against the live account timeline. A matching post is recorded as verified without clicking Post again; an ambiguous or mismatching result stops for human review. The retry delay is exactly 300 seconds for safe transient errors, and retries retain the same cycle ID/content/image selection.

## Current state on 2026-10-09

- The current working tree has X launch safeguards and an X launch test. Validation previously reported `X_POSTING_LAUNCH_TEST_OK` and `ACCOUNT_IDENTITY_TEST_OK`; these checks do not prove unattended end-to-end execution on another PC.
- X cycle `2026-10-06-0200` has four verified posts. The other inventoried X cycles and Facebook receipts are incomplete; receipts alone do not prove whether a post exists. Reconcile before any historical click.
- The scheduled task `EscapeZombieSchool-SocialPostingFiveSlots` is currently **Disabled**. Its configured times were preserved, but it must not be described as running.
- The config still uses absolute `F:` paths. The portable-path conversion and validation remain a release blocker for another-PC use.
- Backlog wrapper and retry tests are still under implementation/review. Do not claim infinite retries are operational until safe-error classification, no-duplicate reconciliation, scheduled-task registration, and retry tests pass.
- The destination PC's Chrome sign-in and Windows Credential Manager are not configured from this PC. No password is included here.

## Definition of ready

Portable means a clean checkout on a different Windows PC passes path/config validation without any source-PC drive, user profile, secret, or Temp dependency; its logged-on Chrome session is verified against the intended accounts; a test-only run does not publish; one authorized live cycle yields four distinct verified URLs; and Task Scheduler shows the five exact KST triggers. A posting success is reported only from verified platform evidence, never from a launched process or a receipt write alone.

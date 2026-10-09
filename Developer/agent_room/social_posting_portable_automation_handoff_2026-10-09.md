# Social posting automation: portable PC handoff

Date: 2026-10-09 (Asia/Seoul)
Scope: X (`@jungsilx`) and Facebook campaign automation in this repository.

## Canonical schedule

Kanban card `t_77083b1f` records the user's latest explicit schedule: both X and Facebook post the four language versions (`ko`, `en`, `ja`, `vi`) at **02:00, 06:00, 11:00, 17:00, and 21:00 Asia/Seoul**—8 posts per slot, 40 posts per day across both platforms. This card's schedule is the source of truth. Older X-only 09:00/12:00/18:00 and Facebook-only 11:00/17:00 installer schedules are superseded and must not be used.

## Purpose

Run the existing four-language campaign (`ja`, `en`, `vi`, `ko`) from a different Windows PC without depending on this PC's `F:`/`D:` drives, Chrome profile, credential vault, or temporary folders. The repository is the portable program and asset package; each execution PC supplies its own interactive browser session and OS-protected credentials.

## What needs to exist

The required program is a **Windows PowerShell 5.1 (64-bit, STA) campaign runner**, invoked by **Windows Task Scheduler** in a logged-on interactive desktop session. The local implementation uses the serial five-slot queue supervisor in `포스팅/Install-ZombieSchoolFiveSlotPostingSchedule.ps1` and `포스팅/Invoke-ZombieSchoolFiveSlotPosting.ps1`, with the existing platform runners under `marketing/`. Each slot keeps its own stable cycle ID; one worker processes cycles serially, reconciles receipts and visible posts, retries safe transient failures at 300-second intervals, and stops on unsafe or uncertain states. The individual legacy X and Facebook installers are superseded for this schedule.

Do not build this as a Windows service, headless browser, browser-protocol/CDP client, or API poster: the campaign uses visible native desktop UI automation. The runner must detect and stop on an unexpected account, login challenge, CAPTCHA/2FA, lost focus, ambiguous prior Publish/Post click, or unverifiable result. The new five-slot queue/retry implementation exists in the local checkout and its offline tests pass; it has not yet been deployed to the latest remote revision or installed/validated on the destination PC. Posts serialize behind a running cycle, so later slots can publish after their configured time; exact posting-time guarantees are not claimed.

## Destination-PC requirements

- Windows 10/11, continuously powered on, with a dedicated Windows user signed in and its desktop unlocked at the configured times. Use a stable always-on PC or dedicated always-on Windows VM if this is an operational requirement.
- Windows PowerShell 5.1, 64-bit, launched with `-NoProfile -STA -ExecutionPolicy Bypass` (STA is required for the desktop UI automation libraries).
- Google Chrome installed for that Windows user. Sign in to the intended X and Facebook accounts in the visible normal Chrome profile on the destination PC; do not copy this PC's Chrome profile or cookies.
- Internet access and correct Windows time zone (`Asia/Seoul`). The schedule for both platforms is 02:00, 06:00, 11:00, 17:00, and 21:00 KST, as recorded by Kanban card `t_77083b1f`.
- A fresh clone/check-out of this repository containing the runner, campaign configuration, image pool, and receipts needed for reconciliation. Keep paths repository-relative; do not rely on `F:\...`, `D:\...`, `C:\Users\admin\...`, Temp, or a drive letter that exists only on this PC.
- Store X credentials, if interactive login recovery is needed, in the **destination PC user's** Windows Credential Manager under generic credential target `EscapeZombieSchool-XPosting`. Never put the password in this repository, a command line, scheduled-task arguments, logs, receipts, or this handoff. Do not populate that credential on the current PC for the other PC's run. The destination operator must add it locally and should prefer a platform-supported app password/session method where available.
- To add that entry on the destination PC, open **Control Panel → Credential Manager → Windows Credentials → Add a generic credential**; use target `EscapeZombieSchool-XPosting`, username `@jungsilx`, and enter the password directly into the vault dialog. The password value must not be typed into a script or terminal command.
- Facebook login is also performed in the destination user's visible Chrome session. Do not copy authentication cookies, browser data, or tokens between PCs.

## Portable path rule

The image-library root remains `marketing/x_daily_zombie_school_posting/image_pool`. The platform-specific collection layout is `x/<locale>/<collection>` and `facebook/<locale>/<collection>`, with locale codes `ko`, `en`, `ja`, and `vi`. Catalog readback confirms 98 assets per platform (X/Facebook each: ko 31, en 23, ja 22, vi 22), plus 10 reference entries: 206 entries total, 0 missing paths, 0 duplicate paths, and 57 legacy mappings. All 108 unique source paths have zero image files remaining at their old locations; all 206 canonical catalog paths exist. Graphic_designer image bytes were moved into X paths and copied separately to Facebook paths; old locations retain README/manifest guidance only. Each platform owns independent files; preserve localized anime/comic art, copy, and original dimensions. Do not resize one platform's images to match the other. X retains its existing 32 active image candidates; Facebook retains its existing variant-selection configuration, and archive collections are not activated automatically. Existing receipts remain unchanged and legacy image paths resolve only through exact catalog mappings. All program defaults derive from `$PSScriptRoot` / the repository root; validate every configured image and runner in the destination checkout before activation.

## Schedule and operator commands

The intended destination program is the repository's five-slot queued PowerShell campaign runner, Windows Task Scheduler, visible Chrome UI, and the destination Windows user's Credential Manager. The canonical times for both platforms are 02:00/06:00/11:00/17:00/21:00 KST. Do not use the superseded platform-specific installers, whose old X 09:00/12:00/18:00 and Facebook 11:00/17:00 schedules conflict with Kanban card `t_77083b1f`.

Before registering/enabling on a destination PC:

1. Run the repository's pre-command document check for `jabdareminder` and read its emitted required files.
2. Run validation-only checks for the canonical platform schedules, the four language pairs, repository-relative image paths, account identity guards, and receipt recovery. Validation must not publish or touch the desktop.
3. Run one explicitly authorized live cycle and reconcile its four URLs in the intended account. Do not enable unattended tasks until the receipts and live timeline agree.
4. After the updated queue implementation reaches the target checkout, register its five slot-specific intake tasks for the dedicated logged-on user. Verify the five trigger/action mappings, interactive principal, parallel intake, single desktop worker, no-backfill setting, and unlimited retry runtime before enabling. Keep tasks disabled if any preflight fails.

The code-only preflight commands are:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Test-WindowsXPostingLaunch.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Test-XPostingVariants.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\x_daily_zombie_school_posting\Test-XDailyZombieSchoolPostingRecovery.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\marketing\facebook_daily_zombie_school_posting\Test-FacebookScheduledPosting.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\포스팅\Test-ZombieSchoolFiveSlotPosting.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\포스팅\Test-ZombieSchoolSocialPostingBacklog.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\포스팅\Install-ZombieSchoolFiveSlotPostingSchedule.ps1 -WhatIf
```

Manual and historical runs must use an explicitly authorized cycle ID; never infer cycle IDs from receipt listings. A matching visible post must be reconciled as verified without clicking Post again.

## Current state on 2026-10-09

- Five new square anime-style campaign images were generated for each of `ja`, `en`, `vi`, and `ko` and added to the project image pool. Each language now has eight configured localized candidates; path, file decode, square dimensions, and locale selection tests pass.
- The local working tree has X launch safeguards and an X launch test. Validation reports `X_POSTING_LAUNCH_TEST_OK`, `ACCOUNT_IDENTITY_TEST_OK`, `VARIANT_TEST_OK`, and `RECOVERY_TEST_OK`; the queue and five-slot offline tests also pass. These checks do not prove unattended end-to-end execution on another PC.
- Last complete X recovery: cycle `2026-10-06-0200` completed on 2026-10-09 at 10:51–10:52 KST with four verified posts: [ja](https://x.com/jungsilx/status/2108374828516556861), [en](https://x.com/jungsilx/status/2108374920543830066), [vi](https://x.com/jungsilx/status/2108375017759322570), and [ko](https://x.com/jungsilx/status/2108375081533776140). The cycle ID identifies the recovered slot; the verified timestamps record when publication was observed. Do not replay this complete cycle.
- Facebook RunId `2026-10-05-2347-restore01`: EN existing post was verified before the user's stop-verification instruction; JA post-verification was attempted but not completed; after the instruction, VI/KO post-click lookup was omitted. JA `supplies`, VI `escape`, and KO `escape` each had one `PublishOnce` invocation and remain `publish_intent`; do not replay them. See [Facebook posting completion handoff](facebook_posting_completion_handoff_2026-10-09.md) for intent-record timestamps and the wrapper recovery path.
- Other inventoried X cycles and Facebook receipts remain incomplete; receipts alone do not prove whether a post exists. Reconcile against the live account timeline before any historical click.
- The current PC's `EscapeZombieSchool-SocialPostingFiveSlots` task remains **Disabled**. The updated five-slot implementation is local and has not been pushed to the latest remote revision. The target PC has not received or installed the updated code/tasks; do not treat local offline verification as target-PC validation.
- The config and old receipts retain some legacy absolute `F:` strings, but the runtime resolver now maps their `image_pool` suffix to the current clone; the path validation test verifies this from an alternate-drive fixture. New image entries are relative.
- The five-slot queued retry implementation is the local implementation for the canonical schedule, with offline tests passed. It is not yet deployed to the latest remote revision or installed/verified on the destination PC.
- The destination PC's Chrome sign-in and Windows Credential Manager are not configured from this PC. No password is included here.
- Operate from one designated PC at a time. The durable queue and receipts live in that checkout, so two PCs running the same campaign concurrently would not share an atomic queue or lock.

## Definition of ready

Portable means a clean checkout on a different Windows PC passes path/config validation without any source-PC drive, user profile, secret, or Temp dependency; its logged-on Chrome session is verified against the intended accounts; a test-only run does not publish; one authorized live cycle yields four distinct verified URLs per platform; and Task Scheduler shows both platforms at 02:00/06:00/11:00/17:00/21:00 KST. A posting success is reported only from verified platform evidence, never from a launched process or a receipt write alone.

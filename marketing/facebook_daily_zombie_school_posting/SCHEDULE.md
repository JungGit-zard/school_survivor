# Facebook daily posting schedule contract

The only authorized schedule is 11:00 and 17:00 in `Asia/Seoul`.
For the current scheduled slot, use exactly `RunId` `YYYY-MM-DD-1100` or
`YYYY-MM-DD-1700`. A runner has a 30-minute grace period and must never
backfill an older slot.

The runner must load the installed `facebook-daily-zombie-school-posting`
skill and invoke only `Invoke-FacebookDailyZombieSchoolPosting.ps1`. It must
not issue raw UI clicks, use a browser API, migrate an unknown receipt, or
create/modify a scheduler. The wrapper itself does not schedule work.

For each run, select the four languages in this exact order: `ja`, `en`,
`vi`, `ko`. Frozen new canonical copy must contain `https://escapezombie.com`
first and the Play URL second. Freeze each exact canonical text/image pair before opening its
composer. Images must remain under the existing X campaign `image_pool` root.
Omit `-VariantId` for shared `PostingVariant.ps1` rotation using Facebook's
11:00/17:00 slots in memory only; an explicit canonical variant ID takes priority.
Korean copy uses the exact shared Korean text, with `게임시작 ->` before the web
URL and `구글플레이스토어 ->` before the Play URL, each on separate lines.

Never post twice. A `publish_intent` is uncertain until fresh verification,
and an old/unknown receipt is rejected rather than migrated. Completion
requires four distinct, verified Facebook permalinks—one for every language.

The runner invokes the wrapped `OpenProfile` and `OpenNewestPost` actions;
the latter returns the exact current post permalink for `VerifyPost`. A runner
may never navigate an arbitrary Chrome tab: `OpenProfile` first proves the
fixed Facebook profile.

For a single authorized smoke post only, use a suffixed RunId and request one
language explicitly:

```powershell
powershell -NoProfile -STA -ExecutionPolicy Bypass -File .\Invoke-FacebookScheduledPosting.ps1 -TestSinglePost -Language ko -RunId 2026-10-01-1700-smoke-fix
```

It returns `single_verified`, never a four-post completion. `-ValidateOnly`
performs no UI, receipt, publish, or scheduler mutation.

For an interactive four-language draft smoke only, use `-DraftOnly` with a
new suffixed RunId and no `-Language`. It selects each frozen pair, verifies
the exact one-image Friends draft, then calls `CancelOwnDraft`. It returns
`drafts_verified_no_publish`; all entries remain `prepared` with no post
evidence and it never invokes publish, feed navigation, or post verification.

After authorized live verification, inspect or register the one interactive
task with two triggers:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-FacebookPostingSchedule.ps1 -WhatIf
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-FacebookPostingSchedule.ps1
```

The installer creates exactly two current-user interactive KST triggers, uses
`IgnoreNew`, disables catch-up/restarts, verifies readback, and never posts
while installing.

Live evidence: the authorized single Korean smoke run
`2026-10-01-1700-smoke-fix-focus` was verified at 2026-10-01 23:52:37 KST;
its repeat run skipped the already verified receipt without another post. This
is one-post evidence only, not evidence of a four-language scheduled cycle.

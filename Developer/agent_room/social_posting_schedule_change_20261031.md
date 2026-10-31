# Social posting change 2026-10-31 (marketing plan, approved by Terry in the posting session)

## What changed
- Languages: en + ko only. ja/vi paused via `$script:Languages` in `포스팅/Invoke-ZombieSchoolFiveSlotPosting.ps1`. Runner code and config for ja/vi are untouched.
- Frequency: 2 posts per account per day (03:00 and 21:00 KST). The 12:00 and 18:00 tasks are Disabled, not deleted.
- UTM: X links `?utm_source=x&utm_medium=social&utm_campaign=daily_<lang>` (card URL in receipts stays bare); FB links `https://escapezombie.com/?utm_source=fb&utm_medium=social&utm_campaign=daily_<lang>`.
- Not done: link moved to first reply (runner has no reply flow). FB comic rotation keeps Terry's reuse rule.

## Task Scheduler state before the change
| Task | State | Trigger |
|---|---|---|
| EscapeZombieSchool-SocialPostingFiveSlots | Ready | daily 03:00 |
| EscapeZombieSchool-SocialPostingFiveSlots-1200 | Ready -> **Disabled** | daily 12:00 |
| EscapeZombieSchool-SocialPostingFiveSlots-1800 | Ready -> **Disabled** | daily 18:00 |
| EscapeZombieSchool-SocialPostingFiveSlots-2100 | Ready | daily 21:00 |
| EscapeZombieSchool-SocialPostingFiveSlots-RetryDrain | Disabled (unchanged) | |

## Revert
```powershell
Enable-ScheduledTask -TaskName 'EscapeZombieSchool-SocialPostingFiveSlots-1200'
Enable-ScheduledTask -TaskName 'EscapeZombieSchool-SocialPostingFiveSlots-1800'
```
Languages: set `$script:Languages = @('ja','en','vi','ko')` again. UTM: revert the posting commit.

## Known gap
X card pages (`/share/x/<lang>/<hash>`) redirect with `location.replace("https://escapezombie.com/")`, which drops the query string, so X UTM does not reach GA4 until the share page forwards `location.search`. That page ships with the game deploy (owned by session 0f).

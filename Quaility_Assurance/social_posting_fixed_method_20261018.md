# Fixed social posting method — 2026-10-18

User decision: daily Asia/Seoul 03:00, 12:00, 18:00, 21:00. Process X ja/en/vi/ko, then Facebook ja/en/vi/ko. Canceled backlog must never restart. Canonical reusable instructions: `.agents/skills/escape-zombie-school-social-posting/SKILL.md`.

Windows Task Scheduler readback confirmed all four daily tasks enabled and Ready, hidden STA PowerShell actions, and existing action files/working directories. Next execution at validation: 2026-10-18 18:00 KST. RetryDrain and the expired October 10 override tasks are disabled. See `social_posting_fixed_schedule_20261018.json` for task times. No live posts were made during this change.

Cancellation preserved original errors and terminal submission records. No receipt was promoted to verified. Prior user-confirmed posting behavior was retained: guarded native X photo submission and Facebook's scoped Post InvokePattern. The X composer-close and composer-clear paths now return explicit outcomes, preventing a strict-mode null-result error after submission.

Validation performed independently by the main agent:

- `Test-ZombieSchoolFixedSchedule.ps1`: passes; exact slots, current-slot cutoff, X-first serialized execution, no stale replay, cancellation/error preservation.
- `Test-XPublishOutcome.ps1`: passes; sent, duplicate, closed, cleared paths with mocked UI.
- `Test-ZombieSchoolSocialPostingStatusReport.ps1`: passes; canceled login failures remain canceled rather than resolved, without notifications.
- X `-ValidateOnly -CycleId 2026-10-18-1800` using the active receipt directory: `validated_only`, `uiTouched=false`, `published=0`.
- Installed skill `quick_validate.py`: valid.
- Actual status report `-NoNotify`: written, `hasActiveFailure=false`, no notification attempted.

Scheduled execution itself has not yet occurred under the new times. Browser login, network availability, and a logged-in interactive Windows desktop remain runtime prerequisites; these checks do not claim future publication success.

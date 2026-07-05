# Ranking Screen Cleanup

Date: 2026-07-05

## Change

- Changed the bottom ranking screen into an integrated ranking screen with daily and weekly tabs.
- Integrated ranking now reads `fetchGlobalRanking(window)` instead of the legacy daily-only shim.
- Ranking submissions now accumulate scores per user, stage, window, and period with a Firebase transaction.
- Stage ranking now shows only the daily stage board.

# Stage Ranking Screen

Date: 2026-07-05

## Change

- Removed daily and weekly first-place preview cards from lobby stage cards.
- Added `StageRanking` as the screen opened by each stage card's `랭킹 상세히` button.
- `StageRanking` shows the `스테이지 랭킹` hero, daily and weekly first-place summaries, and `일일랭킹` / `주간랭킹` tabs.
- App routing now keeps global ranking and stage ranking separate by passing `stageId`.

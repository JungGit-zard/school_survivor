# Lobby Screen Visual Review - 2026-07-05

## Review

- The lobby uses the existing school UI palette, hard borders, pressed button shadows, compact stage cards, and sticky status header.
- Main entry controls are visible on a 375x667 mobile viewport: Stage 1 entry, user ranking, coin shop, ability, weapon, and settings.
- Stage 2 remains visually locked until the existing unlock condition is met.

## Browser Check

- Checked in headless Chromium at 375x667 through `?e2e=1`.
- Confirmed the title enters the lobby and the first visible stage entry starts the game canvas.

## Follow-up Layout Update

- Combined the previous standalone play-record row into the season panel so the header reads as one grouped status item.

## Bottom Navigator Update

- Moved lobby utility actions to a mobile-game-style bottom navigation bar with four equal buttons.
- Removed the duplicated top quick-action rows so stage cards remain the main middle content.

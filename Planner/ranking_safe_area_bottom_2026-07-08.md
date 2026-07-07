# Ranking Safe Area Bottom

Date: 2026-07-08

## Decision

- Keep the ranking back button above Android/iOS system UI by adding bottom safe-area padding.
- Use CSS `env(safe-area-inset-bottom, 0px)` because this is the standard web safe-area inset path for edge-to-edge mobile layouts.

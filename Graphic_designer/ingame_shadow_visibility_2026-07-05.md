# In-game Shadow Visibility Review

Date: 2026-07-05

## Visual Decision

- Player keeps the existing soft black floor shadow.
- Standard zombies now use a matching soft black oval floor shadow.
- Zombie shadow opacity is set to `0.3` so it is visible without covering the character body.
- Shadow material is depth-tested and does not write depth, matching the earlier fix that prevents shadows from drawing over bodies.

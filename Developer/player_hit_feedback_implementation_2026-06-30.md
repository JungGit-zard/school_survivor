# Player Hit Feedback Implementation - 2026-06-30

## Scope

- Player damage now increments `player.hitFlashToken`.
- `PlayerMesh` detects that token and swaps toon body materials to white for one rendered frame.
- The existing `playerHit` SFX ID is reused; only the audio asset changed.

## Files

- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/src/components/Player.jsx`
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- `Developer/r3f_prototype/public/sfx/player/playerHit.ogg`
- `Developer/r3f_prototype/public/sfx/player/playerHit.mp3`

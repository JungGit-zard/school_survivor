# Matilda gameover popup compact pass — 2026-08-02

## Routing

- Board: `escape-zombie-school`
- Trigger: Game-over result UI size/order change and Matilda-specific death presentation flow
- Specialists involved: `uimini` for popup layout/action order, `levelmini` for game-over/death flow, `balanceqa` for regression coverage
- Accepted involvement trail: this artifact under `Developer/agent_room/` records the specialist routing and verification trail.

## Implementation

- Reduced the game-over modal target width from 440px to 220px while preserving the existing font sizes.
- Removed the "다음에 만날 무기" preview from the game-over popup only.
- Reordered game-over result actions from top to bottom:
  1. `다시시작`
  2. `타이틀로`
  3. `코인상점`
  4. `랭킹`
- Added Matilda death-cause presentation:
  - Matilda contact damage is tagged with `source: 'matilda'`.
  - Store records `deathCause` on HP-zero gameover and clears it on reset.
  - If death cause is Matilda, the existing Matilda dialogue box is reused before the result popup.
  - Dialogue line: `오호호호!!!!! 맛있게 먹을께!!!!`
  - Result popup death line: `마틸다 에게 영혼을 뺴앗겨 버렸다!!`

## Verification

```text
npm test -- src/components/HUD.test.jsx src/store/useGameStore.quests.test.js src/components/StudentDialogueTrigger.test.jsx
3 files passed, 38 tests passed

npm run build
production build passed; branch guard, canonical title surface/BGM, and legacy B02 artifact gates passed
```

## Notes

- Browser click verification was intentionally not used. The requested change was verified through component regression tests and production build.

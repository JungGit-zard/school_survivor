# R3F Prototype Reviewer Check - 2026-04-26

## Check Scope

- Request: `Developer/r3f_prototype` folder review using the reviewer subagent.
- Checked files:
  - `Developer/r3f_prototype/src/components/HUD.jsx`
  - `Developer/r3f_prototype/src/components/Game.jsx`
  - `Developer/r3f_prototype/src/store/useGameStore.js`
  - `Developer/r3f_prototype/package.json`
  - `Developer/r3f_prototype/vite.config.js`
  - `Developer/r3f_prototype/index.html`
- Excluded from direct review:
  - `Developer/r3f_prototype/node_modules/`
  - `Developer/r3f_prototype/dist/` bundle internals

## Findings

### High - Some level-up rewards do not affect combat

- `HUD.jsx` includes `unlockBell`, `bellDamage`, `unlockStun`, and `stunChain` as selectable rewards.
- `useGameStore.js` stores bell and stun gun state changes.
- `Game.jsx` only mounts `PencilThrow` and `SchoolBagAura` weapon components.
- Result: the player can choose bell or stun gun rewards, but no bell or stun gun attack runs in the actual game scene.

Evidence:

- `Developer/r3f_prototype/src/components/HUD.jsx:10`
- `Developer/r3f_prototype/src/components/HUD.jsx:11`
- `Developer/r3f_prototype/src/components/HUD.jsx:12`
- `Developer/r3f_prototype/src/components/HUD.jsx:13`
- `Developer/r3f_prototype/src/store/useGameStore.js:77`
- `Developer/r3f_prototype/src/store/useGameStore.js:78`
- `Developer/r3f_prototype/src/store/useGameStore.js:79`
- `Developer/r3f_prototype/src/store/useGameStore.js:80`
- `Developer/r3f_prototype/src/components/Game.jsx:57`
- `Developer/r3f_prototype/src/components/Game.jsx:58`

Recommended next step:

- Either remove bell and stun gun rewards from the current reward pool until implemented, or add real bell and stun gun weapon components and mount them in `Game.jsx`.

### Medium - Dependent upgrades can appear before unlock

- `pickThree()` filters out only `bag*` upgrades and `pencilCount`.
- `bellDamage` and `stunChain` can appear before `unlockBell` or `unlockStun`.
- Result: the player can select an upgrade that changes hidden state but has no visible or combat effect yet.

Evidence:

- `Developer/r3f_prototype/src/components/HUD.jsx:18`
- `Developer/r3f_prototype/src/components/HUD.jsx:19`
- `Developer/r3f_prototype/src/components/HUD.jsx:20`
- `Developer/r3f_prototype/src/components/HUD.jsx:21`

Recommended next step:

- Filter reward candidates based on current weapon active state. For example, show `bellDamage` only after `weapons.bell.active` is true.

## Verification Status

- `npm run build` completed successfully in `Developer/r3f_prototype`.
- Vite produced a large chunk warning.
- Main built asset reported by the reviewer: `dist/assets/index-8wGD1Ohf.js`, about 3055.56 kB before gzip and 1048.84 kB after gzip.

## Remaining Risk

- Manual browser playtest was not completed.
- Level-up reward behavior still needs direct play validation.
- Large bundle size may affect first load time on mobile devices.

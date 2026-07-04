# Dev Cheat Reveal Command - 2026-07-04

Scope:
- Title cheat menu and in-game development controls are hidden by default.
- Title command sequence `Up, Down, Up, Down, A, S, D` reveals the cheat UI for the current app session.
- The title shows `치트키가 보입니다` when the command succeeds.
- Pause remains always visible during play and pause states.
- In-game quick restart, Matilda spawn, weapon acquisition panel, and development log copy require the revealed cheat UI flag.

Files:
- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/HUD.jsx`

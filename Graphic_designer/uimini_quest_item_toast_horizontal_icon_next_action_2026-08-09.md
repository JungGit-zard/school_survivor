# UI Mini record — quest item toast horizontal icon + next action

- Task: `t_355d2f40`
- Area: quest item pickup toast / HUD overlay
- Change summary:
  - Quest item pickup toast now uses a wide horizontal layout.
  - The left slot renders an item-specific SVG icon derived from `quest.item.visualKind` instead of the generic quest bag icon.
  - The text stack shows the explicit item-received message first, then a green localized next-action hint underneath.
  - Return/install completion targets are localized through `quest.<id>.target` when available, with quest definition names as fallback.
- Verification:
  - `git diff --check -- Developer/r3f_prototype/src/components/HUD.jsx Developer/r3f_prototype/src/lib/locales/ko.js Developer/r3f_prototype/src/lib/locales/en.js Developer/r3f_prototype/src/lib/locales/ja.js` exited 0.
  - `node -e "await import('./src/lib/locales/ko.js'); await import('./src/lib/locales/en.js'); await import('./src/lib/locales/ja.js'); console.log('locale imports ok')"` exited 0.
  - Full tests/build/browser were intentionally not run per task instruction.

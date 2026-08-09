# UIMini quest item popup scale follow-up

## Scope
- Kanban task: `t_5da6f2bb`
- File touched for UI implementation: `Developer/r3f_prototype/src/components/HUD.jsx`
- Popup target: only `questToast.type === 'item'` (`questItemReceived`) item-received toast.

## UI decisions
- Scaled the item toast visual dimensions by 1.3 from the current implementation:
  - max visual width: `420px` -> `546px` with viewport-safe `calc(100vw - 24px)` clamp.
  - min height: `58px` -> `75.4px`.
  - icon frame: `48px` -> `62.4px`.
  - icon SVG: `42px` -> `54.6px`.
  - gap: `10px` -> `13px`.
  - padding: `8/12/8/8px` -> `10.4/15.6/10.4/10.4px`.
  - item text: `13px` inherited size -> `16.9px`.
  - next-action text: `12px` -> `15.6px`.
- Preserved far-left icon, received message, green next-action line, auto-dismiss timer, `role="status"`, and existing aria-live behavior.
- Did not change quest definitions, gameplay, title, Firebase, tests, browser, build, commit, or push.

## Icon clarity
All eight quest `visualKind` item drawings remain in the HUD inline SVG path and were redrawn larger/high-contrast/distinct:
- `red-book`: large tilted red book with spine and page lines.
- `attendance-sheet`: checklist sheet with colored attendance marks.
- `bandage`: horizontal adhesive bandage with central pad and dot texture.
- `key`: oversized yellow key with ring and teeth.
- `whistle`: red whistle with mouthpiece/highlight.
- `fuse`: orange fuse capsule with side leads and spark strokes.
- `list`: blue checklist with large green checkmarks.
- `valve`: red multi-spoke valve wheel with center hub.

## Verification performed
- Mandatory precommand checker completed for profile `uimini`; resolved domains: `common`, `ui`; matched domain: `ui`; evidence keyword: `icon`; receipt SHA: `890b03e5fa3eb20b122bf2990535ba282a3954b001950609d2a03d8b1b30fdcc`.
- Read all emitted required documents plus subagent system wiring and Antigravity/Kanban routing docs before editing.
- Verified `Developer/r3f_prototype/src/lib/quests.js` still has exactly the eight quest `visualKind` values in scope: `red-book`, `attendance-sheet`, `bandage`, `key`, `whistle`, `fuse`, `list`, `valve`; did not modify quest definitions.
- Per task instruction, tests/build/browser were intentionally not run.

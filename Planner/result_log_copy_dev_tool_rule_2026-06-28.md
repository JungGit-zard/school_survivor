# Result Log Copy Dev Tool Rule

Date: 2026-06-28

## Rule

`로그 복사` is a development cheat/playtest tool, not a normal result action.

## Behavior

- Game over and stage clear primary action groups must not include log copy.
- Log copy may appear only in a separate development tool area.
- The development log copy tool follows the admin `cheatMenuButtonVisible` operation setting.
- When cheat UI is hidden, result screens must not show any log copy action.

## Reason

Result screens should guide real player progression and replay choices. Playtest logging is useful for development, but it should not compete with player-facing actions.

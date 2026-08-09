# Stage 2 bulletin board contact-distance investigation gate (2026-08-09)

## Scope
- Kanban: `t_a3df447c`
- Target stage: Stage 2
- Target object type: `corridorLostFoundBoard` / lost-and-found bulletin board
- User requirement: investigation remains unavailable until the player is fully right against the board; preserve the existing investigation result once contact is reached.

## Distance rule
- Stage 2 bulletin board investigation uses the real rotated collider surface, not a loose circular range or empty world-AABB corner.
- Contact threshold is player collider half extent only: `0.136 units` (`0.034 blocks`, because 1 block = 4 units).
- The previous extra 3-dot gap is not allowed for this card: `3 dots = 0.15 units` (`0.0375 blocks`) of additional surface distance is removed from the bulletin-board gate.
- Effective test boundary: player center may be at board surface + `0.136 units` (`0.034 blocks`); at board surface + `0.137 units` (`0.03425 blocks`) the board must remain unavailable.

## Acceptance criteria
1. Only Stage 2 bulletin-board investigation proximity changes; other object contact margin remains `0.25 units` (`0.0625 blocks`).
2. `BULLETIN_BOARD_CONTACT_MARGIN` equals `PLAYER_INVESTIGATION_HALF_EXTENT = 0.136 units` (`0.034 blocks`).
3. The focused board test confirms a rotated board is investigable at exact player-collider contact and not investigable `0.001 units` (`0.00025 blocks`) farther away.
4. The focused board test confirms empty AABB corners do not trigger investigation.
5. A reachable Stage 2 movement-bound contact point still investigates the board, so contact behavior is preserved once fully against it.
6. No sound, UI, Firebase, Graphics Studio, dialogue content, spawn, enemy stat, or unrelated gameplay behavior changes are part of this card.

## QA handoff for Balance_QA_Mini
- Inspect `Developer/r3f_prototype/src/lib/studentProximity.js` and `Developer/r3f_prototype/src/lib/studentProximity.test.js` only for this gate.
- Verify the bulletin board uses rotated collider surface math and `BULLETIN_BOARD_CONTACT_MARGIN = 0.136 units` (`0.034 blocks`).
- Run the focused test: `npm test -- src/lib/studentProximity.test.js -t '게시판 조사는 회전된 게시판에 플레이어 콜라이더가 실제로 닿을 때만 가능하다'`.
- Optional manual QA: in Stage 2, approach the lost-and-found board from its reachable side; the investigation prompt should appear only when the character is fully pressed against the board and should still show the normal board investigation text once contact is reached.
- Note: unrelated dirty files existed before this card; do not evaluate them as part of this scoped acceptance unless Advisor expands the review.

# Stage 2 bulletin board real-contact investigation margin (2026-08-09)

## Scope
- Kanban: `t_b4edb63e`
- Target stage: Stage 2
- Target object type: `corridorLostFoundBoard` / lost-and-found bulletin board
- Priority: stabilize Stage 1/early mobile playable loop and preserve existing Stage 2 playable quest flow without expanding new content.

## Diagnosis
- Previous exact `0.136 units` (`0.034 blocks`) board threshold matched only the player cuboid half extent on a world axis.
- The real Stage 2 board is rotated `45°` (`Math.PI / 4`). The player collider remains world-axis-aligned with half extents `[0.136, 0.32, 0.136]`.
- When a world-axis-aligned square player collider touches a rotated board face, its projection onto the board face normal is `0.136 * (abs(cos 45°) + abs(sin 45°)) = 0.192333044482741 units` (`0.048083261120685 blocks`).
- Therefore exact `0.136 units` (`0.034 blocks`) is below the real physical flush/touching center distance and can remain unreachable during Rapier-separated contact.

## Smallest robust rule
- Keep no-investigation-before-contact by continuing to test the real rotated collider surface, not a circular radius and not empty world-AABB corners.
- For `corridorLostFoundBoard` only, compute contact margin from board yaw:
  - `PLAYER_INVESTIGATION_HALF_EXTENT * (abs(cos(rotationY)) + abs(sin(rotationY)))`
  - Stage 2 default `45°` result: `0.192333044482741 units` (`0.048083261120685 blocks`).
- Add only a floating-point comparison epsilon of `1e-9 units²` in squared-distance comparison. This is `0.000000001 units²`; its linear scale is far below the explicit test gap and should not create a visible pre-contact prompt.

## Acceptance criteria
1. Stage 2 lost-and-found board investigation remains unavailable before contact: a point `0.001 units` (`0.00025 blocks`) farther than the computed physical margin must return `null`.
2. Once the player is physically flush/touching the rotated board face, investigation is available: at `0.192333044482741 units` (`0.048083261120685 blocks`) from the `45°` board face, the board target is returned.
3. Empty AABB-corner positions still do not trigger investigation.
4. The reachable movement-bound contact point on the Stage 2 board still investigates the board.
5. Non-board object contact behavior remains on `OBJECT_CONTACT_MARGIN = 0.25 units` (`0.0625 blocks`).
6. No sound, UI, Firebase, Graphics Studio, dialogue content, spawn, enemy stat, enemy behavior, or unrelated gameplay files are changed for this card.

## QA handoff for Balance_QA_Mini / Advisor
- Review only:
  - `Developer/r3f_prototype/src/lib/studentProximity.js`
  - `Developer/r3f_prototype/src/lib/studentProximity.test.js`
  - `Planner/levelmini_stage2_bulletin_board_real_contact_margin_2026-08-09.md`
- Focused test run:
  - `npm test -- src/lib/studentProximity.test.js -t '게시판 조사는 회전된 게시판에 플레이어 콜라이더가 실제로 닿을 때만 가능하다'`
- Observed result in this run: `1 passed`, `15 skipped`.
- Commit/push must wait until Advisor verification approves this scoped diff.
- Existing unrelated dirty files were present in the project; do not evaluate or modify them for this scoped card.

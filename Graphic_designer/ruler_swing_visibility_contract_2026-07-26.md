# 30cm ruler swing visibility contract — 2026-07-26

The 30cm ruler is an attack visual, not an always-visible equipped prop. It is visible only during the actual swing interval. Waiting for a nearby enemy, cooldown, swing completion, and weapon deactivation must show neither the ruler nor its cyan trail.

When a new swing starts, render the ruler immediately from the player's current position and initial swing rotation. Never reveal the prior swing's frozen world position for a frame. During the swing, retain the current sweep pose; ending or cancelling it hides the runtime outer group and clears trail opacity.

This visibility-only behavior preserves the ruler's existing model scale, toon material, outline, and `StudioTunedGroup itemId="weapon-ruler"` transform. Graphics Studio and Firebase values remain unchanged.

Acceptance: idle active weapon is visually empty; the swing appears once at the correct player-relative pose; finish/cancel leaves no ruler or trail; the next swing never flashes a stale pose.

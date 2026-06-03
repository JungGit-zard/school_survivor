# Compass Blade Respawn After Explosion

## Request

- After the compass blade explodes, it should respawn 5 seconds later.

## Rule

- The compass blade explodes when it reaches the current 5-hit stack threshold.
- Immediately after the explosion, the compass blade enters a 5-second respawn window.
- During that window, the blade visual and hit sensor are removed.
- After 5 seconds, the blade appears again and resumes orbiting.

## Intent

- The explosion should feel like the compass spent its charge.
- The 5-second absence makes the explosion payoff easier to understand and balances the repeated burst.

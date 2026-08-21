# Compass Blade Five-Hit Explosion Rule

## Request

- The compass blade should explode with a pop when it reaches 5 enemy-hit stacks.

## Rule

- Each rotating contact hit adds 1 stack.
- At 5 stacks, the compass blade triggers its explosion immediately.
- After the explosion, the stack resets to 0 so the next cycle starts cleanly.
- Existing explosion damage and radius rules remain unchanged.

## Gameplay Intent

- The weapon should feel more responsive than the previous 10-stack version.
- The player should see the explosion often enough to understand that repeated hits are building toward a payoff.

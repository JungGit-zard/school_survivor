# School Bag Close Activation Check - 2026-04-26

## Scope

- Verified that school bag swing starts only when a zombie is very close to the player.
- The proximity sensor is now treated as an early candidate list only.
- The final activation check uses the zombie rigid body's current X/Z position and compares actual flat distance from the player.

## Result

- `npm run build` passed in `Developer/r3f_prototype`.
- Dead enemies are removed from the school bag activation candidate list by marking enemy rigid bodies as dead and clearing their hit function.
- The school bag trigger range was reduced from `0.82` to `0.58` so the automatic swing feels like a close melee skill.

## Remaining Manual Check

- In the browser, confirm the school bag does not swing while zombies are outside the player's immediate melee range.
- Confirm the swing still triggers when a zombie reaches close contact distance.

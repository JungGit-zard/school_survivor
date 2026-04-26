# Combat Item Flask Visual Notes - 2026-04-26

## Visual Direction

- Player arm swing remains part of the 3D toon character model.
- School bag swing uses a 3D rotating bag plus a separate translucent slash arc.
- The swing weapon is now presented as a 30 cm ruler, with ruler tick marks and a stronger cyan slash trail.
- Lunch pickups use small 3D toon props: meal tray and milk carton.
- The milk pickup is now a glass milk bottle instead of a blue carton.
- Tumbler count upgrades show multiple physical tumblers orbiting at even angles.
- Flask attack now emphasizes an overhead spinning arc before the floor explosion.
- Bell unlock adds a floating gold school bell near the player.
- Bell activation uses a warm gold circular pulse with 8 radial rays.
- The experimental unified outline cleanup was reverted; character and zombie outlines use the previous per-part style again.
- Science flask uses a simple 3D toon flask shape with bright liquid.
- Upgrade cards use compact weapon icons so the player can quickly recognize the upgrade type.

## Follow-up Visual QA

- Check that the flask explosion circle is readable but does not hide enemies.
- Check that lunch items are visible on the classroom floor without looking like debug markers.
- Check that the arm swing reads clearly on the phone viewport.
- Check that the bag slash arc feels like a swing effect and not a debug ring.
- Check that the ruler reads clearly as a blade-like school object during the swing.
- Check that the milk bottle remains the same pickup size as the previous blue box.
- Check that 2 and 3 tumblers are visually separated around the player.
- Check that the flask arc reads as a thrown object rising and falling, not sliding along the floor.
- Check that the bell is visible without covering the player character.
- Check that the bell shockwave reads as a weapon effect rather than a UI marker.
- Check that the reverted per-part outline style matches the previous visual feel.

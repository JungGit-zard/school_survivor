# Stage 4 Central Pressure Cauldron

## Visual contract

Faceted white pressure vessel with a thick lid; yellow top handle; front pressure gauge and red indicator; red side handwheel; dark industrial base; front step/pipe; side controls. No text or branding.

## Rendering contract

The game and Studio preview use the same `PressureCauldron.jsx` tree. Surface materials write depth; only the outline pass does not, preserving an opaque large landmark. The shared visual root applies the exact user-mandated `0.2` base scale, while placement remains centered at `[0, 0, 0]` with scale `1` so Studio/Firebase identity and runtime placement stay canonical.

The close-up redesign keeps a low-wide white decagon, three-step lid, yellow U handle, safety valve, upper-right gauge, locking hardware, asymmetric cabinet/housing, twin front steps, and right-front red handwheel. All primary silhouette surfaces use the existing opaque depth-writing toon material with the existing depthWrite:false inverted-hull outline; no texture or transparent surface was added.

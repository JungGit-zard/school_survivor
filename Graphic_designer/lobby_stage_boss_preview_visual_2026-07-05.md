# Lobby Stage Boss Preview Visual

Date: 2026-07-05

## Visual Change

- The stage card graphics space now shows the actual 3D Stage 1 boss model instead of a simplified placeholder.
- The model keeps the existing toon rendering, outline treatment, and idle motion from the game runtime.
- Stage 2 also uses the Stage 1 boss model for now, matching the current request.
- The preview framing was enlarged so the boss is more prominent inside the card.
- The square `STAGE` badge was removed to give the card header more breathing room.
- The stage title is now the primary top-left visual anchor of the section.
- Graphics Studio now shows the same stage boss preview area used by the lobby card.
- The preview can be reframed with zoom and pan while keeping the same toon boss model.
- The lobby stage card now keeps the boss preview as the main visual area and places the stage information as a text layer over it.
- The overlaid stage information is right-aligned inside the preview area.
- The boss preview area is taller so the 3D model has more vertical room.
- The primary entry CTA now sits inside the preview section.
- The cleared-state badge now anchors to the top-left of the preview section.
- Stage naming now displays as two stacked lines, e.g. `Stage 1` over `교실 생존`.
- The secondary ranking CTA is now a compact button placed below the clear badge inside the preview.
- The card frame now uses thinner beige spacing so the boss preview gets more visible area.
- The background light now drifts freely across the full lobby screen instead of sliding on one axis.

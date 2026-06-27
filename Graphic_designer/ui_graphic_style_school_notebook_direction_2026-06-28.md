# UI Graphic Style Direction - School Survival Notebook

## Summary

The first applied UI direction is "infected school survival notebook UI". The goal is not to copy any reference IP, but to make the game's UI read as part of the same world as the 3D toon school zombie scene.

Core problem addressed:

- The previous UI mixed web-app buttons, mobile casual buttons, and tool-console styling on the same title surface.
- The game identity is school zombie survival, but the UI did not consistently translate that identity into materials, color, or button shape.

## Adopted Style

- Materials: chalkboard, worn paper, emergency stickers, health-room chart labels.
- Button feel: thick cartoon outline, short pressed shadow, large mobile-friendly target.
- Main CTA: sky-blue classroom sticker button.
- Shop/reward: yellow school reward sticker.
- Danger, low HP, boss, destructive actions: red warning label.
- Normal panels: chalkboard or aged paper.

## Visual Rules

- Use 2px black outlines for game-facing panels and buttons.
- Use 4px pressed shadows for primary mobile controls.
- Keep corner radius around 8px unless a circular/label sticker is intentional.
- Keep the character and monster rendering aligned with the existing 3D toon-rendered outline policy from `Bang_survivor_Graphic_concept.md`.
- Do not let UI decoration compete with the 3D character, enemy, or item readability.

## References Used As Principles

- Splatoon graffiti: energetic world-language, not literal graphic copying.
- Brawl Stars UI: thick touch buttons, strong outline, reward/danger color clarity.
- Cult of the Lamb: cute horror balance.
- Persona 5 UI: high-impact hierarchy, but not constant diagonal overstimulation.

## First Application Scope

- Applied to `TitleScreen` first because it controls first impression.
- Applied to `HUD` because it controls play readability.
- Applied lightly to `GoogleAccountPanel` so login state no longer looks like a separate web widget.
- Left `/admin` and `/graphics-studio` restrained; they should share color/button grammar later, but stay practical and readable.

## Expansion Order

1. Level-up and game-over modals.
2. Coin shop and ranking.
3. Admin, with restrained operational styling.
4. Graphics Studio, with UI kept neutral enough that asset color review remains reliable.

## QA Notes

- Mobile title screenshots at 360, 390, and 412px widths show no button overlap.
- Desktop HUD screenshot shows top chips and HP/XP chart readable over active gameplay.
- Admin and Graphics Studio screenshots were checked for style leakage; no disruptive global styling was observed.

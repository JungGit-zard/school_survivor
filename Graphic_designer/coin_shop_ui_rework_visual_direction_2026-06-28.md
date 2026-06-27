# Coin Shop UI Rework Visual Direction

## Summary

The coin shop was redesigned from a plain utility list into a school survival upgrade form. It now follows the same "infected school notebook" UI direction used by the title screen and HUD.

## Applied Style

- Header uses a chalkboard panel.
- Coin count uses an orange/yellow sticker badge.
- Upgrade rows use worn paper cards with thick cartoon outlines.
- Each passive upgrade has a circular school badge: 회수, 속도, 체력, 공격, 학습.
- Each passive upgrade now uses a context SVG image inside the badge:
  - 회수 반경: magnet and pickup dots.
  - 이동속도: running shoe and speed lines.
  - 체력: heart with medical cross.
  - 공격력: sharpened pencil strike.
  - 학습력: open book and star.
- Price is shown as a small reward sticker.
- Purchase buttons use the shared sky-blue CTA style.
- The page is capped at a mobile-friendly width on desktop so cards do not stretch across a wide monitor.

## Readability Rules

- The 360x640 viewport must show all five MVP passive cards and the back button without clipping.
- Price, level, and purchase state must be readable at a glance.
- The page should feel like an in-world school upgrade sheet, not a generic web form.
- UI decoration must not introduce character/monster rendering changes.

## Follow-Up Direction

- Coin shop can later receive small sticker-like state changes for maxed upgrades and insufficient coins.
- If more passives are enabled, the same card language can scroll without changing the top-level visual system.

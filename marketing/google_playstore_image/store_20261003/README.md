# Google Play screenshot candidates — 2026-10-03

- `ko/`, `en/`, and `ja/` contain ten localized 1080×1920 RGB PNG candidates each: eight primary and two alternates.
- Every image uses a full-width, aspect-ratio-preserved actual game capture. Sources are the supplied 2026-08-02 captures (192637, 192421, 192538, 192649) and the Stage 1–4 captures in `Developer/r3f_prototype/Developer/agent_room/stage_screenshots_2026-08-27/`.
- `bottom_character_energy_overlay.png` supplies the bottom-third pink-haired character, purple lightning, and black brush ribbon. The script adds two large localized lines on that ribbon; there is no top promo art, game-frame treatment, or install CTA.
- Rebuild with `python marketing/google_playstore_image/store_20261003/build_store_images.py` (Pillow required). The script does not alter game, Firebase, or Graphics Studio data.

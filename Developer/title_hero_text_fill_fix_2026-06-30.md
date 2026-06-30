# Title Hero Text Fill Fix - 2026-06-30

## Issue

Some testers saw the title hero text as mostly black.

## Fix

- Added explicit `WebkitTextFillColor` to the title hero text.
- Added explicit `WebkitTextFillColor` to the `Escape!` accent span.
- Reduced the black `WebkitTextStroke` from `2px` to `1.25px`.
- Reduced the black drop shadow offset from `4px` to `2px`.

## Files

- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx`

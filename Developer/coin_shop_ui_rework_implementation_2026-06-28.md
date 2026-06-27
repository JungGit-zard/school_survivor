# Coin Shop UI Rework Implementation

## Scope

Changed code:

- `Developer/r3f_prototype/src/components/CoinShop.jsx`
- `Developer/r3f_prototype/src/components/CoinShop.test.jsx`

## Implementation

- Reused the shared UI tokens from `src/lib/uiStyle.js`.
- Reworked the coin shop header into a chalkboard title panel.
- Reworked the coin total into a sticker badge with separate label and numeric value.
- Reworked each passive upgrade into a paper card with:
  - passive category SVG icon image,
  - request number,
  - level label,
  - effect text,
  - level progress dots,
  - price sticker,
  - purchase-state button.
- Added a `maxWidth` cap so the shop stays visually coherent on desktop.
- Added accessible icon labels for each passive icon: 회수 반경, 이동속도, 체력, 공격력, 학습력.

## Behavior

- Purchase logic was not changed.
- Existing passive catalog data remains the source of labels, prices, effect text, and max level.
- The back button still uses the parent-provided label and callback.

## Test Coverage

- Added `CoinShop.test.jsx`.
- Test verifies the redesigned shop surface renders expected labels.
- Test verifies each passive icon image is present through its accessible label.
- Test verifies clicking a purchase button still spends coin and increments `passiveVersion`.

# Social posting image pool

새 게시물에는 이미지 자체에 해당 지역 언어의 `게임시작` 문구가 눈에 보이는 자산만 사용한다. 본문 카피의 문구는 이미지 적격 증거가 아니며, 문구가 확인되지 않은 이미지를 대체 선택(fallback)하지 않는다. 기존 이미지는 이미 게시된 카드와 영수증의 보존용으로 유지한다.

Localized assets are stored separately for each platform under `x/{ko,en,ja,vi}` and `facebook/{ko,en,ja,vi}`. Each locale contains collection-named directories. Facebook files are independent copies so platform-specific replacements can be made without changing X assets.

`image_catalog.json` is the provenance inventory and the exact legacy-path map. Old receipt paths resolve only when listed in `legacyPaths`. X and Facebook resolvers reject the other platform's canonical subtree. `reference/boss_series` contains unclassified shared promotional assets for legacy compatibility; these remain disabled in posting configuration and are not selectable as new localized pairs. `reference/contact_sheets` contains the original contact sheets.

The active X configuration preserves its existing eight localized candidates first, followed by the ten `marketing_social_20261010_add10` images for each locale. Facebook uses the catalog's matching Facebook copy by collection and filename; X and Facebook files remain independently replaceable.

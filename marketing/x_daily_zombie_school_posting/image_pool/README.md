# Social posting image pool

Localized assets are stored separately for each platform under `x/{ko,en,ja,vi}` and `facebook/{ko,en,ja,vi}`. Each locale contains collection-named directories. Facebook files are independent copies so platform-specific replacements can be made without changing X assets.

`image_catalog.json` is the provenance inventory and the exact legacy-path map. Old receipt paths resolve only when listed in `legacyPaths`. X and Facebook resolvers reject the other platform's canonical subtree. `reference/boss_series` contains unclassified shared promotional assets for legacy compatibility; these remain disabled in posting configuration and are not selectable as new localized pairs. `reference/contact_sheets` contains the original contact sheets.

The active posting configuration keeps its existing localized candidate order. Additional source collections are catalogued but are not automatically enabled.

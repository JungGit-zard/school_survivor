# Legacy social image hash provenance

The mappings in `marketing/x_daily_zombie_school_posting/image_pool/image_catalog.json` preserve publication history for retired images whose files are no longer in the active image pool. The hashes below are copied from the matching `files` entries in `Developer/agent_room/integrated_release_20261016/phase4-final-source-manifest.json`; no filename-based image equivalence was inferred.

`source_manifest_sha256`: `DB0CEDF36F6A63F258086BD893099D9318E87A2B08EE8B90E7F9D6DFB8EAC871`

| Legacy image suffix | Source manifest file | SHA-256 |
| --- | --- | --- |
| `x_jp/post_jp_02_supplies_recovery_20261004.png` | `marketing/x_daily_zombie_school_posting/image_pool/x_jp/post_jp_02_supplies_recovery_20261004.png` | `d3cb51a940e7336160c78d2e08e7dcc6049e29283a38ee670c36f0f5e2549370` |
| `x_en/post_eng_02_supplies.png` | `marketing/x_daily_zombie_school_posting/image_pool/x_en/post_eng_02_supplies.png` | `6bae181f8d23b480e3e66b1ec92328e71e0537f9bc4e14db2998b5392adf3b2c` |
| `x_jp/post_jp.png` | `marketing/x_daily_zombie_school_posting/image_pool/x_jp/post_jp.png` | `3fa1824f7f342cc242ea2fc7c771692af1f73fd2bcbfb474f73ec8b094f73c9d` |

The runtime consults these values only when a `publish_intent` or `verified` receipt has no valid stored image hash and its legacy image path cannot resolve to an existing file. Receipt files remain unchanged. The portable rotation test uses synthetic catalog data and does not load the release manifest.

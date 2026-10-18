# Social posting image pool

새 게시물에는 이미지 자체에 해당 지역 언어의 `게임시작` 문구가 눈에 보이는 자산만 사용한다. 본문 카피의 문구는 이미지 적격 증거가 아니며, 문구가 확인되지 않은 이미지를 대체 선택(fallback)하지 않는다. 기존 이미지는 이미 게시된 카드와 영수증의 보존용으로 유지한다.

Localized assets are stored separately for each platform under `x/{ko,en,ja,vi}` and `facebook/{ko,en,ja,vi}`. Each locale contains collection-named directories. Facebook files are independent copies so platform-specific replacements can be made without changing X assets.

`image_catalog.json` is the provenance inventory and the exact legacy-path map. Old receipt paths resolve only when listed in `legacyPaths`. X and Facebook resolvers reject the other platform's canonical subtree. `reference/boss_series` contains unclassified shared promotional assets for legacy compatibility; these remain disabled in posting configuration and are not selectable as new localized pairs. `reference/contact_sheets` contains the original contact sheets.

The active posting pools contain fifteen localized four-panel comics per platform and locale: five `zombie_catch_comic_words_*` images followed by ten `backlog_comic_20261015` images. Older collections remain archived outside those configured posting lists. X and Facebook files remain independently replaceable.

## 2026-10-10 생성 홍보 이미지 위치와 사용 방식

어제 생성한 `marketing_social_20261010_add10` 컬렉션은 플랫폼·언어별로 각각 10장씩, 총 80장이다. 파일 탐색기에 붙여넣을 위치는 아래와 같다.

| 플랫폼 | 언어 | 폴더 |
| --- | --- | --- |
| X | 한국어 | `x\\ko\\marketing_social_20261010_add10` |
| X | 영어 | `x\\en\\marketing_social_20261010_add10` |
| X | 일본어 | `x\\ja\\marketing_social_20261010_add10` |
| X | 베트남어 | `x\\vi\\marketing_social_20261010_add10` |
| Facebook | 한국어 | `facebook\\ko\\marketing_social_20261010_add10` |
| Facebook | 영어 | `facebook\\en\\marketing_social_20261010_add10` |
| Facebook | 일본어 | `facebook\\ja\\marketing_social_20261010_add10` |
| Facebook | 베트남어 | `facebook\\vi\\marketing_social_20261010_add10` |

모든 새 게시물은 `image_catalog.json`에서 해당 플랫폼과 언어가 일치하고 이미지 안의 현지어 게임 시작 문구가 확인된 파일만 후보로 만든다. `PostingVariant.ps1`은 설정된 전체 풀의 순서대로 아직 사용하지 않은 그림을 한 장씩 선택한다. N장이면 N회 동안 각각 한 장씩 사용하며, 게시 시도 이력(`publish_intent`, `verified`)의 SHA-256과 같은 그림은 파일명이 달라도 다시 선택하지 않는다. 전체 소진 시 `IMAGE_POOL_EXHAUSTED`를 기록하고 자동으로 처음으로 돌아가지 않는다. 게시용으로 확정된 이미지 경로와 해시는 영수증에 고정하므로 같은 게시의 재시도 때 다른 이미지로 바뀌지 않는다.

오래된 초안도 게시 직전에 현재 첫 미사용 이미지의 SHA-256과 다시 대조한다. 순서가 바뀌었거나 다른 회차가 먼저 사용했다면 `IMAGE_SEQUENCE_CHANGED`로 차단한다. 게시하지 않은 오래된 초안을 별도 승인된 재개 RunId로 대체할 때는 원래 영수증을 보존하고 새 미사용 이미지를 선택한다.

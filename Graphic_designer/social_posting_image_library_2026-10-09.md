# 소셜 포스팅 이미지 라이브러리 조사 및 규칙

조사일: 2026-10-09
범위: X/Facebook 캠페인 이미지 파일의 위치·수량·언어 분류와 저장 규칙. 이미지 디코드, 해시, 품질 검사는 하지 않았다. 게임 및 Play Store 자산은 범위에서 제외했다.

## 지속 규칙

- 소셜 게시 이미지는 한 저장소 안의 단일 `image_pool`을 정본으로 관리한다. 확정된 플랫폼별 경로와 현재 구현 상태는 아래 통합 구조 절에 기록한다.
- 분류 구조는 플랫폼 다음에 지역 언어를 둔다: X와 Facebook 각각 `ko`(한국어), `en`(영어권), `ja`(일본어), `vi`(베트남어). 각 플랫폼의 이미지 파일은 서로 독립 관리한다.
- 현재 지정된 애니메이션/만화 스타일, 언어별 폰트, 제목, 현지화된 홍보 문구를 보존한다. 언어가 다른 이미지를 다른 지역 폴더로 추정 배치하지 않는다.
- X와 Facebook의 이미지 크기는 다를 수 있고, 사용자가 픽셀 단위 지정 규격을 정하지 않았다. 한 플랫폼 규격을 다른 쪽에 강제하거나, 임의 리사이즈·덮어쓰기하지 않고 파일별 원본 크기를 보존한다.
- 이후 추가되는 이미지는 해당 플랫폼·지역언어 디렉터리에 저장하고 해당 지역의 문구와 기존 스타일을 따른다. 다른 지역 언어의 이미지를 공용 후보로 잘못 공유하지 않는다. 원본 이미지 바이트는 보존하고, 기존 Graphic_designer 이미지의 파일 위치는 확정된 통합 경로로 이동한다. Facebook용 파일은 별도 복사한다. 기존 Graphic_designer 위치에는 안내 및 manifest 자료만 남긴다.
- 장기 기억은 대화 기억에 맡기지 않고 프로젝트 파일에 기록한다. `SESSION_MEMORY.md`는 append-only 정본이며, 이 문서는 이미지 라이브러리 규칙과 조사 세부사항을 보관한다.

## 확정된 통합 구조

기존 정본 root `marketing/x_daily_zombie_school_posting/image_pool`을 유지하고 그 아래 `x/<locale>/<collection>` 및 `facebook/<locale>/<collection>`로 분리한다. Catalog readback은 총 206 entries를 확인했다: X 98개, Facebook 98개, reference 10개. 언어별로 두 플랫폼 각각 ko 31, en 23, ja 22, vi 22다. reference는 `boss_series` 언어 미분류 5개와 contact sheet 5개다. Catalog 검사 결과 missing path 0, duplicate platform path 0, legacy mapping 57이다.

각 플랫폼의 98개는 `marketing_social_30_20261004` 32개, `boss_localized_20261003` 20개, `marketing_social_30_20261004_source` 30개, `marketing_social_add40_20261004` 16개로 구성된다. 실제 tree는 `x/<locale>/<collection>/` 및 `facebook/<locale>/<collection>/`이다. Graphic_designer 원본 바이트를 유지해 X 경로로 이동했고 Facebook 경로에는 별도 복사했다. Source-location readback에서 catalog의 108개 고유 source path에 이미지 파일이 0개 남았고, canonical 206개 항목은 모두 존재했다. 기존 Graphic_designer 위치에는 안내·manifest만 남았다.

X는 기존 32개 active 이미지 후보 설정을 유지한다. Facebook도 기존 variant-selection 설정을 유지하며 98개 전체를 게시 후보로 자동 활성화하지 않는다. 추가 source/archive collection은 보관 후보로 두고 자동 게시 후보로 활성화하지 않는다. X와 Facebook은 파일을 독립 보관하고 사이즈가 달라도 원본 크기와 스타일을 보존한다. 새 크기를 임의로 정하거나 원본을 맞춰 리사이즈하지 않는다. 기존 영수증은 변경하지 않고, 과거 절대 경로는 catalog의 정확한 legacy path mapping으로 읽는다. Graphic_designer 원본 바이트는 X 통합 경로로 이동했고 Facebook 경로에는 별도 복사했다. Source-location 확인에서 원래 위치의 이미지 파일 0개와 안내·manifest만 남은 상태를 확인했다.

향후 제작 템플릿은 기존 스타일을 참고해 ko/en/ja/vi 각 지역의 제목, 헤드라인, 무료·광고 없음 문구를 현지화한다. PNG 안의 글자는 래스터 이미지이므로 이 인벤토리에서 사용 폰트명을 추측하지 않는다. 별도 번들 폰트 자산이 확인된 것으로 간주하지 않는다.

## 조사 시점 저장소 현황

이 절의 위치 수량은 분리 통합 전 조사 기준이다. Facebook runner는 이전에 `FacebookPosting.ps1`에서 X 이미지 루트를 참조했다. 현재 config의 legacy path는 catalog mapping을 거쳐 Facebook 및 X의 별도 platform 경로로 연결된다. 아래 `Graphic_designer` 경로는 이동 전 source 경로 목록이다.

| 위치 | 파일 수 | 언어 구성 | 메모 |
|---|---:|---|---|
| `marketing/x_daily_zombie_school_posting/image_pool/marketing_social_30_20261004` | 32 | ko/en/ja/vi 각 8 | 현재 posting config가 언어별 8개를 설정한다. 각 언어에서 앞의 기존 후보 3개와 추가 5개를 보유한다. X와 Facebook이 공유한다. |
| `marketing/x_daily_zombie_school_posting/image_pool/boss_localized_20261003` | 20 | ko/en/ja/vi 각 5 | 언어별 보스 홍보 이미지. 위의 소셜 20개 추가 세트와 별도 분류한다. |
| `marketing/x_daily_zombie_school_posting/image_pool/boss_series` | 5 | 언어 미분류/공용으로 보이는 파일 5개 | 사용자 확인 없이 지역언어 폴더에 재분류하지 않는다. |
| `Graphic_designer/marketing_social_30_20261004` | 이동 전 30 PNG + contact sheet 5개 | manifest상 ko 8, en 8, ja 7, vi 7 | 이동 전 source 및 reference 위치. manifest에는 PNG 크기가 1448×1086으로 기록되어 있다. 이번 조사는 메타데이터를 재검증하지 않았다. |
| `Graphic_designer/marketing_social_add40_20261004` | 이동 전 16 PNG | ko 10, ja 2, en 2, vi 2 | 이동 전 source 위치, 일부 언어만 있는 별도 배치. |

`marketing_social_30_20261004` 아래 image_pool의 추가 20개(언어별 5개)는 다음과 같다.

- `ja`: `05_classroom_supplies.png`, `06_gym_escape.png`, `07_rooftop_escape.png`, `08_library_escape.png`, `09_rainy_corridor.png`
- `en`: `05_cafeteria_escape.png`, `06_science_lab.png`, `07_school_bus.png`, `08_locker_hall.png`, `09_bell_tower.png`
- `vi`: `05_rainy_courtyard.png`, `06_library_window.png`, `07_basketball_court.png`, `08_classroom_map.png`, `09_school_gate.png`
- `ko`: `05_shoe_locker_hall.png`, `06_seoul_classroom.png`, `07_rooftop_stairs.png`, `08_nurse_office.png`, `09_school_exterior.png`

## 저장·분류 참고

- `marketing/x_daily_zombie_school_posting/posting_config.json`은 `localized_social_image_pool`에 언어별 source 폴더와 8개 이미지 경로를 기록한다.
- `포스팅/README.md`는 현재 image_pool 하위 상대경로 해석, 지정 이미지 파일 보존, 이미지 이름과 언어 하위 폴더명을 바꾸지 않는 규칙을 설명한다.
- `Graphic_designer/marketing_social_30_20261004/manifest.md`와 `manifest.json`은 현재 디자인 source 세트의 파일 목록 및 언어별 manifest 기록이다.
- 포스팅 README의 경로 안내는 기존 schedule 변경과 분리해 갱신한다. Portable handoff의 경로, catalog counts 및 legacy mapping은 실제 readback과 동기화했다.

## 통합 대상 source 파일 경로 목록

아래는 이동 전 파일명 수준 인벤토리다. Source-location readback에서 이 source 이미지들이 기존 경로에 남지 않고, canonical catalog 항목들이 전부 존재함을 확인했다.

### `Graphic_designer/marketing_social_30_20261004`

- `ja`: `01_bell_escape.png`, `02_pencil_survival.png`, `03_locker_dash.png`, `04_b02_teacher.png`, `05_gym_court.png`, `06_classroom_window.png`, `07_stairwell_exit.png`
- `en`: `01_bell_escape.png`, `02_pencil_survival.png`, `03_locker_dash.png`, `04_b02_teacher.png`, `05_gym_court.png`, `06_classroom_window.png`, `07_stairwell_exit.png`, `08_school_gate.png`
- `vi`: `01_bell_escape.png`, `02_pencil_survival.png`, `03_locker_dash.png`, `04_b02_teacher.png`, `05_gym_court.png`, `06_classroom_window.png`, `07_stairwell_exit.png`
- `ko`: `01_bell_escape.png`, `02_pencil_survival.png`, `03_locker_dash.png`, `04_b02_teacher.png`, `05_gym_court.png`, `06_classroom_window.png`, `07_stairwell_exit.png`, `08_school_gate.png`
- Reference sheets: `contact_sheet_ja.png`, `contact_sheet_en.png`, `contact_sheet_vi.png`, `contact_sheet_ko.png`, `contact_sheet_all_30.png`.

### `Graphic_designer/marketing_social_add40_20261004`

- `ja`: `01_library_escape.png`, `02_science_lab.png`
- `en`: `01_library_escape.png`, `02_science_lab.png`
- `vi`: `01_library_escape.png`, `02_science_lab.png`
- `ko`: `01_library_escape.png`, `02_science_lab.png`, `03_cafeteria.png`, `04_school_yard.png`, `05_broadcast_room.png`, `06_nurse_office.png`, `07_school_lobby.png`, `08_art_room.png`, `09_computer_lab.png`, `10_bus_bay.png`

Each filename above identifies the exact parent path and locale subdirectory before migration. The 20 additions listed earlier are the fifth through ninth social assets for each language in `x/<locale>/marketing_social_30_20261004/` and `facebook/<locale>/marketing_social_30_20261004/`; they are separate from the 30-file source collection and 16-file add40 collection.

## 완료 readback 및 오프라인 검증 기록

- Catalog/source readback: canonical 206/206 entries exist; localized assets are X 98 and Facebook 98; reference entries are 10; 108 unique source paths have 0 image files remaining at their old locations. Catalog also reports 0 missing paths, 0 duplicate platform paths, and 57 legacy mappings.
- Implementation worker reports offline tests passed: `Test-XPostingVariants.ps1`, `Test-FacebookDailyZombieSchoolPosting.ps1`, and `Test-XDailyZombieSchoolPostingRecovery.ps1`. `Test-FacebookPostTree` standalone was not run because no historical UI fixture was available. No live-post verification is implied by these offline tests.

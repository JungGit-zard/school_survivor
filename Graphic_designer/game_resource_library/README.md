# 기존 게임 리소스 라이브러리

이 폴더는 저장소에 이미 있던 정적 리소스를 탐색하기 쉽게 복사해 모은 보관본입니다. 파일 바이트와 원래 이름, 원본 하위 폴더 구조를 유지하며 원본 파일은 이동하거나 수정하지 않았습니다.

## 권위와 사용 범위

- 이 보관본은 편의용 사본입니다. 게임이 실제로 읽는 원본 경로와 정본은 각 파일의 `RESOURCE_MANIFEST.csv`에 적힌 저장소 원본입니다.
- `runtime/`은 `Developer/r3f_prototype/src/assets`와 `Developer/r3f_prototype/public` 아래의 정적 파일입니다. 경로에 있다는 사실만으로 런타임에서 실제 사용한다고 단정하지 않으며, 매니페스트의 `usage_status`는 모두 `사용 미확인`입니다.
- `source-art/`과 `references/`는 기존 디자인/참고 이미지입니다. 런타임 사용 또는 승인된 스타일이라는 뜻이 아닙니다.
- `references/style_variants/`에는 기존 홍보 이미지 풀의 8개 변형(en 3, ja 3, vi 2)을 함께 보존했습니다. 서로 다른 방향을 보여 주는 참고 자료이며 선택된 스타일은 없습니다.
- `source-audio/stage-bgm-drafts/`는 개발 중인 BGM 초안입니다. 게임 런타임 자산이 아닙니다.
- 3D 캐릭터·무기·스테이지·효과는 별도의 원화 파일 대신 절차적 코드로 구성된 부분이 있어, 구현을 복제하지 않고 [MODEL_SOURCE_INDEX.md](MODEL_SOURCE_INDEX.md)에 실제 소스 위치만 기록했습니다.
- 현재 게임의 캐릭터 표시와 변형의 정본은 Graphics Studio/Firebase 값입니다. 이 라이브러리는 Firebase 데이터나 표시 상태를 대체하지 않습니다. 이번 정리에서 Firebase를 읽거나 쓰지 않았습니다.

## 현재 포함 수량

- 런타임 정적 파일: 231개 — 이미지/SVG 44, 오디오 183, 폰트 1, 기타 3
- `Graphic_designer/graphic_asset` 시각 자료: 61개. 기존 `game_screenshot/` 캡처는 QA/이력 자료라 리소스 묶음에서 제외했습니다.
- 무대 만화풍 배경 참고: 10개(PNG 5, WebP 5). 런타임 사용은 확인하지 않았습니다.
- 스타일 변형 참고: 8개. 승인·선택되지 않았습니다.
- 무대 BGM 초안: 2개. 런타임에서 사용되지 않습니다.

오디오는 파일 수와 음원 수를 구분해야 합니다. `public/sfx`의 90개 OGG와 같은 이름의 MP3 90개는 90개 효과음의 대체 포맷입니다. 여기에 보조 WAV 2개와 타이틀 BGM M4A 1개가 있어 런타임 오디오 파일은 183개입니다. 외부 절차형 오디오 출처 기록은 [오디오 출처 매니페스트](../../Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json)에서 확인할 수 있습니다. 해당 기록은 타이틀 음악의 권리/출처 검증 완료를 뜻하지 않습니다.

## 파일 찾기

- `RESOURCE_MANIFEST.csv`: 복사한 모든 파일의 분류, 저장소 원본 경로, 라이브러리 경로, 사용 확인 상태
- `runtime/images`, `runtime/audio`, `runtime/fonts`, `runtime/misc`: `src/assets` 또는 `public`의 정적 파일
- `source-art/graphic_asset`: 기존 그래픽 작업물
- `source-art/stage_comic_mobile_backgrounds`: 배경 참고 이미지
- `references/style_variants`: 기존 스타일 후보 이미지
- `source-audio/stage-bgm-drafts`: 기존 BGM 초안
- `tools/copy_existing_resources.py`: 동일 범위의 기존 파일 복사 및 CSV 매니페스트 재작성 도구. 저장소 루트에서 `python Graphic_designer/game_resource_library/tools/copy_existing_resources.py`로 실행하며, 스크립트 위치에서 저장소 루트를 찾아 동작합니다. 새로운 리소스를 만들지 않습니다.

생성형으로 새 원화 시트는 만들지 않았습니다. 스타일 방향 선택도 보류 상태입니다.

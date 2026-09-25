# 모델 및 시각 소스 인덱스

이 인덱스는 절차적 3D 모델과 시각 요소의 실제 구현 경로를 안내합니다. 코드나 Studio 입력값을 보관 폴더로 복제하지 않습니다. 아래 연결은 소스 탐색 경로이며 Firebase/Graphics Studio의 현재 정본이나 런타임 동작 설명을 대체하지 않습니다.

## 주요 캐릭터 19종의 파생 아트 목록

이 19개는 독립된 원화 파일 수가 아니라 게임의 주요 표시 대상을 묶은 목록입니다: 플레이어 1 + 등록 적 종류 16 + Matilda 변형 1 + Doge 이벤트 캐릭터 1. 등록 적 16종은 `enemyEntityPool.js` 코드 레지스트리 기준이며 E09–E18은 별도 기획 문서에만 존재하는 계획 대상이라 이 목록에서 제외합니다.

| 종류 | 코드 / 이름 | 구현 참조 |
| --- | --- | --- |
| 플레이어 | Player | [PlayerMesh.jsx](../../Developer/r3f_prototype/src/components/PlayerMesh.jsx) |
| 일반 적 | E01 초록 좀비, E02 덩치 좀비, E03 달리기 좀비, E04 투척 좀비, E05 돌진 좀비, E06 거대 좀비, E07 웃는얼굴 좀비, E08 코인 몬스터 | [ZombieMesh.jsx](../../Developer/r3f_prototype/src/components/ZombieMesh.jsx), [zombieEncyclopedia.js](../../Developer/r3f_prototype/src/lib/zombieEncyclopedia.js) |
| 특수 적 | RZL 런좀비 리더, RZC 런좀비, RZT 트렌치코트 좀비, RZG 경비 좀비 | [ZombieMesh.jsx](../../Developer/r3f_prototype/src/components/ZombieMesh.jsx), [enemyEntityPool.js](../../Developer/r3f_prototype/src/lib/enemyEntityPool.js) |
| 보스 | B01 수학 선생님 좀비, B02 보스 좀비 B02, B03 보스 좀비 B03, B04 주방장 좀비 | [ZombieMesh.jsx](../../Developer/r3f_prototype/src/components/ZombieMesh.jsx), [bossFaceParts.js](../../Developer/r3f_prototype/src/lib/bossFaceParts.js) |
| 별도 Matilda 표시 변형 | Matilda (B01 타입의 `isMatilda` 변형) | [Enemies.jsx](../../Developer/r3f_prototype/src/components/Enemies.jsx), [Enemy.jsx](../../Developer/r3f_prototype/src/components/Enemy.jsx), [MatildaMesh.jsx](../../Developer/r3f_prototype/src/components/MatildaMesh.jsx) |
| 별도 Doge 이벤트 캐릭터 | Doge | [DogeMesh.jsx](../../Developer/r3f_prototype/src/components/DogeMesh.jsx), [DancingDogeEvent.jsx](../../Developer/r3f_prototype/src/components/DancingDogeEvent.jsx), [Enemies.jsx](../../Developer/r3f_prototype/src/components/Enemies.jsx) |

공용 적 배치/풀/시각 연결은 [Enemies.jsx](../../Developer/r3f_prototype/src/components/Enemies.jsx), [Enemy.jsx](../../Developer/r3f_prototype/src/components/Enemy.jsx), [PooledEnemyVisuals.js](../../Developer/r3f_prototype/src/components/PooledEnemyVisuals.js), [ZombieInstanceLayer.jsx](../../Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx)에서 찾을 수 있습니다.

**E08 확인 메모:** `burstEvents.js`는 E08을 매 스테이지 90초와 180초에 각각 1마리 스폰합니다. 이 동작과 무관하게 파일 주변의 일부 설명 주석은 이전 값일 수 있으므로 주석보다 이벤트 레코드를 기준으로 읽으세요. [burstEvents.js](../../Developer/r3f_prototype/src/lib/burstEvents.js)

## 별도 분류: NPC와 동료

- 학생/NPC: [UnconsciousStudent.jsx](../../Developer/r3f_prototype/src/components/StageObjects/UnconsciousStudent.jsx), [ClassPresidentStudent.jsx](../../Developer/r3f_prototype/src/components/StageObjects/ClassPresidentStudent.jsx)
- 플레이어 동료/무기 캐릭터: [Chibiko.jsx](../../Developer/r3f_prototype/src/components/Weapons/Chibiko.jsx), [Hanako.jsx](../../Developer/r3f_prototype/src/components/Weapons/Hanako.jsx), [Inucon.jsx](../../Developer/r3f_prototype/src/components/Weapons/Inucon.jsx)

NPC와 동료는 위의 19개 주요 표시 대상 집계에 포함되지 않습니다.

## 무기와 동반 시각 효과

절차적 무기 구현은 [Weapons/](../../Developer/r3f_prototype/src/components/Weapons/)에 모여 있고, 등록/표시 정보는 [weaponCatalog.js](../../Developer/r3f_prototype/src/lib/weaponCatalog.js)에서 찾습니다. 이미지 원화가 별도로 있는 항목은 `Graphic_designer/graphic_asset/weapon_graphics/`를 보세요. 그 폴더의 `README.md`는 아이콘 목록과 현재 콘셉트/구현 노트를 안내합니다.

## 스테이지 오브젝트와 배경

- 장면 소품/배치: [StageObjects/](../../Developer/r3f_prototype/src/components/StageObjects/), 특히 [StageObjectLayer.jsx](../../Developer/r3f_prototype/src/components/StageObjects/StageObjectLayer.jsx)와 [stageObjectPlacements.js](../../Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js)
- 층/교실 바닥: [ClassroomFloor.jsx](../../Developer/r3f_prototype/src/components/ClassroomFloor.jsx)
- 이미지 원본/레퍼런스: [Graphic_designer/graphic_asset/background_floor/](../graphic_asset/background_floor/), [Graphic_designer/graphic_asset/tile_assets/](../graphic_asset/tile_assets/)
- 추가 만화풍 배경은 `source-art/stage_comic_mobile_backgrounds/`에 참고용 사본이 있습니다. 게임에서 사용된다는 확인은 없습니다.

## VFX와 UI

- 시각 효과 레이어: [VFXLayer.jsx](../../Developer/r3f_prototype/src/components/VFXLayer.jsx), [vfxEvents.js](../../Developer/r3f_prototype/src/lib/vfxEvents.js), [vfxGeometry.js](../../Developer/r3f_prototype/src/lib/vfxGeometry.js), [vfxPalette.js](../../Developer/r3f_prototype/src/lib/vfxPalette.js), [enemyHitVfx.js](../../Developer/r3f_prototype/src/lib/enemyHitVfx.js)
- HUD/UI 구현: [HUD.jsx](../../Developer/r3f_prototype/src/components/HUD.jsx), [TitleScreen.jsx](../../Developer/r3f_prototype/src/components/TitleScreen.jsx), [GraphicsStudio.jsx](../../Developer/r3f_prototype/src/components/GraphicsStudio.jsx). 이 인덱스는 안내 링크만 두며 해당 파일은 변경하지 않았습니다.
- 기존 UI/타이틀 참조 이미지는 [Graphic_designer/graphic_asset/game_logo/](../graphic_asset/game_logo/), [Graphic_designer/graphic_asset/game_illustration/](../graphic_asset/game_illustration/)에 있습니다.

현재 게임 캐릭터/그래픽의 실제 표현 값은 Firebase Graphics Studio가 정본입니다. 이 목록은 해당 값을 읽거나 저장하지 않았고 어떤 모델 값도 복제하지 않았습니다.

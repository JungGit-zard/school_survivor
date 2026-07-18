# Stage 4 로비 카드 B04 주방장 보스 3D 프리뷰 시각 계약

- 작성일: 2026-07-18
- 프로젝트: Escape! zombie school
- 대상 화면: 로비 스테이지 카드의 보스 프리뷰 영역
- 대상 보스 타입: `B04`
- Graphics Studio item ID: `zombie-b04-chef`
- 목적: 기존 로비 스테이지 카드가 Stage 4 대표 보스인 주방장 좀비를 기존 3D toon preview 경로와 승인된 Graphics Studio 프레이밍으로 보여주도록 시각 계약을 고정한다.

## 1. 결론

Stage 4 로비 카드는 새 모델, 새 transform, 새 프리뷰 컴포넌트를 만들지 않는다.

반드시 기존 `StageBossPreview`를 그대로 재사용하고, 카드에서 전달하는 보스 타입만 Stage 4 대표 보스 타입인 `B04`가 되게 한다. 즉, Stage 4 카드의 보스 프리뷰는 다음 의미를 가져야 한다.

```jsx
<StageBossPreview
  framing={stageBossPreview}
  bossType="B04"
  motionToken={showtimeToken}
  reactOnTap={false}
  ariaLabel="stage4 보스 3D"
  style={styles.cardBossPreview}
/>
```

실제 코드에서는 현재 `Lobby.jsx`의 패턴을 유지해 `lobbyBossType = stage.lobbyBossType ?? stage.bossType`로 계산하게 두고, Stage 4 설정 쪽에서 `lobbyBossType` 또는 `bossType`이 `B04`가 되도록 연결하는 방식이 가장 안전하다.

## 2. 기존 렌더 경로 재사용 계약

현재 로비 카드의 3D 보스 프리뷰 경로는 다음 순서다.

1. `Lobby.jsx`
   - `loadStageBossPreview()`로 승인된 카드 프레이밍을 읽는다.
   - 각 스테이지 카드에서 `lobbyBossType = stage.lobbyBossType ?? stage.bossType`를 계산한다.
   - 열린 카드에서는 `StageBossPreview`에 `framing={stageBossPreview}`와 `bossType={lobbyBossType}`를 전달한다.
2. `StageBossPreview.jsx`
   - `Canvas` + orthographic camera로 3D 프리뷰를 렌더링한다.
   - `ReactiveBoss` 내부에서 `<EnemyVisual type={bossType} ... />`를 호출한다.
   - `bossType="B04"`이면 기존 Enemy/Zombie 렌더 경로를 통해 `B04` 주방장 좀비가 나온다.
3. `graphicsStudioConfig.js`
   - `getStudioZombieItemId('B04')`는 `zombie-b04-chef`를 반환한다.
   - Studio catalog의 B04 라벨은 `Boss B04 · 주방장 좀비`다.

따라서 Stage 4 카드에는 별도 썸네일 이미지, 2D 스프라이트, 임시 도형, 프록시 메시를 넣지 않는다. 보스 캐릭터는 반드시 `EnemyVisual` 경로의 3D toon 모델로 표시한다.

## 3. 승인된 Graphics Studio 프레이밍 상태

로비 카드 프레이밍은 전역 Stage Boss Preview 상태를 그대로 쓴다.

- 저장 키: `escape-zombie-school.stageBossPreview.v1`
- 기본값: `DEFAULT_STAGE_BOSS_PREVIEW`
  - `zoom: 110`
  - `panX: 0`
  - `panY: 0`
- 정규화 범위
  - `zoom`: 50–180 정수
  - `panX`: -2–2
  - `panY`: -0.8–0.5

Stage 4용 별도 카드 transform을 새로 만들지 않는다. B04도 다른 스테이지 보스와 같은 Zoom 의미를 사용한다.

- `FACE_LOCAL_Y.B04 = 0.93`
- 실제 렌더 zoom 계산: `resolveBossPreviewZoom(frame.zoom)`

기본 프레이밍 기준 실제 B04 렌더 zoom은 다른 보스와 동일하게 `110`이다. 별도의 숨은 배율을 두지 않아 Studio의 Zoom/Pan 컨트롤과 카드 결과가 직접 대응한다.

## 4. 카드 안 시각 계층 추천

Stage 4 카드의 정보 우선순위는 다음 순서로 잡는다.

1. B04 주방장 보스 3D 실루엣
   - 흰 셰프 모자, 초록 머리, 흰 조리복, 붉은 목수건, 앞치마, 체크 바지가 카드 첫 인상에서 읽혀야 한다.
   - 프리뷰는 카드 배경 장식이 아니라 Stage 4의 대표 이미지다.
2. Stage 라벨과 제목
   - 현재 `previewTextLayer`처럼 오른쪽 상단 텍스트를 유지하되, 보스 얼굴과 모자 핵심 실루엣을 덮지 않게 한다.
   - 텍스트는 `uiPalette.paperLight` + 검은 text-shadow 방식으로 유지한다.
3. 기록 정보
   - `내 최고기록`은 현재처럼 제목 아래 보조 정보로 둔다.
   - 보스 얼굴·모자보다 먼저 보이면 안 된다.
4. 버튼
   - `입장하기` 버튼은 현재처럼 오른쪽 하단 CTA로 둔다.
   - 보스 하체 일부와 겹칠 수는 있으나 모자·얼굴·목수건은 가리지 않아야 한다.
   - `점수 레코드` 버튼과 `클리어` 배지는 보스의 핵심 얼굴 정보를 침범하지 않게 현재 좌측 배치 기준을 유지한다.

## 5. 쇼타임/모션 계약

Stage 4 카드 클릭 시 1초 쇼타임 구조는 기존 로비 카드 계약을 따른다.

- `motionToken={showtimeToken}`를 그대로 사용한다.
- `reactOnTap={false}`를 유지한다.
- 카드 진입 지연은 현재 `STAGE_SHOWTIME_MS = 1000` 흐름을 따른다.
- B04만을 위한 새 모델 포즈, 새 Studio transform, 새 카메라 transform을 만들지 않는다.

B04 전용 쇼타임 라벨·효과음은 현재 코드에 아직 별도 등록되어 있지 않다. 이 문서의 범위에서는 사운드나 코드 변경을 하지 않는다. 후속 구현 시에는 사운드 정책상 soundmini 검토가 필요하다.

## 6. 금지 사항

- Stage 4 카드 전용 신규 3D 모델을 만들지 않는다.
- Graphics Studio에서 승인된 전체 프레이밍 값을 Stage 4만을 위해 덮어쓰지 않는다.
- `StageBossPreview` 대신 2D 이미지, 캡처 이미지, 스프라이트, 임시 박스 프록시를 쓰지 않는다.
- B04 모델의 파츠 순서, `studioPartId` 정책, 숫자 경로 기반 Studio 연결을 이 카드 작업에서 변경하지 않는다.
- 카드 표시 목적만으로 `ZombieMesh`, `EnemyVisual`, Studio transform 값을 수정하지 않는다.
- 정상 플레이 화면이나 로비 카드에 디버그 원, 위치 보정용 표식, 임시 프록시 도형을 노출하지 않는다.

## 7. 현재 차단/주의 기록

- 현재 `Developer/r3f_prototype/src/lib/stageConfig.js`에는 Stage 4 카드 설정이 아직 없다. 그래서 이 문서는 Stage 4 카드가 추가될 때의 시각 계약을 먼저 고정하는 산출물이다.
- Stage 4가 코드에 추가될 때는 카드 표시 타입이 `B04`가 되도록 연결해야 한다. 권장 방식은 Stage 4 config의 대표 보스 타입을 `B04`로 두는 것이다.
- B04는 이미 Graphics Studio catalog에서 `zombie-b04-chef`로 등록되어 있으므로, 로비 카드 쪽에서 별도 Studio item ID를 직접 다루지 않는다.
- 기존 작업 트리에 여러 미커밋 변경이 있으므로 이 문서는 코드 파일을 수정하지 않고 문서만 추가한다.

## 8. 읽은 근거 파일

- `project_develop_policy.md`
- `AGENTS.md`
- `Bang_Rules.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` 최근 엔트리
- `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`
- `Graphic_designer/stage4_chef_zombie_visual_spec_2026-07-18.md`
- `Developer/stage4_chef_zombie_model_implementation_2026-07-18.md`
- `Developer/r3f_prototype/src/components/Lobby.jsx`
- `Developer/r3f_prototype/src/components/StageBossPreview.jsx`
- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`

## 9. 최종 시각 판정

Stage 4 로비 카드의 정답은 `B04` 주방장 좀비를 기존 `StageBossPreview` 3D toon 경로로 보여주는 것이다. 프레이밍은 승인된 Stage Boss Preview 상태와 공통 Zoom 의미를 재사용하고, B04 고유 차이는 얼굴 중앙 정렬용 `FACE_LOCAL_Y`에만 둔다. 이 작업 범위에서는 모델, Studio transform, 런타임 코드, 사운드를 변경하지 않는다.

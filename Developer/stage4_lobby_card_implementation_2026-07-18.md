# Stage 4 로비 카드 구현 기록

작성: UI_Mini / 2026-07-18
프로젝트: Escape! zombie school
대상: `Developer/r3f_prototype`

## 1. 구현 결론

Stage 4 로비 카드를 안전 게이트 상태로 추가했다.

- 라벨: `Stage 4`
- 제목: `급식실 대탈출`
- 설명: `주방장 좀비가 지키는 급식실에서 240초 동안 버티기`
- 대표 보스 프리뷰 타입: `B04`
- 언락 조건: `stage3Clears >= 1`
- 잠금 힌트: `Stage 3 클리어 시 열림`
- 플레이 가능 여부: `playable: false`

Stage 4는 로비 카드와 B04 3D 프리뷰만 노출한다. 런타임 Stage 4, 웨이브, 진행, 랭킹, 사운드, 쇼타임, 모델/Studio transform은 구현하지 않았다.

## 2. 변경 파일

- `Developer/r3f_prototype/src/lib/stageConfig.js`
  - `STAGE_CONFIGS.stage4` 추가
  - `playable: false` 선언
  - `isStageUnlocked('stage4')`를 `stage3Clears >= 1`로 추가
  - `NEXT_STAGE_BY_STAGE`는 `stage1 -> stage2 -> stage3`만 유지해 `stage3` 다음 진행은 계속 `null`
- `Developer/r3f_prototype/src/components/Lobby.jsx`
  - Stage 4 잠금 힌트 추가
  - `stage.playable !== false` 기반 분기 추가
  - 비플레이 가능 카드에서는 `준비 중` disabled CTA만 표시
  - 비플레이 가능 카드 클릭/CTA 클릭이 `onStartStage`, ranking, showtime, SFX로 이어지지 않도록 유지
  - 열린 Stage 4 카드에서 기존 `StageBossPreview` 경로로 B04 프리뷰 표시
- `Developer/r3f_prototype/src/lib/stageConfig.test.js`
  - Stage 4 config, B04 boss type, `playable:false`, Stage 4 unlock, stage3 next progression null 유지 테스트 추가
- `Developer/r3f_prototype/src/components/Lobby.test.jsx`
  - Stage 4 잠금 힌트, 잠금 시 프리뷰 숨김, Stage 3 clear 후 B04 프리뷰, disabled `준비 중` CTA, ranking 미노출, no start/ranking/SFX/showtime 테스트 추가

## 3. 안전 게이트 확인

- Stage 4 런타임 시스템은 추가하지 않았다.
- Stage 4 ranking 버튼은 제공하지 않았다.
- Stage 4 card click은 `onStartStage`를 호출하지 않는다.
- Stage 4 disabled CTA click은 `onStartStage`를 호출하지 않는다.
- Stage 4는 `BOSS_SHOWTIME`에 새 사운드/라벨을 추가하지 않았고, `playable:false`라 showtime/SFX 경로를 타지 않는다.
- Stage 3의 next-stage progression은 계속 `null`이다.
- 모델, Graphics Studio transform, audio registry, player record schema, runtime stage/wave system은 수정하지 않았다.

## 4. 검증

RED 확인:

```bash
npm exec -- vitest run src/lib/stageConfig.test.js src/components/Lobby.test.jsx
```

결과: 새 Stage 4 기대 테스트 5개가 실패했다. 실패 원인은 Stage 4 config/card/unlock이 아직 없기 때문이었다.

GREEN 확인:

```bash
npm exec -- vitest run src/lib/stageConfig.test.js src/components/Lobby.test.jsx
```

결과:

```text
Test Files  2 passed (2)
Tests  29 passed (29)
```

테스트 실행 중 기존 jsdom/R3F 경고가 출력되었다.

- `WARNING: Multiple instances of Three.js being imported.`
- `Warning: The current testing environment is not configured to support act(...)`

이번 변경으로 새로 발생한 assertion 실패는 없다.

## 5. 비작업 범위

이번 작업에서는 아래를 하지 않았다.

- Stage 4 런타임 구현
- Stage 4 wave/balance/progression 구현
- Stage 4 ranking 제공
- Stage 4 sound/showtime/SFX 추가
- B04 모델/Studio transform 변경
- audio registry 변경
- player records 변경
- commit/push

## 6. 2026-07-18 레이아웃 패리티 정정

사용자 정정에 따라 열린 Stage 4 로비 카드는 Stage 1~3의 실제 카드 구조와 동일하게 맞췄다.

- Stage 4 전용 설명 오버레이는 제거했다. `description` 값은 config 안전 메타데이터로 유지하지만 로비 카드에는 렌더링하지 않는다.
- Stage 4도 다른 열린 카드와 같은 title/best-record 오버레이만 표시한다.
- B04 보스 프리뷰와 `playable: false` 안전 게이트는 유지했다.
- `준비 중` CTA는 기존 `previewEnterButton` 위치/크기 그대로 disabled 상태로 렌더링한다.
- disabled `점수 레코드` 버튼을 기존 `rankingButton` 위치/크기 그대로 렌더링해 카드 구조를 Stage 1~3과 맞췄다.
- Stage 4 카드 클릭, disabled CTA 클릭, disabled `점수 레코드` 클릭은 여전히 start/ranking/showtime/SFX를 발생시키지 않는다.
- 이 정정에서는 모델, Graphics Studio transform, audio, runtime stage/wave system, commit/push를 수정하지 않았다.

검증:

```bash
npm exec -- vitest run src/components/Lobby.test.jsx --testNamePattern "reveals Stage 4"
```

RED 결과: 기존 구현은 Stage 4 설명 문구가 렌더링되어 실패했다.

GREEN 결과: 설명 미렌더링, disabled `준비 중`, disabled `점수 레코드`, 기존 버튼 위치/크기, no start/ranking/SFX/showtime 조건이 통과했다.


# Stage 4 로비 카드 안전 게이트 최종 QA

- 작성: Balance_QA_Mini
- 시각: 2026-07-18 14:29 로컬
- 대상: `Developer/r3f_prototype` Stage 4 로비 카드 안전 게이트
- 결론: PASS
- 범위: 로비 카드/프리뷰/진입 차단/기존 로비 사용성 확인. Stage 4 런타임, 웨이브, 사운드, 모델, Studio transform은 검증 대상이 아니며 수정하지 않음.

## 1. 필수 읽기

읽은 파일:

- `project_develop_policy.md`
- `AGENTS.md`
- `Bang_Rules.md`
- `SESSION_CONTINUITY.md`
- `Planner/stage4_lobby_card_content_spec_2026-07-18.md`
- `Graphic_designer/stage4_lobby_card_visual_spec_2026-07-18.md`
- `Developer/stage4_lobby_card_implementation_2026-07-18.md`
- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/lib/stageConfig.test.js`
- `Developer/r3f_prototype/src/components/Lobby.jsx`
- `Developer/r3f_prototype/src/components/Lobby.test.jsx`
- `Developer/r3f_prototype/src/store/useGameStore.js` 일부: `clearStageAndStartNext()` 경로
- `Developer/r3f_prototype/src/store/useGameStore.unlocks.test.js` 일부: Stage 3 final-stage 회귀 테스트

정책 메모:

- QA 산출물은 `Quaility_Assurance/`에 기록해야 한다.
- 검증하지 않은 기능은 검증 완료로 기록하지 않는다.
- 현 작업은 코드/모델/Studio/audio/runtime 수정, commit, push 금지 범위다.

## 2. 정적 확인

### 2.1 Stage 4 config

`Developer/r3f_prototype/src/lib/stageConfig.js` 확인 결과:

- `STAGE_CONFIGS.stage4` 존재.
- `id: 'stage4'`
- `label: 'Stage 4'`
- `title: '급식실 대탈출'`
- `description: '주방장 좀비가 지키는 급식실에서 240초 동안 버티기'`
- `clearRecordKey: 'stage4Clears'`
- `bestRecordKey: 'stage4BestSurvivalSec'`
- `bossType: 'B04'`
- `playable: false`
- `isStageUnlocked('stage4')`는 `(records.stage3Clears ?? 0) >= 1` 기준.

### 2.2 런타임 Stage 4 도달 차단

`Developer/r3f_prototype/src/lib/stageConfig.js` 확인 결과:

- `NEXT_STAGE_BY_STAGE`는 `stage1: 'stage2'`, `stage2: 'stage3'`만 포함한다.
- `stage3: 'stage4'` 연결은 없다.
- `getNextStageId('stage3')`는 `null`을 반환하는 구조다.

`Developer/r3f_prototype/src/store/useGameStore.js` 확인 결과:

- `clearStageAndStartNext()`는 `getNextStageId(s.currentStageId)`가 없으면 `clearStage()`만 호출하고 `false`를 반환한다.
- 따라서 Stage 3 클리어 후 자동 진행으로 Stage 4 런타임에 진입하지 않는다.

### 2.3 Lobby 안전 게이트

`Developer/r3f_prototype/src/components/Lobby.jsx` 확인 결과:

- `STAGE_UNLOCK_HINT.stage4`는 `Stage 3 클리어 시 열림`.
- 카드별 `lobbyBossType = stage.lobbyBossType ?? stage.bossType`로 계산한다.
- Stage 4는 `bossType: 'B04'`이므로 열린 카드에서 기존 `StageBossPreview`에 `B04`가 전달된다.
- `playable = stage.playable !== false`, `canStart = unlocked && playable`.
- `queueStart()`는 `!canStart`이면 즉시 return하므로 Stage 4에서 showtime, SFX, `onStart`가 발생하지 않는다.
- `playable`이 false인 카드에는 `입장하기`/`점수 레코드` 대신 disabled `준비 중` 버튼만 렌더링된다.

## 3. 테스트 실행

### 3.1 Stage config + Lobby focused tests

명령:

```bash
npm exec -- vitest run src/lib/stageConfig.test.js src/components/Lobby.test.jsx
```

작업 디렉터리:

```text
D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
```

결과:

```text
Test Files  2 passed (2)
Tests       29 passed (29)
Duration    3.14s
```

관찰된 stderr:

- `WARNING: Multiple instances of Three.js being imported.`
- `Warning: The current testing environment is not configured to support act(...)`

판정:

- assertion 실패 없음.
- 위 경고는 구현 기록에도 이미 언급된 기존 jsdom/R3F 테스트 경고로 보이며, 이번 Stage 4 안전 게이트 검증을 막지는 않았다.

주요 통과 항목:

- Stage 4 config가 기존 stage1~3 뒤에 추가됨.
- Stage 4 boss type이 `B04`임.
- Stage 4가 `playable:false`임.
- Stage 4는 Stage 3 clear 전 잠김.
- Stage 3 clear 후 B04 preview가 렌더링됨.
- Stage 3 clear 후에도 `준비 중`은 disabled.
- Stage 4에서 ranking 버튼 미노출.
- Stage 4 카드/disabled CTA 클릭 후 `onStartStage`, `onOpenRanking`, `playSfx`, showtime이 발생하지 않음.
- 모바일 하단 nav 4버튼(`능력치`, `무기`, `랭킹`, `상점`) 유지.

### 3.2 Stage 3 final-stage runtime progression 회귀 테스트

명령:

```bash
npm exec -- vitest run src/store/useGameStore.unlocks.test.js
```

작업 디렉터리:

```text
D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
```

결과:

```text
Test Files  1 passed (1)
Tests       25 passed (25)
Duration    1.26s
```

판정:

- `portal clear on final stage stays on the cleared result` 테스트가 포함되어 있으며, Stage 3 클리어 후 다음 stage로 넘어가지 않는 회귀 조건을 확인했다.
- 별도 실패/경고 없음.

## 4. 스크린샷 확인

검토 파일:

- `Quaility_Assurance/lobby_stage4_card_desktop_2026-07-18.png`
- `Quaility_Assurance/lobby_stage4_card_mobile_2026-07-18.png`

### 4.1 Desktop screenshot

확인 사항:

- Stage 2, Stage 3 기존 카드가 보이고 각각 `입장하기`와 `점수 레코드`가 유지됨.
- Stage 4 카드가 표시됨.
- Stage 4 텍스트: `Stage 4`, `급식실 대탈출`, `내 최고기록: 기록 없음`, 설명 문구가 보임.
- Stage 4 카드 중앙에 B04 주방장 좀비 3D 프리뷰가 보임. 흰 조리모/흰 조리복/붉은 포인트가 식별됨.
- Stage 4 CTA는 회색 disabled 스타일 `준비 중`으로 보임.
- Stage 4 카드에는 `점수 레코드` 버튼이 보이지 않음.
- 하단 메뉴 `능력치`, `무기`, `랭킹`, `상점`이 모두 보임.

시각 리스크:

- Desktop에서 Stage 4 설명 문구가 오른쪽 텍스트 영역에 작게 표시되어 장문 가독성은 제한적이다. 단, 안전 게이트 정보 전달과 CTA 차단 판정에는 영향 없음.

### 4.2 Mobile screenshot

확인 사항:

- Stage 1~3 기존 카드가 세로 스크롤 목록 안에 유지되고 각 카드 `입장하기`가 보임.
- Stage 4 카드가 표시됨.
- Stage 4 카드 중앙 하단에 B04 주방장 좀비 3D 프리뷰가 보임.
- Stage 4 CTA는 회색 disabled 스타일 `준비 중`으로 보임.
- Stage 4 카드에는 `점수 레코드` 버튼이 보이지 않음.
- 모바일 하단 nav `능력치`, `무기`, `랭킹`, `상점`이 화면 하단에 모두 보이며 터치 영역이 유지됨.

시각 리스크:

- Mobile에서 Stage 4 설명 문구가 B04 모델과 일부 겹쳐 보이며 작다. 하지만 Stage/title/disabled CTA는 명확하고, 기존 카드와 bottom nav 사용성은 유지된다.

## 5. 수용 기준별 판정

| 수용 기준 | 판정 | 근거 |
|---|---|---|
| Stage 4 locked before stage3 clear | PASS | `isStageUnlocked('stage4', {}) === false`, Lobby test에서 잠금 힌트와 프리뷰 미노출 확인 |
| after clear B04 preview renders through existing StageBossPreview | PASS | `bossType: 'B04'`, `lobbyBossType = stage.lobbyBossType ?? stage.bossType`, Lobby test `dataset.bossType === 'B04'`, screenshots에서 B04 chef 표시 확인 |
| `준비 중` disabled | PASS | Lobby test에서 `findButtonByText(stage4Card, '준비 중').disabled === true`, screenshots에서 회색 disabled CTA 확인 |
| no start/ranking/showtime/SFX | PASS | Lobby test에서 Stage 4 click/disabled CTA 후 `onStartStage`, `onOpenRanking`, `playSfx`, showtime 미발생 확인 |
| existing cards remain usable | PASS | Lobby tests에서 stage1 시작/ranking/shop, stage boss previews 통과. screenshots에서 Stage 1~3 카드 유지 확인 |
| mobile bottom navigation remains usable | PASS | Lobby test에서 nav labels `['능력치', '무기', '랭킹', '상점']` 확인. mobile screenshot에서도 하단 nav 유지 |
| runtime Stage 4 remains unreachable | PASS | `NEXT_STAGE_BY_STAGE`에 stage3->stage4 없음, `getNextStageId('stage3') === null` 테스트, `useGameStore.unlocks.test.js` 25/25 통과 |

## 6. Blockers

없음.

## 7. Observations / Risks

- 테스트 중 기존 jsdom/R3F 경고가 출력된다. assertion 실패는 아니며 이번 안전 게이트 판정에는 영향 없음.
- Desktop/Mobile 모두 Stage 4 설명 문구는 다소 작다. 특히 mobile에서는 B04 모델과 설명 문구가 일부 겹쳐 보인다. 현재 작업의 핵심인 안전 게이트, B04 대표 프리뷰, disabled CTA, runtime 차단은 통과하므로 blocker는 아니다.
- 이번 검증은 제공된 desktop/mobile 스크린샷과 focused unit/component tests 기반이다. 실제 모바일 기기 터치 실기 QA나 Android WebView/AAB 검증은 수행하지 않았다.

## 8. Git / 변경 보존

작업 전 `git status --short --branch`에서 기존 미커밋 변경과 미추적 파일이 다수 확인되었다. 본 QA는 코드, 모델, Studio, audio, runtime 파일을 수정하지 않았고 commit/push도 하지 않았다.

본 작업에서 새로 생성한 파일:

- `Quaility_Assurance/lobby_stage4_card_validation_2026-07-18.md`

실행 명령:

```bash
git status --short --branch
npm exec -- vitest run src/lib/stageConfig.test.js src/components/Lobby.test.jsx
npm exec -- vitest run src/store/useGameStore.unlocks.test.js
date '+%Y-%m-%d %H:%M:%S %Z'
```

## 9. 최종 판정

Stage 4 로비 카드 안전 게이트는 현재 검증 범위에서 PASS다. Stage 4는 Stage 3 클리어 전 잠기고, Stage 3 클리어 후에는 기존 `StageBossPreview` 경로로 B04 주방장 프리뷰만 노출되며, `준비 중` disabled CTA 때문에 start/ranking/showtime/SFX/runtime 진입 경로가 차단된다. 기존 Stage 1~3 카드와 모바일 bottom navigation도 focused tests 및 제공 스크린샷 기준으로 유지된다.

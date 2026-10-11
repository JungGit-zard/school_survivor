# 탈출 성공 선택 화면 + 끊김 없는 누적 랭킹 점수 기획

작성일: 2026-10-11
담당: Level_Mini
범위: 기획/요구사항 합성 전용. 코드·테스트·런타임 기록은 변경하지 않는다.

## 0. 라우팅 메모

- 이 작업은 실제 등록된 `levelmini` 프로필의 스테이지 진행/세션/보상 플래너 역할로 처리한다.
- Advisor가 확인한 별도 `-subagent_lounge` 자료(`roles/pack_bunsuck/SYSTEM_PROMPT.md`, `gi_bipyeong` 등)는 읽기 전용 참고였고 Hermes에 등록된 실행 프로필이 아니므로 설치/가져오기/상태 복사는 하지 않는다.

## 1. 사용자가 이번에 확정한 요구사항

1. 탈출구에 들어가면 현재처럼 밝은 페이드 후 자동으로 다음 스테이지를 바로 시작하지 않는다.
2. 대신 기존 프로젝트의 포스팅/프로모션 이미지를 보여주고, 큰 문구로 `탈출 성공`을 표시한다.
3. 성공 화면에서 플레이어가 직접 선택한다.
   - 로비/휴식/종료 쪽으로 빠지기
   - 다음 스테이지로 계속하기
   - 다른 스테이지 선택하기
4. 다음 스테이지로 직접 이어 갈 때의 보상은 추가 아이템/골드/배율이 아니라 `점수 연속성`이다.
5. 한 번 끊기지 않고 이어서 플레이한 총 누적 점수가 랭킹 기록이 된다. 스테이지별로 끊긴 점수를 따로 기록하는 흐름이 아니다.
6. 로비로 나가면 그 연속 런은 종료되고, 다음 시작은 새 점수 시퀀스로 보는 것이 자연스럽다. 단, 이는 사용자 발화의 “휴식/그만두기” 의도에서 해석한 최소안이므로 아래 미결정 항목에 명시한다.

## 2. 현재 코드 근거

### 2.1 현재 탈출/클리어 흐름

- `Developer/r3f_prototype/src/components/Game.jsx:94-98`
  - 스테이지 설정 시간에 자동 클리어가 아니라 `escapePortalActive`를 켠다.
- `Developer/r3f_prototype/src/components/EscapePortal.jsx:49-50`, `120-123`
  - 포탈 컴포넌트가 `clearStageAndStartNext`를 구독한다.
  - 흡입 완료 시 `escapePortalClear` 사운드 후 즉시 `clearStageAndStartNext()`를 호출한다.
- `Developer/r3f_prototype/src/store/useGameStore.js:1276-1287`
  - 다음 스테이지가 있으면 `_onRunEnd('cleared')` 후 바로 `resetGame(nextStageId, { preserveQuestJourney: true })`를 호출한다.
  - 따라서 사용자가 성공 화면에서 선택할 시간이 없다.
- `Developer/r3f_prototype/src/store/useGameStore.js:1270-1274`
  - `clearStage()`는 `phase: 'cleared'`를 만들고 `_onRunEnd('cleared')`를 호출한다. 선택형 성공 화면은 이 계열로 이동하는 것이 기존 HUD와 가장 맞다.

### 2.2 현재 클리어 결과 화면

- `Developer/r3f_prototype/src/components/HUD.jsx:1812-1868`
  - 이미 `phase === 'cleared'` 결과 모달이 있다.
  - 현재 문구는 `STAGE CLEAR!` 중심이고, 클리어 시간/보스 보너스/골드/미션/해금/다음 스테이지/랭킹/타이틀/상점/재시작 버튼을 보여준다.
  - 요구사항 반영 시 이 영역을 “포스팅 이미지 + 탈출 성공 + 선택 버튼”으로 개편하는 것이 최소 변경이다.
- `Developer/r3f_prototype/src/components/HUD.jsx:1855-1858`
  - 다음 스테이지 버튼은 현재 `resetGame(nextStageId)`라서 누적 런을 보존하지 않는다.
- `Developer/r3f_prototype/src/components/ReadyGameApp.jsx:86-95`
  - 로비에서 스테이지를 시작할 때도 `resetGame(stageId)`를 호출한다. 즉 “로비 출발 = 새 시퀀스” 정책과 잘 맞는다.
- `Developer/r3f_prototype/src/components/Lobby.jsx:277-297`, `330-340`
  - 현재 다른 스테이지 선택은 로비 카드의 잠금/플레이 가능 규칙(`isStageUnlocked`, `stage.playable`)을 따른다. 성공 화면 안에서 “다른 스테이지”를 제공하더라도 이 잠금 규칙을 재사용해야 하며, 임의 해금은 만들지 않는다.

### 2.3 현재 점수/랭킹 흐름

- `Developer/r3f_prototype/src/lib/rankingScorePolicy.js:24-40`
  - 현재 점수는 `생존 초 + 스테이지 보너스 + 클리어 보너스 + 보스 보너스` 구조다.
- `Developer/r3f_prototype/src/store/useGameStore.js:84-108`
  - `buildRankingRunSnapshot`은 현재 단일 스테이지의 `currentStageId`, `elapsedMs`, `cleared` 기준으로 점수를 만든다.
- `Developer/r3f_prototype/src/store/useGameStore.js:698-710`, `714-719`
  - 런 종료 시 `submitRunToRanking(user, run)`이 비동기로 제출된다. 실패/스킵/로그아웃 사유는 `rankingSubmission`에 남긴다.
- `Developer/r3f_prototype/src/store/useGameStore.js:724-743`
  - 플레이 중 체크포인트도 같은 단일 스테이지 런 점수로 제출한다.
- `Developer/r3f_prototype/src/components/UserRanking.jsx:31-32`, `91-104`, `131-158`
  - 글로벌 랭킹 화면은 제출 상태 배너를 읽고 실패/로그아웃/시즌 종료 등을 표시한다.
- `Developer/r3f_prototype/src/components/StageRanking.jsx:25-90`
  - 스테이지별 보드는 stageId 버킷을 기준으로 보여준다. 누적 연속 런을 넣을 경우 “마지막 도달 스테이지 버킷에 누적 총점이 보이는 것”이 사용자 기대와 맞는지 별도 결정이 필요하다.

### 2.4 진행/무기/골드가 현재 이어지는 것과 끊기는 것

- `resetGame(nextStageId)`는 `player`, `weapons`, `elapsedMs`, `goldSession`, `runKills`, `bossDefeated`, `bossBonus`, `rankingCheckpoint` 등을 초기화한다(`useGameStore.js:1290-1345`).
- 영구 패시브/계정 해금은 Firebase 진행도에서 다시 로드되지만, 한 런 안의 무기 성장/보유 무기는 새 스테이지 시작 시 현재 구조상 초기화된다.
- 이번 요구는 “점수 연속성”만 확정했으므로 무기/HP/레벨/goldSession까지 이어가는 기능으로 확대하지 않는다. 단, 성공 화면에서 “다음 스테이지로 계속”을 눌러도 점수 누적 상태는 보존해야 한다.

## 3. 추천 성공 화면 플로우

1. 포탈 흡입 완료
2. 자동 `clearStageAndStartNext()` 대신 `clearStage()` 또는 신규 `escapeSuccess()`로 `phase: 'cleared'` 진입
3. HUD 클리어 모달 표시
   - 배경/히어로 이미지: 아래 4장 중 하나가 아니라, 이번 계획에서는 1개만 추천한다.
   - 추천 이미지: `Graphic_designer/쇼츠프로젝트_20261010/references/05_school_exit_finale.png`
   - 타이틀: `탈출 성공`
   - 보조 문구: `계속하면 지금 점수가 다음 스테이지까지 누적됩니다.`
   - 표시 점수: 현재 스테이지 클리어로 확정된 점수와 누적 총점
4. 버튼
   - `다음 스테이지 계속` : 잠금 해제된 직후 다음 스테이지로 진입. 이때 누적 점수 상태 유지.
   - `다른 스테이지 선택` : 로비/스테이지 선택 화면으로 이동. 이 선택은 연속 런 종료로 처리하는 최소안.
   - `로비에서 쉬기` 또는 `그만하기` : 연속 런 종료.
   - `랭킹 보기` : 현재 제출 상태 확인. 단, 누적 점수 도입 후에는 랭킹 화면이 총점 제출 상태를 보여야 한다.

## 4. 누적 점수 규칙

### 확정 규칙

- 연속 런의 랭킹 점수 = 이어서 플레이한 각 스테이지 결과 점수의 누적 합계.
- 다음 스테이지로 직접 이어 갈 때만 누적 유지.
- 로비/타이틀/스테이지 선택으로 나가면 그 연속 런은 종료한다는 최소안을 채택한다.
- 점수는 생존 시간/골드와 다르다. 기존 골드 보상이나 계정 진행도와 섞지 않는다.

### 최소 상태 모델 제안

`useGameStore`에 아래 개념을 추가한다.

- `continuousRunId`: 연속 런 식별자. 새 로비 시작 시 갱신.
- `continuousScoreBase`: 이전 스테이지까지 확정된 누적 점수.
- `continuousStageResults`: 디버그/QA용 배열. 예: `{ stageId, score, timeMs, cleared }`.
- `continuousRunActive`: 로비/타이틀로 나가기 전까지 true.

계산 방식:

- 현재 스테이지 진행 중 표시 총점 = `continuousScoreBase + currentStageLiveScore`
- 클리어 직후 확정 총점 = `continuousScoreBase + currentStageClearScore`
- `다음 스테이지 계속`을 누르면 `continuousScoreBase`를 확정 총점으로 올린 뒤 `resetGame(nextStageId, { preserveContinuousScore: true })`
- 새 로비 시작/재시작/다른 스테이지 선택은 `continuousScoreBase = 0`으로 새 시퀀스 시작

## 5. 구현 터치포인트

1. `EscapePortal.jsx`
   - `clearStageAndStartNext` 직접 호출을 중단하고 성공 화면 진입 액션을 호출한다.
   - 현재 위치: `components/EscapePortal.jsx:120-123`.
2. `useGameStore.js`
   - `clearStageAndStartNext`는 자동 즉시 진행용 이름/역할이므로 폐기하거나 “사용자 선택 후 계속” 액션으로 바꾼다.
   - `resetGame`에 `preserveContinuousScore` 옵션을 추가한다.
   - `buildRankingRunSnapshot` 또는 별도 `buildContinuousRankingSnapshot`에서 `score`를 누적 총점으로 만든다.
   - 단일 스테이지 체크포인트와 최종 누적 랭킹 제출이 중복/역전되지 않도록 status와 제출 타이밍을 분리한다.
3. `HUD.jsx`
   - `phase === 'cleared'` 모달을 `탈출 성공` 이미지 화면으로 개편한다.
   - `nextStage` 버튼은 `resetGame(nextStageId)` 대신 “누적 점수 확정 후 다음 스테이지 시작” 액션을 호출한다.
   - 현재 위치: `components/HUD.jsx:1812-1868`.
4. `ReadyGameApp.jsx`
   - 로비에서 `startGame(stageId)`는 새 연속 런 시작으로 유지한다(`ReadyGameApp.jsx:86-95`).
   - 성공 화면의 `다른 스테이지 선택`이 필요하면 로비로 보내고, 로비 카드 규칙을 재사용한다.
5. `firebaseRanking.js`
   - 기존 엔트리 구조는 `stageId`, `score`, `timeMs`, `cleared`만 저장한다(`firebaseRanking.js:91-112`).
   - 누적 총점 제출을 위해 `stageId`를 “마지막 도달 스테이지”로 둘지, `global` 전용 의미로 둘지 결정해야 한다. DB 규칙/버킷과 함께 확인 필요.

## 6. 중복 제출/저장 리스크

- 현재 `_onRunEnd('cleared')`가 클리어 시 즉시 최종 제출한다. 누적 런에서는 매 스테이지 클리어마다 “최종 랭킹”처럼 제출하면 중간 점수가 보드에 먼저 올라간다.
- 플레이 중 체크포인트는 강제 종료 유실 방지에 유용하지만, 현재 단일 스테이지 점수 기준이다. 누적 도입 후에는 체크포인트도 `continuousScoreBase + liveScore`여야 한다.
- 게스트/로그아웃 상태는 현재 `signedOut` 또는 progress unavailable 안내가 가능하다. 누적 점수도 같은 안내를 유지하되, Firebase 진행도 비동기 실패를 “점수 리셋”으로 보이게 하면 안 된다.

## 7. 미결정 항목

1. 사망 시 랭킹 기록: 마지막 누적 총점 + 죽은 스테이지의 미클리어 live score를 제출할지, 마지막 클리어 확정점까지만 제출할지 결정 필요.
   - 최소 제안: 사망 시점의 `continuousScoreBase + currentStageLiveScore` 제출.
2. 최종 스테이지(stage4) 클리어 후: 다음 스테이지 없음. `탈출 성공` 화면에서 로비/랭킹/재도전만 보여줄지, “연속 런 완료” 문구를 따로 둘지 결정 필요.
   - 최소 제안: 다음 스테이지 버튼 숨김, 총 누적 점수와 랭킹 보기 강조.
3. 성공 화면에서 “다른 스테이지”를 누르면 연속 런 종료가 맞는지 최종 확인 필요.
   - 최소 제안: 종료로 처리. 이유는 사용자가 “계속 다음 스테이지” 보상으로 점수 연속성을 정의했기 때문.
4. 스테이지별 랭킹 버킷에 누적 총점을 넣을지 여부.
   - 최소 제안: 글로벌 랭킹은 누적 총점, 스테이지별 랭킹은 별도 정책 확인 전까지 기존 단일 스테이지 의미를 유지.

## 8. 최소 QA 인수 기준

- Stage 1 포탈 진입 후 자동으로 Stage 2가 시작되지 않고 성공 화면이 뜬다.
- 성공 화면에 기존 이미지 `Graphic_designer/쇼츠프로젝트_20261010/references/05_school_exit_finale.png`와 `탈출 성공` 문구가 보인다.
- `다음 스테이지 계속`을 누르면 Stage 2가 시작되고 총점이 Stage 1 클리어 점수에서 이어진다.
- 로비로 나갔다가 Stage 1을 다시 시작하면 총점은 0 기반 새 시퀀스다.
- 랭킹에 제출되는 score는 화면에 보이는 누적 총점과 같다.
- 로그아웃/랭킹 미설정/네트워크 실패는 기존처럼 사용자에게 표시된다.
- 기존 Stage 1 모바일 플레이 루프를 우선 안정화한다. 새 재화, 새 해금, 새 생성 이미지, Stage2 boss V2 legacy gate는 추가하지 않는다.

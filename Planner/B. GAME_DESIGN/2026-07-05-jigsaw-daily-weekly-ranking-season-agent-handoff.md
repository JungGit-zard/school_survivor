# Jigsaw Daily/Weekly Ranking Season Handoff

<!-- last_verified: 2026-07-05 -->
<!-- source_repos:
frontend: D:/Jung_work/01_Projects/text-battle-src @ feature/jigsaw-live-matched-local
backend: D:/Jung_work/01_Projects/textbattle_backend_J_jigsaw_followup @ feature/jigsaw-followup-puzzle-work af5abe5a
admin: D:/Jung_work/01_Projects/textbattle_admin_J @ feature/jigsaw-admin-followup-event-delete fa08895
-->
<!-- source_files:
backend: service/textbattle/model/puzzle_event.go, service/textbattle/model/puzzle_score.go, service/textbattle/api/h_v1_jigsaw_puzzle.go, service/textbattle/api/h_v1_jigsaw_attempt.go, service/textbattle/admin/h_puzzle_admin.go, service/textbattle/admin/puzzle_settle.go
admin: components/page/jigsaw-puzzle-admin/interface.ts, components/page/jigsaw-puzzle-admin/api.ts, components/page/jigsaw-puzzle-admin/rewards-tab.tsx, components/page/jigsaw-puzzle-admin/client.tsx
frontend: app/jigsaw-puzzle/_dev/components/jigsaw-game.tsx, app/jigsaw-puzzle/_dev/components/combined-ranking.tsx, app/jigsaw-puzzle/_dev/components/reward-modal.tsx, app/jigsaw-puzzle/_dev/lib/jigsaw-data.ts
-->

## 목적

직소퍼즐은 현재 하나의 운영 이벤트 안에서 일일랭킹과 주간랭킹을 동시에 운영한다. 다른 미니게임에 같은 체계를 붙일 때는 "게임별 점수 산정"만 바꾸고, 시즌 활성화, 일자/주차 윈도우, 보상 슬롯, 정산 기록, 어드민 조작, 게임프론트 표시 규칙은 동일하게 가져가는 것이 목표다.

이 문서는 다른 미니게임 구현 에이전트가 직소 구현을 기준으로 바로 작업할 수 있도록 작성한 agent-ready 핸드오프다.

## 핵심 결론

- 공통화할 것은 `시즌 이벤트`, `일일/주간 랭킹 윈도우`, `보상 슬롯`, `payout_record`, `자동/수동 정산`, `어드민 시즌 조작`, `게임프론트 seasonOff 처리`다.
- 게임별로 달라져야 하는 것은 `플레이 결과 저장 스키마`, `하루 점수 계산 함수`, `스테이지/난이도 가중치`, `시도권/코인 같은 게임 전용 제한`이다.
- 직소의 일일 랭킹은 KST 오늘 00:00부터 현재까지, 주간 랭킹은 KST 월요일 00:00부터 현재까지 누적된다.
- 직소의 자동 정산은 일일 보상은 다음날 09:00 KST, 주간 반복 시즌 보상은 다음 주 월요일 09:00 KST에 payout record를 만들고 우편을 발송한다.
- `seasonActive`는 프론트가 임의로 event time만 보고 판단하면 안 된다. 백엔드 `SeasonInProgress(now)` 결과를 API 응답으로 받아 사용해야 한다.

## 현재 직소 구현 위치

### 백엔드

- 모델: `service/textbattle/model/puzzle_event.go`
- 점수/결과: `service/textbattle/model/puzzle_score.go`
- 게임 API: `service/textbattle/api/h_v1_jigsaw_puzzle.go`
- 도전 횟수 API: `service/textbattle/api/h_v1_jigsaw_attempt.go`
- 어드민 API: `service/textbattle/admin/h_puzzle_admin.go`
- 자동 정산: `service/textbattle/admin/puzzle_settle.go`

### 어드민 프론트

- 타입/기본값: `components/page/jigsaw-puzzle-admin/interface.ts`
- API 어댑터: `components/page/jigsaw-puzzle-admin/api.ts`
- 보상/정산 탭: `components/page/jigsaw-puzzle-admin/rewards-tab.tsx`
- 시즌 생성/저장/시작 UI: `components/page/jigsaw-puzzle-admin/client.tsx`

### 게임프론트

- 게임 진입/시즌/결과 제출: `app/jigsaw-puzzle/_dev/components/jigsaw-game.tsx`
- 랭킹 페이지: `app/jigsaw-puzzle/_dev/components/combined-ranking.tsx`
- 보상 안내: `app/jigsaw-puzzle/_dev/components/reward-modal.tsx`
- 프론트 점수 표시용 계산: `app/jigsaw-puzzle/_dev/lib/jigsaw-data.ts`

## 데이터 모델

### 시즌 이벤트

직소 기준 이벤트는 `PuzzleEvent`다. 다른 게임은 `GameEvent` 또는 `MiniGameRankingEvent` 형태로 일반화하면 된다.

필수 필드:

- `eventId`
- `title`
- `startAt`, `endAt`
- `dailyTryLimit` 또는 게임별 플레이 제한
- `rankingEnabled`
- `rewards.daily`
- `rewards.weekly`
- `payout.daily`
- `payout.weekly`
- `season`
- `version`
- `status`

직소 `PuzzleSeason`의 필수 공통 필드:

- `seasonId`
- `enabled`
- `title`
- `startAt`, `endAt`
- `rewards`
- `payout`
- `mode`: `fixed` 또는 `weekly`
- `weeklyRecurring`
- `recurringStartAt`
- `lastDailySettled`
- `lastSeasonRound`
- `eventRankingEnabled`

중요한 규칙:

- 주간 반복 시즌은 `weeklyRecurring=true`이고 `recurringStartAt` 이후면 명시 종료 전까지 live로 본다.
- `SeasonInProgress(now)`는 `season != nil`, `season.enabled == true`, `ComputeStatus(now) != ended`일 때 true다.
- `version`은 어드민 저장 충돌 방지에 사용한다.

### 보상

직소는 `PuzzleRewardEntry`를 사용한다.

필드:

- `rank`: 단일 등수
- `rankFrom`, `rankTo`: 범위 등수
- `rewardId`
- `count`

직소 보상 슬롯:

- 일일: `1`, `2`, `3`, `4-10`, `participation`
- 주간: `1`, `2`, `3`, `4-10`, `completion`
- 별도 시즌/이벤트 랭킹: `1`, `2-3`, `4-10`, `participation`

다른 게임도 운영 UI는 이 슬롯 구조를 유지하고, rankless 슬롯 의미만 게임에 맞게 정한다.

### 지급 기록

직소는 `PuzzlePayoutRecord`에 정산 결과를 남긴다.

공통화 필드:

- `recordId`
- `eventId`
- `kind`: `daily`, `weekly`, `season`, `event`, `participation`, `completion`
- `targetDate`: 일일 정산 대상 KST 날짜
- `weekStart`, `weekEnd`: 주간 윈도우
- `round`: 주간/시즌 회차
- `scoreWindowStart`, `scoreWindowEnd`
- `rank`, `score`
- `userId`, `nick`
- `rewardId`, `count`
- `mailAt`, `mailId`
- `status`: `pending`, `sent`, `failed`, `skipped`
- `source`
- `errorMessage`

멱등성 규칙:

- 일일 정산은 `eventId + kind + userId + rewardId + targetDate`로 중복 지급을 막는다.
- 주간/시즌 정산은 `eventId + kind + userId + rewardId + round`로 중복 지급을 막는다.

## 랭킹 산정

### 공통 윈도우

게임별 점수 계산은 달라도 윈도우는 공유한다.

- `daily`: KST 오늘 00:00:00부터 현재까지
- `weekly`: KST 이번 주 월요일 00:00:00부터 현재까지
- `season` 또는 `total`: 시즌/이벤트 시작부터 현재까지
- 자동 일일 정산: 어제 KST 00:00:00부터 23:59:59까지
- 자동 주간 정산: 직전 주 월요일 00:00:00부터 일요일 23:59:59까지

직소에서는 `jigsawRankRange(event, kind, now)`와 `loadJigsawCumulative(...)`가 이 책임을 갖는다.

### 직소 점수 어댑터

직소의 게임 전용 점수 방식:

- `PuzzlePlayResult`에 stage, grid, parCs, elapsedCs, cleared, settledAt 등을 저장한다.
- 하루 안에서 stage별 유저 최고 기록을 고른다.
- stage별 clear time 순위를 매긴다.
- rank 1~100만 점수를 받는다.
- 점수 공식은 `ComputePuzzlePoints`와 프론트 `stagePoints`가 맞춰져 있다.
- daily는 하루치 stage 점수 합산이다.
- weekly/season은 KST 날짜별 daily 점수를 다시 합산한다.

다른 미니게임에 붙일 때 필요한 추상화:

```ts
type RankingKind = 'daily' | 'weekly' | 'season';

interface MiniGameResult {
  eventId: string;
  userId: string;
  nick: string;
  settledAt: string;
  cleared?: boolean;
  scoreMetric: number;
  source: string;
}

interface DailyScoreRow {
  userId: string;
  nick: string;
  score: number;
  clearTimeCs?: number;
  playCount?: number;
  firstSettledAt?: string;
}

interface MiniGameRankingAdapter {
  loadResults(eventId: string, startISO: string, endISO: string): Promise<MiniGameResult[]>;
  computeDailyScores(results: MiniGameResult[]): Map<string, DailyScoreRow>;
  sortRows(rows: DailyScoreRow[]): DailyScoreRow[];
}
```

정렬 tie-breaker도 게임마다 명시해야 한다. 직소는 점수 내림차순, clearTimeCs 오름차순, firstSettledAt 오름차순, userId 오름차순이다.

## 게임 API 계약

직소 현재 API와 일반화 권장 API:

| 용도 | 직소 API | 공통화 권장 |
| --- | --- | --- |
| 활성 이벤트 조회 | `GET /api/v1/jigsaw-puzzle/event/active` | `GET /api/v1/{game}/ranking-season/event/active` |
| 랭킹 조회 | `GET /api/v1/jigsaw-puzzle/rankings?kind=daily|weekly` | `GET /api/v1/{game}/ranking-season/rankings?kind=daily|weekly` |
| 내 랭킹 조회 | `GET /api/v1/jigsaw-puzzle/rankings/me?kind=daily|weekly` | `GET /api/v1/{game}/ranking-season/rankings/me?kind=daily|weekly` |
| 결과 제출 | `POST /api/v1/jigsaw-puzzle/result` | `POST /api/v1/{game}/ranking-season/result` |
| 도전 횟수 조회 | `GET /api/v1/jigsaw-puzzle/attempt` | 선택: `GET /api/v1/{game}/ranking-season/attempt` |
| 도전 선점 | `POST /api/v1/jigsaw-puzzle/attempt/consume` | 선택: `POST /api/v1/{game}/ranking-season/attempt/consume` |
| 도전 확정 | `POST /api/v1/jigsaw-puzzle/attempt/commit` | 선택: `POST /api/v1/{game}/ranking-season/attempt/commit` |

게임프론트 필수 응답 필드:

- `eventId`
- `dailyTryLimit` 또는 게임별 제한
- `stageCount` 또는 게임별 콘텐츠 수
- `seasonActive`
- `seasonOff`
- `rewards.daily`
- `rewards.weekly`
- `payout.daily`
- `payout.weekly`
- `season.eventRankingEnabled`
- `version`
- `status`

프론트 규칙:

- `seasonOff === true` 또는 `seasonActive === false`면 플레이와 랭킹 표시를 닫는다.
- 랭킹 탭은 기본적으로 일일/주간만 노출한다.
- `season.eventRankingEnabled === true`일 때만 별도 시즌/이벤트 랭킹 탭을 노출한다.
- 결과 제출 실패가 플레이 진행을 막지 않게 할지, 제출 성공을 클리어 조건으로 할지는 게임별로 결정한다. 직소는 제출 실패를 무시하고 플레이 진행을 우선한다.

## 어드민 API 계약

직소 현재 API와 일반화 권장 API:

| 용도 | 직소 API | 공통화 권장 |
| --- | --- | --- |
| 이벤트 목록 | `GET /v1/puzzle-events` | `GET /v1/minigames/{game}/ranking-events` |
| 이벤트 상세 | `GET /v1/puzzle-events/{eventId}` | `GET /v1/minigames/{game}/ranking-events/{eventId}` |
| 이벤트 생성 | `POST /v1/puzzle-events` | `POST /v1/minigames/{game}/ranking-events` |
| 이벤트 저장 | `PUT /v1/puzzle-events/{eventId}` | `PUT /v1/minigames/{game}/ranking-events/{eventId}` |
| 이벤트 삭제 | `DELETE /v1/puzzle-events/{eventId}` | `DELETE /v1/minigames/{game}/ranking-events/{eventId}` |
| 고정 시즌 시작 | `POST /v1/puzzle-events/{eventId}/season/start` | same shape |
| 주간 반복 적용 | `POST /v1/puzzle-events/{eventId}/season/weekly-apply` | same shape |
| 즉시 종료/정산 | `POST /v1/puzzle-events/{eventId}/season/end-now` | same shape |
| 랭킹 미리보기 | `GET /v1/puzzle-events/{eventId}/rankings` | same shape |
| 지급 기록 조회 | `GET /v1/puzzle-events/{eventId}/payout-records` | same shape |
| 지급 기록 재확인 | `POST /v1/puzzle-events/{eventId}/payout-records/recheck` | same shape |
| 수동 지급 생성 | `POST /v1/puzzle-events/{eventId}/payout-records/generate` | same shape |

어드민 저장 규칙:

- live 또는 진행 중 시즌은 기본 저장을 막고 `allowLiveEdit`가 true일 때만 허용한다.
- 저장 요청에는 `version`을 포함한다.
- 진행 중 시즌의 상태 필드는 `PreserveLiveSeasonState`류의 처리로 실수 초기화를 막아야 한다.
- `pc1`, `qa`, `live`, `deploy/*` 같은 배포 브랜치에 직접 커밋하지 않는다.

## 자동 정산

직소 `StartPuzzleSettlementManager`는 주기적으로 이벤트를 읽고 정산한다.

### 일일 정산

`settlePuzzleDailyAuto` 기준:

- 매일 09:00 KST 이후 실행된다.
- 대상 날짜는 어제다.
- 이미 `lastDailySettled >= targetDate`면 skip한다.
- 정산 윈도우는 대상일 00:00:00~23:59:59 KST다.
- 시즌 첫날이면 seasonStart 이후부터만 잡는다.
- `rewards.daily`의 rank 보상을 지급한다.
- rankless daily reward는 participation 성격으로 지급한다.
- 완료 후 `season.lastDailySettled`를 갱신한다.

### 주간 정산

`settlePuzzleSeasonAuto` 기준:

- `season.weeklyRecurring === true`이고 `recurringStartAt`이 있어야 한다.
- 다음 주 월요일 09:00 KST 이후 직전 주를 정산한다.
- 윈도우는 직전 주 월요일~일요일이다.
- 첫 주는 `recurringStartAt` 이후부터만 잡는다.
- `prevRound`를 계산하고 `lastSeasonRound >= prevRound`면 skip한다.
- `season.rewards`를 지급하며 payout kind는 `season`이다.
- rankless weekly reward는 completion 성격으로 지급한다.
- 완료 후 `season.lastSeasonRound`를 갱신한다.

다른 게임 적용 시 주의:

- 주간 보상 UI 명칭은 "주간랭킹"이지만, backend payout kind는 직소에서 `season`으로 기록되는 흐름이 있다. 공통화할 때는 `weekly`와 `season` 용어를 분명히 정리해야 한다.
- 운영자가 보는 "주간 반복 시즌"은 매주 자동으로 롤링되는 하나의 시즌 운영 모드다.

## 어드민 프론트 구현 체크리스트

필수 타입:

- `SeasonMode = 'weekly' | 'fixed' | ''`
- `PuzzlePayoutKind = 'daily' | 'weekly' | 'season'`
- `seasonActive`
- `seasonMode`
- `PuzzlePayoutRecord`
- `PuzzleRankingItem`

필수 화면/상태:

- 생성된 시즌 목록
- 현재 이벤트 상세
- 스테이지/콘텐츠 구성
- 일일 보상 슬롯
- 주간 보상 슬롯
- 시즌/이벤트 별도 랭킹 사용 여부
- 정산 기록 조회
- 랭킹 미리보기
- 시즌 시작
- 주간시즌 적용
- 즉시 종료
- 삭제
- 저장 충돌/라이브 수정 확인

현재 직소 어드민의 backend readiness:

- `B7_weeklySeasonApply`: true
- `B8_seasonEndNow`: true
- `B9_newFromActive`: true
- `B10_deleteEvent`: true
- `B2_seasonRanking`: false
- `B3_payoutRounds`: false
- `B5_payoutExport`: false

다른 게임에서 그대로 복사하면 안 되는 부분:

- `puzzle_*` localStorage key
- `puzzle-events` URL
- `Puzzle*` 타입명
- 직소 스테이지/애니메이션 검증 로직
- 직소 전용 demo-fill, coin-rate, coin-per-attempt

## 게임프론트 구현 체크리스트

필수 흐름:

1. `event/active` 조회
2. `seasonOff`와 `seasonActive`로 플레이 가능 여부 결정
3. 이벤트 콘텐츠 또는 게임 설정 로드
4. 랭킹/내 점수 조회
5. 플레이 시작 시 도전 횟수 선점이 필요한 게임이면 `attempt/consume`
6. 결과 제출
7. 세션 종료 시 `attempt/commit`
8. 보상 모달에서 daily/weekly rewards와 payout 표시
9. 랭킹 화면에서 daily/weekly 탭 표시
10. `eventRankingEnabled`가 true일 때만 season 탭 표시

직소에서 확인할 파일:

- `jigsaw-game.tsx`
  - `loadMyScoreSummary('daily'|'weekly')`
  - `loadActiveEvent`
  - `consumeDailyAttempt`
  - `commitDailyAttempt`
  - `submitPuzzleResult`
  - `seasonOff` gating
- `combined-ranking.tsx`
  - `RankTab = 'daily' | 'weekly' | 'season'`
  - `eventRankingEnabled`에 따른 탭 제어
  - `GET /rankings?kind=...&login_type=google`
- `reward-modal.tsx`
  - daily/weekly reward 안내

## 다른 미니게임 적용 절차

1. 게임 slug를 정한다.
   - 예: `rhythm-game`, `keyflow`, `surprise-dungeon` 등.
2. 공통 시즌 모델을 만들지, 기존 직소 모델을 복제 후 게임별 prefix로 둘지 결정한다.
   - 장기적으로는 `minigame_ranking_event`, `minigame_ranking_result`, `minigame_payout_record` 같은 공통 컬렉션이 낫다.
3. 게임 결과 저장 스키마를 정의한다.
   - 최소: `eventId`, `userId`, `nick`, `scoreMetric`, `settledAt`, `source`.
4. 게임별 `computeDailyScores`를 구현한다.
   - 직소처럼 stage별 순위를 점수화할 수도 있고, 리듬게임처럼 raw score 최고점으로 정렬할 수도 있다.
5. 공통 `rankRange`와 cumulative 집계를 붙인다.
6. 어드민 API를 직소와 같은 형태로 구현한다.
7. 어드민 프론트는 직소 보상/정산 탭 구조를 복제하되 game slug와 타입명을 바꾼다.
8. 게임프론트는 `seasonOff`, `daily`, `weekly`, `rewards`, `payout` 응답 계약을 맞춘다.
9. 자동 정산 매니저에 해당 게임 handler를 등록한다.
10. payout record 멱등성 테스트를 먼저 한다.

## 구현 에이전트용 작업 프롬프트

아래 프롬프트를 다른 미니게임 구현 에이전트에게 그대로 전달할 수 있다.

```text
직소퍼즐의 일일/주간 랭킹 시즌 체계를 기준으로 <GAME_SLUG> 미니게임에 동일한 시즌 운영 체계를 구현한다.

반드시 먼저 다음 파일을 읽고 현재 직소 구현을 기준으로 맞춘다.

- backend:
  - service/textbattle/model/puzzle_event.go
  - service/textbattle/api/h_v1_jigsaw_puzzle.go
  - service/textbattle/admin/h_puzzle_admin.go
  - service/textbattle/admin/puzzle_settle.go
- admin:
  - components/page/jigsaw-puzzle-admin/interface.ts
  - components/page/jigsaw-puzzle-admin/api.ts
  - components/page/jigsaw-puzzle-admin/rewards-tab.tsx
- frontend:
  - app/jigsaw-puzzle/_dev/components/jigsaw-game.tsx
  - app/jigsaw-puzzle/_dev/components/combined-ranking.tsx
  - app/jigsaw-puzzle/_dev/components/reward-modal.tsx

구현 요구사항:

1. daily/weekly 랭킹 윈도우는 직소와 동일하게 KST 기준으로 구현한다.
2. seasonActive/seasonOff는 백엔드가 권위 있게 계산한다.
3. 어드민은 생성, 저장, 고정 시즌 시작, 주간 반복 시즌 적용, 즉시 종료, payout record 조회를 지원한다.
4. 게임프론트는 daily/weekly 탭을 기본 노출하고, 별도 season 탭은 eventRankingEnabled가 true일 때만 노출한다.
5. 자동 정산은 daily next-day 09:00 KST, weekly next-Monday 09:00 KST 원칙을 따른다.
6. payout record는 같은 유저/보상/기간에 중복 지급되지 않아야 한다.
7. 게임별 점수 계산만 adapter로 분리하고 시즌 운영/정산/보상 계약은 직소와 동일하게 유지한다.
```

## 검증 체크리스트

백엔드:

- `event/active`가 시즌 없음, 시즌 진행 중, 즉시 종료 후 상태를 정확히 반환한다.
- `rankings?kind=daily`가 오늘 KST 결과만 집계한다.
- `rankings?kind=weekly`가 이번 주 월요일 이후 결과만 집계한다.
- 결과 제출 후 daily/weekly 랭킹에 반영된다.
- 자동 일일 정산이 중복 지급 없이 payout record를 만든다.
- 자동 주간 정산이 중복 지급 없이 payout record를 만든다.
- `season/end-now`가 진행 중 시즌을 즉시 정산하고 비활성화한다.

어드민:

- 생성/저장/불러오기 round-trip이 깨지지 않는다.
- live 또는 seasonActive 이벤트 저장 시 확인 플로우가 동작한다.
- daily/weekly 보상 슬롯이 API payload로 정확히 매핑된다.
- payout record 조회가 daily targetDate, weekly/season round를 구분한다.
- 미배포 API는 readiness flag로 호출하지 않는다.

게임프론트:

- seasonOff면 플레이 버튼/스테이지/랭킹이 닫힌다.
- seasonActive면 daily/weekly 랭킹이 보인다.
- eventRankingEnabled=false면 season 탭이 보이지 않는다.
- eventRankingEnabled=true면 season 탭이 보인다.
- 결과 제출 실패 시 사용자 경험 정책이 명확하다.
- 로그인/비로그인 정책이 게임 요구사항과 일치한다.

## 현재 확인된 주의사항

- 직소 게임 API는 Google 로그인 유저 중심으로 결과 제출과 내 랭킹을 처리한다. 다른 게임은 로그인 정책을 먼저 정해야 한다.
- 직소의 `attempt` 모델은 게임 전용이다. 모든 미니게임에 필수는 아니지만, 일일 플레이 제한을 공유하려면 공통 attempt 모델로 뽑는 것이 좋다.
- 어드민 `B2_seasonRanking`, `B3_payoutRounds`, `B5_payoutExport`는 현재 프론트 readiness가 false다. 다른 게임에 붙일 때 이 API까지 완성할지 범위를 정해야 한다.
- 백엔드 수동 지급 생성 `POST /v1/puzzle-events/{eventId}/payout-records/generate`는 현재 `kind=season`을 거절한다. 자동 주간 정산과 `season/end-now` 정산은 동작하지만, 어드민에서 시즌 회차를 수동 생성/재생성하는 범위는 별도 구현이 필요하다.
- 직소 자동 주간 정산은 payout kind `season`을 사용한다. UI 용어의 "주간랭킹"과 DB kind의 "season" 혼동을 피해야 한다.
- 현재 프론트 레포 루트에는 미추적 `keyflow-admin/`, `admin_git/`류 복사본이 있으면 `npx tsc --noEmit` 범위가 오염될 수 있다. 검증 시 실제 대상 레포와 include 범위를 먼저 확인한다.

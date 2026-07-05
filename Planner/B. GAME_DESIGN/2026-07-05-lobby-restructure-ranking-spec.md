# 로비 복귀 구조 + 시즌/일일·주간 랭킹 — 구현 정본 스펙 (2026-07-05)

그릴링으로 확정한 결정을 담은 Worker 브리프 겸 설계 정본. 참조: `로비 와이어프레임.dc.html`(low-fi 참조), `2026-07-05-jigsaw-daily-weekly-ranking-season-agent-handoff.md`(윈도우/정산 의미론 참조).

## 확정 결정 (그릴링 Q1~Q5 + 기본 결정)

- **Q1 백엔드**: Firebase/클라 전용. 새 서버 0. 외부 textbattle 백엔드는 **연동·의존 안 함**(직소 문서는 의미론 참조만).
- **Q2 타이틀→로비**: 타이틀 화면은 "게임 시작" 버튼 하나만 남기고 나머지 전부 제거(인지적 시작 행위로 보존). 진입 → 로비(허브). **치트키 노출(특정 키 → devCheatsVisible, 커밋 08406ed)은 반드시 보존.** 로그인은 게임시작 게이트에서 작동.
- **Q3 능력치 강화 진입점 2개 보존**: CoinShop=확장형 상점(퀵탭 유지), "내 능력치 보기" 모달=로비 내 간편 강화. **강화 로직 단일 소스 공유**(passiveCatalog + purchasePassive).
- **Q4/Q5 랭킹 위상 (b1+)**:
  - **시즌** = 어드민 지정 특정 기간(컨테이너). 시즌 범위 안에서만 랭킹.
  - 시즌 내부 **KST 일일(오늘 00:00~)·주간(월 00:00~)** 윈도우로 랭커 산출.
  - **스테이지별** 각각 일일·주간 리더보드.
  - **글로벌** = 플레이어의 모든 스테이지 점수 합산 → 재순위 (일일/주간).
  - 매트릭스: {stage1, stage2, …, 글로벌} × {일일, 주간}.
  - **보상·자동정산·payout·우편은 v1 제외(후속 페이즈).** 얹을 때 직소 규격 준수.
- **기본결정 1 무기 모달**: 실제 16종(WEAPON_CATALOG) + 실제 이질적 OR 해금조건/진행도. 균일 클리어모델 창작 금지.
- **기본결정 2 스테이지**: 실제 STAGE_CONFIGS(현재 2종). stage3 창작 금지, 추가 시 자동 확장.
- **기본결정 3 글로벌 집계**: 읽기 시 클라 집계(스테이지별 best 합산). 별도 저장 노드 없음. `ponytail: on-read 집계, 규모 커지면 Cloud Function 집계로 승격`.

## 흐름

`타이틀(게임시작 only) → [로그인 게이트] → 로비 → 스테이지 선택 → 플레이 → 결과화면 → 로비 복귀`

- 자동 다음스테이지 진행 **제거**: `clearStageAndStartNext`의 `resetGame(nextStage)` 삭제 → `clearStage()`만. EscapePortal도 다음 판 시작 안 함.
- HUD 결과화면: 주액션 "다음 스테이지로" 제거 → "로비로"(로비 라우팅). "다시 시작"(같은 스테이지)·랭킹·상점 유지.

## 랭킹 데이터 모델 (Firebase RTDB)

경로 (시즌 스코프):
```
rankings/{seasonId}/stage/{stageId}/{window}/{periodKey}/entries/{uid}
  = { uid, displayName, score, timeMs, cleared, updatedAt }
```
- `window` ∈ `daily` | `weekly`
- `periodKey`: daily = KST `YYYY-MM-DD`; weekly = KST 그 주 월요일의 `YYYY-MM-DD`
- **글로벌**: 저장 노드 없음. 읽기 시 활성 시즌의 모든 스테이지 entries를 같은 window+periodKey로 모아 uid별 best 합산 → 정렬.

KST 윈도우 헬퍼 (신규 `lib/rankingWindow.js`, 순수함수·테스트):
- `kstDailyKey(nowMs)` → KST 날짜 `YYYY-MM-DD`
- `kstWeeklyKey(nowMs)` → KST 그 주 월요일 `YYYY-MM-DD`
- tie-breaker: score 내림차순, timeMs 오름차순, updatedAt 오름차순, uid 오름차순.

점수: 기존 `getRankingScore({stageId, survivalSeconds, cleared, bossBonus})` 재사용(변경 없음). per-stage entry에 그 값 저장, best만 유지(현 submit과 동일).

시즌 활성:
- 어드민 config 확장: `getAdminRankingSeasonConfig()`에 `startAt`/`endAt`(KST) 추가. 활성 시즌 = now ∈ [start,end]. 미설정 시 **기본 always-on 시즌**(seasonId 기본값)으로 동작(out-of-box).
- now가 모든 시즌 밖 = seasonOff: submit skip, 로비 랭킹은 "시즌 준비중" 표시.

API (클라 함수, `firebaseRanking.js` 재작성):
- `submitRun(user, { stageId, score, timeMs, cleared })` — 활성 시즌의 daily+weekly 버킷 2곳에 best 기록. E2E 우회/미설정 시 skip(현 로직 유지).
- `fetchStageRanking(stageId, window, { limit=100 })` — 활성 시즌 현재 period top N.
- `fetchGlobalRanking(window, { limit=100 })` — 스테이지 집계 top N.
- `fetchMyStageRank(stageId, window)` / `fetchMyGlobalRank(window)` — 선택.
- `getActiveSeason()` — {seasonId, name, endsAt, active}.

`database.rules.json`: `rankings/{season}/stage/{stage}/{window}/{period}/entries/{uid}` — 읽기 public, 쓰기는 인증된 본인 uid만(기존 규칙 패턴 준수).

## 로비 구성 (네이티브 재구현 — dc-runtime 미사용)

와이어프레임 1a/1b를 기존 Vite/React로 재구현. 상단 sticky 상태바 + 스테이지 리스트 스크롤.

상태바: 프로필(useAuthStore.user)·기록요약(totalRuns/bestScore)·코인(goldTotal)·설정·시즌 스트립(활성 시즌명+종료 카운트다운)·"내 능력치 보기"(→모달)·"무기해금 현황보기"(→모달)·퀵탭(유저랭킹=글로벌 랭킹 화면 / 코인상점=기존 CoinShop).

스테이지 카드(스테이지별): 썸네일·`Stage N · 이름`·클리어/미클리어 태그·내 최고기록(records)·일일1위/주간1위 프리뷰(fetchStageRanking limit 1)·`랭킹 상세히`(→랭킹 화면)·`입장하기`(startGame). 잠금 카드는 opacity 0.6 + 해금조건 텍스트, 입장 버튼 없음(isStageUnlocked).

능력치 모달: 기존 CoinShop 패시브 카드 재사용(강화 즉시 반영). maxLevel=3(와이어프레임 4점은 무시, 실제 3).

무기 모달: 실제 16종 + `evaluateUnlocks(records)`로 해금여부·조건·진행도 표시(읽기 전용).

랭킹 상세 화면(신규): 스테이지별 + 글로벌, 일일/주간 탭. UserRanking을 이 구조로 확장 또는 신규 컴포넌트.

## 페이즈 & Worker 분해

**Phase 1 (backendmini) — 랭킹 데이터 계층. 먼저.**
- `lib/rankingWindow.js`(KST 헬퍼)+테스트, `firebaseRanking.js` 재작성(위 API), `useGameStore._onRunEnd` submit 배선 교체, `adminConfig` 시즌 start/end + `AdminPage` 시즌탭 확장, `database.rules.json` 확장. 기존 테스트 회귀 없음 + 신규 window 테스트.

**Phase 2 (uimini) — 타이틀/로비/흐름/모달/랭킹화면. Phase 1 후.**
- 타이틀 스트립(치트 보존), 흐름(자동진행 제거·결과→로비), 로비 컴포넌트, 능력치 모달(CoinShop 재사용), 무기 모달(실제 해금), 랭킹 상세 화면. Phase 1 fetch API 소비.

## Phase 2 구현 노트 (TitleScreen.jsx 실측 반영)

- **치트 보존**: `REVEAL_CHEATS_CODE = ['arrowup','arrowdown','arrowup','arrowdown','a','s','d']` 코나미식 시퀀스 → `onRevealDevCheats()`. 이 keydown 핸들러 + devCheatsVisible 경로 **그대로 유지**.
- **로그인/닉네임 게이트 보존**: 현 `handleStartClick`(미로그인 시 `signInWithGoogle()` → 닉네임 없으면 닉네임 모달 → 있으면 진행)의 로직을 "게임 시작" 버튼으로 보존. **단 목적지를 스테이지가 아니라 로비로 변경.**
- **onStart 의미 변경**: 현재 `onStart(stageId)` = 게임 시작. 신규: 타이틀 "게임 시작" → 로그인/닉네임 게이트 → **로비 진입**. 스테이지 시작은 **로비 스테이지 카드**가 `startGame(stageId)`(App.jsx) 호출.
- **타이틀에서 제거→로비로 이동**: 스테이지 선택(selectedStageId, stage1/stage2 버튼), 설정 모달, 닉네임 편집, 코인상점/랭킹 진입. 타이틀엔 게임시작 버튼 + (숨은)치트만.
- **App.jsx**: 신규 `screen === 'lobby'` 추가. 라우팅 title→lobby(게임시작), lobby→game(스테이지 입장), game 결과→lobby(복귀). 기존 coinShop/ranking prevScreen 패턴 재사용.

## 수용 기준

- `npx vitest run` 전체 그린 + 신규 rankingWindow/랭킹 테스트.
- 클리어 후 자동 진행 안 하고 로비 복귀. 타이틀 게임시작 1버튼 + 치트키 동작.
- 로비: 실제 스테이지 2종·코인·무기 16종 해금상태·시즌 스트립 표시. 능력치 강화 즉시 반영.
- 랭킹: per-stage 일일/주간 + 글로벌 일일/주간, KST 윈도우.

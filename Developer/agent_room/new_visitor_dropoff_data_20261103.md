# 신규 방문자 이탈 화면 데이터 (2026-10-27 04:43 ~ 2026-11-03 KST)

작성: backendmini, 2026-11-03 04:50 KST. 조사 전용 — 코드/규칙/배포 변경 없음. 커밋하지 않음.

## 데이터 출처와 범위

- RTDB `adminVisitors` 스냅샷(11-03 00:49 KST 추출, uid는 8자 해시로 익명화됨). 기록은 `ReadyGameApp.jsx`의 `screen` 변경 때마다 `lastVisitedAt` 갱신 → `gap = last - first` 가 0이면 "첫 화면에서 화면 전환 없음".
- RTDB 공개 랭킹(`rank.json`) — 런 종료 시 1회 기록(0점 포함). 랭킹 항목이 있으면 "run 완료".
- Cloudflare zone `httpRequestsAdaptiveGroups` 요청 로그(10-26 ~ 11-03 08:59 KST). 방문 기록 직전 청크 요청으로 IP+UA를 짝짓고, 같은 UA 세션의 에셋 요청으로 화면을 추정: 타이틀 BGM(`zombie_openning`), Lobby 청크/로비 BGM(`zombie_soft1`), 스테이지 BGM(`zombie_3rd/2nd`), 이후 SFX(`playerStep`, `pencilFire`, `zombieDeath`, 대사 폰트).
- Cloudflare RUM(10% 샘플, 25행) — 리퍼러 보조용. UTM은 어디에도 수집되지 않음(CF 요청 경로에 query 미포함).
- 제외: 운영자 IP 97건, Meta 크롤러 11, 스캐너 5, GCP 호스트 5, 봇 UA 5, Pixel 7 디스크립터+WARP 자동화 2 (= 우리 헤드리스 UX 감사로 추정).
- 11-03 00:49 KST 이후 방문은 미포함(재추출 시 CF GraphQL 레이트리밋으로 수 분 대기가 필요해 이번엔 생략).

## 1. 방문자별 표 (사람으로 추정된 74명)

"초"는 max(방문기록 gap, 같은 UA의 마지막 CF 요청 시각) — 탭을 열어둔 시간도 포함됨. 10-27~10-30 행은 BGM 경로 신호가 없어 화면 추정이 거칢(랭킹·gap 위주).

| id | 첫 방문(KST) | 기기/브라우저 | 국가 | 리퍼러/UTM | 마지막 화면 | 초 |
|---|---|---|---|---|---|---|
| V01 | 10-27 07:50 | mobile Android Chrome | KR | not captured | run (finished) | 643 |
| V02 | 10-27 07:50 | desktop ? other | KR | not captured | run (finished) | 566 |
| V03 | 10-27 08:00 | desktop ? other | KR | not captured | run (finished) | 0 |
| V04 | 10-27 11:46 | desktop Windows Chrome | US | not captured | run (finished) | 1 |
| V05 | 10-27 21:44 | mobile Android Chrome | KR | not captured | run (finished) | 7 |
| V06 | 10-27 22:01 | mobile Android Chrome | KR | not captured | run (finished) | 1350 |
| V07 | 10-27 22:02 | mobile Android Chrome | KR | not captured | run (finished) | 1313 |
| V08 | 10-28 03:32 | desktop ? other | CA | (direct) | title | 0 |
| V09 | 10-28 08:32 | mobile Android Chrome | KR | not captured | lobby | 366 |
| V10 | 10-28 08:33 | desktop ? other | KR | not captured | title | 0 |
| V11 | 10-28 11:28 | ? | ? | not captured | lobby | 44 |
| V12 | 10-28 11:34 | desktop ? other | US | not captured | lobby | 23 |
| V13 | 10-28 19:05 | desktop Linux Chrome | PL | not captured | title | 0 |
| V14 | 10-28 21:20 | mobile Android Chrome | KR | not captured | lobby | 1771 |
| V15 | 10-28 21:28 | desktop ? other | KR | not captured | lobby | 49 |
| V16 | 10-28 21:29 | desktop ? other | KR | not captured | title | 0 |
| V17 | 10-28 22:18 | mobile Android Chrome | KR | not captured | title | 766 |
| V18 | 10-28 22:19 | mobile Android Chrome | KR | not captured | title | 708 |
| V19 | 10-29 08:38 | mobile Android Chrome | KR | not captured | lobby | 400 |
| V20 | 10-29 08:39 | mobile Android Chrome | KR | not captured | lobby | 353 |
| V21 | 10-29 11:28 | desktop macOS Chrome | US | not captured | title | 0 |
| V22 | 10-29 11:29 | mobile iOS Safari | US | not captured | title | 0 |
| V23 | 10-29 13:10 | desktop macOS Chrome | US | not captured | title | 0 |
| V24 | 10-29 13:10 | mobile iOS Safari | US | not captured | title | 0 |
| V25 | 10-29 17:07 | ? | ? | not captured | lobby | 14 |
| V26 | 10-29 20:06 | ? | ? | not captured | run (finished) | 1671 |
| V27 | 10-29 20:42 | ? | ? | not captured | run (finished) | >1h (97h, tab left open) |
| V28 | 10-29 22:36 | desktop Linux Chrome | US | not captured | loading or title | 0 |
| V29 | 10-31 01:23 | ? | ? | not captured | run (finished) | 191 |
| V30 | 10-31 09:39 | ? | ? | not captured | lobby | 64 |
| V31 | 10-31 10:41 | mobile Android Chrome | US | not captured | run (finished, cleared) | 361 |
| V32 | 10-31 11:03 | desktop Windows Firefox | CA | not captured | run (finished, cleared) | >1h (13h, tab left open) |
| V33 | 10-31 11:10 | desktop macOS Chrome | US | not captured | run (finished, cleared) | 636 |
| V34 | 10-31 11:15 | mobile iOS other | KR | not captured | run (quit mid-run) | 58 |
| V35 | 10-31 11:23 | desktop macOS Firefox | US | not captured | run (finished, cleared) | 364 |
| V36 | 10-31 11:39 | desktop Windows Chrome | US | not captured | run (finished) | >1h (19h, tab left open) |
| V37 | 10-31 11:58 | desktop Windows Chrome | KR | not captured | run (quit mid-run) | 475 |
| V38 | 10-31 12:00 | desktop Windows Chrome | KR | not captured | run (finished, cleared) | 900 |
| V39 | 10-31 12:00 | mobile Android Chrome | KR | not captured | run (quit mid-run) | 208 |
| V40 | 10-31 12:02 | desktop macOS Chrome | KR | not captured | run (finished) | 105 |
| V41 | 10-31 12:03 | desktop Windows Firefox | KR | not captured | run (quit mid-run) | 46 |
| V42 | 10-31 12:04 | desktop Windows Edge | KR | not captured | run (quit mid-run) | 187 |
| V43 | 10-31 12:05 | desktop Windows Chrome | KR | not captured | run (quit mid-run) | 612 |
| V44 | 10-31 12:05 | desktop Windows Chrome | KR | not captured | run (quit mid-run) | 710 |
| V45 | 10-31 12:07 | desktop Windows Chrome | KR | not captured | title | 494 |
| V46 | 10-31 12:10 | desktop macOS Firefox | US | not captured | run (finished, cleared) | 1389 |
| V47 | 10-31 12:26 | desktop macOS Firefox | BR | not captured | run (finished, cleared) | 423 |
| V48 | 10-31 12:49 | mobile Android Chrome | KR | escapezombie.com | lobby | 115 |
| V49 | 10-31 13:17 | desktop Windows Chrome | TH | not captured | run (finished) | 93 |
| V50 | 10-31 16:17 | desktop macOS Chrome | GB | not captured | title | 0 |
| V51 | 10-31 22:21 | desktop macOS Firefox | DK | not captured | run (finished, cleared) | 320 |
| V52 | 11-01 00:07 | desktop Windows Firefox | CA | not captured | run (quit mid-run) | 713 |
| V53 | 11-01 10:51 | desktop Linux Firefox | US | not captured | run (finished, cleared) | 1041 |
| V54 | 11-01 10:58 | desktop macOS Chrome | JP | not captured | title | 126 |
| V55 | 11-01 11:01 | desktop Windows Chrome | NG | not captured | run (quit mid-run) | 16 |
| V56 | 11-01 11:01 | desktop Windows Firefox | US | not captured | run (finished, cleared) | 2301 |
| V57 | 11-01 11:08 | desktop macOS Chrome | SG | not captured | run (finished, cleared) | 413 |
| V58 | 11-01 11:41 | desktop Windows Chrome | US | not captured | run (finished, cleared) | 297 |
| V59 | 11-01 11:50 | desktop Linux Chrome | US | not captured | run (finished, cleared) | 410 |
| V60 | 11-01 11:51 | desktop Linux Firefox | US | not captured | run (finished, cleared) | 728 |
| V61 | 11-01 12:00 | desktop Windows Firefox | CA | not captured | run (finished) | 1514 |
| V62 | 11-01 12:05 | desktop Windows Chrome | US | not captured | run (finished, cleared) | 496 |
| V63 | 11-01 12:16 | desktop Windows Chrome | IE | not captured | story/cutscene or run start | 2 |
| V64 | 11-01 12:25 | desktop Windows Firefox | US | not captured | run start / story | 16 |
| V65 | 11-01 12:55 | desktop Windows Firefox | US | not captured | lobby | 0 |
| V66 | 11-01 13:26 | mobile iOS Safari | US | not captured | run (quit mid-run) | 61 |
| V67 | 11-01 13:27 | mobile iOS Firefox | US | not captured | title | 0 |
| V68 | 11-01 13:34 | ? | ? | not captured | title (no CF match) | 0 |
| V69 | 11-01 18:37 | mobile Android Chrome | TH | not captured | run (finished) | 1336 |
| V70 | 11-01 21:12 | desktop Linux Chrome | PL | not captured | title | 0 |
| V71 | 11-01 21:12 | desktop Linux Chrome | PL | not captured | title | 0 |
| V72 | 11-01 22:35 | desktop Windows Firefox | DE | not captured | run (quit mid-run) | 75 |
| V73 | 11-01 22:53 | mobile iOS Firefox | US | not captured | run (finished) | 416 |
| V74 | 11-02 22:55 | mobile Android Firefox | US | not captured | run (finished) | 663 |

## 2. 마지막 화면별 집계

| 마지막 화면 | 명 |
|---|---|
| run 완료(클리어) | 15 |
| run 완료(사망/미클리어) | 17 |
| run 도중 이탈(킬 발생 후) | 11 |
| story/cutscene 또는 run 시작 직후 | 2 |
| lobby | 11 |
| title | 17 (CF 미매칭 1 포함) |
| loading 또는 title(타이틀 BGM 요청 전) | 1 |
| consent/language | 구분 불가 (title 안에 포함) |

- 플레이 시작(run 단계 도달) 45/74 = 61%. title 이탈 18, lobby 이탈 11.
- title 이탈 18명 중 14명은 0초(첫 기록 후 화면 전환 없음). 대부분 US/PL 데스크톱 Linux/macOS Chrome — 일부는 자동화일 가능성이 있음.
- 11-02(KST) 신규 7명: 사람 1명(US Android Firefox, 663초, run 완료). 나머지 6명은 Pixel 7+WARP 자동화 2, Firefox 봇 UA 2, 기타 봇 UA 1 등 → "0~9초에 나간 7명"은 대부분 실제 사람이 아님. "실제 브라우저 5명(US4/DE1)"과의 차이는 날짜 경계(UTC vs KST)와 봇 판정 기준 차이로 보임. DE 1명(11-01 22:35 KST)은 run 도중 75초에 이탈.

## 3. 이 데이터로 화면을 구분할 수 있는가

부분적으로만 가능.

- 구분 가능: title(화면 전환 없음) / lobby(전환 있음, 런 없음) / run 완료(랭킹) — RTDB만으로 확정. run 도중 이탈은 10-31 이후 CF SFX 요청으로 추정 가능.
- 구분 불가:
  - loading vs title: 방문 기록 자체가 앱 마운트 후에 쓰이므로 로딩 중 이탈자는 RTDB에 아예 없음. CF에서 index JS만 받고 끝난 IP는 볼 수 있지만, 방문자 id와 이어지지 않음.
  - consent/language: 타이틀 안의 ConsentGate라 screen 값이 바뀌지 않음 → title과 같은 값.
  - story vs run 시작: 둘 다 `screen='game'`(인트로는 `startStage1Intro`의 일시정지 오버레이). 스테이지 BGM은 두 경우 모두 재생.
  - 리퍼러/UTM: 방문자 단위로 수집되지 않음(RUM 10% 샘플 외 없음).
  - CF 매칭은 IP+UA+시각 휴리스틱이라 캐시된 에셋·공유 IP에서 틀릴 수 있음.
- GA4: `analytics.js` 112회, `vendor-firebase-analytics.js` 103회가 실제로 내려받아졌으므로 실방문에서 GA 초기화 경로는 동작함(활성 조건 통과). 그러나 실제 `collect` 히트가 GA에 들어갔는지는 GA Data API 로그인이 필요해 이번엔 확인 못 함. 설령 들어갔어도 보내는 건 자동 `page_view/first_visit/session_start/user_engagement`와 `run_start`/`run_end`/`stage_clear`뿐이라 화면 구분이 안 됨(`screen_view`/`logEvent` 화면 이벤트 없음). 헤드리스에서 abort된 건 감사 환경 이슈이고, 실방문 기록 여부는 Firebase 콘솔 Realtime/DebugView에서 확인 필요.

## 4. 최소 추가 이벤트 (구현하지 않음)

가장 작은 1번만으로 "어느 화면에서 나갔나"를 방문자 단위로 답할 수 있음. 2~5는 GA 쪽 퍼널.

1. RTDB 방문 기록에 `lastScreen` 필드 추가 — `src/lib/firebaseAdminVisitors.js` `recordAdminVisitor(user, { screen })`, 호출부 `src/components/ReadyGameApp.jsx`(이미 `[authUser?.uid, screen]` effect에서 호출 중). `database.rules.json` `adminVisitors/$uid`에 `lastScreen` 문자열(≤20자, 허용목록) validate 추가 필요 — 규칙 배포는 origin 기준 트리에서만.
2. `screen_view {screen_name}` — `ReadyGameApp.jsx` 같은 `[screen]` effect에서 `trackEvent`.
3. `title_shown` — `src/components/TitleScreen.jsx` 마운트(첫 페인트). 이 이벤트가 없으면 loading 이탈.
4. `consent_shown` / `consent_accept`, `language_set {lang}` — `src/components/ConsentGate.jsx`, `src/lib/titleSettings.js` `applyLanguage`.
5. `story_start` / `story_end {skipped}` — `src/store/useGameStore.js` `startStage1Intro` / `advanceIntro` 마지막 단계·`skipIntro`. run 실제 시작은 기존 `run_start`.
- 선택: `pagehide` 때 `session_leave {screen, secs}` (`ReadyGameApp.jsx`) — 1번과 겹치므로 GA만 쓸 때만.
- UTM/리퍼러: 1번 기록에 첫 방문 때만 `utm_source`/`document.referrer` 호스트 저장(개인정보 아님, 정책 문서 고지 필요).

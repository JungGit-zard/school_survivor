# 게임의 0 기록 전수 연결 조사 — 2026-10-18

**서버에 실제 0이 저장된 기록과, 아직 읽지 못한 값을 화면에서 0으로 바꾼 표시는 다르다. 요청 계정의 0은 플레이하지 않았다는 증거가 아니다. 사용자는 반복 클리어를 명확히 보고했으며, 현재 저장 결과와 충돌한다.** 이 보고서는 원인 수리 완료 보고가 아니라 읽기 조사다. 개인 계정 원본·이메일·UID와 전체 인증 목록은 공개 Git에 올리지 않는다. 이 폴더도 검토 전 일괄 stage/push 금지.

## 확인 범위와 근거

- 운영 기준: `https://escapezombie.com/game`, Hosting `d6b5abe3d7bb45aa`, 방 복구 소스 `f4afd760`. 읽은 소스는 `C:/Users/admin/AppData/Local/Temp/rosari-hotfix-release-20261016/Developer/r3f_prototype/src`. 이 보고 담당은 브라우저를 실행하지 않았으므로 아래는 코드 연결·기존 서버 조회 증거이며 현재 로그인 화면 직접 관찰이 아니다.
- 별도 통합 후보: `F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/integrated-game-20261016-t_e2815ba8`, 기준 `62dc162b` 및 작업 중 overlay. 운영은 Stage 1~4, 후보는 Stage 1~10 기록 키가 존재한다. 후보를 운영 배포 완료로 쓰지 않는다.
- 요청 계정 실제 읽기: `../20261018_stage_unlock_persistence/account-readonly-result.json`, `2026-10-18T06:55:23.019Z`~`06:55:23.441Z`(KST 15:55:23), 동일 계정 두 번 GET, 관측 필드 SHA-256 두 번 동일 `b226eafca8f8682379d8542a2b971f05c0e84bf27e2889b9adeca7d55454e3cd`. 모든 사용자 전체 DB를 읽은 결과가 아니다.
- 코드 SHA-256 16개는 [source-hashes.json](source-hashes.json). 프로필 `uimini` 및 `backendmini` 필수 checker 실행. 제품 소스 변경·사용자 DB 쓰기·배포·테스트 로그인 없음.

## 무엇이 0으로 보이는가

`P`는 Firebase `users/{uid}/progress`이다. `runtime`은 Firebase에서 받은 값을 실행 중 메모리에 들고 있는 상태로 별도 영구 저장소가 아니다.

| 화면·항목 | 원천 키/위치 | 0/없음 표시의 뜻과 처리 | 요청 계정 실제 확인 |
|---|---|---|---|
| 로비 Stage 1 최고 기록 | `P/records/bestSurvivalSeconds` | 양수면 분:초, 0이면 기록 없음. 읽기 대기 때는 로딩이며 진짜 0으로 확정하면 안 됨 | 서버 **0** |
| 로비 Stage 2~4 최고 | `P/records/stage2BestSurvivalSec`~`stage4BestSurvivalSec` | 위와 같음 | 서버 **각 0** |
| Stage 1~4 클리어 표시 | `P/records/stage1Clears`~`stage4Clears` | 0이면 미클리어 판정; 독립 점수가 아니라 횟수 | 서버 **각 0** |
| Stage 2~4 입장 잠금 | 직전 Stage의 `stageNClears` | 1회 이상일 때 다음 Stage 열림. Stage 1은 기본 열림. 해금 bool을 따로 저장한 것이 아님 | 현재 저장값으로 2~4 잠김 판정. 과거 미클리어 증거 아님 |
| 랭킹 상단 누적 플레이 | `P/records/totalRuns` | 실제 종료 집계 횟수. 미수신에도 `{}`→0이 되는 문제 경로 있음 | 서버 **0** |
| 랭킹 상단 내 최고(일간/주간 탭) | 1~4 최고 생존/클리어 값으로 `buildLocalPlayerRankingEntry()`가 계산 | 최고 후보 없음·아직 미수신도 `localEntry?.score ?? 0`. 현재 탭 기간의 서버 최고를 읽은 값이 아니라 개인 기록으로 계산 | 최고 시간 모두 0으로 후보 없음→화면 계산값 0 |
| 전체/일간/주간 글로벌 랭킹 각 행 | `rankingService/v1/public/{season}/global/{window}/{period}/entries/{uid}` | `score`, `timeMs`, `cleared`, `displayName` 등. 실제 UID가 있는 0점 행은 기록된 참여일 수 있음. 빈 칸은 '기록 없음'과 `-`로 표시 | **이 계정 행 미조회**, 0으로 단정 불가 |
| Stage별 전체/일간/주간 랭킹·1위 | `rankingService/v1/public/{season}/stage/{stageId}/{window}/{period}/entries/{uid}` | 사용자 행 0과 보드 비어 있음은 구분. 1위 없음은 `-`/대기 | **미조회** |
| 무기 도감 해금 조건 누적 플레이·처치·코인·생존 | `P/records/totalRuns,totalKills,totalGold,totalSurvivalSeconds` | `현재/목표` 표시. 누락을 0으로 처리, 값이 목표보다 많으면 목표까지만 표시 | 서버 **각 0** |
| 무기 조건 Stage 1~3 클리어·보스·3분 생존 | `P/records/stage1Clears,stage2Clears,stage3Clears,bossKills,stage1Survival180Runs` | 누적 조건. 하나의 판에서의 조건은 실제 누적 0/목표가 아니라 목표 설명만 표시 | 서버 **각 0** |
| 무기 해금 개수/잠금 | `P/weaponUnlocks` + 기본 무기 + 조건 판정 | 개수는 실제 boolean·조건을 세어 계산. 런 중 조합 무기는 별도 취급 | **미조회**; 클리어 횟수 0만으로 전체 해금 값도 0이라 단정 금지 |
| 무기 영구 강화 현재 Lv.0 | `P/weaponPermanentUpgrades/{weaponId}` | 해당 키 없음도 0, 정상이라면 미구매 단계. 실제 강화가 있었다면 기록 불일치 | **미조회** |
| 코인 상점 패시브 Lv.0 | `P/passiveUpgrades/{passiveId}` | 해당 키 없음도 0. 강화 레벨이며 점수 아님 | **미조회** |
| 미션 센터 30개 진행 `0/목표`, 퍼센트·완료·받음 | `P/missions/counters` 및 `active/completed/claimed` | 별도의 미션 집계. 키 누락·비정상 값도 `readCounter()`에서 0. 읽기/저장 동기화 안내는 있지만 숫자만으로 저장 성공 증명 불가 | **이 보고 담당 미조회**. [30종 전체 표](mission-inventory.md) |
| 보유 골드 | `P/goldTotal`→store.goldTotal | 소비 가능한 잔액. '누적 획득 코인' `records.totalGold`와 다른 값 | 서버 **318**, 누적 코인 **0** |
| 플레이 중 점수/HUD·죽음 최종 점수 | `continuousScoreBase + getRankingScore(stageId,survivalSeconds,cleared)` | 현재 판 메모리 기반 계산. 새 판 시작 0은 정상일 수 있으나 이 화면만으로 서버 저장 증명 불가 | **현재 판 UI 미관찰** |
| 클리어 팝업 스테이지 점수·연속 누적 점수 | `escapeResult.stageScore/totalScore` 또는 위 메모리 계산 | 연속 플레이 점수이며 계정 평생 합계와 다름 | **현재 UI 미관찰** |
| 죽음/클리어 팝업 이번 골드·전체 골드 | `goldSession`, `goldTotal` | 이번 판 획득과 잔액이며 `records.totalGold`와 의미가 다름 | 서버 잔액만 318, 이번 판 미관찰 |
| 만난 좀비·도감 공개/해금 | `P/encounteredZombieTypes`, `P/bossPassiveUnlocks` | 숫자 점수보다 만남/해금 flag. 없는 키는 미발견/잠금으로 해석 가능 | **미조회** |

운영 17개 records 키는 빠짐없이 다음과 같다. 화면에 직접 표가 없는 집계도 무기/미션 연결이나 후속 기능을 위한 누적값일 수 있다.

| 키 | 의미 | 요청 계정 |
|---|---|---|
| totalRuns | 종료 시 누적 플레이 집계 | 0 |
| totalKills | 종료 시 누적 처치 집계 | 0 |
| totalGold | 종료 시 누적 획득 골드 집계(잔액 아님) | 0 |
| totalSurvivalSeconds | 종료 시 누적 생존 초 | 0 |
| bestSurvivalSeconds | Stage 1 최고 생존 초 | 0 |
| stage1Clears | Stage 1 클리어 횟수 | 0 |
| stage1Survival180Runs | Stage 1 180초 이상 생존 횟수 | 0 |
| stage2Clears / stage2BestSurvivalSec | Stage 2 클리어 횟수 / 최고 생존 초 | 0 / 0 |
| stage3Clears / stage3BestSurvivalSec | Stage 3 클리어 횟수 / 최고 생존 초 | 0 / 0 |
| stage4Clears / stage4BestSurvivalSec | Stage 4 클리어 횟수 / 최고 생존 초 | 0 / 0 |
| bossKills | 보스 처치 집계 | 0 |
| totalLevelUps | 레벨업 누적 집계 | 0 |
| totalPickups | 픽업 누적 집계 | 0 |
| weaponMasterCount | 무기 마스터 누적 집계 | 0 |

키 존재/0 저장은 확인했지만 각 집계 이벤트가 모든 분기에서 실행되는지는 구현 수리 담당이 따로 검증 중이다. 후보는 추가로 `stage5Clears`~`stage10Clears`, `stage5BestSurvivalSec`~`stage10BestSurvivalSec`를 가진다. 이 12개 후보 키를 운영에서 이미 0 저장됐다고 주장하지 않는다.

## 실제 0과 잘못 0처럼 보일 수 있는 경로

1. **실제 서버 0:** 요청 계정 records 17개는 현재 원격 값이 실제 0이다. UI만의 착시로 설명할 수 없다. 사용자의 다수 클리어 보고와 불일치하므로 영구 저장 경계 결함으로 취급한다.
2. **읽기 전 0:** `UserRanking.jsx:37–41`은 hydrate 전 `{}`를 선택하고 `totalRuns ?? 0`, `localEntry?.score ?? 0`으로 표시한다. 서버 0인지 아직 모르는 상태와 섞인다.
3. **무기 화면 0:** `Lobby.jsx:330`은 기록 대기 시에도 `playerRecords={records ?? {}}` 전달, `WeaponModal.jsx:111`이 없는 조건 값을 0으로 표시한다. 별도 게스트 경로 `WeaponModal.jsx:135–142`도 빈 17개 records를 사용한다. 계정 서버 값 확인과 구분해야 한다.
4. **누락 키 0:** `playerRecords.js:41–51`, `firebaseProgress.js:588–620`이 기본 records·정규화를 사용한다. 특정 키가 없거나 유효하지 않은 경우와 실제 0 구분이 화면에서 사라질 수 있다.
5. **랭킹 빈 자리:** `userRanking.js:24–38`의 내부 0은 최대 30행을 채우는 빈칸 데이터다. `UserRanking.jsx:169–174`가 `-`로 렌더하므로 실제 사용자 0점과 동일하지 않다. `subscribeGlobalRanking` 미수신/오류 때 빈 보드가 될 수 있어 '전체 이용자가 0점'이라고 해석하면 안 된다.
6. **로비 대기 처리:** `Lobby.jsx:291–307,353–357`에는 기록 로딩과 최고 기록 없음 구분이 이미 있다. 모든 화면이 일괄 0 처리하는 것은 아니다.
7. **미션의 별도 0:** `missionProgress.js:52–72,110–113`은 별도 카운터 누락을 0으로 변환한다. records가 0이라고 missions도 전부 0이라 단정하면 안 된다.

## 318골드인데 누적 플레이·누적 코인이 0일 수 있는 이유

잔액 `goldTotal`과 종료 때 올리는 `records.totalGold`는 별개다. 저장 담당 코드에서 골드 획득 중간 저장과 판 종료 snapshot이 나뉘므로, 중간 골드는 서버에 남고 종료 집계만 반영되지 않은 조합이 가능하다. 종료 집계 전 중단·저장 거부·다른 탭의 오래된 전체 스냅샷 덮어쓰기 등을 각각 구분해야 한다. **이 계정의 318골드가 정확히 어느 이벤트에서 왔는지, 어떤 실패가 과거에 일어났는지는 현재 스냅샷만으로 확정하지 못했다.**

수리 담당이 메모리 재현에서 다른 탭의 오래된 전체 스냅샷이 클리어 1→0을 덮는 실패를 확인했다는 중간 보고가 있다. 이는 재현 가능한 결함이며 이 실제 계정에서 과거 동일 일이 발생했다는 감사 증거는 아니다. 수리·원인 최종판정은 해당 담당의 증거와 분리한다.

## 가짜/AI 생성 여부 조사 판정

- 현재 기록 0, 이메일 모양, provider 없음, 가입 시각만으로 가짜 계정·AI 생성·사람이 안 들어옴을 판정할 수 없다.
- 기존 84회/1,000회 등의 자동 검증은 대체 인증·메모리 DB 테스트다. 실제 Google 사용자 클리어의 저장을 증명하지 않는다. 운영 DB에 테스트 사용자를 만들었다는 증거도 그 테스트 결과 자체에는 없다.
- 제품 호출 경로에서 test reset/seed의 실행이나 특정 UID 가짜 기록 주입이 발견됐다는 증거는 전달받지 않았다. 테스트 helper export가 존재하는 사실만으로 실제 운영 호출·데이터 조작으로 단정하지 않는다.
- 실제 사용자 상태를 정상처럼 만들기 위한 임의 clear/gold/score 쓰기, 계정 생성·수정, 보존 시드 주입을 이 조사에서 수행하지 않았다.

## 누가 언제 어떻게 로그인했는지 별도 감사

정상 Firebase CLI 인증으로 Auth 계정 목록을 비밀정보 제외한 필드만 요청해 **80개** 읽었다. 연결 provider `google.com` 39개, provider 정보 미제공 41개다. provider 미제공은 '가짜 41명'이나 'AI 41개'라는 뜻이 아니다. 전체 계정 UID·이메일·표시명·가입·마지막 로그인·갱신 시각 표는 아래 PRIVATE 파일에만 보존했다.

- `C:/Users/admin/AppData/Local/escape-private-account-evidence-20261018/LOGIN_AUDIT_PRIVATE.md`
- 같은 폴더 `auth-metadata-audit.json`

최종 조회: **2026-10-18 17:17:32.740~17:17:42.234 KST**. 요청 계정은 Google provider 연결, 가입 **2026-10-02 21:31:29.311 KST**, Firebase가 제공한 마지막 로그인 **2026-10-18 16:59:13.736 KST**, 마지막 갱신도 **16:59:13.736 KST**다. 가입 시각과 마지막 로그인은 다르며 마지막 갱신은 새 로그인 증거로 대신하지 않는다. 이 메타데이터는 사람이 직접 게임에 들어와 클리어했다는 전체 흐름의 증명이 아니다.

Cloud Logging에서는 2026-09-18부터 Auth 관련 서비스 로그 113개 시각/이름을 3페이지 전부 읽었다. 같은 범위에서 **서버 filter의 `protoPayload.methodName =~`**로 로그인/가입/verifyAssertion/verifyPassword/refresh/signOut 이름을 조회한 결과 **0**, 별도 `logName:"data_access"` 필터 결과 **0**이다. 시각 문자열에서 메서드를 추측한 결과가 아니다. 전체 필터·응답·페이지 잔여 false는 PRIVATE JSON `logs.methodCoverage`에 보존했다. 첫 세부 부분필드 요청은 HTTP400으로 실패했고 시각/로그명만 요청하여 성공했다. **확보한 로그 범위에 개별 로그인 기록이 없어, 누가 어떤 기기/IP에서 어떤 방법으로 매번 로그인했는지와 전체 횟수는 확인 불가다.** 수집이 원래 꺼져 있었는지·이미 만료됐는지 설정 원인은 이 조회에서 미확인. 로그인 안 했다는 뜻이 아니다.

비밀번호·비밀번호 해시·OAuth 토큰·Firebase ID/갱신 토큰·세션·브라우저 인증 상태를 요청/추출/파일화하지 않았다. Auth 조회는 `accounts:batchGet`의 서버측 부분필드를 사용했고 Cloud Logging도 timestamp/logName만 받아 민감 payload를 수집하지 않았다.

## 소스 지점

기준 루트는 위 운영 checkout의 `src/`이다.

- `components/Lobby.jsx:120–124,291–330,353–357`: 원격 기록·기록 대기·해금/최고·무기창 전달.
- `lib/stageConfig.js`: 운영 Stage 1~4 clearRecordKey/bestRecordKey 및 직전 스테이지 클리어 조건.
- `components/UserRanking.jsx:37–63,82–83,169–174`, `lib/userRanking.js:24–38,45–74,124–150`: 누적 플레이, 최고 점수, 빈칸·실제 0점 구분.
- `lib/firebaseRanking.js:91–96,313–378`: 원격 스테이지/글로벌 전체·일간·주간 보드 경로와 점수/시간 변환.
- `lib/playerRecords.js:7–25,41–77`: records 17키·누락 0·종료 snapshot.
- `components/WeaponModal.jsx:77–117,135–149`: 누적 무기 조건과 누락/게스트 0.
- `lib/passiveUpgrades.js:23–33`, `lib/weaponPermanentUpgrades.js:76–98`: 강화 레벨 누락 0.
- `components/MissionCenter.jsx:37–44,76–81,119–127`, `lib/missionProgress.js:52–72,110–113`: 미션 카운터, 저장 안내, 0/목표.
- `components/HUD.jsx:848–861,1441–1443,1632–1637,1831–1852`: 현판 점수/생존/획득골드·최종/연속 점수.

이 보고서 작성으로 저장 결함이 해결되거나 운영 배포된 것은 아니다. 실제 Google 새 세션 로그인→점수 증가→저장 ACK→재로그인 복원까지의 검증은 별도 필요하다.

## 후속 조사: 확인된 결함과 수리 진행 상태

아래는 최초 읽기 조사 뒤 **2026-10-18 수리 총괄에게 전달받은 검증 결과**다. 본 보고 담당이 별도 사용자 DB 쓰기나 브라우저 재현을 수행한 결과는 아니다. 위 표의 '미조회'는 최초 조사 당시 범위를 뜻하며, 아래에서 새로 확인한 사실로만 갱신한다. 최종 수리·배포·복구 완료 증거는 아직 전달받지 않았다.

| 항목 | 후속 확인 내용 | 현재 판정과 한계 |
|---|---|---|
| 다른 탭이 클리어 기록을 지움 | 실제 Firebase SDK와 현행 운영 보안 규칙을 적용한 emulator(격리된 가상 DB)에서 A가 클리어 1 저장 → 예전 상태를 가진 B가 지갑 저장 → records 0 회귀 재현 | **실패 재현 확정**. 기본 transaction(서버 최신값과 함께 갱신) 첫 통과가 있으나 전체 수리 검증 미완료. 과거 이 계정의 특정 손실 시각·직접 원인까지 확정한 것은 아님 |
| 진행도 미준비 시 클리어 누락 | progress가 아직 준비되지 않은 분기에서 clear 처리의 early return(중간 종료) 확인 | 수리 대상. 로그인 성공과 진행도 도착 사이 클리어를 빠뜨릴 수 있는 경로이며, 실제 사용자에게 몇 번 발생했는지 미확인 |
| 판 종료 전 누적 집계 누락 | 골드는 플레이 중 저장하지만 records 누적 집계는 run-end(판 종료)에 집중 | 잔액과 누적 집계가 불일치할 수 있는 구조 확인. 사용자 종료·연결 중단을 이유로 플레이하지 않았다고 해석하면 안 됨 |
| 아직 모르는 기록을 0 표시 | 랭킹/무기 조건 등에서 unknown(미수신)을 0과 혼합 | UI 담당 `ranking_restore_ui`가 수리 중. 이 보고 담당은 제품 코드 수정하지 않음 |
| 최고 점수보다 낮은 플레이의 마지막 시각 누락 | best-only(최고 기록만 갱신) 랭킹 경로가 낮은 점수에서 return하여 `lastPlayed` 갱신도 건너뜀 | 모든 실제 플레이 시각을 표시하려면 최고 점수와 마지막 플레이 시각의 갱신을 분리해야 함. 수리·과거 시각 복구 완료 미확인 |
| 미션 보상 중복 골드 | 미션 claim의 double-gold(골드 중복 지급) 결함을 리뷰에서 재현 | 단일 제품 작성 담당이 수정 중. 해당 계정 잔액 318의 원인이라고 단정하지 않음 |
| 동시 구매의 이중 차감·레벨 불일치 | 두 구매가 겹칠 때 골드는 두 번 차감되고 강화 레벨은 1만 남는 결함을 리뷰에서 재현 | 수정 중. 사용자별 과거 발생 횟수·영향은 현재 스냅샷만으로 확정 불가 |

### 실제 랭킹과 개인 기록의 모순

후속 권한 있는 원격 조사에서 요청 계정의 랭킹에 아래 값이 발견됐다. **실제 랭킹의 클리어 증거와 개인 records의 클리어 0이 모순되는 사실이 확인됐다.** 앞선 '플레이 시작은 있지만 클리어가 저장돼 있지 않다'는 설명은 개인 records 경로에만 한정해야 하며, 계정 전체에 클리어 증거가 없다고 해석하면 틀리다.

| 스테이지 | 랭킹 cleared | score | timeMs | 개인 records |
|---|---|---|---|---|
| Stage 1 | true | 351 | 306066 (306.066초) | stage1Clears=0, bestSurvivalSeconds=0 |
| Stage 2 | true | 332 | 229866 (229.866초) | stage2Clears=0, stage2BestSurvivalSec=0 |

이 값들은 **해당 스테이지를 클리어했다는 저장 증거**이며 전체 플레이·전체 클리어 횟수나 정확한 시간 순서의 완전한 이력은 아니다. 사용자가 보고한 수많은 클리어를 위 두 최고 기록만으로 2회로 축소하거나, 반대로 1,000회를 임의 생성하여 복원해서는 안 된다. 사용자 보고와 확보한 서버 증거를 모두 보존해야 한다.

### 복구·저장·마지막 플레이 시각 진행 현황

- 전체 랭킹 조사를 바탕으로 18건 복구 계획이 총괄에게 조건부 승인됐으며 작업 담당이 진행 중이다. 추가 42 UID의 전체 범위 조사도 진행 중이라고 전달받았다. **이는 계획/조사 상태이며 18건 쓰기 성공, 전체 복구 완료 또는 42명 전수 확인 완료를 뜻하지 않는다.** 정확한 대상·원본 스냅샷·실행 결과·사후 비교는 담당 증거가 나온 뒤 별도 갱신한다.
- '모든 실제 플레이 마지막 시각 표시'는 Auth 마지막 로그인, activity 마지막 시작, 랭킹 마지막 플레이, 계정 updatedAt를 서로 구분해야 한다. 로그인 시각이나 임의 새 시각을 과거 플레이 시각으로 채우지 않는다. 현재 best-only 경로의 누락 때문에 전 계정의 마지막 실제 플레이 시각을 이미 복원했다고 보고할 수 없다.
- 사용자의 '저장 3중' 요구는 수리 담당에게 전달된 상태다. 어떤 세 저장 증거를 남기고 어떤 실패에서 복구되는지, 실제 서버 저장 확인까지 완료됐다는 증거는 아직 이 보고서에 없다. 기존 1,000회 메모리 자동검증을 세 번 저장이나 실제 서버 복구 증거로 재사용하지 않는다.
- 이 후속 갱신은 보고서만 수정했다. 사용자 계정 쓰기, 제품 소스 수정, 배포, 브라우저 실행, 커밋·push를 수행하지 않았다. **현재 상태는 결함 확인·수리 및 복구 진행 중이며 완료가 아니다.**

## 추가 결과: 랭킹 복구 완료·Auth 교차 검증

이 절은 바로 위 '18건 복구 계획 진행 중' 이후 전달된 **랭킹 데이터 복구 결과**다. 랭킹 복구 완료와 게임 저장 코드·3중 저장·운영 배포 완료를 구분한다. 본 보고 담당은 아래 로컬 증거를 읽고 표를 만들었으며 별도 원격 조회나 원격 쓰기를 하지 않았다.

### 복구 실행 결과

- 담당의 첫 시도에서 1건 반영 뒤 객체 키 순서에 따른 검증 오류로 멈췄다. 검증 정정 후 후속 실행 배열 18개 중 **1개는 이미 동일한 해시여서 skip, 17개는 CAS 갱신 후 검증 true**다. CAS는 읽어 둔 원본이 그대로일 때만 바꿔 동시 변경을 덮지 않는 방식이다. 즉 **처음 1건+후속 17건, 총 18개 대상의 최종값 확인 완료**이며 18개를 후속 실행에서 다시 모두 썼다는 뜻은 아니다.
- `apply-result.json`: `2026-10-18T08:25:08.417Z`~`08:25:16.748Z`(KST 17:25:08~16), writes 18개 직접 읽기 확인. 사용자 Auth·개인 progress에는 쓰지 않는 승인된 랭킹 범위다.
- 변경 허용 범위를 제외한 해시가 전후 동일: `f084cf2526010d610411a5f0c2484c97d0e92e1b3d6dc431e1b195392e286692`, `unaffectedIdentical=true`.
- 후속 읽기 전용 dry-run(변경 없이 다시 계획 계산) `ranking-restore-private-1792311959831/result.json`의 추가 복구 작업 0건을 확인했다. 따라서 조사한 원본 근거로 더 수행할 랭킹 복구 계획이 남지 않았다. 존재하지 않는 과거 전체 플레이 횟수를 만들어 냈다는 뜻은 아니다.
- 최초 랭킹 **481행/42 UID → 복구 후 493행/43 UID**. 활동 시작 증거가 있으나 랭킹에서 빠진 UID 1개가 포함됐다. 행 수에는 글로벌/스테이지별·전체/일간/주간에 같은 사용자가 중복 등장하므로 493명을 뜻하지 않는다.
- `all-uid-coverage.json`의 43개 모두 `allExistingScoresCovered=true`다. 이는 기존 점수들이 조사한 영구 랭킹 대상에 반영됐다는 검증이며 실제 모든 과거 플레이 이력이 전부 보존됐다는 검증은 아니다.

### 등록 계정과 랭킹 UID의 독립 교차 확인

로컬 Auth metadata의 80개 `localId`와 복구 coverage의 43개 `uid`를 이 보고 담당도 별도 대조했다. **43개 전부 등록 Auth 계정에 존재, 불일치 0**이다. coverage에서 사용자 progress가 있는 계정 5개, 실제 시작 activity가 있는 계정 5개다. 다른 38개가 플레이하지 않았거나 가짜라는 뜻이 아니다.

이 결과는 '등록되지 않은 임의 가상 UID만으로 채워진 랭킹'이라는 설명과 맞지 않는다. 다만 **Auth 등록은 사람·AI 출처 증명이 아니다.** 정상 익명 인증 계정도 자동화 브라우저에서 만들어질 수 있고, 등록 metadata와 랭킹만으로 누가 만들었는지·누가 플레이했는지·인위적 테스트였는지 확정할 수 없다. 확인되지 않은 계정을 삭제하거나 가짜라고 분류하지 않았다.

43개 UID·연결 provider·생성 시각·랭킹 원본 행수·0점 행수·실제 시작 여부·coverage 결과만 담은 목적 제한 표를 PRIVATE로 저장했다. 이메일·이름·비밀정보는 이 교차 표에 넣지 않았다.

`C:/Users/admin/AppData/Local/escape-private-account-evidence-20261018/ranking-auth-crosscheck-43-private.csv`

로컬 근거:

- `C:/Users/admin/AppData/Local/escape-private-account-evidence-20261018/auth-metadata-audit.json`
- `C:/Users/admin/AppData/Local/Temp/ranking-restore-private-1792311674560/all-uid-coverage.json`
- 같은 폴더 `apply-result.json`, `apply-first-attempt-key-order-error.json`, 원본·복구 후 스냅샷
- `C:/Users/admin/AppData/Local/Temp/ranking-restore-private-1792311959831/result.json`

**랭킹 18개 대상 복구와 기존 점수 coverage 확인은 완료. 개인 진행도·해금 보존 코드, 모든 플레이 시각 기록, 3중 저장, UI 수리·운영 배포는 별도 진행 중이다.** 이 둘을 합쳐 게임 전체 복구 완료라고 보고하지 않는다. PRIVATE 파일 및 이 로컬 보고서에 대한 공개 Git 반영은 하지 않았다.


## ?? ?? ?? ? 2026-10-18

?? 0 ??? ? ?? ??? ???? ???? ???. ?? ?? ??? ?? ?? ?? ??? ????? ?? ??? ?? ??? 7? ??? ??? CAS ????: Stage 1 ???3, Stage 2 ???1, ???4, ??306?, Stage 2 ??229?, ? ??980?, Stage 1 180? ??3. ?? ?? ??? ???? ?? ?? ?? ??? ????? ???? ???. ??318? ?? ?? ? ?? ???????? ?? ??? ????. Advisor? 2026-10-18T09:00:14.600Z ?? ?? GET?? ?? ?? ?? ????. ?? PRIVATE ?? ??? ???? ?? ???? ?? ???? ???? ???.

?? ???? SDK?? ?? ???? ?? ??? ? ??? ?? progress ??? ???? ???, ??? ??? ?? ???? ??? 0?? ?? ?? ??? ????. ?? ?? ??/?? SDK ??? ??? ??? ????? ?? Google ? OAuth? ?? ??? ?? ???? ???. ? rules?Hosting ?? ?? ? ?? ???? ????. ?? ?? ?? ??: `../20261018_progress_sdk_p0/README.md`.

# 영구 누적·게스트 랭킹 독립 검토 — 2026-10-14

- 담당: balanceqa, Kanban `t_75f70424`.
- 대상: 작업 중 `firebaseRanking.js`, `guestRankingIdentity.js`, `database.rules.json`, store 및 랭킹 UI diff. 코드 수정·운영 Firebase 쓰기·배포는 수행하지 않았다.
- mandatory pre-command balanceqa/backend/qa 문서 확인. 저장은 Firebase만 사용하며 게스트 인증은 memory-only다.

## 확인한 동작

- 영구 보드는 시즌/날짜와 무관한 `all-time / allTime / all-time` 경로를 사용한다. 활성 시즌은 기존 네 기간 버킷과 두 영구 버킷, 종료 시즌은 두 영구 버킷만 제출한다. 영구 구독에는 날짜 변경 타이머가 없다.
- 글로벌 누적 점수/시간과 현재 스테이지 점수/시간을 분리한다. 본인 UID와 stage whitelist, 자료형·최고점 규칙은 유지된다. 0점 시작은 높은 기존 최고점을 덮지 않는다.
- `guest-ranking` Firebase 앱에서만 Anonymous Auth를 사용한다. Google 기본 Auth와 Studio Auth를 바꾸지 않으며 기본 앱이 없으면 앱 객체만 먼저 만든다. 동시 게스트 요청은 동일 sign-in promise와 Firebase `currentUser`를 사용한다. 다른 사람 UID 쓰기는 Rules가 거부한다.
- 새 게임 진입은 비동기 0점 등록을 요청하고 게임은 즉시 계속한다. 이전 진입/체크포인트의 늦은 응답은 `gameKey`와 pending 객체 검사로 최신 상태를 덮지 않는다.
- Firebase UID/점수/시간이 있는 실제 0점 엔트리를 표시 필터가 제거하지 않는다. 빈 로컬 예시 기록과 구분한다. 현재 화면 조회 한도는 통합/스테이지 모두 30명이며 모든 저장 기록을 지우거나 30명으로 저장을 제한하는 코드는 아니다.

## 발견 사항과 수정 확인

1. 게스트/로그인 진행도 미준비에도 통합 랭킹의 `loadPlayerRecords()`가 strict Firebase 읽기를 실행해 화면이 깨졌다. UI Worker에게 전달했고 초기 계정 기록·미설정 fallback 모두 readiness guard를 추가했다. 준비 상태 변경과 계정 변경 후 재읽기도 확인했다.
2. stage Rules가 삭제 시에도 `newData.stageId` 일치를 요구하므로 null 삭제가 거부되는 문제를 발견했다. Worker가 `(!newData.exists() || newData.child('stageId').val() === $stageId)`로 수정했다. 본인 UID/window/stage 제한과 최고점 규칙을 유지하며 삭제 예외만 허용하는 최종 diff를 직접 확인했다. 실제 Rules 파일의 write 표현식을 평가하는 본인 null 삭제 허용·타인/비인증/잘못된 stage 거부 집중 검사도 통과했다. 이 검사는 운영 삭제를 실행하지 않는다.

## 최소 독립 검사

`npx.cmd vitest run src/components/UserRanking.test.jsx -t 'without account progress hydration' --maxWorkers=1`

실제 playerRecords/firebaseProgress 모듈을 쓰는 게스트 미준비 렌더에서 configured false/true 2 passed / 16 skipped. 최초 configured true 한 가지 검사 통과 후 false fallback 검사 추가분도 확인했다. 제작 Worker의 전체 29개 검사는 반복하지 않았다. 계정 인증·랭킹 쓰기 성공을 mock 결과로 대신 주장하지 않는다.

`npx.cmd vitest run src/lib/firebaseRanking.test.js -t 'permanent ranking rules ownership' --maxWorkers=1`

최종 삭제 수정 뒤 독립 실행 결과: 2 passed / 28 skipped. 본인 UID·최고점·영구 고정 경로·null 삭제의 권한 경계를 확인했다. 제작 Worker의 backend 전체 30검사는 반복하지 않았다.

## 운영 배포 게이트

별도 앱이라도 인증 관련 변경이므로 실제 대상 환경의 새 세션 Google OAuth 복귀·진행도 준비·핵심 게임 진입 성공 검증이 필요하다. 이 검증이 없으면 배포 완료나 로그인 검증 완료로 보고할 수 없다. 운영 시험 기록/사용자 데이터를 생성하는 파괴적 검사는 하지 않았다.

Advisor가 전달한 실제 확인 결과: Anonymous provider는 `enabled`가 없거나 false이며, 읽기 전용 config/Rules/랭킹 정본 스냅샷은 `C:/Users/admin/AppData/Local/Temp/permanent-ranking-live-baseline-20261014`에 보존했다. 새 headed 세션에서 현재 운영 사이트의 Google 팝업에 접근했으나 Google이 '로그인할 수 없음 / 브라우저 또는 앱이 안전하지 않을 수 있습니다'로 자동화 브라우저를 거부했다. OAuth 복귀·진행도·게임 진입 성공은 검증하지 못했다. 일반 Chrome 직접 실행도 자동 승인 검토에서 거부되었다. 이는 새 게임 배포가 원인인 실패로 확인된 것이 아니며, Google 보안 제한을 우회하지 않는다.

최종 판정: 검토한 구현과 권한 규칙의 코드 차단 결함 없음. **실제 인증 배포 게이트는 차단됨.** Anonymous provider 활성화, 운영 Rules 변경, 신규 가입/시험 기록, 신규 커밋·푸시·배포는 수행하지 않았다. 기존 운영 버전 `008ea`는 유지되고 이번 기능은 운영 반영 완료가 아니다. 사용자가 일반 브라우저에서 실제 OAuth를 완료한 이후 게이트를 재검증해야 한다. Advisor의 build 필수 45검사와 JS 자산 58개 통과는 전달받은 결과이며 독립 QA가 직접 재실행한 결과가 아니다.

## 후속 범위 — 앱 진입 등록·게스트 닉네임 편집

- 게임 시작 전 앱 진입 등록은 mount당 guest 한 번 및 각 Google UID 한 번이다. 앱 진입만으로 게임 단계/점수 누적을 초기화하지 않으며 실제 게임 시작 등록과 최고점 보호를 함께 유지한다.
- 게스트 닉네임 정본은 `rankingService/v1/guestProfiles/{uid}/nickname`. 본인 UID만 읽기/쓰기, 2~12글자 string, 알 수 없는 필드 거부 Rules를 확인했다. 자동 닉네임은 Firebase 첫 저장 성공 후에만 메모리 조회값으로 제공한다.
- 편집은 검증→정본 저장→현재 15개 알려진 랭킹 경로의 displayName-only 갱신 순서다. 없는 랭킹 엔트리를 새로 만들지 않는다. 점수/시간/클리어 등 핵심 결과를 읽어서 다시 쓰지 않는다.
- 정본 저장 실패는 기존 confirmed nickname을 유지한다. 정본 저장은 성공했으나 랭킹 갱신이 일부 실패하면 confirmed 새이름을 유지하면서 `ok:false`와 재시도 안내를 반환한다. UI의 busy/오류와 Google UID owner 검사, 로비 비동기 load cleanup을 확인했다. Google 계정에 게스트 점수/닉네임을 자동 이관하지 않는다.
- 추가 발견 및 수정: 이미 시작한 guest 제출이 옛 displayName을 캡처한 채 지연되고, 새 닉네임 저장/rename이 먼저 완료되면 늦은 제출이 옛 이름을 다시 랭킹에 쓸 수 있었다. Worker가 같은 guest UID의 제출/rename을 순서대로 처리하고, 대기 제출이 시작할 때 해당 UID의 Firebase-confirmed 이름을 사용하도록 수정했다. 실제 `getGuestRankingNicknameForUid` export와 UID별 Map 조회도 확인했다. 실패한 요청은 다음 쓰기를 막지 않는다. 정본 저장 후 rename의 client 조회는 이미 확인된 nickname을 읽으므로 큐 재진입에 따른 자기 대기는 발생하지 않는다.

후속 독립 검사: `npx.cmd vitest run src/lib/firebaseRanking.test.js src/lib/guestRankingIdentity.test.js -t 'serializes delayed guest|continues the guest write queue|reads only the requested UID' --maxWorkers=1` → 3 passed / 46 skipped. SDK/RTDB를 mock한 격리 검사만 실행했다. 지연된 옛 이름 제출 이후 rename·오래된 user 인자의 후속 제출·실패 뒤 큐 계속·다른 UID/미확인 닉네임 조회를 확인했다. 이 후속 freeze에서 남은 코드 차단 결함은 없다. 실제 인증 배포 게이트와 아래 원격 영향의 불확실성은 그대로 유지한다.

### 테스트 격리 증거 주의

후속 Lobby 검사가 처음에는 신규 guest helper를 mock하지 않아 실제 Anonymous signup 요청을 시도했을 가능성이 있고, 담당자가 검사를 중단했다고 전달했다. provider 비활성 상태를 근거로 성공하지 않았을 것으로 추정할 수 있으나 원격 효과가 없었다고 단정할 수 없다. Advisor의 후속 정본 비교가 진행 중이다. 위 앞선 단계의 '신규 가입/시험 기록 없음'은 의도적으로 운영 시험을 수행하지 않았다는 기록이며, 이 후속 검사에서 원격 요청 자체가 전혀 없었다는 증거로 사용하면 안 된다. 독립 QA 본인은 이 후속 단계에서 검사를 실행하지 않았으며 코드와 기록만 검토했다.

Advisor의 후속 읽기 전용 비교 결과: Auth config와 Rules는 전후 의미상 동일하다. `rankingService`는 전체 동일하지 않으며 2026-10-14 일일 global/stage1 경로에 score 18, timeMs 18016의 비시험형 UID 기록이 추가되었다(제출 시각 2026-10-13T23:50:57.625Z). 일반 사용자의 약 18초 플레이 기록으로 보이나 인과·작성자는 입증되지 않았다. 이 기록은 임의 삭제·복원하지 않고 보존하며 최초 baseline도 그대로 유지한다. 요청한 all-time/guestProfiles 분기는 생성되지 않았다. 따라서 '운영 랭킹 전체 불변'이나 '실제 Anonymous 신규 identity 0건'은 입증된 결과가 아니다. 현재 요청 변경은 커밋·푸시·배포되지 않았고 운영 버전 `008ea`가 유지된다.

## 최종 Advisor 빌드 증거

후속 소스 freeze 이후 Advisor가 `npm.cmd run build`를 직접 실행하여 exit 0을 확인했다. 필수 검사 45개 통과, Vite 빌드 완료, Hosting JS 자산 검증 61개 통과. 독립 QA는 이 전달된 증거만 기록했으며 추가 검사나 원격 작업을 수행하지 않았다. 실제 OAuth 환경 게이트는 여전히 미통과이며 배포·커밋·푸시는 하지 않았다.

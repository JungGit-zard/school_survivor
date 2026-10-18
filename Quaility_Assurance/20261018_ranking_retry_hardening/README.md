# 랭킹 저장 재시도 검증 — 2026-10-18

backendmini 카드 t_a33559b6 / t_0467d8a4. 이번 변경은 랭킹 실패 재시도, 계정 분리, 원래 시각과 기간 보존, 부분 저장 및 조회 오류 표시다. 타이틀·모델·오디오·점수식·Auth SDK·진행도 저장 코어·Rules는 수정하지 않았다.

## 변경과 검증

- 대기 요청을 UID와 원래 버킷 전체 경로에 묶는다. 기존 점수/빠른 시간 정렬 기준의 최고 기록과 최신 실제 플레이 시각을 보존한다. 자정·월요일·시즌 경계를 넘어도 최초 경로와 제출 시각을 유지한다.
- 서버 transaction 뒤 readback까지 확인한 버킷만 ACK로 표시한다. 일부 실패는 확인된 수와 남은 수를 구분하고 수동/온라인 복귀/기존 주기로 재시도한다. 다른 계정으로 기록을 옮기지 않으며 늦은 완료가 새 화면 결과를 덮지 않는다.
- 조회 실패·로딩 중에는 빈 랭킹/0점 자리표시자를 표시하지 않는다. 오류와 재조회 버튼을 제공한다.
- 계정 삭제는 해당 UID의 진행 중 쓰기를 기다리고 기존 삭제 경로와 미확인 과거 기간 경로를 함께 삭제한다. 전체 삭제 실패 때만 재허용하며 성공 때 대기 요청을 제거한다. 닉네임 변경 후 옛 요청이 이름을 되돌리지 않는다.

최초 store 검사에서 원래 시각 유실/다른 UID 재전송2건 RED, 삭제 후 재생성1건 RED를 확보했다. 마지막 Sunday commit/readback 실패 → Monday 삭제에서도 이전 기간4행 잔존 RED를 확보했고 경로 합집합1줄 수정 후 GREEN이다. focused-results.json에 각 실행 결과를 보존했다.

Advisor 독립 최종9파일 **112/112 PASS**, 종료0, success:true이며 전후 제품9파일 해시가 동일하다. 최종 hardening은 삭제 회귀를 포함한11/11 PASS다. source-hashes.json이 검증한 소스 기준이다.

sdk-harness.mjs는 수정한 실제 firebaseRanking 소스를 묶어 실제 Firebase Database SDK를 격리 emulator에 주입한다. readback 고장으로4ACK/2대기 → 원래 기간 재시도 성공, UID 분리, Sunday203/Monday1, allTime203 보존, SDK offline 미ACK → online6ACK를 확인했다. 합성 Auth 토큰만 사용했고 운영 쓰기0이다. 초기/종료 전체 namespace 해시와 revision(null)이 같다. sdk-result.json 참조. 실제 Google OAuth 증거가 아니다. 실행이 만든 포트59438 emulator는 종료했고 브라우저는 만들지 않았다.

최종 정상 npm.cmd run build는 종료0, 기존 Studio45검사와 JavaScript62자산 검사가 통과했다. 기존 nonce/legal/cards 사전 검사도 유지했다.

집중 검사 명령은 app 디렉터리에서 실행한다.

```powershell
node ./node_modules/vitest/vitest.mjs run src/lib/firebaseRanking.test.js src/lib/firebaseRanking.lastPlay.test.js src/lib/firebaseRanking.hardening.test.js src/store/useGameStore.rankingHardening.test.js src/store/useGameStore.rankingEntry.test.js src/components/UserRanking.test.jsx src/components/StageRanking.test.jsx src/components/ReadyGameApp.test.jsx src/lib/accountDeletion.test.js --pool=threads --maxWorkers=1 --testTimeout=30000
```

SDK 재실행은 sdk-harness.mjs를 app 디렉터리의 임시 파일로 복사하여 node로 실행하고 제거한다. 기존 Java/emulator/Vite 설치를 사용한다.

## Preview와 운영 구분

Preview: https://escape-zombie-school--p0-progress-20261018-msidj7ch.web.app/game — /admin도 같은 도메인이다. version9134dbafbe671337, authorizedDomain=true. manifest618개이며 이전527개 중 provider 전용2개를 제외한525경로 모두 보존, 기존 경로 hash 변경은 /index.html만이다. manifest SHA는 a8f3afb2d901ee0d28aee4f3914ac44375551293306d0259b37b0ee51996ab9c다.

필수 cards 생성 뒤 검증한 원본 x-website-cards-manifest.json1개만 복사했다. 평문 SHA1d94…와 Hosting gzip9 SHA959d…를 확인했다. 누락된 기존 자산201개만 이전 검증 artifact에서 보존했다. 임시 config 최종 SHA는 artifact-preparation.json에 있으며 config와 복사 스크립트는 종료 후 제거했다. 안전 스크립트 --preview-only 종료0이며 자동 live 승격 작업은 없다. Advisor가 /game·/admin HTTP200/appRoot 및 공유 manifest 원문 일치를 독립 확인했다.

이 preview는 기준86e81c7d와 이번 작업 소스로 만들었으며 이후 원격 홈페이지 변경은 포함하지 않는다. 원격 변경은 정상 merge로 보존하되 새 빌드나 추가 preview 갱신은 하지 않는다.

이번 worker는 운영 Hosting/Rules를 배포하지 않았다. 별도 owner의 운영 승격 증거는 canonical Developer/agent_room/integrated_release_20261016/redeploy-owner-20261018-110630-result.{md,json}다. 별도 launchmini owner가20:11:43 KST 승격한 운영0a681…에는 이 hardening이 포함되지 않는다. readback의 hostingExpectedUnchanged:d6 필드는 과거 비교 기준이다. 11:35:32Z 조회에서 lastPlayedAt validator2개와 후보와 같은 ranking subtree를 확인했으나 Rules 전체는 후보와 달랐다. independent-readback.json에 당시 해시를 기록했다. 다른 owner 배포를 되돌리지 않았다.

실제 Google 새 OAuth와 로그인 후 핵심 진입은 아직 미검증이다. 이 gate 전 combined client 운영 승격은 하지 않는다. 과거 거부 요청이 이미 재전송됐다고 주장하지 않는다. 메모리 대기 요청은 탭 강제 종료 전 미ACK 상태의 영구 보존을 보장하지 않는다. localStorage/토큰 복제는 없으며0점 입장은 클리어 증거가 아니다.

## 롤백

이번 랭킹 전용 source commit의 명시된 파일만 별도 revert하는 단위다. 기존 P0/Admin commit, 운영 Rules, 사용자 데이터, 외부 owner 배포를 함께 되돌리지 않는다. preview 준비 시 검증한 build와525기존 경로 보존, 동일 nonce/legal/cards 검사를 유지한다.

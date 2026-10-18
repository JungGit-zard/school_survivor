# 관리자 접속자 명부 통합 계약

기존 접속자 요청에 따라 `AdminPage.jsx`와 `firebaseAdminVisitors.js`만 담당했다. Ready/Rules/P/G 및 실제 과거 계정 백필은 단일 코어 담당이 적용한다. 관련 기존 카드 `t_0467d8a4`의 backendmini/uimini 범위다. 제품 출시나 실사용자 데이터 쓰기는 이 UI 담당이 하지 않는다.

## 실제 입장 연결

`src/lib/firebaseAdminVisitors.js`의 `recordAdminVisitor(user, { nickname })`를 Ready의 실제 게임/타이틀 진입 및 인증 UID 변경 이벤트에서 호출한다. 로그인 전에 실제 방문자를 기록하려면 기존 `getRankingUser(null)`가 가진 동일 guest singleton을 재사용한다. 별도 anonymous 앱이나 가짜 계정을 생성하지 않는다. 무작위 렌더링 때마다 호출하지 말고 실제 이벤트당 한 번으로 제한한다. Google 로그인 시 Google UID로 다시 기록한다. 저장 실패는 게임/로그인을 취소하거나 그래픽을 숨기지 않으며 기존 저장 실패 안내로 전달한다.

API는 `adminVisitors/{uid}`만 transaction으로 갱신한다. `uid`, `nickname`, `authType`, Google일 때만 `email`, `firstVisitedAt`, `lastVisitedAt`을 저장한다. 첫/최근 시각은 SDK `serverTimestamp()`이며 정상적인 기존 첫 방문 숫자는 유지한다. 토큰·비밀번호·Auth 생성/로그인 메타데이터는 저장하지 않는다.

계정 삭제용 `deleteAdminVisitor(user)`는 본인 UID의 노드만 remove한다. 인증 UID가 없으면 거부하고 `getRankingUser`를 호출하지 않는다. 게스트 삭제는 이미 실제 방문 기록 때 확보한 같은 guest client가 있을 때만 가능하며, 삭제를 위해 새 게스트를 생성하지 않는다. `accountDeletion.js`의 기존 계정 삭제 흐름에 코어 담당이 연결한다.

`provenance`, `importedAt`, `historicalLastPlayedAt`, `linkedGoogleEmail`은 기존 관리자 백필 값이 존재할 때 보존만 한다. 클라이언트가 이 필드를 신규 생성하거나 수정하는 권한은 필요 없다. 과거 명부에 실제 방문 시각이 없으면 그대로 미확인이고, 이번 실제 방문 이벤트에서 처음 first/last를 채운다. importedAt을 방문 시각으로 바꾸지 않는다. 연결된 Google 이메일은 최근 로그인 방식 미상 안내와 함께 표시한다.

Auth만 존재하고 실제 방문 근거가 없는 백필은 `provenance: 'historical-auth-only'`로 구분하고 UI에 `인증 계정만 · 방문 기록 미확인`으로 표시한다. 기존 랭킹과 인증 정보가 대조된 백필은 `historical-ranking-auth`를 사용한다. 표의 건수는 `계정`이며 고유 사람·실제 방문자 수라고 보고하지 않는다.

## Rules에 필요한 최소 계약

- `adminVisitors` 전체 `.read`: 인증된 verified Google 최고관리자 이메일 `zard5388@gmail.com`만 허용. 앱 화면의 `isProjectMaster` 검사와 별도로 서버에서 강제한다.
- `adminVisitors/$uid`의 `.read`: 같은 관리자 또는 본인 auth.uid만 허용(본인 transaction 읽기). 일반 사용자의 전체 열거는 허용하지 않는다.
- `.write`: 인증된 본인 UID만, UID 필드 일치, 자기 접속 기록 갱신 및 본인 노드 삭제만. 공개 랭킹/공개 프로필의 이메일 권한은 변경하지 않는다.
- `nickname`: 문자열 1~40자. `authType`: `google.com`, `anonymous`, `unknown` 중 하나.
- `google.com`: `auth.token.firebase.sign_in_provider === 'google.com'`, `auth.token.email_verified === true`, `email`이 실제 `auth.token.email`과 정확히 같아야 한다.
- `anonymous`: 실제 sign_in_provider가 anonymous이고 email 필드 없음. `unknown`은 Google/anonymous가 아닌 실제 인증 종류이며 이메일 필드 없음. 추측으로 Google이 아니라고 과거 계정을 분류하지 않는다.
- `firstVisitedAt`: 양수 숫자, 새 실제 방문이면 서버 `now`, 기존 숫자가 있으면 변경 금지. `lastVisitedAt`: 서버 `now`인 숫자. 미래/임의 과거 제출 금지.
- 백필 전용 optional `provenance/importedAt/historicalLastPlayedAt/linkedGoogleEmail`: 기존 값과 동일할 때만 클라이언트 보존 허용. 신규 생성·변경은 거부. 그 외 임의 필드는 거부한다.
- `.indexOn`: `lastVisitedAt`은 선택적 정렬 인덱스. 이 구현은 master 전용 전체 GET 후 최신순 정렬이므로 별도 쿼리 인덱스가 필수는 아니다.

## UI·검증

최고관리자에게만 접속자 탭을 표시하고 API도 같은 조건으로 조회를 차단한다. 이메일·UID·닉네임·인증 종류·첫/최근 방문 KST를 표시한다. 게스트는 이메일 없음을, 알 수 없는 인증과 시각은 미확인임을 표시한다. 로딩/실패/새로고침/빈 상태와 모바일 가로 스크롤 표를 제공한다. 계정 변경/탭 종료 시 늦은 조회가 현재 화면을 덮지 않도록 취소한다.

집중 테스트: `src/lib/firebaseAdminVisitors.test.js`, `src/components/AdminPage.test.jsx`. guestRankingIdentity 모듈은 테스트에서 직접 fake로 바꿔 실제 Auth 계정 생성·실제 DB 접근을 차단한다. API 테스트는 권한 거부·master 허용·서버 시각·게스트 재사용·중복 최초시각 보존·과거 백필 근거 보존·토큰 미복사·commit 실패를 검증한다. 서버 Rules 강제는 코어 담당의 Rules 검사와 별개이며 이 단위 테스트만으로 실제 서버 허용/거부를 완료했다고 주장하지 않는다.

최종 집중 검증: 2개 파일 **26개 통과, 실패 0개**, `admin-visitors-focused.json`의 `success:true`. 본인 계정 노드 삭제·타 UID 보존·미인증 삭제 거부·삭제 중 guest 생성 금지도 검증한다. 실제 DB 쓰기/계정 삭제/브라우저/Hosting 배포는 이 담당이 하지 않았다.

## 코어 통합과 최종 독립 검증

이후 코어 담당이 Ready의 실제 화면 진입 및 모든 화면의 UID 전환을 연결했다. 초기 OAuth 복귀가 로비로 바로 이동해도 해당 계정이 기록된다. 계정삭제는 UID별 신규 기록 차단 → 진행 중 기록 종료 대기 → 본인 명부 삭제 → 기존 진행도/Auth 삭제 순서다. identity/client 초기화가 늦게 끝나도 삭제된 명부를 재생성하지 않는다. 삭제 실패에만 차단을 해제하며 다른 계정은 계속 기록한다.

Advisor가 API/AdminPage/Ready/계정삭제 4개 파일을 독립 실행하여 **50/50, success:true**를 확인했다. 별도 실제 SDK·synthetic Auth·격리 emulator 권한 검사는 **13/13**이다. master 전체 읽기, 본인 읽기/삭제, guest 이메일 없음, 타UID·위조메일·역사 metadata 변조 거부를 검사했고 최초/복원 전체 hash가 같다. 이 13개를 실행한 Rules 원문 SHA `ead0122d...`를 보존된 P0 원문과 Admin 분기로 정확히 재구성했다. 최종 Rules의 Admin subtree canonical SHA는 `b29e60976f49170699d2052b69497a50c4d316bd5dc08ec514d80c27d8b5bdb6`이며 동일하다. P0 checkpointRevision 변경은 이 분기에 영향을 주지 않았다.

사용자 지시와 Advisor의 구체적 계획 승인 뒤 보호 명부만 조건부 CAS로 등록했다. 2026-10-18T09:42:30Z 결과는 **87계정: 랭킹 근거45, 인증 계정만42, 연결된 Google 이메일39**다. 실제 첫/최근 방문 시간을 만들지 않았고 전부 과거 로그인 방식은 unknown으로 남겼다. 사람87명 또는 실제 방문87명이라는 뜻이 아니다. 정상 Auth metadata에서 Google provider 연결이 확인된 이메일만 명부 projection에 포함했다. Auth 계정 생성·수정0, 다른 DB 경로 쓰기0이다.

fresh null 명부+ETag 원본, 계획, 조건부 쓰기와 readback은 PRIVATE에 보존한다. expected/readback canonical SHA는 `75372b26c088d8899c990f30242de6e52c92af702ec2913dfec6ef6b09160175`로 같다. Advisor가 09:43:26.867Z 독립 GET으로 동일 결과를 확인했고 인증 없는 전체 명부 GET은 HTTP401이었다. 공개 Git에는 방문자별 이메일/UID·원본·개별 계획을 넣지 않는다.

현재는 preview만 게시했다. 새 Rules/live Hosting과 실제 Google 새 OAuth는 미완료다. Admin commit만 되돌릴 때에는 Ready/Rules/Admin/API/계정삭제 연계를 함께 되돌리고 P0의 checkpointRevision 허용·저장 Rules는 유지한다. 명부 데이터를 과거 snapshot으로 통째로 복원하지 않는다.

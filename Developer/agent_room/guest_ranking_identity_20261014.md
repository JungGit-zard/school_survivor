# 게스트 랭킹 인증 분리 — 2026-10-14

- 후속 경쟁 상태 보완: backend 저장 큐가 사용할 `getGuestRankingNicknameForUid(uid)`를 추가했다. UID를 키로 하는 기존 Firebase 확인 캐시만 읽으며, 미확인/다른 UID에는 빈 문자열을 반환한다. SDK 호출과 인증 생성은 없다. 기존 UI용 동기 조회 API는 유지했다. 새 집중 테스트 1개로 확인된 저장 이름 조회 및 다른 UID 누출 방지를 검증했다(기존 13개 재실행 없음).

- Kanban: `escape-zombie-school / t_75f70424`, backendmini 분류, Advisor가 배정한 구현 Worker 범위.
- 필수 checker: `-Profile backendmini -Domain auto -TaskSummary guest-ranking`, common/backend 문서 확인. 현재 사용자 지시의 사용 가능한 모델 정책이 오래된 저장소의 특정 모델 강제 규칙보다 우선한다.
- 사용자 요구: Google 로그인 없이 게임에 진입해도 자동 닉네임으로 실제 랭킹을 기록한다. 입력폼 또는 로그인 대기로 게임 진입을 막지 않는다.

## 파일과 경계

- `Developer/r3f_prototype/src/lib/guestRankingIdentity.js`: `getRankingUser(googleUser)`와 `getGuestRankingClient()` 제공. 기존 Google 객체는 그대로 반환한다. 게스트는 별도 Firebase app `guest-ranking`에서 실제 anonymous Authentication을 사용한다.
- 인증 초기화부터 `initializeAuth(..., { persistence: inMemoryPersistence })`만 사용한다. UID 정본은 `auth.currentUser`; 닉네임은 UID 마지막 여섯 글자로 만든 `생존자-xxxxxx`이다. 토큰·로컬 저장소·개인 진행도 복사는 없다.
- 동시 호출은 한 번의 클라이언트 생성과 anonymous 로그인으로 합친다. 제공자 비활성 또는 구성 실패는 호출자에게 그대로 실패로 전달한다. 성공으로 가장하거나 가짜 UID를 만들지 않는다.
- guest Auth와 Database는 같은 named app을 공유한다. 기존 코드가 `getApps().length`로 default app 존재를 판단하므로 guest가 먼저 실행되면 default app 객체만 먼저 예약한다. default Google/Studio Auth 생성·변경은 하지 않는다.
- `Developer/r3f_prototype/src/lib/guestRankingIdentity.test.js`: SDK 전체 mock 격리 테스트. 실서비스 Firebase 읽기/쓰기, 계정 생성, 제공자 설정 변경은 없다.
- firebaseRanking/rules/store 연결은 다른 담당자의 파일 소유 범위다. guest 자동 닉네임을 default 진행도 닉네임으로 덮지 않도록 backend 담당자에게 전달했다.

## 최소 검증

`node node_modules/vitest/vitest.mjs run src/lib/guestRankingIdentity.test.js --maxWorkers=1 --no-fileParallelism`: 1 file, 6 tests passed.

Google 객체 불변/SDK 미초기화, 동시 호출 1회, memory-only named app와 DB 일치, guest 우선 초기화, 제공자 비활성 실패와 재시도, 구성 누락, Auth 세션 상실 후 재인증을 검증했다. 실제 OAuth 또는 라이브 anonymous 성공을 검증한 결과는 아니다. 커밋·푸시·배포하지 않았다.

## 설정에서 게스트 닉네임 변경 — 후속 사용자 지시

- 필수 checker 재실행: `backendmini / auto / guestnickname`; 기존 common/backend 문서 목록·해시 동일.
- `getRankingUser(null)`은 `rankingService/v1/guestProfiles/{auth.uid}/nickname`을 읽고, 없는 경우에만 자동 이름을 저장한다. UID별 초기화 Promise를 공유하므로 반복 체크포인트가 초기 이름을 반복 저장하지 않는다. 읽기·초기 저장 실패를 성공으로 처리하지 않는다.
- `getGuestRankingNickname()`은 현재 Auth UID의 Firebase 확인된 이름을 동기 반환한다. 아직 확인 전이면 빈 문자열이다. 브라우저 영속 저장소를 추가하지 않았다.
- `saveGuestRankingNickname(value)`는 기존 `validateNickname`의 2–12글자 검증을 재사용한다. profile 저장 성공 뒤에만 메모리의 확인된 이름을 갱신하고, `renameRankingEntriesForUser(user, nickname)`를 동적 import하여 호출한다. 기존 점수 덮어쓰기는 backend 담당자 구현 범위다.
- 반환 형식은 항상 `{ ok, nickname, error }`. 입력 검증/저장/랭킹 이름 갱신 실패는 `ok:false`이다. profile 저장 후 랭킹 갱신만 실패한 경우 `nickname`은 이미 Firebase에 저장된 새 이름이다. UI 담당자에게 이 부분 성공 상태를 전달했다.
- Google 전환·기록 이전은 구현하지 않았다. Google/Studio 인증 코드와 제공자 설정은 수정하지 않았다.
- 같은 격리 테스트 명령: **13 tests passed**. 저장 이름 로드, 자동명 초기화 1회, 검증 실패의 무접근, 저장 실패 시 기존 이름 유지, 초기 쓰기 실패 재시도, 이름 변경 후 랭킹 갱신 호출, 랭킹 갱신 실패의 부분 성공 상태를 추가 검증했다. Firebase SDK와 랭킹 함수는 mock이며 실제 데이터 읽기/쓰기 없음.

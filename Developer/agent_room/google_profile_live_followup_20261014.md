# Google 계정 진행정보 로비 반영 점검 — 2026-10-14

- 담당: `backendmini` / Kanban `escape-zombie-school` (메인 조정자 라우팅)
- 대상: 베타 배포 후 Google 로그인 계정의 기존 닉네임, 골드, 스테이지 기록 표시
- 소스 기준: `zombie_only` `c90a0020`, 작업 트리 시작 시 깨끗함

## 코드 확인

- `useAuthStore.syncCloudProgressUser`는 Google 인증 성공 직후 UID를 `firebaseProgress`에 전달한다. `users/{uid}` 원격 스냅샷을 읽고 `reloadPersistentProgress`가 끝나면 `progressStatus`를 `ready`로 바꾼다. 진행정보 읽기 중에도 인증 상태는 `signedIn`이다.
- `ReadyGameApp`은 인증 복귀 시 `signedIn`이면 곧바로 로비로 이동한다.
- `Lobby`의 닉네임 effect와 기록 memo는 `progressStatus` 변경을 구독한다. 닉네임은 원격 profile, 골드는 갱신된 게임 store, 기록과 스테이지 해제는 원격 records를 사용한다. 원격 정보가 늦으면 기록은 대기 상태를 표시하고 `ready` 후 다시 읽는다.
- 기존 `Lobby.test.jsx`의 `restores every cleared stage when the authenticated account progress arrives after the lobby mounts` 검사는 4개 스테이지 입장과 12:46, 6:06, 5:21, 8:01 표기를 주장한다.

## 검증 한계

- 이번 실행의 집중 Vitest는 fork worker 시작 제한시간 초과로 테스트 본문이 실행되지 않았다. thread pool 재시도도 시작이 지연되어 중단했다. 따라서 이번 세션의 테스트 통과로 보고하지 않는다.
- 실제 Google OAuth 완료 및 운영 `users/{uid}` 스냅샷 확인은 이루어지지 않았다. 메인 조정자의 원격 읽기 시도도 응답 없이 중단되었다. `정실장`/골드 `205` 등 운영 값의 실제 표시를 확인했다고 주장하지 않는다.
- 코드에서 신규 수정이 필요한 구체적 결함은 확인하지 못했다. 계정 데이터 쓰기, 코드 변경, 배포는 수행하지 않았다.

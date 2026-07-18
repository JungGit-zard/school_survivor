# Firebase Google Login / Realtime Database Integration - 2026-06-20

## Scope

- Google 로그인 이후 로컬 진행 정보를 Firebase Realtime Database에 저장하도록 연결했다.
- 게스트 플레이는 유지하고, 로그인된 유저가 있을 때만 클라우드 저장을 시도한다.
- 저장 실패가 게임 플레이를 막지 않도록 비동기 저장 실패는 콘솔 경고로만 남긴다.

## Data Path

```text
users/{uid}
```

저장 내용:

- `profile`: Firebase Auth에서 받은 `uid`, `displayName`, `email`, `photoURL`
- `schemaVersion`: 저장 구조 버전
- `updatedAt`: 마지막 저장 시각
- `progress.goldTotal`: 누적 골드
- `progress.records`: 누적 플레이 기록
- `progress.weaponUnlocks`: 해금 무기
- `progress.passiveUpgrades`: 패시브 업그레이드 레벨
- `progress.titleSettings`: 타이틀 설정

## Implementation Notes

- `src/lib/firebaseAuth.js`
  - Firebase config에 `databaseURL`을 포함하도록 `VITE_FIREBASE_DATABASE_URL`을 추가했다.
- `src/lib/firebaseProgress.js`
  - Realtime Database 저장 스냅샷 생성, 유저별 저장 경로 생성, 클라우드 저장 요청을 담당한다.
- `src/store/useAuthStore.js`
  - 로그인 상태 복구 및 Google 로그인 성공 시 현재 로컬 진행 정보를 클라우드에 저장한다.
- `src/store/useGameStore.js`
  - 골드 변화, 패시브 구매/초기화, 생존 보너스, 런 종료 기록 저장 뒤 클라우드 저장을 요청한다.
- `src/components/GoogleAccountPanel.jsx`
  - 로그인 패널 문구를 정상 한국어로 정리했다.

## Local Configuration

`.env.local`에는 Firebase 웹 앱 설정값을 넣었다. 이 파일은 `.gitignore`의 `.env.*` 규칙으로 Git에 올라가지 않는다.

추적되는 예시 파일 `.env.example`에는 다음 항목을 추가했다.

```text
VITE_FIREBASE_DATABASE_URL=
```


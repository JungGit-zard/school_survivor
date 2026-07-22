# Google 로그인 최고관리자 구현

작성일: 2026-07-19

## 구현 범위

- 이미 완료된 타이틀 Google 로그인 흐름, Firebase Auth의 메모리 전용 지속성 및 기존 Web popup/Capacitor native Google 로그인 경로는 변경하지 않았다. 인증 토큰·자격 증명은 localStorage나 Realtime Database에 복제하지 않는다.
- Firebase 사용자에서 최소 UI 인증 상태(`emailVerified`, `providerIds`)만 메모리로 만든 뒤, `zard5388@gmail.com` + 이메일 인증 완료 + `google.com` 공급자일 때만 최고관리자로 판정한다.
- `/admin`은 플레이어 진행도 hydrate를 요구하지 않는다. 같은 Google 로그인 UI를 사용하고, 미로그인·확인 실패·비최고관리자는 명시적으로 차단한다.
- Realtime Database `users/$uid`와 `studioWorkspaces/v1/users/$uid/current` 읽기·쓰기는 소유자 또는 Firebase 서버 토큰이 검증한 최고관리자 Google 계정으로 제한했다. 루트 거부와 기존 검증 규칙은 유지했다.

## 검증

- `npx vitest run src/lib/projectAdmin.test.js src/lib/firebaseAuth.test.js src/lib/projectAdminRules.test.js --pool=threads --maxWorkers=1 --no-fileParallelism --reporter=verbose`
  - 3 files, 12 tests passed.
- `npx vitest run src/components/TitleScreen.settings.test.jsx -t "starts Google login from the start button" --pool=threads --maxWorkers=1 --no-fileParallelism --reporter=verbose`
  - 기존 타이틀 Google 로그인 테스트 1 passed.
- `npm run build`
  - production build 및 Legacy B02 source/artifact gate passed.

테스트 출력의 React `act(...)` 경고와 Vite chunk-size 경고는 기존 테스트/빌드 환경 경고이며, 테스트·빌드 결과는 성공이다.

## 제외

- Firebase 데이터 변경, 규칙 배포, Firebase Console 설정, Android/AAB 생성, 커밋 및 push는 수행하지 않았다.
- 공유 작업트리에 별도로 존재한 `PlayerMesh.jsx`와 `PlayerMesh.test.js` 변경은 이 작업에서 수정·검증·정리하지 않았다.

# Native Google Login Capacitor Fix Validation - 2026-07-05

## 검증 결과

- 인증 단위 테스트 통과: 2 files, 6 tests.
- Vite production build 통과.
- Capacitor Android sync 통과, `@capacitor-firebase/authentication@8.3.0` 플러그인 감지됨.
- Android debug build 통과.

## 검증 명령

- `npx vitest run src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js --pool=threads --maxWorkers=1 --no-fileParallelism`
- `npm run build`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`

## 주의

- 첫 `npm test -- ...` 실행은 assertion은 통과했지만 Vitest fork worker가 메모리 오류로 종료했다. 같은 테스트를 worker 1개와 threads pool로 재실행해 통과 확인했다.
- 현재 저장소에는 `android/app/google-services.json`이 없다. debug compile은 통과했지만 실제 기기 로그인 성공에는 Firebase Console에서 내려받은 Android 설정 파일과 SHA 인증서 등록이 필요하다.

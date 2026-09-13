# Firebase Authentication 메모리 전용 지속성 전환 — v62 사전 수정

## 변경

- `src/lib/firebaseAuth.js`가 Firebase Auth의 `inMemoryPersistence`만 설정하도록 변경했다.
- 브라우저 로컬 인증 캐시를 사용하던 helper를 `setFirebaseAuthInMemoryPersistence`로 교체했다.
- 메모리 지속성을 제공하지 않는 SDK 모듈은 로컬 지속성으로 대체하지 않고 오류를 반환한다.

## 유지한 로그인 경로

- Capacitor Android/iOS에서는 `FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })`가 반환한 credential을 `GoogleAuthProvider.credential(...)` 및 Firebase `signInWithCredential(...)`로 연결한다.
- ID 토큰, access token, Firebase 토큰을 별도 저장소에 복사하지 않는다.

## 검증

2026-09-13 KST에 아래 명령을 실행했다.

```powershell
npm test -- src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js --pool=threads --maxWorkers=1 --no-fileParallelism
```

- 2개 테스트 파일, 20개 테스트 통과.
- branch guard, legacy B02 source gate, dialogue store gate, Studio-game sync source contract 통과.
- AAB 빌드, Capacitor 동기화, Firebase 쓰기, 실제 OAuth 로그인은 이 사전 수정 범위에서 실행하지 않았다.

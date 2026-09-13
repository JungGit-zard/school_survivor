# Firebase Authentication 메모리 전용 지속성 v62 사전 검증

## 확인 범위

- Firebase Auth client가 `inMemoryPersistence`를 설정한다.
- 메모리 지속성이 없을 때 `browserLocalPersistence`를 대체 경로로 사용하지 않고 실패한다.
- Capacitor 네이티브 Google credential → Firebase `signInWithCredential` 경로가 유지된다.

## 결과

```text
npm test -- src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js --pool=threads --maxWorkers=1 --no-fileParallelism
Test Files  2 passed (2)
Tests  20 passed (20)
```

- 네이티브 로그인 테스트는 popup, redirect, redirect-result 호출이 없고 `signInWithCredential`만 호출됨을 확인한다.
- 단위 테스트만으로 실제 OAuth/AAB 로그인을 성공으로 판정하지 않았다. AAB 산출 뒤 로그아웃 상태의 실제 기기 OAuth 왕복과 게임 진입 검증이 별도로 필요하다.

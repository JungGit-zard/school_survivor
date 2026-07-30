# E2E 동의 메모리 게이트 수정 (2026-07-30)

## 원인

`?e2e=1`은 Firebase 인증과 RTDB를 사용하지 않도록 진행도만 메모리에 hydrate하며 `cloudUser`를 `null`로 유지한다. 기존 `recordConsent`는 이 경로에서도 원격 저장을 요청해 실패 후 동의를 롤백했고, ConsentGate가 게임 진입을 막았다.

## 수정

`consent.js`에서 `isE2EAuthBypass()`가 참인 DEV E2E 경로만 동의를 hydrated 메모리 런타임에 기록하고 즉시 성공한다. 이 분기는 `requestCloudProgressSave`를 호출하지 않는다. 일반 사용자 경로는 원격 저장 성공 전 통과하지 않으며, 실패 시 기존처럼 메모리 동의를 롤백한다.

## 안전성 및 검증

- E2E 판별은 `import.meta.env.DEV` 가드가 있는 `isE2EAuthBypass()`를 사용하므로 프로덕션에서는 비활성이다.
- 브라우저 로컬 저장소를 추가하거나 사용하지 않았다.
- 실제 Firebase 대신 테스트 전용 진행도 클라이언트를 사용했다.
- `npm.cmd test -- src/lib/consent.test.js` 결과: 8개 테스트 통과. E2E 동의가 현재 약관 버전으로 메모리에 남고 `requestCloudProgressSave`를 호출하지 않는 회귀 검사를 포함한다.

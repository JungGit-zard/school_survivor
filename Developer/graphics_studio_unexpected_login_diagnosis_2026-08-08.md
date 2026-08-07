# Graphics Studio 비의도 로그인 진단 (2026-08-08)

## 범위와 안전 경계

- 요청: 사용자가 Graphics Studio에서 별도 로그인을 하지 않았는데 로그인된 것처럼 보이는 원인을 진단한다.
- 이 기록은 진단만 한다. 런타임 코드, Firebase 원격 데이터, 브라우저 프로필·저장소·인증 토큰, Studio Apply, 타이틀, 커밋·푸시는 변경하거나 열람하지 않았다.
- 기존 더러운 작업 트리를 보존했다. 현재 인증 관련 런타임 파일에는 미커밋 diff가 없었다.

## 결론

**실제 원인은 Firebase Auth의 브라우저 영구 지속성(local persistence)을 현재 코드가 명시적으로 선택하기 때문이다.**

같은 브라우저 프로필에서 과거에 Firebase Google 로그인을 한 적이 있으면, 앱을 다시 열 때 Google 로그인 버튼을 누르지 않아도 Firebase Auth가 이전 세션을 복원한다. 이어서 `onAuthStateChanged`가 그 Firebase 사용자 객체를 보내고, 앱은 이를 실제 `signedIn` 상태로 반영한다. Graphics Studio는 그 실제 Firebase 인증 상태와 마스터 계정 검증을 통과하면 진입한다.

따라서 이는 Studio가 별도로 비밀 로그인하거나 로컬 Studio 값을 복원한 현상이 아니다. **Firebase Authentication 자체의 기존 로그인 세션이 자동 복구된 실제 인증 상태**다.

현재 프로젝트 지시(AGENTS.md)의 "클라이언트 인증 지속성은 메모리 전용" 규칙과는 충돌한다. 수정이 필요하다. 다만 이 진단에서는 요청 범위에 따라 수정하지 않았다.

## 인증 흐름 증거

1. `Developer/r3f_prototype/src/lib/firebaseAuth.js:97-99`
   - Firebase `auth`를 만든 뒤 `setFirebaseAuthBrowserPersistence(authModule, auth)`를 항상 호출한다.
2. `Developer/r3f_prototype/src/lib/firebaseAuth.js:151-157`
   - `browserLocalPersistence`를 최우선으로 고르고 `setPersistence(auth, persistence)`를 실행한다.
   - 그 결과 Firebase Auth가 브라우저에 보존해 둔 자기 인증 세션을 다음 앱 시작 때 복원할 수 있다. 앱이 ID/갱신 토큰을 RTDB에 복제한 것은 아니다.
3. `Developer/r3f_prototype/src/lib/firebaseAuth.js:106-108`
   - `onAuthStateChanged`의 사용자 결과를 UI용 사용자 객체로 전달한다.
4. `Developer/r3f_prototype/src/store/useAuthStore.js:46-54`
   - 위 콜백에서 사용자가 있으면 무조건 `status: 'signedIn'`으로 설정한다.
5. `Developer/r3f_prototype/src/App.jsx:247-281`
   - `/graphics-studio`는 `signedIn` 및 원격 Studio hydrate 완료가 아니면 렌더하지 않는다.
6. `Developer/r3f_prototype/src/lib/projectAdmin.js:18-22`
   - Studio 마스터 검사는 정확한 이메일, 이메일 확인, `google.com` provider 세 조건을 요구한다.

### 원인 변경 이력

커밋 `b0111b1f5ef0d1aa9a480cfd2d6b49ab0c014d67` (`Fix persistent Google auth and consent flow`, 2026-08-02)이 아래와 같이 메모리 전용 정책을 바꿨다.

- 이전: `setFirebaseAuthMemoryPersistence(... inMemoryPersistence)`
- 현재: `setFirebaseAuthBrowserPersistence(... browserLocalPersistence)`

현재의 `Developer/r3f_prototype/src/lib/firebaseAuth.test.js:105-129`도 이 동작을 명시적으로 검증한다. 즉 우발적 UI 상태가 아니라 의도적으로 구현·테스트된 영구 세션 동작이다.

## 반증 가능한 가설 순위

| 순위 | 가설 | 판정 | 정확한 증거 |
| --- | --- | --- | --- |
| 1 | 이전 Firebase Google 세션이 브라우저에서 자동 복원됐다. | **확정** | `firebaseAuth.js:98,151-157`의 `browserLocalPersistence`, `useAuthStore.js:47-54`의 `signedIn` 반영, focused 테스트 통과 |
| 2 | DEV E2E URL이 가짜 사용자로 Studio 화면을 우회했다. | 가능한 별도 경로이나 이번 현상의 근거 없음 | `e2eAuth.js:13-17`은 DEV + `?e2e`에서 가짜 signedIn, `:19-26`은 정확히 `?e2e=1&studio=1`에서 Studio 우회. 이 경우 실제 Firebase 인증·Studio 원격 읽기/저장은 사용하지 않는다. |
| 3 | 일반 미로그인 사용자가 Studio 진입 게이트를 통과했다. | 반증됨 | `App.jsx:263-281` 및 `App.firebaseBootstrap.test.jsx:290-304`가 signedOut이면 Studio 컴포넌트를 렌더하지 않음을 검증. |
| 4 | 일반 Google 계정이 관리자 권한으로 잘못 판정됐다. | 반증됨 | `projectAdmin.js:18-22`의 세 조건, `App.firebaseBootstrap.test.jsx:325-340`의 non-master 차단 테스트. |
| 5 | 현 미커밋 변경이 인증 동작을 바꿨다. | 반증됨 | `git diff --`로 `firebaseAuth.js`, `useAuthStore.js`, `App.jsx`, `e2eAuth.js`, `projectAdmin.js`, `GraphicsStudio.jsx`의 인증 관련 변경 없음. |

## 실행한 비파괴 검증

작업 디렉터리: `Developer/r3f_prototype`

```powershell
npx vitest run src/lib/firebaseAuth.test.js src/App.firebaseBootstrap.test.jsx src/lib/e2eAuth.test.js --pool=threads --maxWorkers=1 --no-fileParallelism
```

결과: **3개 테스트 파일, 45개 테스트 전부 통과**. 실행 시간 2.83초.

이 테스트는 mock 기반 단위/컴포넌트 검증만 수행했다. 실제 Firebase 데이터, Firebase Auth 원격 세션, 브라우저 프로필, localStorage/IndexedDB의 인증 항목에는 접근하지 않았다.

## 실제 Firebase 로그인과 화면상 가짜 로그인 구분

- 일반 `/graphics-studio`: `onAuthStateChanged`에서 온 Firebase 사용자가 있어야 `signedIn`이 된다. 이번 원인은 이 실제 Firebase 세션 복원이다.
- DEV 전용 `/graphics-studio?e2e=1&studio=1`: 테스트용 가짜 `e2e-local-test` 사용자가 화면을 열 수 있는 별도 경로다. 이는 Firebase 로그인도 아니고 Studio 원격 workspace 읽기/저장도 하지 않는다.
- 현재 실행 중인 사용자의 탭 URL·브라우저 인증 저장소는 진단 안전 경계에 따라 열어보지 않았다. 따라서 그 탭이 E2E 쿼리를 사용했는지 여부만은 이 문서의 범위에서 확인하지 않았다. 그러나 정상 URL이라면 1순위 원인이 결정적이다.

## 필요한 후속 조치

- 수정은 필요하다. 현재 설정을 Firebase Auth `inMemoryPersistence`로 되돌리고, 브라우저 local/session persistence 대체 경로 없이 실패 닫힘(fail-closed)하도록 인증 테스트도 함께 바로잡아야 한다.
- 이미 남아 있을 수 있는 브라우저의 Firebase Auth 세션을 사용자가 직접 로그아웃하기 전에는, 코드 수정 이후에도 열린 기존 탭의 상태가 남아 보일 수 있다. 이 진단에서는 해당 세션을 삭제하거나 로그아웃하지 않았다.

## 라우팅 기록

- Board: `escape-zombie-school`
- 전문 영역: Firebase Auth / 개인정보 경계
- Worker: `backendmini`
- 산출물: 이 문서
- 검증: 위 focused Vitest 45/45 PASS

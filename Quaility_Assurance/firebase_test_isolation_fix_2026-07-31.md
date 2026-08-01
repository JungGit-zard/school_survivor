# Firebase Vitest 격리 수정 검증 기록

- 기록일: 2026-08-01 KST
- 범위: `Developer/r3f_prototype` Vitest의 Firebase Progress 테스트 격리
- 운영 Firebase 데이터: **비접촉**. 스냅샷·읽기·쓰기·listener를 실행하지 않았다.

## 증상과 최소 재현

직전 전체 suite에서는 `HUD.test.jsx` 실행 중 실제 Realtime Database 경로가 열려
`PERMISSION_DENIED` unhandled error 96건이 발생했다. 개별 영향 파일을 한 worker로
실행하면 통과하므로, 파일/worker 간의 테스트 상태 누수가 의심됐다.

다음 명령을 두 번 실행했다.

```powershell
npm.cmd exec -- vitest run src/lib/firebaseProgress.test.js --pool=threads --maxWorkers=1 --no-fileParallelism --reporter=verbose
```

수정 전 두 실행 모두 동일하게 실패했다.

- Tests: `14 passed / 1 failed`
- Unhandled errors: `1`
- 실패 신호: `Firebase SDK must not be constructed by Vitest.`
- stack: `requestCloudProgressSave()` → `getProgressClient()` → `createFirebaseProgressClient()`

회귀 테스트는 Firebase 환경변수를 완전하게 설정하고 `_resetFirebaseProgressForTests()`
직후 메모리 snapshot을 저장한다. `firebase/app` mock의 `getApps()`는 즉시 throw하도록
만들었다. 따라서 실제 Firebase SDK를 만들려고 하면 네트워크 전에 deterministic red가
되며, 운영 Firebase에는 도달할 수 없다.

## 확정 원인

`_resetFirebaseProgressForTests()`가 `testProgressClient`를 `null`로 되돌렸다.
이후 Firebase 환경변수가 설정된 테스트에서 저장을 예약하면 테스트 fake가 사라진
상태로 production `createFirebaseProgressClient()`까지 내려가 Realtime Database
연결을 시도했다. `vi.stubEnv(VITE_FIREBASE_*)`를 쓰는 UI 테스트가 같은 worker에서
실행될 수 있어 이 경로를 더 쉽게 활성화했다.

## 수정

- `src/lib/firebaseProgress.js`
  - `_resetFirebaseProgressForTests()`가 reset 후에도 no-op Vitest client를 설치한다.
  - 실제 transport가 필요한 테스트는 기존 `_setFirebaseProgressClientForTests()`로
    명시 fake를 교체한다.
  - production 진입점과 Firebase Auth의 memory-only persistence는 변경하지 않았다.
- `src/lib/firebaseProgress.test.js`
  - Firebase SDK 생성 자체를 금지하는 회귀 테스트를 추가했다.
  - 각 테스트 뒤 `vi.unstubAllEnvs()`로 테스트 파일 내부 환경변수 stubbing을 복원한다.

## Red → Green 결과

수정 후 같은 focused 명령 결과:

- Test files: `1 passed / 1`
- Tests: `15 passed / 15`
- Unhandled errors: `0`
- Firebase SDK mock `getApps()` 호출: `0`

추가로 다음 조합을 단일 thread/worker에서 확인했다.

```powershell
npm.cmd exec -- vitest run src/lib/firebaseProgress.test.js src/components/TitleScreen.settings.test.jsx src/components/HUD.test.jsx --pool=threads --maxWorkers=1 --no-fileParallelism --reporter=verbose
```

- Firebase 격리 회귀 test 및 HUD: 통과, Firebase SDK mock unhandled error 없음.
- 별개 기존 실패: `TitleScreen.settings.test.jsx`의 `Studio hydration returns false`
  재시도 assertion이 `ensureStudioCloudReady` 2회 기대/1회 실제로 실패했다.
  Firebase SDK나 progress client 호출과 무관하며, Firebase 변경을 되돌린 상태의
  TitleScreen 단독 실행에서도 `15 passed / 1 failed`로 재현됐다.

## Worker spawn 문제 분리

직전 QA 증거의 `E2ERuntimePerformanceDiagnostics`, `GraphicsStudio`,
`resultCoinShopFlow`, `StageLock` 4개 파일은 다음 명령으로 `39 passed / 39`였다.

```powershell
npm.cmd exec -- vitest run src/components/E2ERuntimePerformanceDiagnostics.test.jsx src/components/GraphicsStudio.test.jsx src/components/resultCoinShopFlow.test.jsx src/components/StageLock.test.jsx --pool=threads --maxWorkers=1 --no-fileParallelism --reporter=verbose
```

따라서 worker spawn/termination은 병렬 자원 문제로 별도 추적해야 하며, 이번의
Firebase 실제 연결 경로와 같은 결함으로 합치지 않는다. 전체 suite 재실행은 Advisor가
병렬 작업 종료 후 단일 worker로 별도 통제한다.

## Advisor 최종 전체-suite 검증

Advisor가 다음 기본 병렬 명령을 실행했다.

```powershell
npm.cmd test -- --run
```

결과는 `78.07s`, `186 files 중 185 passed / 1 failed`, `1556 tests 중 1555 passed /
1 failed`였다. Firebase `PERMISSION_DENIED`는 **0건**, unhandled error도 **0건**으로,
이번 Firebase 테스트 격리 결함은 해결됐다.

유일한 실패는 `E2ERuntimePerformanceDiagnostics.test.jsx`의 `status: running` 대
`complete` assertion이며 Firebase와 무관한 E2E 병렬 타이밍 문제다. 동일 파일을 다음
단일 worker 명령으로 두 번 재실행한 결과는 각각 `3/3 PASS (3.11s)`, `3/3 PASS (2.83s)`였다.

```powershell
npm.cmd exec -- vitest run src/components/E2ERuntimePerformanceDiagnostics.test.jsx --pool=threads --maxWorkers=1 --no-fileParallelism --reporter=verbose
```

Advisor의 focused `firebaseProgress` 회귀 실행도 `15/15 PASS`, Firebase SDK mock 호출
`0`이었다. 결론적으로 Firebase 격리 문제는 **resolved**지만, 전체 suite clean PASS는
별도 E2E 병렬 타이밍 문제를 해결하기 전까지 아직 아니다.

## 정리

- 디버그 로그와 throwaway 파일 없음.
- `git diff --check`는 Firebase 변경 파일에서 통과.
- 변경 파일: `src/lib/firebaseProgress.js`, `src/lib/firebaseProgress.test.js`, 이 QA 기록.

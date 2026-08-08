# 원격 점검 모드 — Launch/QA 승인 기준

작성일: 2026-08-08  
역할: `balanceqa` / `launchmini` 검증 기록  
범위: 관리자 기간 설정으로 일반 앱을 점검 화면으로 전환하는 Firebase Realtime Database 기반 기능. 이 기록은 코드 또는 실제 Firebase 데이터를 변경하지 않는다.

## 전제와 릴리스 경계

- 이미 배포되어 설치된 구형 AAB에는 이 구독 및 화면 전환 코드가 없으므로, Firebase 값이나 규칙만 배포해서는 점검 화면이 생기지 않는다.
- 따라서 이 기능을 포함한 새 AAB를 **한 번** 빌드·배포하고 사용자가 그 AAB로 업데이트한 뒤에는, 이후 점검 시작/종료는 Firebase의 원격 값만으로 동작해야 한다.
- 현재 Android `versionCode`는 26이다. 이 기능을 담은 AAB는 그보다 큰 `versionCode`여야 한다.
- 테스트는 Firebase 에뮬레이터 또는 명시적 mock transport만 사용한다. 실사용 Firebase 정본의 값·revision은 읽거나 쓰지 않는다.

## 권장 원격 계약

경로: `operations/v1/inspection/current`

```json
{
  "schemaVersion": 1,
  "startsAtMs": 1780000000000,
  "endsAtMs": 1780003600000,
  "updatedAt": "2026-08-08T00:00:00.000Z"
}
```

- 유효한 활성 기간은 `Number.isSafeInteger(startsAtMs)`, `Number.isSafeInteger(endsAtMs)`, `startsAtMs < endsAtMs`를 모두 만족해야 한다.
- 일반 앱에서 활성 조건은 `startsAtMs <= nowMs && nowMs < endsAtMs`이다. 종료 시각과 정확히 같은 순간에는 즉시 정상 앱으로 복귀한다.
- `null`, 누락, 타입 오류, 과거 종료, 역전된 기간, 미지원 schema는 모두 비활성으로 취급한다. 화면에 남은 과거 상태를 저장해 재사용하면 안 된다.
- 즉시 종료는 `current`를 null로 쓰거나 동일하게 명세화된 비활성 원격 상태로 한 번 갱신한다. 클라이언트는 구독 이벤트에서 즉시 해제한다.

## 접근 제어 승인 기준

`database.rules.json`의 이 경로는 다음과 동등해야 한다.

- `operations/v1/inspection/current`는 인증 여부와 무관하게 `.read: true`이다. 로그인 전 일반 앱도 점검 상태를 받아야 한다.
- `.write`는 Firebase ID token의 이메일이 `zard5388@gmail.com`, 이메일 검증 완료, Google provider인 경우만 허용한다.
- 부모 경로에 더 넓은 write 권한을 두지 않는다.
- payload 검증은 schema, 정수 밀리초 시각, 시작 < 종료, `updatedAt` ISO 문자열 길이 제한, 허용 필드만을 검사한다. 삭제(null)는 명시적으로 허용한다.
- 클라이언트의 `isProjectMaster()` 판정은 편의 UI일 뿐 보안 경계가 아니다. RTDB 규칙이 최종 차단을 증명해야 한다.

## 화면/동작 승인 기준

- `/admin`은 점검 상태보다 먼저 판정한다. 관리자 로그인/권한 화면과 관리 페이지는 기간 중·구독 실패 중에도 항상 접근 가능하다.
- `/admin` 이외의 일반 앱은 활성 기간이면 현재 화면(타이틀, 로그인, 로비, 게임 플레이 포함)을 점검 전용 전체 화면으로 즉시 교체한다. 플레이 입력이나 진행도 저장이 계속되면 안 된다.
- 관리자 페이지에는 시작 시각, 종료 시각, `점검 시작`, `즉시 종료`, 원격 저장 결과/오류가 있어야 한다. 시작은 유효하지 않은 시간·동일/역전 기간에서 write를 시도하지 않는다.
- 점검 화면은 시작/종료 시각을 명확하게 표시하고, 새로 고침에 의존하지 않는다.
- 최초 읽기 또는 `onValue` 구독이 실패하거나 연결이 끊기면 **fail-open**: 마지막 원격 활성 상태를 메모리에 고정하지 말고 일반 앱을 계속 제공한다. 오류가 점검 화면을 만들거나 앱을 막아서는 안 된다.
- 구독 해제(cleanup), 중복 구독 방지, stale callback 무시를 확인한다. 관리자 라우트에서는 일반 앱 점검 구독을 만들 필요가 없다.
- 새 기능은 `localStorage`, `sessionStorage`, IndexedDB, 쿠키를 쓰지 않는다. 기간 상태는 Firebase 응답과 런타임 메모리만 사용한다.

## 승인 테스트 매트릭스

| ID | 방법 | 입력/상태 | 합격 결과 |
| --- | --- | --- | --- |
| RIM-01 | 단위 | 유효 payload, 기간 내부의 고정 `nowMs` | 활성으로 판정한다. |
| RIM-02 | 단위 | 시작 전, 종료 시각 정확히 일치, 종료 후 | 모두 비활성이다. |
| RIM-03 | 단위 | null, 누락, 문자열 시각, 안전 정수 초과, `start >= end`, schema 오류 | 예외 없이 비활성이다. |
| RIM-04 | 단위 | 활성 payload 뒤 null/비활성 snapshot | 즉시 비활성으로 바뀐다. |
| RIM-05 | 단위 | 구독 error 또는 초기 read 거부 | fail-open이며 일반 앱이 유지된다. |
| RIM-06 | 컴포넌트 | 일반 route + 활성 snapshot | 점검 전용 화면만 렌더되고 게임/타이틀 상호작용이 노출되지 않는다. |
| RIM-07 | 컴포넌트 | 일반 route + 구독으로 비활성→활성→비활성 | 페이지 새로고침 없이 점검 표시→정상 화면으로 전환한다. |
| RIM-08 | 컴포넌트 | `/admin` + 활성 snapshot, master | `AdminPage`가 표시되며 점검 화면으로 가려지지 않는다. |
| RIM-09 | 컴포넌트 | `/admin` + signed-out/non-master | 기존 Google 로그인/거부 경계가 유지되며 점검 화면으로 바뀌지 않는다. |
| RIM-10 | UI | 미래 시작·미래 종료 입력 후 시작 클릭 | 유효 payload 1회 저장, 관리자 UI가 성공/활성 상태를 보인다. |
| RIM-11 | UI | 빈값·과거·동일·역전 시간 | 검증 메시지, Firebase write 0회다. |
| RIM-12 | UI | 즉시 종료 클릭 | 비활성 원격 갱신 1회 및 일반 앱의 즉시 복귀 이벤트를 확인한다. |
| RIM-13 | rules emulator | unauthenticated/non-master read | public read가 허용된다. |
| RIM-14 | rules emulator | unauthenticated, 일반 user, 이메일만 위조한 token write | 모두 거부된다. |
| RIM-15 | rules emulator | 검증된 Google master write, invalid payload write | 전자는 유효 payload만 허용, 후자는 거부된다. |
| RIM-16 | 정적 검사 | 새/변경 파일 | `localStorage`, `sessionStorage`, IndexedDB, cookie 기반 점검 상태가 없다. |
| RIM-17 | 빌드/패키지 | production build, `npx cap sync android`, release AAB | build/sync 성공, AAB 내 새 web asset hash가 dist와 일치, versionCode > 26이다. |
| RIM-18 | 실제 기기 | 새 AAB 설치 후 Firebase test/production 승인 경로에서 시작·종료 | 일반 앱은 실시간 전환, `/admin`은 유지, 종료 시 즉시 복귀한다. |
| RIM-19 | 회귀 | 기존 `App.firebaseBootstrap.test.jsx` 및 관련 auth route 테스트 | Admin master/non-master 및 Firebase progress bootstrap 동작이 유지된다. |

## 구현 리뷰에서 즉시 반려할 항목

1. 점검 상태를 번들 상수, local/session storage 또는 구형 앱에 기대는 구현.
2. `/admin`도 점검 화면으로 막는 App 분기 순서.
3. 구독 실패 시 일반 앱을 차단하는 fail-closed 처리.
4. 클라이언트 이메일 검사만 있고 RTDB write rule이 없는 상태.
5. `endsAtMs` 타이머만 두고 원격 즉시 종료 이벤트를 처리하지 않는 상태.
6. AAB versionCode 증가, Capacitor sync, AAB/실기기 검증 증거 없이 "모바일 반영"이라고 보고하는 상태.

## 현재 구조에서의 검토 메모

- `App.jsx`는 `/admin` 분기를 일반 게임 렌더 이전에 처리하므로, 점검 gate는 이 분기보다 **뒤**에 둬야 관리자 접근성을 보장한다.
- `firebaseStudio.js`에는 Realtime Database의 `onValue` 구독 패턴이 이미 있어, 점검 전용 client도 같은 unsubscribe 계약을 따르는지 확인한다.
- `database.rules.json`은 기본 deny이고 `studioWorkspaces/v1/canonical/current`에 public read/master write 선례가 있다. 점검 경로에 같은 성격의 최소 권한을 별도로 부여해야 한다.
- `adminConfig.js`는 메모리 전용이며 Firebase 원격 영속화 수단이 아니다. 점검 일정은 이 모듈에만 저장하면 앱 재시작/다른 기기에서 사라지므로 불합격이다.

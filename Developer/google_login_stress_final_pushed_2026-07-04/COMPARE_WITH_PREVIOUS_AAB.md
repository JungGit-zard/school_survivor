# Google 로그인 이전 AAB 비교 보고서 — 2026-07-04

## 요청

이전 AAB에서는 로그인 문제가 없었다는 전제에서, 최종 push 버전과 비교해 Google 로그인에서 멈추거나 걸릴 수 있는 변경점을 확인한다.

## 비교 대상

### 이전 정상 후보

- 커밋: `9e45b35 Update gameplay feedback and release assets`
- Android 버전: `versionCode 4`, `versionName 1.0.3`
- 선택 이유: release assets 업데이트 커밋이며, 현재 최종 push 전의 같은 Android versionCode/versionName 계열이다.

### 현재 최종 push

- 커밋: `08406ed feat(dev): 치트 UI를 타이틀 커맨드 뒤로 숨김`
- Android 버전: `versionCode 4`, `versionName 1.0.3`

### 로컬 AAB 파일 상태

현재 파일시스템에서 발견된 AAB는 다음뿐이다.

- `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\android\app\build\outputs\bundle\release\app-release.aab`
- 크기: `9,474,046 bytes`

즉, 문제 없던 “이전 AAB 바이너리” 자체는 별도 파일로 남아 있지 않아, Git 커밋 기준으로 비교했다.

## 핵심 차이

Google Auth의 저수준 구현은 동일하다.

공통:

- `GoogleAuthProvider`
- `provider.setCustomParameters({ prompt: 'select_account' })`
- `signInWithPopup(auth, provider)`
- `applicationId "com.jungyoon.zombieschool"`
- `INTERNET` permission 있음
- `capacitor.config.json`의 `appId` 변경 없음

즉, Firebase OAuth provider 자체나 Android package/appId가 바뀐 것은 아니다.

## 실제로 바뀐 위험 지점

### 이전 정상 후보 `9e45b35`

`게임 시작` 버튼은 Google 로그인을 요구하지 않았다.

흐름:

1. `게임 시작` 클릭
2. 저장된 닉네임이 있으면 바로 시작
3. 없으면 닉네임 입력 모달 표시
4. Google 로그인은 상단 `Google 로그인` 버튼에서만 별도로 실행

### 현재 최종 push `08406ed`

`게임 시작` 버튼이 Google 로그인을 강제한다.

변경된 흐름:

1. `게임 시작` 클릭
2. 로그인 상태가 아니면 `signInWithGoogle()` 호출
3. Firebase popup 로그인 시작
4. 로그인 완료 전에는 닉네임 모달/게임 시작으로 진행하지 않음

관련 코드 변경:

```js
const handleStartClick = async () => {
  let user = authUser
  if (!user?.uid) {
    if (signingIn) return
    user = await signInWithGoogle()
    if (!user?.uid) return
  }

  const savedNickname = getSavedNickname(user)
  ...
}
```

이 변경이 “이전 AAB는 괜찮았는데 지금 테스터가 Google 로그인에서 걸린다”는 체감 차이를 만들 수 있는 가장 유력한 원인이다.

## 비교 실행 결과

### `게임 시작` 버튼 비교, 각 10회

- 이전 정상 후보 `9e45b35`
  - `게임 시작` 후 popup 생성: 0/10
  - 닉네임 모달 표시: 10/10
  - 오류: 0/10

- 현재 최종 push `08406ed`
  - `게임 시작` 후 popup 생성: 10/10
  - 닉네임 모달 표시: 0/10
  - 오류: 0/10

### 상단 `Google 로그인` 버튼 직접 테스트

- 이전 정상 후보 `9e45b35`: 10/10 통과
- 현재 최종 push `08406ed`: 40/40 통과

해석:

- 직접 `Google 로그인` 버튼을 누르는 기능 자체는 이전/현재 모두 반복 테스트에서 앱 복귀가 된다.
- 달라진 것은 `게임 시작`이 이제 Google 로그인 popup으로 들어간다는 UX/흐름이다.
- 따라서 테스터는 “게임 시작을 누름 → 갑자기 Google 로그인 → WebView/OAuth가 꼬이면 시작 자체가 막힘”을 경험할 수 있다.

## 리스크 판정

원인 후보 우선순위:

1. 높음 — `게임 시작` 버튼이 로그인 강제 진입으로 바뀜
2. 중간 — Android Capacitor WebView에서 `signInWithPopup` 방식은 실제 기기에서 데스크톱 Chromium과 다르게 동작할 수 있음
3. 낮음 — Firebase provider 설정/authorized domain/package 변경 문제. 이번 비교에서는 해당 변경 없음

## 권장 수정 방향

이전 AAB와 같은 안정성을 원하면, 내부테스트 전에는 다음 중 하나가 안전하다.

### 권장 1: 게임 시작은 로그인 없이 가능하게 되돌리기

- `게임 시작`은 이전처럼 닉네임/게임 진입으로 진행
- Google 로그인은 상단 계정 패널에서 선택적으로 수행
- 장점: 로그인 문제로 게임 시작이 막히지 않음
- 이전 정상 AAB의 동작과 가장 가까움

### 권장 2: 로그인은 권장하되 실패/취소 시 게스트 시작 허용

- `게임 시작` 클릭 시 Google 로그인 시도
- `popup-closed-by-user`, 실패, timeout이면 닉네임 모달/게스트 진행 허용
- 장점: 계정 연동 유도는 유지하면서 테스터가 막히지 않음

### 권장 3: Android에서는 Web popup 대신 redirect/native 로그인으로 분기

- Capacitor Android 감지 시 popup 대신 외부 브라우저/redirect/native plugin 사용
- 장점: 장기적으로 가장 정석
- 단점: 내부테스트 긴급 안정화에는 작업량이 더 큼

## 결론

이전 AAB와 현재 최종 push의 결정적 차이는 Google 로그인 코드 자체가 아니라, `게임 시작` 버튼이 로그인 강제 트리거가 된 점이다.

따라서 “테스터가 로그인에서 멈출 수 있냐”의 답은:

- 상단 `Google 로그인` 직접 버튼 기준: 반복 테스트 통과
- 현재 `게임 시작` 기준: 로그인 popup이 필수 경로가 되어, 실제 Android WebView에서 문제가 생기면 게임 시작 자체가 막힐 수 있음

내부테스트 안정성을 우선하면 `게임 시작`은 이전처럼 게스트/닉네임 진입을 허용하도록 되돌리는 것이 가장 안전하다.

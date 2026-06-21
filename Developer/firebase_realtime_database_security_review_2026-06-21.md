# Firebase Realtime Database Security Review - 2026-06-21

## 목적

Google 로그인과 Firebase Realtime Database 저장 기능을 사용할 때 필요한 데이터 보안 기준을 정리한다.

현재 프로젝트 저장 경로:

```text
users/{uid}
```

현재 저장 데이터:

- `profile.uid`
- `profile.displayName`
- `profile.email`
- `profile.photoURL`
- `schemaVersion`
- `updatedAt`
- `progress.goldTotal`
- `progress.records`
- `progress.weaponUnlocks`
- `progress.passiveUpgrades`
- `progress.titleSettings`

## 1차 필수 보안 규칙

Realtime Database Rules는 서버에서 적용되는 접근 제어 규칙이다. Firebase 공식 문서 기준으로 읽기와 쓰기는 규칙이 허용할 때만 완료된다.

현재 프로젝트는 유저별 저장 경로가 `users/{uid}`이므로, 최소 규칙은 다음처럼 잡는다.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

의미:

- 로그인하지 않은 사용자는 아무 데이터도 읽거나 쓸 수 없다.
- 로그인한 사용자도 자기 `uid` 아래의 데이터만 읽고 쓸 수 있다.
- 다른 사용자의 진행 데이터는 읽거나 수정할 수 없다.

## 2차 권장 규칙: 데이터 모양 제한

위 1차 규칙은 접근 권한을 막는 데 충분한 출발점이지만, 저장 데이터의 모양까지 제한하지는 않는다.

다음 단계에서는 `.validate` 규칙을 추가해 타입과 범위를 제한해야 한다.

권장 방향:

- `schemaVersion`은 숫자만 허용한다.
- `updatedAt`은 문자열만 허용한다.
- `progress.goldTotal`은 0 이상의 숫자만 허용한다.
- `profile.email`은 꼭 필요하지 않으면 저장하지 않는다.
- `profile.photoURL`도 게임 진행 저장에 필요하지 않으면 저장하지 않는다.
- `records`, `weaponUnlocks`, `passiveUpgrades`, `titleSettings`는 프로젝트에서 사용하는 키만 허용한다.

예시 방향:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "schemaVersion": {
          ".validate": "newData.isNumber()"
        },
        "updatedAt": {
          ".validate": "newData.isString()"
        },
        "progress": {
          "goldTotal": {
            ".validate": "newData.isNumber() && newData.val() >= 0"
          }
        }
      }
    }
  }
}
```

주의: 위 예시는 출발점이다. 실제 적용 전에는 현재 저장 구조 전체에 맞춰 `records`, `weaponUnlocks`, `passiveUpgrades`, `titleSettings`의 허용 키를 더 구체화해야 한다.

## 개인정보 최소화

게임 진행 저장에는 보통 이메일이 필요하지 않다.

현재 `profile`에는 `uid`, `displayName`, `email`, `photoURL`이 저장된다. 보안과 개인정보 최소화 관점에서는 다음처럼 줄이는 것이 좋다.

우선 유지:

```text
uid
displayName
```

필요할 때만 저장:

```text
email
photoURL
```

이유:

- `uid`는 사용자별 저장 경로와 식별에 필요하다.
- `displayName`은 화면 표시용으로 유용할 수 있다.
- `email`은 게임 진행 저장에는 보통 필요하지 않다.
- `photoURL`은 표시 기능이 없으면 저장하지 않아도 된다.

## 치트와 랭킹 위험

현재 구조는 브라우저 클라이언트에서 로컬 진행 정보를 읽고 Firebase에 저장한다.

이 방식은 개인 진행도 저장에는 충분하지만, 경쟁 데이터에는 부족하다.

주의해야 할 데이터:

- `progress.goldTotal`
- `progress.records`
- `progress.weaponUnlocks`
- `progress.passiveUpgrades`

이 값들은 사용자가 브라우저 개발자 도구나 `localStorage` 조작으로 바꿀 수 있다. 따라서 다음 기능에는 클라이언트 저장값을 그대로 믿으면 안 된다.

- 공개 랭킹
- 이벤트 보상
- 유료 재화
- 다른 유저와 비교되는 점수
- 서버가 보장해야 하는 업적

경쟁 기능을 만들 때 권장 구조:

- 클라이언트는 결과를 요청만 한다.
- Cloud Functions 같은 서버 코드가 점수와 보상을 검증한다.
- 검증된 결과만 Realtime Database에 기록한다.

## App Check 권장

Firebase Authentication은 "누가 로그인했는지"를 확인한다.

App Check는 "요청이 내 앱에서 온 것인지"를 확인한다.

두 기능은 역할이 다르며 함께 쓰는 것이 좋다.

권장 순서:

1. Firebase Console > Security > App Check로 이동한다.
2. Web 앱에 App Check를 등록한다.
3. reCAPTCHA v3 또는 reCAPTCHA Enterprise를 선택한다.
4. 앱에 App Check SDK를 추가한다.
5. 먼저 모니터링으로 정상 사용자 요청이 문제없는지 확인한다.
6. 문제가 없으면 Realtime Database enforcement를 켠다.

주의:

- App Check는 남용을 줄이는 장치이지 모든 공격을 없애는 장치는 아니다.
- 로컬 개발과 CI에는 debug provider 또는 debug token 관리가 필요할 수 있다.

## Firebase API 키 취급

Firebase 웹 설정의 `apiKey`는 일반 서버 비밀번호 같은 비밀키가 아니다. Firebase 공식 문서 기준으로, Firebase 서비스에 제한된 API 키는 코드나 설정 파일에 포함될 수 있다.

그래도 다음은 지킨다.

- `.env.local`은 커밋하지 않는다.
- `.env.example`에는 값 없이 키 이름만 남긴다.
- Google Cloud Console에서 API 키 제한이 Firebase 사용 목적과 맞는지 확인한다.
- 실제 권한 제어는 API 키가 아니라 Firebase Authentication, Realtime Database Rules, App Check로 한다.

## 이 프로젝트의 권장 실행 순서

1. Firebase Console의 Realtime Database Rules에 1차 필수 보안 규칙을 적용한다.
2. `profile.email`, `profile.photoURL` 저장 필요 여부를 결정한다.
3. 필요 없다면 `src/lib/firebaseProgress.js`의 `buildCloudUserProfile()`에서 저장하지 않도록 줄인다.
4. `.validate` 규칙으로 저장 데이터 타입과 범위를 제한한다.
5. App Check를 모니터링 모드로 붙인다.
6. 문제가 없으면 Realtime Database App Check enforcement를 켠다.
7. 공개 랭킹이나 보상 시스템을 만들 때는 Cloud Functions 기반 검증 저장 구조로 바꾼다.

## 참고한 공식 문서

- Firebase Realtime Database Security Rules: https://firebase.google.com/docs/database/security
- Realtime Database Rules conditions and `auth.uid`: https://firebase.google.com/docs/database/security/rules-conditions
- Firebase App Check: https://firebase.google.com/docs/app-check
- App Check with reCAPTCHA v3 for web: https://firebase.google.com/docs/app-check/web/recaptcha-provider
- Firebase API keys: https://firebase.google.com/docs/projects/api-keys

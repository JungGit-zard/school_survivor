# 보안 방어 설계 — 데이터 보존 · 로그인/데이터보안 · 안티치트 (2026-07-05)

## 0. 목적과 범위

Escape! zombie school은 Google 로그인을 게임 시작 필수 조건으로 두고, 진행도와 랭킹 점수를
Firebase Realtime Database(`users/{uid}`, `rankings/{seasonId}`)에 저장한다. 본 문서는 다음 3개
카테고리의 위협을 정리하고, **리포에서 버전관리·리뷰·배포 가능한 방어 수단**으로 구현한다.

- **데이터 보존(Data preservation)** — 저장 데이터의 무결성·형태 보장, 유실·오염 방지
- **로그인/데이터보안(Auth & data security)** — 접근 제어, 앱 우회 차단, 개인정보 최소화
- **유저 해킹(Anti-cheat)** — 랭킹 점수 위조 방지

선행 문서 `firebase_realtime_database_security_review_2026-06-21.md`의 권고를 **버전관리되는 실제
산출물**(규칙 파일·App Check 배선·코드 변경)로 승격한 것이다. 그 문서는 배경 설명으로 계속 유효하다.

## 1. 위협 모델 (현행 실태 기준)

| # | 자산 | 공격 | 현행 방어 | 위험 |
|---|---|---|---|---|
| T1 | `users/{uid}` 진행도 | 타 유저 데이터 읽기/쓰기 | 규칙이 리포에 없음(Console 의존) | 규칙 드리프트 시 전면 노출 |
| T2 | `users/{uid}` 형태 | 임의 키·타입 주입으로 오염/비대화 | `.validate` 없음 | 데이터 무결성 훼손 |
| T3 | DB 전체 | API 키로 앱 우회 REST 직접 호출 | App Check 미적용 | 대량 남용·자동화 공격 |
| T4 | `rankings/.../entries/{uid}` | 점수 위조(예: 999999999) | 클라이언트 "기존≥신규면 무시"만 | **랭킹 신뢰 붕괴** |
| T5 | 개인정보 | email/photoURL 불필요 저장 | 그대로 저장 | 최소화 원칙 위반 |

핵심: **클라이언트가 곧 신뢰 경계**다. localStorage·개발자도구·REST로 모든 저장값을 조작할 수 있다.
따라서 방어는 서버(보안 규칙 + App Check)에서 강제해야 한다.

## 2. 방어 설계

### 2.1 버전관리 보안 규칙 — T1, T2, T4 (데이터 보존 + 접근제어 + 안티치트 1차)

`Developer/r3f_prototype/database.rules.json` + `firebase.json`을 리포에 두어 규칙을 코드 리뷰·배포
대상으로 만든다. 규칙 원칙:

- **기본 deny**: 루트 `.read/.write = false`. 명시 허용 경로만 접근 가능.
- **소유권**: `users/$uid`, `rankings/.../$uid` 쓰기는 `auth.uid === $uid`인 본인만.
- **형태 검증(`.validate`)**: 타입·범위·허용 키 제한. `profile`은 알려진 키만(그 외 거부).
- **랭킹 읽기 공개**: 리더보드는 `auth != null` 유저에게 읽기 허용. `.indexOn: ["score"]`로
  `orderByChild('score')` 쿼리 지원.
- **점수 단조 증가**: `!data.exists() || newData.child('score').val() >= data.child('score').val()`.
  점수를 낮추는 조작을 서버가 거부(클라이언트 로직을 서버로 이중화).
- **점수 상한(sanity cap)**: 정상 최대치(수천 단위)를 절대 거부하지 않도록 **넉넉한 캡**(1,000,000).
  터무니없는 값만 차단.

> 규칙의 한계: 규칙은 "소유권 + 형태 + sanity"만 강제할 수 있고, "이 점수가 실제 플레이에서
> 나왔는가"는 판정하지 못한다. 인증된 유저가 앱 토큰으로 캡 이하의 위조 점수를 밀어넣는 경로는
> 규칙만으로 막지 못한다 → **잔여 위험 R1**(§4).

### 2.2 App Check — T3 (앱 우회 차단)

`firebase/app-check`의 `ReCaptchaV3Provider`를 `createFirebaseAuthClient`의 앱 초기화 직후 배선한다.

- `VITE_FIREBASE_APPCHECK_KEY`(reCAPTCHA v3 site key)가 있을 때만 활성 → 없으면 완전 no-op.
  로컬 개발·CI·기존 테스트에 무영향.
- 로그인이 항상 최초 앱 초기화 경로이므로 여기 한 곳이면 progress/ranking DB 호출에도 적용.
- Firebase Console에서 RTDB App Check **enforcement**를 켜면, App Check 토큰 없는 요청(순수 REST
  스크립트 등)은 거부된다. T3·T4를 함께 완화.

### 2.3 개인정보 최소화 — T5

`buildCloudUserProfile`이 DB에 저장하는 필드를 `{uid, displayName, nickname}`으로 축소.
email/photoURL 저장 중단. UI(`GoogleAccountPanel`)는 live auth user에서 값을 읽으므로 영향 없음.

## 3. 배포 런북 (규칙·App Check 실제 적용)

리포의 규칙 파일은 배포되어야 서버에 강제된다. 배포에는 Firebase project 접근 권한이 필요하다.

```bash
# 1) 규칙 배포 (firebase-tools는 전역/npx로만 사용, 프로젝트 의존성에 추가하지 않음)
cd Developer/r3f_prototype
npx firebase-tools deploy --only database --project <FIREBASE_PROJECT_ID>

# 2) App Check
#   Console > App Check > 웹 앱 등록 > reCAPTCHA v3 site key 발급
#   → 그 키를 .env.local의 VITE_FIREBASE_APPCHECK_KEY 로 설정, 재빌드
#   먼저 "모니터링" 모드로 정상 요청 통과 확인 후 RTDB enforcement ON
```

> `.firebaserc`/project id는 비밀이라 커밋하지 않는다. `--project` 플래그로 지정한다.
> **적용 검증**: 배포 후 로그아웃 상태 REST 읽기 시도가 거부되는지, 타 uid 쓰기가 거부되는지,
> 캡 초과 점수 쓰기가 거부되는지 확인한다.

## 4. 잔여 위험과 향후 과제

- **R1 (안티치트 상한선)**: 인증 유저가 캡 이하 위조 점수를 제출하는 경로는 규칙만으로 못 막는다.
  진짜 서버 권위 점수 검증은 **Cloud Functions**로 세션을 서버가 재계산/검증한 뒤 기록하는 구조가
  필요하다. Blaze 요금제·배포 인프라가 전제라 이번 범위에서 제외. 규칙의 sanity cap + 단조증가 +
  App Check로 "쉬운 치트"는 차단하고, 상한선 방어는 Functions 도입 시 완성한다.
- **R2**: 규칙 배포 자동화(CI). 현재는 수동 `firebase deploy`. 규칙 파일이 리포에 있으므로 이후
  CI 스텝으로 승격 가능.

## 5. 구현 산출물 (본 작업)

- `Developer/r3f_prototype/database.rules.json` — 버전관리 RTDB 보안 규칙
- `Developer/r3f_prototype/firebase.json` — 규칙 배포 설정
- `src/lib/firebaseAuth.js` — App Check env-gated 배선
- `src/lib/firebaseProgress.js` — 프로필 저장 필드 최소화
- `src/lib/databaseRules.test.js` — 규칙 핵심 방어 존재 검증(회귀 방지)

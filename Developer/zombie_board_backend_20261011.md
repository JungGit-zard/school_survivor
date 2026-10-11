# Zombie board backend boundary — 2026-10-11

## 최종 Advisor 검증 (2026-10-11 20:07 KST)
- 아래 초안의 정규식 설명을 대체한다. 서버는 `String.replace`로 공백·탭·CR·LF를 제거한 길이를 검사한다. 정상 여러 줄 본문은 허용한다. 사용 중인 RTDB emulator에서 `\S`는 컴파일 오류가 나므로 사용하지 않는다.
- 읽기는 `createdAt` 순서와 명시적인 양수 `limitToLast`를 요구한다(글 50, 댓글 100). `before: {createdAt, id}` 커서로 이전 기록까지 조회한다.
- Advisor 직접 실행: `firebaseBoard.test.js` 10개 통과. `verify-zombie-board-rules.mjs`의 익명/일반 사용자 작성, 관리자 삭제, 무권한 수정/삭제 거부, 부모 없는 댓글 거부, 공백/여러 줄 입력, 제한 없는 읽기 거부 및 커서 조회 모두 통과.
- 검증은 `demo-zombie-board-rules` 로컬 emulator에서만 수행했다. 실제 Google OAuth 로그인 검증과 구별하며 운영 데이터에 테스트 글을 게시하지 않았다.

## 범위

- 작업 카드: `t_628dc895`
- 담당: `backendmini`
- 구현 루트: `zombieBoard/v1`
- 소유 파일:
  - `Developer/r3f_prototype/src/lib/firebaseBoard.js`
  - `Developer/r3f_prototype/src/lib/firebaseBoard.test.js`
  - `Developer/r3f_prototype/scripts/verify-zombie-board-rules.mjs`
  - `Developer/r3f_prototype/database.rules.json`의 `zombieBoard` board-only 추가

UI는 `uimini` 소유라 이 기록은 Firebase/RTDB 경계와 API 계약만 다룬다.

## 클라이언트 API 계약

`src/lib/firebaseBoard.js`는 아래 API를 제공한다.

- `subscribeBoardPosts(onData, onError, options)`
  - 즉시 unsubscribe 함수를 반환한다.
  - 내부 Firebase 초기화가 비동기라 취소 guard를 둔다.
  - `zombieBoard/v1/posts`를 `createdAt` 기준 `limitToLast(50)`로 구독한다.
  - `options.before = { createdAt, id }`가 있으면 `endBefore(createdAt, id)`를 `limitToLast(50)` 앞에 붙여 오래된 글 페이지를 bounded read로 조회한다. 기본 호출 계약은 그대로다.
  - 반환 항목은 `{ id, title, body, nickname, createdAt }`만 포함한다.
- `subscribeBoardComments(postId, onData, onError, options)`
  - 즉시 unsubscribe 함수를 반환한다.
  - `zombieBoard/v1/comments/{postId}`를 `createdAt` 기준 `limitToLast(100)`으로 구독한다.
  - `options.before = { createdAt, id }`가 있으면 `endBefore(createdAt, id)`를 `limitToLast(100)` 앞에 붙여 오래된 댓글 페이지를 bounded read로 조회한다. 기본 호출 계약은 그대로다.
  - 반환 항목은 `{ id, body, nickname, createdAt }`다.
- `createBoardPost({ title, body, nickname })`
  - title/body는 문자열 trim 후 공백만 있으면 거부한다.
  - nickname은 공백이면 `익명`으로 저장한다.
  - Firebase `set()` 완료를 await한 뒤 post id를 반환한다. 로컬 성공처럼 먼저 보고하지 않는다.
- `createBoardComment(postId, { body, nickname })`
  - 댓글은 flat post-keyed collection `comments/{postId}/{commentId}`에 저장한다.
  - nickname fallback은 `익명`이다.
  - Firebase `set()` 완료 후 comment id를 반환한다.
- `deleteBoardPost(postId)`
  - `update(zombieBoard/v1, { posts/{postId}: null, comments/{postId}: null })`로 post와 해당 댓글 묶음을 관리자 권한에서 원자적으로 삭제한다.
- `deleteBoardComment(postId, commentId)`
  - `comments/{postId}/{commentId}`만 삭제한다. 실제 권한은 RTDB rules가 제한한다.

## 데이터 형태

```text
zombieBoard/v1/posts/{postId}
  title: string, 1..120, 공백-only 금지
  body: string, 1..4000, 공백-only 금지
  nickname: string, 1..24, 공백-only 금지
  createdAt: server timestamp number

zombieBoard/v1/comments/{postId}/{commentId}
  body: string, 1..1000, 공백-only 금지
  nickname: string, 1..24, 공백-only 금지
  createdAt: server timestamp number
```

저장하지 않는 것:

- uid
- email
- Google profile
- admin/client role flag
- HTML/attachment metadata

## 보안 규칙 경계

`database.rules.json`에는 기존 root deny 기본값을 유지한 채 `zombieBoard/v1`만 추가했다.

- 공개 읽기:
  - `zombieBoard/v1/posts`는 `query.orderByChild === 'createdAt' && query.limitToLast <= 50`일 때만 읽을 수 있다.
  - `zombieBoard/v1/comments/{postId}`는 `query.orderByChild === 'createdAt' && query.limitToLast <= 100`일 때만 읽을 수 있다.
  - `zombieBoard/v1/comments` root 전체 읽기는 허용하지 않는다.
  - 클라이언트 구독은 `createdAt` index, 고정 `limitToLast`, 선택적 `endBefore` cursor를 사용한다.
- 공개 작성:
  - 로그인 여부와 무관하게 새 post 생성만 허용한다.
  - 기존 post edit/delete는 금지한다.
  - post 생성 시 `comments`, `uid`, `email`, `admin` 같은 unknown key smuggle은 `$other: false`로 거부한다.
  - 새 comment 생성만 허용한다.
  - comment 생성은 `root.child('zombieBoard/v1/posts').child($postId).exists()`가 참일 때만 허용해 missing-parent/orphan 생성을 막는다.
- 관리자 권한:
  - `auth.token.email === 'zard5388@gmail.com'`
  - `auth.token.email_verified === true`
  - `auth.token.firebase.sign_in_provider === 'google.com'`
  - 위 조건일 때 post/comment 삭제 및 쓰기가 가능하다.
- shape/length:
  - post title 120, post body 4000, comment body 1000, nickname 24로 UI 공유 계약과 맞췄다.
  - 서버 rules에서 space/tab/newline/CR-only 문자열은 `matches(/.*[^ \\x09\\x0A\\x0D].*/)`로 거부하고, 일반 multiline textarea body는 허용한다. 클라이언트 trim 검증도 공백-only 입력을 먼저 거부한다.
  - `createdAt`은 `now ± 300000ms` 범위의 number만 허용한다.

## 제한

- Firebase RTDB 직접 anonymous write에는 견고한 spam throttle/rate limit이 없다. 이 구현은 rate limiting을 제공한다고 주장하지 않는다.
- Cloud Functions, App Check enforcement, server moderation queue는 이번 범위가 아니다.
- 실제 사용자 Firebase에 쓰기/배포하지 않았다.

## 검증

실행한 검증:

```text
npm test -- --run src/lib/firebaseBoard.test.js
```

결과:

```text
Test Files  1 passed (1)
Tests       10 passed (10)
```

RTDB emulator rule proof:

```text
export JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'
export PATH="$JAVA_HOME/bin:$PATH"
firebase emulators:exec --only database --project demo-zombie-board-rules 'node scripts/verify-zombie-board-rules.mjs'
```

확인한 rule 동작:

- guest public post create: ALLOW
- ordinary signed-in public post create: ALLOW
- guest post edit/delete: DENY
- ordinary post delete: DENY
- unverified master delete: DENY
- missing-parent comment: DENY
- existing-parent guest comment create: ALLOW
- guest comment edit/delete: DENY
- whitespace-only title/body, newline-only body, unknown key, nested-comment smuggle, too-long post/comment body: DENY
- multiline textarea post body: ALLOW
- unbounded posts read, over-limit posts read, unbounded comments root read, over-limit comments read: DENY
- bounded posts/comments read and bounded before-cursor posts/comments read: ALLOW
- verified Google master create/delete: ALLOW
- verified Google master atomic post+comments delete: ALLOW
- parent delete 후 late comment: DENY
- script result: `ZOMBIE_BOARD_RULES_EMULATOR_OK`

추가 정적 검증:

```text
node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8')); console.log('DATABASE_RULES_JSON_OK')"
git diff --check -- database.rules.json src/lib/firebaseBoard.js src/lib/firebaseBoard.test.js scripts/verify-zombie-board-rules.mjs ../zombie_board_backend_20261011.md
```

## 배포/롤아웃 명령

이번 작업에서는 배포하지 않았다. 리뷰 후 규칙만 배포할 때의 명령 후보:

```text
cd C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/r3f_prototype
firebase deploy --only database --project <firebase-project-id>
```

배포 전 확인:

1. `database.rules.json`에 기존 `users`, `studioWorkspaces`, `runtimeControl`, `rankingService` subtree 변경이 섞이지 않았는지 diff 확인.
2. `src/lib/firebaseBoard.test.js` 통과.
3. 위 RTDB emulator rule proof 재실행.
4. live rules overwrite를 피하려면 현재 운영 rules를 먼저 백업/비교한 뒤 `zombieBoard` 추가분만 반영한다.

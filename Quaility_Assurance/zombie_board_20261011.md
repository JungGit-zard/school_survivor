# Zombie Board targeted QA - 2026-10-11

## Final Advisor verification — 2026-10-11 20:10 KST
- 아래 초안 FAIL 항목은 수정 후 재검증했다. flat comments 경로, 일반 로그인 사용자 작성, 일치하는 길이 제한, 입력 자동 잘림 제거, 현재 구독/화면 상태 보호, 이전 글/댓글 페이지 이동을 확인했다.
- 직접 실행: backend 집중 검사 10/10, UI/홈페이지 관련 검사 15/15(무관한 10개 생략), 로컬 demo RTDB 규칙 검사 전체 통과.
- 규칙 검사는 익명/일반 사용자 작성 허용, 일반 사용자 수정/삭제 거부, 이메일 미인증 관리자 거부, 검증된 관리자 글+댓글 일괄 삭제, 고아 댓글 방지, 여러 줄 입력, 공백 입력 거부, 읽기 제한과 커서를 실제 emulator로 검증했다.
- 실제 운영 Google OAuth 로그인은 검증하지 않았다. 기존 로그인 구현을 변경하지 않고 재사용했다. 위 관리자 검증은 emulator 권한 검사이며 실계정 로그인 증거로 표현하지 않는다.
- 운영 rules를 배포 전 백업하고 기존 6개 root가 완전히 동일함을 비교했다. 변경은 zombieBoard 추가뿐이며 규칙 배포 성공. 운영 데이터에 테스트 글/댓글을 쓰지 않았다.
- 1280px 버튼 정렬과 390px 게시판/글쓰기 화면 확인. 운영 Firebase의 빈 목록을 오류 없이 읽었다. 캡처: C:/Users/admin/AppData/Local/Temp/zombie-board-write-mobile.png.

## Scope
- Kanban: `t_6ac076da` / balanceqa
- 요청 범위: 익명 자유게시판 권한/보안/정확성 및 pending UI 동작 리뷰
- 코드 수정 없음. QA 기록 파일만 작성.
- 브라우저/라이브 DB 쓰기 없음.

## Mandatory gate / documents
- 선행 게이트는 이 작업의 첫 명령으로 실행됨:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "zombie board review"`
- 확인된 matched domains/evidence는 이전 작업 로그 기준으로 `balanceqa` 기본 도메인과 zombie board 관련 문서 매칭이 포함됨.
- 읽은 필수 문서:
  - `AGENTS.md`
  - `project_develop_policy.md`
  - `Bang_Rules.md`
  - checker가 반환한 `Developer/agent_room/...` zombie school/balanceqa 관련 필수 문서
- 주의: 현재 세션의 root `AGENTS.md`는 시스템 주입 단계에서 invisible unicode 경고가 있었으므로, 파일 내용은 도구로 직접 확인한 내용과 mandatory checker 결과만 근거로 사용.

## Reviewed files
- `Developer/r3f_prototype/src/lib/firebaseBoard.js`
- `Developer/r3f_prototype/database.rules.json`
- `Developer/r3f_prototype/src/components/ZombieBoard.jsx`
- `Developer/r3f_prototype/src/components/WebLandingPage.jsx`
- `Developer/r3f_prototype/src/components/zombieBoardCopy.js`
- `Developer/r3f_prototype/src/lib/firebaseBoard.test.js`
- `Developer/r3f_prototype/src/components/ZombieBoard.test.jsx`

## Commands run and exact results

### Focused board tests
Command:
```bash
cd C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/r3f_prototype
npm test -- --run src/lib/firebaseBoard.test.js src/components/ZombieBoard.test.jsx
```

Result:
```text
branch guard: ok
Legacy B02 source gate passed.
Dialogue store gate passed (451 Korean IDs).
Studio-game sync source contract passed.

RUN v4.1.6 C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/r3f_prototype

src/lib/firebaseBoard.test.js: 8 tests | 1 failed
src/components/ZombieBoard.test.jsx: passed
Test Files 1 failed | 1 passed (2)
Tests 1 failed | 12 passed (13)
```

Failure excerpt:
```text
FAIL src/lib/firebaseBoard.test.js > firebaseBoard public anonymous board client > subscribes to bounded newest comments under a single post and can cancel before async client resolves
AssertionError: expected "vi.fn()" to be called with arguments: [...]
Expected path: "zombieBoard/v1/posts/postA/comments"
Received path: "zombieBoard/v1/comments/postA"
Assertion location: src/lib/firebaseBoard.test.js:149
```

### Git status snapshot
Command:
```bash
git status --short
```
Result:
```text
M Developer/r3f_prototype/database.rules.json
M Developer/r3f_prototype/src/components/WebLandingPage.jsx
?? Developer/r3f_prototype/Developer/zombie_board_backend_20261011.md
?? Developer/r3f_prototype/Developer/zombie_board_ui_20261011.md
?? Developer/r3f_prototype/src/components/ZombieBoard.jsx
?? Developer/r3f_prototype/src/components/ZombieBoard.test.jsx
?? Developer/r3f_prototype/src/components/zombieBoardCopy.js
?? Developer/r3f_prototype/src/lib/firebaseBoard.js
?? Developer/r3f_prototype/src/lib/firebaseBoard.test.js
```

## Blockers

### B1. Backend schema is not unified: implementation uses flat comments, rules/tests still expect nested comments
Severity: Blocker / correctness + security proof blocker

Evidence:
- Implementation writes/comments under flat path:
  - `src/lib/firebaseBoard.js:129-131` subscribes to `${BOARD_ROOT}/comments/${safePostId}`.
  - `src/lib/firebaseBoard.js:156-158` pushes to `${BOARD_ROOT}/comments/${safePostId}`.
  - `src/lib/firebaseBoard.js:165-168` admin delete removes both `posts/${safePostId}` and `comments/${safePostId}`.
- Rules still validate nested comments under posts:
  - `database.rules.json:243-267` defines `zombieBoard/v1/posts/$postId/comments/$commentId`.
  - `database.rules.json:257` checks `newData.parent().parent().child('title').exists()`, which only makes sense for nested comments.
- Test still expects nested path:
  - `src/lib/firebaseBoard.test.js:149` expects `zombieBoard/v1/posts/postA/comments`.
- Focused board test failed because implementation path and test/rules path differ.

Repro:
1. Run focused board tests above.
2. Observe expected nested path vs received flat path mismatch.

Risk:
- Current client comment writes are not proven to be allowed by deployed rules.
- Missing-parent comments cannot be considered prevented for the actual client path until rules and implementation share one schema.
- Admin atomic post+comments deletion only works for whichever schema is selected; currently rules and implementation disagree.

Required before PASS:
- Choose one schema and align all of: `firebaseBoard.js`, `database.rules.json`, `firebaseBoard.test.js`, and any UI assumptions.
- Re-run focused board tests.
- Provide emulator proof for guest/ordinary signed-in/admin permissions if backend worker has emulator available. Static substring tests are not auth proof.

### B2. Public create permissions do not satisfy requirement for ordinary signed-in users
Severity: Blocker / permissions

Evidence:
- Requirement: guest AND ordinary signed-in can create.
- Current rules for posts allow admin OR anonymous guest only:
  - `database.rules.json:249`: create branch includes `(auth == null && !data.exists() && newData.exists() ...)`.
- Current nested comment rule also allows admin OR anonymous guest only:
  - `database.rules.json:257`: `(auth == null && !data.exists() && newData.exists() ...)`.

Repro:
1. Attempt to create a valid post/comment with a non-admin authenticated user.
2. Rule branch does not permit it because `auth != null` and user is not admin.

Risk:
- A normal Google-signed-in player can read but cannot write, contradicting requested minimal public forum behavior.

Required before PASS:
- Rules must allow valid creates for both `auth == null` and ordinary non-admin `auth != null`, while preserving admin-only update/delete.
- Must be verified with emulator or equivalent rule evaluation, not only string/static tests.

### B3. Backend/API/UI max lengths are mismatched
Severity: Blocker / user-visible behavior + rule rejection

Evidence:
- API/client limits:
  - `src/lib/firebaseBoard.js:4-10`: title 120, postBody 4000, commentBody 1000, nickname 24.
  - `src/components/ZombieBoard.jsx:6`: title 120, body 4000, comment 1000, nickname 24.
- Rules limits:
  - `database.rules.json:250`: title <= 80.
  - `database.rules.json:251`: body <= 1000.
  - `database.rules.json:252`: nickname <= 20.
  - `database.rules.json:259-260`: comment body <= 1000, nickname <= 20.

Repro:
1. Enter a 120-character title or 4000-character post body accepted by UI maxLength.
2. Submit.
3. Rules reject because title/body/nickname limits are lower.

Risk:
- User can type and attempt valid-looking UI input that backend rejects.
- Requirement says APIs/UI/backend limits title120/post4000/comment1000/nick24 identical; current rules fail this.

Required before PASS:
- Align rules to 120/4000/1000/24 or lower every client/UI limit consistently.

### B4. UI silently truncates values before submit instead of validating exact limits
Severity: Blocker / correctness, stale draft safety

Evidence:
- `src/components/ZombieBoard.jsx:141-145` uses `.trim().slice(0, LIMITS.title/body/nickname)` for post payload.
- `src/components/ZombieBoard.jsx:170-172` uses `.trim().slice(0, LIMITS.comment/nickname)` for comment payload.

Repro:
1. Paste over-limit text into the form using script/devtools or any path bypassing `maxLength`.
2. Submit.
3. Payload is silently cut and posted instead of showing a validation error.

Risk:
- User data can be altered without notice.
- QA cannot verify server/client exact limit behavior because client masks over-limit values.

Required before PASS:
- Validate trimmed values and show `required/too long` style error; do not silently truncate.
- Add test proving over-limit data does not call create API with truncated text.

### B5. Comment async callbacks and submit completion use stale selectedPostId closure
Severity: Blocker / pending UI race

Evidence:
- `src/components/ZombieBoard.jsx:115-122` captures `postId` but compares callback against `selectedPostId` from the effect closure.
- `src/components/ZombieBoard.jsx:184-188` clears comment draft after await only if `selectedPostId === postId` from the submit closure.

Repro:
1. Open post A.
2. Start loading/submitting a comment for A.
3. Switch to post B or close/reopen before callback/await completes.
4. Closure can evaluate against stale `selectedPostId` captured before the latest navigation state.

Risk:
- Comments/error state can be applied to the wrong visible context or a draft may be cleared/retained incorrectly after close/reopen.
- Advisor also flagged this race in the Kanban thread.

Required before PASS:
- Use a ref/current token or cancellation guard that checks the latest selected post/open state at callback resolution time.
- Add regression test for closed+reopened dialogs and pending mutation completion.

## Observations / non-blocking confirmations

### O1. Landing button wiring now exists
- `src/components/WebLandingPage.jsx:187-192` includes the board action link in hero actions.
- `src/components/WebLandingPage.jsx:407-412` renders `<ZombieBoard open={isBoardOpen} ...>`.
- I sent a correction comment to UI task `t_682f86a3` that the earlier “not wired” observation is resolved.

### O2. React text rendering does not introduce obvious raw HTML XSS in reviewed component
- Post/comment title/body/nickname are rendered as JSX text nodes in `ZombieBoard.jsx:242-248`, `268-283`.
- No `dangerouslySetInnerHTML` found in reviewed board component.
- This is static code review only; no browser/live DB write performed.

### O3. Bounded client reads exist in implementation
- `src/lib/firebaseBoard.js:98-107` uses `orderByChild('createdAt')` + `limitToLast(limit)`.
- `BOARD_LIMITS.posts=50`, `comments=100` at `src/lib/firebaseBoard.js:4-10`.
- However, rules/schema mismatch in B1 prevents PASS until the actual chosen comments path is covered and tested.

### O4. Actual Google login/admin behavior not verified
- `ZombieBoard.jsx:10-12` reuses auth store user and `isProjectMaster(authUser)`.
- Admin login button calls existing `signInWithGoogle` at `ZombieBoard.jsx:298`.
- Per task instruction, mocks/static review are not actual Google login proof; I do not mark live Google admin login verified.

## Sent Kanban comments
- To backend task `t_628dc895`:
  - Backend static blockers: schema mismatch, guest-only creates, length mismatch, emulator proof requirement.
  - Focused test failure details after running the board tests.
- To UI task `t_682f86a3`:
  - UI blockers: silent `.slice` truncation, stale selectedPostId/pending callback race.
  - Follow-up correction that landing button wiring is now present.

## Final QA status
FAIL / BLOCKED

The current board implementation is not ready for Stage 1 playable loop integration. Primary blockers are schema/rules/client mismatch, create permissions excluding ordinary signed-in users, rule/client length mismatch, silent UI truncation, and stale pending-comment guards. Focused board tests currently fail 1/13, so this cannot be accepted as verified.

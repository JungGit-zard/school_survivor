# Zombie School homepage board UI — 2026-10-11

## 범위
- 공식 홈페이지 `WebLandingPage.jsx`의 주요 액션 줄을 게임 시작 / 만화 / 음악 / 영상 / 자유게시판 5개 액션으로 맞췄다.
- `ZombieBoard.jsx`는 `/landing` 안에서 열리는 접근성 대화상자 형태의 최소 자유게시판 UI다.
- 게시글/댓글 읽기·작성은 로그인 없이 가능하며 닉네임 공란은 익명으로 표시한다.
- 삭제 버튼은 기존 `isProjectMaster(user)` 판정의 관리자에게만 보인다.

## UI/접근성 메모
- 게시판은 `role="dialog"`, `aria-modal="true"`, Escape 닫기, 포커스 복귀, 간단한 Tab 포커스 순환을 포함한다.
- 사용자 입력 텍스트는 React text node로 렌더링하고 `innerHTML`을 사용하지 않는다.
- 모바일 기본 흐름은 목록 → 상세 → 목록, 목록 → 글쓰기 → 목록 모드다. 기존 게시글을 누르면 상세가 바로 열리고, 목록에는 제목/작성자/날짜/짧은 미리보기만 표시한다.
- 관리자 로그인은 헤더의 작은 텍스트 버튼으로 유지해 보드 반쪽을 차지하지 않게 했다.
- 버튼/입력은 최소 44px 터치 타깃을 유지한다.

## 데이터/오류 처리 메모
- UI 제출 payload는 `.slice()`로 조용히 자르지 않는다. 제목 120자, 본문 4000자, 댓글 1000자, 닉네임 24자를 maxLength와 제출 전 검증으로 처리한다.
- 구독 콜백과 댓글 제출 완료는 현재 선택 게시글 ref/request token으로 stale 완료가 다른 글의 draft/comment를 지우거나 덮지 않게 막는다.
- 읽기 실패 시 원시 `permission_denied` 같은 기술 문자열 대신 현지화된 실패/재시도 문구를 보여 주고, 성공적으로 빈 목록을 읽은 경우에만 empty 문구를 표시한다.

## 백엔드 경계
- 실제 Firebase API 파일 `../lib/firebaseBoard.js`는 backendmini 카드 `t_628dc895` 소유다.
- UI는 해당 모듈이 제공할 `subscribeBoardPosts`, `subscribeBoardComments`, `createBoardPost`, `createBoardComment`, `deleteBoardPost`, `deleteBoardComment` 인터페이스를 동적 import로 사용한다.
- 테스트는 API 주입 prop으로 mock API를 사용했다.

## 검증
- 실행 위치: `Developer/r3f_prototype`
- 명령: `npx vitest run src/components/ZombieBoard.test.jsx src/components/WebLandingPage.test.jsx`
- 결과: `Test Files 2 passed (2)`, `Tests 22 passed (22)`
- jsdom 한계로 `HTMLMediaElement.pause()` 미구현 경고가 출력되지만 테스트는 통과했다.

## 제한
- 실제 관리자 Google OAuth와 Firebase 규칙 배포 상태는 이번 UI 카드에서 검증하지 않았다. backendmini API/규칙 완료 뒤 실제 Firebase 통합 검증이 필요하다.

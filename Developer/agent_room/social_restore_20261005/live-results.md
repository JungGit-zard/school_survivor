# 소셜 게시 자동화 복구 후 라이브 결과 (2026-10-05)

새 실행 ID는 `2026-10-05-2347-restore01`이다. 과거 게시 시도를 재실행하지 않았다.

## X (`@jungsilx`)

- 계정 메뉴에서 `Log out @jungsilx` 항목을 확인해 활성 계정을 검증했다.
- 일본어: 게시 및 확인 완료 — https://x.com/jungsilx/status/2107121171133329910
- 영어: 게시 및 확인 완료 — https://x.com/jungsilx/status/2107121239756308817
- 베트남어: 게시 및 확인 완료 — https://x.com/jungsilx/status/2107121331666063411
- 한국어: 게시 버튼을 한 번 눌렀으나 새 게시물 확인에 실패했다. 상태는 불확실하며 재시도하지 않았다.
- 영수증: `marketing/x_daily_zombie_school_posting/receipts/2026-10-05-2347-restore01.json`

## Facebook (`Hyun Uk Jung`, Friends)

- 프로필 세션 로그인 및 작성기 표시를 확인했다. 알 수 없는 초안은 없었다.
- 이전 일본어 실행 `2026-10-05-1400-facebook4`은 영수증이 `publish_intent`로 남아 있다. 피드에 일본어 본문과 두 링크, 이미지가 있는 12시간 전 게시물이 보였지만 텍스트 일부가 접혀 전체 일치 여부를 확인하지 못했다. 재게시하거나 기존 영수증을 수정하지 않았다.
- 새 실행에서 영어 본문과 이미지 1개, Friends 공개 범위를 검증한 뒤 게시를 한 번 눌렀다. 확인 도중 정확한 Facebook 탭이 두 개라 wrapper가 `Expected at most one exact Facebook tab; found 2`로 중단했다. permalink 확인 전이므로 영어 상태는 불확실하다. 재시도하지 않았고 베트남어/한국어도 게시하지 않았다.
- 새 실행 영수증: `Developer/agent_room/facebook_posting_receipts/2026-10-05-2347-restore01.json`
- 과거 영수증: `Developer/agent_room/facebook_posting_receipts/2026-10-05-1400-facebook4.json`

X는 일본어·영어·베트남어 3개 게시가 확인됐다. Facebook은 새 실행 게시물 검증이 0건이고 영어 상태는 불확실하다.

## 후속 복구 및 확인 (2026-10-06)

- wrapper 복구 action이 이전 실행 trace와 최신 탭 순서를 대조해 마지막에 추가된 Facebook 프로필 탭만 선택 후 한 번 닫았다. 결과는 Facebook 프로필 탭 1개였고 기존 탭을 선택했다. 게임 탭이나 다른 탭은 닫지 않았다.
- 복구 action 실행 직전 작성기 진단은 `wait`(작성기/초안 없음)였다. 이후 `OpenProfile` 재사용과 진단에서 Hyun Uk Jung 프로필 주소, 계정 marker, Facebook 탭 1개를 확인했다. 후속 ReadState는 `draft=null`, composer editor 0을 반환했으나 활성 탭은 Google Flow로 바뀌어 있었다.
- 새 영어 게시물의 verification-only 시도: `OpenNewestPost`가 후보 URL `https://www.facebook.com/hyunuk.jung.56/posts/pfbid0LHwaGf1mHjxKGzCgsh2zzzonSpDv8rtHJmBziMFyzBz12moLETn3efQwC6jr4fGel`을 반환했다. 단 한 번 실행한 `VerifyPost`는 주소 표시줄 경로가 해당 permalink와 일치하지 않아 거부됐다. 영수증은 여전히 `publish_intent`이며 검증 완료가 아니다. 재게시하지 않았다.
- 한국어 X는 포커스가 게임/Google Flow로 이동하는 경합이 있어 verification-only 실행을 생략했다. 불확실 영수증 상태를 보존했고 재게시하지 않았다.
- 보수정 wrapper 변경: `CloseDuplicateProfileTab`은 명시 HWND, 두 개 Facebook 탭, 기록상 마지막으로 생성된 탭, 프로필/계정/작성기 상태를 확인한 뒤에만 한 번 닫는다. `OpenProfileNewTab`은 Facebook 탭이 하나 있으면 재사용하고 두 개면 중단한다.
- 수정 전 원본 백업: `%TEMP%\fb_duplicate_tab_repair_20261005\`.
- 검증: 세 PowerShell 파일 파싱 통과, `Test-FacebookDailyZombieSchoolPosting.ps1` 통과 (`FACEBOOK_POSTING_TEST_OK`).

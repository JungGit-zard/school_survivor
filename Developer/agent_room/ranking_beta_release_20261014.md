# 무제한 누적·게스트 랭킹 베타 배포 — 2026-10-14

- 역할: launchmini / backendmini release Worker. Kanban `escape-zombie-school` / `t_75f70424`.
- 작업 저장소: `C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011`, `zombie_only`.
- 사용자 최신 명시: “무조건 즉시 배포해”, “베타버전이라 아무 상관없어”, “실행이 안되는 경우를 제외하고 모두 즉시적용한다.” 이번 베타 배포에 대해 이전 실제 Google OAuth 검증 대기 조건을 해제했다. Google OAuth 성공을 검증한 것으로 보고하지 않는다.
- mandatory precommand: launchmini / auto / ranking beta hosting. Required manifest와 역할 문서를 읽고 Kanban에 release override 댓글을 남겼다.

## Firebase 실제 적용

- Identity Toolkit `projects.updateConfig` 최소 PATCH `updateMask=signIn.anonymous.enabled`로 익명 로그인만 활성화했다.
- 직전과 직후 config GET 비교: 변경은 `signIn.anonymous` 하나이며 `enabled=true`를 확인했다. Google 설정 등 다른 config 보존.
- Realtime Database Rules는 HEAD 대비 이번 변경 leaf 5개만 반영했다: global/stage allTime read/write 4개 및 private guestProfiles 1개.
- 각 변경 leaf가 원격 기존값 또는 이번 값인지 확인한 후 기존 원격 전체 규칙에 병합했다. write 직전 재조회로 동시 변경 없음, 적용 직후 전체 병합값과 GET 결과 일치를 확인했다. 관계없는 원격 규칙은 보존했다.
- 배포 Worker는 rankingService 데이터에 쓰기·삭제를 수행하지 않았다. 기존 플레이어 점수, 18점 기록과 최초 snapshot을 보존했다.
- 원격 config/rules 배포 전후 원본 보관: `C:/Users/admin/AppData/Local/Temp/ranking-beta-release-20261014/`. 기존 최초 snapshot 폴더는 덮어쓰지 않았다. 저장 파일에 private config가 있으므로 공개 보고에 전문을 출력하지 않았다.

## Hosting

- 실행 명령: `npm.cmd run deploy:hosting:safe -- ranking-beta-20261014`.
- 기존 필수 predeploy → preview upload → preview JavaScript asset 검증 → live clone 승격 경로를 사용한다.
- 현재 배포 실행 중. 완료 결과는 아래에 추가한다.
- 실제 운영 화면 검증은 main Advisor가 수행한다. 새 방문 시 생성되는 guest 0점은 요청한 실제 기능 동작이며 삭제·복원하지 않는다. 실제 Google OAuth 성공 여부는 별도 미검증이다.
## 최종 배포 결과

- `npm.cmd run deploy:hosting:safe -- ranking-beta-20261014` 종료 코드 0.
- 필수 predeploy 테스트 45개 통과, production build 통과, dist JavaScript 61개 검증 통과, 76개 X 웹카드 생성.
- Preview: https://escape-zombie-school--ranking-beta-20261014-vpk6gdg3.web.app
- Preview 원격 JavaScript 61개 검증 통과 후 `ranking-beta-20261014` 채널을 `live`로 clone 승격했다.
- 실제 CLI: `Site escape-zombie-school channel ranking-beta-20261014 has been cloned to site escape-zombie-school channel live.`
- Live: https://escapezombie.com/ (Firebase 기본 주소 https://escape-zombie-school.web.app).
- 실제 화면 확인은 main의 새로고침 확인 결과를 따른다. 이번 release Worker는 실제 Google OAuth 성공을 주장하지 않는다.
- 범위 외 코드·사용자 Firebase 데이터 삭제/수정 없음. release Worker는 커밋/푸시하지 않았으며 main이 명시적 작업 경로만 승인한다.
## main 실제 운영 실행 확인

- 운영 root 타이틀 → 로그인 없이 진입 → 로비 자동 닉네임 `생존자-JG8SH3` 표시를 확인했다.
- 무제한 누적 기본 탭에서 0점 1위 및 recorded 상태를 확인했다. 설정의 닉네임 편집 입력칸/저장 버튼을 열었으며 저장값은 변경하지 않았다.
- Stage 1 입장 → 스토리 3장 통과 → 실제 게임 UI `00:08`, 점수 `8`, HP `100/100`을 오류 없이 확인했다. 검증 브라우저는 닫았다.
- 방문자의 0점과 이후 점수 8 등록은 요청한 실제 기능의 자연 동작이다. 사용자 기록 삭제·복원은 수행하지 않았다.
- 실제 Google OAuth 로그인 성공은 여전히 미검증이다.
- 코드 커밋 `d0cbb253` 및 원격 홍보 문서 3개 커밋 병합은 main이 수행했다. 이 기록 추가에는 새 원격 작업이나 테스트가 없다.
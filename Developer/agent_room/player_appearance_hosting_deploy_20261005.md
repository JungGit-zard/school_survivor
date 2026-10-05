# 주인공 신·구 설정 UI 웹 배포 기록 — 2026-10-05

- 사용자 요청: 게임 설정 화면에 주인공 외형 `신 / 구` UI 표시 및 실제 게임 반영.
- Kanban: `escape-zombie-school` / `t_f8758fce` / `launchmini`.
- Hermes의 이전 D 드라이브 경로 문제로 Advisor가 기록한 Codex Worker 대체 경로를 사용했다.
- 배포 소스: `zombie_only`, `5edf7a00a8a052245b69a369f832ad929f806bc6`.
- 원본의 미커밋 작업을 포함하지 않은 독립 clone에서 배포했다. 원격 최신 무기 변경도 같은 소스에 포함된다.

## 실행 및 결과

Advisor가 다음 명령을 실행하고 종료 코드 0 및 아래 결과를 확인했다.

```text
npm.cmd run deploy:hosting:safe -- appearance-20261005
```

- Firebase 환경변수, 브랜치, 구형 B02 차단, 대사 저장소 게이트 통과.
- Studio 사전 빌드 검사: 4개 파일, 45개 테스트 통과.
- 프로덕션 빌드 및 `build:legal` 성공.
- 빌드 로그에 기존 타이틀 BGM 998.12 KB, V9 GLB 389.12 KB 포함 확인. 이 작업에서 자산 내용을 수정하지 않았다.
- 로컬 및 preview 자산 검사: 각각 55개 통과.
- Preview: https://escape-zombie-school--appearance-20261005-4283wkkz.web.app
- Preview와 live의 동일 Hosting version: `3de51a1df4e90d7b`.
- Preview release: `2026-10-05T14:48:25.221Z`.
- Live release: `2026-10-05T14:48:48.185Z`.

## 실제 배포 확인 및 검증 범위

- `https://escapezombie.com/index.html`, `assets/Lobby-UpQ6WiTt.js`, `assets/firebaseRanking-91O8LNhB.js` 요청은 HTTP 200이며 내려받은 SHA-256이 로컬 dist와 일치했다.
- 배포 청크에서 `settings.playerAppearance`와 관련 번역 포함을 확인했다.
- 새 agent-browser 세션에서 공식 홈페이지 `/` 및 `/game`의 타이틀, `Google 로그인`, `게임 시작`, `로그인 없이 들어가기` 표시를 확인했다. 브라우저 오류 없음.
- 실제 계정 로그인, 로그인 후 설정에서의 실계정 선택 저장 및 플레이 검증은 하지 않았다. 기존 로컬 mock UI 98개 테스트 기록은 실제 계정 검증과 구분한다.
- 사용자 Firebase 데이터 읽기·쓰기 및 인증 코드 변경은 이 배포 작업에 포함하지 않았다. 저장 규칙은 이전 작업에서 배포되었다.
- 병렬 무기 배포 카드 `t_6cb1ba8f`에 같은 live 소스 재사용 및 중복 배포 방지를 전달했다. 기존 `rollback-pre-weapons-20261005` 채널은 보존했다.

이 기록은 Advisor의 배포 실행·검증 결과를 전달받아 작성했다. 기록 Worker는 별도 배포, 추가 빌드, Git 변경 명령을 실행하지 않았다.

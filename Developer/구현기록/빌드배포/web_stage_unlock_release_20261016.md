# 스테이지 해금 저장과 퀘스트 팝업 웹 배포

- 라이브: https://escapezombie.com/
- 전환 시각: 2026년 10월 16일 00시 24분 35초 KST.
- 배포 소스: `e791a1e3` (`zombie_only`). 데이터 보존 수정과 퀘스트 완료 팝업 크기 수정 포함.
- 최신 사용자 지시 `그냥 무조건 배포해`에 따라 실제 OAuth 검증 전 배포를 명시적으로 진행했다. 실제 Google 재로그인 검증을 수행한 것으로 보고하지 않는다.
- Hosting만 배포했다. Firebase 사용자 데이터와 데이터베이스 규칙은 변경하지 않았다. 개발 서버와 자동 재시작 작업은 시작하지 않았다.

## 검증과 실행 환경

- 필수 prebuild 검사, Studio 계약 테스트, production build, 법률 페이지와 웹 카드 생성 후 미리보기에 업로드했다.
- PC의 fork 시작 및 5초 테스트 시간 초과로 두 번 중단되었고 그때 라이브는 변경되지 않았다. 테스트 항목은 유지한 채 threads 단일 worker와 30초 제한으로 재실행했다.
- 실행 옵션만 임시 변경한 package.json은 finally에서 원래 바이트로 복원했고 SHA256 동일성을 확인했다. 영구 실행 설정 변경은 없다.
- 미리보기와 라이브 각각 JavaScript 61개 검증 통과. `/`, `/game`, `/landing`이 HTTP 200이며 실제 배포 HTML의 SHA256이 빌드 결과와 동일하다.
- HTML SHA256: `4597732121311a31bb8e160dcf43982016c99bbfb1f2e005f1a750cfef7551c2`.
- 미리보기와 라이브 버전: `0acd595a13d3fdc1`.

## 롤백

- 이전 라이브 버전: `8e96fb474fe636a1`.
- 롤백 채널: `rollback-unlock-20261016`.
- 채널 URL: https://escape-zombie-school--rollback-unlock-20261016-41hmp6b0.web.app
- 채널 만료: 2026년 10월 23일 00시 12분 57초 KST. 만료 뒤에는 보존된 Git 이력으로 이전 코드 또는 개별 수정 취소본을 다시 빌드한다.
- 채널이 유지되는 동안 전체 라이브 복원 명령:

```powershell
firebase.cmd hosting:clone escape-zombie-school:rollback-unlock-20261016 escape-zombie-school:live --project escape-zombie-school --non-interactive
```

- 개별 코드 롤백 기준: 데이터 보존 `e791a1e3`, 퀘스트 팝업 크기 `8feb68f4`. 각각 별도 revert 후 동일 Hosting 검증·배포 절차를 사용한다.

# 랭킹 제출 거부 — 최소 운영 Rules 복구

2026-10-18 운영 Rules를 정상 Firebase CLI 인증으로 읽자 stage/global 랭킹 entry의 허용 키에 `lastPlayedAt`이 없고 `$other:false`였다. 미리보기 후보는 실제 플레이 시각을 이 필드로 제출한다. 유효한 Stage1 203점·203초·미클리어 payload도 격리된 실제 Firebase SDK에서 6개 버킷 모두 거절됐다. 점수 자체가 잘못됐다는 증거가 아니다. 사용자 screenshot의 URL과 실제 Google 인증 여부는 확인되지 않아 그 화면의 실행 환경까지 단정하지 않는다.

## 재현과 복구

`sdk-red.json`은 실제 운영 Rules와 동일 payload의 6개 `PERMISSION_DENIED`다. `sdk-green.json`은 stage/global 두 entry에 optional `lastPlayedAt` 숫자·음수 금지·기존 시각 역행 금지 검증만 추가하여 6개 저장/readback 성공, 시각 역행6개 거절을 확인한 결과다. synthetic Auth와 전용 emulator만 사용했고 처음/복원 전체 hash와 revision이 같다. 실제 계정이나 사용자 데이터에는 테스트 쓰기를 하지 않았다.

Advisor가 recursive semantic diff에서 정확히 validator2개만 추가됨을 독립 확인했다. 기존 Auth/users/admin 규칙과 공개 읽기·본인 쓰기·점수 검증 권한은 같다. 통합 release의 OAuth HOLD와 실행 중 Firebase deploy 프로세스 없음을 확인한 뒤 두 Kanban 카드에 단기 Rules-only lease를 기록했다.

배포 직전 운영 Rules hash `0d8065625d1ea06cce37e894d14a3da5acec9307170c68f69d710c77eafc7417`이 최초 읽기와 같음을 재확인했다. 정상 CLI `deploy --only database`가 10:38:55Z 종료코드0으로 완료됐다. 임시 config는 repo 루트의 `firebase.ranking-only.temporary.json`이며 내용은 database.rules 경로 `Quaility_Assurance/20261018_ranking_rejection/ranking-only-rules.json` 하나뿐이다. Hosting/functions/Auth 설정은 없다. 임시 config는 finally에서 삭제했다. 최초 시도는 app 밖 Rules 경로 검증에서 중단됐고, repo 루트 config로 경로를 바로잡은 뒤에만 실제 배포했다.

운영 readback canonical SHA-256은 `dfade4e6a7af476d178c4903b660f7add6c5466edf6057feaeb526916c8e2a6f`로 기대값과 같다. Advisor도 **10:39:51.714Z** 정상 CLI로 독립 조회해 일치함을 확인했다. 운영 Hosting은 `d6b5abe3d7bb45aa` 그대로다. 두 카드에 Rules-only lease 해제를 기록했고 자동 승격 작업은 없다.

## 범위와 제한

- 이번 변경은 랭킹 Rules validator2개뿐이다. 제품 source/UI, Hosting, 통합 P0/Auth/Admin Rules는 배포하지 않았다.
- 실제 Google 새 OAuth는 여전히 미검증이며 나머지 통합 승격 gate는 유지한다.
- 이미 거부된 요청이 자동 재전송됐거나 과거 시각을 복구했다고 주장하지 않는다. 기존 행의 '시각 기록 없음'을 임의 시각으로 채우지 않았다.
- 현재 UI는 한 버킷이라도 실패하면 전체 미기록처럼 안내할 수 있다. 이번 재현은 전체6개 거부였고, 부분 실패 안내 개선은 이번 범위에서 변경하지 않았다.

## 독립 재조회와 rollback

작업 checkout의 app 디렉터리에 보관한 로컬 도구 `node ranking-rules-verify-readonly.mjs`는 정상 CLI 인증으로 Rules와 현재 Hosting 버전만 읽는다. 토큰·사용자 데이터는 출력하지 않는다. 원본 `deployed-rules.json`을 재조회 결과로 덮지 않는다. 이 도구의 실행 결과는 `independent-readback.json`에 보존했다.

rollback은 새로 생긴 타 작업의 Rules를 통째로 덮어쓰지 않는다. 현재 Rules를 fresh 읽고 이번 배포 예상 hash와 일치할 때에만 원본 `deployed-rules.json`으로 database Rules를 되돌린다. 다른 변경이 있으면 두 `lastPlayedAt` validator만 제거하는 diff를 다시 검토한다. 사용자 데이터·Auth·Hosting은 rollback 대상이 아니다. 원본과 배포 직전 snapshot은 각각 `deployed-rules.json`, `rules-just-before.json`에 보존했다.

# 랭킹 수정 운영 배포 — 2026-10-18

사용자가 실제 Google OAuth 미검증 고지 후 명시적으로 배포를 지시했다. 이번 작업은 해당 승인으로 Hosting을 배포했으며, 미검증 항목을 성공으로 바꾸지 않았다. launchmini/backendmini 기존 Kanban 카드 t_e2815ba8 / t_a33559b6를 사용했고 단일 publisher lease를 기록했다. 새 worker·브라우저·개발 서버를 만들지 않았다.

## 배포 결과

- Source: zombie_only `47f4a4e1d1c2a8fdf3a857e2c5aabce830cb25b3`. 랭킹 수정 `13399c91`과 기존 홈페이지/비공개 게시판 f84/e21을 포함한다.
- Release: `C:/Users/admin/AppData/Local/Temp/stage-progress-p0-release-20261018`.
- 운영: https://escapezombie.com/game — Hosting version `d41e90ef5ec76803`, release `2026-10-18T12:01:37.555Z`.
- Preview: https://escape-zombie-school--ranking-hardening-20261018-wk9nr4hw.web.app — 검증한 동일 version을 운영으로 clone했다. 예전9134 preview는 사용하지 않았다.
- 직전 운영 `65d2acb686b75f1b`의627파일 중 provider 전용2개를 제외한625경로 전부 보존했다. 기존 경로 해시 변경은 `/index.html`만이며 기존 앱 JS·모델·오디오·홈페이지/공유카드 파일과 공유 manifest 원문은 그대로다. 최종665파일, manifest canonical SHA `fd41c040ffd90b6c052a9c69a15e8c4643f923d2fc053a838524b5165dd255f1`.
- 운영 Rules canonical SHA `67c9ca226866f53ae4849733602201d96dedba66e0a9941784ac3b238684b467`는 전후 동일하다. 기존 ranking subtree와 lastPlayedAt 검증을 확인했다. Rules·Auth·사용자 데이터 쓰기0이다.

## 운영 기준 식별과 보존

홈페이지 owner는 f84/e21 소스를3ed993a4876b8335로 배포하고11:48:09Z에 lease를 해제했다. 그 뒤 발견한65d2의 publisher ID는 이 작업에서 확정하지 못했다. 대신 전체 Hosting map/config를 비교해 기존581파일 해시·인덱스·앱 JS·config 모두 동일하며 승인된 공유카드 HTML/PNG46개만 추가됐음을 증명했다. external-card-only-diff.json 참조. 따라서 해당 최신627파일을 기준으로 보존하고 홈페이지 변경을 되돌리지 않았다.

직전 운영 전체 manifest와 Rules 원문을 live-before.json / rules-before.json에 보존했다. 새 빌드에 없는 기존 경로294개만 고유 롤백 채널에서 읽어 gzip9 SHA를 검증한 뒤 artifact에 복사했다. nonce/legal/cards 실행 뒤에도625경로를 재확인했고 생성기가 바꾼 기존 manifest를 최신65d2 원문으로 유지했다.

## 검증

랭킹9제품 해시는 앞선 독립112검사 및 실제 Firebase SDK 격리 검증 때와 동일하다. 이 배포에서는 새 합본 source47로 정상 build를 실행해 종료0, Studio45검사 및 JavaScript62자산 검사를 통과했다. 기존 nonce/legal/cards와 preview62검사를 유지했다. 임시 config는 이미 통과한 중복 build만 제외하고 최종 보존 검사를 추가했으며 SHA/명령을 temporary-config-evidence.json에 기록했다.

승격 직전12:01:28Z 운영65d2와 Rules67c9 불변, preview의625경로 보존·config 동일·빌드 index 일치를 확인한 뒤 동일 검증 version을 clone했다. 배포 후 운영 manifest가 preview와 같고625경로 보존, Rules/config 불변을 확인했다. 운영 JavaScript62검사도 통과했다.

`/`, `/game`, `/landing`, `/admin` HTTP200/HTML은 빌드한 index SHA와 같다. 공유 manifest SHA도 보존한 원문과 같다. Advisor가12:02:17.955Z 정상 CLI와 HTTP로 운영 version/Rules/세 경로/빌드 일치를 독립 확인했다. advisor-independent-readback.json 참조.

실제 Google 새 OAuth, 실제 렌더 화면, 로그인 후 실플레이, 실제 사용자 랭킹 쓰기는 **NOT_VERIFIED**다. HTTP/SDK/빌드 통과를 해당 성공으로 주장하지 않는다. 기존 과거 거부 요청이 이미 재전송됐다고 주장하지 않는다.

## 롤백과 종료

고유 채널 `rollback-ranking-hardening-20261018-1145`는 직전 운영 version65d2acb686b75f1b와 정확히 같다. rollback.json에 확인했다. 필요 시 현재 운영을 새로 확인하고 다른 publisher 변경 여부를 검토한 뒤 이 채널의 검증 version만 live로 clone한다. 사용자 데이터나 Rules를 과거 snapshot으로 덮지 않는다.

임시 config·복사/검증 helper·이 작업의 다운로드 cache는 제거했다. 다른 작업자의 파일은 보존했다. publisher lease를 해제하고 자동 승격 작업을 남기지 않았다. 추가 제품 변경이나 배포는 하지 않았다.

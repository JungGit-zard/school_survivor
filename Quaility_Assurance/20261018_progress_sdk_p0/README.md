# 진행도 저장 누락 P0 — 2026-10-18

운영에서 플레이한 기록이 0인 것은 미플레이 증거가 아니었다. 실제 브라우저 Firebase SDK에 게임 시작→처치→골드→클리어를 연결하자 미션 카운터 `stage.stage1.startCount`의 점(`.`)이 RTDB에서 허용되지 않는 객체 키여서 전체 진행도 쓰기가 거부됐다. 별도로 오래된 다른 세션의 전체 스냅샷이 클리어를 0으로 덮는 실제 SDK 반례도 재현했다.

수리 후보는 최신 원격 `3ecf903cb7f916fa8fd0af44fd3b32f631f84ae1`에서 격리했다. 운영 콘텐츠는 Stage 1~4이며 Stage 5~10의 기존 기록 키 보존을 지원하는 것과 신규 콘텐츠 배포를 구분한다.

- 미션 카운터 키만 가역 인코딩하고 hydrate/보상 transaction에서 복원한다.
- user transaction, 세션 차분·런 ID별 절대 watermark·구매 receipt로 중복 집계와 오래된 스냅샷 덮어쓰기를 방지한다.
- 이벤트 즉시 저장, 화면 상태와 독립적인 5초/online 재시도, 전환·로그아웃 flush+서버 readback의 세 경로를 사용한다. ACK 전에는 저장 중으로 표시한다.
- 구버전 전체 저장의 기존 기록 감소·알려진 Stage 1~10 키 삭제·전체 ledger 삭제를 rules에서 거부한다. 악의적 소유자가 동적 ledger 일부를 직접 삭제하는 API 변조까지 완벽히 방어한다고 주장하지 않는다.

실제 Chrome+Firebase JS SDK+격리 RTDB emulator에서 운영 4개 스테이지의 시작0·클리어 전 처치 ACK·240초·클리어 ACK·다음 이동(4는 종료)·새 browser context 복원을 검증했다. 실제 SDK offline에서는 미ACK/pending과 요청 합치기를 확인하고 online 복귀 후 ACK/readback을 확인했다. 충돌 구매는 한 번만 차감하며 해당 구매를 정확히 원복한 뒤 후속 클리어를 저장한다. 보상 처리 중 추가 골드·처치와 동시 세션 미션 카운터의 합산도 검증했다. 원격 서비스 테스트 쓰기는 없다.

실제 Google 새 OAuth는 이 emulator의 synthetic Auth로 검증되지 않는다. 로그인·핵심 진입 gate를 통과하기 전 운영 승격·새 rules 배포는 대기한다. 게스트의 메모리 전용 익명 UID는 새 브라우저 세션에서 같은 사람을 영구 재인식하는 수단이 아니다. 브라우저 강제종료 직전 미ACK 전송의 성공도 보장하거나 성공으로 표시하지 않는다.

요청 계정은 역사 랭킹의 서로 다른 확정 클리어 영수증으로 최소 기록만 복구했다. Stage 1 클리어3, Stage 2 클리어1, 플레이4, 최고306초, Stage 2 최고229초, 총 생존980초, Stage 1 180초 생존3이다. 정확한 과거 전체 횟수는 알 수 없으며 사용자의 반복 플레이 진술을 임의 수치로 대입하지 않았다. fresh 전체 사용자+ETag를 별도 PRIVATE로 보존하고 조건부 CAS 뒤 정확히 승인된 7개 leaf만 달라졌음을 확인했다. 지갑318과 나머지 모든 값·자료형·키의 해시는 동일했다. Advisor가 2026-10-18T09:00:14.600Z 독립 GET으로 서버 값을 다시 확인했다. 개인정보와 계정 원본은 공개 Git에 포함하지 않는다.

이 문서는 후보 수리와 승인된 데이터 복구 기록이며, 실제 OAuth/운영 배포 완료 기록이 아니다. 10월16일 stage1 메모리 adapter 1,000회와 10월18일 84개 mock 검증은 실제 SDK 경계 검증을 대신하지 않는다.

## 최종 후보 검증

타이틀에서 인증·hydrate·재시도만 한 경우 플레이 횟수는 증가하지 않는다. 실제 `resetGame`이 생성한 런만 집계하며 동일 계정의 미ACK 런은 다른 계정이 실제 플레이한 뒤에도 원래 계정으로 재전송한다. `checkpointRevision`은 일반 저장과 보상 transaction의 현재 서버 값에서 증가한다. 기록 수치가 같은 구버전 지갑·업그레이드 snapshot도 revision 검증으로 거절한다.

필수 관련 테스트는 `progress-final-required.json`의 **76/76, success:true**다. 정확히 500런을 포함하며 테스트 제한시간은 30초, 실제 해당 테스트는 약 10.6초였다. 기본 5초로 실행한 이전 결과는 timeout이며 통과로 세지 않는다. 전체 suite 1회는 중간 후보에서 2,747개 중 통과2,669·실패58·건너뜀20이었으며, 기존 자산·그래픽 등의 실패를 제품 변경으로 덮지 않았다. 동기 상태 verifier는 async 이동의 Promise를 성공으로 세지 않도록 수정했으나 다른 통계 검증 1건이 남아 있어 전체 suite가 통과했다고 보고하지 않는다.

Advisor의 최종 독립 실제 SDK 실행은 `evidence/progress-main-sdk-release-final.txt`, 종료코드0이다. 실행 전후 P/G/Rules/Ready 해시가 동일했고 소유 emulator PID22080은 종료됐다. 운영 4개 스테이지와 새 context 복원, offline 복귀, 보상 중 처치·골드 보존, 구버전 덮어쓰기 거부, revision 없는 기존 사용자 첫 저장, ACK 유실 후 같은 sequence 재시도에서 골드319·처치1의 중복 없음까지 확인했다. 해시는 `source-hashes.json`에 고정했다. 재실행은 repo 루트에서 `node Quaility_Assurance/20261018_progress_sdk_p0/run-sdk.mjs`이며 전용 emulator와 synthetic Auth만 사용한다.

## Preview만 게시

- URL: https://escape-zombie-school--p0-progress-20261018-msidj7ch.web.app/game
- Hosting version: `dc8854761b684880`
- 업로드 manifest SHA-256: `37f0b5e7d2e51eb6c02f66f0b9f4a1f84e118e08de0ca0abb6251f4ae3df5c54`
- 기존 운영 `d6b5abe3d7bb45aa`의 527개 중 provider 전용2개를 제외한 525개 경로 누락0. 기존 경로의 hash 변경은 `/index.html` 하나다. 홈페이지·코믹·방·음성·SFX·공유 자산은 보존됐다.
- safe script의 nonce, legal/cards 생성, preview JS 자산62개 검증은 유지했다. `--preview-only`로 clone 직전에 종료했고 종료코드0이다. 정상 build를 이미 통과한 동일 source의 중복 build만 임시 config에서 제외했다. 정확 preview 도메인의 Auth authorizedDomains 등록을 정상 API로 확인했다.

실제 Google 새 OAuth와 인증 후 핵심 진입은 아직 미검증이다. 현재 운영 Hosting과 Rules는 승격하지 않았다.

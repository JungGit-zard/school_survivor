독립 population 최종 판정: GO_SCOPED

정본: 589585edcc026843cb8aafd3a421720a8a2253c03d71a2421d5b8f2ad88a315c
시작/종료 2470개 SHA 전부 일치. 제품/기존 테스트/dist 수정 없음. 이전 NO_GO 보고서는 보존.

변경 범위
- Enemies.jsx:1936의 확장 제외 조건 한 줄 제거 + 신규 실제 프레임 회귀 테스트 + 재빌드 dist.
- 이전 소스 SHA 730caaaa240dbe05aa8294965f07bea092e00a7555d4cc051dde2553da742764
- 새 소스 SHA 360fd766e324d82329e93dc84b08d05eefb2d1311711f42f9a1ea162d2b6afb9
- 한 줄 역복원 SHA가 이전 SHA와 정확히 같아 detector/timing/일반 timetable/HP/스탯/caps/batch/queue의 다른 수정 없음 입증.

독립 재실행
- 정상 npm test/pretest, 단일 worker threads: 186 PASS / 0 FAIL (9 files).
- 기존 RED caller oracle를 새 출력 파일로 재실행: 10 PASS / 0 FAIL. 과거 RED5/5 원본 보존.
- 실제 Enemies frame/RAF/scheduler/pool 회귀 Stage1~10 10/10 PASS. React/store/hook adapter와 catch-up만 격리; detector/queue/addEnemies/cap/pool은 실제 코드.
- pause 제외, alive4 reset, 9.999초 미발화→10초 정확히 E07x10+E01x10, 한 RAF20개, typed pool/양수 HP, 생존20 중복 없음, 일반 queue cap 예약/19슬롯 부분spawn 금지, consumer 용량 감소 시 전량 보류·재시도, gameKey stale 폐기 확인.
- 기존 burst/Stage5/확장/일반 max3 drain/pool 검사도 fresh PASS. assertion 완화 없음. 완전3D 물리/새 브라우저 렌더 검증으로 과장하지 않음.
- 부모 정상 scoped 504/504, build exit0 기록을 별도 읽음. QA 독립 재실행이나 전체 suite GREEN으로 취급하지 않음.

승계/보안
- B01/B02/B03 및 실제 retry/raster/대화종료/3탭/자판기는 관련 소스·GLB oldSHA=newSHA를 JSON에 명시해 승계. 불변 화면 재QA 없음.
- Rules SHA d7aa0a2d335ecff33e9527f9bf6d684421faa8b8a71802bd1a07b513e1b2a581: 기존 최소 whitelist source 승인 그대로. reviewed live-base snapshot=현재 HEAD base 확인. 새 운영 Rules 직접 fetch는 아니며 부모가 배포 직전 재조회·동일성 확인 필수.
- 782개 현재 live 고객 파일 gzip/raw 보존, index만 기존 경로 교체, provider init.js/init.json 두 경로만 제외. 최신 exact freeze/live guard PASS.
- 조건부 필요한 exact Rules-only 허용; Functions 배포 범위 밖. Auth/개인 데이터/Studio/storage 쓰기 없음.

최종 인계
이 정본에는 남은 scoped blocker가 없다. 부모 단일 publisher가 live/remote/Rules-base 재확인과 원래 nonce/build/legal/cards/preserve/freeze guard를 모두 통과한 뒤 정상 commit/push + 필요한 exact Rules-only + guarded Hosting safe promotion 가능. 승인 우회나 live drift 무시는 불가. QA 직접 배포/커밋 없음.
실OAuth/운영 계정/Android 실기기는 NOT_VERIFIED_DEFERRED이며 현재 scoped 웹 수정 무한 차단 사유가 아니다.

증거: population-final-entry.json, population-final-caller.json, population-final-tests.json/.log, population-final-freeze.log.
JSON: F:\From_SSD_D_20261005\JungSil\2.Minigame_project\releases\owner-all-complete-20261018\Quaility_Assurance\owner_all_20261018\independent-population-final.json
MD: F:\From_SSD_D_20261005\JungSil\2.Minigame_project\releases\owner-all-complete-20261018\Quaility_Assurance\owner_all_20261018\independent-population-final.md

# levelmini Stage4 계약 인계

Kanban: t_787d1632 / assignee levelmini. 기존 등록 specialist 재사용. 사용자 직접 위임에 따라 소유 기록 두 파일만 생성; child/Git/runtime edit/test/browser/server/process 관리/DB/배포 없음. root가 통합·Git·실행 검증을 담당한다. 수신 receipt의 status=blocked이며 live Kanban 조회/상태 변경 도구는 이 세션에 제공되지 않았다. 상태를 완료로 변경했다고 주장하지 않는다. 명시된 이번 문서 위임을 수행하고 root에 산출물을 인계한다.

## 게이트·읽기
- 첫 명령: 중앙 check-required-documents.ps1 -Profile levelmini -Domain auto -TaskSummary "Stage4 nonmodel gameplay contract readonly synthesis". exit_code=0.
- resolved_domains common/gameplay, matched_domains gameplay, match_evidence gameplay/keyword gameplay. 프로필 default gameplay 중복 제거 확인.
- combined_receipt_sha256: 633e9a637fce947ff8749ff4ac014fea754247d7548c65725b552420bcd124fd.
- emitted required 13문서 전체 읽음(SESSION_MEMORY는 최신 Session9 Entry1만). 최초 묶음 출력 truncation 이후 누락 문서는 분리 재조회. project_develop_policy/SESSION_CONTINUITY는 최초 반환 구간에서 전체 확인. 작업 도메인 gameplay 유지.
- C:/Users/admin/.claude/skills/gstack/bin 디렉터리 존재 및 도구 목록 확인, gstack 설치 게이트 통과. gstack/browser 실행은 하지 않음.
- kanban-worker skill 로드. 사용자 명시 no children/root handles Git/두 기록만 소유 조건으로 하위 에이전트·Git 미실행.
- canonical current_game_rules, advancement, exact concept HTML 전체, graphics §7 전체, audio plan 전체 확인. concept HTML SHA 요청값 일치.

## 납품
Planner/stage4_upgrade_20261024/implementation_contract.md
- 현재 승인 비모델: 3초 전체 연속 가마솥 경계, 분절 B04 국물 경계, pause/cancel/restart, owner 설정을 보존한 주방/장애물 판독, uimini 맥락 안내, soundmini 기존 cue 검토.
- 전역 난도/웨이브/타입/복장/슬롯 변경 없음. BOX E03/E02/E04 유지. 별도 모델 인계가 비모델 작업을 막지 않음.
- 18.72×32 units / 4.68×8 blocks, 150/205/210/240초, 가마솥15초/3초/250ms/3.2 units(0.8 blocks), 국물 HP50%/1200ms/250ms/1.1 units(0.275 blocks), boss-death-only 영구 해금 수용 기준 및 소스 행 포함.

## 후보 읽기·실행 제한
- .git/HEAD/refs/heads/zombie_only 직접 읽기로 0bcf4bff123f58c28a12598bbf9f4d68e5aada5b 체크아웃 확인 후 source readonly. 별도 checkoutready receipt는 없음. fetch/checkout 안 함.
- node_modules 없음. 설치/테스트/브라우저를 이 specialist가 실행할 권한 없음.
- 기존 안전한 부분 fixture: 후보 firebaseProgress.js:273–297 및 firebaseProgress.test.js:424–437, applyCloudProgressSnapshot(...,{keepCloudUserNull:true}). 진행도 cloudUser를 비우지만 실제 scene 진입/모든 외부 쓰기 격리 보장은 아님.
- 실제 Stage4까지 완결된 안전 LOCAL E2E 경로 미확인. useAuthStore.js:20–27 E2E 주석과 달리 우회 분기 없음. 유일한 후보 e2e/shark_missile_check.spec.js:11–12는 localStorage 사용으로 재사용 금지. benchmark script가 가리킨 stage2 spec은 e2e 목록에 없음.
- 타이틀/room/auth 제품 코드 변경, Studio 로컬 seed, Firebase userdata 쓰기, env/credential 복사로 경로를 만들지 않음. 영구 저장/실제 Studio revision/모바일 화면 PASS 미주장.

## 검증 상태
실행한 검증은 checker exit0, 문서 해시/파일·소스 정적 조회, 두 소유 산출물 저장·readback이다. 테스트/빌드/서버/실플레이 미실행. root와 Balance_QA_Mini가 계약의 미실행 수용 시나리오를 검증해야 최종 running reflected build 완료를 선언할 수 있다.

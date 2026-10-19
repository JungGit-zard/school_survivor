# levelmini direct fenced worker 결과 — t_b82b3574

판정: 담당 gameplay 소스 구현 완료, focused offline 검증 PASS. launchmini publisher 인계. 카드 blocked/중복방지 fence 유지, unblock/dispatch 안 함.
실제 lane: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/owner-all-complete-20261018
branch: zombie_only / 기준 HEAD: 66c9198b9f97d146a16bb0ef611359b468072b1a. commit/push/build/deploy/config/guard 변경 없음.
canonical integration에는 요청된 결과파일 2개만 기록하고 gameplay 소스는 읽기 전용으로 유지했다.

## 1. 근거 및 게이트
- canonical level-brief.md 직접 확인: 첫 돌진 base, 두 번째 base×1.01, 세 번째 base×1.02, BASE 가산/actual dash 시작 기준, 승인 yaw ±π/6 보존.
- 사용자 history C:/Users/admin/AppData/Local/hermes/state.db를 mode=ro로 직접 조회: user msg52125 골드 구매/즉시 효과/중복 없음/퇴장 초기화, msg53410 자판기 필수, msg53809 자판기 및 좀비 개체수 유지 최우선 확인. recovered-owner-instructions.json과도 대조했다.
- 최신 마틸다 문구와 첫 돌진 해석의 근거는 canonical brief §1이다. 최신 owner 메시지 원문을 직접 복원했다고 주장하지 않는다.
- checker exit0: matched_domains=[gameplay], match_evidence=gameplay keyword, resolved_domains=[common,gameplay]. receipt=9636c6763a1cdec1d4b4659b0527e7fb6f367f0b56f2ece43b7af5ec96c81885. 필수문서 및 Planner/current_game_rules.md 확인, gstack bin 존재 게이트 PASS.

## 2. 실제 구현
### 마틸다
- lane Bang_Rules.md에 scoped 수치 규칙을 먼저 기록한 뒤 구현했다.
- 새 순수 helper getMatildaDashSpeed(baseSpeed, startedDashCount): base×(1+max(0,count−1)×0.01).
- Enemy.jsx의 마틸다 전용 matildaAim→charge에서만 count+=1. charge 프레임, laugh, 장애물 방향 반전은 증가하지 않는다.
- 기존 spawn identity reset effect에 count=0 추가. 새 개체 및 기존 gameKey Physics 리마운트 시 초기화.
- charge 이동 x/z와 stall expectedMove 모두 같은 dashSpeed 사용. 다른 적/워킹/telegraph/laugh 시간/데미지/접촉즉사 지연/오디오 이벤트는 그대로.

### 전 스테이지 자판기
- 이 lane의 STAGE_CONFIGS와 실제 HUD 구매 테스트 기준 대상은 stage1, stage2, stage3, stage4, stage5, stage6, stage7, stage8, stage9, stage10이다. brief의 '현재5일 수 있음'을 고정값으로 가정하지 않았다. expansion 신규 해금·콘텐츠·population을 추가/변경한 것은 아니다.
- 기존 연결은 이미 존재: Game→Floor→FloorVisual→StageVendingLayer→StageVendingMachine, HUD→StageVendingPrompt→useGameStore.purchaseStageVendingItem→기존 영구 wallet/progress 저장 경로.
- 실제 FloorVisual 반환 요소를 stage별 검사하여 StageVendingLayer가 1회씩 mount되는 contract를 보강했다. source-only Game/HUD mount 검사와 함께 수행했다.
- 누락된 중복 shop/store를 발명하지 않았다. release의 west/east ±π/2가 brief 기준과 달라 ±π/6으로만 최소 복원했다. 위치/가구/상점 규칙 불변.
- 기존 가격5 gold/회복35HP/maxHp cap/스테이지당 동일아이템1회/퇴장·재시도·다음 stage 초기화/실제 위치 재검증/연타·재진입·계정 ownership guard를 보존했다.
- interaction 2.25 units=0.5625블록. 접근 시험 offset 1.2 units=0.3블록, 플레이어 반경 0.4 units=0.1블록. 1블록=4 units.

## 3. 실제 RED / GREEN
cwd: lane/Developer/r3f_prototype. 정상 npm/pretest 경로 사용. full suite 실행 안 함.

RED 명령:
`npm test -- src/lib/matildaDashSpeed.test.js src/components/StageVending.integration.test.jsx --reporter=json --outputFile=../../Developer/agent_room/owner_apply_audio_matilda_vending_20261019/level-red.json`
exit1: 자판기 10 stage yaw 기대값 실패, 기존 mount 검사2개 통과. Matilda 테스트 모듈은 구현 전 helper 미존재로 로딩 실패했다(수치 assertion 실패로 과장하지 않음).

최종 GREEN 명령:
`npm test -- src/lib/matildaDashSpeed.test.js src/components/EnemyVisual.test.js src/components/StageVending.integration.test.jsx src/components/StageVendingPrompt.test.jsx src/components/StageVendingMachine.test.jsx src/lib/stageVending.test.js src/store/useGameStore.stageVending.test.js src/store/useGameStore.vendingIntegration.test.js src/components/Stage5Environment.test.jsx src/components/Stage5Environment.readiness.test.jsx src/components/HUD.persistenceVisibility.test.jsx --reporter=json --outputFile=../../Developer/agent_room/owner_apply_audio_matilda_vending_20261019/level-green.json`
exit0: 11개 파일 / 102개 통과 / 0실패. branch guard, no-legacy-B02, dialogue store(456 Korean IDs), studio-game-sync pretest 게이트 통과.
- stage1~stage10 실제 HUD DOM 클릭 + 실제 store: HP90→100 cap, gold20→15, sold-out/중복 debit 없음, 같은 stage 재시도 구매권 복구 후 HP40→75/gold15→10.
- 기존 범위·phase·hydration·계정 ownership·영구 지갑 재진입·퇴장 reset 테스트 포함.
- Matilda helper 가산/비복리/반복 read 및 source wiring/reset contract 확인. 기존 EnemyVisual 회귀도 통과.

증거 원본:
F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/owner-all-complete-20261018/Developer/agent_room/owner_apply_audio_matilda_vending_20261019/level-red.json
F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/owner-all-complete-20261018/Developer/agent_room/owner_apply_audio_matilda_vending_20261019/level-green.json

## 4. 보존 및 경계
- git diff --check exit0.
- 시작/종료 SHA256 동일 확인: HUD.jsx(기존 저장 overlay 10줄 삭제 patch 포함), Enemies.jsx, burstEvents.js, stageConfig.js, expansionContent.js, useGameStore.js, stageVending.js. 값은 level-inventory.json에 기록.
- gameplay production 변경은 Enemy.jsx, 새 matildaDashSpeed.js, StageVendingLayer.jsx만이다.
- Bang_Rules.md 및 Planner 인계는 정책/기획 산출물 경계로 명시한다. canonical 결과파일은 요청된 handoff 예외이며 canonical 소스 import 없음.
- 마지막 git diff에 soundmini 병렬 작업의 dialogue-matilda A/B/C WAV 및 manifest 수정이 나타났으나 본 worker가 작성하거나 되돌리지 않았다. HUD/QA 기존 dirty 파일, unrelated untracked 파일도 그대로 유지.

## 5. 한계 및 Balance_QA_Mini 인계
- offline 메모리 Firebase transaction fixture만 사용했다. live Firebase 사용자 읽기/쓰기 없음. 실제 원격 transaction 성공이나 배포 검증으로 보고하지 않는다.
- WebGL/Rapier 연속 돌진·실기기 화면·모바일 터치 실플레이는 수행하지 않았다. helper와 실제 소스 소비 contract 검증이며 전체 브라우저 E2E가 아니다.
- launchmini가 통합/배포를 담당한다. publisher/Balance_QA_Mini는 새 런 base 복귀, 실제 1/1.01/1.02 배율, 반전/일시정지 비증가와 모바일 세로·가로 shop 접근/앞면 가시성을 후속 관찰할 수 있다.
- 수락기준과 구체 QA 인계: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/owner-all-complete-20261018/Planner/owner_apply_20261019/levelmini-matilda-vending-handoff.md
- 정확한 변경 경로/해시: 같은 canonical 폴더의 level-inventory.json. dispatcher 중복 실행 없이 comment로만 완료 인계한다.

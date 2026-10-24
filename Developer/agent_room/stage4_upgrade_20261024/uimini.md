# Stage4 contextual guide / cauldron feedback 구현 인계

담당 uimini · Kanban t_ff82c501 · 상태: 구현 및 집중 검증 완료, independent balanceqa/Root review-required. 전체 Stage4 wave 또는 실제 화면/청감 승인 선언이 아니다.

## 작업 경계 / 정본
- canonical 기록 위치: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/stage4_upgrade_20261024/
- 모든 구현 위치: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024/Developer/r3f_prototype/
- 실행 확인 HEAD: 0bcf4bff123f58c28a12598bbf9f4d68e5aada5b, branch zombie_only.
- 기존 uimini 재사용. 옛 stage-list lane과 무관. threemini t_c4cc2f7d 소유 Enemy.jsx/PressureCauldron.jsx 및 동료 신규 시각/테스트 파일은 편집하지 않았다.
- 시작 checker: Profile uimini / Domain auto / TaskSummary 'stage4 HUD audio', exit 0. matched_domains ui(hud), gameplay(stage), audio(audio); common+ui+gameplay+audio. combined_receipt_sha256=607bcc250f6a75a8303d8d04c4e15d104d9a40e782053d0aef64e2d59df4ddec. 종료 전 재조회에서도 동일 receipt. emitted 필독 문서 전부 확인(SESSION_MEMORY는 최신 단일 entry 확인). 최초 SESSION_MEMORY 조회 위치가 앞부분이어서 헤더 검색 뒤 최신 entry인 12725행부터 다시 확인했다.
- gstack: profile HOME 경로 GSTACK_OK. 의존성 junction은 이미 존재하여 만들거나 설치하지 않았다.
- 활성 근거: canonical Graphic_designer/stage4_graphics_and_zombies_20261022.md §7, Planner/stage_zombie_concept_plan_20261023.html 전체(긴 단일 행은 분할 출력해 확인), Planner/stage4_upgrade_20261024/implementation_contract.md 전체.
- soundmini 승인: canonical Developer/agent_room/stage4_upgrade_20261024/soundmini.md / t_218319ae. warning=zombieGiantThud, burst=flaskHit 기존 ID만 사용.

## 실제 변경 파일 (아래는 격리 lane의 src/ 기준)
- components/Game.jsx
- components/HUD.jsx
- components/Stage4HazardGuide.jsx (신규)
- components/Stage4HazardGuide.test.jsx (신규)
- components/Game.stage4Feedback.runtime.test.jsx (신규)
- components/HUD.stage4Guide.runtime.test.jsx (신규)
- lib/stage4CauldronFeedback.js (신규 순수 경계 분류 helper)
- lib/stage4CauldronFeedback.test.js (신규)
- lib/locales/ko.js, en.js, ja.js: stage4Guide.* 신규 8개 키만 추가. 타이틀 및 기존 문구 불변.

## 구현 동작
### 작은 비모달 안내
- Stage4 + playing + 유효 생존 플레이어에서만 추가 안내 표시. 다른 스테이지, pause/levelup/gameover/cleared에서는 안내만 사라지며 기본 장면/모델/위험 시각은 건드리지 않는다.
- 실제 getRuntimeElapsedMs 게임시각 0~3초 북 조리대·싱크, 3~6초 중앙 솥/남 배식대·학생, 6~9초 고정 연속 원=솥·15초 주기, 9~12초 주방장 국물=흩어진 분절 원. 작은 화면에서도 짧게 읽도록 네 문구로 나눴다. 안전지대 또는 포탈 방향을 만들지 않았다.
- getPressureCauldronHazardVisual의 기존 3초 boiling / 250ms bursting 창이 일반 설명보다 우선한다. HUD 게시 시각 대신 실제 runtime을 50ms 간격으로 관찰하고 설명 종류가 변할 때만 React 상태를 갱신한다. 벽시각으로 유효기간을 빼지 않으므로 pause가 안내/경고 시간을 소모하지 않는다.
- 현재 bossDefeated 상태가 참일 때만 해금 조건 달성과 탈출의 차이를 안내한다. escapePortalActive에 따라 아직 닫힘/열린 탈출구로 탈출 가능을 구별한다. 시간/포탈만으로 처치나 영구 저장 성공을 선언하지 않는다.
- 기존 상단 44px 조작부 아래 safe-top+52px, MissionTracker safe-top+102px 위의 최대 44px 간격을 사용. 기존 liveScore의 min(34vw,116px) 열을 왼쪽에서 제외하고 8px 간격 뒤 남은 오른쪽 공간만 사용(max-width480px, 좌우 safe-area 반영). 12px 글자/16px 줄간격, pointer-events:none, focus/input/button 없음.
- 기존 학생/intro/퀘스트 대사 및 toast, quest inventory, 보스/E04/편대/마틸다 경고, 마틸다 대사, 포탈 등장 알림, milestone, 타이틀 복귀 확인, 열린 개발 치트패널에 양보한다. 기존 조작부/HP/무기/퀘스트 UI 위치와 동작은 수정하지 않았다.

### Game 단일 오디오 소유
- 실제 fixed-step의 previousElapsedMs→elapsedMs 현재 위험 경계만 순수 helper가 분류한다. 새 setTimeout, 예약음, asset/registry/mix/master 수정 없음.
- warning 시작에서 zombieGiantThud, 현재 250ms 폭발 창의 실제 폭발 경계에서 flaskHit. 과거 사이클 목록을 오디오용으로 순회하지 않으며 지나간 경고를 폭발 때 따라 재생하지 않는다.
- Game ref의 gameKey/stage scope와 warningCycle/burstCycle high-water mark로 중복 차단. pause/resume은 보존, restart/stage 전환은 초기화. 동일 cycle/여러 fixed substep 및 과거 cycle 재관찰에도 중복 없음.
- 플레이어 반경/피해 가드보다 앞에서 emit하므로 범위 밖에도 발동음이 한 번 난다. consumed 마킹 후 try/catch로 동기 listener 예외를 격리하며 실패음을 다시 보내지 않는다. 기존 피해/진행은 음향 성공에 의존하지 않는다.
- 기존 getPressureCauldronExplosionTimes 피해 소비 루프 및 20% maxHP/ignoreInvulnerability/반경3.2 units(0.8 blocks)/15초/3초/250ms 불변. map18.72×32 units(4.68×8 blocks), 150/205/210/240초, 보스사망 checkpoint 해금 불변. B04·bossDeath·clear·portal 기존 발행에 손대거나 중복을 추가하지 않았다.

## 실행 검증
명령은 후보 Developer/r3f_prototype에서 수행. pretest를 생략하지 않았다. 실행 자식에 CMD창이 필요 없도록 npm script-shell을 Git bash로 지정했다.

1. RED: npm_config_script_shell='C:/Program Files/Git/bin/bash.exe' npm test -- src/lib/stage4CauldronFeedback.test.js src/components/Stage4HazardGuide.test.jsx src/components/Game.stage4Feedback.runtime.test.jsx
   - 3 files failed. 신규 helper/guide 없음 + Game 오디오 assertions 8 failed/1 passed 확인 후 구현.
2. 첫 GREEN 시도: 30 passed/1 failed. 영문 Segmented의 대소문자만 테스트가 잘못 가정하여 의미 검사 /segmented/i로 수정했다.
3. 실제 bossDefeated 대 escape 설명 추가 전 RED: guide 1 failed/9 passed; 구현 후 초기 3 files/32 tests passed.
4. HUD 통합 점검: 포탈을 160초에 강제로 열었던 fixture는 기존 portalFlash에 양보하는 올바른 동작 때문에 실패했다. 제품을 바꾸지 않고 실제 210초 열림/214초 안내 fixture로 수정했다.
5. 과거 cycle 재관찰 중복 RED: Game 1 failed. 마지막 cycle의 단순 다름 비교를 high-water '>' 비교로 바꿔 같은 런의 과거 주기 재발행도 차단했다.
6. 최종 집중+인접 회귀: 아래 정상 npm lifecycle 명령 exit 0, Test Files 9 passed (9), Tests 61 passed (61).

node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' --script-shell='C:/Program Files/Git/bin/bash.exe' test -- src/lib/stage4CauldronFeedback.test.js src/components/Stage4HazardGuide.test.jsx src/components/Game.stage4Feedback.runtime.test.jsx src/components/HUD.stage4Guide.runtime.test.jsx src/components/Game.runtimeTime.test.js src/components/Game.stage4PressureCauldron.test.js src/lib/stage4PressureCauldronHazard.test.js src/components/HUD.questAcceptance.test.jsx src/components/HUD.questInventory.test.jsx

- 직전 npm shim 호출이 pretest 시작 직후 exit127로 멈춰 node/npm/python/script-shell 존재를 진단했다. 누락을 발견하지 못했고 npm-cli.js 절대 경로로 정상 lifecycle을 다시 실행해 위 PASS를 얻었다. 우회 pretest/환경 복사/설치는 하지 않았다.
- branch guard/B02 source gate/dialogue store(456 Korean IDs)/Studio-game sync source contract 전부 PASS.
- 소유 파일 git diff --check: 오류 없음. diff 재열람: Game 추가 오디오 경계, HUD 안내 연결, locale 신규 키 이외의 기존 로직 변경 없음.
- 최종 소스 레이아웃 대조에서 liveScore가 같은 높이에 있음을 확인했다. score 열 예약 및 짧은 3초 단위 문구 요구를 먼저 RED(guide 3 failed/7 passed)로 고정한 뒤 신규 guide만 수정했다. right의 max()/env()를 jsdom이 직접 CSS값으로 보존하지 못한 1건은 기존 HUD와 같은 CSS custom property 경유로 검사했다. 최종 전체 집중 명령을 다시 실행한 결과도 9 files/61 tests PASS다.
- 실제 Game hooks/useFrame callback을 3D 자식 없이 실행하는 runtime 하니스와 실제 HUD DOM 통합 테스트 사용. WebGL/실기기 검증이라고 주장하지 않는다.
- 신규 테스트는 일반 메모리 격리 test setup을 사용. cloud DB 쓰기/로그인/랭킹 전송/localStorage 조작을 하지 않았다.

## 미실행 / Root·BalanceQA 인계
- 사용자 지시대로 전체 suite와 브라우저·스크린샷·실기기·청감 검증 미실행. 모바일 실제 겹침/글자 확대·줄바꿈·가림, 205/210초 중첩, mute/cold-load/동시음은 독립 QA 대상이다.
- 빌드/서버 실행/배포/AAB 미실행. .env를 읽거나 복사하거나 값을 출력하지 않았다. 새 route/preview/auth 변경 없음.
- soundmini가 명시했듯 현재 공유 오디오 API는 재생 핸들/개별 stop이 없다. 미래 emit/중복/예약은 차단하지만 이미 재생된 꼬리 또는 Howler cold-load 내부 대기를 pause/death/restart 때 강제 중지한다고 보장하지 않는다. 공용 registry/전역 stop을 수정하지 않았다.
- UI helper의 50ms 폴링 및 부모 HUD publication으로 실제 DOM 갱신에 샘플링 지연이 있을 수 있다. 전투 판정/오디오 fixed-step에는 영향 없다. 프레임 단위 세계 위험 시각과의 실장면 대조는 QA가 수행한다.
- 신규 모델/타입/geometry/placeholder 없음. BOX E03/E02/E04 및 별도 모델 담당 보류 상태 유지.
- 동료 dirty 파일은 보존. stage/commit/push/deploy, 의존성 설치 및 새 junction 생성 없음. Root의 독립 diff/test/시각·청감 검토 전 릴리스 승인 아님.

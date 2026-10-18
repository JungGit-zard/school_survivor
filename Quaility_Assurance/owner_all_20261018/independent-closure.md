독립 QA closure — 최종 NO_GO

후보 정본: 533c7977c5a5cfdd3ac1e00cdd69f65dffeaf38a5dbd2dcbed388aebc26064f1
부모: launchmini t_e2815ba8 / 기존 balanceqa t_eebe49ae mirror 재사용. 새 카드·worker·상태 변경 없음.
전체 2469개 SHA 시작/종료 일치, unchangedAtExit=true. 제품 source/dist/ready/기존 테스트 수정 없음.

1. 이전 차단점 closure
B01 CLOSED: 실제 userRanking 1~10 oracle 10 PASS / 0 FAIL; 정상 확장 테스트와 실제 UserRanking 3탭 메모리 렌더에서 Stage5/6 표기 확인.
B02 CLOSED: 정상 npm test(pretest 포함) 변경범위 133 PASS / 0 FAIL. Stage4 비최종 기대 및 날짜/원래 보안 시나리오 수정 확인. QA assertion 완화 없음.
B03 CLOSED(명시한 raster 허용오차 내): 실제 GLB/Canvas on/off raster 정면·35도 비균일/팔다리 pose × DPR1/2/3, 6조 모두 PASS. 외곽선 중심값 범위 [1.7888543819998317, 2.0] CSS px, 기대2±0.75 CSS px. RGB foreground threshold24 및 국소 법선 보정; MSAA/픽셀 양자화 때문에 정확한 subpixel equality는 주장하지 않는다. uniform 값만을 계측으로 취급하지 않았다.
실제 useGLTF 거절→제품 RoomErrorBoundary→다시 시도 클릭→실제31개 hull 모델 복구 PASS.
긴 퀘스트 대화 실제 계속 클릭→studentDialogue=null, questToast=null, phase=playing PASS. 관련 JSON/PNG는 closure- 접두 증거 참조.

2. 현재 별도 차단 — 최신 최우선 개체수 계약의 확장 스테이지 누락
소스: Developer/r3f_prototype/src/components/Enemies.jsx:1936
소스 SHA: 730caaaa240dbe05aa8294965f07bea092e00a7555d4cc051dde2553da742764
실제 조건: if (!isExpansionStage(stageRuntime.id) && (lowDensity.shouldSpawn || retryLowDensity)) {
      runtimeQueueRef.current.lowDensityDeferred = !enqueueScheduled(SCHEDULE_LOW_DENSITY_REINFORCEMENT)
    }
실제 detector를 600 active 1/60초, alive=3, 빈20슬롯으로 진행하면 E07x10+E01x10 발화. 실제 소스에서 추출한 caller 분기를 평가하면 Stage1~5 enqueue=1, Stage6~10 enqueue=0. 5 PASS / 5 FAIL.
이는 detector + 실제 caller 조건 증거이며, 전체 R3F/물리 spawn-drain을 시뮬레이션했다고 주장하지 않는다. 명시적 확장 차단 조건만으로 현재 지원 범위의 누락을 입증한다.
현재 후보는 승인 Stage6~10을 지원하는 전체 확장 후보이며 별도1~4 hotfix가 아니다. 따라서 B01~B03가 닫혀도 전체 GO_SCOPED 불가, 최종 NO_GO.
최소 owner 후속: 부모/Enemies 담당이 E07/E01 구성·풀·caps·정상 timing·예약량·동시 batch drain을 검증한 확장 대응 수정과 새 freeze를 제공하거나, 별도 승인된1~4 전용 후보를 제공해야 한다. QA는 제품 조건 삭제/수리하지 않았다.
재현: node Quaility_Assurance/owner_all_20261018/closure-lowdensity-caller.mjs (예상 exit1).
상세: F:\From_SSD_D_20261005\JungSil\2.Minigame_project\releases\owner-all-complete-20261018\Quaility_Assurance\owner_all_20261018\closure-lowdensity-caller.json

3. 자판기/랭킹 실제 렌더
localhost:4198/vending-owner-local.html에서 실제 StageVendingMachine + Prompt + store, 메모리 transport만 사용.
Stage5 좌표 x6.25,z-14; 실제 구매 클릭 HP50→85, 최대HP100 유지, wallet20→15, 품절/중복방지 UI 확인. 격리 계약7/7 PASS. 정상 store 검사도 fresh PASS. 운영 지갑·Google 로그인·계정 저장·전체게임 클리어 검증은 아니다.
랭킹 누적/일일/주간은 실제 컴포넌트와 합성 UID/메모리 데이터로만 렌더. 0참여행과 Stage5/6 표기 확인; 개인 기록 미hydrate는 원래 fail-closed. production storage seed/fallback 없음.

4. 보안/Rules/배포 경계
reviewed Rules SHA: d7aa0a2d335ecff33e9527f9bf6d684421faa8b8a71802bd1a07b513e1b2a581
원래 QA 소스와 동일. 운영 rules-live-before와 최신 HEAD base 의미상 동일, 승인된 whitelist5 leaf만 차이. 나머지 UID/auth/master/unknown-child/monotonic 방어 승계. APPROVE_EXACT_MINIMAL_SOURCE.
해당 최소 Rules 변경의 별도 배포는 보안 검토상 허용되지만, 같은 SHA·변함없는 live-base와 release QA GO 조건을 충족한 부모 publisher만 수행한다. 현재 전체 후보 NO_GO이므로 지금 전체 배포 허가는 아니다. Functions 배포 범위 밖. QA는 Rules/Hosting을 쓰지 않았다.
운영 live 785개 중 index 교체1개와 provider init2개만 제외하고 782개 gzip/raw 모두 동일. 최신 published comic public40개는 최신 HEAD와 동일. exact freeze/live guard PASS, 정상 nonce/prebuild/pretest/promote 보존.
READY315 package 실제 파일 모두 승인 SHA 일치; 이 중 freeze에 없는 provenance 문서22개도 직접 SHA 확인(없다는 이유로 byte mismatch로 분류하지 않음). GLB 승인SHA 동일.
증거 SHA 승계: bc1fbd81b7ea1a29cefff6bc9fe1e96e1e8b3627135d915d6989478374dad6a9→533c7977c5a5cfdd3ac1e00cdd69f65dffeaf38a5dbd2dcbed388aebc26064f1, 동일 path/SHA 2412개 명시적 mapping. 변경된 userRanking은 새 검사/렌더, 새 dist는 새 freeze/live 보존 검증. 과거 실행을 fresh GREEN으로 바꾸지 않았다.
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\releases\owner-all-complete-20261018\Quaility_Assurance\owner_all_20261018\closure-security-inheritance.json

5. 실행/오류/제한
정상 npm --prefix <ROOT>/Developer/r3f_prototype test -- [src/lib/userRanking.expansion.test.js src/lib/userRanking.test.js src/components/UserRanking.test.jsx src/lib/firebaseRanking.hardening.test.js src/components/HUD.escapeSuccess.test.jsx src/components/Enemies.stage5.test.jsx src/lib/lowDensityReinforcement.test.js src/store/useGameStore.stageVending.test.js src/lib/stageVending.test.js] --maxWorkers=1 --no-fileParallelism --reporter=json --outputFile=<Q>/closure-tests.json.
테스트/콘솔/주입 실패/재시도 명령은 closure-browser-commands.json, closure-tests.log 및 closure-console.json/closure-errors.json에 기록했다.
처음 QA가 unversioned dependency를 별도 import하여 cache 제거가 안 되어 wait os10060 발생. 정확한 Vite query dependency로 QA 하니스만 수정하여 실제 로드 거절/재시도 입증. 통제 GLB rejection page error4건 및 React/Context Lost 로그는 예상된 실패 주입 증거; 콘솔0error라고 보고하지 않는다.
기존 랭킹 좁은 행의 이름/스테이지 텍스트 간격은 관찰로 구분; 본 closure의 새 보안/클라우드 결함으로 분류하지 않았다.
브라우저는 명명 session 하나, 정상 reserve 후 생성; 자신의4198 Vite PID23088(parent30596)와 browser만 정리. 기존 Chrome/5173 종료 없음.
실OAuth, 운영 계정 플레이, Android 실기기, Rules emulator는 NOT_VERIFIED_DEFERRED. FullSuite 미실행/전체 GREEN 주장 없음. 이 항목들은 현재 NO_GO 이유가 아니다.

JSON: F:\From_SSD_D_20261005\JungSil\2.Minigame_project\releases\owner-all-complete-20261018\Quaility_Assurance\owner_all_20261018\independent-closure.json
MD: F:\From_SSD_D_20261005\JungSil\2.Minigame_project\releases\owner-all-complete-20261018\Quaility_Assurance\owner_all_20261018\independent-closure.md

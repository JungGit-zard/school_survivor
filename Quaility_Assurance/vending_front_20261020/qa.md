# 자판기 v2 최종 수리 검수 — GO (한정 범위)

카드 t_3446f36a / 구현 t_d188b259 / balanceqa
기준 57a58d54400c7dba1a43c6da3eefa647c16132a7

## 판정
서측 +PI/9(+20도), 동측 -PI/12(-15도)의 정적 prop-facing 변경만 승인. 원본 +30/-30도 대비 실제 카메라 시선 정렬이 두 대표 장면 모두 엄격히 개선됐고, 네 장의 PNG를 직접 확인했다. 서측은 소폭 덜 비틀린 정면, 동측은 줄어든 옆면과 더 직접 보이는 유리·버튼을 확인했다. 음료 표시 및 노랑/초록 버튼 식별 유지. 가독성 개선은 제한적이며 전체 게임 승인이나 텍스트 판독 검사가 아니다. VIS-01은 이 범위에서 해소.

## 실제 재검증
- 기존 하네스와 설치 Chrome 재사용. browser reservation 후 파일 로그 사용, 외부 네트워크 차단, pageerror 없음.
- after는 실제 getStageVendingMachineTransform export에서 yaw를 가져옴. before는 원본 +/-PI/6. 동일 위치·카메라·zoom으로 비교.
- 게임 steady-state 카메라 수학/플레이어 치수/fov30/1280x720 재사용. 격리 prop, 중립 조명. 가구/HUD 없는 장면.
- yaw0 전역축 oracle을 폐기하고 원본 대비 actual-view strict improvement 및 변경 범위/불변 소스 검사로 수정. 합격 기준을 v1 대비 개선으로 낮추지 않음.
- stage1: actual-view dot 0.8296359134583045 → 0.8417963594852024, 차이 +0.01216044602689792.
- stage3: actual-view dot 0.796785428174928 → 0.8210137662925746, 차이 +0.024228338117646575.

## 명령과 실행 결과
- root: node Quaility_Assurance/vending_front_20261020/server.mjs > .../server-v2.log 2>&1 (백그라운드). curl localhost:5199/__qa 준비 확인.
- Developer/r3f_prototype: npm.cmd run browser:reserve > .../browser-reserve-v2.log 2>&1, 종료 0.
- root: node Quaility_Assurance/vending_front_20261020/capture.cjs > .../capture-v2.log 2>&1, 종료 0. stage1/stage3 before/after PNG와 visual.json 생성.
- root: node Quaility_Assurance/vending_front_20261020/oracle.cjs > .../oracle-v2.log 2>&1, 종료 0.
- root: git diff --check, 종료 0. tracked diff는 Layer yaw 두 값과 해당 integration test. 신규 transform test는 구현 receipt로 결속.
- root: node Quaility_Assurance/vending_front_20261020/finalize.cjs, 최종 receipt 및 불변 소스/증거 검증.

## v2 테스트·빌드 영수증 재사용 (QA 재실행 아님)
- npm test -- --dir src src/components/StageVendingLayer.transform.test.jsx src/components/StageVendingMachine.test.jsx src/components/StageVending.integration.test.jsx src/lib/stageVending.test.js src/store/useGameStore.stageVending.test.js --maxWorkers=1
  5파일 40건 PASS, 종료 0. 로그를 직접 확인하고 SHA256 대조.
- npm run build
  정상 prebuild 45건 PASS, 종료 0, Vite built, B02 artifact와 hosting JS 62 assets 검사 통과 로그 확인. 집중 검사 뒤 직렬 빌드.
- broad suite/build를 추가 실행하지 않음. v1 tests.log/build.log는 과거 기록이며 v2 근거가 아님.

## 해시 결속
- Developer/agent_room/vending_front_20261020/implementation.json
  SHA256 2bcf303c7ce50d3759918b0e8381f3f72c5c74d47b0d3f8c2425064379455af2
- Developer/r3f_prototype/src/components/StageVendingLayer.jsx
  SHA256 4d2291219229165d7b31884e993b2e9df1ca8da3f2ce66dc5659993f2be04019
- Developer/r3f_prototype/src/components/StageVending.integration.test.jsx
  SHA256 5156907b21bf80924090c2e1eaa32e81b2367e828495d28622f1dc2e99aeb3ad
- Developer/r3f_prototype/src/components/StageVendingLayer.transform.test.jsx
  SHA256 853e095031cf152dfc53dd2589387fd4678ff5582d5d8b31d510fdddbffb2ea6
- Developer/agent_room/vending_front_20261020/v2-focused-tests.log
  SHA256 548cffc5c63b3591e9ccb42c56a2790c24e05e6f475fd7c8e6d2b0b976581325
- Developer/agent_room/vending_front_20261020/v2-build.log
  SHA256 f4e07ad48275d5d656f64ac2a3a22acdfba61e3340b385c9a3c739dd44abafc1
- Developer/r3f_prototype/dist/index.html
  SHA256 731555c2e727107a114f349e5f48d2f99d93eae9b9be6f220f71f4a67d4efd83

그 외 렌더/PNG/불변 소스/예약/로그 해시는 qa.json hashes에 수록.

## 관찰 (차단 사유와 분리)
- 최종 scoped blocker 없음. v1 qa.json/md는 qa-v1.json/md로 바이트 그대로 보존.
- 과거 Prompt 실패 10건은 이번 yaw diff 밖. 기존 실패였다는 원인 확정이나 전체 suite GREEN을 주장하지 않음.
- 기존 room-side 접근 계약 유지. 모든 stage의 정면 가구 여유 공간을 새로 보장하지 않음.
- Kanban 상태 수정 없음; 파일 기반 인계.

## 미검증/금지 범위
전체 게임 가구 가림·HUD·동적 카메라, 라이브 구매/Firebase/인증, 모바일/WebView/AAB 및 배포는 미검증. 위치/범위/경제/가구/모델/카메라/타이틀/오디오/Firebase 런타임 수정 없음. commit/push/deploy/live write 없음.

## 정리
캡처 finally에서 브라우저 종료. QA server 프로세스 종료 후 REMAINING_QA_SERVERS=0 확인(cleanup-v2.log).

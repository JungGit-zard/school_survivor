# 2026-10-19 확장 승인 웹 릴리스 범위

카드 t_7a401e8a / publisher launchmini. Terry 현재 명시 승인: 어제 음향 전부·마틸다 누적 돌진·전 스테이지 자판기·기존 HUD 안내 제거 및 기존 완료 승인사항 보존, scoped commit/push와 안전한 웹 live 배포. 실제 배포 결과는 execution-result 문서로 분리한다.

## 유한 요구 목록과 처리
- 음향: 실제 10/18 Orca/Codex user13건과 최종 선호 export 회수. 최종 SpawnC/DeathC/WarningTickC/dialogueA, Dash/Laugh/Countdown original. 이전 Git통합9경로를 배포에 포함하며 새 청음 WAV3/manifest 누락4경로 추가. READY315 중 최종 승인 예외를 보존. sound-result/inventory 참조. 실제 청음 NOT_VERIFIED.
- 마틸다: n번째 실제 matildaAim→charge에서 base*(1+0.01*(n-1)), 첫 돌진 base. 개체 및 run reset, 프레임/반전 비누적. walk/telegraph/damage 등 보존. level-result/inventory 참조.
- 자판기: 모든 playable stage1~10 기존 scene→HUD→store 구매 유지. west/east +PI/6,-PI/6 최소 복원. 5gold/35HP/cap/동일아이템1회/퇴장·재시도 초기화/거리·연타·owner 보호 유지. 실제 store+DOM offline 구매102 focused 중 통과.
- HUD: 기존 uimini t_4a48e78e의 서버저장 pending/error overlay 제거10줄 유지. 실제 저장·오류처리·재시도 backend는 불변.
- 퀘스트 수락 배너: user53402/session20261018_201531_53d807 실제 원문 '그리고 퀘스트 받을때 베너위치는 또 틀리네'. 기존 완료된 HUD.questAcceptance 경로의 safe-area viewport/스크롤/중복 제거/continue 버튼 보존. 이번 focused 재실행 PASS. 미완료 새 디자인을 import하지 않음.
- 로자리 방 전체 업그레이드: user53539/session20261018_212546_7b3e1c 실제 원문에서 과거 업그레이드 회수·적용 요청 확인. 기존 user52443 및52449, user52570의 명시 전체목록 재확인 지시와 owner_all_20261018 통합/QA 기록에 연결: 모바일 세로·가로/작은뷰포트, 이동·터치해제·옷장, 2CSSpx 외곽선, 타이틀 입구, 승인모델 정체성, lifecycle 보존. RosariRoom 관련 production source는 현재 live frozen source와 동일. focused lifecycle/mobileInteraction/outline/titleEntry 재실행 PASS. 새 미승인 방 디자인 추가 없음.
- 개체수 유지 최우선: user53809/session20261019_000629_2527ad 실제 원문 확인. 기존 완료된 low-density 보강/Enemies 소비경로 및 모든 stage population을 보존. lowDensityReinforcement.independent 재실행 PASS. spawn/waves/통계 변경 없음.
- 기존 Stage5/확장·랭킹/auth/progress·타이틀/방/홈페이지 및 live-only 파일 보존: 원래 frozen runtime의 현재 제공 JS/index204 raw SHA일치. 새 baseline a42e8ab5d8b35349(1158files)을 독립 보존 manifest로 고정. index와 승인 오디오12파일 외 기존 Hosting 경로 bytes/config 변경 금지.

## 검증 및 위험 게이트
- soundmini 집중8파일102 PASS, levelmini11파일102 PASS(EnemyVisual 중복 suite 있음; 합산을 고유 테스트 총수로 주장하지 않음).
- 별도 기존요구 보존 focused6파일95 PASS, 정상 npm pretest+offline network deny. 전체suite/benchmark/E2E 아님.
- 독립 balanceqa source hash/범위/새 release path security GO 필요.
- 새 config에 nonce→정상 prebuild/build/postbuild→legal→cards→current live preserve→QA-bound seal을 유지. rollback exact map, preview JS graph 및 전체 manifest+변경파일 fresh HTTP, 최신 source/remote/live fence 후에만 clone-to-live. 이후 live map·fresh bytes 재확인.
- 기존 HUD-only freeze/receipt/가드는 수정하지 않음. 새 승인범위 evidence만 별도로 작성. production 웹은 현재 명시승인 범위이며 단일 publisher.
- 실제 Google OAuth, 물리 Android/Play, 사람 청음은 NOT_VERIFIED; 이번 웹 변경에서 실제 결함이 확인되지 않는 한 일괄 차단으로 해석하지 않음.
- Play Console 체크리스트: AAB 생성 없음; versionCode 변경 없음; track/tester/국가/스토어 제출 없음; Play 프로덕션/global rollout 승인·실행 없음. Firebase 사용자 writes/Rules/Functions/Auth 변경 없음.

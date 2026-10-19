# 2026-10-19 levelmini direct worker — 구현 및 Balance_QA_Mini 인계

카드: t_b82b3574. blocked는 dispatcher 중복방지 fence이며 그대로 유지한다.
실제 수정 lane: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/owner-all-complete-20261018
범위: 마틸다 가산 돌진 속도, 기존 전 스테이지 자판기 연결 검증/승인 yaw 복원. 콘텐츠·스폰 확대 없음.

## 근거와 수락 기준
- canonical level-brief.md §1 기준: 실제 matildaAim→charge 전이만 개체별 1회 카운트. n번째 돌진 = baseChargeSpeed × (1 + 0.01 × (n−1)). 1/2/3/101번째 배율은 1/1.01/1.02/2. 프레임 반복과 장애물 반전은 카운트하지 않는다.
- 개체 id/type/isMatilda 초기화 effect에서 count=0. gameKey 변경에 따른 기존 Physics 리마운트 정책 유지. 기존 laugh 시간, 워킹/다른 적 속도, 접촉 즉사 지연, 데미지, 타이밍은 불변.
- 이동 속도와 stall 판정의 예상 이동량은 같은 실효 돌진속도를 사용한다. 매 프레임 객체/전역 카운터 추가 없음.
- 기존 모든 등록 stage1~stage10의 FloorVisual이 StageVendingLayer를 정확히 1회 연결하며 HUD는 StageVendingPrompt를 유지한다. 미등록 stage11은 transform 없음.
- west/east front yaw는 각각 +π/6 / −π/6. 기존 위치·가구·population·상점 수치 변경 없음.
- 접근거리 2.25 units(0.5625블록), 테스트 접근 오프셋 1.2 units(0.3블록), 접근 검증 플레이어 반경 0.4 units(0.1블록). 1블록=4 units.
- 기존 회복음료 5 gold / 즉시 +35HP, maxHp cap, 동일 아이템 스테이지당 1회, 퇴장/재시도/다음 stage entitlement reset, 실제 playerPos 재검증, 연타/재진입/소유권 검증을 유지한다. 가격/회복량 신규 승인 또는 재밸런싱 아님.

## 실제 검증
정상 npm test 및 pretest 사용, 집중 11개 파일 102개 통과/0실패. full suite/build/deploy/commit/push 수행하지 않음.
- Matilda 순수 helper 4개: 선형 가산/비복리/프레임 불변 + Enemy.jsx 전이/reset/속도 소비 source contract. 실제 Rapier 연속 돌진 실플레이 시험은 아님.
- 전 stage1~stage10 실제 FloorVisual 요소 연결/transform/yaw/가구 접근 검사.
- 전 stage1~stage10 실제 HUD DOM 버튼 + 실제 Zustand store 구매, maxHp cap, 1회 차감, 같은 stage 재시도 구매권 복구. Firebase는 메모리 transaction fixture만 사용.
- 기존 구매 store guard/영구 지갑/퇴장 상태, EnemyVisual 및 Stage5 환경, 기존 HUD 저장 overlay 삭제 회귀 테스트 포함.
- git diff --check 통과. HUD, Enemies, burstEvents, stageConfig, expansionContent, useGameStore, stageVending 해시가 작업 시작/종료 동일.

## Balance_QA_Mini 인계 — 비차단 후속 실기기 관찰
1. 마틸다 첫/두 번째/세 번째 실제 돌진의 속도 배율 1/1.01/1.02, laugh/장애물 반전/일시정지 중 추가 증가 없음. 새 런은 첫 돌진 base 복귀.
2. 모바일 세로/가로에서 근접 HUD와 ±π/6 자판기 앞면 가시성, 조작영역 간섭 확인. WebGL/실기기 화면은 이번 offline 검증에 포함하지 않음.
3. 실제 계정 Firebase 구매 저장은 publisher 승인 검증 단계에만 수행. 이번 worker는 live Firebase 읽기/쓰기 및 브라우저 구동을 하지 않음.
4. 타 작업자의 음성 파일/manifest 변경은 inventory 범위 밖. 단일 publisher launchmini가 통합 검증·배포를 담당한다.

상세 결과/정확한 파일 inventory: canonical Developer/agent_room/owner_apply_audio_matilda_vending_20261019/level-result.md 및 level-inventory.json.

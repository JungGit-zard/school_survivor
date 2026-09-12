# 보유 무기 강화 순환 QA

- Kanban 참조: `t_1735705d`.
- `npm test -- --run src/components/HUD.test.jsx src/lib/levelupOwnedWeaponRotation.test.js src/store/useGameStore.levelupExposure.test.js`
- 결과: 3개 파일, 66개 테스트 통과. 사전 branch/B02/dialogue/Studio 계약 게이트도 통과.
- 검증: 강화 가능 보유 무기 1칸 예약, 선언 순서 순환, max·불가 무기 건너뛰기, pending 네 카드 및 같은 pending 강화 처리, 10개 보유 무기 10창 순환 후 1회 wrap, 같은 serial 재렌더 불변, 새 게임 reset ledger 초기화를 확인했다.

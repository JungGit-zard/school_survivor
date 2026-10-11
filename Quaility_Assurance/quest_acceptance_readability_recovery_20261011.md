# 퀘스트 수락 가독성 복원 확인 — 2026-10-11

- 수락 창 위치 복원 때 행동문 크기까지 이전의 작은 값으로 되돌아간 회귀를 확인했다.
- 실제 HUD startQuest/openStudentDialogue 경로에서 수락 행동문 22–24px, 안내문 13–15px 및 별도 색상·서체를 확인했다. 기존 중앙 위치, 클릭 종료, 완료/아이템 상단 절반 크기와 타이머도 집중 검사 범위에 포함했다.
- Advisor 직접 검증: `npx.cmd vitest run src/components/HUD.questInventory.test.jsx -t 'orders quest acceptance|shows quest dialogue|completion|acceptance persists'` → 3 passed, 9 skipped. git diff --check 통과.
- jsdom이 clamp 글자 크기를 버리는 한계 때문에 React가 실제 전달한 style prop을 검사한다. 이를 위해 런타임 반응형 수치를 고정값으로 변경하지 않았다.
- 운영 Firebase 쓰기 없음. 임시 SSR 화면은 퀘스트가 없는 잘못된 출력이므로 시각 검증 증거로 사용하지 않는다. 실기기 퀘스트 화면 검증을 완료했다고 주장하지 않는다.
- Kanban t_28e72495: Hermes의 이전 D 경로 호출 실패 후 올바른 C 체크아웃의 uimini 범위 Worker로 복구. Advisor가 diff 및 위 테스트를 독립 확인했다.

# Quest HUD action priority implementation note — 2026-10-11

## 범위
- Kanban: `t_7e0fe793` 검증 중 기록.
- 구현 커밋: `d38b30e49a9400dee3ffbb060e2d29cb38826000`.
- 코드 변경 파일: `Developer/r3f_prototype/src/components/HUD.jsx`, `HUD.questInventory.test.jsx`, `HUD.test.jsx`.
- 이 문서는 구현 변경을 새로 만들지 않고, 최종 코드의 동작 의도와 QA 확인 포인트만 기록한다.

## 실제 before → after
- 완료 알림의 기존 독립 토스트는 2000ms → 1000ms다. NPC 대사와 합쳐진 완료창은 기존에 탭 전까지 무기한 유지되었으므로, 이 경로는 1000ms 자동 닫힘/게임 재개를 새로 적용했다. 수동으로 여는 가방과 수락 대화는 자동 종료하지 않는다.
- 이전 item notification: 360x800에서 `336 × 131.890625`, 화면 중앙 부근 top `334.0546875`, 2000ms lifecycle, alert 뒤 quest inventory 자동 open 위험.
- 이후 item notification: `scale(0.5)` transient top popup, 360x800에서 `168 × 65.9453125`, left `96`, top `12`, 약 1000ms 뒤 제거 및 bag false.
- 이전 desktop acceptance: 1280x800에서 width `560`, x `360..920`으로 portrait frame x `415..865`를 넘침.
- 이후 desktop acceptance: width `426`, x `427..853`, portrait frame 내부로 제한.

## 핵심 구현 판단
- `QUEST_TRANSIENT_BASE_MS = 2000`, `QUEST_TRANSIENT_HALF_MS = 1000`로 기존 duration 요구를 코드상 명시했다.
- timer cleanup은 `questToast.type`과 `questId`가 시작 시점과 같은 경우에만 삭제한다. 새 toast가 들어온 뒤 이전 timer가 새 상태를 지우는 회귀를 막기 위한 방어다.
- item received path에서 `toggleQuestInventory()` 자동 호출을 제거했다. 수동 quest bag 버튼은 유지한다.
- completion popup은 동일 toast 확인 뒤 `clearQuestToast()`를 수행하고, dialogue pause 상태이면 `closeStudentDialogue()`로 dim/catcher 잔존을 정리한다.
- acceptance/start UI는 small portrait left, NPC text right, 별도 notice, large next-action 순서로 나누었다.
- transient/acceptance 폭은 `min(calc(100% - 24px), calc(56.25dvh - 24px), 560px)`로 제한해 ReadyGameApp portrait frame 폭 토큰과 맞췄다.
- hidden reward element/style은 최종 코드에서 제거된 상태로 확인했다.

## 검증
- `npm test -- src/components/HUD.questInventory.test.jsx src/components/HUD.test.jsx`
- 결과: 74/74 PASS.
- QA 상세 근거: `Quaility_Assurance/quest_hud_action_priority_validation_20261011.md`.

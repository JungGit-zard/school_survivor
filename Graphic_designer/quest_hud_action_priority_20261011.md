# Quest HUD action priority visual note — 2026-10-11

## 목적
퀘스트 수락/아이템/완료 HUD의 시각 계층이 작은 모바일 화면과 desktop portrait frame 안에서 읽히는지 기록한다. 이 문서는 새 그래픽 제작이 아니라 최종 UI 시각 상태의 간단한 시각 검토 기록이다.

## 최종 시각 구조
- Quest acceptance/start popup
  - 작은 portrait: 왼쪽, `clamp(46px, 14vw, 62px)` 정사각.
  - NPC name/dialogue: 오른쪽, 12–14px 계열로 작게 유지.
  - Acceptance notice: 아래 별도 박스, 다른 색(`#cbd8ff`)과 `Nanum Myeongjo` serif 계열로 NPC dialogue와 분리.
  - Next action: 가장 큰 sans-serif 계열, `clamp(22px, 6.4vw, 24px)`, 중앙 정렬. "다음 행동"만 크게 보이도록 우선순위를 둔다.
- Item/completed transient popup
  - game frame top center, `top: 12`.
  - 기존 중앙 popup 대비 `scale(0.5)`로 시각적 절반 크기.
  - 어두운 rectangular panel + 밝은 item icon/picture로 짧은 알림 역할만 수행.

## Advisor 브라우저 실측 근거
- Mobile 360x800 acceptance width: `336`.
- Desktop 1280x800 final acceptance: width `426`, x `427..853`, parent portrait frame x `415..865` 내부.
- Item final mobile: `168 × 65.9453125`, left `96`, top `12`, centerX `180`.
- Completed final mobile: `168 × 120.992`, top `12`, dialogue cleared/resume after ~1s.
- Computed font evidence: `12.24 / 13 / 23.04px`로 NPC/dialogue/next-action 계층 구분 확인.

## 스크린샷 evidence
- `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-before-correction-advisor.png`
- `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-after-correction-advisor-interim.png`
- `Quaility_Assurance/screenshots/quest_hud_action_priority_validation_20261011/quest-after-desktop-advisor-final.png`

## 시각 판정
- PASS: 모바일 acceptance는 작은 portrait + 오른쪽 dialogue + 별도 notice + 큰 next action의 우선순위가 보존된다.
- PASS: desktop portrait frame overflow는 최종 width 제한으로 해소됐다.
- PASS: item/completed toast는 플레이 영역을 크게 가리지 않고 top-center compact alert로 보인다.

## 제한
- 본 기록 작성자는 새 브라우저 screenshot을 추가 촬영하지 않았고, Advisor가 제공한 실제 브라우저 측정과 복사된 screenshot을 시각 evidence로 사용했다.

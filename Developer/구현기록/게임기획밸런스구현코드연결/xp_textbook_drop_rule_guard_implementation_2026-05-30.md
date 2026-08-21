# XP Textbook Drop Rule Guard Implementation - 2026-05-30

## 연결 파일

- 기획: `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/Rewards_Drops/xp_textbook_drop_rule_guard_2026-05-30.md`
- 구현: `Developer/r3f_prototype/src/components/Enemies.jsx`
- 테스트: `Developer/r3f_prototype/src/components/Enemies.test.jsx`

## 구현 내용

- 일반 적 교과서 드랍률 상수 `TEXTBOOK_DROP_RATE`를 export했다.
- `shouldDropTextbook(dropData, roll)` 판정 함수를 추가했다.
- 기존 `Math.random() < TEXTBOOK_DROP_RATE` 직접 조건을 `shouldDropTextbook(dropData)`로 교체했다.

## 의도

- 일반 적이 XP 값을 가지고 있고 30% 판정에 성공하면 교과서가 드랍됨을 테스트로 보장한다.
- XP가 0인 적은 일반 랜덤 교과서 드랍을 하지 않는다.

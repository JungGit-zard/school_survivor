# 조사 보상 확률 구현 기록

작성일: 2026-07-27

## 구현

- `rollInvestigationReward(subjectType, random)`로 조사 대상별 보상 판정을 통합했다.
- `locker`는 난수를 소비하지 않고 업그레이드 선택 기회를 반환한다.
- `student`는 총 확률 50%, 당첨 뒤 업그레이드/골드 10개 50:50을 사용한다.
- `bulletinBoard` 등 기타 대상은 기존 총 확률 10%, 기존 보상 풀을 사용한다.
- `StudentDialogueTrigger`가 `target.subjectType`을 보상 판정 함수에 전달한다.

## TDD 기록

1. 학생 50% 경계 RED: `npx vitest run src/lib/studentSearchRewards.test.js` — 기존 상수 `0.1`, 새 함수 부재로 2개 실패.
2. 학생 GREEN: 같은 명령 — 2개 통과.
3. 사물함 RED: 같은 명령 — 난수 없이 업그레이드를 기대한 테스트가 `null` 수신으로 실패.
4. 사물함 GREEN: 같은 명령 — 3개 통과.
5. 기타 대상 10% RED: 같은 명령 — 기본 조사 보상 확률 상수 부재로 실패.
6. 기타 대상 GREEN: 같은 명령 — 4개 통과.
7. 런타임 전달 RED: `npx vitest run src/components/StudentDialogueTrigger.test.jsx` — `target.subjectType` 전달 문자열 부재로 실패.
8. 런타임 전달 GREEN: `npx vitest run src/components/StudentDialogueTrigger.test.jsx src/lib/studentSearchRewards.test.js` — 5개 통과.

Firebase, Graphics Studio, 브라우저 `localStorage`, 스테이지 배치·모델은 변경하지 않았다.

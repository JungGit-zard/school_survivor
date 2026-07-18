# Onigiri Terminal Rice Burst Visual Direction - 2026-05-30

## Visual Goal

오니기리의 마지막 충격은 음식이 부딪혀 흰 밥풀이 튀는 장면처럼 보여야 한다. 효과는 기존 `Onigiri.jsx`의 작은 3D 밥알 메시를 사용하며, 평면 원형 플래시가 아니라 입자처럼 퍼지는 형태를 유지한다.

## Direction

- 마지막 충격 위치에서 밥알들이 즉시 바깥으로 퍼진다.
- 밥알은 약간 위로 튀었다가 사라져, 충격과 음식 질감이 동시에 느껴지게 한다.
- 색은 밝은 흰 쌀밥 계열을 유지하고, 카툰 렌더링 느낌을 해치지 않는다.
- 추가 타깃이 없어 오니기리가 종료되는 경우에도 밥풀 터짐을 보여준다.

## Reference Applied

- `Graphic_designer/Bang_survivor_Graphic_concept.md`의 three.js 카툰 렌더링 방향을 따른다.
- 캐릭터/몬스터 변경이 아니므로 신규 3D 캐릭터 원화는 필요하지 않다.

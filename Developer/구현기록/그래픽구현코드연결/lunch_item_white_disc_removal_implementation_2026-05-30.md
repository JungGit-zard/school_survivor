# Lunch Item White Disc Removal Implementation - 2026-05-30

## File

- `Developer/r3f_prototype/src/components/LunchItems.jsx`

## Implementation

`LunchItem` 렌더링에서 바닥에 눕혀져 있던 흰색 `circleGeometry` 메시를 제거했다.

## Reason

해당 메시가 회복 아이템 아래에 작은 하얀 원으로 보였고, 스크린샷에서는 오니기리 관련 그래픽처럼 오해될 수 있었다. 아이템 본체만 남겨 화면의 불필요한 원형 표시를 없앴다.

## Gameplay Impact

수집 반경, 회복량, 스폰 주기, 디스폰 시간은 변경하지 않았다.

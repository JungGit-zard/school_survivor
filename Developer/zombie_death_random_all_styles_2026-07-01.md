# Zombie Death Random All Styles

## 구현 기록

- `collapseStyleForIntensity`가 더 이상 강한 막타를 `scatter`로 고정하지 않고 전체 죽음 스타일에서 랜덤 선택한다.
- `Enemies`의 일반 좀비 전용 `ZombieDeathAnim` 경로를 제거하고 모든 좀비 사망을 `EnemyDeathCollapse`로 통합했다.
- 미사용 `ZombieDeathAnim.jsx` 파일을 삭제했다.

## 검증

- `npm test`
- `npm run build`


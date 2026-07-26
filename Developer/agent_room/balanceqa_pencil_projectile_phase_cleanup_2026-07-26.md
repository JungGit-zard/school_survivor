# balanceqa 연필 비게임 상태 정리 routing trail — 2026-07-26

- 회귀 핵심: 실제 `gainXp()`가 `phase='levelup'`으로 전환한 뒤 비행 연필이 다음 deferred commit에서 0개가 되는지 확인한다.
- 비전투 상태에서 잔탄을 폐기하므로, 일시정지/레벨업 뒤 과거 탄이 재개되어 추가 피해를 주지 않는다.
- 범위·재사용 대기시간·관통·피해 수치 및 Firebase/Graphics Studio에는 영향이 없다.

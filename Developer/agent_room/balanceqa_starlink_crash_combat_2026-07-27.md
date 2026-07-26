# balanceqa 검토 기록 — 스타링크 추락 전투

- 검증 대상: 15주기, 화면 내 생존 보스 우선, 무작위 대체, 착지 1회, 지우개 폭탄 동일 전투 계약.
- 수치 정본: 착지 순간 지우개 폭탄의 damage/radius, 넉백 2.5/120ms, shatter5, non-crit, explosive radial.
- 위험 방지: 스타링크만 두 LOS 게이트를 모두 우회(`sightBlocker`와 `ignoreSightBlock:true`)하며, 지우개 폭탄 자체의 sight 동작은 false로 유지한다.
- 결정성: impact 직전 최신 보스 좌표를 시각 종점과 동일한 radial 중심으로 전달한다.
- 범위: 자산, Firebase, Graphics Studio, localStorage 변경 없음.

# R3F `aria-label` Canvas crash fix (2026-08-23)

- 증상: 보스 궁극기 3D 그룹이 처음 마운트될 때 `TypeError: Cannot read properties of undefined (reading 'label')`로 Canvas 전체가 중단됨.
- 원인: R3F `group`에 DOM 전용 `aria-label`을 전달함. `applyProps(new THREE.Group(), { 'aria-label': '...' })`가 동일한 예외를 재현함.
- 수정: B02/B03/B04 궁극기 그룹의 표시 문자열은 그대로 두고 Three 식별 속성 `name`으로 변경함.
- 검증: `npm test -- src/components/EnemyVisual.test.js` — 31 tests passed. 회귀 테스트는 모든 해당 그룹에 `aria-label`이 없고 `name` 적용이 예외 없이 끝나는지 확인함.

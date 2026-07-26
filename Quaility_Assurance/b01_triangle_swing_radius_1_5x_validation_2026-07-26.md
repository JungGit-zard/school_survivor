# B01 삼각자 공격 판정 1.5배 검증

## 범위

- B01 삼각자 판정 반경을 기존 `1.05`에서 `1.575 world units`로 확대한다.

## 합격 조건

- 정확히 `1.575` 거리의 대상은 적중한다.
- `1.575` 초과 대상은 적중하지 않는다.
- 남은 HP의 30% 피해와 준비 320ms·회복 430ms는 유지한다.
- 시각 모델, 무적 무시, 좀비 밀치기 수치, 다른 보스·스테이지에 변화가 없다.

## 실행 기록

- RED: `npx vitest run src/lib/mathTeacherSpecial.test.js`에서 기존 `1.05`가 기대값 `1.575`와 불일치했고, `1.575` 경계의 좀비 밀치기가 0건으로 실패했다.
- GREEN: `npx vitest run src/lib/mathTeacherSpecial.test.js src/components/EnemyMathTeacherSpecial.test.js` — 2파일, 6테스트 통과.
- Build: `npm run build` — branch guard, Legacy B02 source/artifact gate, Vite production build 통과. 기존 vendor-three 청크 크기 경고만 출력됐다.

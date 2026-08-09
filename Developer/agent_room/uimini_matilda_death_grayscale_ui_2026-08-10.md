# UIMini 마틸다 사망 접촉 장면 흑백 고정 UI 기록

## 카드

- Kanban: `t_e675dca5`
- 담당: `uimini`

## 수행 범위

- `Enemy.jsx`와 `EnemyVisual.test.js`는 다른 작업자 소유 범위라 수정하지 않았다.
- `GameCanvas.jsx`에서 `phase === 'gameover' && deathCause === 'matilda'`일 때 Canvas에 즉시 `grayscale(1)` 필터와 `frameloop="never"`를 적용했다. 기존 Physics의 `paused={phase !== 'playing'}`와 함께 접촉 최종 장면을 고정한다.
- HUD는 마틸다 사망일 때만 기존 1초 grayscale fade를 `animation: none`, `opacity: 1`로 대체한다. 일반 사망 연출은 보존한다.

## 검증

- RED: `HUD.test.jsx`의 마틸다 사망 테스트가 기존 `gameoverGrayscaleFade 1000ms` 값으로 실패했다.
- GREEN: `npm.cmd exec -- vitest run src/components/GameCanvas.test.js src/components/HUD.test.jsx --maxWorkers=1 --no-file-parallelism` — 2개 파일, 38개 테스트 통과.
- 실제 브라우저 화면 검증은 5173을 건드리지 않기 위해 실행하지 않았다.

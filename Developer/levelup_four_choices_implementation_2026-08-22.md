# 레벨업 선택지 4개 구현 기록

## 반영

- 레벨업 선택지 추출을 최대 3개에서 최대 4개로 변경했다.
- 후보가 4개 이상이면 4개를 표시하고, 부족하면 기존처럼 가능한 후보만 표시한다.
- 같은 무기 카드 1개 제한, 무작위 셔플, 해금/등장 조건, 마지막 카드 애니메이션 완료 전 선택 차단은 유지했다.
- 레벨업 카드 그리드를 4열로 변경했다. 기존 360px 이하 카드 축소 규칙은 4열에서도 적용되므로 추가 CSS는 넣지 않았다.

## 검증

- RED: `HUD.test.jsx`의 4열·4개 버튼·4번째 카드 애니메이션 게이트 기대를 먼저 추가해 기존 구현에서 2건 실패를 확인했다.
- GREEN: `npm.cmd exec -- vitest run src/components/HUD.test.jsx --maxWorkers=1 --no-file-parallelism` — 37개 통과.

## 보류

- 확률 상향 대신 사용자 확정값에 따라 다음 레벨업 1회 보장을 적용했다.

## 후속 무기 카드 다음 레벨업 1회 보장

- 치비코 획득 뒤 다음 레벨업 선택지에는 `acquireHanako`를 한 번 우선 포함한다.
- 커터칼 획득 뒤 다음 레벨업 선택지에는 `acquireBikittyCutter`를 한 번 우선 포함한다.
- 둘이 동시에 대기하면 4개 카드 안에 둘 다 포함한다. 표시된 카드만 화면 마운트 뒤 effect에서 소진하므로, 사용자가 다른 카드를 고르더라도 보장은 그 화면에서 끝난다.
- 바이키티의 레벨 6 조건처럼 일시적으로 불가능한 경우에는 보장을 유지하고, 처음 가능한 다음 레벨업에서 표시한다.
- 하나코/바이키티가 이미 활성화됐거나 8무기 칸이 가득 찬 경우에는 더 이상 표시할 수 없으므로 대기 보장을 정리한다.
- 대기 상태는 `useGameStore`의 런타임 메모리에만 존재하며 Firebase·localStorage에 저장하지 않는다. `resetGame`에서 항상 비운다.

## 추가 검증

- RED: pending 상태가 없고 다음 레벨업 화면에 후속 카드가 없음을 store/HUD 테스트에서 재현했다.
- GREEN: `npm.cmd exec -- vitest run src/store/useGameStore.test.js src/components/HUD.test.jsx src/lib/upgrades.test.js --maxWorkers=1 --no-file-parallelism` — 110개 통과.

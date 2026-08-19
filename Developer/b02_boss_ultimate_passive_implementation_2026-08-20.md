# B02 복도 봉쇄선·복도 출입증 구현 기록 (2026-08-20)

상태: 구현 및 집중 단위 검증 완료. B03/Stage 3와 B04/Stage 4는 수정하지 않았다. AAB·브라우저·5173·커밋·푸시는 실행하지 않았다.

## 구현 범위

- `B02`만 HP 70%, 35%에서 런당 각 1회 `복도 봉쇄선`을 시작한다. 일반 `chase` 중이고 경과 시간이 200초 미만일 때만 새 시전이 가능하다.
- 1.2초 예고 뒤 복도 전체 폭의 통제선 세 개가 Z축 순서대로 활성화된다. 선 사이 3.6 간격과 맵 경계 내 배치를 유지해 항상 빈 구간이 남는다.
- 활성 통제선은 시전당 플레이어에게 최대 한 번 18 피해를 준다. 시전 중 보스는 정지하며 일반 돌진·접촉 공격은 실행되지 않고, 종료 뒤 1.2초 경직 후 추적으로 복귀한다.
- `B02` 처치 시 Firebase 진행도 `bossPassiveUnlocks.b02CorridorPass`를 해금한다. 현재 런과 이후 런에 즉시 적용하며 재처치·리셋·재로드 시 중첩하지 않는다.
- 복도 출입증은 `pencilThrow`, `bell`, `onigiri` 공격력만 `×1.05` 한다. 퀘스트 가방의 기존 8칸 레이아웃은 보존하고 카탈로그 순서 두 번째 칸에 표시한다.

## 변경 파일

- `src/lib/b02CorridorBlockade.js`, `src/lib/b02CorridorBlockade.test.js`: 순수 상태 전이, 경계 배치, 시전당 1회 피해 판정.
- `src/components/Enemy.jsx`: B02 Stage 2 런타임에서 helper 소비, 정지/예고/통제선/경직 연결.
- `src/lib/bossPassiveItems.js`, `src/store/useGameStore.js`: B02 패시브 카탈로그·Firebase 정규화·처치 해금 및 무기 적용.
- `src/components/HUD.jsx`: 기존 8칸을 유지한 카탈로그 기반 표시.
- `src/components/HUD.questInventory.test.jsx`, `src/lib/firebaseProgress.test.js`, `src/store/useGameStore.bossPassiveItems.test.js`: UI, Firebase snapshot, 현재/다음 런 및 비중첩 회귀 범위.

## RED → GREEN 증거

1. `npm.cmd exec -- vitest run src/lib/b02CorridorBlockade.test.js --maxWorkers=1 --no-file-parallelism`
   - RED: `consumeB02CorridorBlockadeHit is not a function`.
   - GREEN: helper 구현 뒤 4개 통과.
2. `npm.cmd exec -- vitest run src/components/HUD.questInventory.test.jsx --maxWorkers=1 --no-file-parallelism`
   - RED: B02 출입증 슬롯이 렌더되지 않음.
   - GREEN: 카탈로그 두 번째 슬롯 연결 뒤 9개 통과.
3. 최종 집중 검증:
   `npx vitest run src/lib/b02CorridorBlockade.test.js src/lib/bossPassiveItems.test.js src/store/useGameStore.bossPassiveItems.test.js src/components/HUD.questInventory.test.jsx src/lib/firebaseProgress.test.js --maxWorkers=1 --no-file-parallelism`
   - 5개 파일, 41개 테스트 통과.
4. 추가 store/firebase 집중 검증:
   `npx vitest run src/lib/b02CorridorBlockade.test.js src/lib/bossPassiveItems.test.js src/store/useGameStore.bossPassiveItems.test.js src/store/useGameStore.passives.test.js src/store/useGameStore.cloudProgress.test.js --maxWorkers=1 --no-file-parallelism`
   - 5개 파일, 31개 테스트 통과.
5. B02 Enemies 집중 검증:
   `npx vitest run src/components/Enemies.test.jsx -t "B02|복도|blockade" --maxWorkers=1 --no-file-parallelism`
   - 1개 파일, 1개 테스트 통과(92개 skip).
6. 프로덕션 빌드 검증:
   `npm run build`
   - Firebase release env gate, legacy B02 source/artifact gate, dialogue store gate, studio-game sync 테스트 41개, Vite production build, hosting asset verification 통과.

## 확인

- `schoolBell` 참조는 프로젝트·결정 문서에서 0건이며 실제 ID는 `bell`이다.
- Stage 2 B02 v2 경로만 사용하며 legacy 경로를 복구·참조하지 않았다.

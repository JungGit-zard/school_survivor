# B03 왕복 오래달리기·체육관 호루라기 최종 수용 검수

- 작성: Balance QA
- 일자: 2026-08-20
- Kanban: `t_806d0506` — B03 shuttle ultimate/passive final balance acceptance
- 범위: Stage 3 B03 필살기와 B03 처치 패시브. 소스 수정·Firebase 데이터 접근·브라우저·5173 조작·커밋/푸시는 수행하지 않았다.

## 결론

**정적 대조·집중 테스트·프로덕션 빌드 기준 수용(PASS)**. 실제 브라우저/E2E는 지시대로 실행하지 않았으므로 실플레이 시각 검수 완료를 주장하지 않는다.

## 정본

`Planner/stage2_3_4_boss_ultimate_decision_map_2026-08-19.md`의 B03 `왕복 오래달리기` 및 `체육관 호루라기` 항목을 기준으로 대조했다.

| 수용 기준 | 결과 |
| --- | --- |
| Stage 3의 B03만 적용, HP 65%·30% 각 1회 | PASS — Stage 3/B03 전용 분기와 임계별 플래그, 전용 집중 테스트 확인. |
| chase 상태에서만 시작, `elapsed >= 200초` 신규 시전 차단 | PASS — 시작 함수의 상태·시간 게이트와 집중 테스트 확인. |
| 플레이어 Z를 예고 때 1회 고정하고 경계 안으로 clamp | PASS — 단일 `laneZ`를 시작 상태에 저장하고 `halfZ` 기준 clamp. 이후 재조준 경로 없음. |
| 1.25초 예고 → X축 outbound/return 2 pass → 1.2초 경직 | PASS — 상태 전이 및 집중 테스트 확인. |
| pass당 16 피해, 같은 pass 1회, 총 최대 32 | PASS — pass별 피격 플래그와 X·Z 동시 근접 판정, 집중 테스트 확인. |
| 시전 중 기존 공격·추적·돌진·이동 bypass | PASS (정적) — 활성/시작 분기가 일반 시야·공격·차저 경로 이전에 velocity를 제어하고 반환함. |
| 투사체·추가 소환 없음 | PASS (정적) — B03 전용 분기는 레인·이동·접촉 피해만 처리. |
| 사망·id/type reset 시 필살기 상태 종료 | PASS (정적) — enemy reset effect가 B03 상태와 시각 상태를 새 idle 상태로 초기화하며, 사망은 기존 enemy 제거 흐름을 사용. |
| B03 첫 처치만 `b03GymWhistle` 해금 | PASS — B03 매핑·정규화·첫 해금 판정 확인. 재호출은 해금/속도를 중첩하지 않음. |
| 최종 speed `×1.05`, 기존 `baseSpeed × 1.8` cap 유지 | PASS — 전용 멱등 marker와 cap 적용, 집중 테스트 확인. |
| 현재 런·다음 런·reload 적용 | PASS (정적+집중) — 현재 player 즉시 적용, 새 런 생성 및 Firebase reload가 동일 unlock 정규화를 통해 player를 재구성함. 현재/다음 런 집중 테스트 통과. |
| Firebase snapshot 정규화 | PASS — B01/B02/B03만 보존하고 미구현 key를 제거하는 snapshot 집중 테스트 통과. |
| 퀘스트 가방 slot 3 / 전체 8칸 | PASS — B03 아이콘 카탈로그·HUD DOM 집중 테스트 확인. |
| B01/B02/B04, stage time, Matilda, overtime, 타이틀, Studio, BIG_SPAWN_SMOKE 불변 | PASS — 해당 시간표·타이틀·Studio 파일은 작업 tree diff상 변경 없음. Enemy diff의 B03 hunk만 본 검수 범위로 평가했고 기존 B02/BIG_SPAWN_SMOKE 외부 hunk는 보존·분리했다. |

## 실행 근거

`Developer/r3f_prototype`에서 다음 집중 범위를 단일 worker·비병렬로 실행했다.

```text
npx vitest run src/lib/b03ShuttleRun.test.js src/lib/bossPassiveItems.test.js src/store/useGameStore.bossPassiveItems.test.js src/lib/firebaseProgress.test.js src/components/HUD.questInventory.test.jsx src/components/EnemyVisual.test.js src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism
```

결과: **7개 파일, 166개 테스트 통과**.

`npm run build`를 1회 실행했다. branch/Firebase release 환경/legacy B02/dialogue/Studio-game sync 게이트, Vite production build, legacy B02 artifact 및 hosting asset 검증을 모두 통과했다. Vite의 dynamic-import 및 chunk-size 경고는 비차단 기존 경고다.

## 제한과 후속 검증 경계

- 실제 브라우저·OAuth·Firebase 데이터·5173은 실행하거나 변경하지 않았다.
- 전체 test suite는 B02/B03/B04 전체 구현의 최종 통합 단계에서 수행하도록 유보다.
- B03 reload 경로는 전용 B03 단독 테스트 대신 공통 `reloadPersistentProgress` 재구성 경로와 정적 대조로 확인했다. 현재/다음 런 B03 집중 테스트는 통과했다.

## 변경 기록

이번 작업에서 소스와 외부 상태를 변경하지 않았으며, 이 QA 기록만 추가했다.

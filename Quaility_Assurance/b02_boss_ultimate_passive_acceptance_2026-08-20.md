# B02 복도 봉쇄선·복도 출입증 최종 수용 검수

- 작성: Balance QA
- 일자: 2026-08-20
- Kanban: `t_be97ed5f` — B02 ultimate/passive final balance acceptance
- 검수 범위: B02 필살기·영구 패시브 구현만. `BIG_SPAWN_SMOKE` 및 기존 외부 dirty 변경은 범위 밖으로 분리했다.

## 결론

**코드·집중 테스트·프로덕션 빌드 기준 수용(PASS)** 이다. 다만 실제 Stage 2 전투 화면의 시각/E2E 검증은 인증 팝업에서 멈췄으므로 **미검증(NO CLAIM)** 으로 기록한다. 이 문서는 그 미검증 항목을 통과로 주장하지 않는다.

## 정본 대조

정본은 다음 두 문서다.

- `Planner/stage2_3_4_boss_ultimate_decision_map_2026-08-19.md`
- `Quaility_Assurance/stage234_boss_ultimate_passive_balance_review_2026-08-19.md`

| 수용 기준 | 확인 결과 |
| --- | --- |
| B02 HP 70%, 35%에서 각각 한 번만 시전 | PASS — 단계별 시전 플래그와 전용 집중 테스트가 각각 한 번의 트리거를 확인. |
| 추격(chase) 중에만 시전 | PASS — 다른 charge 상태에서는 시작하지 않음. |
| 경과 시간 200초 이상이면 새 시전 금지 | PASS — `elapsed < 200000` 조건과 집중 테스트 확인. |
| 1.2초 예고 → 3개 선 각 500ms → 1.2초 경직 | PASS — 전용 상태 전이·집중 테스트 확인. |
| 양 끝 경계에서 3개 선이 서로 다르고 간격 3.6 | PASS — 양쪽 가장자리 입력을 포함한 전용 테스트 확인. |
| 시전 1회당 플레이어 최대 18 피해, 한 번만 적용 | PASS — 활성 선 접촉 피해가 18이고 피격 플래그로 재피해를 막음. |
| 필살기 중 일반 공격 병행 금지 | PASS (정적 검수) — B02 필살기 진행/시작 프레임이 일반 시야·돌진·접촉 경로 전에 반환함. |
| Stage 2 B02 v2만 사용 | PASS — 빌드의 legacy B02 source gate 통과. |
| B03/B04 필살기·해금 상태 불변 | PASS (정적 비교) — B02 한정 경로이며 B03/B04의 스탯·해금 매핑 변경 없음. |
| 패시브 대상 | PASS — `pencilThrow`, `bell`, `onigiri`의 damage에만 `×1.05`; 사거리·관통·쿨다운 변경 없음. |
| 현재 런 및 다음 런 적용, B01과 공존 | PASS — 현재 무기 적용·새 런 생성·중복 곱셈 방지·B01/B02 병존 집중 테스트 통과. |
| B03/B04 처치로 패시브 미해금 | PASS — B03/B04 매핑 없음 및 집중 테스트 통과. |
| Firebase 정규화·스냅샷 | PASS — B01/B02만 보존하고 미구현 해금은 버리는 스냅샷 집중 테스트 통과. |
| 퀘스트 가방 슬롯 2 | PASS — B02 티켓이 2번째 슬롯이며 8칸 용량을 유지하는 HUD 집중 테스트 통과. |

## 실행 근거

`Developer/r3f_prototype`에서 아래 B02 집중 범위를 단일 워커·비병렬로 실행했다.

```text
npx vitest run src/lib/b02CorridorBlockade.test.js src/lib/bossPassiveItems.test.js src/store/useGameStore.bossPassiveItems.test.js src/lib/firebaseProgress.test.js src/components/HUD.questInventory.test.jsx src/components/EnemyVisual.test.js src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism
```

결과: **7개 파일, 162개 테스트 통과**.

`npm run build`는 1회 실행했고, Firebase release 환경 게이트, legacy B02 source 게이트, Studio-game sync(4개 파일/41개 테스트), Vite 프로덕션 빌드, legacy B02 artifact 게이트 및 hosting asset 검증을 모두 통과했다. Vite의 dynamic-import/chunk-size 경고는 기존 비차단 경고로, 이번 B02 수용 실패로 분류하지 않았다.

## 제외·제한 사항

- 일반/E2E 브라우저 시도는 Google 인증 팝업에서 중단되어 실제 Stage 2 전투 및 선 시각 연출을 확인하지 못했다. 따라서 실플레이 시각 검수 완료를 주장하지 않는다.
- 전체 테스트 스위트는 B02/B03/B04 전체 구현의 마지막 단계에서 수행하도록 유보했다.
- `e2975e8..HEAD`의 넓은 `diff --check`에서 `firebaseProgress.test.js`의 기존/외부 mission write-queue 줄 끝 공백이 관찰됐다. B02 스냅샷 hunk와 무관하며, B02 관련 범위를 좁힌 `diff --check`는 통과했다. 범위 밖 변경은 수정하거나 되돌리지 않았다.

## 변경 기록

이번 QA는 소스·Firebase·브라우저·5173·Git 커밋/푸시를 변경하지 않았다. 본 검수 기록만 추가했다.

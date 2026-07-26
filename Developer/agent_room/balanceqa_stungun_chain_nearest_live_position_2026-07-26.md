# balanceqa 전기충격기 체인 최근접 live-position 라우팅 기록 (2026-07-26)

## Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: 전기충격기의 1차 player-nearest 및 체인 impact-nearest가 stale spatial grid 때문에 잘못 선택될 수 있는 회귀 수정의 독립 QA가 필요했다.
- Specialist: `balanceqa`
- Artifact: `Quaility_Assurance/stungun_chain_nearest_live_position_validation_2026-07-26.md`

## 검증 계약

- 반드시 grid snapshot 이후 `setPosition()`으로 적이 이동했을 때 1차 탄이 현재 player-nearest target을 선택하는지 확인한다.
- 반드시 체인이 player 원점이 아니라 첫 impact 원점에서 가장 가까운, 아직 맞지 않은 live target을 선택하는지 확인한다.
- 반드시 generation, active 상태, reset, spawn/despawn, same X/Z update, uint32 wrap을 분리해 grid freshness를 검토한다.
- 반드시 simulation의 normal movement revision bump가 적 수가 아니라 frame당 한 번이고 final grid가 current인지 확인한다.
- 반드시 direct pool coordinate write의 모든 production 경로를 검색해 freshness 갱신 누락이 없는지 확인한다.

## 결과

- stale grid의 1차·체인 nearest regression, pool/simulation/StunGun 관련 지정 테스트 6파일 60개는 모두 통과했다.
- normal frame movement는 `spatialChanged` boolean으로 집계 후 1회 bump하고 final rebuild하므로 PASS다. spawn/despawn/reset과 same X/Z update도 의도대로 처리한다.
- **전체 판정은 FAIL**: 32비트 revision이 정확히 2^32회 변경 뒤 old snapshot과 같은 값으로 돌아오는 ABA 조건에서 `isCurrentFor()`가 stale grid를 current로 오판할 수 있다. 현재 wrap 테스트는 새 grid rebuild 뒤의 0만 확인해 이 조건을 막지 못한다.
- 범위·피해·쿨다운·타깃 그래픽 방향·impact-origin 체인 계약은 이번 수정으로 바뀌지 않았고, 프로덕션 코드는 QA 과정에서 수정하지 않았다.

## 다음 조치

- epoch+revision 이중 비교 또는 안전 정수 단조 revision으로 ABA를 제거한 뒤, old revision-0 grid가 wrap 뒤 false가 되는 회귀 테스트를 추가해야 한다.

## ABA 수정 재검증

- 최초 FAIL은 보존한다. uint32 wrap ABA 보완 뒤 독립 재검증 결과는 **PASS**다.
- `EnemyEntityPool.markSpatialChanged()`는 안전 정수 단조 증가를 사용하며, `Number.MAX_SAFE_INTEGER` 다음 공간 변경에서 `-1` sentinel으로 들어간 뒤 영구 유지된다.
- `EnemySpatialGrid.isCurrentFor()`는 non-negative safe pool revision만 current로 허용한다. 따라서 sentinel 상태에서는 rebuild 이후에도 grid 최적화를 사용하지 않고 안전한 전수검색 fallback을 강제한다.
- 새 boundary 테스트는 revision 0 grid snapshot, MAX_SAFE_INTEGER→-1 전이, rebuild 뒤에도 false, 후속 변경의 sentinel 유지까지 검증한다.
- 지정 Vitest 6파일 61개와 scoped `git diff --check`를 다시 통과했다. 프로덕션 코드는 QA 과정에서 수정하지 않았고 스테이징/커밋하지 않았다.

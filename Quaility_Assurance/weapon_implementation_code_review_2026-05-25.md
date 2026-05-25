# 무기 구현 코드 검수 — 12종 확장본 - 2026-05-25

## 1. 범위 / 배경

- 대상: `Developer/r3f_prototype/src/components/Weapons/*` 12개 컴포넌트와 통합 지점.
- 배경: `bc8a15a Add expanded weapon roster and upgrades` (2026-05-24) 커밋으로
  기존 7종에 5종 (`GuidedMissile`, `StarlinkWeapon`, `CompassBladeWeapon`,
  `UmbrellaGuardWeapon`, `EraserBombWeapon`) 이 추가되어 12종 정본이 되었으나,
  종합 코드 검수 기록이 누락되어 있었다. 마지막 종합 검수
  ([implementation_code_review_2026-05-16.md](implementation_code_review_2026-05-16.md))
  은 7종 기준이었고, Medium 1 발견의 “missile/starlink 복원 또는 7종 공식화” 항목이
  12종 확장으로 해소되었는지 후속 검증이 필요했다.
- 정본 카탈로그: [weaponCatalog.js](../Developer/r3f_prototype/src/lib/weaponCatalog.js).
- 정본 게이트: [Bang_Rules.md](../Bang_Rules.md) §무기 / OR-unlock policy.

## 2. 기준 상태

- 브랜치: `feature/codex-gameplay-iteration` (`origin/...` 동기화됨).
- 최신 커밋: `d83e0db Rename graphic workspace folders to English`.
- 작업트리: 검수 시작 시점 `tmp/` 외 변경 없음.

## 3. 실행한 검증

```powershell
npm test -- --run
npm run build
```

결과:
- `npm test`: 통과, **19개 테스트 파일 / 133개 테스트 통과**.
- `npm run build`: 통과 (535ms).
- 빌드 경고: `dist/assets/index-*.js 3,165 kB` (gzip 1,077 kB) — 500 kB 임계 초과 (기존 경고).

카탈로그/등록 정합성 (눈으로 1:1 매칭):

| 단계 | 카운트 | 출처 |
|---|---|---|
| `WEAPON_CATALOG` 항목 | 12 | `lib/weaponCatalog.js` |
| `Weapons/index.js` re-export | 12 | `components/Weapons/index.js` |
| `Game.jsx` 렌더 | 12 | `components/Game.jsx:62-73` |
| `UPGRADE_EFFECTS` 무기 효과 항목 | 35 (12종 ↔ unlock/damage/stat 카드) | `lib/upgrades.js` |
| `playerRecords` 지원 조건 키 | 7 (`totalRuns/totalKills/totalGold/totalSurvivalSeconds/runKills/runGold/runSurvivalSeconds`) | `lib/playerRecords.js:9-12, 80-86` |

→ 카탈로그/카드/스토어/레코드 4-레이어가 일관됨.

## 4. Findings

### High 1. `StunGun` 만 `performance.now()` 사용 — pause 시 쿨다운 누적

위치:
- [Weapons/StunGun.jsx:179-204](../Developer/r3f_prototype/src/components/Weapons/StunGun.jsx#L179-L204)

현재 흐름:
- 나머지 11종은 `useFrame(({ clock }) => ...)` 안에서 `clock.elapsedTime * 1000`을 시간축으로 쓴다.
  R3F clock은 phase가 `paused`일 때도 `delta`는 전달되지만, 쿨다운 비교는 `phase !== 'playing'` 가드로
  fire 자체가 막히므로 결과적으로 fire가 일어나지 않는다.
- `StunGun`만 `performance.now()`를 쓴다. `phase !== 'playing'` 가드는 동일하지만,
  pause/levelup 중에도 시간이 흘러 `lastFireRef.current`와의 격차가 벌어진다.
- 결과: pause 직후 재개되면 `now - lastFireRef.current >= cooldown`이 즉시 참이 되어
  **첫 프레임에 즉발 stun 1회 발사**가 발생할 수 있다 (다른 무기는 발생 안 함).

영향:
- 모바일 pause 버튼 사용이나 레벨업 모달 사이에서 stun 발사 타이밍이 불공평하게 빨라진다.
- 보스 직전 레벨업으로 의도적 cooldown reset이 가능해 밸런스 누수.

권장:
- `useFrame(({ clock }) => ...)`에서 `clock.elapsedTime * 1000`으로 통일.
- `ChainArcVisual`의 `performance.now()` 사용은 무관 (visual lifetime용).
- 단위 테스트 추가: 무기 11종 모두 pause→resume에서 fire timing 변화 없음을 검증.

### High 2. Starlink/UmbrellaGuard 매 프레임 setState — 재렌더 폭주

위치:
- [Weapons/Starlink.jsx:79-108](../Developer/r3f_prototype/src/components/Weapons/Starlink.jsx#L79-L108) — `force((n) => n + 1)` 매 프레임.
- [Weapons/UmbrellaGuard.jsx:82-89](../Developer/r3f_prototype/src/components/Weapons/UmbrellaGuard.jsx#L82-L89) — `setOpenProgress(next)` 매 프레임.

현재 흐름:
- Starlink는 visual 갱신을 React state로 forcing → strike 1개당 60fps에서 23개 프레임마다 React reconcile.
  strikeCount 3 이상이 되면 3 컴포넌트가 동시에 매 프레임 reconcile.
- UmbrellaGuard는 pulse 320ms 동안 매 프레임 `setOpenProgress` → 약 19회 reconcile.
- 다른 11종은 모두 `ref.position.set`/`material.opacity = ...` ref-기반.

영향:
- 모바일 기기에서 fps drop. Stage 후반 strikeCount=3에서 체감 가능.
- React DevTools profiler에서 무기 컴포넌트가 의도치 않게 hot path로 잡힘.

권장:
- Starlink: `StrikeVisual`에 ref를 받아 `useFrame` 안에서 mesh.scale/opacity 직접 갱신. `useState` 제거.
- UmbrellaGuard: `UmbrellaModel`에 ref 전달하고 `mesh.scale.setScalar`/`material.opacity = ...`로 갱신.

### High 3. UmbrellaGuard 우산 비주얼이 펄스 사이에 플레이어를 따라가지 않음

위치:
- [Weapons/UmbrellaGuard.jsx:92-99](../Developer/r3f_prototype/src/components/Weapons/UmbrellaGuard.jsx#L92-L99)

현재 흐름:
- JSX render: `<group position={[playerPos.x, playerPos.y + 0.5, playerPos.z]}>` — render-time 평가.
- 위치 갱신을 매 프레임 강제하는 유일한 트리거는 `setOpenProgress` 호출이다.
- 펄스가 끝난 직후 `setOpenProgress(0)`로 한 번 더 reconcile 한 뒤, **다음 펄스까지 재렌더가 없다.**
- 펄스가 끝나면 우산이 그 자리에 정지하고, 플레이어가 멀어져도 따라가지 않는다.

영향:
- 우산 방어막의 시각 피드백이 어긋난다. 펄스 발생 시 우산이 갑자기 플레이어 위로 “텔레포트”한다.
- 디펜시브 무기로서의 가독성 (“플레이어 주위에 무엇이 있다”)이 깨진다.

권장:
- High 2와 함께 묶어 해결. 우산 group에 `ref`를 두고 `useFrame`에서 `group.position.set(playerPos.x, playerPos.y + 0.5, playerPos.z)` 매 프레임 갱신.
- 펄스가 없는 상태에서는 우산을 `openProgress=0`으로 닫힌 형태로 항상 표시 (현재 의도) — 위치는 따라가야 한다.

### Medium 1. Phase 전환 시 활성 투사체 정리 부재

위치:
- [Weapons/Missile.jsx:172-256](../Developer/r3f_prototype/src/components/Weapons/Missile.jsx#L172-L256)
- [Weapons/EraserBomb.jsx:89-157](../Developer/r3f_prototype/src/components/Weapons/EraserBomb.jsx#L89-L157)
- [Weapons/Flask.jsx:99-168](../Developer/r3f_prototype/src/components/Weapons/Flask.jsx#L99-L168)

현재 흐름:
- 셋 다 `phase !== 'playing'`이면 새 발사를 막지만, **이미 비행 중인 투사체 상태(`missiles/erasers/flasks`)는 그대로 유지**한다.
- 투사체 자체의 `useFrame`은 `groupRef.current` 존재 여부만 보고 진행을 계속한다.
- `phase`가 `cleared` / `gameover`로 전환되면 화면에 정지/공중 부유 상태 비주얼이 남을 수 있다.
- 단, `Missile.jsx:78-91`은 타깃이 죽었을 때 재타깃팅 후 직진 폭발하므로 결국 onExplode가 호출돼 정리는 된다. EraserBomb은 `t >= 1`에서, Flask도 동일.

영향:
- 결과 모달 뜨는 0.4~1.2초 사이에 투사체가 보이거나 폭발 잔상이 모달 뒤에 깜빡이는 흔적이 남을 수 있다.
- 게임오버 시 적도 사라지는데 missile이 “타깃 사라짐 → 직진 → 자체 폭발” 경로로 시각 잔상.

권장:
- 12종 공통 패턴: 컴포넌트 useFrame 최상단에서 `if (phase !== 'playing') { activeRef.current = []; setState([]); return }` 한 줄 추가하거나,
- 가벼운 해결: `useEffect(() => { if (phase !== 'playing') { setMissiles([]); ... } }, [phase])` 1회 cleanup.
- 두 옵션 중 후자가 트랜션 직후 1회만 실행되어 GC 부담이 적다.

### Medium 2. Starlink 타깃 선정에 비결정적 `Math.random` 사용

위치:
- [Weapons/Starlink.jsx:14-33](../Developer/r3f_prototype/src/components/Weapons/Starlink.jsx#L14-L33) — Fisher–Yates 셔플 후 strikeCount개 선택.

현재 흐름:
- `pickStrikeTargets`가 candidates를 매번 `Math.random()`으로 셔플한다.
- QA 재현/회귀 테스트가 어렵고, replay 기능 도입 시 시뮬레이션 불일치.

영향:
- 단일 플레이 시점에서는 ‘낙뢰 무작위’가 의도지만, 기획 QA 시 재현 불가.
- E2E 테스트로 strikeCount=3 시 데미지 분포를 검증할 때 flaky.

권장:
- 게임 전역에 seedable PRNG (`xorshift32` 또는 `Mulberry32`)를 두고, store에 seed를 보관.
- 우선순위는 낮음. 현재 단일 플레이 경험에는 영향 없음.

### Medium 3. CompassBlade — 데드 적이 `enemiesRef`에 남을 가능성

위치:
- [Weapons/CompassBlade.jsx:111-117](../Developer/r3f_prototype/src/components/Weapons/CompassBlade.jsx#L111-L117)

현재 흐름:
- `enemiesRef.current.forEach((hitFn, enemyId) => { ... hitFn(w.damage) })` — `hitFn`은 등록 시점의 `rb._enemyHit`.
- `onIntersectionExit`로 일반적으로는 정리되지만, **적이 sensor 안에서 죽으면 exit 이벤트가 항상 보장되지 않는다** (Rapier 사양상 변동 가능).
- 죽은 적에 `_enemyHit`이 호출되어도 `Enemy.jsx`의 가드 (`if (deadRef.current) return`)가 막아주지만, hit interval 비교는 진행되어 약간의 오버헤드 발생.

영향:
- 게임플레이상 영향 미미. 다만 `lastHitRef`에 죽은 enemyId가 남아 메모리 천천히 증가 (run 중 enemy id 계속 증가하므로).
- Tumbler에도 같은 패턴 존재 (사전 패턴이라 회귀는 아님).

권장:
- damage loop에서 `rb` 참조 무결성 체크 추가. 또는 `Enemies.jsx`가 enemy 사망 시점에 등록된 모든 sensor map에서 제거하도록 일원화.
- 우선순위 낮음.

### Low 1. Starlink JSX의 `<primitive attach="onUpdate" object={() => {}} />` 데드코드

위치:
- [Weapons/Starlink.jsx:62-64](../Developer/r3f_prototype/src/components/Weapons/Starlink.jsx#L62-L64)

현재 흐름:
- mesh 내부에 의미 없는 noop primitive가 매달려 있다. R3F에 noop을 useUpdate처럼 시도한 흔적으로 보임.

영향:
- 동작에는 영향 없음. 코드 가독성 저하.

권장:
- 삭제.

### Low 2. Missile 폭발 위치가 타깃 “예상 위치”

위치:
- [Weapons/Missile.jsx:115-119](../Developer/r3f_prototype/src/components/Weapons/Missile.jsx#L115-L119)

현재 흐름:
- 임팩트 판정 `if (distance <= 0.5)`은 이번 프레임 이동 전 거리 기준.
- 폭발 좌표는 `t.x, t.z` (타깃의 현재 frame 위치)를 사용.
- 미사일은 그 사이 추가 이동 가능 — 시각적으로 미사일이 타깃을 통과한 뒤 타깃 자리에서 폭발.

영향:
- 작은 시각 어긋남. 데미지는 정상.

권장:
- 폭발 좌표를 `posRef.current` (미사일 현재 위치)로 변경.
- 또는 미사일 이동 후 distance 재측정.

### Low 3. 빌드 chunk 500 kB 초과 (기존 경고)

- `dist/assets/index-*.js` 3,165 kB. R3F + drei + three + rapier 단일 번들 전부 포함.
- 12종 무기 모델/지오메트리도 한 번에 import.

권장:
- 무기 모델 컴포넌트별 `React.lazy + Suspense` 분할은 R3F 특성상 효용 낮음.
- three / rapier를 vendor chunk로 분리하는 `manualChunks` 설정 검토.
- 우선순위 낮음.

## 5. 12종 정합성 — 일관성 매트릭스

| 무기 | 타겟팅 | 시간축 | 발사 단발/연발 | hit feedback | 데드 적 가드 |
|---|---|---|---|---|---|
| pencilThrow | `findClosestEnemy` | `clock` | 다발 (projectileCount) | knockback 없음 | OK |
| schoolBag (자) | sensor proximity | `clock` | 1 swing | knockback 3.8 | OK |
| tumbler | sensor + 주기 | `clock` | 지속 orbit | knockback 없음 | OK |
| scienceFlask | `findBestSplashTarget` | `clock` | 1 발 → 폭발 | knockback 2.8 | OK |
| bell | 직접 distSq | `clock` | 펄스 | knockback 4.8 | OK |
| stunGun | manual nearest | **`performance.now()`** | 1 bolt + chain | knockback 2.2 | OK |
| onigiri | `findClosestEnemy` | `clock` | 1 발 + bounce | knockback 3.2 | OK |
| guidedMissile | `findBestSplashTarget` + nearest fallback | `clock` | 1 발 → 폭발 | knockback 2.2 | OK |
| starlink | range candidate + Math.random | `clock` | strikeCount 동시 | knockback 1.4 | OK |
| compassBlade | sensor + 주기 | `clock` | 지속 orbit | knockback 없음 | OK |
| umbrellaGuard | 직접 distSq | `clock` | 펄스 | knockback 2.0 | OK |
| eraserBomb | `findBestSplashTarget` | `clock` | 1 발 → 폭발 | knockback 2.5 | OK |

→ **High 1**의 `stunGun` 시간축 단독 일탈만 강한 불일치.

## 6. 누락 테스트

다음은 자동 테스트가 없는 항목 (수동 확인 필요):

- 5종 신규 무기의 fire condition 단위 테스트 (`useFrame` 안의 cooldown 분기).
- `StunGun` pause→resume 후 cooldown reset 회귀 (High 1 검증용).
- `UmbrellaGuard` 비주얼이 플레이어 이동을 따라가는지 (High 3).
- `Starlink` strikeCount > 1 시 동시 데미지가 hitSet으로 중복 없이 들어가는지.
- 12종 전체 catalog ↔ index.js ↔ Game.jsx 정합성 체크 (현재 수동 매칭).
- `findBestSplashTarget` 후보가 0개일 때 모든 splash 무기가 발사하지 않음을 보장.

## 7. 결론 / 우선순위

- 기능 동작은 12종 모두 의도대로 fire/hit하며, 카탈로그·카드·스토어·레코드 4-레이어 정합성 OK.
- 다만 시간축 불일치, 매 프레임 setState, 우산 위치 freeze 3건은 사용자 체감 또는 모바일 성능에 직접 영향.

수정 우선순위:

1. **High 1** — StunGun 시간축 `clock` 통일.
2. **High 2** — Starlink / UmbrellaGuard 매 프레임 setState 제거 (ref-기반 갱신).
3. **High 3** — UmbrellaGuard 위치 매 프레임 갱신.
4. **Medium 1** — phase 전환 시 활성 투사체 정리 useEffect 추가.
5. **Medium 2** — Starlink 셔플 seedable PRNG 검토 (선택).
6. **Medium 3** — CompassBlade/Tumbler 데드 적 정리 (Enemies.jsx 일원화 검토).
7. **Low 1** — Starlink 데드코드 primitive 제거.
8. **Low 2** — Missile 폭발 좌표를 미사일 현재 위치로 변경.
9. **Low 3** — 번들 vendor chunk 분리는 별도 트랙.

## 8. 후속 작업으로 넘기는 항목

- 위 1~4를 다음 PR 묶음으로 구현하고, 같은 폴더에 `weapon_implementation_fixes_2026-05-XX.md`로 수정 반영 기록을 append한다.
- 본 검수 기록은 `implementation_code_review_2026-05-16.md` Medium 1 “missile/starlink 복원 또는 7종 공식화” 항목의 후속이며, 12종 정본으로 확장된 상태를 공식화한다.

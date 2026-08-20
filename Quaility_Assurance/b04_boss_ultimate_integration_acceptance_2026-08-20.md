# B04·B02~B04 보스 필살기 최종 통합 수용 검수

- 작성: Balance QA
- 일자: 2026-08-20
- Kanban: `t_347f6abe` — B04 and boss ultimate integration acceptance
- 방식: review skill의 implementation-existence 추적(진입 → Enemy 상태 → 피해/P2 → 처치 → store → Firebase snapshot → HUD).

## 최종 판정

**최종 수용 PASS.** 기능·집중 테스트·빌드와 접근성 기술명 계약을 모두 충족한다. QA는 소스 수정을 하지 않았다.

### 접근성 기술명 결함 해소 확인

이전 검수에서 발견했던 패시브명 라벨 문제는 해소됐다. `Enemy.jsx`의 B04 바닥 필살기 시각 그룹은 이제 전투 기술 정본과 일치하는 `aria-label="B04 국물 대폭발 원형 표식"`을 사용한다.

- `EnemyVisual.test.js`는 새 기술명 라벨 존재와 구 문구의 runtime source 부재를 함께 단언한다.
- `급식 국자 — 최대 체력 +5%`는 패시브 HUD 문구로 그대로 유지되어 전투 기술명과 구분된다.

## B04 수용 기준 대조

| 기준 | 결과 |
| --- | --- |
| Stage 4 chef(B04)만 적용 | PASS — `type === 'B04'`, `stage4`, `chefBoss` 전용 진입. |
| HP 50% 기존 전환에서 1회 | PASS — phase1·triggered 상태로 한 번만 시작. |
| 200초 전: 1.2초 3원 예고 → 250ms 동시 폭발 → P2 | PASS — 순수 상태 전이와 Enemy의 done→P2 연결 확인. |
| 200초 이상: 별도 필살기 없이 직접 P2 | PASS — trigger gate 차단 뒤 P2 전환. |
| Stage 4 실제 obstacle에서 3원·bounds·비중첩·안전 공간 | PASS — Stage 4 경계/실제 obstacle 입력과 중앙·가장자리 표본을 포함한 helper test 통과. |
| P1 projectile pool 미사용, 시전 중 포격/돌진 return | PASS (정적) — 필살기 분기가 일반 chef projectile/charger 처리 전에 velocity 정지 후 반환. |
| 피해 최대 16, 1회 | PASS — explosion 상태의 단일 damaged marker와 집중 테스트 확인. |
| 사망/reset cleanup | PASS (정적) — 사망 시 idle 초기화, id/type reset 및 unmount cleanup 확인. |
| 3원 동시 시각 상태·접근성 라벨 | PASS — telegraph/explode 두 상태가 세 circle map에 공통 적용되며, 라벨도 `B04 국물 대폭발` 정본과 일치. |
| `b04ServingLadle` 첫 처치, maxHp ×1.05, HP 비율 보존, 멱등 | PASS — Enemy 사망 전달, store 매핑, maxHp marker, 45/90→47.25/94.5 및 재처치 테스트 확인. |
| 현재/다음/reload, Firebase snapshot, HUD slot 4/8 | PASS — 현재 런 적용, reset/reload의 player rebuild, B01~B04 normalized snapshot, HUD 첫 4칸/뒤 4빈칸 집중 테스트 확인. |

## B02~B04 통합 추적

| 구간 | 확인 |
| --- | --- |
| 진입 | B02/B03/B04가 각 stage/type/HP/시간 gate와 별도 helper state를 사용. |
| runtime | Enemy가 각 helper state의 피해와 완료 상태를 처리하며, B04는 P2로 이어짐. |
| 처치 | 기존 `store.recordBossKill(type)`이 B01~B04 ID로 해금 매핑. |
| 저장 | unlock normalizer와 Firebase progress snapshot이 B01~B04 구현 key만 보존. |
| 표시 | HUD catalogue가 슬롯 1~4에 B01~B04, 5~8에 빈 슬롯을 렌더. |

시간표/범위 불변도 확인했다. B01~B04 boss 150초, Matilda 205초 경고·210초 등장, Stage 3 overtime 225초, title, Studio 관련 파일은 working diff상 변경이 없다. 기존 B02와 BIG_SPAWN_SMOKE hunk는 외부 변경으로 분리·보존했다.

## 실행 근거

`Developer/r3f_prototype`에서 B02/B03/B04 helper·EnemyVisual·패시브 store/Firebase/HUD/Enemies만 한 명령으로 실행했다.

```text
npx vitest run src/lib/b02CorridorBlockade.test.js src/lib/b03ShuttleRun.test.js src/lib/b04SoupBlast.test.js src/components/EnemyVisual.test.js src/lib/bossPassiveItems.test.js src/store/useGameStore.bossPassiveItems.test.js src/lib/firebaseProgress.test.js src/components/HUD.questInventory.test.jsx src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism
```

결과: **9개 파일, 176개 테스트 통과**.

`npm run build` 1회도 통과했다. Firebase release 환경·legacy B02·dialogue·Studio-game sync 게이트, Vite 빌드, legacy B02 artifact 및 hosting asset 검증이 성공했다. dynamic-import/chunk-size 경고는 비차단 기존 경고다.

## 제한

- 지시대로 browser/OAuth/5173/Firebase 데이터에 접근하지 않았다.
- 저장소 전체의 무관 테스트는 실행하지 않았다.
- Advisor가 라벨 수정 뒤 동일 통합 9개 파일/176개 테스트 재통과를 확인했다. 이번 QA는 새 build/browser를 실행하지 않았다.

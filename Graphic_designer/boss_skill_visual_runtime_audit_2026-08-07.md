# 보스 스킬 시각 런타임 감사 — 2026-08-07

## 범위와 보호 규칙

- 요청: 문서화된 B01~B04 보스 스킬의 3D toon 모델, 애니메이션, VFX 텔레그래프, Studio/로비/타이틀 연결을 코드와 대조한다.
- 이 감사는 읽기 전용이다. 런타임 코드, 테스트, Firebase 데이터, Graphics Studio 입력값, 브라우저, 커밋/푸시는 변경하지 않았다.
- 타이틀 화면은 사용자 명시 변경 없이는 잠긴 정본이다. 따라서 `TitleScene3D.jsx` 또는 타이틀이 공유하는 보스 모델을 스킬 연출 목적으로 변경하면 안 된다.
- B02는 `stage2-boss-v2`만 정본이다. 이전 B02 경로/튜닝/자산을 참조·복원·fallback으로 사용하면 안 된다. 근거: `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md`.

## 문서 정본 판정

| 보스 | 현재 적용할 문서/결정 | 판정 |
| --- | --- | --- |
| B01 | `Graphic_designer/stage1_math_teacher_special_concept_2026-07-17.md:5-22`, 이후 판정만 1.5배로 바꾼 `Developer/b01_triangle_swing_radius_1_5x_fix_2026-07-26.md:5-11` | 유효 |
| B02 | 전용 스킬 문서는 찾지 못했다. B02 v2 모델/Studio 단일 경로만 유효하다. | 전용 신규 스킬 없음 |
| B03 | `Planner/stage4_concept_wave_plan_2026-07-18.md:1`이 B03 스테이지4 2페이즈 제안을 명시적으로 폐기하고 B04를 최종 보스로 확정한다. | 폐기 — 구현 금지 |
| B04 | 현재 코드가 포격 → HP 50% 1초 텔레그래프 → 격노 돌진으로 구현한다. B03 초안의 “색/이펙트 변화·포효”는 B04 전환에 대한 구체 스펙으로 재승인된 문서가 아니다. | 행동은 유효, 전용 시각 명세는 미확정 |

## B01 수학 선생 — 삼각자 휘두르기

### 구현됨

- `ENEMY_STATS.B01`이 차저 및 전용 `mathTeacherSpecial`을 가진다: `Developer/r3f_prototype/src/components/Enemy.jsx:268-269`.
- 돌진 종료 후 `mathSwingWindup → mathSwingRecover → stun`으로 이동하며, 320ms 준비 종료 시에만 판정을 실행한다: `Developer/r3f_prototype/src/components/Enemy.jsx:960-1019`.
- 삼각자 3D toon/외곽선 모델은 오른팔 리그 안에 있고 special 때만 표시된다: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:314-339`, `:385-391`, `:742-770`.
- 준비·충돌·회복의 오른팔 회전과 몸/머리 반동이 존재한다: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:748-769`.
- 충돌 판정, 플레이어 현재 HP 30% 피해, 주변 적 밀치기는 전용 모듈에 있다: `Developer/r3f_prototype/src/lib/mathTeacherSpecial.js:1-44`.
- 코드 회귀 증거는 `mathTeacherSpecial.test.js`, `EnemyMathTeacherSpecial.test.js`, `ZombieMesh.test.js:78-81`에 있다.

### 충돌/미완료

- 그래픽 콘셉트는 삼각자 최외곽 약 `0.9` 유닛, 판정 `1.05` 유닛, “그래픽에 거의 닿을 때만 피격”을 요구한다: `Graphic_designer/stage1_math_teacher_special_concept_2026-07-17.md:24-28`.
- 최신 구현은 모델·시각 크기를 보존한 채 판정만 `1.575` 유닛으로 확장했다: `Developer/b01_triangle_swing_radius_1_5x_fix_2026-07-26.md:5-11`, `Developer/r3f_prototype/src/lib/mathTeacherSpecial.js:4`.
- 따라서 현재 시각 삼각자 도달거리와 판정이 문서상 일치하지 않는다. 최신 문서는 시각 모델 변경을 금지하므로, 그래픽 Worker가 임의로 모델/VFX를 늘려 해결하면 안 된다. 사용자 또는 기획의 새 시각 사양이 필요하다.

## B02 Stage 2 boss v2

### 구현됨

- B02는 `stage2-boss-v2` Studio ID로만 연결된다: `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js:38-42`.
- 전용 B02 v2 메시가 게임과 Studio 공통 경로로 렌더된다: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:596-687`, `:942-947`.
- 기본 차저 상태/일반 warn·charge 포즈는 있다: `Developer/r3f_prototype/src/components/Enemy.jsx:270-271`, `:908-1021`; 공용 toon `GO!` 큐는 B02의 base `charger` 값으로 표시 가능하다: `Developer/r3f_prototype/src/components/Enemy.jsx:418-434`.

### 범위 제한

- 발견한 문서에는 B02 전용 신규 보스 스킬/전용 VFX 요구가 없다. B02에 B01 삼각자 또는 B04 페이즈 전환을 이식하면 안 된다.
- 이 감사에서는 B02 v2 모델·파트·스케일·배치·Studio 상태를 변경하지 않는다. legacy 금지 게이트에 따라 과거 경로도 조사 근거로 사용하지 않았다.

## B03 체육 교사

- 현재 B03은 독립 3D toon 메시와 일반 차저 스탯을 가진다: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:424-493`, `:926-930`, `Developer/r3f_prototype/src/components/Enemy.jsx:272-273`.
- B03의 원거리 포격 → HP 50% 격노 돌진 제안은 스테이지4 대표 보스가 B04로 확정되며 폐기됐다: `Planner/stage4_concept_wave_plan_2026-07-18.md:1`.
- 따라서 문서 본문의 B03 2페이즈/VFX 제안을 현 요청의 구현 목록에 포함하면 폐기된 방향을 되살리는 충돌이다. B03은 현재 차저 동작만 보존한다.

## B04 주방장 — 포격/격노 2페이즈

### 구현됨

- B04 전용 toon 메시, 외곽선, 얼굴 텍스처 및 Studio 래퍼가 있다: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:512-594`, `:934-939`.
- 1페이즈 원거리 포격과 2페이즈 차저 스탯이 분리돼 있다: `Developer/r3f_prototype/src/components/Enemy.jsx:274-281`.
- HP 50%에서 1,000ms 텔레그래프 후 일방향 2페이즈 전환을 보장한다: `Developer/r3f_prototype/src/lib/chefBossPhase.js:4-40`, `Developer/r3f_prototype/src/lib/chefBossPhase.test.js:15-40`.
- 실제 전환 중 정지·대면·`warn`·피격 플래시, 이후 포격 중단과 차저 재초기화가 있다: `Developer/r3f_prototype/src/components/Enemy.jsx:755-788`.
- 포격은 기존 고정 투사체 풀을 사용한다: `Developer/r3f_prototype/src/components/Enemy.jsx:793-824`.
- 조리대 뒤에서 보스가 완전히 멈추지 않도록 B04만 시야차단 조기 반환에서 면제한다: `Developer/r3f_prototype/src/components/Enemy.jsx:742-752`, `Developer/r3f_prototype/src/components/EnemyChefBossSightExemption.test.js:7-36`.

### 부분 구현/누락된 시각 증거

- 텔레그래프의 실제 3D 신호는 공용 `warn` 포즈와 `hitFlash`뿐이다. B04 전용 색 변화, 전용 VFX, 전용 포효 모델/렌더러/테스트는 찾지 못했다. `VFXLayer`의 현 렌더러는 `hitSpark`, `chargeWarningLine`, `pickupPop` 세 종류뿐이다: `Developer/r3f_prototype/src/components/VFXLayer.jsx:154-159`.
- `EnemyVisual`의 3D `GO!` 큐 조건은 기본 `stats.charger`이다: `Developer/r3f_prototype/src/components/Enemy.jsx:418-434`. B04의 기본 스탯에는 `charger`가 없고 `chefPhase2.charger`에만 있으므로: `:278-281`, B04의 전환 텔레그래프 및 이후 차저 warn에서 이 큐가 렌더되지 않는다.
- `chargeWarningLine`은 B01/E05 레지스트리에만 정의돼 있으며: `Developer/r3f_prototype/src/lib/itemEffects.js:18-31`, 앱 소스에 `triggerItemVfx(...)` 호출은 없다. 즉 현재 바닥 방향선은 B01에도 실제 발사되지 않고, B04에는 등록조차 없다.
- 테스트는 페이즈 전이와 시야 면제는 확인하지만 B04의 전환 프레임, 포격 시각, 차저 경고 시각을 렌더 검증하지 않는다: `Developer/r3f_prototype/src/lib/chefBossPhase.test.js`, `Developer/r3f_prototype/src/components/EnemyChefBossSightExemption.test.js`.

## Studio·로비·타이틀 영향

- 게임/Studio 보스 모델은 모두 `StudioTunedGroup`을 사용하며 B02만 v2 ID를 사용한다: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:910-947`, `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js:38-42`.
- Studio와 로비 프리뷰는 `StageBossPreview`의 `EnemyVisual animPhase="normal"` 정적 포즈만 사용한다: `Developer/r3f_prototype/src/components/StageBossPreview.jsx:154-161`, `:209-212`; 스킬 상태를 Studio 프리뷰 값으로 저장하거나 역으로 덮어쓰지 않는다.
- Studio의 B01~B04 모델 선택은 `selectedStageBossType`으로 직접 매핑되고 변경은 Firebase 정본 mutation 경로로만 간다: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx:266-268`, `:627-631`, `:920-930`. 이 감사에서는 Apply/저장을 실행하지 않았다.
- 타이틀은 B02/B03/B01만 고정 `charge` 포즈로 배치한다: `Developer/r3f_prototype/src/components/TitleScene3D.jsx:320-335`, `:603-605`. 타이틀 정본 잠금에 따라 B04 추가, 스킬 상태 연결, 좌표·스케일·조명·음원 변경은 금지다.

## 구현 시 파일 범위 (아직 변경하지 않음)

1. B04 전환/차저 시각을 새 명시 사양으로 보완하기 전에는 `Enemy.jsx`, `ZombieMesh.jsx`, `VFXLayer.jsx`, `itemEffects.js`를 임의 편집하지 않는다.
2. 승인된 B04 전용 VFX가 생길 경우 위 런타임 파일과 대응 단위/렌더 테스트가 최소 범위다. 사운드가 포함되면 `soundmini`가 별도로 참여해야 한다.
3. B01 사거리-시각 불일치는 최신 “시각 모델 보존” 문서와 충돌하므로, 사용자/기획이 선택한 사양 없이는 수정하지 않는다.
4. B02는 `stage2-boss-v2`에서만 작업하며, B03 폐기 2페이즈를 다시 구현하지 않는다.

## 검증 기록

- 읽은 정책/참조: `project_develop_policy.md`, `Bang_Rules.md`, `AGENTS.md`, `CLAUDE.md`, `SESSION_CONTINUITY.md`, `Graphic_designer/Bang_survivor_Graphic_concept.md`, B02 v2 no-legacy gate 및 상기 보스 문서.
- 실행한 읽기 전용 검사: `git status --short --branch`, `rg`, `Get-Content`.
- 브라우저, Firebase, Graphics Studio Apply, 런타임 테스트, 빌드, 커밋, 푸시는 실행하지 않았다.
- 기존 작업 트리 변경은 보존했다.

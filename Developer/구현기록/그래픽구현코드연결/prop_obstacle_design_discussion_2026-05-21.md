# Props 충돌 추가 설계 논의

**작성일**: 2026-05-21  
**논의 주제**: ClassroomFloor.jsx의 시각 전용 props를 플레이어·적 이동을 막는 전략 장애물로 전환  
**관련 파일**:
- `src/components/ClassroomFloor.jsx`
- `src/components/Floor.jsx`
- `src/components/Player.jsx`
- `src/components/Enemy.jsx`
- `Graphic_designer/Concept_Rules/stage_graphic_cons.md`

---

## 1. 현재 물리·충돌 시스템 현황

### Rapier 사용 방식 (Floor.jsx 기준)

`Floor.jsx`는 `@react-three/rapier`를 사용하여 3종의 고정 콜라이더를 구성한다.

| 콜라이더 | 위치 | 역할 |
|---|---|---|
| `RigidBody type="fixed"` + `colliders="cuboid"` (planeGeometry) | y=0, 전체 바닥 | 낙하 방지 바닥 평면 |
| `RigidBody type="fixed"` × 4 (boxGeometry) | 맵 외곽 ±48 | 경계 벽 (플레이어·적 이탈 방지) |

맵 크기는 `MAP_SIZE * TILE_SIZE = 24 × 4 = 96 유닛`. 경계 벽 두께는 논리적으로 1 유닛이며 `visible={false}`로 화면에 보이지 않는다.

현재 ClassroomFloor.jsx의 모든 props는 `RigidBody` 없이 순수 `<mesh>` / `<group>`만으로 구성되어 있다. 즉 **충돌 없음 — 시각 전용**.

### 플레이어 hitbox 크기 및 이동 방식 (Player.jsx)

```
CuboidCollider args={[0.136, 0.32, 0.136]}
```

- 반크기(half-extents) 기준: X=0.136, Y=0.32, Z=0.136
- 실제 히트박스 풋프린트: **0.272 × 0.272** (정사각형)
- 높이: 0.64 (반크기 0.32 × 2)
- 이동: `setLinvel()` 직접 속도 주입. `linearDamping={10}` 으로 방향 전환 즉각 반응.
- `lockRotations` → 물리 회전 잠금, 시각 회전은 `meshGroup.rotation.y`로 보간
- 입력: 키보드 WASD / 가상 조이스틱(joystickDir) 양쪽 지원

### 적 AI 이동 방식 (Enemy.jsx)

**회피 로직 없음**. 모든 적 타입은 `playerPos`를 향한 직선 추격이 기본이다.

| 타입 | 이동 방식 | 특이사항 |
|---|---|---|
| E01, E02, E03, E06 | 플레이어를 향한 직선 추격 (`_dir.normalize()` + `setLinvel`) | 기본 추격 |
| E04 | 플레이어와 거리 유지 (선호 거리 5.5 유닛, 최소 3.5 유닛) | 원거리 후퇴·전진 |
| E05, B01 | 직선 추격 → warnDist 이내 돌진 상태 머신 | chase→warn→charge→stun |

**결론**: 현재 적 AI는 장애물 회피 경로 탐색(pathfinding) 로직이 없다. `RigidBody` 충돌만으로 적이 장애물에 막히지만, 막힌 상태에서 우회하지 않고 제자리에서 밀리는 동작을 한다. 장애물 도입 시 적이 장애물에 끼는 현상이 발생할 수 있으며, 이는 플레이어에게 유리한 코너 파밍 기회가 된다 (서바이버라이크 표준 전술).

적 콜라이더:
```
BASE_COL = [0.14, 0.26, 0.10]  // scale=1 기준 반크기
실제 크기 = BASE_COL × stats.scale × ENEMY_SIZE_MULTIPLIER(4/3)
```
E01 기준: 0.187 × 0.347 × 0.133 (반크기). 풋프린트 약 0.374 × 0.267.

---

## 2. Props에 충돌 추가하는 기술적 방법

### `<RigidBody type="fixed">` + `<CuboidCollider>` 패턴

기본 패턴은 Floor.jsx의 경계 벽과 동일하다. `colliders={false}`로 자동 콜라이더를 끄고 명시적 `CuboidCollider`를 설정하면 시각 메시와 히트박스 크기를 독립적으로 제어할 수 있다.

```jsx
// 예시: PropFallenDesk에 충돌 추가
import { RigidBody, CuboidCollider } from '@react-three/rapier'

function PropFallenDesk({ position, rotation }) {
  // ... 기존 material useMemo ...
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      {/* 충돌 박스: 시각 메시(1.6×0.7)보다 약간 작게 설정 */}
      <CuboidCollider args={[0.75, 0.30, 0.32]} />
      
      {/* 기존 시각 메시 그대로 유지 */}
      <group renderOrder={1}>
        <mesh material={deskMat} position={[0, 0.1, 0]} rotation={[0, 0, Math.PI * 0.07]} castShadow>
          <boxGeometry args={[1.6, 0.08, 0.7]} />
        </mesh>
        {/* ... 다리 메시 ... */}
      </group>
    </RigidBody>
  )
}
```

**주의**: `RigidBody`에 `position`과 `rotation`을 넣으면 기존 `group`의 `position`/`rotation` prop은 제거해야 중복 변환을 방지한다.

### 사물함처럼 높이가 있는 props

사물함(PropContamLocker) 본체는 y=0.7, 높이=1.4. 절반 높이를 기준으로 CuboidCollider를 배치한다.

```jsx
function PropContamLocker({ position, rotation }) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      {/* 전체 사물함을 하나의 큰 박스로 커버 */}
      <CuboidCollider args={[0.28, 0.70, 0.23]} position={[0, 0.70, 0]} />
      
      <group renderOrder={1}>
        {/* 기존 시각 메시들 */}
      </group>
    </RigidBody>
  )
}
```

### 성능 고려

현재 ClassroomFloor의 충돌 추가 대상 props 수량:

| Prop 타입 | 인스턴스 수 | 충돌 추가 권장 |
|---|---|---|
| PropFallenDesk | 3 | 예 (전략 장애물) |
| PropChairPile | 2 | 예 (전략 장애물) |
| PropContamLocker | 2 | 예 (전략 장애물 + 큰 차단체) |
| PropSafetyCone | 4 | 협의 필요 (아래 §5) |
| PropWarningTape | 3 | 아니오 (바닥 데칼 수준) |
| PropWindowShadow | 2 | 아니오 (그림자 전용) |
| PropExamPaper | 4 | 아니오 (바닥 장식) |
| PropContamPuddle | 3 | 협의 필요 (슬로우/데미지 존 가능성) |

최대 시나리오 (사물함 3 + 책상 3 + 의자 더미 2 + 콘 4 = 12개)도 Rapier fixed RigidBody 12개는 성능상 문제없다. Rapier는 `fixed` 타입 RigidBody를 정적 트리에 배치하므로 매 프레임 물리 연산 비용이 거의 없다.

---

## 3. 전략적 배치 제안

### 서바이버라이크에서 장애물의 전략 가치

서바이버라이크 장르에서 장애물은 세 가지 역할을 한다.

1. **채널링(Channeling)**: 적의 이동 경로를 좁혀 DPS를 집중시킨다. 좁은 통로를 통과하는 적의 밀도가 올라가므로 관통 무기(연필 투척) 효율이 극대화된다.

2. **코너 파밍(Corner Farming)**: 장애물 모서리를 이용해 적을 한 방향으로 몰아넣고 원거리 무기로 안전하게 타격. 적 AI가 pathfinding 없이 직선 추격만 하는 현재 구조에서 더욱 강력한 전술이 된다.

3. **피난처(Refuge)**: 적이 많아질 때 일시적으로 시야를 차단해 압박을 줄이는 숨막힘 해소 공간. 단, 완전 밀폐 공간은 금지(stage_graphic_cons.md §4 배치 규칙).

### 각 Prop 타입별 전략 역할 제안

| Prop | 전략 역할 | 배치 원칙 |
|---|---|---|
| **사물함 (ContamLocker)** | 1차 채널 형성기. 두꺼운 수직 장벽. | 벽 근처에 나란히 배치해 좁은 통로(2~3 유닛) 생성. 등 뒤를 잡히면 탈출이 어려우므로 출구 방향 필수 확보. |
| **쓰러진 책상 (FallenDesk)** | 낮고 넓은 허들. 통로 방향을 유도하는 가이드 역할. | 대각선으로 배치해 자연스러운 zig-zag 경로 생성. 콘과 조합해 코너 파밍 포인트 구성. |
| **의자 더미 (ChairPile)** | 소형 돌출 장애물. 좁은 통로의 마감재. | 사물함·책상 배치 후 남은 틈을 메워 채널 완성. 단독 배치 시 전략 가치 낮음. |
| **안전 콘 (SafetyCone)** | 협의 필요 (§5). 현재 배치는 4개가 독립 산재. | 콘이 작아 혼자로는 장애물 역할 미미. 2~3개 묶음 배치 시 효과적. |

### 배치 밀도 기준 (stage_graphic_cons.md §4, §16-3 ObstacleLayer 기준)

- **이동 방해는 전체 맵의 15% 이하**
- 맵 전체 바닥 면적: 96 × 96 = 9,216 유닛²
- 15% 상한: 약 1,382 유닛²
- 현재 주요 props의 충돌 추가 시 점유 면적 추정:
  - 사물함 2개 × (0.55×0.45) = 0.50 유닛²
  - 책상 3개 × (1.6×0.7) = 3.36 유닛²
  - 의자 더미 2개 × (0.55×0.55) = 0.60 유닛²
  - **합계 약 4.46 유닛² → 전체 맵의 0.05% 수준**
- 현재 props 수로는 15% 상한에 한참 못 미침. 전략적 밀도를 높이려면 props 수를 3~4배 늘리거나 크기를 키워야 한다.
- **중앙부(±8 유닛 이내) 비워두는 규칙 유지** — 현재 ClassroomFloor 배치도 이미 이 규칙을 지키고 있음.

---

## 4. 크기 조정 제안

### 현재 크기 → 전략적 크기 (시각 메시 기준)

| Prop | 현재 시각 크기 | 현재 충돌 | 제안 충돌 박스 (half-extents) | 제안 근거 |
|---|---|---|---|---|
| **책상 (FallenDesk)** | 1.6 × 0.7 (+ 다리 높이 약 0.55) | 없음 | `[0.75, 0.30, 0.32]` | 다리 포함 전체 범위 커버. 시각 보다 약간 작게 설정해 얕게 파고드는 조작 가능 |
| **사물함 (ContamLocker)** | 0.55 × 0.45, 높이 1.4 | 없음 | `[0.27, 0.70, 0.22]` position Y=0.70 | 전체 높이 커버. 가장 단단한 장벽 역할 |
| **의자 더미 (ChairPile)** | 0.55 × 0.55, 높이 ~0.6 | 없음 | `[0.26, 0.30, 0.26]` | 아래 의자만 커버 (위 의자는 기울어져 있어 시각적 돌출로 처리) |
| **안전 콘 (SafetyCone)** | 원뿔 밑 r=0.20, 높이 0.53 | 협의 필요 | `[0.12, 0.26, 0.12]` (추가 시) | 얇아서 단독 충돌 효과 낮음. 2~3개 군집 배치 시에만 충돌 추가 권장 |

**전략 크기 조정 제안 (현재 배치 구성 유지 시)**:

현재 책상 3개 + 사물함 2개 + 의자 더미 2개의 총 충돌 면적(~4.5 유닛²)은 너무 적다. 전략적 장애물로서 의미 있는 밀도를 만들려면 다음 중 하나를 선택해야 한다:

- **옵션 A (크기 키우기)**: 책상 1.6→2.4, 사물함 쌍으로 배치해 가상 패널(1.2×0.5 크기 블록)처럼 처리
- **옵션 B (수 늘리기)**: 기존 크기 유지, props 수를 책상 6개, 사물함 4~6개로 확장
- **옵션 C (혼합)**: 사물함만 크기 키우고 (충돌 0.60×1.4×0.50), 책상은 수를 2배 늘림

---

## 5. 미해결 질문 (그래픽디자이너와 협의 필요)

### Q1. 안전 콘: 충돌 있어야 하는가?

현재 안전 콘(PropSafetyCone)은 4개가 독립 배치되어 있다. 밑면 반지름 0.20 유닛은 플레이어 hitbox(0.272 유닛)와 비슷해 혼자서는 충돌 의미가 낮다.

**협의 포인트**:
- 콘 자체에 충돌을 추가할 경우, 플레이어가 작은 콘에 걸려 답답함을 느낄 수 있음
- 콘에 충돌을 추가하려면 밑면 반지름을 0.30~0.35 유닛으로 키우는 것이 타당
- 또는 콘은 순수 장식(시각 전용) 유지하고, 전략 역할은 책상·사물함에만 맡기는 방향도 검토 가능
- 콘을 2~3개 그룹으로 재배치하면 충돌 없이도 이동 심리적 차단 효과 발생

### Q2. 오염 웅덩이(PropContamPuddle): 이동 불가 vs 슬로우/데미지 존?

현재 오염 웅덩이는 바닥 데칼(시각 전용)이다. 게임플레이 역할 세 가지 중 하나를 선택해야 한다.

| 역할 | 구현 방식 | 장점 | 단점 |
|---|---|---|---|
| **이동 불가 장벽** | `RigidBody type="fixed"` + 얇은 CuboidCollider | 구현 단순 | 웅덩이가 단단한 벽처럼 느껴져 비직관적 |
| **슬로우 존** | `RigidBody` sensor + `onIntersectionEnter` → 플레이어 speed 감소 | 서바이버라이크 표준 | 슬로우 효과 UI 표시 필요, 플레이어·적 모두 영향 고려 |
| **데미지 존** | sensor + 지속 데미지 tick | 보스 장판과 유사한 역할 | 정적 오염 웅덩이와 보스 동적 장판의 시각 구분이 핵심 (ClassroomFloor.jsx 주석에도 명시됨) |
| **순수 시각 전용 유지** | 현재 그대로 | 구현 비용 0 | 게임플레이 기여 없음 |

**협의 포인트**: 보스 장판(동적, 형광 녹색, 펄스 있음)과의 혼동 방지를 위해 정적 웅덩이를 슬로우 존으로 만들 경우, 시각적으로 명확한 구분 표시 방법 필요. 현재 ClassroomFloor 주석에 "저채도·무펄스·얇은 테두리"로 이미 구분 처리 중.

### Q3. 충돌 있는 props의 시각 표시 방법?

플레이어가 장애물인지 모를 경우 답답함을 유발한다. 서바이버라이크에서는 장애물임을 즉시 알아볼 수 있어야 한다.

**협의 포인트**:
- **시각적 무게감 강화**: 충돌이 있는 props는 현재보다 그림자·하이라이트를 강하게 줘서 "덩어리"처럼 보이게 할 것을 권장
- **충돌 경계 표시선 추가 여부**: 개발 디버그용으로만 보이는 Rapier wireframe 모드 사용 가능. 실제 플레이에서는 제거.
- **stage_graphic_cons.md §16-3 ObstacleLayer**: "충돌 오브젝트와 장식 오브젝트를 구분한다"고 명시. 그러나 시각적 구분 방법(아이콘, 색상, 그림자 등)은 구체적으로 정해지지 않음.
- **그림자 레이어 활용**: 충돌 있는 props에만 바닥 그림자 타원을 추가해 시각적으로 구분. `ShadowLayer` 활용 고려.

---

## 부록: 빠른 참조

### 현재 R3F Prototype 물리 스택

```
@react-three/rapier
  ├─ Floor.jsx
  │    ├─ RigidBody fixed (바닥 평면)
  │    └─ RigidBody fixed × 4 (경계 벽)
  ├─ Player.jsx
  │    └─ RigidBody dynamic + CuboidCollider [0.136, 0.32, 0.136]
  └─ Enemy.jsx
       └─ RigidBody dynamic + CuboidCollider [BASE_COL × scale × 4/3]
```

### 최소 구현 코드 패턴 (즉시 적용 가능)

```jsx
// ClassroomFloor.jsx 상단에 import 추가
import { RigidBody, CuboidCollider } from '@react-three/rapier'

// PropContamLocker — 가장 전략 가치 높은 장벽부터 시작 권장
function PropContamLocker({ position, rotation }) {
  // ... material useMemo 동일 ...
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <CuboidCollider args={[0.27, 0.70, 0.22]} position={[0, 0.70, 0]} />
      <group renderOrder={1}>
        {/* 기존 mesh 코드 그대로 */}
      </group>
    </RigidBody>
  )
}
```

---

*이 문서는 논의 목적으로 작성된 설계 문서입니다. 실제 코드 구현 전 그래픽디자이너와 §5 미해결 질문을 먼저 정리할 것을 권장합니다.*

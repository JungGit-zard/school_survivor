# 뱀서라이크 웹게임 안정화 지침 (Agent-Ready)

대상: Three.js + React Three Fiber(R3F) + `@react-three/rapier` 기반, 로우폴리 캐릭터 수십 마리가 동시 등장하는 뱀파이어 서바이버 라이크 웹게임.

목적: 느려짐(성능 저하) / 몬스터 사라짐(렌더링 소실) / Rapier 물리 이상 3대 증상을 진단·수정·예방하기 위한 통합 규칙.

사용법: AI 에이전트는 코드를 작성·검수할 때 아래 RULE을 강제 조건으로 취급하고, 버그 발생 시 §6 진단 프로토콜을 순서대로 실행한다.

---

## 0. 최우선 원칙 (Golden Rules)

- RULE-0.1 매 프레임 실행되는 코드(`useFrame`, 물리 콜백)에서 React state 업데이트(`setState`) 금지. `ref`/mutable 객체를 직접 변형한다.
- RULE-0.2 매 프레임 객체 생성 금지. `new Vector3()`, `new Quaternion()`, 배열/객체 리터럴을 `useFrame` 안에서 만들지 않는다. 모듈 스코프 또는 `useMemo` 스크래치 객체를 재사용한다.
- RULE-0.3 엔티티는 생성/파괴하지 않고 풀링(pooling) 한다. 몬스터·투사체·이펙트는 최대 수량만큼 미리 만들고 활성/비활성만 토글한다.
- RULE-0.4 모든 수치 입력(위치, 속도, delta)은 물리·렌더에 넣기 전에 유효성 검사(NaN/Infinity/과대값)를 통과해야 한다. NaN은 한 프레임 만에 씬 전체를 오염시킨다.
- RULE-0.5 “사라짐”과 “물리 이상”의 80%는 (a) NaN 전파, (b) frustum culling 미설정, (c) 파괴된 rigid body 참조, (d) `instanceMatrix` 업데이트 누락 중 하나다. 새 원인을 가정하기 전에 이 4개를 먼저 배제한다.

---

## 1. 아키텍처 규칙

### 1.1 엔티티 상태는 React 밖에 둔다

- RULE-1.1 몬스터 수십 마리의 위치/HP/상태를 React state나 컴포넌트 트리로 표현하지 않는다. 몬스터 1마리 = 컴포넌트 1개 구조는 리렌더·마운트 비용으로 반드시 느려진다.
- RULE-1.2 권장 구조는 SoA(Structure of Arrays) + 고정 크기 풀이다.

```ts
export const MAX_ENEMIES = 200;
export const enemies = {
  active: new Uint8Array(MAX_ENEMIES),
  posX: new Float32Array(MAX_ENEMIES),
  posZ: new Float32Array(MAX_ENEMIES),
  hp: new Float32Array(MAX_ENEMIES),
  type: new Uint8Array(MAX_ENEMIES),
  generation: new Uint16Array(MAX_ENEMIES),
};
```

- RULE-1.3 UI(HP바, 킬 카운트 등)에 필요한 값만 zustand 등으로 저빈도(throttle) 동기화한다. zustand를 쓸 경우 `useFrame` 안에서는 `useStore.getState()` / `setState()`의 transient 패턴만 사용하고 selector 구독은 UI 컴포넌트에서만 한다.

### 1.2 stale 참조 방지: generation 핸들

- RULE-1.4 풀 슬롯을 재사용하면 “죽은 몬스터 인덱스를 들고 있던 투사체가 새로 스폰된 몬스터를 때리는” 버그가 생긴다. 엔티티 참조는 `{ index, generation }` 쌍으로 저장하고, 사용 시점에 `enemies.generation[index] === handle.generation`을 검증한다. 불일치 시 참조를 폐기한다.

### 1.3 게임 루프 단일화

- RULE-1.5 로직 실행 지점은 하나의 `useFrame` 또는 Rapier `useBeforePhysicsStep`으로 통합한다. 여러 컴포넌트에 흩어진 `useFrame`은 실행 순서가 보장되지 않아 “이동 → 충돌판정 → 렌더” 순서가 깨진다. 순서가 중요하면 `useFrame(cb, priority)`의 priority를 명시한다.

---

## 2. 성능 저하 대응

### 2.1 렌더링: 드로우콜을 상수로 만든다

- RULE-2.1 같은 메시의 몬스터 수십~수백 마리는 반드시 `InstancedMesh` 하나로 그린다. 개별 `<mesh>` 수십 개는 저사양에서 즉시 프레임 드랍을 만든다.
- RULE-2.2 비활성 슬롯은 스케일 0 행렬 또는 `count` 축소로 숨긴다. `instancedMesh.count`를 활성 수로 유지하면 GPU 낭비가 없다. 단, 슬롯을 앞쪽으로 컴팩션하거나 `count = 최대 활성 인덱스 + 1`로 관리한다.
- RULE-2.3 행렬을 갱신한 프레임에는 반드시 `instanceMatrix.needsUpdate = true`를 호출한다. 색상 변경 시 `instanceColor.needsUpdate = true`.
- RULE-2.4 재질/지오메트리는 모듈 레벨에서 1회 생성 후 공유한다. JSX에 `<meshStandardMaterial />`을 인스턴스마다 두지 않는다.
- RULE-2.5 그림자는 뱀서라이크에서 최대 성능 킬러다. `castShadow`는 플레이어 등 소수만, 몬스터는 blob shadow 또는 미적용. 라이트는 1~2개로 제한, `shadow.mapSize`는 1024 이하.
- RULE-2.6 `<Canvas dpr={[1, 1.5]}>` 등으로 devicePixelRatio 상한을 둔다. 포스트프로세싱은 최소화한다.

### 2.2 GC 압박 제거

- RULE-2.7 프레임 히치의 주범은 GC다. 다음을 검사한다:
  - `useFrame` 내부의 `new`, spread, 배열/객체 리터럴
  - `Array.map/filter`로 새 배열 생성
  - `getWorldPosition(new Vector3())` 패턴
  - 문자열 연결/`JSON.stringify`를 프레임 단위 호출
- RULE-2.8 거리 비교는 `distanceToSquared`를 사용한다. 타게팅/충돌 후보 탐색은 O(N²) 전수 비교 대신 균일 그리드(spatial hash)로 근처 셀만 조회한다. 몬스터 100+ 시 필수.

### 2.3 React 오버헤드 제거

- RULE-2.9 게임 플레이 중 마운트/언마운트가 반복되는 컴포넌트가 없어야 한다. `{enemies.map(e => <Enemy key={e.id}/>)} ` 패턴 금지.
- RULE-2.10 React DevTools Profiler로 게임 플레이 중 리렌더되는 컴포넌트를 확인하고, Canvas 하위 리렌더 횟수를 0에 수렴시킨다.

### 2.4 성능 계측 절차

- RULE-2.11 최적화 전 반드시 계측한다. r3f-perf 또는 stats.js를 부착하고 다음 기준으로 판단한다:
  - draw calls가 몬스터 수에 비례해 증가 → 인스턴싱 미적용
  - JS(CPU) 시간 급증 + 몬스터 수 비례 → O(N²) 또는 GC
  - GPU 시간 급증 → 그림자/포스트/해상도
  - 주기적 스파이크 → GC

---

## 3. 몬스터 사라짐 대응

- CHECK-3.1 Frustum Culling 오판: InstancedMesh의 boundingSphere는 인스턴스 이동을 반영하지 않는다. 무리가 통째로 사라지면 `instancedMesh.frustumCulled = false` 또는 boundingSphere 수동 확장.
- CHECK-3.2 NaN 전파: 위치에 NaN이 들어가면 렌더에서 조용히 사라진다. 원인: 0벡터 normalize, 0 나누기, 초기화 전 값 사용, 탭 복귀 시 거대 delta. 이동 벡터 길이 0 가드, delta clamp, DEV NaN 감시를 둔다.

```ts
if (import.meta.env.DEV) {
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (enemies.active[i] && !Number.isFinite(enemies.posX[i])) {
      throw new Error(`NaN pos at enemy ${i}, gen ${enemies.generation[i]}`);
    }
  }
}
```

- CHECK-3.3 `instanceMatrix` 갱신 누락: 스폰 직후 한 번만 안 보이거나 특정 조건에서만 갱신이 멈추면 `needsUpdate` 플래그 누락 또는 count 관리 오류를 확인한다.
- CHECK-3.4 풀 슬롯 이중 사용/인덱스 충돌: 스폰 시 `active[i] === 0` 검증, 디스폰 시 generation 증가.
- CHECK-3.5 물리 낙하/사출: y가 -∞로 떨어지거나 먼 곳으로 튕겨나간 경우. 매 프레임 월드 경계 밖 엔티티를 감지해 로그 + 회수한다.
- CHECK-3.6 z-fighting / 카메라 near-far: 특정 각도에서만 깜빡이면 near/far 범위를 좁히고 지면과 겹치는 폴리곤을 분리한다.

---

## 4. Rapier 물리 이상 대응

### 4.1 뱀서라이크에 맞는 물리 설계

- RULE-4.1 몬스터 수십 마리를 전부 dynamic rigid body로 두지 않는다. 권장 계층:
  - 몬스터 이동: 순수 코드(스티어링 + 그리드 기반 separation)
  - 몬스터 body: `kinematicPosition`, 매 스텝 `setNextKinematicTranslation()`
  - 피격 판정: 거리 기반 판정(spatial grid) 또는 sensor collider + intersection 이벤트
  - dynamic body는 플레이어, 물리 반응이 꼭 필요한 소수 오브젝트에만
- RULE-4.2 dynamic을 쓸 수밖에 없다면 `lockRotations`, `linearDamping`, collisionGroups 분리로 solver 부하와 폭발적 밀침을 방지한다.

### 4.2 흔한 물리 이상과 원인

- CHECK-4.3 몬스터가 튕겨 날아감/떨림/겹침 폭발: 다수 dynamic body가 겹친 상태로 스폰된 것이 흔한 원인. 스폰 위치 겹침 방지, kinematic 전환, `setTranslation` 남용 금지.
- CHECK-4.4 빠른 투사체/몬스터가 통과: CCD 활성화 또는 투사체는 물리 대신 레이캐스트/거리 스윕으로 판정.
- CHECK-4.5 파괴된 body 참조: collision 이벤트 안에서 body 제거 후 같은 프레임에 stale 핸들을 쓰면 오류. 제거 큐에 넣고 물리 스텝 밖에서 일괄 처리. 모든 body 접근 전 null/isValid/generation 검증.
- CHECK-4.6 프레임레이트에 따라 물리 결과가 달라짐: 고정 timestep 유지, 필요 시 렌더만 보간.
- CHECK-4.7 잠들어서 안 움직임: `wakeUp: true` 또는 소수 body에만 `canSleep={false}`.
- CHECK-4.8 kinematic인데 `setTranslation` 사용: kinematic body는 `setNextKinematicTranslation()` 사용.
- CHECK-4.9 물리에 NaN 유입: `applyImpulse`/`setLinvel` 등 물리 입력 직전에 `Number.isFinite` 가드.

### 4.3 R3F-Rapier 통합 규칙

- RULE-4.10 물리 위치가 source of truth다. `<RigidBody>` 하위 메시의 `position`을 직접 만지지 않는다.
- RULE-4.11 body 생성/파괴를 게임 중 반복하지 않는다. 비활성 body는 `setEnabled(false)` 후 먼 대기 좌표로 이동시킨다.
- RULE-4.12 물리와 동기화된 로직은 `useBeforePhysicsStep` / `useAfterPhysicsStep`에서 실행해 스텝과 순서를 고정한다.

---

## 5. 프레임 안정성 공통 규칙

- RULE-5.1 Delta clamp: `const dt = Math.min(delta, 1 / 30);`를 모든 로직 기준으로 사용한다.
- RULE-5.2 탭 비활성 처리: `document.visibilitychange`에서 게임을 pause하고, 복귀 시 첫 프레임 delta를 무시한다.
- RULE-5.3 스폰 스로틀: 웨이브 스폰을 한 프레임에 몰지 말고 프레임당 N마리로 분산한다.
- RULE-5.4 에러 격리: 최상위 루프에 try/catch를 두되, DEV에서는 throw하여 원인 프레임을 즉시 포착하고, PROD에서는 해당 엔티티만 비활성화하고 로그를 남긴다.

---

## 6. 통합 진단 프로토콜

증상을 보고받으면 아래 순서대로 진행한다.

1. 재현 조건 고정: 몬스터 수, 경과 시간, 특정 무기/이벤트 등 트리거를 특정한다. 시간 경과에 따라 악화되면 누수/GC/풀 고갈 계열로 본다.
2. 계측 부착: r3f-perf 또는 stats.js + 활성 엔티티 수 + 풀 사용량 + Rapier body 수를 디버그 HUD에 표시한다.
3. DEV 전용 불변식 검사 삽입:
   - 좌표/속도 NaN 검사
   - 활성 몬스터 수 === 활성 body 수 === 렌더 인스턴스 수 일치 검사
   - 월드 경계 밖 엔티티 검사
4. 증상 분기:
   - 지속적 프레임 저하 → 드로우콜 → 로직 복잡도 → GC 순서
   - 간헐적 히치 → GC / 스폰 스파이크
   - 통째로/무리째 사라짐 → frustum culling
   - 개별적·점진적 사라짐 → NaN → 풀 → 물리 낙하
   - 튕김/떨림/통과 → Rapier 물리 이상 체크
   - 크래시/isValid 오류 → 파괴된 body 참조 체크
5. 최소 재현으로 축소: 무기 비활성화, 몬스터 1종만, `<Physics debug>` 등으로 변수를 하나씩 제거한다.
6. 수정 후 회귀 검증: §7 체크리스트 전 항목 통과 + 몬스터 최대 수량 상태 3분 이상 방치 테스트(soak test).

---

## 7. 코드 검수 체크리스트

PR/생성 코드마다 확인한다.

- [ ] `useFrame`/물리 콜백 안에 `setState`, `new`, 배열 생성이 없다. (RULE-0.1, RULE-0.2)
- [ ] 몬스터/투사체가 컴포넌트 map이 아닌 풀 + InstancedMesh로 렌더된다. (RULE-1.2, RULE-2.1, RULE-2.9)
- [ ] `frustumCulled = false` 또는 boundingSphere 수동 관리가 되어 있다. (CHECK-3.1)
- [ ] 행렬 갱신 후 `needsUpdate = true`가 호출된다. (RULE-2.3)
- [ ] 엔티티 참조는 index+generation 핸들이고 사용 전 검증한다. (RULE-1.4)
- [ ] 몬스터 body는 kinematic이고 dynamic은 최소화되어 있다. (RULE-4.1)
- [ ] body 제거는 큐잉되어 스텝 밖에서 처리되고, 접근 전 null/valid 가드가 있다. (CHECK-4.5)
- [ ] 빠른 오브젝트는 CCD 또는 레이캐스트 판정이다. (CHECK-4.4)
- [ ] delta clamp와 visibilitychange pause가 있다. (RULE-5.1, RULE-5.2)
- [ ] 물리/렌더 입력 전 `Number.isFinite` 가드 또는 DEV NaN 감시가 있다. (RULE-0.4)
- [ ] 근접 탐색이 O(N²)이 아니라 spatial grid를 쓴다. (RULE-2.8)
- [ ] 그림자·dpr·포스트프로세싱이 예산 내로 제한되어 있다. (RULE-2.5, RULE-2.6)

---

## 8. 참조 구현 스니펫

### 8.1 풀 기반 스폰/디스폰

```ts
export function spawnEnemy(x: number, z: number, type: number): number {
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!enemies.active[i]) {
      enemies.active[i] = 1;
      enemies.posX[i] = x;
      enemies.posZ[i] = z;
      enemies.hp[i] = ENEMY_DEFS[type].hp;
      enemies.type[i] = type;
      return i;
    }
  }
  return -1;
}

export function despawnEnemy(i: number) {
  enemies.active[i] = 0;
  enemies.generation[i]++;
}
```

### 8.2 단일 루프 + InstancedMesh 동기화

```tsx
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

function EnemyRenderer() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    updateEnemyLogic(dt);
    const mesh = ref.current;
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (enemies.active[i]) {
        _p.set(enemies.posX[i], 0, enemies.posZ[i]);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      } else {
        mesh.setMatrixAt(i, HIDDEN);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, MAX_ENEMIES]} frustumCulled={false} />;
}
```

### 8.3 안전한 body 제거 큐

```ts
const removeQueue: number[] = [];
export function queueRemove(i: number) { removeQueue.push(i); }

export function flushRemovals(bodies: (RapierRigidBody | null)[]) {
  for (const i of removeQueue) {
    const b = bodies[i];
    if (b && b.isValid()) b.setEnabled(false);
    despawnEnemy(i);
  }
  removeQueue.length = 0;
}
```

---

## 9. 에이전트 행동 요약

- 새 기능 구현 시: §1 아키텍처 규칙에 맞는지 먼저 판단하고, 맞지 않으면 구조부터 제안한다.
- 코드 생성/수정 후: §7 체크리스트를 self-review로 실행하고 결과를 보고한다.
- 버그 보고 수신 시: §6 프로토콜을 1번부터 순서대로 수행하며, 추측 대신 계측·불변식 검사로 원인을 확정한 뒤 수정한다.
- 수정 커밋 메시지에 적용한 RULE/CHECK 번호를 명시해 추적 가능하게 한다.

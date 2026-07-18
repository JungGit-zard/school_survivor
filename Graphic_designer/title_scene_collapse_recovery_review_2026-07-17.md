# 타이틀 화면 붕괴 복구 리뷰 — dd471b4 최소 복구안

작성일: 2026-07-17  
담당: Three_Mini / threemini  
대상 커밋: `dd471b420d1fdcdb1a7276c9728bf758c08fffd7` (`Fix title scene and add CDP inspector`)  
부모 커밋: `676a28d9c7095f4c24e0a307aa541dc09c43cd00`

## 범위와 금지사항

- 이 문서는 리뷰 산출물이다. 런타임 코드는 수정하지 않았다.
- 현재 작업트리에 많은 미커밋 변경이 있으므로 `reset`, `checkout`, `commit`, `push`는 하지 않았다.
- 목표는 `dd471b4`와 부모 커밋의 diff만 근거로, 검은 사각형 두 개의 실제 원인인 `ToonBox` 삭제와 CDP 검사기 추가를 제외한 타이틀 장면 변경을 식별하고, 가장 작은 안전 복구 패치를 제안하는 것이다.
- 시각 추측은 하지 않았다. 아래 판단은 Git diff와 파일/라인 근거만 사용한다.

## 확인 명령과 실제 결과

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
# 결과: GSTACK_OK

git status --short --branch
# 결과 요약: feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 2, behind 1]
# 다수의 기존 수정/신규 파일 존재. 이 리뷰 산출물 외 런타임 변경 없음.

git show --no-ext-diff --name-status --stat --oneline dd471b4 --
# 결과:
# dd471b4 Fix title scene and add CDP inspector
# M Developer/r3f_prototype/index.html
# M Developer/r3f_prototype/src/components/TitleScene3D.jsx
# M Developer/r3f_prototype/src/components/TitleScene3D.test.jsx
# A Developer/r3f_prototype/src/debug/screenElementInspector.js
# 4 files changed, 349 insertions(+), 109 deletions(-)

git rev-parse dd471b4^ dd471b4
# 결과:
# 676a28d9c7095f4c24e0a307aa541dc09c43cd00
# dd471b420d1fdcdb1a7276c9728bf758c08fffd7
```

## 결론 요약

`dd471b4`에서 실제 요청 범위로 인정할 수 있는 타이틀 장면 변경은 다음뿐이다.

1. `TitleScene3D.jsx`의 검은 사각형 원인인 `ToonBox` 배치 두 줄 삭제.
2. 더 이상 쓰이지 않는 `ToonBox` 컴포넌트와 그 전용 import(`inflateScale`, `outlineMat`) 정리.
3. CDP/Three.js 검사기 추가와 연결. 단, 이것은 진단 도구이며 최종 릴리스용 변경은 아니다.

그 외 다음 변경은 검은 사각형 두 `ToonBox` 삭제와 직접 관련이 없고, 타이틀 장면 붕괴 원인 후보로 복구 대상이다.

- 원거리 배경 스토리 모델(`StarlinkSatelliteModel`, `ZomlonbiskModel`, `TitleFarBackgroundStory`) 삭제.
- 클럽 조명 빔의 하우징/렌즈 메쉬 삭제.
- 좌우 어두운 사이드 월 메쉬 삭제.
- 위 삭제/축소를 고정하는 테스트 기대값 변경.

## Keep / Delete / Restore 목록

### Keep — 유지할 변경

| 구분 | 파일/라인 근거 | 판단 |
|---|---|---|
| `ToonBox` 배치 두 줄 삭제 | 부모 `TitleScene3D.jsx:570-571`에 `[-1.45, 2.72, -4.25]`, `[1.45, 2.72, -4.25]` 두 배치 존재. 자식 `TitleScene3D.jsx:533-535` 주변에서 사라짐. | 실제 검은 사각형 두 개의 직접 원인으로 기록된 배치. 유지. |
| `ToonBox` 컴포넌트 삭제 | 부모 `TitleScene3D.jsx:196-210`에 컴포넌트 존재. 자식에는 없음. | 배치 두 줄 삭제 후 미사용이면 삭제 유지. |
| `inflateScale`, `outlineMat` import 제거 | 부모 `TitleScene3D.jsx:5`에 존재. 자식 `TitleScene3D.jsx:5`는 `toonMat`만 import. | `ToonBox` 전용 의존성이므로 유지. |
| `TitleScene3D.test.jsx`의 `ToonBox` 재등장 방지 | 자식 `TitleScene3D.test.jsx:232-236`에 `expect(source).not.toContain('ToonBox')`. | 실제 원인 재발 방지로 유지 가능. |
| CDP 검사기 파일과 연결 | 자식 `index.html:36`, `TitleScene3D.jsx:479-510`, `TitleScene3D.jsx:521`, 신규 `src/debug/screenElementInspector.js`. | 이번 분석 기준에서는 허용 범위로 분류. 다만 릴리스 전에는 별도 cleanup 카드로 제거/비활성화 여부를 검토해야 함. |

### Restore — 최소 복구 패치에 포함할 변경

| 복구 대상 | 정확한 diff/라인 근거 | 복구 이유 |
|---|---|---|
| 원거리 배경 스토리 모델 import 복구 | 부모 `TitleScene3D.jsx:14`의 `StarlinkSatelliteModel, ZomlonbiskModel` import가 자식에서 삭제됨. diff `/tmp/dd471b4_TitleScene3D.diff:20` 삭제. | 두 `ToonBox` 배치 삭제와 무관한 배경 구성 삭제. |
| `TitleFarBackgroundStory` 함수 복구 | 부모 `TitleScene3D.jsx:247-276` 전체 함수가 자식에서 삭제됨. diff `/tmp/dd471b4_TitleScene3D.diff:260-289` 삭제. | 배경 스토리/원거리 모델 제거는 검은 사각형 두 `ToonBox`와 별개. |
| `<TitleFarBackgroundStory reducedEffects={reducedEffects} />` 호출 복구 | 부모 `TitleScene3D.jsx:580`, 자식에서는 호출이 삭제됨. diff `/tmp/dd471b4_TitleScene3D.diff:627-630`. | 원거리 배경 복구에 필요. |
| 클럽 조명 하우징 지오메트리 복구 | 부모 `TitleScene3D.jsx:147`의 `CLUB_LIGHT_HOUSING_GEO = getCachedBoxGeo(...)` 삭제. diff `/tmp/dd471b4_TitleScene3D.diff:153-160`. | 두 `ToonBox` 배치가 아닌 클럽 조명 fixture 삭제. |
| 클럽 조명 `housingMat`, `lensMat`, dispose 복구 | 부모 `TitleScene3D.jsx:402-436`, 자식 `TitleScene3D.jsx:375-378`은 `lensMat.dispose()` 제거. diff `/tmp/dd471b4_TitleScene3D.diff:415-450`. | 빔 fixture/렌즈는 장면 구성 요소이며 `ToonBox` 두 배치 삭제와 무관. |
| 클럽 조명 하우징/렌즈 mesh 복구 | 부모 `TitleScene3D.jsx:450-453` 삭제. 자식 `TitleScene3D.jsx:386-392`는 cone 두 개만 남음. diff `/tmp/dd471b4_TitleScene3D.diff:464-468`. | 조명 장치 붕괴 복구. |
| 좌우 사이드 월 복구 | 부모 `TitleScene3D.jsx:543`, `558-562`; 자식 `TitleScene3D.jsx:513-530`에는 `wallMat`와 두 mesh 없음. diff `/tmp/dd471b4_TitleScene3D.diff:588-611`. | 두 `ToonBox`와 별개인 타이틀 배경 구조 삭제. |
| 테스트 기대값 복구 | 자식 테스트가 far background 삭제(`TitleScene3D.test.jsx:162-185`), side-wall 삭제(`223-230`), club housing 삭제(`238-246`)를 정상으로 고정. | 복구 패치와 일치하도록 테스트를 부모 기대값 또는 중립적 기대값으로 되돌려야 함. |

### Delete 또는 별도 정리 후보

| 항목 | 판단 |
|---|---|
| `TITLE_SCENE_DIRECTION.scene.clubLights.fixtures: 0` | 복구 패치에서는 `fixtures: 2` 또는 해당 필드 제거가 더 안전하다. 부모에는 이 필드가 없고, 자식에서 fixture 삭제를 정당화하기 위해 추가된 값이다. |
| `TitleScene3D.test.jsx`의 `removes the far-background black-square models`, `removes the two dark side-wall rectangles`, `keeps the removed club-light housing boxes from returning` | 붕괴된 상태를 회귀 테스트로 고정하므로 삭제/복구 대상. |
| CDP 검사기 | 이 카드의 비교 기준에서는 허용 범위로 분리한다. 그러나 일반 플레이에 디버그 도구를 상시 로드하는 구조(`index.html:36`)는 릴리스 전 별도 제거/쿼리 게이트 검토가 안전하다. |

## 제안하는 최소 복구 패치 — 적용하지 않음

아래 패치는 `dd471b4` 이후 상태 기준으로 작성한 제안이다. 현재 작업트리에 미커밋 변경이 많으므로 이 카드에서는 적용하지 않았다.

```diff
diff --git a/Developer/r3f_prototype/src/components/TitleScene3D.jsx b/Developer/r3f_prototype/src/components/TitleScene3D.jsx
--- a/Developer/r3f_prototype/src/components/TitleScene3D.jsx
+++ b/Developer/r3f_prototype/src/components/TitleScene3D.jsx
@@
-import { toonMat } from '../lib/toon.js'
+import { getCachedBoxGeo, getCachedToonMat, toonMat } from '../lib/toon.js'
@@
 import { CompassBladeModel } from './Weapons/CompassBlade.jsx'
 import { ChibikoModel } from './Weapons/Chibiko.jsx'
+import { StarlinkSatelliteModel, ZomlonbiskModel } from './Weapons/StarlinkSatellite.jsx'
@@
 const CLUB_WASH_CYAN = new THREE.Color(0x59c7ff)
 const CLUB_WASH_MAGENTA = new THREE.Color(0xa278ad)
+const CLUB_LIGHT_HOUSING_GEO = getCachedBoxGeo(0.42, 0.28, 0.34)
@@
-      fixtures: 0,
@@
+function TitleFarBackgroundStory({ reducedEffects }) {
+  const zomlonbiskRef = useRef()
+
+  useFrame(({ clock }) => {
+    if (!zomlonbiskRef.current) return
+    if (reducedEffects) {
+      zomlonbiskRef.current.position.y = 0.68
+      zomlonbiskRef.current.rotation.y = -0.28
+      zomlonbiskRef.current.rotation.z = 0
+      return
+    }
+
+    const t = clock.elapsedTime
+    const s = Math.sin(t * 3.2)
+    zomlonbiskRef.current.position.y = 0.68 + Math.abs(s) * 0.05
+    zomlonbiskRef.current.rotation.y = -0.28 + s * 0.5
+    zomlonbiskRef.current.rotation.z = Math.sin(t * 6.4) * 0.09
+  })
+
+  return (
+    <>
+      <group position={[-2.35, 1.12, clampTitleBackgroundZ(-7.0)]} rotation={[0.08, -0.42, -1.2]} scale={1.24}>
+        <StarlinkSatelliteModel studioItemId="title-crashed-starlink" />
+      </group>
+      <group ref={zomlonbiskRef} position={[1.86, 0.68, clampTitleBackgroundZ(-8.0)]} rotation={[0, -0.28, 0]} scale={1.16}>
+        <ZomlonbiskModel running={false} />
+      </group>
+    </>
+  )
+}
+
 function ClubLightBeam({ config, register }) {
+  const housingMat = useMemo(() => getCachedToonMat(0x17131e, 0.06), [])
   const beamMat = useMemo(() => new THREE.MeshBasicMaterial({
@@
   const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
@@
   }), [config.color])
+  const lensMat = useMemo(() => new THREE.MeshBasicMaterial({
+    color: config.color,
+    transparent: true,
+    opacity: 0.88,
+    blending: THREE.AdditiveBlending,
+    toneMapped: false,
+  }), [config.color])
 
   useEffect(() => () => {
     beamMat.dispose()
     coreMat.dispose()
-  }, [beamMat, coreMat])
+    lensMat.dispose()
+  }, [beamMat, coreMat, lensMat])
@@
       <mesh position={[0, -2.15, 0.015]} material={coreMat}>
         <coneGeometry args={[0.46, 4.3, 8, 1, true]} />
       </mesh>
+      <mesh position={[0, 0.05, 0.04]} geometry={CLUB_LIGHT_HOUSING_GEO} material={housingMat} />
+      <mesh position={[0, -0.12, 0.19]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
+        <circleGeometry args={[0.13, 12]} />
+      </mesh>
     </group>
   )
 }
@@
 export default function TitleScene3D({ studioGroupRef = null, studioTuning = null, reducedEffects = false }) {
   const floorMat = useMemo(() => toonMat(0x4a4054, 0.05), [])
+  const wallMat = useMemo(() => toonMat(0x2d2738, 0.05), [])
   const doorMat = useMemo(() => toonMat(0x805947, 0.05), [])
@@
       <mesh receiveShadow position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
         <planeGeometry args={[8.6, 12]} />
       </mesh>
+      <mesh receiveShadow position={[-3.15, 1.1, -0.4]} rotation={[0, 0.16, 0]} material={wallMat}>
+        <boxGeometry args={[0.32, 3.3, 9.2]} />
+      </mesh>
+      <mesh receiveShadow position={[3.15, 1.1, -0.4]} rotation={[0, -0.16, 0]} material={wallMat}>
+        <boxGeometry args={[0.32, 3.3, 9.2]} />
+      </mesh>
       <mesh receiveShadow position={[0, 1.3, -4.62]} material={doorMat}>
         <boxGeometry args={[1.7, 1.3, 0.32]} />
       </mesh>
@@
       <WarningLight position={[2.15, 0.03, 1.3]} delay={1.4} />
 
       <TitleCharacterOutlineGroup>
+        <TitleFarBackgroundStory reducedEffects={reducedEffects} />
         <TitleBossZombie type="B03" position={[0.02, 0.28, -4.04]} scale={1.12} delay={1.35} />
```

### 테스트 패치 방향

`TitleScene3D.test.jsx`는 위 복구와 충돌하는 다음 기대값을 되돌려야 한다.

1. far-background 테스트: 삭제 기대가 아니라 `StarlinkSatelliteModel`, `ZomlonbiskModel`, `TitleFarBackgroundStory` 존재 기대로 복구.
2. DancingDoge 테스트: `ZomlonbiskModel` 부재 기대를 부모의 Zomlonbisk 애니메이션 기대로 복구.
4. side-wall 삭제 테스트는 제거하거나, 두 wall mesh 존재 기대로 반전.
5. club-light housing 삭제 테스트는 제거하거나, `CLUB_LIGHT_HOUSING_GEO`, `housingMat`, `lensMat`, `circleGeometry args={[0.13, 12]}` 존재 기대로 반전.
6. `ToonBox` 부재 테스트는 유지.
7. CDP 검사기 테스트는 이 카드 기준으로 유지 가능하지만, 릴리스 cleanup에서 제거한다면 함께 제거해야 한다.

## 왜 이 패치가 최소인가

- `ToonBox` 두 배치와 전용 컴포넌트는 되살리지 않는다. 즉, 검은 사각형 두 개의 직접 원인은 복구하지 않는다.
- CDP 검사기 관련 `index.html`, `src/debug/screenElementInspector.js`, `inspectTitleSceneObject`, `onPointerDown`은 이 카드의 허용 범위로 분리해 건드리지 않는다.
- 삭제/축소된 기존 타이틀 장면 구성 요소만 부모 커밋 값 그대로 되돌린다.

## 검증 권장 순서

복구 패치 적용자는 현재 미커밋 변경을 보존한 별도 작업 브랜치/워크트리에서 다음을 실행한다.

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- src/components/TitleScene3D.test.jsx
npm run build
```

가능하면 브라우저에서 타이틀 화면을 직접 확인하고, 검은 `ToonBox` 두 개가 재등장하지 않는지와 원거리 배경/벽/보스 크기/클럽 조명 fixture가 부모 상태로 복구됐는지 스크린샷으로 남긴다.

## 최종 판정

`dd471b4`는 검은 사각형 두 개 삭제와 CDP 검사기 추가 외에 타이틀 장면의 배경 모델, 벽, 조명 fixture까지 함께 변경했다. 타이틀 붕괴 최소 복구안은 `ToonBox` 삭제와 검사기만 남기고, 나머지 시각 구성 변경을 부모 커밋 값으로 되돌리는 것이다.

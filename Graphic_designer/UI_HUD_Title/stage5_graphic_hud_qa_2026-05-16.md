# Stage 5 Graphic and HUD QA

Date: 2026-05-16
Role: `graphic_designer`
Scope: 코드/문서 기반 정적 시각 QA. 브라우저 스크린샷 검증은 포함하지 않음.
Target: `Developer/r3f_prototype`

## 1. 확인한 기준 문서

- `project_develop_policy.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`
- `Graphic_designer/Concept_Rules/stage_graphic_cons.md`
- `Graphic_designer/Concept_Rules/color_palette_guide.md`
- `Graphic_designer/A.그래픽/A-4.효과그래픽/Items_Effects_Feedback/effect_visual_technical_review_2026-05-10.md`
- `Graphic_designer/Concept_Rules/protagonist_screen_presence_rules.md`
- `Graphic_designer/A.그래픽/A-2.캐릭터그래픽/Toon_3D_Characters/threejs_toon_modeling_method.md`
- `Graphic_designer/A.그래픽/A-2.캐릭터그래픽/Toon_3D_Characters/toon_reference_implementation_summary.md`
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md`
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_replan_2026-05-06.md`

## 2. 확인한 구현 파일

- `Developer/r3f_prototype/src/lib/toon.js`
- `Developer/r3f_prototype/src/components/Player.jsx`
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/VFXLayer.jsx`
- `Developer/r3f_prototype/src/components/LunchItems.jsx`
- `Developer/r3f_prototype/src/components/XpTextbook.jsx`
- `Developer/r3f_prototype/src/components/GoldCoin.jsx`
- `Developer/r3f_prototype/src/components/VirtualJoystick.jsx`
- `Developer/r3f_prototype/src/components/Weapons/Bell.jsx`
- `Developer/r3f_prototype/src/components/Weapons/SchoolBag.jsx`
- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/store/useGameStore.js`

## 3. 정적 검증 결과

- `npm run build`: 성공
- `npm test`: 성공, 19 tests passed

## 4. 확인된 사실

### 4-1. 플레이어/몬스터 3D 카툰 렌더링 정책

- `toon.js`는 `THREE.MeshToonMaterial`과 `NearestFilter` 기반 gradient map을 공용으로 사용한다.
- `toon.js`는 stencil 기반 inverted hull outline 재질을 공용으로 사용한다.
- `PlayerMesh.jsx`와 `ZombieMesh.jsx`는 모두 실제 3D geometry를 조합해 플레이어/몬스터를 만든다.
- 플레이어/몬스터 최종 시각 표현에 2D 스프라이트 대체 사용은 확인되지 않았다.

판정:
- 정책 준수.

### 4-2. 플레이어 모델 위치와 실제 게임 좌표

- `Player.jsx`에서 플레이어 위치는 `RigidBody.translation()` 값을 `playerPos`에 직접 동기화한다.
- `PlayerMesh`는 같은 `RigidBody` 하위에 렌더된다.
- 일반 플레이 화면용 지속 디버그 링, 플레이어 대체 마커, 위치 보정용 원형 표시는 확인되지 않았다.

판정:
- 구조상 분리 위험은 낮다.
- 단, 실제 브라우저에서 대각 이동, 빠른 회전, 무적 점멸 중 앵커 흔들림은 눈으로 재확인 필요.

### 4-3. 드랍 아이템 구분성

- XP는 파란 교과서형 3D 모델이다.
- 골드는 코인형 3D 모델이다.
- 회복은 `milk` 또는 `meal` 3D 모델이다.

판정:
- XP/골드/회복은 서로 다른 실루엣이라 기본 구분은 가능하다.
- 다만 콘셉트 문서의 `회복 오브 + 십자 마크` 방향과는 다르다.

## 5. 주요 리스크

### High 1. 모바일 HUD 레이아웃 오버플로우 위험

근거:
- `App.jsx`는 iPhone 12 Pro 기준 `390 x 844` 세로 프레임을 사용한다.
- `HUD.jsx` 레벨업/게임오버/클리어 모달은 `minWidth: 440`이다.
- 레벨업 카드 3개는 `width: 142`에 `gap: 16`이라 가로 총폭이 모바일 기준보다 크다.

영향:
- 레벨업 카드, 게임오버, 클리어 화면이 모바일 세로 화면에서 좌우 잘림 또는 과밀 배치될 가능성이 높다.

### High 2. 모바일 터치 조작 실제 연결 부재

근거:
- `VirtualJoystick.jsx`는 존재한다.
- 하지만 `App.jsx`에서 `VirtualJoystick`를 import/render 하지 않는다.
- 일시정지는 `HUD.jsx`에서 `KeyP` 키 이벤트만 처리한다.

영향:
- 현재 정적 상태만 보면 모바일 세로 화면에서 터치 이동 UI가 실제 활성화되지 않는다.
- 일시정지 버튼도 화면에 없어 모바일에서 접근 불가다.

### High 3. 안전 영역 대응 부재

근거:
- 상단 UI와 골드 칩 위치가 `top: 16`, `right: 16` 고정값이다.
- `safe-area-inset-top`, `safe-area-inset-bottom` 같은 처리 흔적이 없다.

영향:
- 노치 기기에서 타이머, 레벨, 골드 표시가 상단 안전 영역과 충돌할 수 있다.

### Medium 1. 보스/엘리트 HUD 경고 부족

근거:
- 문서상 요구된 보스 등장 배너, 상단 경고 텍스트, 엘리트 경고 UI를 HUD/Enemies 코드에서 찾지 못했다.
- `bossSpawned` 상태는 존재하지만 이를 HUD에서 시각적으로 알리는 처리 흔적이 없다.

영향:
- 보스 진입 타이밍과 엘리트 등장 정보를 플레이어가 즉시 인지하기 어렵다.

### Medium 2. VFX 공용 레이어 연결이 아직 부분적임

근거:
- `VFXLayer.jsx`는 `hitSpark`, `chargeWarningLine`, `pickupPop` 렌더러를 가진다.
- `itemEffects.js`에 실제 등록된 것은 E05/B01의 `onWarn`만 확인됐다.
- 드랍 스폰 강조와 공용 hit spark 연결은 주석만 있고 배선이 끝나지 않았다.

영향:
- 문서상 의도한 "드랍 pop", "공용 피격 가시성"이 실제 플레이에서 빠질 수 있다.

### Medium 3. E05/B01 외 위험 연출 커버리지가 문서보다 좁음

근거:
- E05/B01 돌진 경고선은 구현됐다.
- 하지만 문서상 언급된 E06 보라 링, 충격파 경고, 보스 배너형 연출은 정적 코드에서 바로 확인되지 않았다.

영향:
- 위험 판독의 계층이 약해져 적 종류별 위협 우선순위가 덜 읽힐 수 있다.

### Medium 4. 하단 HUD와 향후 조이스틱 중첩 위험

근거:
- HP/XP 바는 하단 중앙, 무기 리스트는 하단 좌측, 자 쿨다운 UI는 하단 중앙 좌측이다.
- `VirtualJoystick.jsx`는 하단 중앙 배치다.

영향:
- 조이스틱을 실제 연결하면 HP/XP 바, 쿨다운 UI, 손가락 영역이 서로 겹칠 가능성이 높다.

### Low 1. 외곽선 두께 과다 가능성

근거:
- `toon.js`는 `OUTLINE_THICKNESS_MULT = 2`를 전역으로 사용한다.

영향:
- 모바일 실기기에서 작은 적 다수 등장 시 외곽선이 실루엣을 돕기보다 뭉개 보이게 만들 수 있다.
- 이 항목은 실제 확대/축소 없는 플레이 화면 확인이 필요하다.

## 6. 항목별 판정 요약

### 6-1. 플레이어/몬스터 카툰 렌더링

- Pass

사유:
- `MeshToonMaterial` 사용
- 외곽선 사용
- 실제 3D geometry 사용
- 2D 캐릭터 대체 없음

### 6-2. 플레이어 위치 분리 위험

- Pass with runtime check

사유:
- 구조상 같은 `RigidBody`에 붙어 있음
- 디버그 링 노출 없음
- 다만 실제 이동 중 체감 분리는 브라우저에서 재확인 필요

### 6-3. HUD 가독성

- Fail risk on mobile

사유:
- 모달 최소 폭이 모바일 기준보다 큼
- 안전 영역 미대응
- 터치용 pause 부재

### 6-4. VFX 가독성

- Partial

사유:
- E05/B01 경고선은 존재
- 일부 무기 시각효과 존재
- 공용 VFX 연결과 보스/엘리트 경고는 아직 부족

### 6-5. 모바일 세로 화면 대응

- Fail risk

사유:
- 조이스틱 컴포넌트 미장착
- 하단 HUD와 입력 영역 충돌 예상
- 버튼/모달 폭이 좁은 화면 기준으로 조정되지 않음

## 7. 다음 브라우저 실기동에서 반드시 볼 항목

1. 레벨업 카드 3장이 `390 x 844`와 `720 x 1280`에서 잘리지 않는지 확인.
2. 게임오버/클리어 모달이 좌우 잘림 없이 중앙 정렬되는지 확인.
3. 플레이어 그림자, 모델, 충돌 중심이 대각 이동과 빠른 회전 중에도 한 캐릭터처럼 붙어 보이는지 확인.
4. E05/B01 돌진 경고선의 길이와 실제 피해 경로가 일치하는지 확인.
5. 3분 이후 적 밀도에서 플레이어 외곽선이 지나치게 두꺼워지지 않는지 확인.
6. XP 교과서, 골드 코인, 회복 아이템이 적 시체/VFX 위에서 즉시 구분되는지 확인.
7. 보스 등장 시 별도 배너가 없어서 체감 인지가 늦는지 확인.
8. 조이스틱을 실제 붙일 경우 하단 HP/XP/쿨다운 UI와 손가락 영역이 겹치는지 확인.
9. 노치/제스처 바 기기에서 상단 타이머/레벨/골드가 안전 영역을 침범하는지 확인.

## 8. 이번 단계 결론

- 플레이어/몬스터의 3D 카툰 렌더링 정책은 정적 코드 기준으로 지켜지고 있다.
- 가장 큰 시각 QA 리스크는 캐릭터 렌더링 자체보다 모바일 HUD 배치와 터치 입력 연결 부재다.
- 다음 단계 브라우저 검증은 "카툰 퀄리티 확인"보다 먼저 "모바일 모달 폭, 안전 영역, 입력/HUD 중첩"을 우선 확인해야 한다.

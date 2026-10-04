# Player v9 방향·재질·모델 버전 연결 수정

- Kanban: `t_609c5662`, 기존 threemini 작업의 명시적 Codex Worker 후속 수정. 로컬 변경만 수행; commit/push/deploy/Firebase 쓰기 없음.
- `PlayerV9Model`이 매 프레임 부모 이동 yaw의 반대 회전을 대입하던 처리를 제거했다. `Player.jsx`의 이동/공격 방향 계산은 유지하며 아래 후속 F8 비교용 렌더 연결만 추가했다.
- GLTFLoader의 linear Color와 sRGB base/face map을 기존 `toonMat`에 그대로 전달한다. 임의 HSL 밝기 증가 및 `toneMapped=false` 제거. 원본 emissiveMap이 없으면 base map을 emission에도 사용하여 흰색 방출광이 텍스처 전체를 씻어내지 않게 한다. 원본 재질은 변경하지 않는다.

## 확인된 몸 기울기와 머리 변형 원인

기존 `findStudioPartByKey`는 숫자 경로가 없을 때 앞 조각을 계속 제거했다. v9 트리에는 구형 `0.0.19.2.0.1.0`이 없어서 끝부분이 `grp_body`에 맞았고, 랜턴 몸체용 `rotationX=-48`이 몸 전체에 적용됐다.

구형 경로를 새 부품 이름으로 연결하는 호환 시도는 실제 화면 검증에서 머리 실루엣을 파괴하여 **폐기했다**. 해당 alias helper, shared resolver 분기, 새 stable ID, 앞머리/신발 group 재구성은 최종 코드에 남기지 않았다.

- GLB 머리 윗부분 geometry의 로컬 중심 Y는 2.8225, mesh 위치 Y는 -1.91이다. 기존 scaleY=1.33을 원점에 적용하면 머리 중심까지 약 0.931m 이동한다.
- 앞머리 기준점을 중심으로 정규화해도 기존 scale=1.35, scaleY=1.72의 합성 배율 2.322는 구형 높이 0.28을 0.65016으로, 새 모델 높이 약 0.60을 1.3932로 만든다. 기존 positionZ=-0.59 역시 새 원화의 정면 앞머리를 머리 중앙 쪽으로 이동시킨다.
- 따라서 동일 숫자를 다른 모델의 다른 기준점/크기에 적용하여 기존 사용자 값과 승인된 새 원화 실루엣을 동시에 보존할 수 없다. 역보정·clamp·값 재작성으로 숨기지 않았다.

## 최종 연결

- 새 게임 모델 `PlayerV9Model`의 Studio itemId는 `player-v9`다. 기존 `player` Firebase 데이터는 기존 `PlayerMesh`와 타이틀의 정본으로 그대로 남는다.
- Studio catalog에 `Player V9`를 추가하여 실제 게임과 같은 `PlayerVisual`을 미리 본다. 기존 `Player` 항목은 원래 `PlayerMesh`를 미리 본다. 두 항목은 기존 player camera/action 설정을 공유한다.
- 새 모델의 숫자 부품 경로, part/group 저장, 변형 합산은 기존 E01/StudioTunedGroup 방식을 그대로 사용한다. 별도 alias, 저장소, 필터, 추정 migration은 없다. `player-v9`에 값이 없을 때는 승인된 자산을 기존 렌더 경로로 표시한다.
- `StudioTunedGroup.jsx`의 이번 작업 변경은 완전히 원복했다. V9에는 부품 이름을 찾는 animation refs만 있고 추가 studioPartId를 쓰지 않는다.

## 최소 검증

- `npx vitest run src/components/PlayerV9Model.test.jsx src/components/PlayerImage2Model.test.jsx`: 21/21 통과.
- 실제 Three 객체와 컴포넌트 animation callback으로 네 yaw 방향/world up, 구형 player 값이 V9를 변형하지 않는다는 점, 새 player-v9의 실제 숫자 경로에 지정한 -48 회전·1.72 scale·-0.59 위치와 group+part 회전 합산, 입력 데이터 불변을 검증했다.
- 실제 toonMat 호출로 4개 임의 입력색의 linear RGB, sRGB map, emissiveMap, alphaTest/side 및 원본 재질 불변 검증. 이 테스트는 미술 색상 승인 판정이 아니다.
- 확대 실행 시 기존 `graphicsStudioConfig.test.js`의 8/10 통과, `StudioTunedGroup.test.jsx`의 29/30 통과를 관찰했다. 실패 3개는 hydrate 누락/불완전 preview에서 오류를 throw해야 한다는 fail-closed 기대이며 이번 작업은 저장/초기화 함수를 변경하지 않았다. 전체 통과로 보고하지 않는다.
- Player 이동 테스트 11/11 통과. `GraphicsStudioPreview.test.js`는 19/20 통과이며 실패는 변경하지 않은 `TitleScene3D.jsx`에 폐기된 `playerVisualReady ?` 표시 조건을 요구하는 기존 source assertion이다. 타이틀 코드는 수정하지 않았다.
- 실제 로컬 화면·Firebase snapshot 전후 비교는 Advisor의 별도 QA 결과를 따른다. 사용자 아트 승인이나 AAB 검증은 수행하지 않았다.

## 후속 사용자 요청: F8 이전 모델/이번 V9 비교

- 실제 게임의 `Player()`에서 개발모드(`import.meta.env.DEV`)일 때만 F8 keydown을 등록한다. 기본은 V9이며 F8마다 기존 PlayerMesh/V9를 번갈아 표시한다. 타이틀·Studio preview에는 핸들러가 없다.
- 첫 전환 후 캐릭터 위에 `F8 · 이전 모델` 또는 `F8 · 이번 V9`를 표시한다. 입력창 편집, 키 반복, Ctrl/Alt/Meta 조합은 무시한다.
- 회전용 바깥 group/ref는 유지하며 안쪽 모델만 교체한다. RigidBody·playerFacing·playerPos·HP·게임 진행 상태를 재생성하거나 변경하지 않는다. 이전 모델은 기존 `player` 튜닝, V9는 `player-v9` 튜닝을 사용한다.
- 비교 선택은 React 메모리에만 있다. Firebase·localStorage·파일 저장이나 새 영구 설정을 추가하지 않았다. 프로덕션에서는 키 핸들러와 상태 표시가 없고 V9가 기본이다.
- `Player.modelComparison.test.jsx`, `Player.test.js`, `PlayerImage2Model.test.jsx`, `PlayerV9Model.test.jsx`: 총 34/34 통과. F8 네 번 왕복 시 host group/ref·Three 회전/위치·physics host·방향·HP/상태 유지, 반복/입력창 무시, production 비활성화를 검증했다.

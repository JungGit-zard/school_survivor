# Stage 1–4 좀비 콘셉트의 기존 시각 구현 방식

작성일: 2026-10-24 갱신
범위: 현재 좀비 시각 구현을 분석해 구현 참고 원화의 파츠 규칙으로 기록. 런타임·Studio·Firebase 값은 변경하지 않았다.

## 기존 좀비 구현 방식

1. **전투 타입과 외형 타입을 같은 키로 연결한다.** `Enemy.jsx`의 `ENEMY_STATS`가 HP·속도·피해·크기·XP 및 `ranged`, `charger`, `runCrew` 같은 기존 역할 플래그를 갖는다. `enemyEntityPool.js`의 타입 코드·이름, `enemySimulation.js`의 고정 런타임 슬롯과 인스턴스 렌더 경로도 서로 대응한다. 이를 다루는 테스트가 타입·런타임 테이블 간 불일치를 검사한다.
2. **일반 모델은 몇 개의 박스 파츠다.** `ZombieMesh.jsx`의 `ZBlock`은 캐시된 챔퍼 박스 지오메트리, 공용 툰 재질, 공유 외곽선 재질을 조합한다. 기본 몸체는 박스 머리·몸통·두 팔·두 다리, 작은 손·발·눈으로 제한하며 팔은 어깨, 다리는 골반 피벗에서 움직인다. 일반 E 타입은 주로 기존 팔레트·스케일·행동 역할로 구분한다.
3. **외곽선은 색 재질과 짝을 이룬다.** 각 ZBlock은 같은 지오메트리를 공유 외곽선 재질로 먼저 그리고, 그 위에 툰 재질을 그린다. 파츠의 외곽 배율과 렌더 순서가 캐릭터마다 일관되게 적용된다.
4. **다수의 일반 좀비는 고정 슬롯 인스턴싱을 쓴다.** `ZombieInstanceLayer.jsx`가 팔레트와 파츠 슬롯을 일괄 처리한다. 특별 타입은 `ZombieMesh.jsx`의 전용 가지를 쓸 수 있다. 새 형태가 필요해도 현재 일반 파츠 구성을 우선 재사용하고, 특수 파츠·ID는 런타임 표와 함께 설계해야 한다.
5. **동작은 이미 있는 역할 애니메이션을 공유한다.** 기본 보행, 러너의 기울어진 전력 질주, 차저의 예고·돌진 단계 등 타입별 기존 동작을 사용한다. 콘셉트의 장식이 새 공격·장애물·충돌체가 되지 않는다.
6. **스테이지 출현은 별도 게임플레이 설정이다.** `Enemies.jsx` 및 `burstEvents.js`가 스테이지별 요청·버스트를 정한다. 그림이나 이 문서만으로 스폰·스탯·밸런스를 바꾸지 않는다.

## 구현 참고 원화의 공통 규칙

- 머리·몸통·팔·다리·손·발을 단순한 불투명 박스로 구성하고 작은 눈만 얼굴 표시로 쓴다. 외곽선과 단순 툰 셰이딩은 현행 방식으로 유지한다.
- 몸통과 어깨 접점은 붙여 그리고 내부가 보이는 틈, 떠 있는 파츠, 추가 관절·갑옷을 넣지 않는다.
- 신규 장식·소품·복장·질감·얼굴 파츠를 덧붙이지 않는다. Stage 3 RZC 머리띠·체육복 선처럼 런타임 코드에 이미 존재하는 박스 파츠만 원화에 표시한다.
- 일반 E 타입을 구분할 때는 현행 팔레트, 크기, 이미 있는 이동 역할까지만 표현한다. 원화가 새로운 지오메트리나 스테이지 한정 외형을 뜻하지 않는다.
- Stage 1·2·4는 같은 일반 박스 메시를 쓰는 타입들이라 장소가 달라도 좀비 외형은 공통이다. Stage 3은 RZC의 구현된 소형 런 크루 박스 파츠만 예외로 기록한다.
- B01–B04 보스 메시는 이번 일반형 참고 원화 범위에서 제외한다. 2026-07-18 옥상 제안은 과거 기획이며 현행 `stageConfig.js`의 급식실 테마보다 우선하지 않는다.

## 스테이지 전용 외형을 실제로 붙일 때의 주의

E01–E08 같은 타입 키는 여러 스테이지에서 공유될 수 있다. 한 타입의 전역 팔레트나 모델을 바꾸면 해당 타입이 쓰이는 다른 스테이지 외형도 바뀐다. 이번 문서의 역할 코드는 후보 행동만 가리키며 stage-only 외형을 기존 타입에 덮어쓸 권한이 아니다.

향후 구현을 승인받으면 아래 두 방식 중 하나를 먼저 결정해야 한다: (a) 기존 타입을 유지하면서 stage ID까지 포함한 외형 선택 키를 추가하거나, (b) 신규 타입 ID와 기존 역할을 함께 등록한다. 어느 방식이든 타입 코드, `ENEMY_STATS`, 런타임 타입·슬롯, 팔레트, 인스턴스 파츠, 외형 등록, Studio 적용 경계와 parity 테스트를 한 묶음으로 검토한다. 임의로 `ZombieMesh`에만 외형을 추가해 런타임 배선이 빠지는 것은 피한다.

이번 네 블록아웃 참고도는 기존 몇 개 박스 파츠 형태를 보여주는 생성형 그림이다. 기존 모델의 정확한 스크린샷이나 게임 자산은 아니며 런타임에 포함되지 않는다. 상세 장식보다 현재 코드의 파츠 수·단순도에 맞추는 용도로 사용한다.

## 확인한 코드 위치

- 타입별 색상 팔레트: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:21-35`.
- 챔퍼 박스·툰 재질·공유 외곽선 조립: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:356-368`.
- 공통 머리·몸통·어깨·골반 파츠: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:1091-1129`.
- 애니메이션 분기와 특수 외형: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:970-1085`.
- 통계와 기존 역할 플래그: `Developer/r3f_prototype/src/components/Enemy.jsx:341-371`.
- 타입 코드와 표시명: `Developer/r3f_prototype/src/lib/enemyEntityPool.js:7-45`.
- 인스턴스 팔레트·표준 파츠·가시성: `Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx:22-37,194-200`.
- 스테이지별 기본 이름·보스 연결: `Developer/r3f_prototype/src/lib/stageConfig.js:22-106`.
- 버스트 이벤트 라우팅: `Developer/r3f_prototype/src/lib/burstEvents.js:138-288`.
- 시각 원칙의 역사 자료: `Graphic_designer/Concept_Rules/stage_graphic_cons.md`. 이 파일에 남은 Phaser 가정은 현재 R3F 런타임 지시로 승격하지 않는다.

## 관련 결과물

- 12종 기획 및 원화 삽입: `Planner/stage_zombie_concept_plan_20261023.md`.
- 구현 참고 원화, 프롬프트, 파일 해시: `Graphic_designer/stage_zombie_blockout_20261024/README.md`.
- 이전 상세 콘셉트 시트와 프롬프트 기록: `Graphic_designer/stage_zombie_concepts_20261023/README.md`.

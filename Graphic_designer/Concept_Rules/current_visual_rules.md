# Current Visual Rules

Last updated: 2026-05-16

## 1. 최상위 시각 원칙

Escape! zombie school의 플레이어와 몬스터는 3D 카툰 렌더링을 사용한다.

정책상 다음은 필수다.
- Three.js 기반 3D 표현
- `MeshToonMaterial` 또는 동등한 toon shader
- 외곽선 표현
- 플레이어 모델 좌표와 실제 게임 좌표 일치
- 2D 스프라이트/픽셀 캐릭터 대체 금지

## 2. 현재 준수 확인

- `src/lib/toon.js`에서 `THREE.MeshToonMaterial` 기반 공용 toon 재질 사용
- stencil 기반 inverted hull outline 재질 사용
- `PlayerMesh.jsx`, `ZombieMesh.jsx`는 실제 3D geometry 조합
- 일반 플레이 화면에 플레이어 대체 디버그 원형 마커는 확인되지 않음

## 3. HUD 기준

필수로 읽혀야 하는 UI:
- 타이머
- 레벨
- HP
- XP
- 세션 골드
- 무기 상태
- 일시정지
- 레벨업 카드
- 게임오버
- 클리어

현재 위험:
- 레벨업/게임오버/클리어 모달 `minWidth: 440`
- 390px 모바일 프레임에서 좌우 잘림 가능성
- 모바일 pause/resume 버튼 없음
- safe-area 대응 없음
- 하단 HP/XP와 향후 조이스틱 영역 충돌 가능성

## 4. VFX 기준

현재 구현 또는 부분 구현:
- E05/B01 돌진 경고선
- 무기별 시각 효과
- XP 교과서
- 골드 코인
- 회복 아이템

보강 필요:
- 보스 등장 배너
- 엘리트 등장 경고
- 공용 hit spark 연결
- pickup pop 연결
- E06 위협 연출

## 5. 브라우저 검증에서 꼭 볼 것

1. `375x812`, `390x844`에서 HUD가 잘리지 않는가.
2. 레벨업 카드 3장이 모바일에서 한 화면에 들어오는가.
3. 게임오버/클리어 모달이 모바일에서 중앙 정렬되는가.
4. 플레이어 모델, 그림자, 충돌 중심이 이동 중 분리되어 보이지 않는가.
5. E05/B01 경고선이 실제 돌진 경로와 맞는가.
6. 조이스틱을 붙였을 때 하단 HUD와 겹치지 않는가.
7. 상단 UI가 노치 안전 영역과 충돌하지 않는가.

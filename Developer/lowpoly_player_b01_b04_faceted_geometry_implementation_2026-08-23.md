# 주인공·B01~B04 파셋 저폴리 지오메트리 구현 기록

- 날짜: 2026-08-23
- Kanban: `escape-zombie-school` / `t_2189c2b6` (`threemini`)
- 범위: `PlayerMesh.jsx`, `ZombieMesh.jsx`, `toon.js`의 캐릭터 외형 지오메트리만 변경

## 구현

- `getCachedFacetedGeo(kind, w, h, d)`를 추가했다. `dodeca`, `octa`, `lowCylinder`, `lowCone`, `wedge`, `flatDisc` 지오메트리를 크기별로 캐시하고, 인덱스를 분리해 면 단위 노멀을 계산한다. 대상 전용 3단 toon gradient(55/78/100%, `NoColorSpace`)와 재질 cache도 추가했다.
- 주인공은 머리·머리카락·재킷·가방·팔을 파셋 형태로 바꿨다.
- B01은 머리·머리카락·재킷·팔·다리와 특수공격 삼각자를, B02는 현행 `stage2-boss-v2`의 머리·머리카락·번·블레이저·출입 배지·사지, B03은 머리·머리띠·어깨·상체·팔, B04는 요리모·머리·조리복·팔·앞치마를 파셋 형태로 바꿨다.
- 새 그룹, 새 Studio 키, 저장 경로, 물리·카메라·공격·스폰·Firebase 변경은 없다. 기존 `ZBlock`/`Block`의 지오메트리만 선택 교체해 Studio 숫자 child path와 피벗을 보존한다.

## 검증

- `npx vitest run src/components/PlayerMesh.test.js`: 15개 통과.
- `npx vitest run src/components/PlayerMesh.test.js src/components/ZombieMesh.test.js`: 41개 중 40개 통과. 실패 1개는 기존 `RZT` hp/scale 기대값(28/.88)과 현재 코드(140/1.76)의 불일치이며 이번 그래픽 변경과 무관하다.
- `npx vite build`: 통과.
- 외부 QA 정적 검수: Player/B01/B02/B03/B04 reg 순서·pivot, B01/B02/B03/B04 `ZBlock` 수, B02 legacy gate 통과.

## 최종 시각 검증

- 공유 `PlayerMesh`/`ZombieMesh`를 실제 R3F 프리뷰에서 Player와 B01~B04 각각 정면·측면·후면으로 확인했다.
- 전신 프레이밍, 큰 파셋 면, 외곽선, 발 접지를 확인했으며 임시 프리뷰 파일은 삭제했다.
- 상세 증거와 15개 캡처는 `Quaility_Assurance/faceted_player_boss_visual_performance_qa_2026-08-23.md`에 기록했다.

# 현행 좀비 박스 메시 구현 참고 원화

작성일: 2026-10-24  
목적: 상세 콘셉트 시트를 현행 런타임 좀비의 단순한 박스 파츠 수와 화면 인상에 맞춰 다시 표현한다.

## 코드에서 확인한 형태

`ZombieMesh.jsx`의 일반 좀비는 박스형 머리, 몸통, 두 팔, 두 다리, 작은 손·발·눈으로 구성된다. 파츠는 챔퍼 박스 지오메트리를 공유하며, 공용 툰 재질과 외곽선을 사용한다. 기본 인스턴스 경로도 같은 파츠 슬롯과 팔레트를 쓴다. E01–E06의 구분은 주로 팔레트·크기·행동 역할에서 나온다. Stage 3 RZC는 머리띠와 체육복 줄을 포함한 별도의 단순 박스 파츠를 이미 갖고 있다.

새 참고도는 학교 소품이나 독자 복장, 천 주름, 소재 질감, 추가 얼굴·장비를 만들지 않는다. Stage 1·2·4에 같은 일반 메시가 반복되는 것도 현재 구현을 반영한 것이다. 그림은 렌더 화면을 정밀 복제한 스크린샷이 아니라 몇 개의 박스로 구성된 구조를 보여주는 참고도다.

| 스테이지 | 이미지 | 표시한 현행 형태 | SHA-256 |
|---|---|---|---|
| Stage 1 교실 | [stage1_classroom_blockout.png](stage1_classroom_blockout.png) | E01 기본, E02 대형, E05 전방 기울임. 타입별 기존 팔레트·크기만 사용 | `587a4701c3aa5c2c5e33717394dfc16a03d00f32c316ceb5b25a113bc895d14c` |
| Stage 2 복도 | [stage2_corridor_blockout.png](stage2_corridor_blockout.png) | E03 소형, E02 대형, E04 원거리. 세 타입 모두 공통 기본 박스 메시 | `c33a4179ed1026f5d4b3a04a532538b9239659f3419ef3a45591070ebe022395` |
| Stage 3 체육관 | [stage3_gym_blockout.png](stage3_gym_blockout.png) | RZC 기존 작은 런 크루 박스 파츠, E06 대형, E05 기본형 | `cad0854a66d6f3c7b2a8150bc10c61cafe1a893ad9eca9298a03754bc9b3a628` |
| Stage 4 급식실 | [stage4_cafeteria_blockout.png](stage4_cafeteria_blockout.png) | Stage 2와 같은 E03·E02·E04 기본 박스 메시·팔레트·크기 (같은 원화 이미지) | `c33a4179ed1026f5d4b3a04a532538b9239659f3419ef3a45591070ebe022395` |

> 이 이미지는 코드·모델·텍스처를 수정하거나 게임 번들에 포함하지 않는다.

## 다시 그릴 때 유지한 기준

- 한 캐릭터의 형태는 머리·몸통·두 팔·두 다리와 작은 손·발·눈에 한정한다.
- 몸통과 팔은 어깨에서 맞닿고, 몸체는 불투명한 닫힌 박스로 보이게 한다.
- 검은 외곽선과 단순한 툰 명암만 사용한다.
- 복장 디테일, 헤어 가닥, 학교 소품, 무기, 바닥·배경 장식은 만들지 않는다.
- 타입 차이는 현재 팔레트·크기·애니메이션으로만 표현한다. 새 스테이지 전용 외형을 구현한 것처럼 그리지 않는다.

## 원화 프롬프트의 공통 요지

> Show exactly three full-body zombies assembled from a handful of box meshes: one chamfered box head, one box torso, two box arms connected at the shoulders, two box legs, small box hands/feet and two tiny square eyes. Use opaque connected cuboids, flat toon shading and a simple dark outline. No extra props, clothing folds, textures, hair, background scene, or new geometry. Match only the listed existing type palettes, scale, and already implemented role poses.

Stage sheets were generated separately with these existing references:

- Stage 1: E01 olive, E02 purple/lavender at 1.4x, E05 red at 1.15x.
- Stage 2: E03 body `#253E18` / skin `#425E30` / red eye; E02 body `#7A28B8` / skin `#B870D8` / orange eye at 1.4x; E04 body `#B05010` / skin `#D08840` / yellow eye at 0.9x.
- Stage 3: RZC small blue run-crew parts, E06 dark red at 1.6x, E05 red at 1.15x.
- Stage 4: same E03/E02/E04 forms, palette and scale as Stage 2, so it reuses the same image bytes.

## 검토한 구현 위치

- Palettes and ordinary mesh: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:21-35,1091-1129`.
- Chamfered box, toon surface and shared outline: `Developer/r3f_prototype/src/components/ZombieMesh.jsx:356-368`.
- Fixed standard instance parts and palette lookup: `Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx:22-37`.
- Current sizes and role flags: `Developer/r3f_prototype/src/components/Enemy.jsx:341-368`.
- Stage names and active themes: `Developer/r3f_prototype/src/lib/stageConfig.js:22-106`.

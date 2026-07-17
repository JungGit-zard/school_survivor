# Stage 3 Gym Collision, Doge Body, Matilda Charge Implementation — 2026-07-17

## 변경 범위

- `Developer/r3f_prototype/src/components/StageObjects/stageObjectColliders.js`
- `Developer/r3f_prototype/src/components/DancingDogeEvent.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/scripts/generate_sfx.mjs`
- 관련 focused tests

## 구현 내용

- Stage 3 체육관 소품 전체를 물리 충돌 대상으로 확장했다.
- 농구 골대, 공 카트, 농구공 더미, 벤치, 콘, 매트, 점수판, 현수막, 출구문, 장비 더미를 단일 큰 박스가 아니라 실제 모델에 가까운 여러 `CuboidCollider` 부품으로 나눴다.
- Stage 3에서는 기존 `blocking: false`로 표시된 작은 체육관 소품도 물리 충돌체를 생성한다.
- 보너스 도지의 콜라이더를 `sensor`에서 실제 충돌 콜라이더로 바꿨다. 무기 피격은 기존 `enemyBodies` 계약을 유지한다.
- 마틸다는 최초 등장 후 `matildaLaugh` 상태에서 웃고, 웃음이 끝나면 `matildaAim -> charge`로 돌진한다.
- 돌진 중 실제 이동량이 명령 이동량의 18% 미만으로 70ms 이상 누적되면 장애물 막힘으로 보고 `chargeDir`을 반전한다.
- 플레이어 접촉 거리 안에서는 장애물 막힘으로 판단하지 않아 기존 피해 판정과 충돌하지 않게 했다.

## R3F/Rapier 안정성 판단

- 새 동적 body를 추가하지 않았다.
- 체육관 소품 충돌체는 기존 고정 `RigidBody` 레이어에 작은 `CuboidCollider`를 추가하는 방식이다.
- 마틸다 막힘 감지는 충돌 이벤트에 의존하지 않고 기존 프레임 루프의 위치 차이로 판단한다.
- 프레임 루프 안에서 새 `Vector3`나 React state 기반 반복 갱신을 추가하지 않았다.

## 사운드 구현 메모

- 런타임 SFX ID는 기존 `matildaLaugh`를 유지했다.
- `generate_sfx.mjs`의 `matildaLaugh` 프리셋을 사운드미니 Animalese 원칙에 맞춰 `오-호-호` 3토큰 합성 구조로 갱신했다.
- 현재 환경에 `ffmpeg`가 없어 OGG/MP3 실제 재인코딩은 수행하지 못했다.
- 따라서 현재 AAB/런타임은 기존 `matildaLaugh.ogg/mp3` 파일을 계속 사용하며, 다음 오디오 생성 환경에서 스크립트 프리셋으로 재생성해야 한다.

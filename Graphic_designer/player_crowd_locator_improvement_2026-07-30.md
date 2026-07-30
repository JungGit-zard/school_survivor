# 플레이어 캐릭터 외곽선 군중 가독성 개선

## 관찰 증거

- 개선 전: `Quaility_Assurance/evidence/critic_round2_dense_stage1_35s_mobile_390x844_2026-07-30.png`에서는 분홍 머리가 보였지만, `critic_round2_dense_stage1_90s_mobile_390x844_2026-07-30.png`에서는 녹색·보라 좀비 약 20마리가 겹쳐 플레이어를 즉시 찾기 어려웠다.
- 원인: `PlayerOuterOutline`은 적과 같은 깊이 판정을 사용하므로 군중 뒤에서는 보이지 않는다.

## 적용

- 별도 원·화살표·조준 표시를 추가하지 않았다. 프로젝트 정책의 일반 플레이 화면 위치 보정 표시 금지 규칙을 따른다.
- 이미 존재하는 `PlayerOuterOutline` 5개 메시만 `depthTest: false`, `depthWrite: false`, `renderOrder: 90`으로 그려 적 군중 위에서도 캐릭터 실루엣이 남게 했다.
- 외곽선 자체는 기존 카툰 모델의 inverted-hull 표현이므로, 플레이어 위치를 대신하는 새 UI나 디버그 오브젝트가 아니다.

## 변경하지 않은 범위

- 플레이어 모델 파츠, 색상, toon/outline 색상, Studio tuning, transform, Firebase, localStorage, 적·보스·VFX에는 변경이 없다.
- 새 의존성이나 후처리 outline pass를 추가하지 않았다.

## 검증

- `npm.cmd test -- PlayerMesh.test.js` — 12개 통과.
- 테스트는 실제 외곽선 `MeshBasicMaterial`의 `depthTest`, `depthWrite`, 투명도, 불투명도를 검증한다.
- `git diff --check` 통과.

## 남은 시각 재검증

- 부모 QA가 동일한 390×844의 90초 군중 장면에서 기존 캐릭터 외곽선만으로 1초 안에 플레이어 위치를 식별시키는지 다시 캡처해 확인해야 한다.

# ProceduralFaceTestZombie E01 변형 계약 수정

## 증상과 원인

Graphics Studio 전용 웃는 좀비만 파츠 변형 경로가 기존 좀비와 달랐다. 원인은 `studioPartId`가 `id:` stable key를 만들었기 때문이다. E01은 명시적 ID가 아니라 고정 JSX 자식 순서의 숫자 경로를 사용한다.

## 근거

- `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`
- `Developer/graphics_studio_part_focus_2026-07-05.md`
- `Developer/graphics_studio_part_group_apply_runtime_fix_2026-07-05.md`
- `Developer/graphics_studio_player_part_apply_runtime_parity_2026-07-18.md`

## 최소 수정

`Developer/r3f_prototype/src/components/ProceduralFaceTestZombie.jsx`에서 `studioPartId`와 관련 userData를 제거했다. 머리→몸→좌우 팔→좌우 다리의 직접 자식 순서를 고정하고, 각 파트는 E01처럼 외부 pivot과 원점 내부 visual 그룹으로 구성했다. 얼굴 셰이더와 Firebase Studio 연결은 변경하지 않았다.

## 검증

- RED: `npm test -- src/components/ProceduralFaceTestZombie.test.jsx --reporter=dot` → 1 fail / 5 pass
- GREEN: 같은 명령 → 6 pass
- Focused: preview/config 포함 3 files / 34 tests pass

Firebase 데이터는 읽거나 쓰지 않았다.
# 후속 변형 상속 수정 (2026-07-29)

Graphics Studio가 숫자 child-path로 선택한 fill mesh만 변형할 때, fill·inverted-hull outline·얼굴이 형제 구조여서 outline과 얼굴이 따라오지 않는 문제가 있었다. E01 숫자 경로, `studioPartId` 미사용, 고정 part 순서와 pivot → visual 구조를 유지한 채, 클릭 대상 fill mesh 아래에 raycast 비활성 outline과 face children을 중첩했다. 따라서 fill의 위치·회전·스케일이 두 시각 요소에 상속된다.

Firebase Apply, 데이터 테스트, 저장 방식 변경은 없었고 localStorage도 사용하지 않았다. 수동 Firebase 변형 테스트는 수행하지 않았다.

## Face plane 확대 후속 기록 (2026-07-29)

머리 앞면 `0.56 × 0.50`에서 face plane을 `0.48 × 0.43`에서 `0.54 × 0.48`로 확대했다. 폭 96.4%, 높이 96.0%를 차지하고 가장자리는 각 0.01만 남긴다. 셰이더 표정·z 위치·머리·외곽선 상속·E01 숫자 경로·Firebase 경계는 변경하지 않았다. RED 1 fail / 6 pass에서 GREEN 7 pass로 전환됐고, focused 35 pass, build와 Legacy B02 gates를 통과했다. Firebase Apply·데이터 변경·localStorage·수동 변형 테스트는 없었다.

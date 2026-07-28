# ProceduralFaceTestZombie E01 변형 계약 검증

## 결과

- RED 계약: 1 fail / 5 pass — `studioPartId` 존재를 정확히 감지
- GREEN 계약: 1 file / 6 tests pass
- Focused: 3 files / 34 tests pass
- Production build: 281 modules transformed, Legacy B02 source/artifact gate pass

## 추가 검사

- `rg -n "studioPartId" src/components/ProceduralFaceTestZombie.jsx` 결과 0개
- 두 소유 파일 scoped CRLF-aware diff check pass
- source contract는 E01 canonical numeric child path, 고정 child order, pivot→visual 계층을 검사한다.

## 경계와 남은 수동 확인

브라우저와 Firebase Apply는 수행하지 않았다. 초기 전체 스냅샷·revision 보존과 완전 복원 증명 없이 실제 Firebase 정본을 변형하는 테스트는 금지되어 있다. 로그인 가능한 승인 환경에서 Studio preview의 각 파트 변형 중심과 게임/runtime 동일성을 별도 수동 확인해야 한다.

관련 구현 기록: `Developer/procedural_face_zombie_e01_transform_contract_fix_2026-07-29.md`.
# 후속 변형 상속 QA 기록 (2026-07-29)

원인: Studio 숫자 child-path로 선택된 fill mesh와 inverted-hull outline·얼굴이 형제여서 fill만 변형되고 나머지가 따르지 않았다. 해결: E01 숫자 경로, `studioPartId` 미사용, 고정 part 순서, pivot → visual 구조를 유지하며 클릭 대상 fill mesh 아래에 raycast 비활성 outline과 face children을 중첩해 위치·회전·스케일 상속을 보장했다.

- RED 계약: 1 fail / 6 pass
- GREEN 계약: 1 file / 7 tests pass
- 관련 집중 검증: 3 files / 35 tests pass
- production build 성공, Legacy B02 source/artifact gates pass

Firebase Apply·Firebase 데이터 테스트·저장 변경·localStorage 사용은 없었고, 수동 Firebase 변형 테스트도 수행하지 않았다.

## Face plane 확대 후속 기록 (2026-07-29)

머리 앞면 `0.56 × 0.50`에서 face plane을 `0.48 × 0.43`에서 `0.54 × 0.48`로 확대했다. 폭 96.4%, 높이 96.0%를 차지하고 가장자리는 각 0.01만 남긴다. 셰이더 표정·z 위치·머리·외곽선 상속·E01 숫자 경로·Firebase 경계는 변경하지 않았다. RED 1 fail / 6 pass에서 GREEN 7 pass로 전환됐고, focused 35 pass, build와 Legacy B02 gates를 통과했다. Firebase Apply·데이터 변경·localStorage·수동 변형 테스트는 없었다.

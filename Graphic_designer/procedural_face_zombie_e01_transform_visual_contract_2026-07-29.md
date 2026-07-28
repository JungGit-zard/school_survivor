# ProceduralFaceTestZombie E01 시각 변형 계약

## 유지해야 하는 시각 요소

- 단일 shader plane의 웃는 얼굴: 눈·동공·눈썹·코·미소·상처를 UV 수식으로 그림
- 머리 앞면의 작은 오프셋, feature-only alpha, toon 머리 바탕
- 얼굴 plane의 `studioNonFocusable`, `studioNonTunable`, raycast 비활성화
- 기존 몸체 색, 비율, outline, 웃는 입과 blink/pupil 애니메이션

## E01 변형 중심

머리→몸→좌우 팔→좌우 다리의 직접 자식 순서를 고정한다. 각 파트는 외부 pivot과 내부 visual 그룹을 사용해 E01의 숫자 child-path 변형 중심을 따른다. 얼굴을 별도 focus/tuning 파트로 만들지 않는다.

## 시각 회귀 체크리스트

1. 파트 변형 후 머리·몸·팔·다리의 pivot이 의도한 위치에 남는가.
2. 얼굴 plane이 더블클릭 포커스를 가로막지 않는가.
3. 얼굴 바깥에 반투명 타원이나 z-fighting이 없는가.
4. 웃는 입이 V자/찡그림으로 보이지 않고 양끝이 올라가는가.

구현 참조: `Developer/r3f_prototype/src/components/ProceduralFaceTestZombie.jsx`.

`threemini` 검토 카드 `t_3677b5e8`은 Hermes OAuth HTTP 401로 blocked였다. 이는 시각 검증 완료를 뜻하지 않는다. 민감정보는 포함하지 않는다.
# 후속 시각 변형 상속 기록 (2026-07-29)

원인은 Studio 숫자 child-path가 fill mesh만 선택하는데 fill·inverted-hull outline·얼굴이 형제였던 구조다. E01 숫자 경로, `studioPartId` 미사용, 고정 part 순서, pivot → visual 구조를 보존하면서 fill mesh 내부에 raycast 비활성 outline과 face children을 배치했다. 이제 선택한 fill의 위치·회전·스케일이 외곽선과 얼굴에 함께 상속된다.

Firebase Apply·데이터 테스트·저장 변경은 없고 localStorage를 사용하지 않았으며 수동 Firebase 변형 테스트도 하지 않았다.

## Face plane 확대 후속 기록 (2026-07-29)

머리 앞면 `0.56 × 0.50`에서 face plane을 `0.48 × 0.43`에서 `0.54 × 0.48`로 확대했다. 폭 96.4%, 높이 96.0%를 차지하고 가장자리는 각 0.01만 남긴다. 셰이더 표정·z 위치·머리·외곽선 상속·E01 숫자 경로·Firebase 경계는 변경하지 않았다. RED 1 fail / 6 pass에서 GREEN 7 pass로 전환됐고, focused 35 pass, build와 Legacy B02 gates를 통과했다. Firebase Apply·데이터 변경·localStorage·수동 변형 테스트는 없었다.

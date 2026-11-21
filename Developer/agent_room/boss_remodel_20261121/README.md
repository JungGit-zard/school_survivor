# Stage 5·6 보스 재모델링 (2026-11-21, threemini)

- Terry 결정: "둘 다 안 A로 하되, 안 B도 잘 보관해".
- 게임에 들어간 것(안 A): B10 교감 = Kenney Mini `male-a` 개조, B05 교장 = Kenney Mini `male-d` 개조.
  - 코드: `Developer/r3f_prototype/src/components/MiniBossMesh.jsx`, `src/lib/miniBossRoster.js`, `src/lib/miniBossGeometry.js`, `src/lib/miniBossProps.data.js`(생성 파일), `ZombieMesh.jsx` 분기.
  - 소품 데이터 생성기: `Developer/r3f_prototype/scripts/mini_boss/` (`export_props.py`).
  - 예전 모델(`B10ViceBossMesh.jsx`, 확장 리그 B05)은 지우지 않았다. Mini GLB를 읽는 동안·실패 시 대신 그려진다.
- 보관(안 B): `option_b/` (README 참고).
- 최종 미리보기(게임에 넣은 색·포즈, Blender 근사 렌더): `final_preview_option_a.png`.
- 계획서·비교: `plan_20261121.md`, `contact_sheet_current_A_B.png`(현재 | 안 A | 안 B | 일반 좀비). 그림 속 안 A 색은 계획 단계 색이다. 게임에 들어간 안 A는 기존 색 칸에 맞춰 조금 다르다(조끼 남색이 조금 더 짙음, 피부 zPale).

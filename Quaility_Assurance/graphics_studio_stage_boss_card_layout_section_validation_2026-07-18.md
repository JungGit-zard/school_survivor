# Graphics Studio 스테이지 보스 카드 레이아웃 섹션 검증

## 확인 항목

- 보스 미리보기와 세 개의 구도 조절값이 같은 테두리 안에 포함된다.
- 일반 모델 조절값은 강조 패널 바깥에서 시작한다.
- 좁은 화면에서도 제목, 도움말, 미리보기와 입력값이 가로로 잘리지 않는다.
- 기존 조절값 입력 이름과 동작은 유지된다.

## 자동 검증

- 명령: `npm.cmd exec -- vitest run src/components/GraphicsStudio.test.jsx`
- 결과: 26개 테스트 전체 통과

## 화면 검증

- 데스크톱 1280×720: `Quaility_Assurance/graphics_studio_stage_boss_card_layout_section_2026-07-18.png`
- 모바일 390×844: `Quaility_Assurance/graphics_studio_stage_boss_card_layout_section_mobile_2026-07-18.png`
- 결과: 전용 녹색 패널이 일반 조절 항목과 명확히 구분되고, 두 화면 크기에서 레이아웃이 유지된다.

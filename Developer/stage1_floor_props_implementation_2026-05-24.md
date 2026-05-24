# Stage 1 Floor And Props Implementation

작성일: 2026-05-24
대상: `Developer/r3f_prototype`
상태: implemented

## 변경 요약

- `ClassroomFloor.jsx`의 바닥 팔레트를 밝은 베이지 계열에서 어두운 폐교 마룻바닥 계열로 변경했다.
- 판자 반복 수를 줄여 모바일 화면에서 넓은 마룻바닥 판자로 읽히게 했다.
- 바닥 텍스처 자체에 먼지와 감염 얼룩을 baked-in 처리해 시작 화면부터 깨끗한 프로토타입 바닥처럼 보이지 않게 했다.
- `stagePropsLayout.js`에 비충돌 atmosphere 소품을 추가했다.
- 충돌 소품은 기존처럼 스테이지 전체 외곽 링에 유지하고, 종이/오염/창문 그림자 같은 비충돌 분위기 요소만 중앙 안전구역 밖 전이 구간에도 배치했다.

## 구현 파일

- `src/components/ClassroomFloor.jsx`
- `src/components/ClassroomFloor.test.jsx`
- `src/lib/stagePropsLayout.js`
- `src/lib/stagePropsLayout.test.js`

## 확인 기준

- 시작 화면 바닥이 밝은 프로토타입 판자처럼 보이지 않아야 한다.
- 플레이어 이동 초반부터 비충돌 분위기 요소가 드문드문 화면에 들어와야 한다.
- 충돌 소품은 플레이어를 가두지 않도록 외곽 링에 유지한다.
## 2026-05-24 iPhone SE 배경 재작업

- `ClassroomFloor.jsx`를 반복 타일 질감에서 4096px 단일 캔버스 마룻바닥 질감으로 바꿨다.
- 굵은 검은 판자 선을 제거하고, 텍스처 기준 1px 선/얇은 흠집/작은 먼지 점으로 다시 디테일링했다.
- `App.jsx`의 강제 iPhone 12 비율 프레임을 제거해 iPhone SE에서도 좌우가 검은 여백으로 잘리지 않게 했다.
- `stagePropsLayout.js`에 시작 화면 가시권 안 비충돌 시각 프랍을 추가해 한 화면 안에 최소 2개 이상 보이도록 했다.
- `HUD.jsx`의 HP/XP 바 폭을 `calc(100% - 48px)`로 바꿔 iPhone SE 폭에서 좌우가 붙거나 잘리지 않게 했다.

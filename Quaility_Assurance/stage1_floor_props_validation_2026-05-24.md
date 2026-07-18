# Stage 1 Floor And Props Validation

작성일: 2026-05-24
대상: Stage 1 마룻바닥과 외곽/전이 구간 소품
상태: automated validation passed, visual manual check pending

## 검증 내용

- `ClassroomFloor.test.jsx`
  - 바닥 팔레트가 밝은 베이지 프로토타입 톤이 아니라 어두운 폐교 마룻바닥 톤인지 확인했다.
  - 모바일에서 판자가 너무 촘촘하게 보이지 않도록 반복 수와 판자 높이를 확인했다.
- `stagePropsLayout.test.js`
  - 충돌 소품은 스테이지 전체 외곽 링에 남는지 확인했다.
  - 비충돌 atmosphere 소품은 중앙 안전구역 밖 전이 구간에도 드문드문 배치되는지 확인했다.

## 실행 결과

- `npm test -- --run src/lib/stagePropsLayout.test.js src/components/ClassroomFloor.test.jsx`
  - 2 files passed
  - 25 tests passed
- `npm test -- --run`
  - 19 files passed
  - 149 tests passed
- `npm run build`
  - build passed
  - Vite large chunk warning only

## 남은 확인

- 실제 브라우저 화면에서 색감이 충분히 어두운지 사용자가 확인해야 한다.
- 로컬 dev server: `http://127.0.0.1:5180`
## 2026-05-24 iPhone SE Revalidation

- `npm test -- --run src/components/ClassroomFloor.test.jsx src/lib/stagePropsLayout.test.js src/App.virtualJoystick.test.jsx`
  - 3 files passed
  - 30 tests passed
- `npm test -- --run`
  - 19 files passed
  - 152 tests passed
- `npm run build`
  - build passed
  - Vite large chunk warning only
- Browser check:
  - viewport: 320x568 (iPhone SE 기준)
  - screenshot: `tmp/stage1-bg-iphone-se-v8.png`
  - 확인: 굵은 검은 판자선 제거, 1px 기반 얇은 마룻결 적용, 화면 안 비충돌 프랍 2개 이상 노출, 좌우 검은 여백 제거.
- 잔여 리스크:
  - 실제 iPhone SE Safari 기기 검증은 아직 필요하다.
  - 프랍은 현재 비충돌 시각 프랍이므로, 추후 원화급 고정 배경 세트피스로 교체 가능하다.

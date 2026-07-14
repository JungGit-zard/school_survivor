# 타이틀 캐릭터 외곽선 감사 및 치비코 검증

## 자동 검증

- `ChibikoModel`의 self-closing `Part` 19개를 확인했다.
- 19개 모든 Part에 `outlineMaterial={outline}`이 적용됨을 확인했다.
- 리본 날개 2개는 outline scale `1.03`을 사용한다.
- 손과 맨다리 4개는 outline scale `1.04`를 사용한다.
- `ChibikoPencilModel` 이후 범위는 이번 변경 대상에서 제외했다.

## 검증 결과

- 집중 테스트: `Chibiko.test.jsx` + `TitleScene3D.test.jsx`, 2 files / 15 tests 통과
- 전체 테스트: 113 files / 826 tests 통과
- 프로덕션 빌드: `npm run build` 통과
- 브라우저 콘솔: 런타임 오류 없음. Vite Fast Refresh 디버그 메시지만 존재
- 모바일 실화면: 390x844에서 전 캐릭터 외곽선 유지 확인
- QA 판정: PASS, blocker 없음. 치비코 손·맨다리·리본 끝 분리 양호, 이중 halo·과도한 굵기·가림 회귀 없음

## 증거

- 스크린샷: `C:\Users\admin\AppData\Local\Temp\school-survivor-title-all-character-outlines-390x844.png`

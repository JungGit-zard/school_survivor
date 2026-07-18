# 타이틀 클럽 조명 검증 (2026-07-14)

## 자동 검증

- `TitleScene3D.test.jsx`: 조명 수, 색 팔레트, additive 빔, 단일 무그림자 광원, reduced-effects 분기 통과
- `GraphicsStudioPreview.test.js` 포함 관련 테스트 24개 통과
- 전체 Vitest 108개 파일, 753개 테스트 통과
- `npm run build` 통과

## 브라우저 시각 검증

- 375x812: 좌우 청록·마젠타 빔 노출, 제목·부제·계정 패널 가독성 유지
- 390x844: 두 빔과 코어 빔 노출, 캐릭터 얼굴 및 출구 실루엣 유지
- 497x761: 사용자 첨부 화면과 유사한 비율에서 빔이 양쪽 상단을 프레이밍하고 중앙 제목을 가리지 않음
- 브라우저 콘솔 런타임 오류 없음

## 캡처

- `Quaility_Assurance/title-club-lighting-375x812-2026-07-14.png`
- `Quaility_Assurance/title-club-lighting-390x844-2026-07-14.png`
- `Quaility_Assurance/title-club-lighting-497x761-2026-07-14.png`

## 남은 위험

- 실제 저사양 Android 기기 GPU 프레임 시간은 자동 브라우저 환경에서 측정하지 않았다.
- 빔은 텍스트 안전 영역을 피하지만 사용자가 Graphics Studio에서 타이틀 장면 위치를 크게 바꾸면 재조정이 필요할 수 있다.

# 타이틀 화면 검증 기록

날짜: 2026-06-14

## 검증 항목

- 모바일 세로 375x812 화면에서 타이틀, 장면, 버튼이 읽히는지 확인.
- 모바일 세로 390x844 화면에서 타이틀, 장면, 버튼이 읽히는지 확인.
- 모든 무기 해금 버튼과 코인 레벨업 초기화 버튼이 하단 테스트용 버튼으로 유지되는지 확인.
- 관련 타이틀/무기 테스트와 프로덕션 빌드가 통과하는지 확인.

## 실행 결과

- `npm test -- TitleScreen.settings.test.jsx TitleScene3D.test.jsx resultCoinShopFlow.test.jsx CompassBlade.test.jsx weaponCatalog.test.js upgrades.test.js`
  - 결과: 7개 파일, 64개 테스트 통과.
- `npm run build`
  - 결과: 성공.
  - 참고: Vite가 500kB 초과 번들 경고를 출력했지만 빌드는 실패하지 않았다.

## 캡처 증거

- `Quaility_Assurance/title_mobile_375x812_after_v5.png`
- `Quaility_Assurance/title_mobile_390x844_after_v6.png`


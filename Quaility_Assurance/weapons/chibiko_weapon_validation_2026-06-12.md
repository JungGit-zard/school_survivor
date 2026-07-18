# 치비코 무기 검증 기록

## 검증 범위

- 무기 카탈로그 등록.
- 최고 레벨 카드 게이트.
- HUD 획득 카드 라벨과 아이콘 매핑.
- 추종 위치 계산과 레벨1 연필 공격 설정.
- 앱 번들 빌드.

## 실행한 검증

- `npm.cmd test -- --run src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/components/HUD.test.jsx src/lib/chibiko.test.js --pool=threads`
- 결과: 4개 테스트 파일, 46개 테스트 통과.
- `npm.cmd run build`
- 결과: Vite production build 성공.
- `npm.cmd test -- --run --pool=threads`
- 결과: 37개 테스트 파일, 225개 테스트 통과.

## 남은 시각 검수

- 실제 플레이에서 Lv.8 카드로 치비코를 획득한 뒤, 390px급 모바일 폭에서 주인공과 치비코가 명확히 구분되는지 확인이 필요하다.
- 적이 많을 때 치비코의 검은 머리 outline가 바닥 그림자처럼 보이지 않는지 추가 스크린샷 검수를 권장한다.

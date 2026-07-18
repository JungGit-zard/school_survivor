# 타이틀 개발 버튼 검증 기록

## 검증 범위

- 타이틀 화면의 모든 무기 해금 버튼.
- 타이틀 화면의 코인 레벨업 초기화 버튼.
- 패시브 저장소 초기화 함수.

## 실행한 검증

- `npm.cmd test -- --run src/lib/passiveUpgrades.test.js src/components/TitleScreen.settings.test.jsx --pool=threads`
- 결과: 2개 테스트 파일, 17개 테스트 통과.
- `npm.cmd test -- --run --pool=threads`
- 결과: 37개 테스트 파일, 228개 테스트 통과.
- `npm.cmd run build`
- 결과: Vite production build 성공.

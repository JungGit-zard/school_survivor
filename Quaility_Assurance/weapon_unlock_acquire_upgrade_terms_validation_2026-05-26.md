# 무기 해금/획득/업그레이드 용어 검증

## 검증 범위

- 계정 단위 해금 로직
- 한 판 안의 무기 획득 선택지
- 획득 이후 업그레이드 선택지
- HUD 표시 문구

## 검증 결과

- `kind: 'unlock'`으로 처리되던 인런 무기 선택 효과를 `kind: 'acquire'`로 바꾼 뒤 관련 테스트를 갱신했다.
- HUD 선택지 문구가 무기 첫 선택에는 "획득"을 사용하도록 확인했다.
- 결과 화면의 새 무기 조건 달성 문구는 계정 단위 상태 변화이므로 "해금"으로 유지했다.

## 실행한 검증

- `npm.cmd test -- --run src/lib/upgrades.test.js src/components/HUD.test.jsx src/store/useGameStore.guidedMissileUnlock.test.js`
  - 통과: 3개 테스트 파일, 29개 테스트
- `npm.cmd test -- --run`
  - 통과: 23개 테스트 파일, 148개 테스트
- `npm.cmd run build`
  - 통과
  - 기존과 같은 대형 번들 경고가 표시됨

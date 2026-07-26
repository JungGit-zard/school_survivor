# 황금 도지 투사체 피격 반응

## 반드시 지킬 사항

- `DancingDogeEvent.jsx`의 인게임 도지 모델 그룹에만 120ms squash를 적용한다.
- `_enemyHit`마다 타이머를 0으로 되돌리고, `useFrame`에서 직접 스케일을 원복한다.
- 콜라이더, 체력바, 월드 좌표, 기존 스파크, 사망·도주 연출과 `DogeMesh.jsx`는 변경하지 않는다.

## 절대로 하면 안 되는 사항

- React 상태 갱신 또는 프레임별 새 객체·배열 생성으로 피격 연출을 만들지 않는다.
- Firebase, Graphics Studio, localStorage 또는 공용 타이틀 도지 모델을 건드리지 않는다.

## 구현 및 검증

- `DOGE_HIT_SQUASH_MS = 120`, X/Z 최대 1.12배·Y 최소 0.78배로 짧고 명확한 납작 효과를 적용했다.
- RED: `DancingDogeEvent.test.jsx`의 새 소스 계약이 상수 부재로 실패했다.
- GREEN: 동일 테스트와 도지 SFX·도주 회귀 테스트가 통과했다.

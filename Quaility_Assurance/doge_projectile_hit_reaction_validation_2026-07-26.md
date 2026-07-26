# 황금 도지 피격 반응 검증

## 반드시 지킬 사항

- 무기 `_enemyHit`마다 squash 타이머가 재시작되고, 120ms 뒤 `(1, 1, 1)`로 복귀해야 한다.
- 게임 진행 중에만 타이머가 진행되고, 사망·도주 전환에서 인게임 모델과 충돌하지 않아야 한다.

## 절대로 하면 안 되는 사항

- 도지의 기존 twist, 넉백 센서, 단단한 본체 콜라이더, SFX, 도주 규칙을 회귀시키지 않는다.

## 검증 명령

`npx vitest run src/components/DancingDogeEvent.test.jsx src/components/PickupAndDogeSfx.test.jsx src/lib/dogeEscape.test.js`

- 결과: 3 파일, 23 테스트 통과.

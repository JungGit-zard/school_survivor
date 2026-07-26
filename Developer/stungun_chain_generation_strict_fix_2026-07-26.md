# 전기충격기 2차·3차 strict chain 수정 (2026-07-26)

## 원인

적 풀은 성능 때문에 같은 `rb` 객체를 새 좀비에 재사용한다. 기존 체인 hit history가 객체 참조만 보관해, 이미 죽은 좀비의 슬롯에 새로 생성된 가까운 좀비를 이미 맞은 대상으로 오인했다. 그 결과 다음 가까운 후보를 건너뛰어 먼 곳으로 연쇄될 수 있었다.

## 수정

- 체인 hit history를 `Map<rb, generation>`으로 변경했다.
- 같은 `rb`는 같은 generation일 때만 이미 맞은 대상으로 제외한다.
- 후속 bolt에는 선택한 동일한 `{ rb, generation }`을 전달해 graphic 이동과 `applyEnemyHit`가 같은 live target을 사용한다.

## 불변 범위

체인 수, 4.5 범위, 피해, 쿨다운, 이동 속도, SFX, Firebase, Graphics Studio는 변경하지 않았다.

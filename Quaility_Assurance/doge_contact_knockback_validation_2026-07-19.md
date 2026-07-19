# 도지 접촉 넉백 검증 — 2026-07-19

## 검증 범위

- 도지의 기존 비센서 몸통 충돌체 유지
- 플레이어 접촉 센서와 피해 없는 넉백 배선
- 도지 중심에서 플레이어 방향으로 밀어내는 방향 계산
- 240ms 넉백 지속시간과 300ms 재접촉 쿨다운
- 비플레이어·일시정지·미리빌·사망·도주·종료 상태 무시
- 기존 도주, 피격, 사망, 상자 드랍, SFX 계약 회귀 여부

## 코드 검토 결과

- 실제 물리 충돌은 기존 비센서 `CuboidCollider`가 계속 담당한다.
- 몸통보다 조금 큰 별도 sensor `CuboidCollider`가 `onIntersectionEnter`를 받는다.
- `_applyKnockback` 함수가 있는 Player RigidBody만 넉백 대상으로 인정한다.
- 도지와 플레이어의 실제 RigidBody 좌표로 방향을 계산한다.
- 플레이어 피해 함수인 `_playerHit` 또는 `damagePlayer`는 호출하지 않는다.
- Firebase, HP, SFX, 그래픽, 도주 속도와 기존 밸런스 수치는 변경하지 않았다.

## 자동 검증

실행 명령:

```bash
npm test -- --run \
  src/lib/dogeEscape.test.js \
  src/components/DancingDogeEvent.test.jsx \
  src/components/Player.test.js \
  src/components/PickupAndDogeSfx.test.jsx
```

결과:

- 테스트 파일 4개 통과
- 테스트 23개 통과
- 실패 0개

추가 검증:

- `npm run build` 통과
- branch guard 통과
- legacy B02 소스·산출물 gate 통과
- 변경한 코드 파일 4개의 기존 CRLF 줄바꿈 형식 유지
- `git -c core.whitespace=cr-at-eol diff --check` 통과

## 판정

자동 검증 기준 PASS. 도지와 접촉하면 피해 없이 도지 반대 방향으로 플레이어가 밀려나는 구현이 연결되었고, 기존 도지 물리 충돌과 보상 흐름은 유지된다.

실제 브라우저 물리 장면에서의 체감 거리 확인은 이번 자동 검증 범위에 포함하지 않았다.

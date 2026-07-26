# threemini 시각 계약 — 좀비 넉백 방향 고정

- 라우팅: `threemini` 검토 대상. R3F 인스턴스 좀비의 자세와 피격 플래시 시각 계약을 확인한다.
- 최종 계약: 일반 풀링 좀비는 넉백에 진입한 프레임에 피격 직전 `yaw`를 유지하고, 입력 `knockbackX/Z` 방향으로만 이동한다. 이 계약은 마지막 넉백 프레임(`knockbackTimer`가 감산 뒤 0)에도 적용된다.
- 넉백 프레임에는 시야 차단 우회와 기존 detour 회전이 넉백 속도를 덮어쓰지 않는다. 이웃 separation은 충돌 회피이므로 그대로 적용된다.
- 다음 프레임에는 일반 추격 yaw 갱신이 즉시 재개된다. 흰색 `hitFlashTimer` 표현은 유지된다.
- Firebase, Graphics Studio 입력값, localStorage는 변경하지 않았다.

검증: RED는 넉백 중 180도 yaw 반전을 재현했고, 수정 후 focused 2개와 `enemySimulation` 전체 29개 테스트가 통과했다.

# 화면 빈 상태 일반 좀비 스폰 캐치업

- Kanban: `escape-zombie-school`의 기존 levelmini `t_1735705d`, balanceqa `t_3fdd132d` 후속 범위.
- 구현: 화면 렌더러와 같은 `screenBounds` 판정으로 풀 적과 특수/도지 물리 바디를 센다. 화면 밖 적, scheduled queue, pooled drain은 2초 빈 화면 누적을 막지 않는다.
- 다음 후보는 일반 burst/repeat/overtime만 사용한다. 보스 burst는 실시간 `sec`에서만 발화하며 HUD 경고와 boss pressure도 실시간 기준이다.
- 기존 300ms 스폰 리빌과 최대 적 수는 변경하지 않았다. 풀 용량이 화면 밖 적으로 이미 가득 찬 경우에는 삭제·이동·상한 초과 없이 새 일반 적을 만들 수 없으므로 별도 한계로 남는다.

# 타이틀 공용 주인공 모델 복원

- 타이틀 전용 모델이나 복제 파츠를 만들지 않았다.
- 게임과 Graphics Studio가 함께 쓰는 `PlayerVisual`을 타이틀에서도 직접 재사용했다.
- 모델 내부의 `StudioTunedGroup itemId="player"` 연결을 그대로 유지했다.
- 타이틀 배치는 기존 `TITLE_PLAYER_TARGET`의 X/Z와 Y=0만 사용한다.
- 타이틀 전용 배율, 회전, 이동, 흔들림 애니메이션을 추가하지 않았다.
- 체력바는 타이틀에서만 숨기고 `movingRef`는 `false`로 고정했다.
- 타이틀 전용 외곽선 배율 보정이 공용 모델을 바꾸지 않도록 해당 보정 그룹 밖에 배치했다.

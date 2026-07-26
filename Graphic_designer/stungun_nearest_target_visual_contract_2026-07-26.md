# 전기충격기 최근접 표적 시각 계약 (2026-07-26)

전기 볼트의 외부 이동 그룹은 발사 때 선택된 가장 가까운 적의 live 위치를 향한다. 한 프레임 이동은 남은 거리를 넘을 수 없으므로 표적을 통과해 그래픽이 반대 방향으로 보이면 안 된다.

`LightningBoltModel`의 기존 local +Y 방향 보정, `StudioTunedGroup`의 `weapon-stun-gun` 적용, Firebase 기반 Studio 값, 크기·재질·외곽선은 그대로 유지한다. 이 변경은 외부 projectile 이동만 다룬다.

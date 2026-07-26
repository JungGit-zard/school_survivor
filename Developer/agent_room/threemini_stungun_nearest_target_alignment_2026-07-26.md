# threemini 전기충격기 최근접 표적 시각 정렬 라우팅 (2026-07-26)

- 담당 관점: Three.js 투사체 외부 그룹의 위치와 방향 일치.
- 볼트 outer projectile group은 선택된 target rb의 live translation을 향해야 하며, 표적을 통과해 반대 방향 pose가 되면 안 된다.
- 기존 `LightningBoltModel`의 local +Y pose 보정과 `StudioTunedGroup itemId="weapon-stun-gun"`은 보존한다.
- Studio transform, Firebase 데이터, 재질, 스케일, 외곽선은 변경하지 않는다.

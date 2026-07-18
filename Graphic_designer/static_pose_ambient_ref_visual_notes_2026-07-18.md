# staticPose / ambient ref 시각 보정 노트

## 목적

로비 스테이지 카드의 3D 보스 프리뷰는 카드 진입 쇼타임 때만 외곽 래퍼가 반응하고, 내부 좀비 파트의 보행·고개 흔들림은 정적 포즈로 유지되어야 한다. 배경 앰비언트 빛은 살아 움직이되 보스 카드 프리뷰 자체를 재렌더하지 않아 모바일 발열과 배터리 부담을 낮춘다.

## 시각 규칙

- 보스/좀비는 기존 3D toon mesh와 outline 처리를 유지한다.
- `staticPose`는 2D sprite 대체가 아니라 내부 파트 애니메이션 계산만 멈추는 정적 3D 포즈 게이트다.
- 로비 쇼타임은 `StageBossPreview`의 바깥 그룹 scale/rotation/bob만 움직여 카드 피드백을 만든다.
- Graphics Studio interactive 프리뷰는 계속 애니메이션 상태를 확인할 수 있어야 한다.
- 로비 ambient drift는 콘텐츠 뒤의 radial-gradient DOM 레이어만 transform으로 움직이고 클릭/프리뷰 렌더를 방해하지 않는다.

## 확인 포인트

- 로비 기본 상태: 보스 내부 팔·다리 보행 흔들림 없음.
- 입장 쇼타임: 카드 보스가 1초 동안 반응하지만 내부 보행 루프는 정지.
- Graphics Studio: interactive preview는 `staticPose=false`로 기존 애니메이션 유지.
- ambient drift interval 후에도 StageBossPreview 렌더 횟수 증가 없음.

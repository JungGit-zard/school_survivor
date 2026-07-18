# Onigiri Disappearance White Disc Audit - 2026-05-30

## Visual Issue

오니기리가 사라지는 지점에 하얀 원처럼 보이는 잔상이 남았다.

## Audit Result

- 오니기리 무기 파일에는 `circleGeometry` 또는 `ringGeometry` 기반 하얀 원 효과가 없다.
- 소멸 시점에 생성되는 것은 `RiceBurst`의 `RiceGrain` 밥알 메시다.
- 기존 `RiceGrain`은 모든 밥알이 같은 중심 좌표에서 시작했고, 몇 ms 동안 겹쳐 보일 수 있었다.
- 이 겹침이 카메라 시점에서 작고 납작한 하얀 원처럼 보이는 원인이었다.

## Visual Direction

- 밥풀 터짐은 유지한다.
- 밥알은 소멸 중심점에 겹쳐 시작하지 않고, 처음부터 중심 바깥에 흩어진 상태로 시작한다.
- 별도의 하얀 원, 바닥 원, 원형 플래시는 만들지 않는다.

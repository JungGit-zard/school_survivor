# Onigiri Disappearance White Disc Audit Validation - 2026-05-30

## Scope

오니기리 소멸 지점에 하얀 원이 남는 원인을 검수하고, 재발 방지 테스트를 추가한다.

## Checks

- 오니기리 관련 파일의 원형 지오메트리 사용 여부를 검색한다.
- 밥알들이 소멸 중심점에 겹쳐 시작하지 않는지 테스트한다.
- 밥알 지연 시간이 0인지 테스트한다.
- 마지막 충격 즉시 밥풀 터짐 조건은 유지되는지 확인한다.

## Result

- `npm.cmd test -- src/lib/onigiri.test.js --run`: passed, 5 tests.
- `npm.cmd test -- --run`: passed, 26 files / 162 tests.
- `npm.cmd run build`: passed. Vite large chunk warning only.
- `rg -n "circleGeometry|ringGeometry|meshBasicMaterial" Developer/r3f_prototype/src/components/Weapons/Onigiri.jsx Developer/r3f_prototype/src/lib/onigiri.js`: no matches. Exit code 1 means no matching circular/basic white material code was found.

## Conclusion

오니기리 소멸 지점의 하얀 원은 별도 원형 메시가 아니라, `RiceBurst` 밥알들이 같은 중심점에 겹쳐 시작하던 시각적 뭉침이었다. 밥알 시작 좌표를 중심에서 흩어지게 바꿔 같은 흰 원이 재발하지 않도록 했다.

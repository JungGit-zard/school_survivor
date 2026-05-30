# E06 Late Wave Spawn Pressure 2 Percent Validation - 2026-05-30

## 검증 대상

- Stage 1 후반 `E06` 지속 스폰 비중을 기존 3%에서 2%로 낮춘 변경.

## 테스트 기준

- `WAVE_PHASES`의 `start: 210` 구간에서 `E06` weight는 `0.02`여야 한다.
- 같은 구간의 weight 총합은 `1`이어야 한다.

## 실행 명령

```powershell
npm.cmd test -- src/components/Enemies.test.jsx --run
```

## 참고

- 첫 RED 단계에서는 `WAVE_PHASES`가 export되지 않아 테스트가 실패했다.
- 이후 `WAVE_PHASES` export와 스폰 비중 변경을 함께 적용했다.

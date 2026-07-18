# Player Weapon Arm Action Validation - 2026-05-30

## 검증 대상

- 커터칼 공격 후 팔 자세가 만료되는지.
- 보조배터리 미사일 발사 시 단순 던지기 팔 동작이 계산되는지.

## 테스트 기준

- `boxCutter` 팔 액션은 지속 시간이 끝나면 `null`이 되고 상태도 비워져야 한다.
- 액션이 없을 때 양팔 회전은 중립값으로 돌아와야 한다.
- `guidedMissileThrow` 액션 중에는 오른팔이 던지는 포즈로 올라가야 한다.

## 실행 명령

```powershell
npm.cmd test -- src/lib/playerArmAction.test.js --run
npm.cmd test -- --run
npm.cmd run build
```

## 결과

- `src/lib/playerArmAction.test.js`: 통과.
- 전체 테스트: 25 files / 156 tests 통과.
- 프로덕션 빌드: 통과.
- Vite 대형 청크 경고는 표시되었지만 빌드 실패는 아니다.

## 참고

- 첫 테스트 실행에서 `-0`과 `0`의 엄격 비교 차이로 실패했다.
- `getPlayerArmPose()`에서 `-0`을 `0`으로 정규화해 중립 자세 검증을 안정화했다.

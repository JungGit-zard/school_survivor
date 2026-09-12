# Spawn catch-up QA — 2026-09-12

검증 명령:

```text
npm test -- --run src/components/HUD.test.jsx src/components/Enemies.test.jsx src/lib/spawnCatchUp.test.js src/lib/spawnCatchUpGates.test.js
```

결과: 4 files, 210 tests passed.

확인한 회귀 조건:

- 렌더러 여백이 아닌 raw `screenBounds` 안의 유한 좌표만 화면 존재로 센다. 경계에서 몸 일부만 보이는 경우도 중심점 기준 근사다.
- 60Hz 120번째 프레임에서 정확히 2초 캐치업이 발화한다.
- 보스는 캐치업 후보에서 제외되고 단발 보스 burst, boss pressure, HUD 경고는 실제 game clock을 사용한다.
- spawn offset 120초에서도 bossSpawnSec 173의 HUD 경고는 실시간 51초에 없고 171초에 표시되며 173초에 사라진다.
- overtime 일반 보강은 일반 스폰 시계 후보이므로 빠른 처치 시 조기 진입한다.

제한: 기존 300ms 스폰 리빌은 그래픽 정본으로 유지했다. 풀 용량이 화면 밖 적으로 포화한 상태에서는 새 적을 삭제·이동·상한 초과 없이 생성할 수 없다.

# B03 왕복 오래달리기 버그 수정 — threemini 작업기록

- 기록일: 2026-08-29
- 담당: threemini (Opus 5 Worker)
- 대상: 스테이지3 보스 B03(체육교사) 필살기 "왕복 오래달리기"
- 커밋: **하지 않음.** 워킹트리 diff만 남기고 Advisor 검증 대기.

## 1. 사용자 실측 보고

> "화면에 보스가 달리기를 할것이라 예고하는 경고선이 그려진뒤 완전히 엉뚱한 곳으로 보스가
> 날아가서 달리는 느낌이 전혀 나지않는 정지자세로 어딘가로 이동하는데 버그 그 자체이다.
> 원래 이동하는 애니메이션을 그냥 써라"

원 사양의 "바닥에 예상루트가 깜빡인후" 도 미구현 상태였다.

## 2. 고친 것

### A. 순간이동 (Enemy.jsx 1231-1236 / b03ShuttleRun.js)

`startX`를 보스 위치와 무관하게 아레나 가장자리(`t.x <= 0 ? -halfX+0.9 : halfX-0.9`)로 잡고
있었다. 텔레그래프 1250ms 동안 보스는 `_vel` 전부 0이라 제자리에 서 있다가, active 첫
프레임의 `_vel.x = (shuttleX - t.x) / delta`가 최대 6.6유닛을 한 프레임에 밀었다.

`getB03ShuttleRunLaneX(bossX, halfX)`를 새로 만들어 `startX = clamp(보스 현재 X)`,
`endX = 반대편 끝(±6.6)`으로 바꿨다. 첫 액티브 프레임의 이동량이 `속도×delta` 한 프레임
분량으로 수렴한다. 편도 거리가 짧아지면 `getB03ShuttleRunPassDurationMs`가 거리÷속도로
역산하므로 소요시간만 줄고 화면상 속도(×10)는 사양 그대로 유지된다.

### B. 경고선과 보스의 Z 불일치 (Enemy.jsx 1231-1236)

`laneZ`를 **플레이어 Z**로 잡는데 보스는 `_vel.z = 0`으로 **자기 Z**를 달렸다. 바닥 선과
실제 주행선이 어긋났고, `consumeB03ShuttleRunPassHit`이 Z는 레인 기준·X는 보스 기준으로
섞어 쓰는 판정도 같이 어긋났다.

`getB03ShuttleRunLaneFromBoss(bossX, bossZ, halfX, halfZ)`로 레인 X/Z를 보스 좌표 하나에서
확정한다. `getB03ShuttleRunLaneZ` 시그니처는 그대로 두고 인자만 보스 Z로 바꿨다(파라미터
이름만 `playerZ` → `laneZ`로 정정).

### C. 이동 애니메이션 (Enemy.jsx 1210-1223)

`queueVisualState('animPhase', 'run')` → `'normal'`. 낡은 주석도 정정했다.
**`ZombieMesh.jsx`에 `'run'` 분기를 새로 만들지 않았다** (사용자 지시 범위 밖).

추가로 `_applyRotation(groupRef, getB03ShuttleRunFacingX(next), 0, 0.25)`를 넣었다.
B03 왕복 분기는 회전을 한 번도 적용하지 않고 early return 하므로, 보스가 정면을 유지한 채
옆으로 미끄러졌다. 이것이 사용자가 "달리는 느낌이 전혀 나지 않는 정지자세로 이동"이라고
말한 실제 원인 쪽에 가깝다(아래 §5 참조). 텔레그래프 1.25초 동안 미리 진행 방향으로 돌아서고,
복귀 패스에서는 방향이 뒤집힌다.

### D. 예고선 깜빡임 (Enemy.jsx 648-682 / b03ShuttleRun.js)

`B03ShuttleRunVisual`이 정적 메시 2장이었고 `syncB03ShuttleVisual`은 phase/laneZ/passIndex
변화에서만 리렌더하므로 텔레그래프 내내 한 번도 깜빡이지 않았다.

`getB03ShuttleTelegraphBlinkFactor(elapsedMs)`(순수 함수, 코사인 3주기, 하한 0.25)를 만들고
`B03ShuttleRunVisual` 안 `useFrame`에서 머티리얼 ref의 `opacity`를 직접 흔든다.
**React state 리렌더를 쓰지 않는다.** `phase !== 'telegraph'`이면 각 상태의 기존 opacity를
그대로 복원한다.

## 3. 건드리지 않은 것

- `B03_SHUTTLE_SPEED_MULTIPLIER = 10`, `B03_SHUTTLE_PLAYER_DAMAGE_RATIO = 0.3` — 확정 사양, 무변경.
- `ZombieMesh.jsx`, 타이틀 관련 파일, `GraphicsStudio.jsx` — 무변경.
- 공유 워크트리이므로 `git checkout` / `stash` / `reset --hard` 미사용. 파일 전체 재작성 없이 Edit 부분 치환만 사용. 세 파일 모두 CR 0개(LF 유지) 확인.

## 4. 실행한 명령과 결과

```
powershell -NoProfile -ExecutionPolicy Bypass -File "Developer/agent_room/mandatory_precommand/check-required-documents.ps1" -Profile threemini -Domain auto -TaskSummary "stage3 boss shuttle run animation fix"
  → exit 0, resolved_domains common/gameplay/graphics,
    combined_receipt_sha256 270390e3c9202d84f8adf39f437507306dd66c076fe9fbcabc7c0f39678abc0b
    READ_REQUIRED 2건 모두 정독

npx vitest run src/lib/b03ShuttleRun.test.js src/components/EnemyVisual.test.js
  → Test Files 2 passed (2) / Tests 43 passed (43), 1.71s

npx vitest run   (전체)
  → Test Files 16 failed | 230 passed (246)
    Tests 24 failed | 2286 passed | 20 skipped (2330)

git diff --numstat  → Enemy.jsx +41/-12, b03ShuttleRun.js +43/-2, b03ShuttleRun.test.js +102/-1
grep -c $'\r' (세 파일) → 전부 0
```

전체 스위트 실패 24건 중 이번 변경이 만든 것은 없다. 실패 파일 목록에 `Enemy.jsx`,
`EnemyVisual`, `b03ShuttleRun` 관련 항목이 없다. 적 관련으로 보이는 두 건은 각각
`ENEMY_STATS` 타입 목록(`Enemies.test.jsx`)과 `ZombieInstanceLayer.jsx` 소스 문자열
(`PooledEnemyVisuals.test.js`) 검사인데, 둘 다 이번 diff 대상 파일이 아니다.
`ZombieInstanceLayer.jsx` / `ZombieMesh.jsx` / `PlayerMesh.jsx`는 작업 중 codex가 동시
수정 중인 파일로 `git status`에 CRLF 경고와 함께 나타났다 — 내 변경이 아니며 손대지 않았다.

## 5. 확인한 사실과 추정의 구분

`[확인된 사실]`

- 옛 `startX`가 보스 위치와 무관한 가장자리 좌표였고, `_vel.x`가 그 차이를 `delta`로 나눠
  한 프레임에 밀었다 (소스 확인).
- `laneZ`가 `playerPos.z`였고 `_vel.z = 0`이었다 (소스 확인).
- **`animPhase = 'run'`은 포즈를 얼리지 않는다.** `ZombieMesh.jsx`의 `useFrame`에는
  `retreat`(863) / `warn`(897) / `stun`(940) early return과 `charge` 틸트만 있고, 그 외의
  값은 전부 아래 걷기 사이클(978~)로 흘러간다. 즉 `'run'`은 `'normal'`과 동작이 동일했다.
  Advisor 브리프의 "`'run'` 분기가 없어 얼어붙는다"는 진단은 소스와 맞지 않는다.
  `'run'` → `'normal'` 변경은 지원되지 않는 값을 없애는 위생 수정이고, 포즈 동작은 그대로다.
- B03 왕복 분기는 `_applyRotation`을 한 번도 호출하지 않고 return 했다 (소스 확인).
- 위 4개 focused 테스트 43개 통과, 전체 스위트 실패 24건은 이번 diff 파일과 무관.

`[추정/미검증]`

- 사용자가 본 "정지자세"의 주된 원인이 회전 미적용(보스가 옆으로 미끄러짐)이라는 것은
  소스 근거에 기반한 추정이다. 실제 브라우저·기기 화면에서 증상 재현(RED) / 소거(GREEN)
  검증은 **하지 않았다.** 실플레이 확인 전까지 이 항목은 미검증이다.
- 깜빡임의 체감 속도(3회/1.25초)와 하한 0.25가 실제 화면에서 적절한지도 미검증이다.

## 6. 추가한 회귀 테스트 (src/lib/b03ShuttleRun.test.js)

전부 실제 함수를 호출해 값으로 판정한다. `expect(source).toContain(...)` 미사용.

1. `출발점은 보스의 현재 X이고 도착점만 반대편 끝이다` — 7개 좌표 + 경계 clamp + NaN 방어.
2. `첫 액티브 프레임의 이동량이 한 프레임 분량(속도×delta)을 넘지 않는다 — 순간이동 없음`
   — 텔레그래프 종료 시점 X == 보스 X, 다음 프레임 이동량 ≤ `기본속도×10×delta`, 환산 속도 ≤ ×10.
3. `레인 Z는 플레이어가 아니라 보스의 현재 Z를 따른다` — 보스 줄에 선 플레이어는 피격,
   떨어진 플레이어는 미피격, 경계 밖 Z는 clamp.
4. `보스는 텔레그래프와 각 패스에서 진행 방향을 바라본다` — 부호 검증, stun/idle은 0.
5. `예고선은 텔레그래프 1.25초 동안 정확히 3번 깜빡인다` — 60fps 샘플링으로 밝기 골짜기
   개수를 세어 3 확인, 범위 [0.25, 1] 검증.

기존 `locks the telegraphed lane to player Z ...` 테스트는 함수가 더 이상 플레이어 Z 전용이
아니므로 이름만 `clamps the telegraphed lane Z inside stage bounds`로 정정했다(단언 동일).

## 7. 남은 일

- Advisor의 최종 diff 검증 및 커밋.
- 실플레이(스테이지3, B03 HP 65%/30%) 화면 검증 — 미수행.

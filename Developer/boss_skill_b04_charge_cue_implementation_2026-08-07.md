# B04 2페이즈 돌진 GO! 큐 구현

날짜: 2026-08-07

## 범위

B04가 2페이즈로 전환된 뒤 공용 차저 경고 상태(`warn`)에 들어가면, B01/B02/B03이 사용하던 기존 월드 3D toon `GO!` 큐를 표시한다. 새 VFX·색상·포효·SFX·보상 값은 추가하지 않았다.

## RED

명령:

```text
npm exec -- vitest run src/components/EnemyVisual.test.js
```

결과: 예상 실패. 신규 테스트 `renders the shared GO! cue for B04 only when its phase-2 charger enters warn, without changing B01`에서 B04 2페이즈 입력이 큐를 렌더하지 않아 실패했다. 기존 21개 테스트는 통과했다.

## GREEN

`Enemy`가 B04의 실제 텔레그래프 종료/2페이즈 전환을 `isChefPhase2`로 `EnemyVisual`에 전달한다. `EnemyVisual`은 기존 기본 차저와, 2페이즈로 확인된 B04의 `chefPhase2.charger`만 공용 큐 표시 자격으로 사용한다. 따라서 텔레그래프의 `warn`은 큐를 표시하지 않고, B01~B03의 기본 차저 큐 동작은 그대로다.

명령:

```text
npm exec -- vitest run src/components/EnemyVisual.test.js src/lib/chefBossPhase.test.js
git diff --check
```

결과: 2개 테스트 파일, 32개 테스트 전체 통과. `git diff --check` 통과.

## 변경 파일

- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/EnemyVisual.test.js`
- `Developer/boss_skill_b04_charge_cue_implementation_2026-08-07.md`

## 남은 승인됐지만 차단된 간극

이 B04 공용 차저 큐 범위에서는 없음. 다른 보스 스킬 문서 항목은 이 단일 구현 범위에 포함하지 않았다.

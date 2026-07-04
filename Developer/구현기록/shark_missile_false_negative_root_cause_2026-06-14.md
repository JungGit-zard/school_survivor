# 상어미사일 구현 여부 오판 원인 조사 - 2026-06-14

## 결론

상어미사일은 실제로 구현되어 있었지만, 처음 조사 답변에서 현재 `school_survivor-integration` 워크트리만 기준으로 검색하고 이를 "코드베이스 전체"로 잘못 일반화해서 "없다"고 답했다.

정확한 상태는 다음과 같았다.

- `school_survivor-integration`: 당시 `main`/통합 워크트리에 `sharkMissile` 미등록.
- `school_survivor`: Codex 워크트리에 `sharkMissile` 구현 파일이 미커밋/untracked 상태로 존재.
- 따라서 "통합된 main에는 없다"가 맞는 표현이었고, "구현 자체가 없다"는 오답이었다.

## 핵심 원인

1. 검색 범위를 현재 워크트리로 제한했다.
   - 현재 작업 위치는 `D:\JungSil\2.Minigame_project\school_survivor-integration`였다.
   - 여기에는 당시 `sharkMissile`이 없었으므로 검색 결과가 비어 있었다.

2. 병렬 worktree 구조를 즉시 반영하지 않았다.
   - 프로젝트에는 세 워크트리가 있다.
     - `D:\JungSil\2.Minigame_project\school_survivor`
     - `D:\JungSil\2.Minigame_project\school_survivor-claude`
     - `D:\JungSil\2.Minigame_project\school_survivor-integration`
   - 상어미사일 WIP는 `school_survivor` Codex 워크트리에 있었다.

3. 과거 세션 요약/대화 기록에 이미 있던 단서를 먼저 대조하지 않았다.
   - 2026-06-12 기록에는 "codex 워크트리에 진행 중 미커밋 작업(상어 미사일 무기) 발견"이라고 명시되어 있었다.
   - 이 단서를 먼저 확인했으면 "없다"가 아니라 "codex 워크트리에 미통합 WIP로 있다"라고 답했어야 한다.

4. `guidedMissile`/보조배터리 미사일을 fallback으로 보고 잘못 연결했다.
   - `guidedMissile`은 별도 무기다.
   - `sharkMissile`은 `guidedMissile`의 리네임이 아니라 새 high-tier 무기다.

## 밝혀진 경과

### 1. 2026-06-12 17:53:47, 세션 line 1789

워크트리 상태 출력에서 Codex 워크트리에 상어미사일 관련 WIP가 드러났다.

- `Developer/r3f_prototype/src/components/Game.jsx`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_shark_missile.svg`

### 2. 2026-06-12 17:56:48, 세션 line 1820

이전 assistant가 다음 상태를 보고했다.

- `codex 워크트리에 진행 중 미커밋 작업(상어 미사일 무기) 발견`
- 해당 WIP는 건드리지 않았고, 완성 후 main 기준으로 합치면 된다고 설명.

### 3. 2026-06-14 12:14:41, 세션 line 2570

사용자 요청:

```text
상어미사일 구현여부 조사
```

### 4. 2026-06-14 12:17:48, 세션 line 2598

잘못된 1차 결론:

```text
상어미사일은 존재하지 않습니다.
```

오류 내용:

- 현재 `school_survivor-integration`만 검색했다.
- 다른 워크트리인 `school_survivor`의 미커밋 WIP를 검색하지 않았다.
- 그래서 `guidedMissile`만 보고 상어미사일 구현이 없다고 오판했다.

### 5. 2026-06-14 12:27:57, 세션 line 2616

사용자가 대화 기록 전체 조사를 요구한 뒤, Codex 워크트리에서 첫 단서가 확인됐다.

```text
codex 워크트리에 `14_wea_shark_missile.svg`가 있었습니다.
```

### 6. 2026-06-14 12:28:20, 세션 line 2623

Codex 워크트리의 실제 구현 파일 목록이 확인됐다.

- `D:/JungSil/2.Minigame_project/school_survivor/Developer/r3f_prototype/src/components/Weapons/SharkMissile.jsx`
- `D:/JungSil/2.Minigame_project/school_survivor/Developer/r3f_prototype/src/lib/sharkMissileTargeting.test.js`
- `D:/JungSil/2.Minigame_project/school_survivor/Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `D:/JungSil/2.Minigame_project/school_survivor/Developer/r3f_prototype/src/store/useGameStore.sharkMissileUnlock.test.js`
- `D:/JungSil/2.Minigame_project/school_survivor/Graphic_designer/graphic_asset/weapon_graphics/14_shark_missile/...`
- `D:/JungSil/2.Minigame_project/school_survivor/Planner/game_contents/weapons/shark_missile_unlock_plan_2026-06-11.md`
- `D:/JungSil/2.Minigame_project/school_survivor/Quaility_Assurance/shark_missile_validation_2026-06-11.md`

### 7. 2026-06-14 12:28:25, 세션 line 2625

`weaponCatalog.js` 안에 실제 등록 항목이 확인됐다.

```js
sharkMissile: {
  id: 'sharkMissile',
  label: '상어미사일',
  base: {
    damage: 30,
    cooldown: 14000,
    range: 28,
    radius: 1.8,
    speed: 8.5,
    retargetIntervalMs: 300,
  },
  unlockConditions: [
    { type: 'stage1Clears', value: 1 },
    { type: 'totalRuns', value: 8 },
  ],
  minLevelToAppear: 8,
}
```

### 8. 2026-06-14 12:29:19, 세션 line 2642

정정 결론:

```text
Codex가 구현 완료했지만 미커밋·미통합 상태
```

### 9. 2026-06-14 12:40:05, 세션 line 2729

상어미사일과 치비코 경로 추적 작업이 커밋됐다.

```text
fbb39b0 feat(weapons): add sharkMissile + chibiko trail-follow (Codex 2026-06-14)
```

### 10. 2026-06-14 12:40:14, 세션 line 2731

커밋이 `origin/main`에 푸시됐다.

```text
9b30b18..fbb39b0 main -> main
```

## 현재 검증 결과

현재 `school_survivor-integration/main`에는 상어미사일 구현이 들어와 있다.

주요 경로:

- `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_shark_missile.svg`
- `Developer/r3f_prototype/src/components/Weapons/SharkMissile.jsx`
- `Developer/r3f_prototype/src/lib/sharkMissileTargeting.js`
- `Developer/r3f_prototype/src/lib/sharkMissileTargeting.test.js`
- `Developer/r3f_prototype/src/store/useGameStore.sharkMissileUnlock.test.js`
- `Graphic_designer/graphic_asset/weapon_graphics/14_shark_missile/`
- `Planner/game_contents/weapons/shark_missile_unlock_plan_2026-06-11.md`
- `Quaility_Assurance/weapons/shark_missile_validation_2026-06-11.md`

현재 통합 커밋:

```text
fbb39b0 feat(weapons): add sharkMissile + chibiko trail-follow (Codex 2026-06-14)
```

## 재발 방지 규칙

상어미사일 같은 "이미 했던 작업" 여부를 조사할 때는 다음 순서를 지킨다.

1. 현재 워크트리만 검색하지 않는다.
2. `git worktree list --porcelain`로 모든 워크트리를 먼저 확인한다.
3. 세 워크트리 전체에서 키워드를 검색한다.
   - `school_survivor`
   - `school_survivor-claude`
   - `school_survivor-integration`
4. 현재 git에 없는 작업도 찾기 위해 `git status --short --untracked-files=all`을 각 워크트리에서 확인한다.
5. 사용자가 "대화 기록", "메모리", "이전에 했다"라고 말하면 Claude/Codex 세션 JSONL까지 검색한다.
6. 답변 표현을 구분한다.
   - "현재 main에는 없음"
   - "다른 워크트리에 미커밋 WIP로 있음"
   - "구현 자체가 없음"

이번 오판은 6번 구분을 하지 못한 것이 핵심이다.

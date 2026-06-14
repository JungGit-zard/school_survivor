# 상어미사일 오판 검증 기록 - 2026-06-14

## 검증 목적

상어미사일 구현을 "없다"고 답한 원인이 실제 구현 부재가 아니라 검색 범위 오류였는지 재검증한다.

## 검증 대상

- 현재 통합 워크트리: `D:\JungSil\2.Minigame_project\school_survivor-integration`
- Codex 워크트리: `D:\JungSil\2.Minigame_project\school_survivor`
- Claude 워크트리: `D:\JungSil\2.Minigame_project\school_survivor-claude`
- 세션 로그: `C:\Users\admin\.claude\projects\d--JungSil-2-Minigame-project-school-survivor-integration\bd2d6e55-6f6a-476c-a9c7-a4874c7799d9.jsonl`

## 실행한 확인

### 1. 워크트리 목록

```powershell
git worktree list --porcelain
```

확인 결과:

- `school_survivor` -> `codex-dev`
- `school_survivor-claude` -> `claude-dev`
- `school_survivor-integration` -> `main`

### 2. 현재 main의 상어미사일 파일 추적 여부

```powershell
git -C D:\JungSil\2.Minigame_project\school_survivor-integration ls-files |
  rg "sharkMissile|SharkMissile|shark_missile|14_wea_shark"
```

확인된 파일:

- `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_shark_missile.svg`
- `Developer/r3f_prototype/src/components/Weapons/SharkMissile.jsx`
- `Developer/r3f_prototype/src/lib/sharkMissileTargeting.js`
- `Developer/r3f_prototype/src/lib/sharkMissileTargeting.test.js`
- `Developer/r3f_prototype/src/store/useGameStore.sharkMissileUnlock.test.js`
- `Developer/구현기록/게임기획밸런스구현코드연결/shark_missile_implementation_2026-06-11.md`
- `Developer/구현기록/게임기획밸런스구현코드연결/shark_missile_integration_2026-06-14.md`
- `Graphic_designer/graphic_asset/weapon_graphics/14_shark_missile/...`
- `Planner/game_contents/weapons/shark_missile_runtime_integration_2026-06-14.md`
- `Planner/game_contents/weapons/shark_missile_unlock_plan_2026-06-11.md`
- `Quaility_Assurance/shark_missile_integration_validation_2026-06-14.md`
- `Quaility_Assurance/shark_missile_validation_2026-06-11.md`

결론: 현재 main에는 상어미사일이 존재한다.

### 3. 통합 커밋 확인

```powershell
git show --stat --oneline --name-only fbb39b0
```

확인된 커밋:

```text
fbb39b0 feat(weapons): add sharkMissile + chibiko trail-follow (Codex 2026-06-14)
```

이 커밋에 상어미사일 런타임, 테스트, 아이콘, 그래픽 자료, 기획/QA 문서가 포함되어 있다.

### 4. Codex 워크트리 잔존 WIP 확인

```powershell
git -C D:\JungSil\2.Minigame_project\school_survivor status --short --branch --untracked-files=all
```

확인 결과:

- `codex-dev` 워크트리에 상어미사일 관련 untracked 파일이 여전히 남아 있다.
- 이는 원래 "있었는데 미통합" 상태였던 WIP의 잔존물이다.
- 현재 main에는 이미 `fbb39b0`으로 통합되어 있으므로, 이 잔존물은 "현재 main에 없는 증거"가 아니라 "과거 WIP가 다른 워크트리에 있었다"는 증거다.

### 5. 세션 로그 확인

세션 JSONL에서 확인한 핵심 line:

- line 1789: Codex 워크트리에 상어미사일 관련 변경과 `14_wea_shark_missile.svg`가 있음.
- line 1820: "codex 워크트리에 진행 중 미커밋 작업(상어 미사일 무기) 발견" 보고.
- line 2570: 사용자가 "상어미사일 구현여부 조사" 요청.
- line 2598: 잘못된 답변 "상어미사일은 존재하지 않습니다."
- line 2623: `D:/JungSil/2.Minigame_project/school_survivor/.../SharkMissile.jsx` 등 실제 구현 경로 확인.
- line 2625: `weaponCatalog.js`의 `sharkMissile` 등록 항목 확인.
- line 2729: `fbb39b0` 커밋 생성.
- line 2731: `origin/main` push 확인.

## 판정

오판 원인은 구현 부재가 아니다.

정확한 원인은 다음이다.

```text
현재 integration 워크트리만 검색한 결과를 전체 프로젝트/전체 세션 상태로 잘못 일반화했다.
```

따라서 첫 답변은 이렇게 나갔어야 한다.

```text
현재 integration/main에는 없습니다.
하지만 과거 기록상 codex 워크트리에 상어미사일 WIP가 있었을 가능성이 있으니 다른 워크트리와 세션 로그까지 확인하겠습니다.
```

## 현재 조치 상태

- 상어미사일 구현은 `fbb39b0` 이후 main에 통합됨.
- 추가 통합/검증 기록은 `f5e5233`에 반영됨.
- 현재 이 검증 문서와 원인 분석 문서는 새로 작성된 미커밋 변경이다.

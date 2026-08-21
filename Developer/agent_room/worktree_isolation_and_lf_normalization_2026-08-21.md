# 사고 2건 해결 — 전용 워크트리 분리 + 저장소 LF 정규화 (2026-08-21)

담당: Claude (Opus 5). 사용자 지시 "사고 2건 해결해" / "자꾸 사고생기면 니 워크트리 하나 파" /
"니 작업분은 무조건 다 보존되게 만들어" / "푸시는 같은 지점에 순차적으로 하고" / "워크트리 정보 남기고".

게임 로직·밸런스·비주얼은 하나도 건드리지 않았다. 저장소 배선과 줄바꿈만 다룬다.

---

## 사고 1 — 다른 에이전트 커밋이 내 작업분을 삼켰다

`e2975e8 "fix: harden release login and spawn balance"`에 Claude가 작업중이던 `Enemy.jsx`
수정분이 통째로 실려 들어갔다. 내용 손실은 없었지만 커밋 귀속이 어긋났다.

원인은 규칙 위반이 아니라 **구조**다. 두 에이전트가 `school_survivor-integration/` 하나를
공유하면 인덱스도 작업 트리도 하나다. 누구든 pathspec 없이 `git add -A` / `git commit -a`를
하면 남의 작업중 파일이 자동으로 딸려 들어간다. "pathspec 쓰자"는 규칙은 강제력이 없다.

### 해결 — 워크트리 물리 분리

```
D:/JungSil/2.Minigame_project/zombie_claude        claude-dev   → origin/zombie_only   (Claude 전용)
D:/JungSil/2.Minigame_project/school_survivor-integration  zombie_only → origin/zombie_only   (codex 전용)
```

- `git worktree add`로 재생성(이전 `zombie_claude/`는 사라져 있었고 worktree 목록에도 없었다).
- `claude-dev` upstream을 `origin/zombie_only`로 재지정. CLAUDE.md 표가 가리키던
  `feature/stage2-corridor-floor-graphics`는 이미 죽은 트렁크였다.
- `push.default = upstream` (저장소 로컬). `git push` 한 번이 `claude-dev:zombie_only`로 간다.
  공유 트리는 브랜치명이 같아 동작이 그대로다.
- 푸시는 항상 **fetch → rebase → push** 순서. 트렁크 하나에 순차로만 쌓고 force push는 없다.
- `node_modules`는 공유 트리로 junction. 디스크 중복 없음.

워크트리는 인덱스와 작업 트리가 분리된다 — 이제 남이 `commit -a`를 해도 내 파일에 닿지 못한다.
규칙에 기대지 않고 구조로 막았다.

**즉시 효과 실측:** 정규화 커밋 직후 공유 트리에서 `git pull --ff-only`를 시도하니 그쪽 작업중
파일 26개 때문에 정상 중단됐다. 예전이라면 여기서 남의 파일을 밟았을 자리다. 그대로 두고 나왔다.

---

## 사고 2 — 한 줄 고치면 diff가 파일 전체로 부풀었다

`CompassBlade.jsx` 첫 커밋이 181줄 변경으로 잡혔다. 실제 변경은 17줄이었다.

### 진짜 원인

`core.autocrlf=true`(시스템 전역)만 믿고 있었는데, 추적 텍스트 1824개 중 **512개** blob에
CR이 이미 박혀 있었다. 에이전트마다 설정이 달라 같은 파일이 CRLF로도 LF로도 커밋된 결과다.
그래서 blob이 CRLF인 파일을 LF로 쓰는 도구가 한 줄만 고쳐도 전 줄이 바뀐 것으로 잡혔다.

앞서 두 번은 `difflib.SequenceMatcher`로 변경 없는 줄의 원래 줄끝을 바이트 단위로 되살려
넘겼다. **증상 처리였다** — 다음 파일에서 그대로 재발했다.

### 해결 — .gitattributes로 못박고 한 번 정규화

```
* text=auto eol=lf
```

바이너리(png/mp3/m4a/glb/aab/keystore 등)는 `binary`로 명시 제외했다.

- 작업 트리도 blob도 LF 하나로 고정된다. 개인 `core.autocrlf` 설정과 무관하다.
- `git add --renormalize .`로 기존 저장분까지 한 번에 맞췄다. 720 파일.
- **안전 증명:** `git diff --cached -w --stat` 결과가 `.gitattributes` 1건뿐이었다.
  나머지 719개는 내용 변경 0, 줄바꿈만 바뀌었다는 뜻이다. 바이너리는 diff에 아예 안 잡혔다.
- 정규화는 **공유 트리가 아니라 새 워크트리에서** 돌렸다. 워크트리마다 인덱스가 따로라
  남의 작업중 파일을 쓸어 담을 수 없다 — 사고 1의 해결이 사고 2의 해결을 안전하게 만들었다.

---

## 검증

새 워크트리에서 실행:

```
npx vitest run --maxWorkers=1 --no-file-parallelism \
  src/lib/b03ShuttleRun.test.js src/lib/b04SoupBlast.test.js src/lib/bossPassiveItems.test.js \
  src/components/Weapons/CompassBlade.test.jsx src/lib/weaponCatalog.test.js
```

→ **5 files / 55 tests passed.** (처음 6개를 넘겼으나 `xpCurve.test.js`는 존재하지 않아 5개만 실행됐다.
정본 `src/lib/xpCurve.js`에 대응하는 테스트 파일이 없다 — 별건으로 남긴다.)

전체 스위트는 돌리지 않았다. 다른 에이전트의 작업중 변경 때문에 기존에도 실패가 있어
이 커밋의 영향을 분리할 수 없다.

---

## 남긴 것 / 후속

- 공유 트리는 아직 `8a6b6e5`에 머물러 있다. 그쪽 작업 26개를 커밋한 뒤 `git pull`을 해야
  LF 정규화가 반영된다. **codex 쪽 판단이라 강제하지 않았다.**
- `s.src)` — 깨진 셸 리다이렉트가 만든 95바이트 쓰레기 파일. 공유 트리에 그대로 있다.
- CLAUDE.md "Git Workflow" 절을 위 배선으로 갱신했다.

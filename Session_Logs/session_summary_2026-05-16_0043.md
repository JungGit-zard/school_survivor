# Session Summary — 2026-05-16 00:43 KST (Saturday)

> 이전 요약: `session_summary_2026-05-06_2030.md` (10일 전).
> 이번 요약은 그 사이의 누적 작업을 한 번에 정리한다.

## Git 상태

- 브랜치: `feature/codex-gameplay-iteration` (origin 대비 ahead 2)
- 최신 커밋: `b39d604` "require gstack for AI-assisted work"
- 직전 커밋: `84baf9b` "Re-plan Stage 1: rebalance weapons, enemies, spawn waves"
- 미커밋 변경: 다수 (외곽선/VFX 작업물 — `r3f_prototype/src/` 14개 파일 modified/untracked)

## 주요 작업 / 결정

### 1. 아이템↔효과 단일 레지스트리 (`itemEffects.js`)
- 신규: `Developer/r3f_prototype/src/lib/itemEffects.js`
- `ITEM_EFFECTS` 테이블 + `triggerItemVfx(itemId, hookName, payload)` + 양방향 조회(`getEffectByItem` / `getItemsByEffectType`) + `listItemIds()`
- 현재 등록: E05 / B01 (chargeWarningLine on `onWarn`)
- `Enemy.jsx`의 직접 `emitVfx(...)` 호출 → `triggerItemVfx(...)`로 마이그레이션
- 문서: `Planner/Tech_plan/effect_sloution.md` 신규 (8개 섹션)

### 2. 카툰 외곽선 — 외곽 silhouette만 (Stencil Layer)
- 근거: Delt06/toon-rp wiki "Inverted Hull Outline" §Stencil Layer
- `lib/toon.js`의 `toonMat`/`outlineMat`에 stencil ops 추가
  - toonMat: `stencilWrite=true`, `stencilFunc=Always`, `stencilZPass=Replace`, ref=1
  - outlineMat: `stencilWrite=true`(테스트 활성화), `stencilFunc=NotEqual`, `stencilZPass=Keep` (버퍼 변경 없음), ref=1
- ⚠ 버그 수정: 초기에 outlineMat을 `stencilWrite=false`로 설정 → three.js에선 이게 stencil 테스트 자체를 꺼버려 NotEqual 비교 미동작. `true` + `KeepStencilOp` 조합으로 해결.
- `App.jsx`에 `gl={{ stencil: true }}` 명시 (방어적)

### 3. 외곽선 굵기 글로벌 곱수 — `inflateScale`
- `lib/toon.js`에 `OUTLINE_THICKNESS_MULT = 2` 상수 + `inflateScale(s)` 헬퍼
- 모든 외곽선 메쉬의 scale을 `inflateScale(...)`로 래핑 → 굵기 2배
- 적용 파일: PlayerMesh / ZombieMesh (helper 내부) + Enemy / EnemyDeathCollapse / GoldCoin / XpTextbook / LunchItems / Weapons (인라인 래핑)
- 향후 굵기 변경은 상수 한 줄만 수정

### 4. gstack 설치 + 팀 모드 부트스트랩
- 글로벌: `~/.claude/skills/gstack/` (자동 업데이트, 1시간 throttled)
- 프로젝트 로컬:
  - `.claude/settings.json` — `PreToolUse` 훅 (Skill 호출 시 gstack 검증)
  - `.claude/hooks/check-gstack.sh` — gstack 미설치 시 Skill 차단
  - `CLAUDE.md` — gstack required 섹션 append (24줄)
- 커밋 `b39d604`로 force-add 후 commit (.gitignore에 `.claude/`가 있어 `-f` 필요)
- 사용 가능해진 스킬: `/qa`, `/ship`, `/review`, `/investigate`, `/browse`, `/canary` 등 23개

### 5. Bun 설치
- 설치: PowerShell `irm bun.sh/install.ps1 | iex`
- 위치: `C:\Users\admin\.bun\bin\bun.exe` (v1.3.14)
- 용도: gstack 빌드/스크립트 실행 의존성

### 6. PowerShell `$PROFILE` — `cs` 별칭
- 위치: `C:\Users\admin\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- 내용: `function cs { claude --dangerously-skip-permissions @args }`
- 새 PowerShell 창에서 `cs`로 권한 prompt skip 모드 실행

### 7. 프로젝트별 권한 prompt 자동 통과
- 신규: `.claude/settings.local.json`
- `permissions.defaultMode = "bypassPermissions"`
- `.gitignore`에 `.claude/`가 있어 자동 ignored (개인 설정, 팀 미공유)

### 8. 게임 실행 검증
- Vite dev: `npm run dev` (백그라운드, 포트 5173)
- 브라우저 자동 오픈 후 외곽선 변경 사항 시각 확인 → 플레이어 내부 seam 사라짐, 굵기 2배 적용 확인
- 백그라운드 작업 `blgzvdd95`는 이후 exit code 4로 실패 종료 (창 닫힘/HMR 누적/manual stop 추정 — 다음 세션에서 재검토)

## 생성 / 수정 파일

**생성**
- `Developer/r3f_prototype/src/lib/itemEffects.js`
- `Planner/Tech_plan/effect_sloution.md`
- `.claude/settings.json`, `.claude/hooks/check-gstack.sh`, `.claude/settings.local.json`
- `Session_Logs/session_summary_2026-05-16_0043.md` (this file)

**수정 — toon.js + outline scale 래핑**
- `Developer/r3f_prototype/src/lib/toon.js` (stencil + inflateScale 추가)
- `Developer/r3f_prototype/src/App.jsx` (`gl={{ stencil: true }}`)
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx` (triggerItemVfx + inflateScale)
- `Developer/r3f_prototype/src/components/EnemyDeathCollapse.jsx`
- `Developer/r3f_prototype/src/components/GoldCoin.jsx`
- `Developer/r3f_prototype/src/components/XpTextbook.jsx`
- `Developer/r3f_prototype/src/components/LunchItems.jsx`
- `Developer/r3f_prototype/src/components/Weapons.jsx` (12곳 outline scale 래핑)

**수정 — 외부**
- `CLAUDE.md` (gstack 섹션 append, 후속으로 세션 메모리 섹션 정리됨 — 이 세션 후반부)

**외부 글로벌 설치 (저장소 외)**
- Bun v1.3.14 → `%USERPROFILE%\.bun\`
- gstack → `%USERPROFILE%\.claude\skills\gstack\`
- WindowsPowerShell `$PROFILE` 신규

## 정책 / 룰 결정

- **카툰 외곽선 정책**: 모든 toonMat 사용 메쉬는 자동 stencil 작성, outlineMat은 자동 NotEqual 테스트. 다중 부품 모델의 내부 seam에 외곽선이 그려지지 않음 — 외곽 silhouette만 남는다. 헬퍼를 우회한 직접 머티리얼 생성 금지.
- **외곽선 굵기 변경 절차**: `lib/toon.js`의 `OUTLINE_THICKNESS_MULT` 상수 한 줄만 수정. 호출부 개별 수정 금지.
- **VFX 효과 wiring 정책**: 게임플레이 컴포넌트는 `triggerItemVfx(...)` 한 줄만 호출. 직접 `emitVfx`/팔레트 import 금지 (Enemy.jsx의 charge warn이 첫 사례 — 나머지 wiring은 점진 적용).
- **세션 메모리 정책**: 본 세션에서 단일 정본을 `SESSION_CONTINUITY.md`로 통합 (CLAUDE.md / AGENTS.md / project_develop_policy.md의 중복 섹션 제거).

## 검증 결과

- 외곽선 stencil + 굵기 2배: 브라우저 시각 확인 OK
- JSON 유효성: `.claude/settings.local.json` 파싱 OK
- gstack 훅: `git check-ignore` 로 `.claude/settings.local.json` ignored 확인
- Vite HMR: 변경 즉시 반영 확인됨 (이후 dev 서버는 다음 세션에서 재기동 필요)

## 미해결 / 다음 세션 인계

1. **Vite dev 서버 재기동 필요** — 백그라운드 작업 종료됨 (exit 4). `cd Developer/r3f_prototype && npm run dev`
2. **VFX wiring 미연결** (effect_sloution.md §9 placeholder):
   - 9개 무기의 `onHit` (Pencil/SchoolBag/Tumbler/Bell/Flask/Missile/Starlink/Onigiri/StunGun)
   - 5개 비-charger 적의 `onDeath`
   - 3개 드랍의 `onSpawn` (pickupPop wiring)
   - 글로벌 이벤트 `onLevelUp`, `onStageClear`
3. **백엔드 없음 — 추후 결정**: 리더보드/메타프로그레션/계정 필요 시점에 Supabase 또는 Cloudflare Workers + D1 검토
4. **dual_drop_system §3-3 boss bonus / §7 XP 보정** 일부 미적용 — 다음 세션에서 보스 처치 보상 검토
5. **타이틀/랜딩 화면 작업** (`Planner/title_landing_screen_plan_2026-05-10.md`, `Graphic_designer/title_landing_visual_plan_2026-05-10.md`) 착수 미진행

## 다음 세션 첫 행동

1. `SESSION_CONTINUITY.md` (정본) 읽기
2. 이 요약 파일 읽기
3. `Bang_Rules.md` 갱신 사항 확인
4. Vite dev 서버 재기동 → 변경사항 시각 검증

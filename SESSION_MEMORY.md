# Session Memory — Permanent Append-Only Log

> **이 파일은 BangBang Survivor 프로젝트의 영구 세션 메모리이다.**
> 세션 시작점은 `Entry 0 (Bootstrap)`으로 기록할 수 있다. 이후 3시간마다 요약 엔트리 1개가 끝에 append된다. 요약 엔트리 4개가 쌓이면(=12시간) 하나의 세션이 닫히고, 그 시점에 에이전트는 사용자에게 컨텍스트 초기화(`/clear`)를 권고한다.
> 규정 정본: [SESSION_CONTINUITY.md](SESSION_CONTINUITY.md)
> 레거시 아카이브: `Session_Logs/` (2026-05-16 이전의 분리된 요약 파일들)

---

## Session 1 · Entry 0 (Bootstrap) · 2026-05-16 00:45 KST

**규칙 전환 시점**

- 사용자가 새 세션 메모리 규칙을 정의: 영구 단일 문서(`SESSION_MEMORY.md`) + 3시간 누적 엔트리 + 9시간 사이클 마감 + 자동 초기화 권고.
- 본 파일이 이 규칙의 첫 인스턴스다. 향후 모든 3시간 요약은 이 파일 끝에 append.
- 기존 `Session_Logs/` 디렉토리(3개 파일)는 레거시로 보존, 신규 쓰기 없음.

**Git 상태**

- 브랜치: `feature/codex-gameplay-iteration` (origin 대비 ahead 2)
- 최신 커밋: `b39d604` "require gstack for AI-assisted work"
- 미커밋 변경: 다수 (외곽선/VFX/플래너 문서)

**활성 작업 흐름 (직전 10일간 누적 — Session_Logs/session_summary_2026-05-16_0043.md에 상세 기록됨)**

1. **VFX 인프라**: `lib/itemEffects.js` 신규 레지스트리 + `triggerItemVfx` 헬퍼. Enemy.jsx의 charge warn 이펙트가 첫 wiring 사례.
2. **카툰 외곽선 — 외곽 silhouette만**: Stencil Layer 기법 (Delt06 wiki). `toon.js`에 stencil ops, `App.jsx`에 `gl={{ stencil: true }}`. ⚠ `outlineMat.stencilWrite`는 테스트 enable 스위치임에 주의.
3. **외곽선 굵기 글로벌 곱수**: `OUTLINE_THICKNESS_MULT = 2` + `inflateScale()`. 모든 외곽선 mesh의 scale을 래핑. 8개 컴포넌트 파일 영향.
4. **gstack 팀 모드 설치**: 글로벌 `~/.claude/skills/gstack/`, 프로젝트 로컬 `.claude/settings.json` + 훅 (커밋 `b39d604`).
5. **개발 환경 정비**: Bun 1.3.14, PowerShell `cs` 별칭, `.claude/settings.local.json`에 `bypassPermissions`.

**규정 / 정책 결정**

- 세션 메모리 정본은 `SESSION_CONTINUITY.md` 단독, 본 파일은 그 규정에 따른 데이터 저장소.
- 카툰 외곽선은 `toonMat`/`outlineMat` 헬퍼 경유 강제 — 직접 머티리얼 생성 금지.
- 외곽선 굵기는 `OUTLINE_THICKNESS_MULT` 한 줄 수정.
- VFX 효과 wiring은 `triggerItemVfx` 한 줄 호출 — 직접 `emitVfx` 금지.

**미해결 / 다음 행동**

1. Vite dev 서버 재기동 필요 (`cd Developer/r3f_prototype && npm run dev`) — 이전 백그라운드 작업 exit 4.
2. VFX wiring 미연결: 9 무기 onHit, 5 적 onDeath, 3 드랍 onSpawn, 글로벌 onLevelUp/onStageClear.
3. dual_drop_system §3-3 보스 보너스 / §7 XP 보정 일부 미적용.
4. 타이틀/랜딩 화면 작업 착수 미진행 (`Planner/title_landing_screen_plan_2026-05-10.md`).
5. 백엔드 미결정 — 리더보드/메타프로그레션 필요 시점에 검토.

**다음 엔트리 예정**: Entry 1 — 2026-05-16 03:45 KST (이 시각 도달 시 또는 직후 사용자 활동 발생 시 작성)
**세션 1 마감 예정**: 2026-05-16 09:45 KST — 당시 9시간 규칙 기준 Entry 3 작성 후 `/clear` 권고

---

## Session 2 · Entry 0 (Bootstrap, 규정 갱신 이후) · 2026-05-16 23:50 KST

**규정 갱신 요약**

- 사용자가 세션 메모리 규칙의 실제 운영 마찰을 점검했고, 9시간 세션이 너무 짧고 `/clear` 권고 부담이 크다는 판단에 따라 12시간 v2 규칙으로 완화하기로 결정했다.
- 오늘 한 일 한 줄 요약: 세션 메모리 운영 규칙을 점검하고, 3시간 엔트리 유지 + 12시간 세션 종료 + Entry 4 종료 권고 방식으로 갱신했다.

**Git 상태**

- 브랜치: `feature/codex-gameplay-iteration`
- 최신 커밋: `0a0c863` "Add gameplay QA and compound engineering structure"
- `git status --short --branch` 요약: 다수의 기존 미커밋 변경이 있으며, 이번 규정 갱신 작업은 `SESSION_CONTINUITY.md`와 `SESSION_MEMORY.md`를 수정했다.

**생성 / 수정 파일**

- `SESSION_CONTINUITY.md`: LOCKED 표기를 `2026-05-16 v2`로 갱신하고, 세션 사이클을 9시간/Entry 3 종료에서 12시간/Entry 4 종료로 완화했다.
- `SESSION_MEMORY.md`: 상단 요약을 12시간 규칙에 맞게 갱신하고, 본 Bootstrap 엔트리를 append했다.

**명령 / 검증**

- `git status --short --branch`로 작업트리 상태를 확인했다.
- `git log -1 --pretty=format:"%h %s"`로 최신 커밋을 확인했다.
- `rg`로 기존 9시간/Entry 3 관련 문구 위치를 확인했다.

**확정된 룰 / 정책 변경**

- 세션 메모리 정본은 계속 `SESSION_CONTINUITY.md` 단독이다.
- 3시간마다 `SESSION_MEMORY.md`에 엔트리 1개를 append한다.
- 세션 시작점은 `Entry 0 (Bootstrap)`으로 기록하고, 3시간 누적 요약은 Entry 1부터 시작한다.
- 12시간이 1 세션이며, Entry 4 작성 직후 세션 종료와 `/clear` 권고를 수행한다.
- 새 에이전트는 `SESSION_MEMORY.md`의 가장 최근 엔트리 1개만 자동으로 읽는다.

**미해결 / 다음 행동**

- 다음 에이전트는 `SESSION_CONTINUITY.md`의 12시간 v2 규칙과 이 엔트리를 기준으로 이어가면 된다.
- 기존 Session 1 엔트리의 9시간 언급은 당시 규칙의 역사 기록이므로 삭제하지 않는다.

**다음 엔트리 예정**: Session 2 · Entry 1 — 2026-05-17 02:50 KST 전후
**세션 2 마감 예정**: 2026-05-17 11:50 KST — Entry 4 작성 후 `/clear` 권고

---

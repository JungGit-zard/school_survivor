## Session 7 · Entry 3 · 2026-07-29 0015 KST

### Git 상태

- 브랜치: `zombie_only`, HEAD `11e0b01b78af883a0a9882f204e26af15f342e54`.
- Graphics Studio 웃는 좀비 관련 코드와 `SESSION_MEMORY.md`는 미커밋 상태다.
- Firebase/Auth/Consent/Lobby/출시노트 관련 별도 사용자·에이전트 변경은 보존했고 수정하지 않았다.

### 이번 3시간 작업 / 대화

- 사용자는 셰이더로 좀비 얼굴을 직접 그린 방식을 다른 에이전트도 재사용할 수 있도록 핸드오프 문서 작성을 요청했다.
- `handoff` 스킬 규칙에 따라 workspace가 아닌 Windows 임시 폴더에 문서를 작성했다.
- 문서는 단일 shader plane, UV 기반 `softCircle`/`softLine`, feature-only alpha, 웃는 입 좌표, `uTime` 애니메이션, Studio catalog/preview 연결, Firebase-only 경계, 절대 금지사항과 재사용 검증 절차를 설명한다.
- 구현 코드를 장문 복제하지 않고 실제 소스 경로와 심볼을 참조하도록 구성했다.

### 생성 / 수정 파일

- workspace 밖 생성: `C:/Users/admin/AppData/Local/Temp/escape_zombie_school_procedural_face_shader_handoff_2026-07-29.md` — 다른 에이전트용 procedural face shader 재사용 핸드오프.
- workspace 코드 변경 없음.
- 세션 규정에 따라 `SESSION_MEMORY.md`에 이번 엔트리를 추가했다.

### 명령 로그

```text
Get-Content -Raw C:/Users/admin/.agents/skills/handoff/SKILL.md
$env:TEMP; git status --short --branch
Get-Content -Raw -Encoding utf8 C:/Users/admin/AppData/Local/Temp/escape_zombie_school_procedural_face_shader_handoff_2026-07-29.md
Get-Item <handoff path> | Select-Object FullName,Length,LastWriteTime
rg -n '^## (1|2|3|4|5|6|7|8|9|10|11|12|13)\.' <handoff path>
rg -n '(api[_-]?key|password|oauth token|id token|refresh token|@gmail\.com|@naver\.com)' <handoff path>
Get-Date -Format 'yyyy-MM-dd HHmm'
git status --short --branch
```

### 검증 결과

- 핸드오프 파일 크기: 10,901 bytes.
- 필수 13개 섹션 모두 확인.
- Suggested skills 섹션 확인.
- 민감정보 패턴 미검출.
- workspace Git 상태에는 핸드오프 파일 생성으로 인한 새 변경이 없다.
- Firebase 데이터 접근·변경·Apply 없음.

### 확정된 룰 / 정책 변경

- 새 프로젝트 정책 변경 없음.
- 이 핸드오프는 기존 프로젝트 정책과 구현을 설명하는 재사용 문서이며 새로운 정본을 만들지 않는다.

### 미해결 이슈 + 다음 단계

- `threemini` 카드 `t_3677b5e8`은 Hermes OAuth HTTP 401로 blocked 상태다.
- 핸드오프 파일은 임시 폴더에 있으므로 장기 보존이 필요하면 사용자가 별도로 workspace 영구 문서화를 지시해야 한다.
- 관련 코드와 문서는 아직 커밋하지 않았다.

---

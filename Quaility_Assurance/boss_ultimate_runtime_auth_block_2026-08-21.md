# B02/B03/B04 보스 필살기·퀘스트 가방 런타임 시도 기록

- 작성: Balance_QA_Mini (`balanceqa`)
- 날짜: 2026-08-21
- Kanban: `t_f499336c` — Boss ultimate runtime verification
- 범위: B02/B03/B04 필살기와 보스 패시브 퀘스트 가방의 실제 브라우저 런타임 진입 시도.
- 원칙: 읽기 전용. OAuth/Firebase/localStorage/Graphics Studio/title/source/server 변경 금지. 인증 팝업에서 중단.

## 결론

**런타임 검증 BLOCKED / NO CLAIM.**

`http://localhost:5173/` 타이틀에서 `게임 시작`을 눌렀을 때 Google 인증 화면으로 이동하거나 로그인 대기 상태가 되어, 지시대로 인증 팝업에서 중단했다. 따라서 이번 실행으로 B02/B03/B04 전투 필살기, 실제 Stage 2~4 전투 화면, 보스 처치 후 퀘스트 가방 슬롯 표시를 검증 완료로 주장하지 않는다.

## 사전 게이트

- Mandatory pre-command checker: 통과.
- `matched_domains`: `gameplay`
- `match_evidence`: `boss`
- `resolved_domains`: `common`, `gameplay`, `qa`
- `combined_receipt_sha256`: `36a7d0ef9bc512f32eed56dbfb675f1cb9354e95d2cfbb1e450231b16a2b0175`
- 필독 문서: checker가 반환한 `READ_REQUIRED` 전부 읽음. `SESSION_MEMORY.md`는 규정대로 최신 단일 엔트리만 읽음.
- gstack gate: `GSTACK_OK`.

## 실행한 명령

저장소 루트 또는 `Developer/r3f_prototype`에서 아래 명령을 실행했다.

```text
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'boss ultimate runtime read-only verification B02 B03 B04 quest bag'
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch
npm run browser:reserve
ss -ltn 2>/dev/null | grep ':5173' || netstat -ano 2>/dev/null | grep ':5173' || true
node -e "const { chromium } = require('@playwright/test'); (async()=>{ const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}}); await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1500); await page.screenshot({path:'../../Quaility_Assurance/evidence_boss_runtime_title_before_start_2026-08-21.png', fullPage:true}); await page.getByRole('button',{name:/게임 시작/}).click(); await page.waitForTimeout(2500); await page.screenshot({path:'../../Quaility_Assurance/evidence_boss_runtime_auth_popup_2026-08-21.png', fullPage:true}); console.log(JSON.stringify({title:await page.title(), url:page.url(), text:(await page.locator('body').innerText()).slice(0,300)})); await browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });"
node -e "const { chromium } = require('@playwright/test'); (async()=>{ const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}}); await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1500); const popupPromise=page.waitForEvent('popup',{timeout:5000}).catch(()=>null); await page.getByRole('button',{name:/게임 시작/}).click(); const popup=await popupPromise; await page.waitForTimeout(2000); let result={mainTitle:await page.title(), mainUrl:page.url(), popup:false}; if(popup){ await popup.waitForLoadState('domcontentloaded',{timeout:10000}).catch(()=>{}); await popup.screenshot({path:'../../Quaility_Assurance/evidence_boss_runtime_google_auth_popup_2026-08-21.png', fullPage:true}); result.popup=true; result.popupTitle=await popup.title(); result.popupUrl=popup.url(); result.popupText=(await popup.locator('body').innerText().catch(e=>'')).slice(0,300); } await page.screenshot({path:'../../Quaility_Assurance/evidence_boss_runtime_main_after_start_2026-08-21.png', fullPage:true}); console.log(JSON.stringify(result)); await browser.close(); })().catch(e=>{ console.error(e); process.exit(1); });"
python - <<'PY'
from pathlib import Path
for p in ['Quaility_Assurance/evidence_boss_runtime_title_before_start_2026-08-21.png','Quaility_Assurance/evidence_boss_runtime_auth_popup_2026-08-21.png','Quaility_Assurance/evidence_boss_runtime_main_after_start_2026-08-21.png','Quaility_Assurance/evidence_boss_runtime_google_auth_popup_2026-08-21.png']:
    path=Path(p)
    print(f'{p}: exists={path.exists()} size={path.stat().st_size if path.exists() else None}')
PY
```

## 브라우저 수동 도구 실행

```text
browser_navigate: http://localhost:5173/
browser_vision: 타이틀 화면 확인 — 좌상단 Google 로그인 카드와 `게임 시작` 버튼 표시.
browser_click: `게임 시작`
browser_snapshot: Google 계정 로그인 화면 표시.
browser_console expression: location/title/bodyText 수집.
```

수집 결과 요약:

```json
{
  "url": "https://accounts.google.com/v3/signin/identifier?...",
  "title": "로그인 - Google 계정",
  "bodyText_prefix": "Google 계정으로 로그인\n로그인\n\nescape-zombie-school.firebaseapp.com(으)로 이동\n\n이메일 또는 휴대전화..."
}
```

## 스크린샷 증거

- `Quaility_Assurance/evidence_boss_runtime_title_before_start_2026-08-21.png` — 5,371 bytes. 타이틀 진입 전 상태.
- `Quaility_Assurance/evidence_boss_runtime_auth_popup_2026-08-21.png` — 300,696 bytes. `게임 시작` 뒤 Google 로그인 중/대기 상태.
- `Quaility_Assurance/evidence_boss_runtime_main_after_start_2026-08-21.png` — 302,171 bytes. 팝업 감지 재시도 뒤 메인 페이지 상태.
- 브라우저 수동 도구에서는 `게임 시작` 뒤 실제 `accounts.google.com` 로그인 화면까지 이동함을 확인했다. 해당 도구의 스크린샷 파일 경로는 제공되지 않았으나, `browser_snapshot`과 `browser_console`에 Google 계정 로그인 문구와 URL이 남았다.

## 관측

- `localhost:5173`은 이미 LISTEN 상태였다. 금지 주소인 `127.0.0.1` 또는 `172.22.41.219`로 접속하지 않았다.
- 타이틀 화면에는 좌상단 `Google 로그인` 카드와 `게임 시작` 버튼이 보였다.
- `게임 시작` 클릭 후 실제 게임 전투 화면으로 진입하지 못했다.
- 브라우저 수동 도구에서는 Google 계정 로그인 페이지(`accounts.google.com`, title `로그인 - Google 계정`)로 이동했다.
- Headless Playwright 재현에서는 같은 탭 팝업 이벤트가 잡히지 않았고, 메인 화면에 `Google 로그인 중`/`로그인 중...` 상태가 남았다. 이것도 실제 플레이 진입 실패로 판정한다.

## 차단 사항

- **BLOCKER:** Google 인증/로그인 화면. 작업 지시가 `Stop on auth popup; no OAuth/Firebase/localStorage/Studio/title/server changes`였으므로 여기서 중단했다.
- 인증을 진행하지 않았으므로 B02/B03/B04 전투, 보스 처치, 패시브 해금, 퀘스트 가방 slot 1~4 실제 런타임 표시는 미검증이다.

## 변경하지 않은 것

- OAuth 로그인 입력/승인: 하지 않음.
- Firebase 데이터 읽기/쓰기 의도 조작: 하지 않음.
- `localStorage` 조작/우회: 하지 않음.
- Graphics Studio, title source, dev server 실행/종료/재시작, source code: 변경하지 않음.
- 테스트용 stage unlock, admin override, Firebase seed, Studio state 변경: 하지 않음.

## 판정

- B02 런타임 필살기: **미검증 / NO CLAIM**
- B03 런타임 필살기: **미검증 / NO CLAIM**
- B04 런타임 필살기: **미검증 / NO CLAIM**
- B01~B04 퀘스트 가방 실제 런타임 표시: **미검증 / NO CLAIM**
- 인증 차단 준수: **PASS** — 인증 화면에서 중단했고 우회하지 않았다.

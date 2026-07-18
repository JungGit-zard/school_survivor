# 타이틀 소형 시각 오브젝트 삭제 재발방지 QA 게이트

작성일: 2026-07-17
담당: Balance QA Mini
대상: Escape! zombie school / 타이틀 화면 / 작은 시각 오브젝트 1~2개 삭제 요청
필수 사건 기준: `dd471b420d1fdcdb1a7276c9728bf758c08fffd7` (`Fix title scene and add CDP inspector`)

## 0. 이 문서의 판정 범위

이 문서는 실제 런타임 코드를 수정하지 않고, 앞으로 “타이틀 화면의 작은 물체 1~2개만 지워 달라”는 요청이 들어왔을 때 타이틀 장면 전체가 붕괴하지 않도록 막는 하드 QA 게이트를 정의한다.

이 문서가 PASS를 선언하는 대상은 “게이트 절차의 설계”뿐이다. 현재 타이틀 화면의 시각 상태, AAB/WebView 상태, `dd471b4` 결과물 자체는 이 문서만으로 검증 완료로 취급하지 않는다.

## 1. 읽은 기준 문서와 확인한 사실

### 필수/관련 문서

- `AGENTS.md`
  - QA 기록은 `Quaility_Assurance/`에 둔다.
  - 변경 전 기존 파일과 구조를 확인하고, 의미 있는 변경 뒤 `git status`를 확인한다.
  - 커밋은 사용자가 요청하지 않는 한 하지 않는다.
- `project_develop_policy.md`
  - QA 계획, 검증 결과, 버그 위험, 리뷰 기록은 반드시 `Quaility_Assurance/`에 기록한다.
  - 검증하지 않은 기능을 검증 완료로 기록하면 안 된다.
  - Graphics Studio Apply 값과 런타임 타이틀/게임 시각 결과는 검증 없이 기본값 또는 과거값으로 덮으면 안 된다.
- `Bang_Rules.md`
  - 이번 작업은 게임 수치 변경이 아니지만, 맵/카메라/스테이지 규칙을 건드리는 변경은 별도 논의 없이 허용하지 않는다는 범위 제한 원칙을 재확인했다.
- `Developer/화면의_검정색_사각_두개를_지우기_위해서_1시간_이상을_까쳐먹은_개_좆같은_일_2026-07-17.md`
  - 사용자가 요청한 것은 타이틀 화면의 검은 사각형 조명 장식 두 개 삭제였으나, 진행 중 타이틀 화면의 여러 요소가 함께 변경되어 붕괴 피해가 발생했다.
  - 실제 원인은 `TitleScene3D.jsx`의 `ToonBox` 배치 두 줄과 사용되지 않는 전용 컴포넌트였다.
  - `dd471b4`는 단순 두 오브젝트 삭제 커밋이 아니라 원거리 배경 모델, 벽, 클럽 조명 하우징/렌즈, 검사 도구까지 함께 포함했다.
- `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`
  - Studio/타이틀/실제 게임 시각 상태는 독립 검증해야 한다.
  - Vite/dev-server 화면만으로 AAB/WebView 시각 패리티를 통과했다고 기록하면 안 된다.
- 기존 QA 기록 일부
  - `Quaility_Assurance/title_scene_gather_validation_2026-07-14.md`: 390x844 타이틀 최종 구도, 글자/좀비/3D 집결 레이어, 버튼 노출, 캔버스 폭 기록이 존재한다.
  - `Quaility_Assurance/title_character_outline_audit_chibiko_validation_2026-07-15.md`: 타이틀 캐릭터 외곽선, 390x844 실화면 검증 기록이 존재한다.

### 이번 QA 중 실제 실행한 확인 명령

프로젝트 루트: `D:/JungSil/2.Minigame_project/school_survivor-integration`

```bash
git status --short --branch
git rev-parse --show-toplevel
git show --stat --oneline --decorate --find-renames dd471b4
git show --name-only --format=fuller dd471b4
git diff --stat
git diff --name-only
git show --numstat --format='%H%n%s%n%ad' --date=iso-strict dd471b4
git show --shortstat --format='' dd471b4
git show --format='' --name-only dd471b4 | sed '/^$/d' | wc -l
git show --format='' --name-only dd471b4 | sed '/^$/d'
```

확인된 `dd471b4` 변경량:

```text
Developer/r3f_prototype/index.html                                  1 insertions, 0 deletions
Developer/r3f_prototype/src/components/TitleScene3D.jsx            44 insertions, 82 deletions
Developer/r3f_prototype/src/components/TitleScene3D.test.jsx        67 insertions, 27 deletions
Developer/r3f_prototype/src/debug/screenElementInspector.js        237 insertions, 0 deletions
합계: 4 files changed, 349 insertions(+), 109 deletions(-)
```

현재 작업트리는 이미 여러 미커밋 변경과 미추적 파일을 포함한다. 이 QA 게이트 문서 외의 기존 변경은 보존 대상이며, 본 작업에서 리셋/커밋/푸시하지 않는다.

## 2. `dd471b4` 리스크 판정

`dd471b4`는 “검은 사각형 두 개 삭제”라는 작은 요청 기준으로 하드 게이트 FAIL 사례다.

### FAIL 근거

1. 범위 초과
   - 요청 대상은 `TitleScene3D.jsx` 안의 작은 장식 두 개였으나, `index.html`과 신규 `src/debug/screenElementInspector.js`까지 포함됐다.
   - 진단 도구가 전역 HTML에 모듈로 연결되어 프로덕션 빌드 경로에 들어갈 수 있는 구조가 됐다.
2. 변경량 초과
   - 4개 파일, 349 삽입, 109 삭제는 “두 오브젝트 삭제” 범위를 벗어난다.
   - 특히 237줄 신규 검사 도구는 삭제 작업의 결과물로 묶으면 안 된다.
3. 시각 구성 파괴 가능성
   - `TitleFarBackgroundStory`, `StarlinkSatelliteModel`, `ZomlonbiskModel`, 좌우 벽, 클럽 조명 하우징/렌즈가 같은 흐름에서 변경됐다.
   - 이 요소들은 사용자가 지정한 두 검은 사각형과 동일 대상이라고 입증되지 않았다.
4. 테스트의 오염 위험
   - 테스트가 “기존 요소 보존”보다 “삭제된 광범위 요소가 돌아오지 않음”을 확인하는 방향으로 바뀌면, 잘못 삭제한 상태를 회귀 기준으로 고정할 수 있다.
5. 검증 주장 제한
   - 문서상 타이틀 집중 테스트와 빌드 통과 기록은 있으나, 사용자가 지적한 “타이틀 화면 전체 붕괴”에 대한 기준 스크린샷 비교, 보존 요소 체크리스트, 모바일 실화면 재검증이 충분히 묶이지 않았다.

## 3. 하드 게이트 요약

작은 시각 오브젝트 삭제 작업은 아래 6개 게이트를 모두 통과해야 한다. 하나라도 실패하면 즉시 STOP이며, 구현자는 더 진행하지 않고 QA/사용자 확인으로 되돌린다.

1. Scope Gate: 파일/라인/삽입량 제한
2. Object Identity Gate: 삭제 대상 1~2개를 3D 레이캐스트 또는 소스 후보 검색으로 정확히 특정
3. Preservation Gate: 타이틀의 기존 구성요소가 그대로 남아 있음을 소스와 스크린샷으로 확인
4. Test Gate: 집중 테스트, 전체 테스트, 빌드 통과
5. Screenshot Gate: 모바일 390x844와 데스크톱 기준 스크린샷을 비교하고, 삭제 대상 외 붕괴가 없음을 확인
6. Stop/Rollback Gate: 범위 초과·변경량 초과·사용자 반복 클릭·기준 불명확 시 중단

## 4. Scope Gate: diff-size와 파일 범위 체크

### 허용 범위

작은 오브젝트 1~2개 삭제 요청의 기본 허용 범위:

- 허용 파일
  - `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
  - `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`
  - `Quaility_Assurance/<해당 QA 기록>.md`
- 조건부 허용
  - Playwright/QA 전용 스크립트는 `Quaility_Assurance/` 아래에 두고 런타임 번들에 연결하지 않을 때만 허용한다.
- 금지
  - `Developer/r3f_prototype/index.html` 변경
  - `Developer/r3f_prototype/src/debug/` 신규 런타임 모듈 추가
  - `App.jsx`, Graphics Studio 저장/마이그레이션, 전역 toon material, boss/source seed, package 설정, Capacitor/Android 파일 변경

### 변경량 상한

기본 상한:

- 런타임 소스 변경 파일 수: 1개 이하
- 테스트 변경 파일 수: 1개 이하
- QA 문서 제외 전체 변경 파일 수: 2개 이하
- 런타임 소스 순변경량: 60줄 이하
- 신규 런타임/디버그 모듈: 0개
- 삽입량이 삭제량보다 크면 원인 설명과 리뷰 필요. 작은 삭제 작업에서는 기본 FAIL로 본다.

`dd471b4`는 이 기준에서 파일 수 4개, 신규 디버그 모듈 1개, 삽입 349줄로 FAIL이다.

### 실행 명령

변경 전 기준 브랜치/커밋을 `BASE`로 지정한다. 예: 직전 커밋이면 `BASE=HEAD~1`, 작업트리 검증이면 `BASE=HEAD`.

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration
BASE=HEAD~1

git diff --name-only "$BASE" -- > /tmp/title_delete_files.txt
git diff --numstat "$BASE" -- > /tmp/title_delete_numstat.txt
git diff --shortstat "$BASE" -- > /tmp/title_delete_shortstat.txt

cat /tmp/title_delete_files.txt
cat /tmp/title_delete_numstat.txt
cat /tmp/title_delete_shortstat.txt

# 런타임 금지 파일 변경 감지 시 FAIL
if grep -E '^(Developer/r3f_prototype/index.html|Developer/r3f_prototype/src/debug/|Developer/r3f_prototype/src/App.jsx|Developer/r3f_prototype/src/lib/graphicsStudio|Developer/r3f_prototype/android/|Developer/r3f_prototype/package(-lock)?\.json)' /tmp/title_delete_files.txt; then
  echo 'FAIL: small visual delete touched forbidden runtime/global files'
  exit 1
fi

# 허용 범위 밖 파일 감지 시 FAIL
if grep -Ev '^(Developer/r3f_prototype/src/components/TitleScene3D\.jsx|Developer/r3f_prototype/src/components/TitleScene3D\.test\.jsx|Quaility_Assurance/.*)$' /tmp/title_delete_files.txt; then
  echo 'FAIL: changed files outside small title-delete allowlist'
  exit 1
fi

# QA 문서 제외 파일 수 2개 초과 시 FAIL
NON_QA_COUNT=$(grep -Ev '^Quaility_Assurance/' /tmp/title_delete_files.txt | sed '/^$/d' | wc -l)
if [ "$NON_QA_COUNT" -gt 2 ]; then
  echo "FAIL: non-QA changed file count is $NON_QA_COUNT > 2"
  exit 1
fi
```

수동 PASS 기준:

- 위 명령 exit code 0.
- 변경 파일이 허용 목록 안에만 존재한다.
- 금지 파일 변경이 없다.
- `git diff --numstat`에서 런타임 소스 변경량이 60줄 이하이고, 삽입량이 삭제량보다 과도하게 크지 않다.

## 5. Object Identity Gate: 삭제 대상 특정

### 원칙

- 캔버스 내부 3D 시각 문제는 DOM 검사기로 시작하지 않는다.
- 먼저 소스 후보를 검색한다.
- 후보가 불명확하면 Three.js/R3F 레이캐스트로 클릭된 메시의 `geometry`, `material`, `color`, `world point`, `hierarchy`를 얻는다.
- 사용자가 같은 오브젝트를 두 번 이상 클릭하게 만드는 순간 STOP하고 진단 도구/접근을 재검토한다.

### 소스 후보 검색 명령

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype

grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=android/app/build \
  -E 'ToonBox|BoxGeometry|boxGeometry|0x050209|#050209|0x17131e|0x2d2738|club|housing|lens|position=\{\[-1\.45, 2\.72, -4\.25\]\}|position=\{\[1\.45, 2\.72, -4\.25\]\}' \
  src/components src/lib
```

PASS 기준:

- 삭제 대상 후보가 파일명, 컴포넌트명, 배치 좌표, 재질 색상까지 기록된다.
- 후보가 여러 개면 스크린샷 좌표 또는 레이캐스트 결과와 대조한 표를 QA 기록에 남긴다.

FAIL 기준:

- “검은색처럼 보임”만으로 주변 배경/벽/모델을 함께 삭제한다.
- 사용자 지정 오브젝트와 관계가 검증되지 않은 `Starlink`, `Zomlonbisk`, side wall, boss scale, title board, 캐릭터 seed를 같이 바꾼다.

### 레이캐스트 진단 조건

필요 시 임시 진단은 런타임 앱에 영구 연결하지 않고 다음 중 하나로 제한한다.

- 브라우저 DevTools 콘솔에서 일회성 스니펫 실행
- `Quaility_Assurance/` 아래의 QA 전용 Playwright/CDP 스크립트
- 코드 변경이 필요하면 별도 브랜치/패치로 만들고 최종 삭제 커밋에는 포함하지 않음

진단 도구가 `index.html`에 영구 script로 들어가면 이 게이트는 FAIL이다.

## 6. Preservation Gate: 보존 요소 체크

두 개의 작은 오브젝트 삭제가 PASS하려면 아래 요소가 삭제 전 기준과 동일하게 남아 있어야 한다. “동일”은 완전한 픽셀 동일이 아니라, 사용자 승인 구도와 역할이 보존된다는 뜻이다. 단, 대상 오브젝트 주변 외 대형 이동/삭제/스케일 변화는 FAIL이다.

### 반드시 보존할 타이틀 요소

- 타이틀 글자와 버튼
  - 게임 시작 버튼 노출
  - Google/설정/스테이지/상점 등 기존 UI가 요청 범위 밖에서 사라지지 않음
- 3D 주인공/동료
  - `TitlePlayer`
  - `TitleCompanions`
  - `ChibikoModel`
  - `CompassBladeModel`
- 적/추격 구성
  - `TitleZombie` 5개
  - `TitleBossZombie` 3개
  - `TitleMatildaPursuer` 1개
  - `DancingDoge` 2개
- 교실 소품/배경 효과
  - `TitleClassroomProps`
  - `SpeedStreak`
  - `WarningLight`
  - `ClubLightRig`의 빔과 동적 wash
- Studio/시각 정본 경계
  - `StudioTunedGroup itemId="title-scene"`
  - Graphics Studio player/source seed 관련 파일은 변경하지 않음

### 소스 보존 체크 명령

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype

node - <<'NODE'
const fs = require('fs')
const source = fs.readFileSync('src/components/TitleScene3D.jsx', 'utf8')
const required = [
  '<TitlePlayer />',
  '<TitleCompanions />',
  '<ChibikoModel attackPhaseRef={chibikoAttackPhaseRef} />',
  '<CompassBladeModel />',
  '<TitleMatildaPursuer',
  '<TitleClassroomProps />',
  '<SpeedStreak',
  '<WarningLight',
  '<ClubLightRig reducedEffects={reducedEffects} />',
  '<StudioTunedGroup itemId="title-scene">',
]
const counts = [
  ['TitleZombie', (source.match(/<TitleZombie\b/g) || []).length, 5],
  ['TitleBossZombie', (source.match(/<TitleBossZombie\b/g) || []).length, 3],
  ['DancingDoge', (source.match(/<DancingDoge\b/g) || []).length, 2],
]
const missing = required.filter((needle) => !source.includes(needle))
const wrongCounts = counts.filter(([, actual, expected]) => actual !== expected)
if (missing.length || wrongCounts.length) {
  console.error(JSON.stringify({ missing, wrongCounts }, null, 2))
  process.exit(1)
}
console.log('PASS: title preservation source markers are present')
NODE
```

PASS 기준:

- 명령 exit code 0.
- 삭제 대상 1~2개 외에 보존 요소 수량이 변하지 않는다.

FAIL 기준:

- 특정 보존 요소가 사라지거나 수량이 바뀐다.
- Title board, `TitleFarBackgroundStory`, side wall 등 요청 범위 밖 요소가 함께 바뀐다. 단, 사용자가 별도 지시한 변경은 별도 카드/별도 QA 게이트로 분리한다.

## 7. Test Gate: 자동 테스트와 빌드

### 필수 명령

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype

# 타이틀 집중 테스트
npx vitest run src/components/TitleScene3D.test.jsx src/components/TitleScreen.settings.test.jsx --maxWorkers=1 --no-file-parallelism

# 전체 테스트
npx vitest run --maxWorkers=1 --no-file-parallelism

# 프로덕션 빌드
npm run build
```

Windows에서 `npx`/`npm`이 Git Bash에서 shim 문제를 내면 다음 대체 명령을 사용한다.

```bash
npx.cmd vitest run src/components/TitleScene3D.test.jsx src/components/TitleScreen.settings.test.jsx --maxWorkers=1 --no-file-parallelism
npx.cmd vitest run --maxWorkers=1 --no-file-parallelism
npm.cmd run build
```

PASS 기준:

- 세 명령 모두 exit code 0.
- 기존 warning은 기록하되, 새 error 또는 새 failure가 있으면 FAIL.
- “타이틀과 직접 관계없는 기존 실패”라고 주장하려면 실패 파일/테스트명/기존 재현 근거를 QA 기록에 따로 남긴다.

FAIL 기준:

- 집중 테스트 실패.
- 전체 테스트 실패를 근거 없이 무시.
- 빌드 실패.
- 테스트 기대값을 “삭제된 광범위 요소가 없어야 함”으로 바꿔 잘못된 삭제 상태를 고정.

## 8. Screenshot Gate: 실제 화면 증거

### 최소 화면 조합

- 모바일: 390x844
- 데스크톱 또는 넓은 브라우저: 1440x900 또는 기존 QA 기준과 같은 크기
- reduced effects on/off 중 적어도 하나는 기존 QA와 같은 조건으로 맞춘다. 다른 조건을 쓰면 이유를 기록한다.

### 실행 예시

아래 명령은 Playwright가 설치되어 있고 Vite dev server가 정상 실행될 때의 기준이다. 실행 결과 스크린샷 파일 경로와 콘솔 오류를 QA 기록에 남긴다.

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm run dev -- --host 127.0.0.1 --port 5173
```

별도 터미널:

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
node - <<'NODE'
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const outDir = path.resolve('../../Quaility_Assurance/screenshots')
fs.mkdirSync(outDir, { recursive: true })
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const cases = [
    { name: 'mobile-390x844', viewport: { width: 390, height: 844 } },
    { name: 'desktop-1440x900', viewport: { width: 1440, height: 900 } },
  ]
  for (const c of cases) {
    const page = await browser.newPage({ viewport: c.viewport })
    const errors = []
    page.on('pageerror', e => errors.push(String(e)))
    page.on('console', msg => {
      if (['error', 'warning'].includes(msg.type())) errors.push(`[${msg.type()}] ${msg.text()}`)
    })
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3500)
    const file = path.join(outDir, `title-small-delete-${c.name}-2026-07-17.png`)
    await page.screenshot({ path: file, fullPage: false })
    console.log(JSON.stringify({ case: c.name, file, errors }, null, 2))
    await page.close()
  }
  await browser.close()
})().catch((error) => { console.error(error); process.exit(1) })
NODE
```

PASS 기준:

- 스크린샷 2장이 생성된다.
- 콘솔 `error`/새 경고 0건. Vite HMR/known warning은 구분해 기록한다.
- 지정된 삭제 대상 두 개만 사라졌고, 주인공/동료/좀비/보스/마틸다/도지/교실 소품/타이틀 UI/버튼이 보존된다.
- 모바일 390x844에서 타이틀 텍스트, 시작 버튼, 주요 3D 캐릭터가 화면 밖으로 밀리지 않는다.

FAIL 기준:

- 타이틀의 전체 구도, 주요 캐릭터, 버튼, 배경 스토리 요소가 요청 없이 사라진다.
- 특정 대상 삭제 외에 대형 스케일/위치 변화가 보인다.
- 스크린샷 없이 PASS를 기록한다.
- Vite/dev-server 화면만 보고 AAB/WebView 패리티까지 통과했다고 말한다.

## 9. Regression Lock: 잘못된 삭제를 테스트로 고정하지 않는 법

작은 삭제 작업의 테스트는 다음 두 범주를 분리해야 한다.

### 허용되는 테스트

- 삭제 대상의 식별 가능한 컴포넌트/좌표/색상만 재등장하지 않음을 확인한다.
- 보존 대상의 marker/count가 유지되는지 확인한다.
- 진단 도구가 최종 런타임 번들에 영구 연결되지 않았는지 확인한다.

### 금지되는 테스트

- “사용자가 요청하지 않은 주변 요소도 없어야 한다”를 새 정답으로 만드는 테스트.
- `Starlink`, `Zomlonbisk`, side wall 등 별도 검토가 필요한 요소를 한 삭제 테스트에 묶어 제거 상태를 고정하는 테스트.
- 화면 붕괴 후 상태를 기준 스크린샷으로 덮어쓰는 테스트.

### 권장 테스트 구조

```jsx
it('removes only the two requested clicked exit-light ToonBox placements', () => {
  const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
  expect(source).not.toContain('position={[-1.45, 2.72, -4.25]}')
  expect(source).not.toContain('position={[1.45, 2.72, -4.25]}')
  expect(source).not.toContain('function ToonBox')
})

it('preserves unrelated title-scene composition markers', () => {
  const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
  expect(source.match(/<TitleZombie\b/g)).toHaveLength(5)
  expect(source.match(/<TitleBossZombie\b/g)).toHaveLength(3)
  expect(source.match(/<DancingDoge\b/g)).toHaveLength(2)
  expect(source).toContain('<TitleClassroomProps />')
  expect(source).toContain('<ClubLightRig reducedEffects={reducedEffects} />')
  expect(source).toContain('<StudioTunedGroup itemId="title-scene">')
})
```

## 10. Stop / Rollback 조건

아래 조건 중 하나라도 발생하면 즉시 STOP한다.

1. 변경 파일이 허용 목록을 벗어난다.
2. 런타임 소스 변경량이 60줄을 넘는다.
3. 신규 debug/inspector/runtime helper를 `index.html` 또는 앱 엔트리에 연결해야 할 것 같다.
4. 사용자가 같은 물체를 두 번 이상 클릭해야 한다.
5. 삭제 대상의 좌표/색상/컴포넌트 식별이 불명확하다.
6. 보존 요소가 사라졌거나 위치/크기가 크게 바뀐다.
7. 테스트 또는 빌드가 실패한다.
8. 390x844 스크린샷에서 타이틀 레이아웃이 붕괴한다.
9. 작업트리에 다른 사람/다른 에이전트의 변경이 섞여 있어 diff를 안전하게 읽을 수 없다.
10. 사용자가 “두 개만 삭제”라고 했는데 다른 미관 개선까지 하고 싶어진다.

Rollback 원칙:

- 절대로 `git reset --hard`, 강제 checkout, 대량 revert를 임의 실행하지 않는다.
- 기존 사용자/다른 에이전트 변경을 보존한다.
- 안전한 롤백은 작은 패치 단위로만 한다.
- 이미 커밋된 넓은 변경은 전체 revert 전에 diff를 분해해 “요청 대상 삭제”와 “범위 초과 변경”을 분리한다.
- 범위 초과가 의심되면 QA 문서에 근거를 남기고 `review-required`로 차단한다.

## 11. 최종 PASS 체크리스트

작은 타이틀 오브젝트 삭제 작업은 아래 항목이 모두 채워져야 PASS다.

- [ ] 삭제 대상 1~2개의 소스 위치/색상/geometry/좌표 또는 레이캐스트 결과가 QA 기록에 있다.
- [ ] 변경 파일이 허용 목록 안에 있다.
- [ ] 런타임 소스 변경량이 60줄 이하이며 신규 전역 디버그 도구가 없다.
- [ ] 보존 요소 소스 marker/count 체크가 통과했다.
- [ ] 타이틀 집중 테스트가 통과했다.
- [ ] 전체 테스트가 통과했다.
- [ ] 프로덕션 빌드가 통과했다.
- [ ] 390x844 스크린샷이 저장됐다.
- [ ] 데스크톱/넓은 화면 스크린샷이 저장됐다.
- [ ] 스크린샷 판정에서 삭제 대상 외 주요 구성 붕괴가 없다.
- [ ] 콘솔 error가 없다.
- [ ] Vite/dev-server 검증과 AAB/WebView 검증을 혼동하지 않았다.
- [ ] 미검증 항목은 PASS가 아니라 blocker/observation으로 분리했다.

## 12. 이번 문서 작성 시 검증 상태

### 완료

- 필수 정책 문서와 사건 기록을 읽었다.
- `dd471b4`의 파일 범위와 변경량을 git 명령으로 확인했다.
- 기존 QA 기록 일부와 Graphics Studio 타이틀 회귀 문서를 확인했다.
- 재발방지 게이트의 실행 명령, PASS/FAIL 기준, 중단 조건을 이 문서에 작성했다.

### 미검증 / Blocker가 아닌 관찰

- 이 문서는 런타임 코드를 변경하지 않았으므로 타이틀 화면을 새로 실행해 시각 PASS를 선언하지 않았다.
- Playwright 스크린샷, 전체 테스트, 프로덕션 빌드는 이번 문서 작성 중 실행하지 않았다. 이 문서는 “앞으로 반드시 실행할 게이트”를 정의한다.
- 현재 작업트리에는 본 작업 이전부터 많은 미커밋/미추적 변경이 있다. 따라서 이 문서 외 변경을 본 QA가 소유하거나 검증 완료로 주장하지 않는다.

## 13. QA 판정

- 게이트 설계 산출물: PASS
- `dd471b4`의 작은 삭제 요청 적합성: FAIL 사례로 분류
- 현재 타이틀 화면 런타임 시각 상태: 미검증
- AAB/WebView 시각 패리티: 미검증

최종 결론: 앞으로 타이틀 화면의 작은 오브젝트 삭제는 이 문서의 Scope/Object Identity/Preservation/Test/Screenshot/Stop 게이트를 모두 통과하기 전까지 완료 또는 릴리스 가능으로 기록하면 안 된다.

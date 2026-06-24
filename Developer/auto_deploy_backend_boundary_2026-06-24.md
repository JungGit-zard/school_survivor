# Auto Deploy Backend Boundary and Future Architecture Guard - 2026-06-24

## 목적

이 문서는 Escape! zombie school의 현재 우선순위가 Stage 1 모바일 플레이 루프 안정화라는 전제에서, 백엔드/계정/랭킹/멀티플레이 영역을 어디까지 미루고 어디까지 인터페이스로만 남길지 정리한다.

현재 `CEO/current_product_priorities.md` 기준으로 당장 하지 않을 항목은 다음이다.

- 백엔드 도입
- 리더보드
- 계정 시스템
- 멀티플레이
- 타이틀/랜딩 고도화
- Stage 2 확장

따라서 이 문서의 결론은 “지금 서버 기능을 새로 만들지 않는다”가 기본이다. 단, 나중에 공식 랭킹/클라우드 저장/멀티플레이를 붙일 때 현재 Stage 1 코드와 저장 구조를 크게 갈아엎지 않도록 최소 경계와 데이터 모양만 고정한다.

## 현재 확인한 백엔드 관련 상태

### 이미 존재하는 클라이언트 연결

- `Developer/r3f_prototype/src/lib/firebaseAuth.js`: Firebase Auth / Google 로그인 설정 진입점.
- `Developer/r3f_prototype/src/store/useAuthStore.js`: 로그인 상태와 Google 로그인/로그아웃 흐름.
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`: 로그인 유저의 로컬 진행도를 Firebase Realtime Database `users/{uid}`에 저장하는 클라이언트 저장 계층.
- `Developer/r3f_prototype/src/lib/rankingScorePolicy.js`: `survival_v1` 랭킹 점수 계산 순수 함수.
- `Developer/r3f_prototype/src/lib/userRanking.js`: 현재 로컬/개인 기록을 랭킹 표 형태로 표시하는 유틸.
- `Developer/r3f_prototype/src/store/useGameStore.js`: 런 종료, 골드 획득/소비, 패시브 구매/초기화 후 `requestCloudProgressSave()`를 호출한다.

### 현재 저장 경로

```text
users/{uid}
```

현재 저장되는 큰 구조는 다음이다.

```text
profile
schemaVersion
updatedAt
progress.goldTotal
progress.records
progress.weaponUnlocks
progress.passiveUpgrades
progress.titleSettings
```

이 구조는 개인 진행도 백업용으로만 취급한다. 공식 공개 랭킹, 이벤트 보상, 유료 재화, PvP/멀티플레이 판정의 근거로 사용하지 않는다.

## 지금 만들지 않을 것

Stage 1 모바일 루프가 안정화되기 전에는 아래 작업을 새로 구현하지 않는다.

1. 공식 공개 리더보드
   - 전 유저 순위, 시즌 순위, 글로벌 랭킹 API, 관리자 랭킹 조정 기능을 새로 만들지 않는다.
   - 현재 랭킹 UI는 로컬/개인/비공식 테스트 표시로만 본다.

2. 서버 검증형 점수 제출
   - Cloud Functions `finishRun` 같은 서버 함수는 아직 구현하지 않는다.
   - 클라이언트에서 계산한 결과를 서버가 공식 기록으로 승인하는 흐름은 Stage 1 모바일 루프 안정화 뒤로 미룬다.

3. 계정 기반 메타 진행도 정식 운영
   - Google 계정 로그인과 개인 진행도 백업이 이미 붙어 있어도, 이를 제품 핵심 의존성으로 만들지 않는다.
   - 게스트 플레이가 깨지지 않아야 한다.
   - 로그인 실패/저장 실패가 플레이 시작, 결과 화면, 코인상점, 패시브 구매를 막으면 안 된다.

4. 멀티플레이 / 실시간 동기화
   - Firebase Realtime Database, Supabase Realtime, PlayFab, Nakama, WebSocket 서버 등을 이용한 실시간 위치/전투 동기화는 지금 만들지 않는다.
   - 현재 게임은 오프라인 싱글 플레이 루프를 정본으로 유지한다.

5. 서버 권위형 경제 시스템
   - 골드, 패시브 업그레이드, 무기 해금의 서버 권위 판정은 지금 만들지 않는다.
   - 현재 `localStorage`와 개인 클라우드 백업은 편의 저장소이지 부정행위 방지 장치가 아니다.

6. 새 백엔드 플랫폼 선정/이전
   - Firebase에서 Supabase/PlayFab/Nakama/custom backend로 갈아타는 결정은 지금 하지 않는다.
   - 지금 단계에서 새 플랫폼 비교표나 PoC가 Stage 1 모바일 조작/루프 안정화보다 우선하지 않는다.

## 나중을 위해 지금 유지할 최소 인터페이스

새 서버 구현은 미루되, 아래 경계는 지금부터 깨지지 않게 유지한다.

### 1. 런 결과 입력값은 점수와 분리한다

랭킹 표시/저장에 필요한 원천 입력값을 점수 결과와 분리한다.

권장 런 결과 최소 필드:

```text
runId
uid 또는 localPlayerId
nickname
stageId
survivalSeconds
cleared
kills
startedAt
endedAt 또는 submittedAt
clientSchemaVersion
```

주의:

- `score`만 저장하면 점수 정책이 바뀔 때 재계산이 어렵다.
- `survivalSeconds`, `stageId`, `cleared`, `kills`를 남겨야 `survival_v1`, `survival_v2` 같은 점수 정책 변경에 대응할 수 있다.
- 골드, 패시브, 무기 해금 수는 1차 공식 랭킹 점수에서 제외한다.

### 2. 공식 랭킹은 개인 진행도와 분리한다

현재 개인 진행도 경로:

```text
users/{uid}
```

미래 공식 랭킹 후보 경로:

```text
leaderboards/global_survival_v1/entries/{uid}
leaderboards/stage1_survival_v1/entries/{uid}
leaderboards/stage2_survival_v1/entries/{uid}
```

공식 랭킹 엔트리 후보 필드:

```text
uid
nickname
score
scoreType = survival_v1
stageId
survivalSeconds
kills
cleared
runId
submittedAt
updatedAt
validationStatus
schemaVersion
```

분리 이유:

- `users/{uid}/progress`는 사용자의 개인 저장소다.
- 공개 랭킹은 다른 유저에게 노출될 수 있어 PII와 접근 권한 기준이 다르다.
- 개인 진행도는 클라이언트가 쓸 수 있어도, 공식 랭킹은 서버 검증 후에만 써야 한다.

### 3. 저장 계층 호출은 실패해도 게임을 막지 않는다

현재 `requestCloudProgressSave()`처럼 저장 실패를 콘솔 경고로만 처리하는 방향은 Stage 1 루프에 적합하다.

유지할 원칙:

- 런 종료 기록 저장 실패가 결과 화면 표시를 막지 않는다.
- 골드/패시브 로컬 반영 후 클라우드 저장 실패가 코인상점 조작을 막지 않는다.
- 로그인하지 않은 유저는 게스트 로컬 저장으로 계속 플레이 가능해야 한다.

### 4. 점수 정책은 순수 함수로 유지한다

`rankingScorePolicy.js`처럼 점수 계산은 UI, Firebase, localStorage 직접 접근과 분리된 순수 함수 계층에 둔다.

유지할 원칙:

- `getRankingScore({ stageId, survivalSeconds, cleared })` 같은 입력 기반 계산 함수를 유지한다.
- UI 컴포넌트에서 점수 공식을 직접 계산하지 않는다.
- 서버 검증을 도입할 때 같은 입력/출력 구조를 Cloud Functions나 custom backend로 옮길 수 있어야 한다.

### 5. 클라이언트 저장 스냅샷은 schemaVersion을 유지한다

현재 `firebaseProgress.js`에는 `SCHEMA_VERSION = 1`이 있다. 앞으로 필드를 추가할 때도 `schemaVersion`을 유지한다.

유지할 원칙:

- 필드 추가는 가능하면 optional로 한다.
- 삭제/이름 변경은 마이그레이션 계획 없이 하지 않는다.
- 공식 랭킹/멀티플레이 데이터에는 별도 `schemaVersion`을 둔다.

## 현재 오프라인 루프에서도 중요한 보안/안티치트 경계

서버 권위형 검증을 아직 만들지 않더라도, 아래 항목은 현재 Stage 1 루프 품질에 직접 영향을 준다.

### 1. 관리자/치트 UI는 일반 플레이 경험에서 숨긴다

현재 프로젝트에는 개발 치트, 관리자 버튼, 무기 해금 치트 흐름이 존재한다. 이는 개발/QA 편의 기능으로 유지하되 일반 플레이 화면에서 혼동을 만들면 안 된다.

경계:

- 치트 버튼은 디버그/개발 맥락으로만 노출한다.
- 타이틀/결과/랭킹 UI에서 치트 사용 기록을 공식 기록처럼 보이게 하지 않는다.
- 치트로 만든 로컬 기록은 미래 공개 랭킹 제출 대상에서 제외할 수 있도록 `validationStatus` 또는 `source` 필드를 둘 여지를 남긴다.

### 2. localStorage 값은 조작 가능하다고 가정한다

현재 골드, 패시브, 무기 해금, 플레이 기록은 브라우저 저장소와 클라이언트 코드에 의존한다.

경계:

- `goldTotal`, `records`, `weaponUnlocks`, `passiveUpgrades`는 공식 경쟁/보상 근거로 쓰지 않는다.
- QA나 밸런스 검증에서 localStorage 주입으로 만든 값과 실제 플레이 기록을 구분한다.
- 사용자에게 보이는 로컬 랭킹은 “내 기록/테스트 랭킹” 성격으로 유지한다.

### 3. Stage 1 클리어/생존 시간은 클라이언트 입력으로만 믿지 않는다

미래 공식 랭킹 제출 시 검증해야 할 최소 항목:

```text
stageId가 허용된 값인가
survivalSeconds가 해당 stage duration을 초과하지 않는가
cleared=true인데 survivalSeconds가 클리어 기준에 맞는가
kills가 비정상적으로 높지 않은가
run duration과 submittedAt이 모순되지 않는가
score가 서버 재계산 결과와 일치하는가
```

현재는 이 서버 검증을 구현하지 않는다. 다만 런 결과 데이터 구조를 위 검증이 가능하도록 유지한다.

### 4. 개인정보 최소화

`firebase_realtime_database_security_review_2026-06-21.md`의 판단처럼 게임 진행 저장에는 이메일과 photoURL이 필수는 아니다.

미래 정리 후보:

- 우선 유지: `uid`, `displayName`, `nickname`
- 필요할 때만 저장: `email`, `photoURL`

현재 당장 변경하지 않는 이유:

- 이 카드는 구현 카드가 아니라 경계 메모 카드다.
- 저장 필드 축소는 Firebase 저장 구조/테스트와 함께 별도 작업으로 다뤄야 한다.

### 5. Firebase Rules는 최소 자기 uid 경계가 필요하다

현재 개인 진행도를 Firebase Realtime Database에 저장한다면 최소 규칙은 아래 방향이어야 한다.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

추가 권장:

- `.validate`로 타입/범위를 제한한다.
- App Check는 모니터링부터 붙이고, 문제 없을 때 enforcement를 켠다.
- API 키보다 Auth, Rules, App Check가 실제 권한 경계라는 점을 유지한다.

## 백엔드 후보별 나중 판단 기준

지금 플랫폼을 새로 정하지 않는다. 단, 나중에 다시 열 때 판단 기준은 다음으로 제한한다.

### Firebase 유지가 적합한 경우

- Google 로그인 + 개인 클라우드 저장 + 단순 리더보드가 중심이다.
- Cloud Functions로 `finishRun` 검증 정도면 충분하다.
- 운영 복잡도를 낮게 유지하고 싶다.

### Supabase 검토가 적합한 경우

- SQL 기반 조회/관리자 페이지/운영 리포트가 중요해진다.
- 랭킹 시즌, 쿼리, 통계, 관리자 필터링이 늘어난다.
- Postgres row-level security를 명확히 설계할 수 있다.

### PlayFab 검토가 적합한 경우

- 게임 계정, 인벤토리, 경제, 공식 리더보드, 이벤트 운영을 빠르게 붙여야 한다.
- 자체 서버보다 게임 백엔드 SaaS 운영 기능이 필요하다.

### Nakama/custom backend 검토가 적합한 경우

- 실시간 멀티플레이, 서버 권위 전투, 매치메이킹이 핵심 기능으로 승격된다.
- 현재 Stage 1 싱글 루프 이후 제품 방향이 멀티플레이 중심으로 바뀐다.

## 미래 구현 순서 제안

Stage 1 모바일 루프 안정화 뒤 백엔드를 다시 열면 아래 순서가 안전하다.

1. 개인 진행도 저장 정리
   - `profile.email`, `profile.photoURL` 저장 필요성 재판단.
   - Firebase Rules 자기 uid 제한과 `.validate` 적용.
   - App Check 모니터링 적용.

2. 런 결과 DTO 고정
   - `runId`, `stageId`, `survivalSeconds`, `cleared`, `kills`, `submittedAt`, `schemaVersion`를 명시한다.
   - 로컬 저장/랭킹 표시/서버 제출 후보가 같은 DTO를 쓰도록 정리한다.

3. 서버 검증 함수 도입
   - 후보 이름: `finishRun`.
   - 클라이언트는 원천 입력값만 제출한다.
   - 서버가 `survival_v1` 점수를 재계산한다.
   - 검증 통과 시 개인 진행도와 공식 랭킹을 각각 갱신한다.

4. 공식 랭킹 데이터 분리
   - `leaderboards/*/entries/{uid}` 계열 별도 경로를 사용한다.
   - 공개 노출 필드는 `nickname`, `score`, `stageId`, `survivalSeconds`, `cleared`, `submittedAt` 정도로 최소화한다.

5. 관리자/운영 기능은 마지막
   - 시즌 리셋, 밴/무효 처리, 수동 랭킹 삭제, 이상치 리포트는 공식 랭킹이 실제로 필요해진 뒤 만든다.

## 이 카드에서 변경하지 않은 것

- 게임 코드 구현 변경 없음.
- Firebase Rules 실제 배포 없음.
- `.env` 변경 없음.
- Cloud Functions, Supabase, PlayFab, Nakama, custom backend 신규 파일 없음.
- 테스트 코드 변경 없음.
- 커밋/푸시 없음.

## 작업 중 읽은 파일

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md`
- `CEO/current_product_priorities.md`
- `Developer/firebase_google_login_realtime_database_integration_2026-06-20.md`
- `Developer/firebase_realtime_database_security_review_2026-06-21.md`
- `CEO/ranking_score_policy_decision_2026-06-21.md`
- `Planner/game_contents/user_ranking_score_policy_2026-06-21.md`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/rankingScorePolicy.js`
- `Developer/r3f_prototype/src/lib/userRanking.js`
- `Developer/r3f_prototype/src/store/useGameStore.js`

## 명령/검증 로그

실행한 주요 명령:

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch
mkdir -p ~/.claude/skills && git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup --team
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
[ -x ~/.claude/skills/gstack/bin/gstack-paths ] && echo GSTACK_PATHS_OK || echo GSTACK_PATHS_MISSING
git status --short --branch --untracked-files=all | sed -n '1,80p'
```

검증 결과:

- 최초 gstack 확인은 `GSTACK_MISSING`이었다.
- self-serve 원칙에 따라 gstack 설치를 시도했고, 설치 명령은 300초 제한으로 타임아웃됐지만 이후 재확인 결과 `GSTACK_OK`, `GSTACK_PATHS_OK`였다.
- 작업 전후 `git status --short --branch`로 기존 미커밋 변경이 다수 있음을 확인했다.
- 이 카드의 산출물은 문서 1개 추가이며 코드/테스트 변경은 없다.
- 이 문서는 직접 파일로 저장한 뒤 다시 읽어 존재와 핵심 내용을 확인했다.

## 블로커 / 핸드오프

블로커 없음.

다음 작업자에게 넘길 핵심 경계:

1. Stage 1 모바일 루프 안정화 전에는 새 백엔드/공식 리더보드/멀티플레이를 구현하지 않는다.
2. 현재 Firebase 개인 진행도 저장은 편의 백업이며 공식 경쟁 데이터가 아니다.
3. 공개 랭킹은 반드시 개인 진행도와 분리하고, 서버가 점수를 재계산한 검증 결과만 기록한다.
4. 지금 당장 유지할 최소 인터페이스는 `stageId`, `survivalSeconds`, `cleared`, `kills`, `submittedAt`, `schemaVersion`, `scoreType=survival_v1`이다.
5. 보안상 현재 오프라인 루프에서도 치트 UI/로컬 저장 조작/개인정보 최소화/Firebase Rules 경계는 계속 의식해야 한다.

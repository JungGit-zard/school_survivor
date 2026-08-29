# 핸드오프 — "최고 점수인데 랭킹 페이지에서 안 보인다"

- 작성: 2026-08-25, Claude(Advisor) — backendmini 감사 결과 포함
- 대상: Terry 최종 재검사
- **이 문서 작성 중 코드 수정 없음.** 아래 "이미 반영된 것"은 그 전에 커밋·푸시된 것들이다.

---

## 0. 한 줄 결론

**증상은 재현될 만하다. 원인은 클라이언트가 아니라 RTDB 규칙 배포 갭일 가능성이 가장 높다.**
레포의 `database.rules.json`에서는 상한을 제거했지만 **라이브에는 옛 상한이 그대로 떠 있고**, 하필 **보스 잡고 탈출한 런(=최고점 런)이 정확히 거부 대상**이다. 그리고 그 거부는 지금까지 화면·로그 어디에도 나타나지 않았다.

단, **실기기/실계정으로 "제출이 실제로 거부되는" 장면은 아무도 확인하지 않았다.** 아래 3절에서 확인/추정/미확인을 분리한다.

---

## 1. 확인 사실 (직접 실행하거나 코드에서 읽음)

### 1-1. 저장 구조는 스테이지별로 분리돼 있다 — *출처: 내가 `firebaseRanking.js` 직접 읽음*

```
rankingService/v1/public/{seasonId}/stage/{stageId}/{daily|weekly}/{periodKey}/entries/{uid}
rankingService/v1/public/{seasonId}/global/{daily|weekly}/{periodKey}/entries/{uid}
```

- `submitRun`이 런 1회당 **4버킷**에 쓴다: stage daily / stage weekly / global daily / global weekly (`firebaseRanking.js:114-117`)
- 버킷마다 기존 점수를 먼저 읽어 **더 높을 때만** 쓴다 (`:121-132`). 한 버킷 실패가 다른 버킷을 롤백하지 않게 분리돼 있다 — 주간이 거부되며 일일까지 날아가는 걸 막는 구조다.
- **all-time(영구) 보드는 존재하지 않는다.** daily/weekly가 전부다.

### 1-2. best-only 규칙은 살아 있다 — *출처: 내가 `database.rules.json`을 파싱해 직접 확인*

```
stage  .write : auth != null && $uid === auth.uid
                && ($window === 'daily' || $window === 'weekly')
                && ($stageId === 'stage1'|...|'stage4')
                && newData.child('stageId').val() === $stageId
                && (!newData.exists() || !data.exists()
                    || newData.child('score').val() >= data.child('score').val())
global .write : (같음, $stageId 조건만 없음)
```

- 최근 상한 제거(`f955342`)는 **`.validate`만** 건드렸다. `.write`의 best-only와 스테이지 버킷 위조 방지는 무손상이다.

### 1-3. 랭킹 페이지가 읽는 버킷 — *출처: 내가 컴포넌트 직접 읽음*

| 화면 | 파일 | 읽는 것 |
|---|---|---|
| 스테이지 랭킹 | `StageRanking.jsx:14` | `subscribeStageRanking(stageId, 'daily', ...)` — **daily 고정** |
| 통합 랭킹 | `UserRanking.jsx:24,37,38` | daily / weekly 탭 전환, 둘 다 구독 |

- **stage weekly 버킷은 쓰기만 하고 아무도 읽지 않는다.**
- 어느 화면도 all-time을 읽지 않는다(존재하지 않으므로).

### 1-4. '내 최고' 칩은 서버를 읽지 않는다 — *출처: 내가 `UserRanking.jsx` 직접 읽음*

```js
const localEntry = useMemo(() => buildLocalPlayerRankingEntry(localRecords, user ?? {}), ...)  // :28
const bestScore  = localEntry?.score ?? 0                                                       // :30
<span>{t('ranking.myBest')} <strong>{formatRankScore(bestScore)}</strong></span>                 // :69
```

**칩은 100% 로컬 기록으로 재구성된다.** 서버에 실제로 저장된 값과 대조하지 않는다.
→ **"내 최고"에는 높은 점수가 보이는데 보드 목록에는 내가 없는 상태가 구조적으로 가능하다.** Terry가 겪은 증상과 정확히 일치하는 모양이다.

### 1-5. v48 포함 여부 — *출처: 내가 `git merge-base --is-ancestor`로 확인*

v48 = `f4073ea` "Record AAB v48 release build" (2026-08-25). **아래 4개 전부 포함:**

| 커밋 | 내용 |
|---|---|
| `f955342` | 랭킹 시간·점수 상한 제거, 탈출 보너스 15% 교체, 좌하단 실시간 점수, h:mm:ss 시계, 과학적 기수법 |
| `4a56569` | 발소리 배선, 오디오 매니페스트 해시 복구 |
| `cc34863` | 오버타임 좀비 HP 시간 배수 |
| `e25bc08` | **submitRun 실패/거부 구분 + 경고 로그** |

v48 이후 트렁크에 추가된 커밋은 1개다.

### 1-6. `submitRun` 반환/실패 처리 — *출처: 내가 `e25bc08` diff 확인 + 테스트 57개 통과 실행*

**변경 전(문제):** 버킷별 `catch {}`가 권한 거부·규칙 불일치·네트워크 실패를 "기존 점수가 더 높음"과 **똑같이** 삼켰다. `submitRun`은 아무것도 반환하지 않았고, 호출부(`useGameStore.js`)가 `.catch(() => {})`로 한 번 더 삼켰다. → **점수가 사라져도 흔적이 0.**

**변경 후(`e25bc08`):** `{ written[], skipped[], failed[], reason? }`를 반환하고 `failed`가 있으면 `console.warn`. 호출부는 여전히 fire-and-forget이라 **게임 동작은 그대로**.

같은 커밋에서 `runId` / `runStartedAt`을 제거했다 — 호출부에서 조립해 넘겼지만 `submitRun` 시그니처가 받지도 않아 버려지고 있었고, 주석은 "서버 dedup으로 이중가산 방지"라는 **존재하지 않는 보호**를 약속하고 있었다. best-only는 재제출이 멱등이라(같은 점수 → `>=` → skip) dedup 자체가 불필요하다.

검증(실행): `firebaseRanking / databaseRules / userRanking / useGameStore` 테스트 **57개 통과**.

### 1-7. 내 셸에서 라이브 규칙 조회 실패 — *출처: 내가 실행*

```
$ firebase login:list                        → Logged in as zard5388@gmail.com
$ firebase database:get "/.settings/rules"   → Error: Path must begin with /
```
Git Bash 경로 변환 때문이다. 해결책은 2-1 참조.

---

## 2. backendmini 감사 결과 (에이전트 보고, 내가 독립 재현하지 않음)

> 아래는 backendmini가 "실행했다"고 보고한 내용이다. **나는 라이브 접속 부분을 재현하지 않았다.** Terry가 재검사할 때 1순위로 다시 확인할 부분이다.

### 2-1. 배포 갭 — 에이전트는 "라이브 규칙을 실제로 받아 확인했다"고 보고

조회 방법(에이전트 보고):
```bash
MSYS_NO_PATHCONV=1 firebase database:get "/.settings/rules" \
  --project escape-zombie-school \
  --instance escape-zombie-school-default-rtdb
```

보고된 diff — **라이브에만 남아 있는 상한** (stage/global 양쪽 `.validate`):
```
&& newData.child('timeMs').val() <= 300000
&& newData.child('score').val() >= (newData.child('timeMs').val() / 1000) - 1
&& newData.child('score').val() <= (newData.child('timeMs').val()/1000
     + (stage1 ? 0 : stage2 ? 60 : stage3 ? 120 : 180)
     + (cleared ? 30 : 0)) * (cleared ? 1.2 : 1)
```
그리고 `titleSettings`의 `scientificNotation` 화이트리스트가 라이브에 **없음**.

### 2-2. 거부 범위 — 에이전트가 라이브 규칙 문자열을 리포 하네스(`fullyAccepts`)로 평가

```
stage1  5분  탈출+보스   414   LIVE REJECT / REPO ACCEPT
stage2  3분  탈출+보스   331   LIVE REJECT
stage3  3분  탈출+보스   414   LIVE REJECT
stage4  1분  탈출+보스   331   LIVE REJECT   ← 1분부터
stage1  6분  사망        360   LIVE REJECT
→ 72건 중 44건 불일치
```

**핵심: 클라 점수식은 이미 새 모델(탈출 15% 교체)인데 라이브 규칙 상한식은 옛 모델(`clear 30 + ×1.2`) 전제다. 그래서 시간이 짧아도 클리어 런이 상한을 넘어 거부된다.** 스테이지4가 1분부터 거부되는 이유.

### 2-3. 라이브 데이터 관찰 (에이전트 보고)

- 실계정 3개 / 107 엔트리
- "주간 점수 ≥ 그 주 모든 일일 점수" 전수 확인 → **위반 0건** (best-only는 실제로 동작 중)
- `timeMs > 300000` **0건**, 최댓값 **298,866**(4:58.9)
- 엔트리 키가 전부 raw uid (107/107)

### 2-4. `functions/src/ranking.js`는 dead (에이전트 3중 확인 보고)

- `firebase functions:list` → "No functions found"
- `src/`에 `httpsCallable` / `getFunctions` 호출 0건
- 라이브 키가 raw uid → 함수의 `publicEntryId(uid)`(sha256) 흔적 없음

**단, `functions/index.js`가 그 모듈을 import해 export한다.** 누가 `firebase deploy --only functions`를 한 번 치면 `incrementEntry`의 `score: 기존 + 신규`(합산)가 보드에 섞인다 — 최고점 모델과 정반대.

### 2-5. '내 최고' 칩 과대표시 (에이전트 실측 보고)

`userRanking.js`의 `buildLocalStageEntry`가 `cleared = clearCount > 0`으로 판정한다 — "언젠가 클리어함"이지 "이 최고 생존 런이 클리어였음"이 아니다.

```
server clear-run score      : 69    (stage1 60초 탈출)
server death-run score      : 280   (stage1 280초 사망)
server best actually stored : 280
local "내 최고" chip        : 322   ← 서버에 없는 값
divergence                  : +42
```

부수: `mergeCloudEntries`는 정의만 되고 `UserRanking.jsx`가 호출하지 않는다. **보드 목록에는 로컬 유령 엔트리가 안 섞인다. 오염은 칩 하나에 한정.**

---

## 3. 추정 (근거는 있으나 확정 아님)

1. **Terry가 겪은 증상의 가장 유력한 경로**: 최고점 런이 클리어 런이었고 → 라이브 상한식에 걸려 제출 거부 → `catch{}`가 삼켜 무음 → 랭킹 페이지에는 없고, '내 최고' 칩은 로컬 기준이라 그대로 높게 표시. **1-4와 2-2가 맞물리면 정확히 이 그림이 된다.**
2. **라이브 `timeMs` 최댓값 298,866이 5분 벽 바로 아래**인 것은 상한이 실제로 작동 중이라는 강한 방증이다. 다만 "5분 넘게 안 논 것"과 완전히 구분되지는 않는다.
3. 2026-08-22/23 라이브 엔트리 점수 493/491이 옛 공식과 일치 → 그때까진 옛 클라. 그 이후 cleared 런 기록이 없어 **"안 한 것"인지 "거부된 것"인지 구분 불가.**

---

## 4. 미확인 (아무도 안 했음)

1. **실기기/실계정 실측 0건.** 실제로 플레이해서 제출이 통과/거부되는지 본 사람이 없다. 이 프로젝트의 클라우드 저장 완료 기준은 "실계정 1건 실측"인데 그걸 못 채웠다.
2. **v48 실기기 확인 0건.** v48에 `e25bc08`(경고 로그)이 들어 있으므로, **실기기에서 로그를 보면 거부 여부가 바로 드러난다.** 이게 가장 빠른 확정 경로다.
3. **backendmini의 라이브 접속 결과를 내가 재현하지 않았다.** 2절 전체가 여기 해당한다.
4. **호스팅 라이브 빌드 날짜(2026-08-09)**는 에이전트 보고값이고 내가 확인하지 않았다. 사실이라면 웹 플레이어는 아직 옛 클라라 옛 규칙과 정합이고, **dev 서버나 v48 AAB로 플레이할 때만 유실**이 발생한다.

---

## 5. 지금 v48에 들어 있는 것 vs 아직 필요한 것

### v48에 포함 (커밋·푸시 완료)
- 레포 규칙에서 시간·점수 상한 제거 — **파일만. 라이브 미반영**
- 탈출 보너스 = base × 15% (고정 30점 교체), 보스 20%는 처치 조건 유지
- `submitRun` 실패/거부 구분 + 경고 로그
- 좌하단 실시간 점수 / h:mm:ss 시계 / 과학적 기수법 토글
- 오버타임 좀비 HP 시간 배수

### 아직 안 된 것
| 항목 | 상태 |
|---|---|
| **RTDB 규칙 배포** | **미실행. 이게 핵심 차단 요인.** |
| 실기기 v48 검증 | 미실행 |
| all-time 보드 | 미구현 (구조 자체가 없음) |
| '내 최고' 칩 정합 | 미수정 (표시 의미론 결정 필요) |
| stage weekly 보드 노출 | 미구현 (쓰기만 하고 안 읽음) |
| `functions/` 합산 로직 | 방치 (배포만이 유일한 방어선) |

### 배포 명령 (실행하지 않음 — Terry 확인 후)
```bash
cd D:/JungSil/2.Minigame_project/zombie_claude/Developer/r3f_prototype
firebase deploy --only database --project escape-zombie-school
```

**안전성 판단**: 새 규칙은 옛 규칙에서 제약을 빼기만 한 **상위집합**(+ `scientificNotation` 키 1개). 옛 클라이언트가 보내는 점수도 그대로 통과한다.
**순서**: **규칙 배포가 클라이언트 배포보다 먼저**여야 한다. 반대면 클리어 런이 계속 유실된다.
**대가**: 점수 상한이 사라지므로 랭킹은 **클라이언트 신뢰 기반**이 된다. 조작된 클라가 임의 점수를 쓸 수 있다 — 무한모드 경합을 위해 사용자가 인지하고 내린 결정이다.

---

## 6. 관련 파일

| 파일 | 역할 |
|---|---|
| `src/lib/firebaseRanking.js` | 제출·구독. `submitRun`(:88), 버킷 경로(:76,:81), best-only 선검사(:121-132) |
| `src/lib/rankingScorePolicy.js` | 점수식 단일 출처. `getRankingScore` / `getEscapeBonus` / `getBossClearBonus` |
| `src/store/useGameStore.js` | 런 종료 → 점수 계산 → `submitRun` 호출 (`_onRunEnd`, 약 :646-661) |
| `src/components/StageRanking.jsx` | 스테이지 보드. **daily 고정(:14)** |
| `src/components/UserRanking.jsx` | 통합 보드 + '내 최고' 칩(:28-30,:69) |
| `src/lib/userRanking.js` | `buildLocalPlayerRankingEntry` / `buildLocalStageEntry`(cleared 판정 문제) |
| `database.rules.json` | RTDB 규칙 **(레포 ≠ 라이브)** |
| `functions/src/ranking.js` | 미배포. `incrementEntry` 합산 로직 |
| `src/lib/databaseRules.test.js` | 규칙 하네스. **레포 파일만 평가 — 배포본에 대해선 침묵** |

---

## 7. 검증 명령

### 7-1. 라이브 규칙과 레포 대조 (가장 중요)
```bash
cd D:/JungSil/2.Minigame_project/zombie_claude/Developer/r3f_prototype
MSYS_NO_PATHCONV=1 firebase database:get "/.settings/rules" \
  --project escape-zombie-school \
  --instance escape-zombie-school-default-rtdb > /tmp/live-rules.json
# 상한 잔존 여부
grep -c "300000" /tmp/live-rules.json          # 0이면 배포됨, 2면 미배포
grep -c "300000" database.rules.json           # 0이어야 정상(레포)
```

### 7-2. 실기기 v48 — 가장 빠른 확정 경로
1. v48 설치 후 **로그인 상태로** 스테이지1을 **6분 이상** 버티거나, 보스 잡고 탈출
2. `adb logcat | grep -i "chromium\|console"` 로 `e25bc08`이 심은 **경고 로그** 확인
   - 경고가 뜨면 → **제출 거부 확정. 규칙 배포 필요.**
   - 경고 없이 written이면 → 규칙은 문제없고 원인은 다른 곳
3. 그 직후 랭킹 페이지에서 본인 엔트리 유무 확인

### 7-3. 오프라인 테스트
```bash
npx vitest run src/lib/firebaseRanking.test.js src/lib/databaseRules.test.js \
  src/lib/userRanking.test.js src/lib/rankingScorePolicy.test.js \
  src/store/useGameStore.test.js --maxWorkers=1 --no-file-parallelism
```
**주의: 이 테스트는 레포 규칙만 평가한다. 통과해도 배포 갭에 대해서는 아무것도 증명하지 못한다.**

### 7-4. 함수 배포 상태
```bash
firebase functions:list --project escape-zombie-school   # "No functions found" 여야 정상
```

### 7-5. v48 포함 커밋 확인
```bash
cd D:/JungSil/2.Minigame_project/zombie_claude
for c in f955342 4a56569 cc34863 e25bc08; do
  git merge-base --is-ancestor $c f4073ea && echo "포함 $c"
done
```

---

## 8. Terry 판단이 필요한 것

1. **규칙 배포 실행 여부** — 프로덕션 변경이라 확인 대기 중
2. **'내 최고' 칩 의미론** — 로컬 기준 유지 / 서버 기준으로 교체 / 로컬 best-score 키 신설. 점수 정본에 관한 결정이라 임의로 정하지 않았다
3. **all-time 보드 신설 여부** — 지금은 자정·월요일에 최고점이 사라진다. "최고 기록"이라는 기대와 구조가 다르다
4. **`functions/` 처리** — 삭제할지, 배포 금지 가드를 걸지

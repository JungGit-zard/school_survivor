# 출근길 친화 미구현 항목 구현 요청서

작성일: 2026-05-17
출처: [`commuter_target_planning_2026-05-14.md`](commuter_target_planning_2026-05-14.md) §10 구현 점검 종합표
대상: Developer 부서
검증 책임: 작성자 (Planner) + QA 부서

---

## 0. 요청서 개요

본 요청서는 출근길 직장인 타깃 기획 점검 결과 식별된 **미구현 / 부분 구현 항목 6건**에 대한 구체적 구현 사양이다.

각 항목은 다음 4축으로 명세된다:

1. **기획 의도** — 왜 필요한가
2. **구현 위치** — 어느 파일/함수
3. **기술 사양** — 수치 / API / UI 사양
4. **검증 방법** — QA가 통과 여부를 확인하는 절차

기획 목표는 **"중단되어도 아깝지 않은 5분"** 핵심 축의 ❌ → ✓ 전환.

---

## 1. 우선순위 요약

| 순위 | 항목 | 예상 작업 시간 | 의존성 |
|---|---|---|---|
| 1️⃣ | `stageDurationSec` 데이터화 | ~15분 | 없음 (선행 기반) |
| 2️⃣ | 자동 일시정지 (visibilitychange) | ~30분 | 없음 |
| 3️⃣ | 생존 마일스톤 골드 보너스 | ~30분 | 1번 권장 |
| 4️⃣ | 보스 등장 3초 카운트다운 경고 | ~30분 | 없음 |
| 5️⃣ | 타이틀 화면 카피 보강 | ~10분 | 없음 |
| 6️⃣ | 코인상점 패시브 카탈로그 (대형) | 별도 기획 | 별도 PR |

즉시 착수 1~5번: **합 ~115분**. 6번은 별도 메타프로그레션 기획 문서가 선행되어야 함.

---

## 2. 구현 항목 #1 — `stageDurationSec` 데이터화 (선행 기반)

### 2-1. 기획 의도

현재 5분 클리어 트리거가 `Game.jsx:25`에 `5 * 60 * 1000`으로 하드코딩되어 있다. 향후 3분 짧은 모드 / 스테이지 2+ 길이 차등화를 위해 데이터로 분리한다.

### 2-2. 구현 위치

**신규**: `Developer/r3f_prototype/src/lib/stageConfig.js`
**수정**: `Developer/r3f_prototype/src/components/Game.jsx`

### 2-3. 기술 사양

**lib/stageConfig.js 신규**:
```js
// 스테이지 길이를 한 곳에서 관리한다. 향후 스테이지별/모드별 데이터 차등화 시 이 파일을 확장.
// 단위: 초 (Game.jsx에서 elapsedMs와 비교 시 *1000)

export const STAGE_DURATION_SEC = 300 // 5분 — 1스테이지 기본
```

**Game.jsx 수정** (line 25 부근):
```js
import { STAGE_DURATION_SEC } from '../lib/stageConfig.js'

// useFrame 안에서:
if (useGameStore.getState().elapsedMs >= STAGE_DURATION_SEC * 1000) {
  clearStage()
}
```

### 2-4. 검증 방법

1. `npm run build` 성공
2. `npm run test` 통과 (24/24)
3. dev 서버 5분 풀플레이 → 정확히 5:00에 클리어 트리거
4. `STAGE_DURATION_SEC = 180`으로 임시 변경 → 3:00에 클리어 → 다시 300으로 복원

### 2-5. 추후 확장 메모

스테이지 2+ 도입 시 `stageConfig.js`에 `STAGES = { stage1: 300, stage2: 360, ... }` 형태로 확장. 또는 zustand store의 `currentStageId`로 동적 선택.

---

## 3. 구현 항목 #2 — 자동 일시정지

### 3-1. 기획 의도

출근길 유저가 갑자기 내려야 할 때 / 전화 받을 때 / 앱 전환 시 게임이 자동으로 멈춰야 "5분 손해" 느낌을 없앨 수 있다.

핵심 시나리오:
- 지하철에서 내릴 때 잠금화면 → 자동 정지
- 카카오톡 알림 클릭 → 자동 정지
- 다른 탭 전환 → 자동 정지
- 휴대폰 화면 끔 → 자동 정지

### 3-2. 구현 위치

**수정**: `Developer/r3f_prototype/src/App.jsx`
**선택적 수정**: `Developer/r3f_prototype/src/store/useGameStore.js` (auto-pause 플래그 분리)

### 3-3. 기술 사양

#### A. 기본 (자동 정지만)

App.jsx의 game 화면 렌더 안에 `useEffect`로 visibilitychange 리스너 등록:

```js
useEffect(() => {
  if (screen !== 'game') return

  const handleHide = () => {
    if (document.hidden) {
      const { phase, togglePause } = useGameStore.getState()
      if (phase === 'playing') togglePause() // → 'paused'
    }
  }

  document.addEventListener('visibilitychange', handleHide)
  window.addEventListener('pagehide', handleHide) // iOS Safari
  window.addEventListener('blur', handleHide)     // 데스크톱 탭 전환

  return () => {
    document.removeEventListener('visibilitychange', handleHide)
    window.removeEventListener('pagehide', handleHide)
    window.removeEventListener('blur', handleHide)
  }
}, [screen])
```

#### B. 분리: auto-pause vs manual-pause

복귀 시 "이어하기" 버튼을 보여주려면 어떤 이유로 멈췄는지 알아야 한다.

useGameStore에 `pauseSource: 'manual' | 'auto' | null` 추가:
- `togglePause()` 호출 시 source 명시
- HUD의 paused 모달에서 `pauseSource === 'auto'`면 "이어하기" 버튼 강조, 메시지 "자리를 비우셨네요" 표시

```js
// useGameStore.js
pauseSource: null,
pauseGame: (source) => set((s) => {
  if (s.phase !== 'playing') return {}
  return { phase: 'paused', pauseSource: source }
}),
resumeGame: () => set((s) => {
  if (s.phase !== 'paused') return {}
  return { phase: 'playing', pauseSource: null }
}),
```

HUD paused 모달 (현재 단순한 'PAUSED' 표시)을 다음으로 확장:
```jsx
{phase === 'paused' && (
  <div style={styles.overlay}>
    <div style={styles.pausePanel}>
      <h2 style={styles.modalTitle}>
        {pauseSource === 'auto' ? '자리를 비우셨네요' : 'PAUSED'}
      </h2>
      <p>{pauseSource === 'auto' ? '돌아오셨네요. 이어서 진행하시겠어요?' : ''}</p>
      <button onClick={resumeGame}>이어하기</button>
    </div>
  </div>
)}
```

### 3-4. 검증 방법

| 시나리오 | 기대 동작 |
|---|---|
| 게임 중 다른 탭 클릭 → 돌아옴 | 'paused' 화면 + "자리를 비우셨네요" 메시지 + 이어하기 버튼 |
| 게임 중 P키 → P키 다시 | 'paused' → 'playing' (manual 토글) |
| 모바일 게임 중 홈 버튼 → 복귀 | 'paused' 진입 |
| 게임 중 휴대폰 화면 끔 → 켬 | 'paused' 진입 |
| 'paused' 화면에서 이어하기 클릭 | 'playing' 복귀, 적/타이머 정확히 그 자리부터 |
| 'levelup' 화면에서 탭 전환 → 복귀 | 'levelup' 상태 유지 (auto-pause는 'playing'에서만 트리거) |

QA 체크리스트에 위 6개 시나리오 추가.

### 3-5. 추후 확장

- 마지막 활성 시각 + 10분 이상 지나면 "오래 자리 비우셨네요. 처음부터 다시 하시겠어요?" 옵션
- 모바일 백그라운드 자동 종료 대응 (`localStorage`에 진행 상태 스냅샷 저장)

---

## 4. 구현 항목 #3 — 생존 마일스톤 골드 보너스

### 4-1. 기획 의도

5분 풀클리어만 보상하면 중간 사망이 "시간 손해"로 느껴진다. 1분/3분/4분 마일스톤마다 즉시 골드 보너스를 주면 짧은 플레이도 만족스럽다.

또한 마일스톤 도달 시 토스트/플로팅 텍스트로 시각 피드백을 주면 "오, 1분 버텼다!" 라는 작은 성취감이 생긴다.

### 4-2. 구현 위치

**수정**: `Developer/r3f_prototype/src/store/useGameStore.js`
**수정**: `Developer/r3f_prototype/src/components/Game.jsx` (밀리초 트리거)
**신규 옵션**: `Developer/r3f_prototype/src/components/HUD.jsx` (토스트 표시)

### 4-3. 기술 사양

#### 마일스톤 정의 (Bang_Rules 부합 권장 값)

| 시점 | 보너스 골드 | 메시지 |
|---|---|---|
| 1분 (60s) | +1 | "1분 생존 보너스" |
| 3분 (180s) | +3 | "3분 돌파 보너스" |
| 4분 (240s, 보스 조우) | +4 | "보스 조우 보너스" |
| 5분 (300s, 클리어) | +8 | "학교 탈출 보너스" |

> **단위 결정**: 본 표는 "코인 1개 = 1골드" 가정. 향후 코인 단위 변경 시 별도 `Bang_Rules.md` 부록에서 재정의.

5분 클리어 시 총 약 26골드 (시계 드랍 ~10 + 마일스톤 1+3+4+8 = 16). 사망 시 도달한 마일스톤까지만 누적.

#### useGameStore.js 추가

```js
// 상수 (파일 상단)
const SURVIVAL_MILESTONES = [
  { atMs:  60_000, gold:  1, label: '1분 생존 보너스' },
  { atMs: 180_000, gold:  3, label: '3분 돌파 보너스' },
  { atMs: 240_000, gold:  4, label: '보스 조우 보너스' },
  { atMs: 300_000, gold:  8, label: '학교 탈출 보너스' },
]

// 초기 상태에 추가
survivalMilestonesHit: [], // 도달한 atMs 배열
recentMilestone: null,     // 토스트 1회 표시용

// 액션 추가
checkSurvivalMilestone: () => {
  const s = get()
  const e = s.elapsedMs
  for (const m of SURVIVAL_MILESTONES) {
    if (e >= m.atMs && !s.survivalMilestonesHit.includes(m.atMs)) {
      s.gainGold(m.gold)
      set({
        survivalMilestonesHit: [...s.survivalMilestonesHit, m.atMs],
        recentMilestone: m,
      })
      // 토스트는 2초 후 자동 해제 — HUD에서 setTimeout 처리
    }
  }
},

// resetGame에서 초기화 추가:
// survivalMilestonesHit: [],
// recentMilestone: null,
```

#### Game.jsx 수정 (tickTime 직후 호출)

```js
useFrame((_, delta) => {
  if (phase === 'playing') {
    tickTime(delta * 1000)
    checkSurvivalMilestone()  // ← 추가
    if (useGameStore.getState().elapsedMs >= STAGE_DURATION_SEC * 1000) {
      clearStage()
    }
  }
  // ... 카메라 코드 그대로
})
```

#### HUD.jsx 토스트 (선택적, 권장)

```jsx
const recentMilestone = useGameStore((s) => s.recentMilestone)
const clearMilestone = useGameStore((s) => s.clearMilestone) // 신규 액션

useEffect(() => {
  if (!recentMilestone) return
  const t = setTimeout(() => clearMilestone(), 2000)
  return () => clearTimeout(t)
}, [recentMilestone])

// JSX:
{recentMilestone && (
  <div style={styles.milestoneToast}>
    <div style={styles.milestoneTitle}>{recentMilestone.label}</div>
    <div style={styles.milestoneReward}>+{recentMilestone.gold} 골드</div>
  </div>
)}
```

스타일은 화면 중앙 상단, 큰 텍스트, 페이드인 0.2s + 페이드아웃 0.4s.

### 4-4. 검증 방법

| 시나리오 | 기대 |
|---|---|
| 5분 클리어 완수 | 토스트 4회 등장(1/3/4/5분), 최종 `goldSession` 시계 드랍 + 16 보너스 |
| 2:30에 사망 | 토스트 1회 (1분만), `goldSession` 시계 드랍 + 1 보너스만 |
| `survivalMilestonesHit` 배열 새 게임마다 빈 배열로 리셋 | resetGame 후 시작 시 |
| 같은 마일스톤 중복 지급 안 됨 | tickTime이 빠르게 두 번 호출되어도 1회만 지급 |

### 4-5. 추후 확장

- 마일스톤별 시각 효과 차등화 (1분 = 작은 폭죽, 5분 = 큰 폭죽)
- 광고 보상 옵션 ("광고 보고 보너스 2배") — 광고 SDK 도입 시
- 마일스톤 보너스 = 누적 골드의 일부로 패시브 카탈로그와 연동

---

## 5. 구현 항목 #4 — 보스 등장 3초 카운트다운

### 5-1. 기획 의도

4분 보스 등장이 갑작스러우면 출근길 무음 플레이에서 압박이 과하다. 237s~240s 구간에 화면 중앙에 큰 카운트다운 + 경고색을 표시해 마음의 준비를 시킨다.

### 5-2. 구현 위치

**수정**: `Developer/r3f_prototype/src/components/HUD.jsx` (UI)
**OR 신규**: `Developer/r3f_prototype/src/lib/itemEffects.js`에 `bossWarning` 이벤트 추가 + `VFXLayer` 렌더러 신규

권장: HUD 측 구현 (전체 화면 오버레이라 R3F가 아닌 DOM 처리가 더 자연스러움).

### 5-3. 기술 사양

#### HUD.jsx 추가

```js
const elapsedMs = useGameStore((s) => s.elapsedMs)
const bossSpawned = useGameStore((s) => s.bossSpawned)

// 보스 등장 3초 전 ~ 등장 시점에 카운트다운 표시
const bossWarning = useMemo(() => {
  if (bossSpawned) return null
  if (phase !== 'playing') return null
  const sec = elapsedMs / 1000
  if (sec < 237 || sec >= 240) return null
  const remain = Math.max(0, Math.ceil(240 - sec))
  return remain
}, [elapsedMs, bossSpawned, phase])

// JSX (HUD 안):
{bossWarning != null && (
  <div style={styles.bossWarning}>
    <div style={styles.bossWarningLabel}>보스 출현</div>
    <div style={styles.bossWarningCount}>{bossWarning}</div>
  </div>
)}
```

#### 스타일 사양

- 위치: 화면 중앙 상단 (HUD 타이머 아래)
- 텍스트:
  - "보스 출현" — 18px, 빨강 (#ff4060), 굵게
  - 숫자(3/2/1) — 64px, 빨강, 굵게, 1초마다 깜빡임(blink 0.6s)
- 배경: 반투명 검정 (`rgba(0,0,0,0.55)`) 라운드 박스
- 페이드인 0.2s, 시각 효과: 숫자 변할 때마다 살짝 scale 1.2 → 1.0 펄스

### 5-4. 검증 방법

| 시나리오 | 기대 |
|---|---|
| 4:00 도달 30초 전 (3:30) | 카운트다운 없음 |
| 3:57 ~ 4:00 사이 | "보스 출현 3 → 2 → 1" 카운트다운 표시 |
| 4:00 정확 | 카운트다운 사라짐 + 보스 스폰됨 |
| 4:01 이후 | 카운트다운 표시 안 됨 (재트리거 방지) |
| 사망 / 클리어 / 일시정지 상태 | 카운트다운 표시 안 됨 |

### 5-5. 시각 톤 가이드

빨강은 위험 신호 색상이다. `VFX_COLORS.dangerRed` (`0xd32836`)에서 RGB 추출해 CSS `rgb(211, 40, 54)`로 사용. 외곽선/돌진 경고와 색상 일관성 유지.

---

## 6. 구현 항목 #5 — 타이틀 화면 카피 보강

### 6-1. 기획 의도

현재 타이틀: "게임 시작" / "코인상점" 단순 버튼만 있음. 출근길 직장인이 흥미를 가지려면 **"5분만 버티면, 교문이 열린다"** 같은 짧은 약속 카피가 필요.

### 6-2. 구현 위치

**수정**: `Developer/r3f_prototype/src/App.jsx` `TitleScreen` 컴포넌트

### 6-3. 기술 사양

```jsx
function TitleScreen({ onStart, onCoinShop }) {
  return (
    <div style={styles.blankScreen}>
      <div style={styles.titleText}>Escape! zombie school</div>
      <div style={styles.subtitleText}>5분만 버티면, 교문이 열린다</div>
      <div style={styles.buttonGap} />
      <button type="button" style={styles.primaryButton} onClick={onStart}>
        게임 시작
      </button>
      <button type="button" style={styles.secondaryButton} onClick={onCoinShop}>
        코인상점
      </button>
    </div>
  )
}

// styles 추가:
titleText: {
  color: '#111',
  fontSize: 32,
  fontWeight: 900,
  letterSpacing: 1,
  marginBottom: 8,
},
subtitleText: {
  color: '#444',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 32,
},
buttonGap: {
  height: 8,
},
```

### 6-4. 검증 방법

- 타이틀 화면 진입 → 큰 글씨 "Escape! zombie school" + 작은 부제 "5분만 버티면, 교문이 열린다" 노출
- 아래에 기존 두 버튼 그대로
- 모바일 폭에서도 깨지지 않음 (375px / 390px / 414px)

### 6-5. 카피 풀 (향후 A/B 가능)

- "Escape! zombie school / 5분만 버티면, 교문이 열린다" (기본)
- "오늘도 5분만 버티자"
- "한 판만 하고 출근"
- "이번 역 전까지 살아남기"

기본 카피 적용 후 텔레메트리 도입 시 A/B 테스트.

---

## 7. 구현 항목 #6 — 코인상점 패시브 카탈로그 (별도 기획 선행)

### 7-1. 기획 의도

현재 `CoinShopScreen`은 보유 코인 표시 + 돌아가기 버튼만 있는 placeholder. V.S 스타일 메타프로그레션의 핵심 진입점이므로 별도 큰 기획이 필요하다.

### 7-2. 선행 필요 작업

**Planner 측**:
- 어떤 패시브를 영구 업그레이드 가능하게 할지 (HP / 이동속도 / 기본 데미지 / XP 획득량 / 골드 획득량)
- 가격 곡선 (10/30/80/200/500 골드?)
- 단계별 최대치 (HP +5 → +25 → +50 ...)
- 무기 해금이 메타에 포함되는지 (V.S에는 도감/카드 컬렉션 있음)

**별도 기획 문서 작성 필요**:
- 가칭: `Planner/Essential_game_plan/passive_upgrade_catalog_plan_YYYY-MM-DD.md`
- 본 요청서 §6은 그 기획 완료 후 작성

### 7-3. 본 요청서 범위 외

이 항목은 본 요청서에서 **착수 보류**. 1~5번 완료 후 별도 PR.

---

## 8. 통합 검증 시나리오

위 1~5번이 모두 적용된 상태에서 다음 풀플레이 시나리오 1회 통과:

### 시나리오 A. 5분 풀 클리어
1. 타이틀 → "Escape! zombie school" + 부제 노출 ✓ (#5)
2. 게임 시작 클릭 → 0:00부터 플레이
3. 1:00 도달 → "1분 생존 보너스 +1 골드" 토스트 (#3)
4. 3:00 도달 → "3분 돌파 보너스 +3 골드" 토스트 (#3)
5. 3:57~4:00 → 화면 중앙 "보스 출현 3 / 2 / 1" 카운트다운 (#4)
6. 4:00 → "보스 조우 보너스 +4 골드" 토스트 + 보스 등장 (#3, #4)
7. 5:00 → "학교 탈출 보너스 +8 골드" 토스트 + 클리어 화면 (#3)

### 시나리오 B. 자동 일시정지 (#2)
1. 게임 진행 중 다른 탭 클릭 → 'paused' 진입 + "자리를 비우셨네요" 메시지
2. 게임 탭 복귀 → 이어하기 버튼 강조
3. 이어하기 클릭 → 정확히 그 자리부터 재개

### 시나리오 C. 데이터화 검증 (#1)
1. `STAGE_DURATION_SEC` 값을 180으로 변경
2. 게임 시작 → 정확히 3:00에 클리어 트리거 (마일스톤 1분/3분만 적용됨)
3. 값을 300으로 복원

### 시나리오 D. 회귀 테스트
1. `npm run test` → 24/24 통과
2. `npm run build` → 에러 없이 빌드 성공
3. dev 서버 5분 풀플레이 → 콘솔 에러 0건

---

## 9. 체크리스트 (Developer용)

복사해서 PR description에 사용 가능.

```text
[ ] #1. stageConfig.js 신규 + Game.jsx 임포트 교체
[ ] #2. visibilitychange/pagehide/blur 자동 일시정지
[ ] #2 옵션. pauseSource 분리 + paused 모달 메시지 차등화
[ ] #3. SURVIVAL_MILESTONES 정의 + checkSurvivalMilestone 액션
[ ] #3. Game.jsx tickTime 후 마일스톤 체크 호출
[ ] #3. HUD 토스트 표시 + 2초 후 자동 해제
[ ] #4. HUD 보스 카운트다운 (237~240s)
[ ] #5. TitleScreen 타이틀 + 부제 텍스트 추가

검증:
[ ] npm run build 통과
[ ] npm run test 24/24
[ ] 시나리오 A 풀클리어
[ ] 시나리오 B 자동 일시정지 6 케이스 (위 §3-4)
[ ] 시나리오 C 데이터화 (300/180 토글)
[ ] 시나리오 D 회귀 (콘솔 에러 0)

문서 갱신:
[ ] Bang_Rules.md에 SURVIVAL_MILESTONES 표 추가
[ ] commuter_target_planning_2026-05-14.md §10 상태표에서 ❌ → ✓ 표시
[ ] Developer/tech_stack.md §3-1 / §3-7 영향 항목 갱신
```

---

## 10. 의존성 / 충돌 점검

| 영향 받는 파일 | #1 | #2 | #3 | #4 | #5 |
|---|:---:|:---:|:---:|:---:|:---:|
| `App.jsx` | | ✓ | | | ✓ |
| `Game.jsx` | ✓ | | ✓ | | |
| `HUD.jsx` | | ✓ | ✓ | ✓ | |
| `useGameStore.js` | | ✓ | ✓ | | |
| `lib/stageConfig.js` (NEW) | ✓ | | | | |

충돌 우려 없음. 모든 항목 독립 PR 가능하지만 권장 순서는 #1 → #3 (마일스톤 시간 비교는 5분 데이터화 후가 깔끔) → #2 → #4 → #5.

---

## 11. 비즈니스 영향 요약

| 항목 | 출근길 친화 효과 |
|---|---|
| #1 데이터화 | 0 (인프라) |
| #2 자동 일시정지 | **★★★** "5분 손해" 핵심 페인 해소 |
| #3 마일스톤 보너스 | **★★★** 짧은 플레이도 보상감 + 작은 성취 토스트 |
| #4 보스 카운트다운 | **★★** 무음 플레이 위험 인지 |
| #5 타이틀 카피 | **★** 첫인상 / 의도 전달 |

#1~3번이 출근길 타깃 정체성의 핵심. 1차 출시 전 반드시 들어가야 할 작업.

---

## 12. 참조

- 출처 분석: [`commuter_target_planning_2026-05-14.md`](commuter_target_planning_2026-05-14.md) §10
- 게임 룰 정본: [`Bang_Rules.md`](../../Bang_Rules.md)
- 기술 스택: [`Planner/Tech_plan/tech_stakc.md`](../Tech_plan/tech_stakc.md)
- 엔지니어링 디테일: [`Developer/tech_stack.md`](../../Developer/tech_stack.md)
- VFX 효과 시스템: [`Planner/Tech_plan/effect_sloution.md`](../Tech_plan/effect_sloution.md)
- 이중 화폐 기획: [`Planner/Rewards_Drops/dual_drop_system_2026-05-08.md`](../Rewards_Drops/dual_drop_system_2026-05-08.md)
- 세션 메모리 정본: [`SESSION_CONTINUITY.md`](../../SESSION_CONTINUITY.md)

---

*본 요청서는 Planner 부서가 작성. 구현 검증 후 본 문서의 체크리스트(§9)를 PR description에 사용하고, `commuter_target_planning_2026-05-14.md §10`의 상태표를 갱신할 것.*

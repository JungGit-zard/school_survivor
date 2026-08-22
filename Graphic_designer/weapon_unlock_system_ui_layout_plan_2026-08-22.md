# 무기 해금 체계 모바일 UI 레이아웃 기획

- 작성일: 2026-08-22
- 작성/담당: uimini, Mobile Optimization Resident
- 범위: 로비 `무기` 도감 모달, 코인 상점 `무기 강화` 탭, 결과창 새 무기 해금 알림, 런 중 레벨업 4선택지의 용어 연결
- 제외: 타이틀 화면 문구·버튼·레이아웃·그래픽, Stage 2 boss v2 외 레거시 복구, 신규 사운드/SFX/BGM
- 기준 폭: 320 / 360 / 390 / 412 CSS px 세로 모바일
- 원칙: 이 문서의 색상·크기·문구 제안은 사용자가 별도 지정하지 않은 추천값이다. 사용자 지정값이 생기면 그 값이 정본이다.

## 0. 현재 코드 기준 소스

| 화면 | 현재 파일 | 확인한 현재 구조 | 모바일 리스크 |
| --- | --- | --- | --- |
| 로비 진입점 | `Developer/r3f_prototype/src/components/Lobby.jsx` | 하단 4버튼 nav, `무기` 버튼이 `WeaponModal`을 연다. 하단 버튼 `minHeight: 48`, safe-area bottom 반영. | 진입점은 유지 가능. 새 해금 배지를 붙일 경우 4등분 nav에서 텍스트와 겹치지 않게 14~18px 점 배지만 사용. |
| 무기 도감 모달 | `Developer/r3f_prototype/src/components/WeaponModal.jsx` | 해금 수, 무기명, 해금/잠김 태그, 조건 목록, 누적 조건 `현재/목표` 진행률, 하단 닫기 버튼 `minHeight: 46`. | 목록 행에 아이콘·상세 CTA가 없고, 잠긴 조건이 긴 경우 320px에서 정보 위계가 약해질 수 있다. |
| 코인 상점 shell | `Developer/r3f_prototype/src/components/CoinShop.jsx` | max width 430, header, 2탭 grid, `무기 강화` 탭은 `WeaponPermanentUpgradeList`. 뒤로 버튼 `minHeight: 49`. | 탭 버튼 `minHeight: 38`은 모바일 반복 조작 기준 44px 미만. |
| 무기 영구 강화 카드 | `Developer/r3f_prototype/src/components/WeaponPermanentUpgradeList.jsx` | 해금 무기 우선 정렬, 아이콘, 현재/다음 강화, 가격, 구매/잠김/최대 버튼. | 카드 action 버튼 `minHeight: 32`는 반복 구매/잠김 조건 보기 버튼 기준 44px 미만. 효과/다음 줄은 ellipsis라 320px에서 의미가 잘릴 수 있다. |
| 런 중 레벨업 | `Developer/r3f_prototype/src/components/HUD.jsx` | 4선택지, `pickFour()`, 보장 후속 카드, 모바일 `max-width:360px`에서 카드 높이·문구 축소. `levelupChoiceBtn minHeight:132`. | 카드 수/배치는 유지. 계정 해금과 런 중 획득 용어가 혼동되지 않도록 문구만 정리. |
| 퀘스트 가방 | `Developer/r3f_prototype/src/components/HUD.jsx` | `questInventoryOpen`일 때 `role="dialog"` aside, 모바일 `max-width:600px`에서 bottom sheet 성격, 패널 `maxHeight:72dvh`, 가방 버튼 44px. | 무기 도감과 섞지 않는다. 단, quest close 버튼은 현재 36px라 별도 quest-bag 개선 시 44px 후보지만 이번 무기 기획 범위에서는 runtime 수정하지 않는다. |

## 1. 모바일 정보 구조

### 용어

- 계정 해금: 누적 기록 또는 한 런 업적으로 무기 도감에 영구 등록되는 상태. 이후 레벨업 획득 후보가 될 수 있다.
- 런 중 획득: 해당 게임 한 판에서 레벨업 카드로 무기를 실제 보유하는 상태. 카드 문구는 `해금`이 아니라 `획득`을 쓴다.
- 진화/조합 무기: 하나코, 바이키티 커터칼, 선긋기처럼 이번 판 선행 무기 보유 조건이 있는 무기. `계정 잠김`과 분리해 `조합 조건`으로 표기한다.
- 영구 강화: 코인 상점에서 해금된 무기의 계정 성장치를 올리는 상태. 잠긴 무기의 구매 버튼은 `잠김` 대신 `조건 보기`로 도감 상세에 연결한다.

### 추천 흐름

```text
런 종료
  ├─ 새 무기 해금 알림: [무기 도감 보기] [계속]
  └─ 로비 하단 [무기] 버튼 우상단 NEW 점 배지
        └─ 무기 도감
             ├─ 목록 필터: 전체 / 해금 / 잠김 / NEW
             ├─ 무기 상세: 조건·런 중 등장 조건·영구 강화 요약
             └─ [영구 강화로 이동] → 코인 상점 > 무기 강화 탭
```

## 2. 320px 기준 모바일 레이아웃

### 2.1 로비 하단 진입

현재 `Lobby.jsx` 하단 nav는 유지한다.

```text
┌────────────────────────────────┐
│ [무기] [랭킹] [상점] [미션]       │ 48px 이상, safe-area bottom 포함
└────────────────────────────────┘
```

요구사항:

- 버튼은 현재처럼 4등분 유지, `minHeight: 48` 유지.
- 새 해금 배지는 `무기` 버튼 내부 우상단에 14~18px 원형 `NEW` 또는 점 배지로만 추가한다.
- 320px에서 각 칸 폭은 약 70px 수준이므로 배지 문자는 9px 이하 또는 점+aria-label로 처리한다.
- 배지는 읽음 상태 전용이다. 해금 자체의 정본은 도감/기록 데이터이며, 배지 저장 실패가 게임 진행을 막으면 안 된다.

### 2.2 무기 도감 모달 목록

모달은 모바일에서 화면형 bottom/sheet가 아니라 현재 중앙 overlay를 유지하되, 높이 계산을 `100dvh` 기반으로 제한한다.

권장 컨테이너:

- overlay: `position: fixed; inset: 0; padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom));`
- dialog: `width: min(430px, 100%); max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 20px); display:flex; flex-direction:column;`
- 목록: `min-height:0; overflow-y:auto; overscroll-behavior:contain;`
- 닫기 버튼: 현재 `minHeight:46` 유지.

320px 목록 행 wireframe:

```text
┌──────────────────────────────┐
│ 무기 도감              12/20 │
│ 계정 해금 무기는 레벨업에 등장 │
│ [전체] [해금] [잠김] [NEW]    │ 44px 이상
├──────────────────────────────┤
│ [48 아이콘] 30cm 자   [해금] │
│          근접 · 방어 · Lv2+  │
│          현재 영구 Lv.1       │ 72~88px row
├──────────────────────────────┤
│ [48 실루엣] 상어미사일 [잠김] │
│          누적 처치 640/5000  │
│          █████░░░░░          │
└──────────────────────────────┘
```

목록 행 규칙:

- 행 전체가 상세 진입 버튼이다. 작은 `›`만 눌러야 하는 구조 금지.
- 행 최소 높이 72px, 조건 2줄+진행률이 들어가는 잠김 행은 88px까지 허용.
- 아이콘 프레임은 48×48, 잠김은 grayscale/opacity만 쓰지 말고 `[잠김]` 텍스트 태그를 함께 표시.
- 무기명은 1줄 ellipsis, 조건/역할은 2줄 clamp까지 허용.
- 해금/잠김/NEW 필터 버튼은 4등분 grid, `minHeight:44`, gap 6 이하.
- 320px에서 horizontal overflow 금지. `minWidth:0`, `boxSizing:'border-box'`, 긴 문구는 `overflowWrap:'anywhere'` 또는 2줄 clamp 사용.

### 2.3 무기 상세 모달

목록 내부 상세 drill-in 또는 같은 모달 내 상세 상태로 구현한다. 새 라우트는 만들지 않는다.

```text
┌──────────────────────────────┐
│ ‹ 무기 도감                   │ 44px back target
│        [72 아이콘/실루엣]      │
│ 상어미사일             [잠김] │
│ 원거리 · 유도 · 광역          │
├──────────────────────────────┤
│ 해금 조건 — 아래 중 하나      │
│ ○ 스테이지 1 클리어 0/1       │
│ ○ 누적 플레이 6/8회           │
│                              │
│ 런 중 등장 조건               │
│ 레벨 8 이상 · 무기 슬롯 여유  │
│                              │
│ [닫기]                        │ 46px 유지
└──────────────────────────────┘
```

해금된 상세는 같은 위치에 다음 블록을 추가한다.

```text
영구 강화
현재 Lv.1: 피해 +3%
다음 Lv.2: 피해 +6%
[영구 강화로 이동] 44px 이상
```

상세 규칙:

- Back/닫기/영구 강화 CTA는 모두 44×44 CSS px 이상.
- 조건은 현재 `WeaponModal.jsx`의 `describeCondition()` 결과를 재사용한다.
- 한 런 조건은 실시간 HUD 진행률을 새로 만들지 않고 목표만 도감/상세에 공개한다.
- 여러 조건은 현재 규칙처럼 `아래 중 하나`를 명시한다.
- 스크린리더 이름은 `무기명 + 상태 + 주요 조건` 조합으로 제공한다.

## 3. 코인 상점 `무기 강화` 탭 모바일 레이아웃

현재 `CoinShop.jsx`의 max width 430 구조는 유지한다. 단, 모바일 터치 기준을 맞춘다.

### 3.1 shell

```text
┌──────────────────────────────┐
│ 코인 상점              🪙123 │
│ [패시브 강화] [무기 강화]    │ 44px 이상
├──────────────────────────────┤
│ 무기 영구 강화 안내          │
│ [카드]                       │
│ [카드]                       │
│ ...                          │
│ [로비로]                     │ 49px 유지
└──────────────────────────────┘
```

필수 수정 권장:

- `CoinShop.jsx` `tabButton`/`tabActive` `minHeight: 38` → `minHeight: 44`.
- header/tabs/list width `min(100%, 430px)` 유지.
- root는 모바일 브라우저 높이 변화가 있는 경우 상위 래퍼에서 `100dvh` 또는 검증된 full-height wrapper를 사용한다. 이 화면 자체는 `height:'100%'` 유지 가능하나 QA에서 100vh 잘림을 확인한다.

### 3.2 무기 강화 카드

320px 카드 wireframe:

```text
┌──────────────────────────────┐
│ [48 아이콘] 연필        Lv.2 │
│ 현재: 피해 +3%               │
│ 다음: 피해 +6%               │
│ 가격 120 🪙                  │
│ [강화하기]                   │ 44px 이상
└──────────────────────────────┘
```

잠김 카드:

```text
┌──────────────────────────────┐
│ [48 실루엣] 상어미사일 [잠김] │
│ 계정 해금 후 영구 강화 가능  │
│ 누적 처치 640/5000           │
│ [조건 보기]                  │ 44px 이상, 도감 상세 연결
└──────────────────────────────┘
```

필수 수정 권장:

- `WeaponPermanentUpgradeList.jsx` 반복 action 버튼 `minHeight: 32` → `minHeight: 44`.
- 잠긴 무기 버튼 문구는 비활성 `잠김`만 두지 말고 `조건 보기` CTA로 변경한다. 단, 실제 상세 연결이 아직 없으면 1차 구현은 disabled 상태를 유지하되 계획 주석/테스트를 남기지 말고 후속 task로 분리한다.
- `effect`/`next` 텍스트는 320px에서 1줄 ellipsis만 쓰면 의미 손실이 크므로 카드 본문에서는 2줄 clamp를 허용한다.
- 구매 가능/코인 부족/최대/잠김은 색상뿐 아니라 텍스트로 구분한다.
- 구매 버튼이 disabled여도 hit area는 44px 이상 유지한다.

## 4. 결과창 새 해금 알림

런 종료 시점에 현재처럼 계정 해금 판정을 유지한다. 알림은 자동 닫힘 없이 결과창 내부 섹션으로 배치한다.

```text
새 무기 해금!
[48 아이콘] 상어미사일
해금 이유: 스테이지 1 클리어
이제 레벨업 선택지에서 등장합니다.
[무기 도감 보기] [계속]
```

규칙:

- 여러 무기가 동시에 해금되면 48 아이콘 목록으로 세로 표시한다.
- 결과창 버튼도 44px 이상. 기존 결과창 버튼 높이가 작다면 같이 상향한다.
- `무기 도감 보기`는 로비로 돌아간 뒤 도감 모달을 여는 흐름이어야 한다. 게임플레이 Canvas 위에 도감/상점을 직접 중첩하지 않는다.
- `role="status"` 또는 제목-설명 연결로 새 해금 알림을 한 번만 읽게 한다.
- Firebase 저장 실패 안내는 비차단 문구로만 표시한다. 해금 표시/현재 플레이/레벨업 진행을 막지 않는다.

## 5. 런 중 레벨업 4선택지와의 관계

`HUD.jsx`의 현재 4카드 구조를 유지한다.

현재 기준:

- `pickFour()`는 4개 후보를 고정한다.
- `pendingGuaranteedUpgradeChoiceKeys` 보장 후속 카드가 먼저 들어간다.
- 계정 잠김 무기는 `isWeaponUnlocked()`를 통과하지 않으면 획득 후보가 되지 않는다.
- `max-width:360px`에서 `.levelup-upgrade-choice`는 최소 126px로 줄고 텍스트 clamp가 적용된다.

기획 규칙:

- 카드 수를 늘리지 않는다.
- 잠긴 무기를 `잠김` 카드로 섞어 선택지를 낭비하지 않는다.
- 획득 카드 설명에는 `해금` 대신 `획득`을 쓴다. 현재 `getUpgradeChoiceDesc()`가 acquire 설명의 `해금`을 `획득`으로 치환하는 방향은 유지한다.
- 모바일 세로 화면에서 4카드는 2×2 또는 현재 4열이 실제로 유지 가능한지 QA로 확인한다. 현재 코드는 `repeat(4, 1fr)`이므로 320px에서 카드 폭 약 65px가 된다. 텍스트 가독성이 부족하면 360px 이하에서 `gridTemplateColumns:'repeat(2, minmax(0, 1fr))'`로 바꾸는 것을 1순위 후보로 둔다.
- 레벨업 화면에는 계정 해금 조건 진행률을 넣지 않는다. 전체 정보는 도감 상세에서 제공한다.

## 6. 접근성·상태·빈 화면

상태별 요구사항:

| 상태 | 도감 목록 | 상세 | 상점 카드 |
| --- | --- | --- | --- |
| 해금 | `[해금]`, 역할, 현재 영구 Lv 표시 | 영구 강화 요약, `영구 강화로 이동` | 구매 가능/부족/최대 표시 |
| 잠김 | `[잠김]`, 대표 조건과 진행률 | 전체 조건, 한 런/누적 구분 | `조건 보기` CTA 또는 disabled 44px 버튼 |
| NEW | `[NEW]` 태그, 목록 상단 또는 NEW 필터 | 첫 확인 시 읽음 처리 | 영구 강화 가능하면 일반 해금 카드와 동일 |
| 최대 | 해금과 동일 | 현재 최대 안내 | `최대 레벨` 44px disabled 버튼 |
| 빈 필터 | `해당 무기가 없습니다` + `[전체 보기]` | 해당 없음 | 해당 없음 |
| 로딩/저장 실패 | 해금 정본을 숨기지 않음 | 비차단 안내 | 구매 실패는 카드 인라인 error |

접근성:

- 아이콘이 장식이면 `alt=""`, 상태 전달은 텍스트/aria-label에서 처리한다.
- 모달 open 시 제목 또는 닫기 버튼에 focus, close 시 로비 `무기` 버튼으로 focus 복귀.
- Esc/스크림 닫기 지원. 단, 구매 확인 등 destructive 확인이 없다면 스크림 닫기는 허용 가능.
- `:focus-visible` outline은 현재 HUD처럼 3px 이상 고대비로 유지.
- 색상만으로 `구매 가능/부족/잠김/최대`를 구분하지 않는다.

## 7. 구현 파일별 작업 계획

1. `Developer/r3f_prototype/src/components/WeaponModal.jsx`
   - 목록 행에 48px 아이콘/실루엣 프레임 추가.
   - 필터 `전체/해금/잠김/NEW` 추가, 각 버튼 `minHeight:44`.
   - 상세 drill-in state 추가: 선택한 weaponId를 같은 모달 안에서 표시.
   - dialog max-height를 `100dvh`/safe-area 기준으로 제한.
   - 조건 문구는 기존 `describeCondition()` 재사용.

2. `Developer/r3f_prototype/src/components/CoinShop.jsx`
   - `tabButton`/`tabActive` `minHeight`를 44 이상으로 상향.
   - header/tabs/list의 `minWidth:0`와 overflow 안전성 확인.

3. `Developer/r3f_prototype/src/components/WeaponPermanentUpgradeList.jsx`
   - action 버튼 `minHeight`를 44 이상으로 상향.
   - 효과/다음 강화 문구 2줄 clamp 허용.
   - 잠김 카드는 `조건 보기` 문구/CTA 구조로 바꿀 준비. 실제 도감 상세 연결 prop이 없으면 후속으로 분리.

4. `Developer/r3f_prototype/src/components/HUD.jsx`
   - 레벨업 카드 문구는 `획득` 유지.
   - 320/360px에서 현재 4열 카드 가독성이 실패하면 media query로 2×2 전환.
   - 계정 해금 조건 진행률은 HUD에 추가하지 않는다.

5. i18n 관련 파일
   - `Developer/r3f_prototype/src/lib/i18n.js` 또는 현재 i18n 키 위치에 `weaponDex.*`, `weaponPermanent.*`, `newWeapon.*` 문구 추가.
   - 한국어/영어 긴 문자열 2줄 기준으로 검수.

6. 테스트 후보
   - `Developer/r3f_prototype/src/components/CoinShop.test.jsx`: 탭/버튼 role, weapon tab, disabled/max/buy 상태.
   - `Developer/r3f_prototype/src/components/Lobby.test.jsx`: 로비 무기 버튼, NEW 배지, 모달 open/close.
   - 신규 또는 기존 `WeaponModal` 테스트: 필터, 상세 drill-in, 조건 표시.
   - `Developer/r3f_prototype/src/components/HUD.test.jsx`: levelup acquire copy가 `획득`으로 표시되는지.

## 8. 모바일 QA 인수 기준

반드시 확인할 폭:

- 320×568
- 360×640
- 390×844
- 412×915

공통 pass 기준:

- 가로 스크롤이 없다.
- 모달이 notch/status bar/home indicator를 침범하지 않는다.
- 도감 필터/닫기/상세 back/영구 강화 CTA/상점 탭/상점 action 버튼이 모두 44px 이상이다.
- 도감 목록 한 행은 320px에서 무기명, 상태, 대표 조건 또는 역할을 읽을 수 있다.
- 잠김 조건의 숫자 진행률이 잘리지 않는다.
- 상점 `무기 강화` 탭에서 구매 가능/코인 부족/잠김/최대가 색상 없이 텍스트만으로도 구분된다.
- 레벨업 4선택지는 320px에서 텍스트가 과도하게 잘리지 않고, 선택 버튼 터치 영역이 충분하다.
- production/mobile tester build에서 debug/admin UI가 기본 노출되지 않는다.

권장 검증 명령:

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- CoinShop.test.jsx Lobby.test.jsx HUD.test.jsx
npm run build
```

브라우저 수동 검증:

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm run dev -- --host 127.0.0.1
```

그 뒤 DevTools device toolbar 또는 Playwright/브라우저 스냅샷으로 320/360/390/412 CSS px를 각각 확인한다.

## 9. 후속 분담

- uimini: 위 모바일 UI 구현/검수 주 담당.
- levelmini: 무기 해금 조건, 런 중 등장 조건, 보장 후속 카드 규칙이 UI 문구와 실제 gameplay flow에 맞는지 확인.
- balanceqa: 320/360/390/412 폭, 반복 구매 터치, 레벨업 카드 가독성, 저장 실패/잠김/최대 상태 QA.
- threemini: 아이콘/실루엣 프레임에 3D/R3F 그래픽 자산 연동이 필요할 때만 협업.
- soundmini: 이 기획은 신규 소리를 만들지 않는다. 새 해금 알림 SFX/BGM/voice/WebAudio/Howler 변경이 생기면 반드시 soundmini에 별도 태스크로 보낸다.

## 10. 현재 계획 기준 최우선 수정 후보

1. `CoinShop.jsx` 탭 버튼 38px → 44px.
2. `WeaponPermanentUpgradeList.jsx` 반복 action 버튼 32px → 44px.
3. `WeaponModal.jsx` 도감 목록에 48px 아이콘/실루엣과 44px 필터 추가.
4. `WeaponModal.jsx` dialog height를 safe-area + `100dvh` 기준으로 제한.
5. `HUD.jsx` 320/360px 레벨업 선택지 4열 가독성 실측 후 필요 시 2×2 media query 적용.

# Firebase Studio canonical loading gate UI spec — 2026-07-15

Role: UI_Mini / Mobile Optimization Resident
Task: t_6ce054dc
Scope: read-only audit + UI specification artifact only. No source edits, no commit, no push, no deploy.
Project: Escape! zombie school

## 0. Problem statement

현재 `App.jsx`는 일반 게임 루트에서 바로 `screen === 'title'`일 때 `TitleScreen`을 렌더링한다.
`TitleScreen.jsx`는 마운트 즉시 `<Canvas>`와 `<TitleScene3D reducedEffects={false} />`를 띄우고, `TitleScene3D.jsx`는 내부에서 `StudioTunedGroup itemId="title-scene"`를 통해 로컬 Graphics Studio 튜닝을 적용한다.

Firebase에 저장된 Graphics Studio 정본 snapshot을 타이틀보다 늦게 불러오면 다음 문제가 생긴다.

- 첫 프레임에 default 모델/위치/색상이 보임
- 오래된 localStorage 튜닝이 먼저 보였다가 Firebase 정본으로 교체됨
- 3D 타이틀 애니메이션이 이미 시작된 뒤 모델이 순간 이동/색상 변경되어 “스튜디오 동기화 실패”처럼 보임

따라서 게임 일반 루트는 Firebase canonical Graphics Studio snapshot이 성공적으로 적용되기 전까지 `TitleScreen`과 `TitleScene3D`를 절대 렌더링하지 않는 gate가 필요하다.

## 1. Exact App insertion point

파일: `Developer/r3f_prototype/src/App.jsx`

정확한 삽입 위치:

1. import 영역에는 canonical gate hook/component import를 추가한다.
   - 현재 import 마지막 근처: `studioGameBridge.js` import 직후가 가장 자연스럽다.

2. `App()` 내부에서는 admin / graphics-studio route guard 뒤, `screen` state 선언보다 앞에 gate hook을 둔다.
   - 현재 코드 기준:

```jsx
export default function App() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  if (isAdminRoute) return <AdminPage />
  const isGraphicsStudioRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/graphics-studio')
  if (isGraphicsStudioRoute) return <GraphicsStudio />

  // INSERT HERE: useFirebaseStudioCanonicalGate()

  const [screen, setScreen] = useState('title')
```

3. render 반환부에서는 `<div style={styles.phoneFrame}>` 안쪽의 첫 자식, `<SfxLayer />` 다음이 아니라 `phoneFrame` 안에서 모든 screen 조건부 렌더보다 먼저 gate blocking branch를 둔다.
   - 권장 구조:

```jsx
return (
  <div style={styles.viewport}>
    <SfxLayer />
    <div ref={phoneFrameRef} style={styles.phoneFrame}>
      {studioGate.status !== 'ready' ? (
        <FirebaseStudioSyncGate
          status={studioGate.status}
          error={studioGate.error}
          onRetry={studioGate.retry}
        />
      ) : (
        <>
          {screen === 'title' && <TitleScreen ... />}
          {screen === 'lobby' && <Lobby ... />}
          ...
        </>
      )}
    </div>
  </div>
)
```

중요: gate가 `ready`가 되기 전에는 `TitleScreen` 자체를 렌더링하지 않는다. `<TitleScreen>`을 렌더한 뒤 그 위에 overlay를 덮는 방식은 금지한다. overlay 방식은 Canvas 첫 프레임이 이미 그려질 수 있어 default/stale flash를 막지 못한다.

## 2. Required state model

권장 상태값은 4개만 사용한다.

```ts
type StudioCanonicalGateStatus = 'loading' | 'ready' | 'error' | 'offline-fallback-blocked'
```

상태 의미:

- `loading`: Firebase 정본 snapshot 요청 중. title 렌더 금지.
- `ready`: Firebase 정본 snapshot을 normalize하고 localStorage/runtime store에 적용 완료. 이때만 title/lobby/game UI 렌더 허용.
- `error`: Firebase 요청이 실패했거나 snapshot schema가 무효. title 렌더 금지, 재시도 버튼 표시.
- `offline-fallback-blocked`: 오프라인/timeout으로 정본 확인 불가. stale/default flash 방지를 우선하므로 자동 local fallback 렌더 금지. 사용자는 재시도만 가능.

이 gate는 “무조건 보이게 하기”보다 “잘못된 타이틀을 보이지 않게 하기”가 목표다.

## 3. Data application order

정본 적용 순서:

1. Firebase canonical snapshot fetch 시작
2. snapshot schema/version 확인
3. `tunings`, `stageBossPreview`, `decals`, `propPlacements` 등 현재 Graphics Studio가 타이틀에 영향을 줄 수 있는 값을 normalize
4. 기존 stale localStorage를 먼저 비우거나, canonical 값으로 원자적으로 overwrite
5. `saveStudioTunings`, `saveStageBossPreview`, `saveTextureDecals`, `saveStagePropPlacements`와 같은 기존 저장 함수 또는 동등한 적용 함수를 호출
6. 필요한 change event dispatch가 끝난 뒤 `status='ready'`
7. 그 다음에만 `TitleScreen` 렌더

금지 순서:

- localStorage 값을 읽어 title을 먼저 렌더 → Firebase 도착 후 교체
- `ready` 전에 `TitleScene3D` Canvas mount
- 실패 시 default tuning으로 title 자동 진입

## 4. Minimal mobile-safe loading UI

Target viewport: 390 x 844 CSS px.

레이아웃:

- full phoneFrame overlay가 아니라 gate-only screen. `phoneFrame` 전체를 차지한다.
- background: `#0a0810` 또는 현재 viewport 배경과 동일한 어두운 톤.
- 중앙 카드 폭: `min(320px, calc(100% - 40px))`
- 카드 padding: 18px 16px
- border radius: 14px
- border: 2px solid `rgba(255,243,186,0.48)`
- safe area: top/bottom `env(safe-area-inset-*)` 고려. 중앙 정렬이지만 작은 화면에서 `padding: max(20px, env(...))` 유지.

390x844 기준 배치:

```text
┌──────────────────────── 390 ────────────────────────┐
│                                                       │
│                                                       │
│              [작은 학교/동기화 아이콘]               │
│                                                       │
│        그래픽 스튜디오 동기화 중                      │
│        타이틀 장면을 불러오기 전에                   │
│        최신 모델을 확인하고 있어요.                  │
│                                                       │
│        [ 진행 점 3개 / spinner ]                      │
│                                                       │
│        잠시만 기다려 주세요                           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

권장 텍스트 크기:

- heading: 20px, line-height 1.2, font-weight 900
- body: 14px, line-height 1.45, font-weight 700
- helper: 12px, line-height 1.35
- retry button: min-height 48px, font-size 16px

390x844 가독성 판정:

- heading 1줄 또는 최대 2줄
- body 2~3줄
- 카드 전체 높이 약 220~280px 이내
- 하단 홈 인디케이터 영역과 겹치지 않음
- 어두운 배경 위 밝은 크림/노랑 계열 텍스트로 4.5:1 이상 명도 대비 목표

## 5. Korean copy

Loading:

- 제목: `그래픽 스튜디오 동기화 중`
- 본문: `타이틀 장면을 불러오기 전에 최신 모델을 확인하고 있어요.`
- 보조문: `잠시만 기다려 주세요`
- 접근성 라이브 문구: `그래픽 스튜디오 최신 설정을 불러오는 중입니다.`

Error:

- 제목: `타이틀 장면을 불러오지 못했어요`
- 본문: `기본 모델이 먼저 보이지 않도록 잠시 멈췄습니다.`
- 보조문: `네트워크를 확인한 뒤 다시 시도해 주세요.`
- 버튼: `다시 시도`
- 접근성 라이브 문구: `그래픽 스튜디오 설정을 불러오지 못했습니다. 다시 시도할 수 있습니다.`

Offline / timeout blocked:

- 제목: `최신 그래픽 확인이 필요해요`
- 본문: `오래된 타이틀 장면이 보이지 않도록 시작을 멈췄습니다.`
- 보조문: `연결이 돌아오면 다시 시도해 주세요.`
- 버튼: `다시 시도`

금지 문구:

- `기본 모델로 계속하기`
- `오프라인으로 시작`
- `나중에 동기화`

위 문구들은 stale/default visual flash를 허용하는 의미라 이번 gate 목표와 충돌한다.

## 6. Keyboard and accessibility

필수:

- gate root: `role="status"` + `aria-live="polite"` for loading
- error card: `role="alertdialog"` 또는 `role="alert"` + retry button
- retry button은 실제 `<button type="button">` 사용
- retry button min touch target: 48 x 48 CSS px
- keyboard:
  - error/offline 상태에서 Enter 또는 Space는 focused retry button으로 재시도 가능
  - Escape는 아무 동작도 하지 않음. 닫아서 title을 보이게 하면 안 됨
- focus:
  - loading 중 focusable element 없음
  - error/offline 진입 시 retry button에 focus 이동 권장
  - 재시도 시작 시 버튼 disabled + `다시 시도 중...` 또는 loading 화면으로 전환
- motion:
  - spinner는 CSS opacity/scale 정도로 제한
  - `prefers-reduced-motion: reduce`일 때 회전 애니메이션 제거, 정적 점 3개 표시

## 7. Retry behavior

Retry flow:

1. 사용자가 `다시 시도` 클릭 또는 버튼 focused 상태에서 Enter/Space
2. 상태를 즉시 `loading`으로 전환하거나 button disabled로 전환
3. 이전 error message는 화면에서 제거하거나 보조 영역에만 남김
4. Firebase canonical snapshot을 새로 fetch
5. 성공 시 canonical 적용 완료 후 `ready`
6. 실패 시 `error` 또는 `offline-fallback-blocked`로 복귀

Retry 중 금지:

- retry 버튼 연타로 여러 fetch 중첩
- 실패 직후 자동으로 localStorage/default title 렌더
- timeout 후 default 렌더

권장 timeout:

- 모바일 첫 진입: 8~10초
- timeout은 `offline-fallback-blocked`로 처리하고, 자동 우회하지 않는다.

## 8. No stale/default visual flash acceptance rules

구현 acceptance는 다음 조건을 만족해야 한다.

1. Firebase canonical fetch pending 상태에서 DOM에 `TitleScreen`의 `<Canvas>`가 존재하지 않는다.
2. pending 상태에서 `TitleScene3D`가 mount되지 않는다.
3. error/offline 상태에서도 title canvas는 존재하지 않는다.
4. ready 전에는 `screen === 'title'` branch가 실행되지 않는다.
5. canonical snapshot 적용 함수가 resolve된 뒤에만 `ready`가 된다.
6. Firebase snapshot이 비어 있거나 schema invalid면 default title로 넘어가지 않고 error/offline gate를 보여준다.
7. stale localStorage가 있어도 first visible title frame은 Firebase canonical 값 기준이다.

권장 테스트 이름:

- `App shows studio sync gate before mounting TitleScreen`
- `App does not mount TitleScene3D while canonical snapshot is loading`
- `App blocks title on canonical snapshot error and exposes retry`
- `App mounts title only after canonical snapshot is applied`

## 9. Visual style direction

이 gate는 게임 타이틀 자체를 대체하는 splash가 아니다. 짧고 차분한 “검문소”처럼 보여야 한다.

- 톤: 어두운 밤 학교 + 크림색 칠판 안내문
- 장식: 작은 3점 loading indicator 또는 책/칠판 아이콘 정도
- 금지: 실제 타이틀 캐릭터/좀비 모델 미리보기, default 3D 씬 배경, Graphics Studio 편집 UI 노출

이유: 모델이 아직 canonical인지 확인되지 않았으므로, 3D 자산을 gate 안에서 먼저 보여주면 같은 flash 문제가 재발한다.

## 10. Implementation handoff summary

가장 작은 안전 구현은 다음 2개 단위다.

1. `lib/firebaseStudioCanonicalSnapshot.js` 또는 동등 모듈
   - Firebase canonical snapshot fetch
   - schema/version normalize
   - existing Graphics Studio storage apply
   - retry-safe single-flight 처리

2. `components/FirebaseStudioSyncGate.jsx` + App hook
   - loading/error/offline UI
   - retry button/focus/a11y
   - `App.jsx` route guard 뒤, title/lobby/game branch 앞에서 blocking

중요한 구현 원칙:

- `/graphics-studio` route는 gate를 타지 않는다. Studio 자체가 정본을 관리/편집해야 하기 때문이다.
- `/admin` route도 기존처럼 먼저 반환한다.
- 일반 `/` game route만 gate 대상이다.
- gate는 source-code default를 숨기는 장치이지, 스튜디오 snapshot 실패를 조용히 무시하는 장치가 아니다.

## 11. Files inspected for this spec

- `project_develop_policy.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `Developer/agent_room/game_development_kanban_process.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- `Developer/agent_room/antigravity_ide_subagent_handoff.md`
- `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md`
- `SESSION_MEMORY.md` latest entry
- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
- `Developer/r3f_prototype/src/lib/studioGameBridge.js`
- `Graphic_designer/graphics_studio_ingame_visual_parity_2026-06-23.md`
- `Graphic_designer/graphics_studio_game_url_bridge_visual_2026-07-05.md`

## 12. Verification performed

- gstack check: `GSTACK_OK`
- git status checked before writing; existing dirty worktree preserved.
- Direct file inspection confirmed the title canvas currently mounts inside `TitleScreen.jsx` and is selected from `App.jsx` while `screen === 'title'`.
- This task produced a UI/design handoff document only; no source implementation, test execution, commit, push, or deploy was performed.

---
title: "Result-gated passive shop flow in a Zustand R3F game"
date: 2026-05-17
category: architecture-patterns
module: passive-shop-flow
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - "A meta-progression shop should open only after a completed run"
  - "The result modal must survive leaving and returning from a separate shop screen"
  - "A lightweight React screen state is already used above a Zustand game store"
tags: [coin-shop, result-screen, passive-upgrades, zustand, r3f, meta-progression]
related_components: [App, HUD, TitleScreen, CoinShop, useGameStore]
---

# Result-gated passive shop flow in a Zustand R3F game

## Context

Escape! zombie school의 패시브 코인상점은 영구 성장 루프의 핵심이지만, MVP에서는 타이틀 화면에서 바로 들어가는 흐름이 초보자에게 덜 자연스럽다. 제품 결정은 다음 순서였다.

```text
Play one run -> see earned coins -> enter shop -> buy upgrade -> return to result -> choose next action
```

이 요구는 단순한 버튼 위치 변경이 아니다. 상점은 별도 화면이어야 하지만, 상점에서 돌아왔을 때 `gameover` 또는 `cleared` 결과 모달이 그대로 보여야 한다. 즉, 화면 라우팅은 바뀌어도 런 결과 상태는 리셋되면 안 된다.

세션 기록에서는 이전에 타이틀 화면과 임시 코인상점 진입점이 먼저 추가되었고, 이후 패시브 상점 MVP가 `goldTotal`, `localStorage`, `CoinShop` 중심으로 구현되었다(session history). 이번 작업은 그 흐름을 제품 루프에 맞게 다시 게이트 처리한 후속 패턴이다.

## Guidance

상점 진입 권한은 **결과 모달**에 두고, 상점 자체는 기존처럼 최상위 화면으로 유지한다. 핵심은 `App.jsx`의 `screen` 값과 Zustand의 `phase` 값을 서로 다른 책임으로 나누는 것이다.

- `screen`: 현재 최상위 React 화면. `title`, `game`, `coinShop`처럼 화면 전환만 담당한다.
- `phase`: 실제 게임 진행 상태. `playing`, `gameover`, `cleared`처럼 런 결과를 보존한다.

구현 형태:

```jsx
// App.jsx
{screen === 'coinShop' && (
  <CoinShop onBack={() => setScreen('game')} />
)}

{screen === 'game' && (
  <>
    <Canvas>{/* game scene */}</Canvas>
    <HUD onOpenCoinShop={() => setScreen('coinShop')} />
  </>
)}
```

`CoinShop`의 뒤로 가기는 `title`이 아니라 `game`으로 돌아간다. 이때 `resetGame()`을 호출하지 않기 때문에 Zustand store의 `phase`는 여전히 `gameover` 또는 `cleared`이고, `HUD`는 같은 결과 모달을 다시 렌더링한다.

결과 모달 쪽은 두 종료 상태 모두 같은 진입점을 제공한다.

```jsx
// HUD.jsx
{phase === 'gameover' && (
  <button style={styles.shopBtn} onClick={onOpenCoinShop}>코인상점</button>
)}

{phase === 'cleared' && (
  <button style={styles.shopBtn} onClick={onOpenCoinShop}>코인상점</button>
)}
```

타이틀 화면에서는 상점 진입을 제거한다.

```jsx
// TitleScreen.jsx
export default function TitleScreen({ onStart }) {
  return (
    <button type="button" onClick={onStart}>
      게임 시작
    </button>
  )
}
```

## Why This Matters

이 패턴은 초보자 루프를 선명하게 만든다. 플레이어는 먼저 한 판을 끝내고, 방금 번 코인을 확인한 뒤, 자연스럽게 상점으로 들어간다. 타이틀 화면에서 상점을 먼저 보여주면 아직 코인의 의미를 모르는 상태에서 영구 성장 UI를 마주하게 된다.

기술적으로도 이 방식은 리스크가 낮다. `CoinShop`을 결과 모달 안에 직접 끼워 넣지 않으므로 상점 UI가 커져도 HUD가 비대해지지 않는다. 동시에 `phase`를 리셋하지 않기 때문에 결과 화면의 획득 골드, 누적 골드, 재시작 버튼, 클리어 상태가 유지된다.

세션 기록상 패시브 상점 구현 때는 데이터 계층과 UI 계층을 분리하는 순서가 중요했다(session history). 이번 라우팅도 같은 원칙을 따른다. 화면 전환은 `App`에서, 결과 상태와 재화는 store에서, 결과 버튼은 `HUD`에서 담당한다.

## When to Apply

- 상점, 보상, 장비 강화처럼 한 판 종료 뒤 열리는 메타프로그레션 화면이 있을 때.
- 결과 화면의 획득 재화와 누적 재화를 플레이어에게 먼저 보여줘야 할 때.
- 이미 `screen` 같은 얕은 React 라우팅과 Zustand 같은 전역 게임 상태가 분리되어 있을 때.
- 상점에서 뒤로 갔을 때 새 게임 시작이나 타이틀 복귀가 아니라, 같은 결과 화면으로 돌아가야 할 때.

이 패턴을 쓰지 않아도 되는 경우:

- 상점이 타이틀의 영구 메뉴로 항상 열려야 하는 게임.
- 결과 모달이 없고, 종료 후 곧바로 허브 화면으로 이동하는 구조.
- 상점 화면 안에서 바로 다음 런을 시작하는 별도 허브 UX를 이미 채택한 경우.

## Examples

### Requirements record

요구사항은 별도 기획 문서에 먼저 고정했다.

- `Planner/Essential_game_plan/result_coin_shop_flow_requirements_2026-05-17.md`
- MVP 범위: 결과 화면 전용 상점 진입, 게임오버/클리어 모두 지원, 상점 뒤로가기 시 같은 결과 상태 복귀.
- 제외 범위: 타이틀 상점 진입, 실시간 런 중 상점 진입, 상점에서 바로 다음 런 시작.

### Implementation record

구현 계획은 Developer 문서에 남겼다.

- `Developer/result_coin_shop_flow_plan_2026-05-17.md`
- `App.jsx`: 상점의 back target을 `game`으로 설정.
- `TitleScreen.jsx`: `onCoinShop` prop과 상점 버튼 제거.
- `HUD.jsx`: `onOpenCoinShop` prop과 결과 모달 상점 버튼 추가.
- `CoinShop.jsx`: 뒤로가기 라벨을 결과 복귀 의미로 조정.

### Verification

이 패턴은 다음 테스트로 고정한다.

```jsx
// resultCoinShopFlow.test.jsx
expect(titleHtml).not.toContain('코인상점')

useGameStore.setState({ phase: 'gameover', goldSession: 12, goldTotal: 30 })
expect(renderHud()).toContain('GAME OVER')
expect(renderHud()).toContain('코인상점')

useGameStore.setState({ phase: 'cleared', goldSession: 32, goldTotal: 60 })
expect(renderHud()).toContain('STAGE CLEAR!')
expect(renderHud()).toContain('코인상점')
```

검증 명령:

```bash
cd Developer/r3f_prototype
npm test -- --run
npm run build
```

이번 구현에서는 Vitest 9개 파일, 57개 테스트가 통과했고, Vite production build도 성공했다. 빌드의 chunk size 경고는 기존 번들 크기 경고이며 이 라우팅 패턴의 실패 신호는 아니다.

## Related

- `docs/solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md` - 패시브 카탈로그와 영구 성장 저장 구조. 이번 문서와 중간 정도로 겹치지만, 해당 문서는 데이터/카탈로그 레이어 패턴이고 이 문서는 결과 게이트 화면 흐름 패턴이다.
- `CEO/product_manager_review_passive_upgrade_catalog_2026-05-17.md` - 상점 진입 위치를 결정해야 한다는 PM 리뷰 근거.
- `Planner/Essential_game_plan/passive_upgrade_catalog_plan_2026-05-17.md` - 원본 코인 경제와 패시브 카탈로그 기획.
- `CEO/ceo_review_passive_upgrade_catalog_2026-05-17.md` - MVP 패시브 범위와 Lv.3 제한 결정.

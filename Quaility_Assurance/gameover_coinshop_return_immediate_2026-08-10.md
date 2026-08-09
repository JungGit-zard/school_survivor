# 게임오버 코인상점 복귀 회귀 검증

- 추적 카드: `t_7937fda3`
- 대상 흐름: `사망 → 게임오버 결과 → 코인상점 → 뒤로가기 → 게임 화면`

## 합격 기준

- 뒤로가기로 게임 화면이 다시 만들어지는 첫 렌더에 `gameover-result-overlay`가 존재한다.
- 별도 타이머 진행 없이 `GAME OVER`가 보인다.
- 코인상점 복귀가 아닌 새 사망에는 기존 1초 전환이 유지된다.
- 게임오버가 아닌 상태에서 코인상점을 다녀와도 이후 새 사망을 즉시 표시하지 않는다.

## 결과

- `./node_modules/.bin/vitest run src/components/ReadyGameApp.test.jsx src/components/HUD.test.jsx --maxWorkers=1 --no-file-parallelism`
  - 2 files passed
  - 38 tests passed
- `npm run build`
  - branch guard passed on `zombie_only`
  - Vite production build passed
  - legacy B02 및 hosting asset gate passed
- `git diff --check -- Developer/r3f_prototype/src/components/ReadyGameApp.jsx Developer/r3f_prototype/src/components/GameplayScreen.jsx Developer/r3f_prototype/src/components/HUD.jsx Developer/r3f_prototype/src/components/ReadyGameApp.test.jsx Developer/r3f_prototype/src/components/HUD.test.jsx Developer/agent_room/uimini_gameover_coinshop_return_immediate_2026-08-10.md Quaility_Assurance/gameover_coinshop_return_immediate_2026-08-10.md` 통과.

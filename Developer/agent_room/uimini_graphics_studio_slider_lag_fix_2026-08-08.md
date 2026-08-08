# Graphics Studio 슬라이더 렉 수정 기록 (2026-08-08)

## 범위와 제약

- 대상: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`의 Graphics 변형 슬라이더.
- Studio 입력값의 영속 정본은 Firebase만 사용한다. 실제 Firebase 데이터는 변경하지 않았고 모든 검증은 mock 기반이다.
- 타이틀, 오디오, 모델 값, 로그인 코드는 변경하지 않았다.
- Hermes Kanban `escape-zombie-school` 카드 `t_7518685e` 라우팅은 실제 API probe가 `HTTP 401 token_expired`로 실패해 blocked 증적을 유지했다.

## 진단

### 빠른 red-capable 재현 명령

```powershell
npx vitest run src/components/GraphicsStudio.immediate.test.jsx
```

수정 전 신규 회귀 테스트는 실패했다. 범위 입력 세 번(`1.1 → 1.3 → 1.7`)이 Firebase mock `save`를 즉시 세 번 호출했다.

### 가설과 예측

1. **채택 — raw input마다 Firebase 저장 직렬화**: `updateTuning`이 매 이벤트에서 `queueCanonicalMutation → persistDatasetsOnApply → saveFirebaseStudio`를 호출한다. 저장을 드래그 종료 뒤로 묶으면 입력 중 `save`가 0회가 된다.
2. **보조 — `onInput`/`onChange` 이중 핸들러**: 범위 입력의 종료 `change`가 별도 저장을 만들 수 있다. `onInput`만 남기면 중복 종료 저장이 없다.
3. **미채택 — Three.js 미리보기 렌더가 단독 원인**: mock Firebase 저장 호출만으로도 3회 호출이 재현되어, 이 수정 범위의 주원인이 아니다.

## 구현

- 입력 직후 메모리 draft를 갱신해 미리보기는 즉시 반영한다. 이 draft는 영속 저장소가 아니다.
- 500ms 동안 동일/여러 변형 입력을 모아 최신 tuning map 하나로 canonical Firebase 저장 대기열에 넘긴다.
- Apply와 컴포넌트 해제 시 대기 중인 map을 즉시 대기열에 넘겨 최종 사용자 지정값을 잃지 않는다.
- 범위 `<input>`은 `onInput`만 사용한다.
- 첫 Firebase 저장이 진행 중일 때 더 새 입력이 오면, 첫 저장 완료는 같은 draft만 정리하고 새 draft는 유지한다. 따라서 미리보기 점프와 후속 patch의 값 유실이 없다.
- Firebase 저장 성공 뒤 `applyFirebaseStudioDatasets`가 revision과 함께 runtime에 적용되는 기존 경로는 바꾸지 않았다.

## 검증 결과

| 명령 | 결과 |
| --- | --- |
| `npx vitest run src/components/GraphicsStudio.immediate.test.jsx -t "defers slider writes"` | 통과, 1 passed / 7 skipped |
| `npx vitest run src/components/GraphicsStudio.immediate.test.jsx -t "in flight"` | 통과, 첫 저장 지연 중 `scale=1.7`, `scaleX=1.2`의 draft 유지 및 두 번째 최종 payload 확인 |
| `npx vitest run src/components/GraphicsStudio.immediate.test.jsx` | 통과, 8 passed |
| `npx vitest run src/components/GraphicsStudio.test.jsx src/lib/firebaseStudio.test.js` | 통과, 26 passed / 20 skipped |
| `npm run build` | 통과. pre/post title 및 B02 정본 게이트 모두 통과, Vite build 성공 |

빌드 결과의 기존 chunk-size 경고만 남아 있으며 이번 변경과 무관하다.

## 변경 파일

- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudio.immediate.test.jsx`
- `Developer/agent_room/uimini_graphics_studio_slider_lag_fix_2026-08-08.md`

# 게임 시작 런타임 수정 기록 — 2026-07-26

## 원인

1. E2E 가짜 사용자가 일반 사용자별 Firebase Studio 하이드레이트 게이트를 통과하지 못해 로비·게임 진입이 막혔다.
2. E2E 진행도 스냅샷 적용이 가짜 사용자를 `cloudUser`로 등록해 `/users/e2e-local-test` 쓰기를 시도할 수 있었다.
3. `ZombieInstanceLayer` reset이 `THREE.InstancedBufferAttribute` 자체에 `fill()`을 호출해 Stage 1 입장 직후 예외가 발생했다.

## 구현 경계

- 프로덕션은 Firebase current-user Studio 하이드레이트와 fail-closed 동작을 유지한다. 하이드레이트 실패 시 타이틀에서 오류와 재시도를 표시하며 로비 진입은 차단한다.
- DEV `?e2e=1` 일반 게임 경로는 Firebase 공개 정본 `canonicalTitlePlayer/current`만 read-only로 하이드레이트한다. 가짜 사용자 workspace 읽기·쓰기·구독·게시를 하지 않으며, `/graphics-studio?e2e=1`도 차단한다.
- E2E 메모리 진행도는 hydrated 상태를 유지하되 `cloudUser`는 null로 유지해 게임 중 Firebase 진행도 저장이 no-op이 되게 한다.
- 인스턴스 알파 reset과 슬롯 투명도 갱신은 `InstancedBufferAttribute.array` GPU backing array를 대상으로 수행한다. 기존 typed array 호출도 계속 지원한다.

## 변경 파일

- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/App.firebaseBootstrap.test.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx`
- `Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx`
- `Developer/r3f_prototype/src/components/ZombieInstanceLayer.test.js`
- `Developer/r3f_prototype/src/components/PooledEnemyVisuals.js`
- `Developer/r3f_prototype/src/components/PersistentVisualPoolReset.test.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.test.js`
- `Developer/r3f_prototype/src/store/useAuthStore.js`
- `Developer/r3f_prototype/src/store/useAuthStore.cloudProgress.test.js`

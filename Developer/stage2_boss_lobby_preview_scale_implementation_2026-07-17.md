# Stage 2 보스 크기 복구 구현 - 2026-07-17

## 변경 파일

- `Developer/r3f_prototype/src/components/StageBossPreview.jsx`
- `Developer/r3f_prototype/src/components/StageBossPreview.test.jsx`
- `Developer/r3f_prototype/src/lib/graphicsStudioB02Source.js`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js`

## 구현 내용

- 원인 추적:
  - `B02`는 `ZombieMesh` 안에서 `StudioTunedGroup itemId="zombie-b02-teacher"`를 통해 Graphics Studio 저장값을 적용한다.
  - 로비 카드의 `StageBossPreview`와 타이틀의 `TitleBossZombie`도 같은 `ZombieMesh`를 사용한다.
  - 따라서 `zombie-b02-teacher` 루트 스케일이 `1.6`대 값으로 남아 있으면 로비, 타이틀, 런타임 표시가 모두 커진다.
- `STUDIO_B02_SOURCE_METADATA.sourceRevision`을 `3`으로 올렸다.
- `storedRevision < sourceRevision(3)`인 B02 저장값을 로드할 때 루트 크기 축 `scale`, `scaleX`, `scaleY`, `scaleZ`만 기본값 `1`로 복구한다.
- 이미 revision 2가 찍혔지만 큰 B02 스케일이 남은 브라우저 상태도 다시 복구한다.
- 색, 위치, 회전, 파트/그룹 튜닝은 보존한다.
- `StageBossPreview`에 B02 전용 모델 스케일 `0.82`를 추가했다.
- `BOSS_PREVIEW_ZOOM_FACTOR.B02`는 루트 스케일 복구 뒤 크라운 여백 보정값 `0.95`를 유지한다.
- 실제 게임 전투의 `ENEMY_STATS.B02.scale`, 충돌체, 체력, 공격 로직은 변경하지 않았다.

## 회귀 방지

- `StageBossPreview.test.jsx`에 B02 렌더 zoom이 기본 zoom의 `0.95`배인지 확인하는 어서션을 추가했다.
- `StageBossPreview.test.jsx`에 B02 로비 카드 모델 스케일이 `0.82`인지 확인하는 어서션을 추가했다.
- `graphicsStudioConfig.test.js`에 B02 루트 스케일 복구, revision 2 stale browser 재복구, 미래 리비전 보존 기대값을 반영했다.

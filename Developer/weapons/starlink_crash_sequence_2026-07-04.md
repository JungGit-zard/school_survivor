# 고장난 스타링크 추락 연출 구현 기록 (2026-07-04)

작성: Three_Mini. 30회 발사 후 위성 추락 → 폭발 → 좀론비스크 도주 연출.

## 게임 영향 없음 (핵심 계약)

- 추락 폭발 데미지 0 (`applyRadialDamage` 미호출), 좀론비스크 콜라이더/피격/적 판정 없음.
- 기존 낙뢰 공격 로직·스탯·weaponCatalog 무변경. 30발 후에도 발사 정상 지속 — 카운터만 리셋(새 위성 도착 간주).
- 시퀀스는 `usePlayingFrame` 게이트 — 일시정지/레벨업 중 정지.

## 파일

### 신규
- `src/lib/starlinkCrash.js` — 순수 로직. 상수(30발, 낙하 900ms, 폭발 620ms, 등장 지연 260ms, 도주 6u/s, 최대 2s, 마진 1.6) + `advanceCrashCounter`(30회째 trigger·리셋), `pickCrashLandingPoint`(플레이어 1.6~3.5u 무작위), `getCrashPose`(ease-in 제곱 낙하 보간 + tilt/spin), `getCrashPhase`(falling/landed), `pickEscapeDirection`(screenBounds 최근접 가장자리), `getZomlonPosition`, `isEscapeDone`(경계+마진 이탈 or 타임아웃).
- `src/lib/starlinkCrash.test.js` — vitest 15케이스 (카운터 트리거/리셋, 착지점 범위·결정성, 궤적 끝점·clamp·가속감, 단계 경계, 도주 방향 4방·중앙, 이동·이탈·타임아웃).
- `src/components/Weapons/StarlinkSatellite.jsx` — `StarlinkSatelliteModel`(위성), `ZomlonbiskModel`(블록 미니피겨+달리기), `CrashExplosionVisual`(무데미지 폭발), `StarlinkCrashSequence`(시퀀스 오케스트레이션). toon.js의 toonMat 캐시/getSharedOutlineMat/inflateScale 사용, 전 부품 아웃라인.

### 수정 (최소)
- `src/components/Weapons/Starlink.jsx` — import 2줄, `_crashId`, `fireCountRef`/`crashes` state, 발사 성공 직후 `advanceCrashCounter` 호출 + trigger 시 crash push, 렌더에 `StarlinkCrashSequence` 목록 추가. **공격 로직 라인은 미변경.**
- `src/lib/graphicsStudioConfig.js` — 카탈로그 2항목 추가: `weapon-starlink-satellite`(previewKind `starlinkSatellite`), `actor-zomlonbisk`(previewKind `zomlonbisk`). 커스텀 previewKind를 써서 runtime-parity 회귀 가드(weaponModel 전용 검사)와 충돌하지 않음.
- `src/components/GraphicsStudioPreview.jsx` — 두 previewKind의 카메라 프레임 + 렌더 분기 추가.

## 시퀀스 흐름 (`StarlinkCrashSequence`)

1. **falling** (0~900ms): `getCrashPose`로 화면 위 y=9 + 측면 오프셋(3.2,-2.1)에서 착지점까지 ease-in 낙하, tilt 0.55→0.30rad + Y스핀.
2. **착지 순간**: `pickEscapeDirection(x,z,screenBounds)` 확정, `emitSfx({id:'starlinkHit'})` (기존 등록 사운드 재사용 — 신규 에셋 불필요).
3. **폭발** (900~1520ms): 원판+링+섬광 기둥, 데미지 없음.
4. **도주** (1160ms~): 좀론비스크가 착지점에서 팝(스케일 0.25→1, 220ms) 후 최근접 화면 가장자리로 6u/s 직진, `isEscapeDone`(경계+1.6 이탈 or 2s)에 `onDone()` → 언마운트.

## 검증 결과

- `npx vitest run src/lib/starlinkCrash.test.js` → 15/15 통과
- 전체 `npx vitest run --maxWorkers=1 --no-file-parallelism` → **77파일 450테스트 전부 통과**
- `npm run build` → 성공 (기존 청크 사이즈 경고만)
- 비주얼: dev 서버 graphics-studio 라우트에서 두 프리뷰 선택·스크린샷 확인 (세션 scratchpad의 starlink-satellite-check.png, zomlonbisk-check.png)

## 남은 한계

- 게임 본편(구글 로그인 필요)에서 30발 실주행 연출은 헤드리스로 미확인 — 타이밍·이탈은 순수 로직 테스트로 커버, 모델·폭발은 스튜디오에서 확인.
- 스파크 깜빡임/좀론비스크 팔다리 스윙은 plain `useFrame`(ZombieMesh와 동일 관례) — 일시정지 중 위치는 정지하지만 미세 스윙은 지속(기존 캐릭터들과 동일 동작).
- 커밋 안 함 (Terry 지시 대기).

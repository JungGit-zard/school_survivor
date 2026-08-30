# Starlink·LineDraw 런타임 수정 기록 (2026-08-30)

## 범위

사용자 요청에 따라 무기 런타임만 수정했다. Firebase, localStorage, 인증, 타이틀, 그래픽, 오디오, 스테이지 및 다른 무기는 변경하지 않았다.

## 원인 및 조건 확인

- 고장난 스타링크는 기존 `cooldown: 3800ms`였고, 다중 발사 큐에 발사 간 지연이 없어 여러 타격이 사실상 동시에 보였다.
- LineDraw 획득은 계정 해금이 아니다. `upgrades.js`의 정본 조건은 `minLevel: 8`이며, 실행 중 `schoolBag`와 `boxCutter`가 모두 활성화되어야 한다. 따라서 두 무기를 가진 레벨 8 이상 런에서만 조합 카드로 등장한다.

## 적용 내용

- Starlink 재사용 간격: `3800ms → 6500ms`.
- Starlink 연속 타격 간격: `strikeSpacingMs: 450ms`를 추가하고 큐의 `delayMs = index × 450ms`로 순차 발사한다.
- LineDraw 발사 방향: 기존 평면 방향을 x-z 평면에서 정확히 시계 방향 90° 회전한다. 데미지·사거리·관통·등장 조건은 변경하지 않았다.

## 검증

- `Starlink.test.jsx`: 13 passed
- `lineDraw.test.js`: 29 passed
- `weaponCatalog.test.js`: 22 passed
- 통합 집중 실행: **3 files, 64 tests passed**
- `git diff --check`: 통과

커밋·푸시는 하지 않았다.

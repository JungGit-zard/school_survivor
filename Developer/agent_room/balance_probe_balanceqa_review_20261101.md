# balanceqa 승인 검수 — 런타임 밸런스 프로브 (2026-11-01)

- 대상: `F:\ezs-work\level` 로컬 미푸시 커밋 b7dc8fe "feat(balance): add runtime balance probe with bot builds and stage load stats" (origin/zombie_only 22dd3af 위로 rebase됨)
- 판정: **ACCEPT** (차단 이슈 없음)

## 1. 실게임 동작 변경
- Enemies.jsx: `JARMOB_HP_TYPES` 상수를 export로만 바꿈 (Enemies.jsx:879). 값·사용처 변화 없음.
- Player.jsx: `INV_DURATION`(520), `PLAYER_HIT_KNOCKBACK_MS`(160)를 export로만 바꿈 (Player.jsx:57, 60). 값 변화 없음.
- 플레이어가 체감하는 동작 변화 없음. 마틸다 대시 가속·라운드당 웨이브 +10% 등 출구 개방 후 압박 로직은 손대지 않아 무상한 성장 그대로.
- stageBalanceProbe.js 변경은 측정 하네스 전용: 연필 조준에 풀 밖 적(보스·마틸다)을 넣는 선택 인자(생략 시 기존 동작 동일), `mulberry32`/`firePencil` export, 판 시작 시 풀 세대 초기화(결정론).

## 2. 의상 rebase 자동 병합
- 부모(22dd3af) 대비 Enemies.jsx / Player.jsx / stageBalanceProbe.js의 차이는 위 항목뿐 — 의상 코드는 한 줄도 바뀌지 않음.
- stageBalanceProbe.js의 의상 적용 지점은 각각 한 번씩 그대로 존재: 이동 속도 배율(:218), 최대 HP 증감(:260), 받는 피해 배율(:336), XP 배율 carry(:357-359).
- 적 투사체 피해 배율은 실게임 쪽 outfitCatalog.js:213에서 그대로 적용됨(이번 커밋과 무관).
- 참고(비차단): 새 stageRuntimeProbe.js는 의상 인자를 받지 않음 → 의상 A/B 비교는 기존 stageBalanceProbe로만 가능.

## 3. 번들 비용
- 새 모듈(balanceProbeBots, balanceProbeStats, directorExpectedLoad, refBuildV1, stageRuntimeProbe)과 stageBalanceProbe는 .jsx 런타임 컴포넌트 어디에서도 import되지 않음(lib 안 주석 언급만). 프로덕션 경로에 매 프레임 할당이나 프로브 작업 없음.

## 4. 테스트 (`npx vitest run --maxWorkers=1 --no-file-parallelism`, HDD)
- 프로브 + 의상 lib 테스트 9개 파일: 94 통과 / 5 건너뜀 (stageRuntimeProbe.baseline은 `EZS_PROBE_TASK`/`EZS_PROBE_OUT` 환경변수가 있어야 도는 측정용 테스트라 의도적으로 건너뜀), 44초
- Enemies(기본, stage5, lowDensityAllStages), Player, useGameStore, useGameStore.outfit, Tumbler: 7개 파일, 249 통과, 21초
- MiniRosari 단독 실행: 7 통과, 4초
- 합계 350 통과, 실패 0

## 5. 금지 항목
- 새 코드에 localStorage 없음, 브랜드 문구 없음.
- PlayerMesh.jsx, src/title/studioSnapshot.json은 커밋에 포함되지 않음.

## 검증 안 한 것
- 브라우저 실플레이와 production 번들 크기 측정은 하지 않음(import 그래프 정적 확인만).

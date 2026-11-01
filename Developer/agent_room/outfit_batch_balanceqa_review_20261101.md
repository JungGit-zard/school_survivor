# 의상 배치 balanceqa 수용 검수 — 2026-11-01

- 대상: `F:\ezs-work\oni` 로컬 미푸시 커밋 `d1479b0f` feat(outfit): unlock Rosari wardrobe outfits by stage clears, with run abilities (origin/zombie_only 위에 rebase됨)
- 검수자: balanceqa (밸검미니), 코드 수정 없음

## 판정: ACCEPT (릴리스 조건 1건)

코드 차단 이슈 없음. 단, 배포 순서 조건(아래 R-1)은 반드시 지켜야 한다.

## 1. 테스트

명령: `npx vitest run --maxWorkers=1 --no-file-parallelism <커밋이 건드린 테스트 22개 + Enemies/Enemies.stage5/Player/HUD/HUD.escapeSuccess/useGameStore(test, escapeSuccess, unlocks, progressPersistence, cloudProgress, stage5)/Tumbler/tumblerDurability/i18n/i18nCoverage/i18nExtra/localStoragePolicy/studioLocalStorageGuard>`

- 1차(21:59:48): 40파일 중 39 통과, 테스트 688개 중 685 통과 / 2 스킵 / 1 실패
  - 실패: `RosariWardrobePanel.test.jsx > renders the table in English` — 렌더 문구에 "00a0" 문자열이 섞임.
  - 원인: 실행 도중 다른 세션이 작업 트리의 `src/lib/locales/en.js`를 고침(파일 수정 시각 22:00:55, 실행 구간 안). 커밋 HEAD의 en.js와 현재 트리 en.js 모두 "00a0"이 없음. 현재 트리와 HEAD 차이는 텀블러 설명 한 줄("comes back"→"returns")뿐이며, 이건 이 커밋 범위가 아닌 남의 작업중 변경이다.
- 단독 재실행(22:02:16): `RosariWardrobePanel.test.jsx` 6/6 통과.
- 결론: 685 + 6(재실행) 기준 실패 0. MiniRosari 축소 테스트 포함 통과. Lobby 1만 사이클 테스트는 이번 범위에 넣지 않았다.

## 2. 밸런스 (코드 판독)

- 적용 위치와 1회성
  - 최대 체력·이동속도: `buildInitialPlayer`에서 판 시작 때 한 번만 반영. 레벨업 최대체력 카드는 기존 maxHp에 +7을 더하는 방식이라 의상 감소가 다시 깎이지 않는다. 판 중 플레이어를 다시 만드는 경로(패시브 초기화·진행도 재로드)도 같은 판 옷 id를 넘겨 중복 없이 같은 값을 다시 계산한다.
  - 받는 피해: `damagePlayer` 안에서 무적 검사 다음, 이누콘 흡수 전에 한 번 곱한다. 회복 함수(healPlayer, 자판기 회복)는 이 배율을 거치지 않는다. 마틸다 접촉 즉사는 killPlayer 경로라 영향 없음.
  - 비옷 투사체 배율: `Enemies.jsx` 적 투사체 적중 경로 한 곳에만 태그가 붙는다. 다른 옷과 겹칠 일이 없다(한 판 한 벌).
  - 현재 체력 비례 피해(B03 셔틀런, 수학 선생 휘두르기 30%)에 졸업복 +8%를 곱해도 32.4%라 치명타가 되지 않는다. 압력솥(최대체력 20%)은 비율이라 체육복도 같은 비율로 맞는다.
- 경험치 이월(xpCarry): 기존 내림값 위에 배율 차이분만 누적하고 정수만 꺼내 쓰는 방식이라 판 전체로는 표기 비율과 일치하고 잃거나 중복되지 않는다. 배율이 1이면 이월값을 건드리지 않는다. 예외 하나: "다음 스테이지 계속"에서 이월값이 0으로 초기화돼 스테이지마다 최대 1 XP 미만이 사라진다(무시 가능, 비차단).
- 잠긴 옷 착용: 판 시작 때 `resolveRunOutfitId`가 "저장된 옷이 보유 목록에 있을 때만" 그 옷을 쓰고 아니면 default로 떨어진다. 로그인 후 진행도 미수화 상태도 default. 외형(Player, MiniRosari)과 능력이 같은 값(store.runOutfitId)을 써서 "보이는 옷 ≠ 능력"이 생기지 않는다.
- default 무변화: 배율 1·증감 0이면 모든 함수가 입력을 그대로 돌려주는 분기다. 새로 생긴 차이는 최대체력 하한 1 클램프뿐이며 기본 100에서는 작동하지 않는다.
- 탈출 후 압박: 마틸다·웨이브·burstEvents 파일은 이 커밋에서 손대지 않았다. 마틸다 돌진 속도는 원래부터 "스폰 시 플레이어 속도 × 1.4"라 체육복이면 마틸다도 6% 빠르고 동복이면 4% 느리다 — 상대 압박은 그대로이고 상한도 생기지 않는다.

### 시뮬레이션 (stageBalanceProbe, S1~S5 × 6벌 × 시드 12개, 240초 상한)

| 스테이지 | default | winter | raincoat | gym | apron | grad |
|---|---|---|---|---|---|---|
| S1 중앙값(초) | 74.1 | 69.9 | 50.8 | 50.4 | 52.2 | 51.9 |
| S2 | 46.6 | 48.5 | 47.0 | 45.3 | 46.4 | 52.4 |
| S3 | 47.0 | 44.4 | 46.3 | 45.2 | 50.4 | 45.7 |
| S4 | 52.0 | 51.2 | 49.3 | 48.7 | 53.5 | 49.7 |
| S5 | 49.2 | 47.6 | 48.6 | 47.6 | 49.2 | 48.6 |

- 해석 한계: 이 프로브의 카이팅 AI는 옷과 무관하게 40~60초에 전멸하고, 같은 프로세스에서 판마다 결과가 흔들린다(커밋 테스트 주석에도 명시). 예를 들어 생존 능력이 default와 똑같은 급식복이 S1에서 default보다 22초 짧게 나오고, XP 측정 모드에서는 −5%인데도 평균 레벨이 더 높게 나왔다. 따라서 ±8% 수준 차이는 이 도구로 판별할 수 없다.
- 확인된 것: 어떤 옷도 특정 스테이지에서 혼자 붕괴하거나 튀지 않는다(S2~S5 중앙값이 모두 45~53초 범위 안). 이 프로브에는 적 투사체·급식이 없어 비옷 장점과 급식복 장점은 여기서 측정되지 않는다.
- 산술 기준 유효 체력: default 100, 동복 약 109, 비옷 94(투사체 구간은 그보다 유리), 체육복 88, 졸업복 약 93. 모두 기본의 ±12% 안이라 정상 범위.
- 하네스: 스크래치 `outfitsim/outfit.sim.test.js` (프로젝트 밖, 커밋 대상 아님).

## 3. 규칙

- `progress/outfitUnlocks/$outfitId`는 값 1 + 5개 id 허용 목록(default 제외)으로 검증. `titleSettings.playerOutfit`과 랭킹 항목 `outfitId`도 6개 id 허용 목록.
- 쓰기 권한은 기존 `auth.uid === $uid`(본인) 경로 아래에만 추가돼 남의 데이터를 쓸 수 없다. 본인 해금 플래그를 직접 써서 잠긴 옷을 여는 건 가능하나, 이는 weaponUnlocks와 같은 클라이언트 신뢰 수준이고 본인 계정에만 영향.
- `database.rules.json` sha256 = `f969eedf…9069f`, `bossUnlockRules.test.js` 고정값과 일치, 테스트 통과. 작업 트리 rules 파일은 HEAD와 동일.

## 4. 제약

- localStorage: 커밋 추가 코드에 사용 없음(게스트는 모듈 메모리만), localStoragePolicy·studioLocalStorageGuard 테스트 통과. 의상 흐름 전용 "localStorage 미접촉" 테스트도 있음.
- `PlayerMesh.jsx`, `src/title/studioSnapshot.json` 미변경.
- 브랜드 문구 없음(브랜드명 검사 테스트 포함).

## 5. 모바일 360×640 스크린샷

`outfit_ui/` 13장 확인. 옷장 잠금 카드(점선 + 자물쇠 + 조건), 의상 능력표(ko/en, 장점 초록·단점 빨강), 탈출 결과 화면 "새 옷 획득: 동복" 카드, 인게임 HP 100/100 표시 모두 잘림 없이 정상. `99_error.png`는 이름과 달리 정상 능력표 화면(줄바꿈 레이아웃)이다. 브라우저 재실행 불필요.

## 릴리스 조건 (차단은 아니나 반드시 지킬 것)

- R-1 배포 순서: 이 클라이언트는 default를 포함한 모든 판의 랭킹 항목에 `outfitId`를 싣는다. 공개 랭킹 항목은 `$other: false`라, 규칙이 먼저 배포되지 않으면 **모든 판의 랭킹 쓰기가 통째로 거부**된다(0점 판 포함 → "모든 판 랭킹 등록" 원칙 위반). 새 옷 id를 저장하는 진행도 저장도 같은 이유로 거부된다. 순서: push → origin 기준 작업 트리에서 rules 배포 → 그다음 클라이언트 배포. F: 트리에서 rules 배포 금지.

## 비차단 메모

- N-1 스테이지 연속 진행 시 xpCarry 0 초기화로 스테이지당 1 XP 미만 손실.
- N-2 비옷 −30%는 E04 탄·B04 1페이즈 탄(적 투사체 적중 경로)에만 적용. B04 수프 폭발, B02 복도 봉쇄, 확장 보스 공격은 해당 없음 — 기획 의도와 일치하지만 표기 "투사체 피해"를 플레이어가 더 넓게 읽을 수 있음.
- N-3 작업 트리 `en.js`에 다른 세션의 미커밋 변경(텀블러 설명 한 줄)이 있다. 이 커밋과 무관하니 스테이징에 섞지 말 것.

# Weapons Game Contents

무기의 특성, 해금, 획득, 업그레이드, 개별 무기 규칙을 모아 둔 폴더다.
**무기 문서의 역할별 허브** — 기획은 이 폴더, 구현·그래픽·QA 기록은 아래 "역할별 무기 문서 위치" 참조.

## 역할별 무기 문서 위치 (2026-07-04 정리)

| 역할 | 위치 | 내용 |
| --- | --- | --- |
| 기획 | `Planner/game_contents/weapons/` (이 폴더) | 무기 규칙·해금·밸런스 기획 정본 |
| 구현 기록 | `Developer/weapons/` | 무기별 수정·픽스 구현 기록 (최근) |
| 구현 아카이브 | `Developer/구현기록/게임기획밸런스구현코드연결/`, `Developer/구현기록/그래픽구현코드연결/` | 과거 구현 기록 (이동하지 않고 보존) |
| 그래픽 | `Graphic_designer/weapons/` | 무기 비주얼 방향·리뷰 문서 |
| 그래픽 에셋 아카이브 | `Graphic_designer/graphic_asset/weapon_graphics/<NN_무기>/` | 무기별 컨셉/구현/QA 레퍼런스 |
| QA 검증 | `Quaility_Assurance/weapons/` | 무기별 검증 기록 |
| 코드 정본 | `Developer/r3f_prototype/src/lib/weaponCatalog.js` | **스탯 단일 진실** (문서와 다르면 코드가 정본) |

## 핵심 문서

- `weapon_docs_index.md`: **무기별 전체 문서 인덱스** — 16종 각각의 기획·구현·그래픽·QA 문서 위치 (2026-07-04)
- `weapon_list.md`: 현재 구현 무기 목록 정본 후보
- `weapon_docs_runtime_match_audit_2026-06-03.md`: 현재 구현과 주요 무기 기획 문서 4개의 정합성 검수
- `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`: 5분 플레이 흐름과 해금 설계 참고 문서
- `weapon_expansion_unlock_plan_2026-05-10.md`: 무기 확장 로드맵과 미래 후보 참고 문서
- `stage1_weapon_roster_card_pool_drift_resolution_2026-06-24.md`: 스테이지1 로스터·카드풀 드리프트 해소
- `Weapons_modify.md`: 과거 수정 논의 기록. 인코딩 손상이 있어 현재 사양 근거로는 쓰지 않는다.

## 하위 폴더

- `rules/`: 무기 슬롯, 해금/획득/업그레이드 용어, 그래픽 스케일 규칙 등 공통 규칙
- `boxcutter/`: 커터칼 기획
- `compass_blade/`: 나침반 칼날 기획
- `onigiri/`: 오니기리 기획
- `guided_missile/`: 유도 미사일(보조배터리) 기획
- `umbrella_guard/`: 우산 방어막 기획
- `combat_feedback/`: 무기 사용 동작과 무기 고유 피드백
- `references/`: 외부 무기 참고 자료

## 현재 구현 무기 16종 (2026-07-04, weaponCatalog.js 기준)

| # | id | 이름 | 비고 |
| --- | --- | --- | --- |
| 1 | pencilThrow | 연필 | 시작 지급, 다수 파생 스탯의 기준(플라스크 존 틱=연필 Lv1, 랜턴=×1.5) |
| 2 | schoolBag | 30cm 자 | 커터칼 쿨다운 기준(자의 절반) |
| 3 | boxCutter | 커터칼 | 쿨다운 = 30cm자의 절반 (2026-07-04) |
| 4 | tumbler | 텀블러 | 궤도 회전 |
| 5 | scienceFlask | 과학 플라스크 | **리워크(07-04)**: 착탄 절반 + 화학 웅덩이 존(5s+1s/레벨, 연필Lv1 틱) |
| 6 | bell | 벨 | 8방향 파동 |
| 7 | stunGun | 전기 | 체인 |
| 8 | onigiri | 오니기리 | 바운스 |
| 9 | chibiko | 치비코 | 동행 투척 |
| 10 | guidedMissile | 보조배터리 미사일 | 상어미사일 데미지 기준(×1.3) |
| 11 | sharkMissile | 상어미사일 | **리워크(07-04)**: 1.5s 방랑→귀소 dart 비행 |
| 12 | starlink | 고장난 스타링크 | 낙하 타격 |
| 13 | compassBlade | 나침반 칼날 | 5스택 폭발(30 고정 — 07-04 플라스크 파생 해제) |
| 14 | umbrellaGuard | 우산 방어막 | 스핀 펄스 |
| 15 | eraserBomb | 지우개 폭탄 | 광역 폭발 |
| 16 | studentLantern | 학생용 랜턴 | **신규(07-04)**: 전방 빛 콘 지속 무기, 연필Lv1×1.5 |

## 현재 주의점

- 시작 해금 무기는 9종(starter), 실제 시작 지급 무기는 `pencilThrow` 1종이다.
- 현재 한 판 최대 보유 무기 수는 8개다.
- `onigiri` 카드 노출 레벨은 문서와 코드 내부가 다르다. `weaponCatalog.js`는 Lv.8, `upgrades.js`의 획득 카드는 Lv.6 기준이다.
- 스탯 숫자는 문서에 복사하지 말 것 — `weaponCatalog.js`가 단일 진실이며 문서는 규칙·의도만 기록한다.

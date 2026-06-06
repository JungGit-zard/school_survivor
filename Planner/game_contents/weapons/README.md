# Weapons Game Contents

무기의 특성, 해금, 획득, 업그레이드, 개별 무기 규칙을 모아 둔 폴더다.

## 핵심 문서

- `weapon_list.md`: 현재 구현 무기 목록 정본 후보
- `weapon_docs_runtime_match_audit_2026-06-03.md`: 현재 구현과 주요 무기 기획 문서 4개의 정합성 검수
- `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`: 5분 플레이 흐름과 해금 설계 참고 문서
- `weapon_expansion_unlock_plan_2026-05-10.md`: 무기 확장 로드맵과 미래 후보 참고 문서
- `Weapons_modify.md`: 과거 수정 논의 기록. 인코딩 손상이 있어 현재 사양 근거로는 쓰지 않는다.

## 하위 폴더

- `rules/`: 무기 슬롯, 해금/획득/업그레이드 용어 등 공통 규칙
- `boxcutter/`: 커터칼 기획
- `compass_blade/`: 나침반 칼날 기획
- `onigiri/`: 오니기리 기획
- `guided_missile/`: 유도 미사일 기획
- `umbrella_guard/`: 우산 방어막 기획
- `combat_feedback/`: 무기 사용 동작과 무기 고유 피드백
- `references/`: 외부 무기 참고 자료

## 현재 주의점

- 현재 구현 무기는 `boxCutter` 포함 13종이다.
- 현재 시작 해금 무기는 8종이고, 실제 시작 지급 무기는 `pencilThrow` 1종이다.
- 현재 한 판 최대 보유 무기 수는 8개다.
- `onigiri` 카드 노출 레벨은 문서와 코드 내부가 다르다. `weaponCatalog.js`는 Lv.8, `upgrades.js`의 획득 카드는 Lv.6 기준이다.

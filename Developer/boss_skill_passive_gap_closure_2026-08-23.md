# 보스 패시브·보스별 공격 기획 대조와 잔여 갭 종결 (2026-08-23)

## 대조 범위

3일 이내 작업 이력(`8a6b6e5`, `30c095f`, `65e5839`, `67c0c03`)과 기획 정본을 코드와 1:1 대조했다.

- `Planner/stage2_3_4_boss_ultimate_decision_map_2026-08-19.md` — B02/B03/B04 필살기·패시브 최종안
- `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md` — 보스 스킬 정본 인벤토리·갭 맵
- `Planner/permanent_upgrade_expansion_design_2026-07-26.md` §5 — 선결 버그 2건
- `Quaility_Assurance/full_game_content_audit_2026-07-25.md` #15, #78 — B04 보상 누락, 보스 드랍 수집 불가

## 이미 구현된 것 (수정 없음)

| 항목 | 정본 수치 | 코드 |
|---|---|---|
| B01 삼각자 특수기 | 반경 1.575u, 전방 140도, 현재 HP 30% | `mathTeacherSpecial.js` |
| B02 복도 봉쇄선 | HP 70%/35%, 예고 1.2s, 피해 18, 경직 1.2s | `b02CorridorBlockade.js` |
| B03 왕복 오래달리기 | HP 65%/30%, 예고 1.25s, 16×2, 경직 1.2s | `b03ShuttleRun.js` |
| B04 국물 대폭발 | HP 50% 1회, 예고 1.2s, 원 3개, 피해 16 | `b04SoupBlast.js` |
| 200초 이후 신규 시전 금지 | 세 helper 공통 게이트 | 각 `getB0*Trigger` |
| 보스 패시브 4종 | 삼각자·복도 출입증·체육관 호루라기·급식 국자 ×1.05 | `bossPassiveItems.js` |
| 퀘스트 가방 8슬롯 | 1~4 보상, 5~8 빈 슬롯 | `HUD.jsx` |

## 이번에 닫은 갭

**B04만 처치 보상이 0이었다.** `Enemies.jsx`의 `ELITE_BONUS`에 B01~B03만 있고 최종 보스 B04가 빠져 있었다.
갭 맵 P0, 콘텐츠 감사 #15, 영구강화 설계 §5-1이 모두 같은 결함을 지적했고, 수치는 §5-1이
`{ textbook: 3, textbookXp: 40, gold: 5 }`로 명시했다(B01~B03과 동일). 그대로 추가했다.

감사 #78이 지적한 "보스 드랍이 생성돼도 수집 불가"는 이미 해소돼 있다. 현재 `recordBossDefeat()`는
`bossDefeated` 플래그만 세우고 phase를 `cleared`로 바꾸지 않는다(`useGameStore.js:1093-1104`).
런 종료는 210초 탈출 포탈이 담당하므로 드랍은 그대로 수집된다.

- 변경: `src/components/Enemies.jsx` — `ELITE_BONUS.B04` 추가, `ELITE_BONUS` export(테스트 단언용).
- 테스트: `src/components/Enemies.test.jsx` — B04 보상 버킷 정확 일치, 네 보스 전원 엔트리 존재.
- 검증: `npx vitest run src/components/Enemies.test.jsx` → 1 file, **112 tests passed** (기존 110 + 2).

## 구현하지 않은 것과 이유

1. **보스 행동 SFX** (갭 맵 P0 "부분"). `Developer/agent_room/soundmini_boss_skill_audio_audit_2026-08-07.md`가
   B01 삼각자·B02/B03 돌진·B04 포격/격노 전용 SFX는 **정본 요구가 없고 cue 매핑도 미승인**이라고 판정했다.
   기존 자산 재사용 후보(`zombieChargeRoar`, `zombieGiantThud`, `zombieRangedShoot`, `bossRoar`)까지만
   기술 후보로 적혀 있고, 볼륨·쿨다운 확정값이 없어 추정 구현을 금지한다. 승인이 나오면 별도 카드다.
2. **영구강화 설계 §5-2 (스3·4 `unconsciousStudent` 배치 0명)** — 보스 범위 밖이고, 프롭 배치는
   스튜디오 저장이 정본이라 코드로 고치지 않는다.
3. **영구강화 설계의 골드 경제 재조정** (보스 골드 5→9.3 등) — 승인된 변경이 아니라 제안이다.

## 미검증

실브라우저 플레이 검증은 여전히 없다. `Quaility_Assurance/boss_ultimate_runtime_auth_block_2026-08-21.md`대로
구글 로그인 때문에 헤드리스로 전투에 진입할 수 없어, B02~B04 필살기와 보스 드랍 수집은 전부 모델·단위 검증이다.

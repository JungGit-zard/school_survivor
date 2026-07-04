# Biz_Mini enhancement result — 2026-07-04

## 요약

비즈미니 30분 self-upgrade 패스를 통해 현재 Escape! zombie school의 BM 판단을 `수익화 확장`이 아니라 `Stage 1 모바일 플레이어블 루프 안정화 보호 게이트`로 재고정했다. 코드 변경은 하지 않았고, 프로젝트 정본/CEO/Planner 산출물을 읽어 광고·IAP·리텐션·라이브옵스가 언제까지 금지/보류되어야 하는지 제품 제약으로 정리했다.

## 확인한 현재 우선순위

- Stage 1은 현재 240초(4분) 모바일 생존 루프 안정화가 최우선이다.
- 당장 하지 않을 것: 백엔드, 리더보드, 계정 시스템, 멀티플레이, 타이틀/랜딩 고도화, Stage 2 확장.
- BM 관점에서 지금 허용되는 작업은 구현이 아니라 건강 지표/가드레일 문서화다.

## Biz_Mini 강화 내용

오늘 업데이트한 판단:

1. 수익화 도입 전 무료 루프 신뢰가 먼저다.
   - 신규/무강화 플레이어가 억울한 손실 없이 0-240초 루프를 이해하고 재도전할 수 있어야 한다.
2. 위험 구간은 결제/광고 유도 지점이 아니다.
   - 1:12-1:30, 2:48-3:12, 3:12-4:00 구간은 난이도/입력/보상 신뢰 검증 구간으로 본다.
3. 광고/IAP/라이브옵스는 Stage 1 안정화 전 금지다.
   - 보상형 광고, 유료 부활, 스타터팩, 시즌패스, 출석 보상, 공식 랭킹 보상은 아직 열지 않는다.
4. Stage 1 이후 첫 BM 후보는 낮은 압박이어야 한다.
   - 선택형 플레이 후 보너스, 코스메틱, 광고 제거/후원형만 후속 후보로 남기고 전투력 판매·확률형·실패 직후 과금 압박은 금지한다.

## Planner/QA에 넘길 제품 제약

- 사망률/이탈률이 높으면 광고 부활이나 유료 편의가 아니라 스폰, 피드백, 모바일 입력, 보상 페이싱을 먼저 고친다.
- `run_complete_rate`, `first_30s_death_rate`, `boss_reach_rate`, `gold_earned_per_run`, `passive_purchase_count`, `D0_second_run_rate`를 BM readiness의 선행 지표로 본다.
- 보상 신뢰 지표(`reward_grant_failure_count`, 결과화면 후 재시작률, 코인샵 구매 실패/성공 흐름)를 광고/IAP보다 먼저 계측 후보에 둔다.

## 변경한 파일

- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/knowledge/iterations/iteration_20260704_103408_KST_Biz_Mini_stage1_stability_monetization_gate.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/ledger.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/knowledge/source_index.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/knowledge/knowledge_base.md`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/bizmini_enhancement_result_2026-07-04.md`

## 블로커

- 없음.
- 주의: 작업 시작 시 git tree에 기존 미커밋 변경이 있었다. 본 작업은 game code를 수정하지 않았다.

# 기획안 평가용 서브에이전트 운용안

작성일: 2026-05-14  
작성 위치: `Planner/`  
목적: BangBang Survivor의 Planner 기획안을 평가하고 논의할 때 어떤 서브에이전트를 쓰면 좋은지 정리한다.

---

## 1. 기본 방향

기획안 평가는 한 명의 총괄이 모든 판단을 독점하기보다, 역할별 관점으로 나누어 보는 편이 좋다.

추천 구조:

```text
Codex 본체 = 오케스트레이터
전문 서브에이전트 = 필요한 관점만 임시 투입
최종 판단 = Codex 본체가 충돌을 정리하고 문서화
```

오케스트레이터는 전체 맥락을 가진 총괄자다.  
서브에이전트는 특정 관점만 깊게 보는 전문 리뷰어다.

이 방식은 여러 에이전트가 서로 대화하는 회의형 구조보다 관리하기 쉽다.  
각 에이전트가 독립적으로 검토하고, 요약 결과만 받아 최종 판단에 반영한다.

---

## 2. 가장 추천하는 핵심 조합

Planner 기획안 전체 평가의 핵심 조합은 다음 3개다.

```text
develop-director
game-developer
reviewer
```

시각 요소, HUD, 타이틀, 이펙트가 포함되면 아래 역할을 추가한다.

```text
graphic_designer
ui-designer
```

구현 영향 범위를 확인해야 하면 아래 역할을 추가한다.

```text
code-mapper
```

---

## 3. 역할별 추천도

## 3-1. `develop-director`

가장 중요한 총괄 평가 역할이다.

사용하기 좋은 상황:

- 기획안 전체 방향성이 맞는지 보고 싶을 때
- 구현 가능한 기획인지 판단하고 싶을 때
- 프로젝트 콘셉트와 기술 구조가 충돌하는지 보고 싶을 때
- 너무 복잡하거나 범위가 큰 기획인지 점검하고 싶을 때

잘 보는 것:

- BangBang Survivor 정체성과 맞는가
- 5분 생존 구조를 지키는가
- 초보자/솔로 프로젝트 범위를 넘지 않는가
- 기획이 작은 구현 단계로 나뉘어 있는가
- 기술 구조와 성능 요구를 고려했는가

추천 사용 우선순위: 매우 높음.

---

## 3-2. `game-developer`

게임플레이 기획 평가에 가장 적합하다.

사용하기 좋은 상황:

- 무기, 몬스터, 드랍, 레벨업 흐름을 평가할 때
- 5분 생존 루프가 재미있는지 보고 싶을 때
- 보스, 클리어, 게임오버 조건을 검토할 때
- 실제 플레이에서 문제가 될 부분을 찾고 싶을 때

잘 보는 것:

- 게임 루프가 자연스러운가
- 무기 성장이 플레이 흐름을 바꾸는가
- 몬스터 스폰이 너무 쉽거나 어렵지 않은가
- 상태 전환이 모순 없이 이어지는가
- 플레이 테스트가 필요한 지점을 찾을 수 있는가

추천 사용 우선순위: 매우 높음.

---

## 3-3. `reviewer`

문서와 기획의 리스크를 찾는 역할이다.

사용하기 좋은 상황:

- 문서끼리 충돌하는 부분을 찾고 싶을 때
- 빠진 QA 항목을 찾고 싶을 때
- 구현하면 버그가 날 가능성이 큰 부분을 확인할 때
- 최신 기준 문서와 어긋나는 내용을 찾고 싶을 때

잘 보는 것:

- 기준 문서 위반
- 수치 충돌
- 기능 누락
- 테스트 누락
- 구현 시 회귀 위험

추천 사용 우선순위: 매우 높음.

---

## 3-4. `code-mapper`

기획과 코드 연결 위치를 찾는 역할이다.

사용하기 좋은 상황:

- 기획을 구현하려면 어떤 파일을 봐야 하는지 알고 싶을 때
- 문서 내용이 실제 코드 어디와 연결되는지 확인할 때
- 변경 영향 범위를 먼저 파악하고 싶을 때

잘 보는 것:

- 주요 소유 파일과 심볼
- 실행 흐름
- 상태 전환 경로
- 사이드 이펙트 경계
- 변경 시 위험한 분기점

예상 연결 파일:

- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Weapons.jsx`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/Game.jsx`
- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/src/lib/upgrades.js`

추천 사용 우선순위: 중간에서 높음.

---

## 3-5. `graphic_designer`

시각, 3D, 카툰 렌더링, 이펙트, 가독성 평가에 적합하다.

사용하기 좋은 상황:

- 타이틀 화면을 평가할 때
- 전투 이펙트/VFX 기획을 평가할 때
- 모바일 화면에서 적, 플레이어, 드랍이 잘 보이는지 점검할 때
- 3D toon 스타일과 맞는지 확인할 때

잘 보는 것:

- 모바일 화면 가독성
- 플레이어와 적의 실루엣 구분
- 위험 경고의 명확성
- 카툰 액션 분위기
- R3F/Three.js 시각 구현 가능성

주의:

- 프로젝트 규칙상 그래픽 관련 작업 기록은 `Graphic_designer/`에 남기는 것이 맞다.
- 현재 실제 특수 타입으로 호출 가능한 커스텀 에이전트는 `graphic_designer`다.

추천 사용 우선순위: 시각 요소가 있으면 높음.

---

## 3-6. `ui-designer`

HUD, 카드, 결과창, 타이틀 메뉴 같은 UI 기획 평가에 적합하다.

사용하기 좋은 상황:

- 레벨업 카드 UI를 평가할 때
- 타이틀 화면 버튼 구성을 평가할 때
- 결과창, 도감, 설정 화면을 평가할 때
- 모바일 세로 화면에서 정보 우선순위를 정할 때

잘 보는 것:

- 화면 배치
- 버튼과 카드의 정보 위계
- 접근성
- 초보자가 바로 이해할 수 있는 흐름
- 상태별 UI 피드백

추천 사용 우선순위: UI가 포함되면 높음.

---

## 4. 상황별 추천 조합

| 상황 | 추천 서브에이전트 |
|---|---|
| Planner 전체 기획안 평가 | `develop-director`, `game-developer`, `reviewer` |
| 1스테이지 밸런스 검토 | `game-developer`, `reviewer` |
| 문서 충돌/정책 위반 검토 | `reviewer`, `develop-director` |
| 구현 전 영향 범위 확인 | `code-mapper`, `game-developer` |
| 타이틀 화면 기획 검토 | `ui-designer`, `graphic_designer`, `develop-director` |
| VFX/이펙트 기획 검토 | `graphic_designer`, `game-developer`, `reviewer` |
| HUD/레벨업 카드 검토 | `ui-designer`, `game-developer` |
| 신규 무기 10종 검토 | `game-developer`, `reviewer`, `graphic_designer` |
| 보상/드랍 구조 검토 | `game-developer`, `reviewer` |
| 최종 구현 준비도 점검 | `develop-director`, `code-mapper`, `reviewer` |

---

## 5. 추천 리뷰 워크플로우

### 1단계. Codex 본체가 기준 문서 확정

먼저 아래 문서를 기준선으로 둔다.

```text
project_develop_policy.md
Bang_Rules.md
Planner/stage1_replan_2026-05-06.md
Planner/stage1_reverse_design_current_2026-05-09.md
Planner/planner_all_documents_summary_2026-05-14.md
```

### 2단계. 필요한 서브에이전트만 호출

예를 들어 1스테이지 기획 검토라면:

```text
develop-director: 전체 방향성과 구현 준비도
game-developer: 게임 루프와 밸런스
reviewer: 충돌, 리스크, 누락 QA
```

타이틀 화면이면:

```text
ui-designer: 화면 구조와 UX
graphic_designer: 시각 분위기와 모바일 가독성
develop-director: 프로젝트 콘셉트 적합성
```

### 3단계. 결과를 증거 매트릭스로 정리

증거 매트릭스는 판단 근거를 표로 남기는 방식이다.

예시:

| 항목 | 기준 문서 | 충돌 문서 | 판단 | 조치 |
|---|---|---|---|---|
| 1스테이지 탄환 몬스터 금지 | `stage1_replan_2026-05-06.md` | `monster_spawn_scenario_5min_boss_4min.md` | 최신 기준 우선 | E04는 2스테이지 후보로만 유지 |

### 4단계. 리스크 등급 부여

| 등급 | 의미 |
|---|---|
| High | 구현하면 현재 프로젝트 룰을 깨는 문제 |
| Medium | 혼동이나 재작업을 만들 수 있는 문제 |
| Low | 참고 가치가 있지만 당장 막지는 않는 문제 |

### 5단계. 최종 리뷰 문서 저장

권장 파일명:

```text
Planner/planner_review_report_YYYY-MM-DD.md
```

포함할 내용:

- 리뷰 범위
- 사용한 기준 문서
- 사용한 서브에이전트 관점
- 핵심 결론
- 충돌 목록
- 구현 전 필수 확인
- QA 체크리스트
- 다음 결정 필요 항목

---

## 6. 실제 운용 시 주의점

- 서브에이전트는 항상 필요한 때만 쓴다.
- 모든 판단은 문서명과 근거를 남긴다.
- 에이전트 의견이 충돌하면 `project_develop_policy.md`, `Bang_Rules.md`, 최신 Planner 문서를 우선한다.
- 그래픽 관련 판단은 필요하면 `Graphic_designer/`에도 기록한다.
- QA나 테스트 관련 판단은 필요하면 `Quaility_Assurance/`에도 기록한다.
- 서브에이전트의 결론은 최종 결정이 아니라 검토 의견이다.
- 최종 결정과 문서화는 Codex 본체가 맡는다.

---

## 7. 최종 추천

Planner 기획안 평가의 기본 세트:

```text
develop-director
game-developer
reviewer
```

추가 조건:

```text
시각/VFX/HUD가 있으면 graphic_designer, ui-designer 추가
코드 영향 범위가 필요하면 code-mapper 추가
```

한 줄 결론:

**BangBang Survivor의 기획안 평가는 `develop-director`가 방향성을 보고, `game-developer`가 재미와 구조를 보고, `reviewer`가 충돌과 리스크를 잡는 방식이 가장 안정적이다.**

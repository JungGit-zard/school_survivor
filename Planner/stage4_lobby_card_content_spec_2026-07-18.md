# Stage 4 로비 카드 콘텐츠 계약

작성: Level_Mini / 2026-07-18
대상: `Developer/r3f_prototype` 로비 스테이지 카드
범위: Stage 4 카드를 로비에 추가할 때 필요한 최소 콘텐츠 계약만 정의한다. 스테이지 런타임, 웨이브 밸런스, 보스 패턴, 맵 구현은 이 문서 범위 밖이다.

---

## 1. 결론

Stage 4 로비 카드는 최신 사용자 확정 사실인 `B04` 주방장 좀비를 대표 보스로 보여준다.

정확한 최소 계약은 아래와 같다.

```js
stage4: {
  id: 'stage4',
  label: 'Stage 4',
  title: '급식실 대탈출',
  description: '주방장 좀비가 지키는 급식실에서 240초 동안 버티기',
  durationSec: STAGE_DURATION_SEC,
  clearRecordKey: 'stage4Clears',
  bestRecordKey: 'stage4BestSurvivalSec',
  bossType: 'B04',
}
```

로비 잠금 문구 권장:

```js
stage4: 'Stage 3 클리어 시 열림'
```

언락 판정 권장:

```js
(records.stage3Clears ?? 0) >= 1
```

---

## 2. 필드별 계약

| 항목 | 확정값 | 근거 / 이유 |
|---|---|---|
| `id` | `stage4` | 기존 `stage1`, `stage2`, `stage3`의 소문자 stage ID 패턴 연장 |
| `label` | `Stage 4` | 기존 카드가 `Stage 1`, `Stage 2`, `Stage 3` 영문 라벨을 그대로 사용 |
| `title` | `급식실 대탈출` | 주방장 보스와 가장 직접적으로 연결되는 학교 공간은 급식실이다. 기존 타이틀처럼 짧은 한국어 명사구 + 목표감을 유지 |
| `description` | `주방장 좀비가 지키는 급식실에서 240초 동안 버티기` | 기존 설명은 장소 + 240초 생존 목표를 한 줄로 설명한다. 신규 웨이브나 패턴 수치를 만들지 않는다 |
| 대표 보스 | `B04` 주방장 좀비 | 2026-07-18 사용자 최종 확정: Stage 4 대표 보스는 `B04` 주방장 좀비 |
| `bossType` | `B04` | 로비 `StageCard`는 `stage.lobbyBossType ?? stage.bossType`으로 보스 프리뷰를 고른다. Stage 4는 대표 보스와 실제 보스가 같아야 하므로 별도 `lobbyBossType`은 불필요 |
| `clearRecordKey` | `stage4Clears` | 기존 `stage2Clears`, `stage3Clears` 패턴 연장 |
| `bestRecordKey` | `stage4BestSurvivalSec` | 기존 `stage2BestSurvivalSec`, `stage3BestSurvivalSec` 패턴 연장 |
| 언락 | `stage3Clears >= 1` | 기존 Stage 3 언락이 직전 스테이지 클리어 1회 기준이므로 동형 연장 |
| 잠금 표시 | `Stage 3 클리어 시 열림` | Stage 2만 전용 문구가 있고 나머지는 기본 문구로 처리된다. Stage 4는 명확성을 위해 전용 문구 추가 권장 |

---

## 3. 로비 표시 방식 계약

현재 `Lobby.jsx` 관례를 그대로 따른다.

### 언락 상태

- 3D 보스 프리뷰는 `B04`를 사용한다.
- 카드 우상단 오버레이 텍스트는 두 줄로 표시한다.
  - 첫 줄: `Stage 4`
  - 둘째 줄: `급식실 대탈출`
- 최고기록 문구는 기존과 동일하게 `내 최고기록: 기록 없음` 또는 `내 최고기록: M:SS` 형식을 사용한다.
- 버튼 문구는 기존 카드와 동일하게 유지한다.
  - `입장하기`
  - `점수 레코드`
- 클리어 후에는 기존과 동일하게 `클리어` 배지를 표시한다.

### 잠금 상태

- 카드 타이틀 영역에는 `Stage 4` / `급식실 대탈출`을 보여준다.
- 최고기록은 기존과 동일하게 표시한다.
- 잠금 문구는 `🔒 Stage 3 클리어 시 열림`을 권장한다.
- 잠금 상태에서 B04 프리뷰를 숨기는 현재 구조는 유지해도 된다. 다만 Stage 4의 보스 실루엣을 잠금 카드에서도 보여주고 싶다면 UI_Mini 별도 검토가 필요하다.

---

## 4. 왜 기존 Stage 4 초안 제목을 그대로 쓰지 않는가

`Planner/stage4_concept_wave_plan_2026-07-18.md`에는 이전 보스 후보와 옥상 중심 초안이 남아 있다. 그러나 같은 문서 첫 줄과 최신 작업 지시에서 Stage 4 대표 보스가 `B04` 주방장 좀비로 최종 확정되었다.

따라서 로비 카드는 플레이어가 가장 먼저 보는 콘텐츠 약속이므로, 이전 보스 후보나 옥상 보스 정체성을 노출하지 않는다. `급식실 대탈출`은 B04 주방장 좀비와 가장 직접적으로 연결되며, 신규 웨이브 밸런스나 런타임 구현을 만들지 않고도 로비 카드의 콘텐츠 정합성을 맞춘다.

단, 이 문서는 로비 카드 콘텐츠 계약만 다룬다. 실제 Stage 4 맵이 급식실로 확정되었다고 선언하지 않는다. Stage 4 런타임 맵·웨이브·보스 패턴은 별도 기획/구현 카드에서 확정해야 한다.

---

## 5. 구현 전 블로커 / 확인 항목

이 문서 작성 시점의 코드 기준으로는 아직 Stage 4 로비 카드가 바로 동작할 수 없다. 구현 카드에서 아래를 확인해야 한다.

1. `STAGE_CONFIGS`에 `stage4` 항목이 없다.
2. `NEXT_STAGE_BY_STAGE`에 `stage3: 'stage4'` 연결이 없다.
3. `isStageUnlocked`에 Stage 4 언락 분기가 없다.
4. `STAGE_UNLOCK_HINT`에 Stage 4 전용 문구가 없다.
5. `StageBossPreview`와 관련 보스 메시/프리뷰 경로에 `B04`가 아직 검색되지 않는다.
6. `BOSS_SHOWTIME`에 `B04` 전용 라벨/효과음 큐가 없다. 구현 전에는 fallback으로 기존 보스 연출이 잘못 나올 수 있으므로 Sound_Mini 또는 UI_Mini 검토가 필요하다.
7. `Lobby.test.jsx`에는 Stage 4/B04 로비 프리뷰 검증이 아직 없다.

---

## 6. 구현 수용 기준 제안

로비 카드 구현 담당자에게 넘길 최소 수용 기준은 아래와 같다.

- `Object.keys(STAGE_CONFIGS)` 기반 로비 목록에 Stage 4 카드가 추가된다.
- Stage 4 카드 텍스트가 정확히 `Stage 4` / `급식실 대탈출` / `주방장 좀비가 지키는 급식실에서 240초 동안 버티기`와 일치한다.
- Stage 4 대표 보스 프리뷰 타입이 `B04`로 전달된다.
- Stage 3 클리어 기록이 없으면 Stage 4가 잠기고 `Stage 3 클리어 시 열림`을 보여준다.
- `stage3Clears >= 1`이면 Stage 4가 열린다.
- Stage 4 카드의 입장 버튼은 구현 시점에 `onStartStage('stage4')`를 호출해야 한다.
- Stage 4 랭킹 버튼은 `onOpenRanking('stage4')`를 호출해야 한다.
- Stage 4의 추가는 Stage 1 모바일/플레이 가능 루프, 기존 Stage 1~3 카드 문구, 기존 보스 프리뷰 동작을 깨뜨리지 않아야 한다.

---

## 7. 읽은 파일

- `project_develop_policy.md`
- `AGENTS.md`
- `Bang_Rules.md`
- `Planner/current_game_rules.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` 최근 엔트리
- `Planner/stage4_concept_wave_plan_2026-07-18.md`
- `Graphic_designer/stage4_chef_zombie_visual_spec_2026-07-18.md`
- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/components/Lobby.jsx`
- `Developer/r3f_prototype/src/components/Lobby.test.jsx`

---

## 8. 비작업 범위

이번 산출물에서는 아래를 하지 않았다.

- 코드 수정 없음
- 스테이지 런타임 구현 없음
- 웨이브 밸런스 수치 생성 없음
- 보스 패턴/스탯 확정 없음
- 커밋/푸시 없음
- 기존 미커밋 변경 정리 또는 삭제 없음

# B04 급식 국자 퀘스트 가방 UI 검토

- 작성: `uimini`
- 날짜: 2026-08-20
- Kanban: `escape-zombie-school / t_4f7700dc`
- 범위: B04 보상 표시와 퀘스트 가방 DOM 검증만 다뤘다. B02/B03 레이아웃, 키보드·모바일 동작, 타이틀, Studio, Firebase, 5173 및 브라우저 상태는 변경하지 않았다.

## 판정

**통과.** 현재 카탈로그의 `b04ServingLadle`은 B01~B03 뒤의 네 번째 항목이고, HUD는 `🥄` 아이콘을 연결한다. 8칸 4열 grid는 그대로 유지된다.

| 상태 | DOM 검증 |
| --- | --- |
| 미해금 | 8개 슬롯 모두 `빈 보스 패시브 슬롯`; 보상 내용 없음 |
| B01~B04 해금 | 첫 네 슬롯은 삼각자 → 복도 출입증 → 체육관 호루라기 → 급식 국자 순서 |
| B04 접근성·표시 문구 | `급식 국자 — 최대 체력 +5%` |
| 미래 슬롯 | 마지막 4개 슬롯은 빈 슬롯 |

## 변경

- `Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx`: 기존 B01~B03 순서 테스트를 B01~B04까지 확장했다. 네 번째 슬롯의 정확 문구와 뒤 4개 빈 슬롯을 확인한다.
- `HUD.jsx`와 `bossPassiveItems.js`는 현재 B04 정본(키·이름·문구·🥄 아이콘·카탈로그 순서)을 이미 충족해 추가 수정하지 않았다.

## 검증

```text
Developer/r3f_prototype에서:
npm test -- src/components/HUD.questInventory.test.jsx
git diff --check -- Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx
```

- 결과: focused jsdom HUD 테스트 10개 전부 통과.
- scoped diff check 통과.
- 브라우저·OAuth는 요청 범위 밖이라 실행하지 않았다.

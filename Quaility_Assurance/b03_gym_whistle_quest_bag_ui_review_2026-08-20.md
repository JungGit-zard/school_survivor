# B03 체육관 호루라기 퀘스트 가방 UI 검토

- 작성: `uimini`
- 날짜: 2026-08-20
- Kanban: `escape-zombie-school / t_88c573a3`
- 범위: 기존 퀘스트 가방의 B03 보상 표시와 DOM 검증만 변경했다. 키보드·모바일 레이아웃, B01/B02/B04, 타이틀, Studio, Firebase 및 브라우저는 변경하지 않았다.

## 판정

**통과.** B03 카탈로그 항목은 B02 다음 순서라 퀘스트 가방의 세 번째 슬롯을 사용하며, 허용된 `📣` 아이콘을 표시한다. 표시 문구의 불필요한 `최종`만 제거해 사용자 정본과 일치시켰다.

| 상태 | DOM 검증 |
| --- | --- |
| 미해금 | 8개 슬롯 모두 `빈 보스 패시브 슬롯`; 보상 내용 없음 |
| B01~B03 해금 | 앞 세 슬롯은 삼각자 → 복도 출입증 → 체육관 호루라기 순서, 뒤 5개는 빈 슬롯 |
| B03 접근성·표시 문구 | `체육관 호루라기 — 이동속도 +5%` |

## 변경

- `Developer/r3f_prototype/src/lib/bossPassiveItems.js`: B03 표시 설명을 `이동속도 +5%`로 정정했다.
- `Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx`: B01~B03의 정확한 첫 세 슬롯 순서·문구, 총 8칸 및 뒤 5개 빈 슬롯을 확인하는 jsdom 테스트를 추가했다.

## 검증

```text
Developer/r3f_prototype에서:
npm test -- src/components/HUD.questInventory.test.jsx
```

- 결과: 테스트 파일 1개, 테스트 10개 전부 통과.
- 테스트의 기존 미해금 케이스가 8개 빈 슬롯을 검증하고, 새 케이스가 B01~B03 해금 뒤 3개 표시·5개 빈 슬롯·정확 문구와 순서를 DOM에서 검증한다.
- 브라우저·OAuth는 요청 범위 밖이라 실행하지 않았다.

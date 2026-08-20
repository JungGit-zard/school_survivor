# B02 복도 출입증 퀘스트 가방 UI 검토

- 작성: `uimini`
- 날짜: 2026-08-20
- Kanban: `escape-zombie-school / t_ce247ce4`
- 범위: B02 복도 출입증의 기존 퀘스트 가방 표시만 검토했다. Firebase, Studio, 타이틀, 오디오 및 다른 HUD 동작은 변경하지 않았다.

## 판정

**통과 — 소스 변경 불필요.** 현재 구현이 정본 요구를 충족한다.

| 확인 항목 | 근거 | 결과 |
| --- | --- | --- |
| 총 슬롯·배치 | `BOSS_PASSIVE_ITEM_UI_CAPACITY = 8`, HUD 4열 grid | 4×2, 총 8칸 유지 |
| 슬롯 1 | `b01SetSquare`가 카탈로그 첫 항목이며 `📐`로 표시 | 삼각자 유지 |
| 슬롯 2 잠금 | `b02CorridorPass`가 두 번째 항목이고 해금 전 `null` 처리 | 빈 보스 패시브 슬롯 |
| 슬롯 2 해금 | `b02CorridorPass`의 `🎫` 아이콘, 이름·설명 렌더 | 복도 출입증 표시 |
| 접근성 텍스트 | `aria-label="${item.name} — ${item.description}"` | `복도 출입증 — 연필·벨·오니기리 공격력 +5%` |
| 미래 슬롯 | 2개 카탈로그 항목 뒤 6칸은 `null` | 슬롯 5~8을 포함한 미래 슬롯은 비어 있음 |

## 검증

```text
Developer/r3f_prototype에서:
npm test -- src/components/HUD.questInventory.test.jsx
```

- 결과: 테스트 파일 1개, 테스트 9개 모두 통과.
- 이 jsdom 컴포넌트 테스트는 가방 열기 후 실제 DOM에서 B01/B02의 `aria-label`과 빈 슬롯 개수를 검증한다.
- 소스 정적 확인으로 `HUD.jsx`의 4열 grid, 8칸 capacity, B02 티켓 아이콘 및 정확한 접근성 문자열 조합을 확인했다.
- Firebase OAuth 팝업이 알려진 E2E 차단 경로이므로 브라우저 로그인·OAuth 클릭은 수행하지 않았다.

## 변경 파일

- 이 검토 기록만 추가했다.
- `HUD.jsx`, `HUD.questInventory.test.jsx`, `bossPassiveItems.js`는 수정하지 않았다.

## 제한 및 후속 위험

- 현재 카탈로그에는 B01·B02 두 항목만 있어 슬롯 3~8은 비어 있다. 이는 B03·B04가 아직 해당 카탈로그에 추가되지 않은 현 단계에서는 정본의 빈 미래 슬롯 규칙과 일치한다.
- 이번 검토는 표시 계층에 한정했으며 패시브 해금·저장·전투 적용 로직은 범위 밖이다.

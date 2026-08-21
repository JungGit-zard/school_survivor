# B01~B04 보스 패시브 퀘스트 가방 독립 UI 감사

- 작성: `uimini` (독립 감사)
- 날짜: 2026-08-21
- Kanban: `escape-zombie-school / t_37da658d`
- 범위: 실제 HUD 퀘스트 가방 DOM 경로와 B01~B04 카탈로그/해금 키의 대조만 수행했다. 코드·테스트 소스는 수정하지 않았다.

## 결론

**결함 없음.** 현 구현은 아래 정본을 충족한다.

| 항목 | 확인 근거 | 결과 |
| --- | --- | --- |
| 슬롯 수·배치 | `BOSS_PASSIVE_ITEM_UI_CAPACITY = 8`, `repeat(4, minmax(0, 1fr))` | 4×2 총 8슬롯 |
| 카탈로그·순서 | `BOSS_PASSIVE_ITEMS` 선언 순서와 `Object.values()` 소비 | 1 삼각자, 2 복도 출입증, 3 체육관 호루라기, 4 급식 국자 |
| 해금 경계 | 슬롯별 `isBossPassiveItemUnlocked()` 확인 뒤에만 아이템 객체 생성 | 미해금 슬롯은 내용 없이 빈 슬롯 |
| 접근성 | 슬롯 `aria-label`이 `${name} — ${description}`으로 구성 | 네 보상 문구가 정본과 일치 |
| 미래 슬롯 | 4번째 이후 카탈로그 항목 없음, capacity는 8 유지 | 슬롯 5~8 빈 슬롯 |
| 모바일 폭·텍스트 | 패널 폭 `min(360px, calc(100% - 28px))`, `boxSizing`, 세로 `overflowY`; grid의 `minmax(0, 1fr)` | 작은 폭에서 패널·열이 뷰포트를 넘지 않는 구조 |
| 키보드·열기/닫기 | 퀘스트 버튼의 `aria-controls`/`aria-expanded`, `Escape` 우선 `closeQuestInventory()` | 기존 열기·닫기 경로 보존 |

## DOM 검증

```text
Developer/r3f_prototype에서:
npm test -- src/components/HUD.questInventory.test.jsx
```

- 결과: jsdom HUD 테스트 1개 파일, 10개 전부 통과.
- 미해금 케이스는 8개 빈 슬롯을 검증한다.
- B01~B04 해금 케이스는 앞 네 슬롯의 정확한 `aria-label` 순서와 뒤 4개 빈 슬롯을 검증한다.
- 열기/닫기 및 Escape 테스트가 기존 키보드 경로를 검증한다.

## 제한

- 사용자 지시에 따라 브라우저, Firebase, 5173, 빌드, 커밋·푸시는 수행하지 않았다.
- 실제 기기 글꼴 렌더링은 이 정적/DOM 감사 범위 밖이므로 평가하지 않았다.
- 공유 작업 트리의 전역 `git diff --check`는 이번 감사와 무관한 Inucon 작업 파일의 기존 trailing whitespace 때문에 실패했다. 보스 패시브 UI 파일은 수정하지 않았다.

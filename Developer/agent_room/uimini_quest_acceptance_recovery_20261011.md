# 퀘스트 수락 행동문 크기 복구

- Kanban: `t_28e72495` / `uimini`. Hermes가 폐기된 D 경로로 precommand를 실행해 막혔으므로 Advisor 지정 실제 체크아웃에서 UI_Mini mirror 역할로 Worker 수행.
- precommand 성공: `-Profile uimini -Domain auto -TaskSummary quest-acceptance-recovery`, receipt `fa86158398014e20e5295402f9d852601503811adddd3a92dc01796bfed7adba`.
- `a76bc12a`의 중앙 카드 복원 과정에서 행동문도 15px / 16–19px로 되돌아간 것을 확인. 수락 전용 스타일로 행동문 22–24px와 수락문 13–15px·다른 색/서체를 복원했다.
- 기존 카드 위치·폭·왼쪽 초상화·NPC 작은 대사·수락 클릭 진행은 유지한다. 완료/아이템 알림의 상단 위치, 반 크기, 1000ms 타이머는 변경하지 않았다.
- Advisor가 별도 diff/집중 검사 및 배포를 담당한다. 운영 Firebase·인증·타이틀·자산 변경 없음. 브라우저 실제 화면 검증을 완료했다고 주장하지 않는다.

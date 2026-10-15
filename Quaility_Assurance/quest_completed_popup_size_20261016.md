# 퀘스트 완료 팝업 크기 확인

- 수락 팝업의 width, padding, maxHeight를 먼저 캡처한 뒤 완료 팝업과 동일함을 확인하고 overflow auto도 검증했다.
- 담당 Worker의 `HUD.questInventory.test.jsx` 12개 테스트와 Advisor의 관련 7개 파일 93개 테스트가 통과했다. 검사 범위가 중복되므로 합산하지 않는다.
- `git diff --check` 및 최종 production build가 통과했다. 실제 화면 시각 검증과 라이브 배포는 수행하지 않았다.

# 게스트 로비 설정 회귀 검사 (2026-10-10)

- `Lobby.test.jsx`의 게스트 로비 설정 클릭 테스트를 먼저 추가했다. 수정 전 테스트는 실제 오류와 동일한 `FirebaseProgressError: ... authenticated remote snapshot ...`로 실패했다.
- 수정 후 `vitest run src/components/LobbySettingsModal.test.jsx src/components/Lobby.test.jsx -t "LobbySettingsModal|opens settings for a guest"`: 2개 파일, 17개 테스트 통과.
- `npm.cmd run build`: Firebase 환경 검사 통과, Studio 동기화 45개 테스트 통과, Vite 빌드 및 B02/Hosting 자산 검사 통과. 깨끗한 복제본의 `.env` 부재로 첫 시도는 게이트에서 차단됐으며 기존 F 작업공간의 `.env`를 출력 없이 복사한 뒤 재실행했다.
- 테스트는 게스트 설정 표시, 외형 저장 불가 안내, Firebase 런타임 진행 상태 불변, 모달이 열린 중 로그인한 계정의 저장값 불변을 확인한다. 기존 인증 설정 테스트는 실제 인증 사용자 상태를 명시하도록 보정했다.
- Advisor 실제 브라우저 QA (`http://localhost:5191/`): 새 세션에서 `로그인 없이 들어가기` → `설정 열기` 대화상자 정상 표시 → `구` 선택 시 `외형을 저장할 수 없습니다` 안내 → 닫기 정상 → Stage 1 입장 정상. `127.0.0.1` 주소는 Vite의 허용 호스트 검사에서 거부되어 `localhost`로 확인했다.
- 기존 범위 위험: 로그인된 사용자의 진행 상태가 아직 hydrate되지 않은 순간 설정을 열면 기존 Firebase 진행 상태 게이트가 오류를 낼 수 있다. 이번 수정은 게스트 경로만 다뤘다.
- 실제 Firebase 정본에는 쓰기 테스트를 하지 않았다. 라이브 검증과 배포는 별도 릴리스 단계에서 수행한다.

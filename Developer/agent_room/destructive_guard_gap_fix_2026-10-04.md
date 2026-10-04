# 삭제 차단 누락 최소 수정

2026-10-04 / madangsue Worker / Kanban `t_bc09f049` (`escape-zombie-school`).
Reuse decision: 기존 madangsue 운영 프로필의 훅 등록 유지보수 범위. Advisor 위임에 따라 현재 GPT-6 Worker가 수행.
중앙 필독 checker 영수증: `5614796682d97ad50a7d26cea578cd73b3d9ca396dfcc357fbad4493c0780a5f`.

- Git `-C`, `-c`, `--git-dir`, `--work-tree`의 별도 값과 인용 경로를 포함한 `clean`/`rm` 차단을 수정했다.
- event 이름이 없는 `exec_command` payload도 쉘로 인식하며 잘못된 명령 입력은 deny한다.
- Git 밖 `C:/Users/admin/.codex/hooks.json` matcher에 `terminal|exec_command`를 추가했다. 프로젝트 Codex/Claude 등록과 Hermes default 및 12개 profile의 정본 guard 연결은 이미 존재했다.
- 실제 삭제·파괴적 probe·게임·Firebase 데이터 변경은 하지 않았다. 세 번의 별도 터미널 검토 질문과 실행 deny 정책은 유지한다.

검증: guard 합성 테스트 함수 7개 통과(기존 삭제 11/안전 4, 추가 Git 옵션 삭제 10/안전 7, eventless exec deny/invalid deny/safe allow). 별도 질문 mock 테스트 13개 통과. 독립 QA 합성 스크립트 삭제 15/안전 5/payload 10 통과. 세 JSON 등록의 다섯 shell 도구 matcher 일치 확인 통과. `git diff --check` 통과.

독립 QA 후속 수정: `-C`의 인용 경로 안 `&`와 `;`는 경로 문자로 인식하도록 Git prefix의 인용 operand 범위만 수정했다. 큰따옴표/작은따옴표별 `clean` 차단 4건과 `status` 허용 4건을 추가했으며 위 세 합성 테스트 명령과 diff 검사를 다시 통과했다.

제한: 전역 설정은 repo 커밋 대상이 아니다. 현재 세션의 실제 훅 호출과 클라이언트 로딩은 이 문자열/설정 검증만으로 입증되지 않는다. EncodedCommand·간접 파일 API·설정 변조를 모두 막는 OS 보안 경계는 아니다. independent QA 재검증 전 최종 승인하지 않는다. Worker는 커밋/푸시하지 않았다.

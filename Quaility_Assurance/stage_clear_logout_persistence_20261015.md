# Stage clear logout persistence verification

- 테스트: `src/store/stageUnlockPersistence.test.js`.
- 실제 store의 Stage 1 clear → Firebase 저장 완료 전 logout 대기 → fake 저장소 재hydrate → Stage 2 해금 유지 및 전체 progress 동일성을 검증한다.
- 저장 실패 시 로그인 세션/클리어 기록 유지 및 기존 실패 안내, 같은 UID의 늦은 hydrate에 의한 클리어/골드 덮어쓰기 방지, 미클리어 계정 잠금 유지도 검증한다.
- 첫 확인: 직접 vitest 실행 1 file / 4 tests PASS (39.22s). 코드 구문 검사 2개 PASS.
- 독립 Advisor RED: 최신 origin 기준 코드로 초기 회귀 4개 중 3 FAIL / 1 PASS (9.00s). 즉시 로그아웃으로 저장 취소, 저장 실패에도 로그아웃, 늦은 hydrate로 stage1Clears 1→0 및 gold 210→205를 재현했다.
- 관련 기존 검증: 5 files / 59 tests PASS (51.08s). 설정창 false 로그아웃 반환 회귀 포함 focused 검증 2 files / 21 tests PASS (13.15s).
- 마지막 보강: 저장 대기 중 골드/영구 업그레이드/진동 설정 변경을 최신 snapshot으로 다시 저장, 늦은 읽기 실패의 새 진행도 보존, 대기 중 A→B 계정 전환의 B 세션 보존을 검증하는 신규 회귀를 추가했다.
- 테스트는 주입한 메모리 fake만 사용했다. 실제 사용자 Firebase의 값/revision, 로컬 영구 저장소, 서버 상태를 변경하지 않았다.
- 실제 대상 새 OAuth 로그인/게임 진입 및 라이브 재로그인 지속성은 미검증이며 배포하지 않았다.

## Advisor 최종 확인 2026년 10월 16일

- 최신 origin `a8043564`의 별도 checkout에서 회귀 테스트를 먼저 실행하여 3 FAIL / 1 PASS를 확인한 뒤 작업 변경만 적용했다.
- 저장 대기 중 골드·강화·설정 변경, 늦은 hydrate 성공·실패, A에서 B 계정으로 전환, 미클리어 잠금 유지까지 포함한 관련 7개 파일 93개 테스트가 통과했다.
- 저장 실패 안내를 실제 설정창에 표시하고 한국어·영어·일본어 키를 추가한 최종 변경 후 `LobbySettingsModal.test.jsx`와 `i18nCoverage.test.js` 29개 테스트가 통과했다. 위 93개와 중복되는 테스트가 있으므로 합산하지 않는다.
- `npm run build`가 prebuild의 Firebase 환경·B02·대사·Studio 계약 및 45개 테스트, Vite 빌드, postbuild의 B02 산출물·61개 JS 자산 검증까지 exit 0으로 완료됐다.
- 독립 correctness review에서 저장 중 설정 변경 손실을 추가 발견하여 안정된 최신 runtime이 저장될 때까지 flush하도록 보완했고, 최종 코드 검토의 추가 finding은 없었다.
- `agent-browser --auto-connect`는 연결 가능한 Chrome을 찾지 못했고 CUA의 브라우저 목록도 비어 있었다. 실제 대상 OAuth 검증은 수행하지 못했다. 이 때문에 라이브 배포·실로그인 검증 완료로 보고하지 않는다.
- 실제 사용자 Firebase 데이터는 읽기·쓰기 테스트하지 않았으며 개발 서버와 5173 자동 재시작 작업을 시작하지 않았다.

## 사용자 최종 배포 지시 후

- 위 미배포 기록 뒤 사용자 명시 지시 `그냥 무조건 배포해`를 받아 2026년 10월 16일 00시 24분 35초 KST에 Hosting 라이브로 전환했다.
- 이전 라이브를 `rollback-unlock-20261016` 채널로 보존했다. 새 라이브 `0acd595a13d3fdc1`과 검증된 미리보기 버전이 동일하다.
- 실제 도메인 JS 61개 검증 및 `/`, `/game`, `/landing` HTTP 200·빌드 HTML 해시 일치 확인. 실제 OAuth·재로그인 테스트는 여전히 수행하지 않았고 production 사용자 데이터는 변경하지 않았다.
- 빌드 단계의 일시적 runner 옵션 변경은 원래 package.json 바이트로 복원했다. 세부 배포·롤백 기록은 `Developer/구현기록/빌드배포/web_stage_unlock_release_20261016.md`에 있다.

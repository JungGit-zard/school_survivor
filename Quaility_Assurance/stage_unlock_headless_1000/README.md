# 진행도 저장 헤드리스 브라우저 1,000회 검증

2026-10-16 KST, balanceqa Worker. 최종 결과 **1,000 통과 / 0 실패**, 약 **28.842초**. Chrome **155.0.8059.41**의 실제 headless 브라우저에서 실행했다. jsdom 테스트 반복이 아니다.

검증 대상은 `5a5617bb06d72405eee6ba0e0a985430d8e58e04` checkout의 실제 `useGameStore`, `useAuthStore`, `firebaseProgress`, `stageConfig`다. 게임/인증/진행도 제품 코드는 수정하지 않았다. 세 핵심 소스 파일의 실행 전후 SHA-256은 `result.json`에서 전부 동일하다.

## 검증 범위

브라우저 한 세션 안에서 매회 새로운 fake 계정과 독립 메모리 저장소를 만들었다. 실제 `clearStage()` → 즉시 해금 판정 → 실제 로그아웃 저장 순서 → 메모리 저장소 재읽기를 통과하고, profile/progress/activity/consent의 전체 값·키·자료형·구조가 유지되는지 비교했다. 각 스테이지 클리어 전에는 Stage 2가 잠겨 있는지도 확인했다.

| 시나리오 | 통과 |
| --- | ---: |
| 클리어 직후 로그아웃·재읽기 | 200 |
| 저장 대기 중 골드·영구 강화·진동 설정 변경 | 200 |
| 저장 실패 시 세션 유지 후 재시도 | 200 |
| 늦은 같은 계정 hydrate 성공 | 150 |
| 늦은 같은 계정 hydrate 실패 | 150 |
| 저장 대기 중 A→B 계정 전환 격리 | 100 |
| 합계 | 1,000 |

시드는 `20261016`이다. 가짜 네트워크의 미세한 지연은 고정 시드의 microtask 순서로 바꿨다. 실제 Firebase와 OAuth, 랭킹 전송은 메모리 adapter로만 대체했다. 1,000회 OAuth 로그인이나 1,000회 3D 게임 플레이를 검증한 것이 아니다. Google의 실제 OAuth 로그인 및 제품 화면의 전체 진입은 이 검증과 별개다.

## 원복·네트워크·저장소

- 각 회차 시작 직전 fake 사용자 저장소의 전체 snapshot과 revision, SHA-256을 보존했다. 회차가 끝나면 같은 snapshot으로 복원하고 전체 객체 및 hash/revision 일치를 1,000회 확인했다. `result.json`의 각 row에 전후 hash와 revision이 있다.
- 진행도 runtime도 매회 초기 상태로 복원했다. 첫 상태와 최종 상태 SHA-256은 둘 다 `d5b60a295519bb9d89643de6ed18244338ca967ebfe9ec304bd40442df6e357f`다.
- 브라우저 local/session Storage의 읽기·쓰기·삭제 및 IndexedDB 열기는 예외를 던지도록 막았다. 테스트 통과 중 해당 예외는 없었다.
- QA origin 외 모든 HTTP 요청을 차단하도록 구성했다. 최종 실행에서 외부 요청 시도 0, 브라우저 예외 0이었다. 실제 사용자 Firebase 정본을 읽거나 쓰지 않았다.
- 임시 QA 서버는 localhost의 OS 배정 포트 `50659`, PID `5704`에서 실행 후 종료했다. 앞선 하니스 개발 실행의 QA 포트 `62692`, `51222`, `59770`도 LISTEN하지 않는 것을 확인했다. 상시 개발 서버나 keepalive는 수정하지 않았다.
- 정상 실행의 임시 Vite cache와 Chrome은 finally에서 정리했다. 초기 중단 실행이 남긴 `%TEMP%/stage-unlock-headless-9Zej5y` cache 폴더는 정확한 경로를 확인한 재귀 삭제 명령이 자동 도구 정책으로 거부되어 남아 있다. 실행 중인 서버·브라우저가 아니며 삭제 우회를 하지 않았다.

초기 하니스 개발 중 `/@fs`와 `/src` import URL 혼용으로 모듈이 중복되는 문제와, 너무 빠른 logout 완료 뒤 snapshot을 읽는 하니스 순서 문제를 수정했다. 이 중간 실패를 제품 회귀나 최종 1,000회 결과로 집계하지 않았다. 최종 첫 실패는 없으므로 실패 screenshot은 남기지 않는다.

## 재실행

현재 checkout을 검증하려면 repository root에서 실행한다.

```powershell
node Quaility_Assurance/stage_unlock_headless_1000/run.mjs
```

다른 검증 checkout을 명시하려면 두 번째 인자로 repository 절대 경로를 준다.

```powershell
node Quaility_Assurance/stage_unlock_headless_1000/run.mjs C:/Users/admin/AppData/Local/Temp/ranking-release-20261013
```

검증 checkout에 이미 설치된 Vite와 `@playwright/test`, 설치된 Chrome을 사용한다. 추가 의존성을 설치하지 않는다. 제품 Vite 설정은 불러오지 않으며 QA용 메모리 adapter만 임시 구성한다. 실행 종료 시 `result.json`을 갱신하고, 실패하면 최초 실패 stack과 screenshot을 남긴다. 파일은 이 QA 디렉터리에만 쓴다.

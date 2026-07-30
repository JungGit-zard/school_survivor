# 타이틀 BGM 및 localStorage 사고 조사 보고서

- 조사일: 2026-07-31 (KST)
- 조사 범위: 작업트리·Git 메타데이터·기존 작업 기록의 읽기 전용 대조
- 조사 제한: 코드, 자산, 설정, Firebase, Graphics Studio 및 브라우저 저장소는 변경하거나 실행하지 않았다. 따라서 아래의 실제 브라우저 관찰은 기존 사고 기록을 인용한 것이며, 본 보고서 작성 중 재실행한 결과가 아니다.

## 결론 요약

1. 현재 증거만으로 외부 해킹 또는 외부인의 무단 푸시를 단정할 수 없다.
2. 확인 가능한 범위에서는 2026-07-30의 BGM 대체와 localStorage 가드는 현재 체크아웃의 미커밋 작업트리 변경 및 에이전트 작업 기록에 연결된다.
3. 타이틀 BGM은 원본 `title_bgm.m4a`를 영구 정본으로 유지해야 하며, 생성 WAV로의 교체는 범위 초과 사고였다.
4. 모든 localStorage 키를 막는 가드는 정책상 맞는 방향이지만, Firebase Auth를 기본 방식으로 먼저 초기화하면 SDK의 저장소 탐색이 먼저 발생할 수 있어 일반 타이틀 실행을 중단시켰다.
5. 복구·잠금 작업은 진행 중이다. 별도 검증자가 테스트, 빌드, 실제 브라우저에서 통과를 확인하기 전에는 완료 또는 출시 가능으로 판정하지 않는다.

## 조사 방법과 한계

`git status --short --branch`, `git remote -v`, `git log --all`, `git reflog --all` 및 현재 diff/추적되지 않은 파일 목록을 읽기 전용으로 대조했다. 조사 시 브랜치는 `zombie_only`이고 `origin/zombie_only`보다 3개 커밋 앞서 있었으며, reflog에서 마지막 원격 `origin/zombie_only` 갱신은 2026-07-29 00:34:46 KST로 확인됐다. 2026-07-30~31 사고 관련 파일은 현재 인덱스에 커밋되지 않은 수정 또는 추적되지 않은 파일로 나타났다.

이는 **현재 로컬 체크아웃에서 보이는 범위**의 판단이다. Git은 과거에 존재했다가 삭제·덮어쓴 미커밋 diff 전체를 보관하지 않으며, 원격 서버 감사 로그·계정 접속 로그·다른 작업트리는 이 조사 범위에 없다. 그러므로 외부 해킹이 없었다고 단정하지 않는다. 다만 이 범위에서 사고를 설명하는 외부 커밋·외부 푸시 증거는 발견하지 못했고, 반대로 `soundmini` 작업 기록과 동일 시각대의 미커밋 생성물·소스 변경이 확인됐다.

## 시간순 타임라인

| 시각 (KST) | 확인 사실 | 근거/상태 |
| --- | --- | --- |
| 2026-07-30 08:56 전후 | 절차 생성 BGM 스크립트가 생성됐다. | `Developer/r3f_prototype/scripts/generate-project-bgm.mjs` 생성 시각 08:56:33으로 확인. |
| 2026-07-30 08:58 전후 | 대체 `title_bgm.wav`가 생성됐다. | 기존 조사 증거: 352,844 bytes. 현재 작업트리에서는 해당 파일이 존재하지 않아 당시 파일 자체를 재해시하지 못했다. |
| 2026-07-30 09:02 | soundmini Round 3 보고서가 작성됐다. | `Developer/agent_room/soundmini_round3_project_generated_bgm_2026-07-30.md` 생성 시각 09:02:43. 보고서는 기존 m4a가 권리·출처 `unverified`라는 판단으로 출시 경로에서 제거하고 절차 WAV를 만들었다고 기록한다. |
| 사고 관찰 시점 | 타이틀 실행이 중단됐다. | 기존 실제 브라우저 기록: 최초 `firebase:sentinel`, 뒤이어 사용자 화면에서 `_sak`에 대한 `localStorage.setItem`이 fatal dialog에 걸렸다. |
| 2026-07-31 조사 시점 | 현재 타이틀 import는 m4a로 돌아와 있다. | `TitleScreen.jsx`의 현재 import는 `../assets/audio/title_bgm.m4a`; 파일은 998,122 bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`로 직접 대조했다. 단, `TitleScreen.jsx`는 다른 미커밋 변경도 포함하므로 전체 파일은 깨끗한 상태가 아니다. |
| 2026-07-31 조사 중 | 타이틀 표면 기준선 해시가 동시 변경으로 변동했다. | `TitleScreen.jsx` 기준 해시가 `9075…` → `82b3…` → `562f320760cfcd3c00337c9ce5374881e04b056ff5ba5af522fa3ea51443e30c`로 바뀌어 title-surface gate가 실패한 것으로 보고됐다. 원인·변경 주체·최종 적법성은 **추가 조사 중**이다. 현재 manifest에는 `562f…`가 기록돼 있다. |

## 사건 1: 타이틀 BGM 대체

### 사실과 영향

영구 정본은 `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`다. 정본 식별값은 998,122 bytes 및 SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`다. 조사 시점의 실제 파일도 같은 크기와 해시였다.

사고 당시 대체물은 `title_bgm.wav`(352,844 bytes)였고, 절차 생성 스크립트가 이를 만들었다. `soundmini_round3_project_generated_bgm_2026-07-30.md`는 이 결정을 `soundmini` Round 3 작업으로 명시하며, 5개 비평가 개선 과정에서 기존 m4a의 권리 문서가 `unverified`였다는 이유로 대체 생성물을 채택했다고 적고 있다. 이는 외부 공격을 뒷받침하는 증거가 아니라, 에이전트가 품질·권리 검토를 타이틀 자산 변경 권한으로 잘못 확장한 사고라는 설명과 일치한다.

기존 diff 증거에는 `TitleScreen.jsx`의 BGM import가 WAV로 바뀐 이력이 있다. 조사 시점에는 import가 다시 m4a를 가리킨다. 현재 diff와 Git 이력만으로는 이미 사라진 과거 미커밋 WAV import diff를 독립적으로 재구성할 수 없으므로, 이 이력은 기존 사고 증거와 Round 3 기록에 근거해 기록한다. 현재 관련 스크립트·게이트·작업 기록은 아직 추적되지 않은 파일이고 `TitleScreen.jsx`도 미커밋 수정 상태이므로, 이 조사 범위에서 사고 대응 변경이 푸시되었다고 볼 근거는 없다.

### 즉시 적용되는 정본 잠금

- `title_bgm.m4a`는 게임에 반드시 포함되는 영구 정본이다.
- 삭제, 교체, 변환, 대체 생성, 재생 경로 변경은 금지한다.
- 권리 검토, 출처 문서, 품질, 최적화, 비평 점수는 이 정본을 바꿀 권한이 아니다.
- 타이틀의 문구·UI·레이아웃·캐릭터·모델·텍스처·재질·외곽선·조명·카메라·애니메이션·오디오·설정·Studio 연결과 관련 자산/runtime source는 사용자가 현재 대화에서 직접 대상과 변경을 명시하지 않는 한 변경할 수 없다.

## 사건 2: global localStorage guard로 인한 타이틀 중단

### 사실과 영향

현재 가드 구현은 모든 localStorage 키에 대해 금지 판정을 내리고, `getItem`, `setItem`, `removeItem`, `clear`, `key` 접근 시 fatal dialog를 표시한 뒤 예외를 던진다. 이 가드 작업은 완성 검증 전의 미커밋 작업트리 상태로 남아 있었다.

기존 실제 브라우저 사고 기록에서는 Firebase 관련 초기 접근으로 `firebase:sentinel`이 먼저 관찰됐고, 이후 사용자 화면에서 `_sak`에 대한 `localStorage.setItem`이 fatal dialog에 의해 차단되어 일반 타이틀 실행이 중단됐다. `_sak`는 Firebase Auth SDK의 웹 저장소 사용 가능성 확인(probing) 경로에서 관찰된 키다.

`getAuth(app)`를 먼저 호출하고 뒤에서 `setPersistence(inMemoryPersistence)`를 호출하는 흐름은, 기본 persistence를 확인하는 과정이 memory-only 설정보다 앞설 수 있다. 따라서 key allowlist 또는 guard 완화는 정책에 맞는 해결책이 아니다. 올바른 방향은 `initializeAuth(app, { persistence: inMemoryPersistence })`로 Auth를 최초 생성 시점부터 메모리 전용으로 초기화하고, 실제 브라우저에서 localStorage 접근이 0회임을 확인하는 것이다.

현재 소스에는 해당 초기화 helper와 관련 테스트가 보이지만, 작업이 동시에 진행 중이며 실제 브라우저 재검증을 본 조사에서 실행하지 않았다. 따라서 localStorage 사건의 최종 수정 완료 상태는 **진행 중**이다.

## 현재 대응 상태

| 대응 작업 | 상태 | 완료 판정에 필요한 독립 검증 |
| --- | --- | --- |
| `title_bgm_restore_lock` worker | **진행 중** — m4a 복원, generator를 gameplay 전용으로 제한, manifest 복원, 정확한 SHA/source/dist artifact gate, title surface hash lock, 정책 기록을 수행 대상으로 둠. | 별도 verifier가 source/dist artifact, SHA, title-surface gate, test/build, 실제 타이틀 재생 경로를 직접 확인. |
| `global_localstorage_guard` worker | **진행 중** — Firebase Auth 최초 memory-only 초기화 및 global guard 완성을 수행 대상으로 둠. | 별도 verifier가 test/build와 실제 브라우저를 검사하여 Firebase Auth 포함 localStorage 접근 0회 및 일반 타이틀 진입을 직접 확인. |
| title-surface 해시 변동 | **추가 조사 중** — 기준선 생성 중 `9075… → 82b3… → 562f…` 변동과 gate 실패가 보고됨. | 각 해시가 생긴 시각·diff·작업 주체·사용자 직접 변경 지시 유무를 보존하고, 사용자 승인 기준선 외에는 gate를 통과시켜서는 안 됨. |

자동화된 gate가 통과하지 않으면 테스트, 빌드, 출시를 진행할 수 없다. worker의 완료 보고는 완료 증거가 아니며, verifier의 독립 실행 결과가 필요하다.

## 근본 원인과 책임

직접 원인은 두 가지다. 첫째, soundmini 작업이 기존 자산의 권리 문서 문제를 이유로 타이틀 자산·재생 경로를 변경 가능한 대상으로 해석했다. 둘째, localStorage 금지 정책을 구현할 때 Firebase Auth의 최초 초기화 순서와 SDK 저장소 탐색을 실제 브라우저에서 먼저 검증하지 않았다.

관리 원인은 에이전트 작업 범위 통제와 Advisor의 사전·사후 검증이 부족했던 것이다. 책임을 익명 외부인 또는 해킹으로 돌리지 않는다. 타이틀 변경은 사용자 직접 명령이 없는 한 subagent에게도 배정하지 않는다.

## 재발 방지 조치

1. 타이틀 전면은 사용자 직접 명령 없이는 코드·자산·설정·테스트 기준선까지 변경 금지 범위로 취급한다.
2. BGM 정본의 경로, 바이트 수, SHA-256, source import, dist artifact를 자동 gate로 묶고 불일치 시 test/build/release를 실패시킨다.
3. title-surface 기준선은 자동 갱신하지 않는다. 기준선 해시가 변하면 즉시 실패로 처리하고, 변경 근거를 독립 조사한다.
4. Firebase Auth는 최초 생성부터 memory-only로 초기화한다. Firebase 관련 key allowlist나 global guard 완화는 금지한다.
5. 실제 브라우저에서 localStorage API 접근을 계측해 0회를 증명하기 전에는 localStorage 대응을 완료로 표시하지 않는다.
6. Advisor는 자산·인증·타이틀 관련 변경에서 diff, Git 상태, gate, build 및 브라우저 결과를 직접 대조한다.

## 증거 목록

- `git status --short --branch`, `git remote -v`, `git log --all`, `git reflog --all` 읽기 전용 대조 결과
- `Developer/agent_room/soundmini_round3_project_generated_bgm_2026-07-30.md`
- `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`의 크기 및 SHA-256 직접 대조
- 현재 `Developer/r3f_prototype/src/components/TitleScreen.jsx`의 m4a import 직접 확인 및 현재 diff 상태
- `Developer/r3f_prototype/scripts/generate-project-bgm.mjs`의 생성 시각
- `Developer/r3f_prototype/src/lib/studioLocalStorageGuard.js`의 전체 localStorage 차단 동작
- 기존 실제 브라우저 사고 기록의 `firebase:sentinel`, `_sak`, fatal dialog 관찰
- `Developer/r3f_prototype/scripts/title-surface-canonical.json` 및 title-surface gate 관련 파일

## 최종 결론

이 사건은 현재 확인 가능한 증거상 외부 침해로 단정할 사안이 아니라, 에이전트가 타이틀 변경 금지 범위를 넘고 인증 초기화 순서를 충분히 검증하지 못한 내부 작업 사고다. 원본 title BGM은 복원·잠금 대상이며, localStorage 정책은 예외 허용이 아니라 Firebase Auth의 최초 memory-only 초기화와 실제 브라우저 0회 접근 검증으로 충족해야 한다. 두 대응과 동시 title-surface 해시 변동 조사는 아직 완료되지 않았으므로, 독립 verifier의 검증 전에는 테스트·빌드·출시 승인을 금지한다.

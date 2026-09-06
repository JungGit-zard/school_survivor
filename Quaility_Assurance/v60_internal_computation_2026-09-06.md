# v60 내부 연산 QA 검증 기록

## 범위와 아티팩트

- 대상 AAB: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v60-20260906_1921-7f1d615a.aab`
- SHA-256: `b00617b157b39b577b24c39a349eb099ccfd0decdebaa9ae93f9b8774e15b2f4` (15,660,128 bytes).
- AAB의 `base/assets/public` 277개 파일은 현재 Android public 277개와 모두 SHA-256 일치했다. 현재 `dist` 275개도 모두 AAB와 일치하며, Android public에만 있는 두 파일은 생성된 `cordova.js`, `cordova_plugins.js`다.
- AAB 파일명 접미사와 과거 `7f1d615a` 커밋은 일치하지만 source map이나 빌드 provenance 메타데이터가 없어, 파일명만으로 source revision을 증명하지 않는다.
- 현재 HEAD는 외부 작업의 `4aa8f5bb`이며, v60 기준 `7f1d615a` 이후 여섯 weapon 파일을 바꾼 별도 커밋이다. 따라서 현재 전체 source가 v60 AAB와 동일하다고 주장하지 않는다. 아래 검토는 AAB의 웹 bytes 대조와 지정한 내부 연산 worktree diff를 분리한 결과다.
- manifest/native package와 Firebase 설정은 별도 네이티브 구성 검토 대상이다. 이 자료는 로그인 또는 실제 기기 동작의 성공 증거가 아니다.
- 기기 연결은 없으며, AAB/APK 빌드·설치·배포·그래픽 변경을 수행하지 않았다.

## 내부 연산 변경 검토

현재 예상 작업 범위는 `src/lib/enemySimulation.js`와 해당 테스트다. 그래픽·타이틀·인증 경로는 변경 대상이 아니다.

1. 공간 grid 시작 rebuild를 이전 step의 최종 grid가 여전히 유효한 경우에만 생략한다. 유효성은 pool 객체 동일성, `halfX/halfZ`, active count, highest active index, `spatialRevision`을 모두 확인한다. 시작 rebuild를 생략해도 query counter 세 개는 step 경계에서 0으로 초기화하고, step 종료 rebuild는 유지한다.
2. obstacle slide helper가 이미 충돌 없음으로 반환한 경우 caller의 같은 좌표 재검사를 생략한다. helper가 false를 반환한 경우에는 기존 충돌 검사를 유지한다.

좌표 무효화 경로도 읽었다. spawn, despawn, `setPosition`, `integrate`는 `spatialRevision`을 갱신한다. simulation의 두 직접 x/z 대입은 step 안에서 변경을 누적하고 종료 시 한 번 갱신한다. stable proxy의 translation은 getter-only여서 별도 쓰기 우회 경로가 아니다. 생산 source 검색에서 enemy pool의 x/y/z typed array 직접 대입은 pool 내부와 simulation의 두 지점만 확인됐다. y만 바뀌는 것은 2D x/z grid membership을 바꾸지 않는다.

## 보호 경로 현재 해시

아래는 현재 worktree의 SHA-256 기록이다. 자산 품질·포맷 검수가 아니라, 사용자 고정 그래픽/타이틀/인증 소스의 무변경 경계를 확인하기 위한 값이다. `7f1d615a..HEAD` 및 worktree diff에서 이 핵심 경로의 변경은 관찰되지 않았다.

| 경로 | SHA-256 |
| --- | --- |
| `src/components/TitleScreen.jsx` | `05762cea3ee784f35432559e0ae1fc895712f63d78bc4e3da01bc560852c0814` |
| `src/components/TitleScene3D.jsx` | `c6e51c4d248230f484a1118c6f8f2b0d1d5bd6ab7c60697f316277a3c04f0d7c` |
| `src/components/PlayerMesh.jsx` | `fbf45d425a43f37608d2f28a03c8fae95f4dccc49fa0889817ee9b5e8848ed5d` |
| `src/title/frozenStudio.js` | `244485fec87d77cb22fb28390d744ec62a52e406371ca1e5536aa9dbe597caea` |
| `src/title/studioSnapshot.json` | `f32eecf4de768d8903461b3576a4de3c5c29c39a5b212bdf1904d46f9e55f7ef` |
| `src/lib/firebaseAuth.js` | `3415854b698e5e5f3b5a8be3084d7b71f3c09b9decf05e57768f2b74e0db1b44` |
| `android/app/google-services.json` | `a9abdb83e10e27b86fe973dc4012a900d560c32828500e19496d79e896cc5939` |
| `android/app/src/main/assets/capacitor.config.json` | `5fe227c240054840e2c995984e53661fdb642b0fc0a820ab20a3885d7a55e1a9` |

## 검증 상태

- main이 `node --check src/lib/enemySimulation.js`, 대상 source/test의 `git diff --check`, 그리고 `7f1d615a` 대비 TitleScreen·TitleScene3D·PlayerMesh·`src/title`·`firebaseAuth`의 `git diff --exit-code`를 실행해 모두 통과했다.
- main이 `node Quaility_Assurance/v60_mobile_performance/enemySimulationBaselineDifferential.mjs`를 실행해 exit 0을 확인했다. in-memory `7f1d615a` baseline과 현재 module을 10,800 frames 비교한 결과는 initial 150, end 97, max 150이며 각 frame의 pooled typed arrays, grid hash, events가 동일했다. rebuild count는 21,600에서 10,801로, obstacle x-read count는 27,412,428에서 21,117,918로 감소했다. 이 값은 실기기 FPS나 전체 CPU 사용률 측정값이 아니다.
- main의 최신 focused test는 5 files/107 tests를 모두 통과했다. baseline Vite 설정으로 `7f1d615a`의 `enemySimulation.js`만 주입한 soak도 marker `[v60 baseline enemySimulation 7f1d615a]`를 확인한 뒤 frame 2565 / 42.75 seconds에서 같은 `chibiko singleTargetProjectiles: true` 비수치 오류로 1 passed / 1 failed를 재현했다. 이 soak 실패는 이번 candidate 1/2 이전에도 존재했으므로 변경과 분리한다. 장시간 전체 soak PASS로 표기하지 않는다.
- main은 대상 source SHA가 검증 전후 동일함을 확인했다. Firebase 실접속 0회, 기기 검증 0회, 새 build 0회다. baseline differential은 `enemySimulation.js`만 in-memory로 과거 source를 사용하고 의존 module은 현재 것을 사용하므로, 전체 v60 build 재현 검증은 아니다.
- 내부 연산의 scoped differential·focused 검증은 통과했지만, 이 기록은 release 성공이나 실기기 FPS/전체 CPU·그래픽 보존을 주장하지 않는다.

## Routing

- Existing `escape-zombie-school` board card `t_dec2a7be` and the `balanceqa` review path were referenced. No new production card was created, preventing duplicate automatic dispatch for this v60 audit.
- Actual roles: Astra advisor, Terra Codex worker for independent QA, and a separate render implementation worker. This report covers QA only.

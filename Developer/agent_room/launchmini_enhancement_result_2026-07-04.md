# Launch_Mini enhancement result — 2026-07-04

프로젝트: Escape! zombie school  
역할: Launch_Mini / 런치미니  
Kanban task: `t_b71d0606`  
범위: Google Play launch, Play policy, store listing, testing tracks, AAB readiness, release gate  
금지 범위: 게임 코드 변경, Play Console 제출, production/global release, commit/push, secrets 기록

## 결론

판정: Google Play internal testing도 아직 `No-Go` / 조건부 대기.  
production/global rollout은 Terry의 명시 승인 없이는 진행하면 안 된다.

이번 30분 self-upgrade에서는 출시 정책 지식 자체보다, 현재 프로젝트의 Android/AAB release gate를 더 구체화했다. 핵심은 `versionCode`는 올라갔지만, 현재 AAB가 최신 `dist`를 반영했다는 근거가 없고, 현재 shell에서 `java`가 없어 새 AAB를 재생성·검증할 수 없다는 점이다.

## 읽은 필수 문서

- `AGENTS.md`
- `project_develop_policy.md`
- `CEO/current_product_priorities.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- `Developer/agent_room/game_development_kanban_process.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Launch_Mini.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/README.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/ledger.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/source_index.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/knowledge_base.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/learning_transfer_manifest.md`

## 실제 확인 결과

### 1. Git 상태

명령:

```bash
git status --short --branch
```

결과 요약:

```text
## feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics
 M AGENTS.md
 M Developer/agent_room/game_development_kanban_process.md
 M Developer/agent_room/subagent_system_wiring_2026-07-03.md
?? Developer/agent_room/remaining_subagents_enhancement_batch_2026-07-04.md
?? Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md
?? Developer/agent_room/soundmini_research_start_result_2026-07-04.md
?? Developer/firebase_realtime_database_rules_todo_2026-07-04.md
```

주의: 위 변경들은 이 카드 시작 전 존재하던 기존 변경/산출물이다. 이번 카드에서는 게임 코드 변경, commit, push를 하지 않았다.

### 2. Android/Capacitor release 식별값

근거 파일:

- `Developer/r3f_prototype/capacitor.config.json`
- `Developer/r3f_prototype/android/app/build.gradle`
- `Developer/r3f_prototype/android/variables.gradle`
- `Developer/r3f_prototype/android/app/src/main/AndroidManifest.xml`

확인값:

| 항목 | 값 | 출시 게이트 의미 |
|---|---:|---|
| Capacitor appId | `com.jungyoon.zombieschool` | Play package와 일치 |
| Android namespace | `com.jungyoon.zombieschool` | 적합 |
| Android applicationId | `com.jungyoon.zombieschool` | 적합 |
| appName | `Escape Zombie School` | 공개 표시명 최종 확인 필요 |
| versionCode | `4` | Play Console 최신 artifact보다 커야 함 |
| versionName | `1.0.3` | 내부 테스트 후보명으로 가능 |
| compileSdkVersion | `36` | 확인됨 |
| targetSdkVersion | `36` | 현재 target SDK gate 관점에서 적합 방향 |
| explicit permission | `INTERNET` | 최종 merged manifest 재검증 필요 |

### 3. JDK/AAB freshness 확인

명령 요약:

```bash
java -version
find Developer/r3f_prototype -name '*.aab' -printf '%p|%s|%TY-%Tm-%Td %TH:%TM:%TS\n'
unzip -l Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab | grep 'assets/public/assets/index-'
find Developer/r3f_prototype/dist/assets -maxdepth 1 -type f -printf '%f|%s\n'
```

실제 결과:

- `java`: command not found
- `app-release.aab`: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`, 9,452,081 bytes, mtime 2026-07-02 07:24:03
- intermediary AAB: `Developer/r3f_prototype/android/app/build/intermediates/intermediary_bundle/release/packageReleaseBundle/intermediary-bundle.aab`, 17,172,922 bytes, mtime 2026-07-02 07:24:02
- 현재 `dist` 주요 JS: `index-CvQ51Ikf.js`
- AAB 내부 주요 JS: `base/assets/public/assets/index-B9isv7M-.js`

판정:

- 현재 shell에서는 JDK/JAVA_HOME 부재로 Android Gradle build 재생성 검증이 불가하다.
- AAB 파일은 존재하지만 현재 `dist`의 주요 JS asset과 AAB 내부 주요 JS asset이 다르다.
- 따라서 이 AAB를 최신 웹 빌드 반영본이라고 판단하면 안 된다.

## 강화된 Google Play release gate

Internal testing 후보 AAB 전환 전 최소 체크리스트:

1. JDK/JAVA_HOME 복구:
   - `java -version`
   - `cd Developer/r3f_prototype/android && ./gradlew --version`
2. 웹 빌드/테스트 clean exit:
   - `cd Developer/r3f_prototype && npm run build`
   - `cd Developer/r3f_prototype && npx vitest run --maxWorkers=1 --no-file-parallelism`
3. 최신 웹 번들 반영:
   - `cd Developer/r3f_prototype && npx cap sync android`
4. signed AAB 재생성:
   - `cd Developer/r3f_prototype/android && ./gradlew :app:bundleRelease`
5. freshness 검증:
   - `dist/assets/index-*.js`와 AAB 내부 `base/assets/public/assets/index-*.js`가 같은 빌드에서 나온 것인지 확인
6. Play Console 비교:
   - Console 최신 artifact `versionCode`보다 새 AAB `versionCode`가 큰지 확인
7. internal testing 한정 검증:
   - 설치, 첫 실행, 1판 루프, pause/resume, 모바일 조작, 로그인/데이터 삭제/광고·결제 선언 정합성, pre-launch report 확인

## 이번에 업데이트한 런치미니 지식 파일

- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/iterations/iteration_20260704_103330_KST_Launch_Mini_30m_self_upgrade.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/ledger.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/source_index.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/knowledge_base.md`

## source URLs

새 외부 URL fetch는 하지 않았다. 기존 런치미니 source index의 공식 문서 체계를 재사용했다.

- https://developer.android.com/guide/app-bundle
- https://support.google.com/googleplay/android-developer/answer/9842756
- https://support.google.com/googleplay/android-developer/answer/9859348
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/14151465

## 다음 slice

- JDK/JAVA_HOME 복구 후 signed AAB를 새로 생성하고, AAB 내부 asset과 현재 `dist` asset의 freshness를 검증한다.
- 이후 `CEO/`에 새 release gate 문서를 갱신하고, `balanceqa`의 Android/WebView smoke 및 release blocker 검증과 연결한다.

## blockers

- 현재 shell에서 `java` 없음.
- Play Console 최신 artifact/versionCode와 테스트 트랙 상태는 이 작업에서 직접 접근하지 않음.
- 실제 internal-test 기기 설치 smoke, Play pre-launch report, Data safety 최종 입력값은 아직 미확인.

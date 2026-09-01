# Galaxy A24 Play v50 성능 baseline — launchmini

- Kanban task: `t_676b37c0`
- 작성 시각: 2026-08-31 00:54 KST
- 작업 범위: Play 배포판 `com.jungyoon.zombieschool` 현재 v50의 Galaxy A24 실기기 성능 baseline 수집 시도
- 판정: **NO-GO / 미측정** — ADB에 연결·인증된 실기기가 없어 물리기기 baseline을 수집하지 못했다.
- 허용 산출물: 이 문서 1개와 bounded raw artifact 폴더 `Quaility_Assurance/galaxy_a24_play_v50_performance_baseline_2026-08-31_raw/`

## 1. 필수 게이트

### 1-1. mandatory pre-command checker

실행한 첫 명령:

```bash
cd 'D:/JungSil/2.Minigame_project/school_survivor-integration' && powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile launchmini -Domain auto -TaskSummary 'galaxy-a24-performance-baseline'
```

결과:

- exit code: `0`
- `resolved_domains`: `common`, `aab`
- `matched_domains`: `[]`
- `match_evidence`: `[]`
- `combined_receipt_sha256`: `8a2aefc8240a854e4f6edb119b07763a35d4dd5af8145235834420d841fcf7bc`
- mandatory launchmini preflight 포함 확인: `Developer/agent_room/launchmini_aab_physical_android_google_login_mandatory_preflight.md`

읽은 READ_REQUIRED 및 추가 필수 문서:

- `AGENTS.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `Developer/agent_room/codex_session_failure_postmortem_2026-08-08.md`
- `Developer/agent_room/codex_session_responsibility_reflection_2026-08-08.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `Developer/agent_room/launchmini_aab_physical_android_google_login_mandatory_preflight.md`
- `Developer/agent_room/launchmini_aab_v22_readiness_2026-07-27.md`
- `Developer/agent_room/launchmini_aab_v23_build_2026-07-31.md`
- `Developer/agent_room/mandatory_precommand/manifest.json`
- `Developer/agent_room/mandatory_precommand/README.md`
- `Developer/구현기록/빌드배포/aab_build_v48_2026-08-25.md`
- `docs/solutions/integration-issues/capacitor-android-firebase-google-login-aab.md`
- `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`
- `project_develop_policy.md`
- `Quaility_Assurance/google_play_version_ledger.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최신 단일 entry: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`
- 추가 프로젝트 우선순위 문서: `CEO/current_product_priorities.md`
- 추가 성능/물리 진단 정본: `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md` §6
- 추가 현재 v50 빌드 기록: `Developer/agent_room/launchmini_aab_v50_35ef77c3_build_2026-08-30.md`

### 1-2. 적용한 안전 경계

준수:

- 데이터 삭제 없음: `pm clear`, uninstall, sideload 실행 안 함.
- Firebase 변경 없음: 로그인 변경, DB/Auth mutation, Console 변경 없음.
- Play Console 변경 없음: 업로드, 제출, publish, track/tester/country 변경 없음.
- AAB 재빌드 없음, source/runtime/game code 변경 없음.
- commit/push/reset/destructive checkout 없음.
- title-only 조건을 위해 앱을 실행하는 단계까지도 실기기 부재로 진행하지 않음.

## 2. 기준 v50 정보

다음 값은 실기기에서 측정한 설치 상태가 아니라, 기존 v50 빌드 기록에서 확인한 업로드 후보 정보다.

출처: `Developer/agent_room/launchmini_aab_v50_35ef77c3_build_2026-08-30.md`

- package/applicationId: `com.jungyoon.zombieschool`
- source commit: `35ef77c38748f19c8542746e6c806b55bee6e76a`
- versionCode: `50`
- versionName: `1.0.26`
- artifact: `D:\JungSil\2.Minigame_project\school_survivor-integration\Developer\r3f_prototype\android\app\build\outputs\bundle\release\app-release-v50-20260830_2324-35ef77c38748.aab`
- size: `15,615,486 bytes`
- SHA-256: `a6f9d14a827a9bc509b117da66b7909f00ca5e484023a6982e542092834f0dcb`
- build record limitation: Google Play upload / Play 배포판 설치 / 로그아웃 새 세션 Google OAuth / 로그인 후 게임 진입은 `NOT_RUN`으로 기록되어 있음.

실기기에서 확인하지 못한 값:

- 설치된 package version/source
- installer package name / Play install source
- Galaxy A24 기기 모델·OS·refresh rate·thermal·battery
- gfxinfo framestats
- meminfo
- CPU/top
- SurfaceFlinger latency/list
- Perfetto trace

## 3. 실제 ADB 게이트 결과

Raw evidence:

- `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\galaxy_a24_play_v50_performance_baseline_2026-08-31_raw\adb_version.txt`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\galaxy_a24_play_v50_performance_baseline_2026-08-31_raw\adb_devices.txt`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\galaxy_a24_play_v50_performance_baseline_2026-08-31_raw\session_git_status.txt`
- `D:\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\galaxy_a24_play_v50_performance_baseline_2026-08-31_raw\git_diff_stat.txt`

Observed ADB tool:

```text
ADB_PATH=/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe
Android Debug Bridge version 1.0.41
Version 37.0.0-14910828
Installed as C:\Users\admin\AppData\Local\Android\Sdk\platform-tools\adb.exe
Running on Windows 10.0.26200
```

Observed device list:

```text
List of devices attached
```

Gate result:

- `DEVICE_SERIAL`: 없음
- physical Android state: **NO-GO: connected/authorized physical Android device not found**
- 원인 분류: ADB 도구는 존재하지만, `adb devices -l`에 `device` 상태의 Galaxy A24 또는 기타 실기기 serial이 표시되지 않음.

## 4. 성능 baseline 결과

### 4-1. 측정된 사실

- ADB는 설치되어 있고 실행된다.
- `adb devices -l` 결과에 연결·인증된 Android device가 없다.
- 따라서 Play v50 설치본의 package version/source를 실기기에서 읽지 못했다.
- 따라서 Galaxy A24의 OS, refresh, thermal, battery 상태를 읽지 못했다.
- 따라서 title-only cold/warm 조건에서 gfxinfo/meminfo/CPU/SurfaceFlinger/Perfetto baseline을 수집하지 못했다.

### 4-2. 추론 / 미검증

- v50 AAB 업로드 후보 자체의 package/version/artifact identity는 기존 빌드 기록으로 확인 가능하지만, 현재 물리기기에 해당 v50 Play 배포판이 설치되어 있는지는 미검증이다.
- 성능 저하 원인, 프레임 pacing, 메모리 누수, GC, GPU/CPU 병목, R3F/Rapier body 수 불일치는 모두 미검증이다.
- `R3F/Rapier stability §6` 기준의 deterministic baseline이 없으므로 fix 우선순위나 원인 확정은 아직 승인할 수 없다.

## 5. 연결되면 실행할 정확한 read-only 명령 세트

아래 명령은 연결·인증된 실기기 serial이 생긴 뒤 실행할 준비 명령이다. 데이터 삭제, uninstall, sideload, Firebase mutation, Play Console mutation을 포함하지 않는다.

전제:

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration
ADB='/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe'
PKG='com.jungyoon.zombieschool'
OUT='Quaility_Assurance/galaxy_a24_play_v50_performance_baseline_2026-08-31_raw'
mkdir -p "$OUT"
"$ADB" devices -l > "$OUT/adb_devices.txt"
SERIAL='<adb devices -l 에서 device 상태로 표시된 Galaxy A24 serial>'
```

### 5-1. package/version/install source 확인

```bash
"$ADB" -s "$SERIAL" shell getprop > "$OUT/getprop.txt"
"$ADB" -s "$SERIAL" shell dumpsys package "$PKG" > "$OUT/package_dump_before.txt"
"$ADB" -s "$SERIAL" shell cmd package list packages -i "$PKG" > "$OUT/install_source_before.txt"
"$ADB" -s "$SERIAL" shell dumpsys package "$PKG" | grep -Ei 'versionCode|versionName|firstInstallTime|lastUpdateTime|installerPackageName|Signing|signatures' > "$OUT/version_install_summary.txt"
```

필수 판정:

- package가 `com.jungyoon.zombieschool`인지 확인.
- installed versionCode/versionName이 Play v50 기대값 `50` / `1.0.26`인지 확인.
- install source가 Google Play 계열인지 확인. 아니면 Play v50 strict baseline이 아니라 local/sideload baseline으로 라벨링.

### 5-2. 기기/OS/refresh/thermal/battery 상태

```bash
"$ADB" -s "$SERIAL" shell getprop ro.product.manufacturer > "$OUT/device_manufacturer.txt"
"$ADB" -s "$SERIAL" shell getprop ro.product.model > "$OUT/device_model.txt"
"$ADB" -s "$SERIAL" shell getprop ro.build.version.release > "$OUT/android_release.txt"
"$ADB" -s "$SERIAL" shell getprop ro.build.version.sdk > "$OUT/android_sdk.txt"
"$ADB" -s "$SERIAL" shell dumpsys display > "$OUT/display_dump.txt"
"$ADB" -s "$SERIAL" shell dumpsys battery > "$OUT/battery_dump.txt"
"$ADB" -s "$SERIAL" shell dumpsys thermalservice > "$OUT/thermalservice_dump.txt"
```

### 5-3. title-only cold/warm 조건 잠금

주의: 이 단계는 로그인 버튼 탭, 계정 선택, Firebase 쓰기, Play/Firebase Console 변경을 하지 않는다. 앱 실행으로 발생하는 읽기/자동 네트워크 로그는 관찰만 한다.

```bash
# cold-ish title start: app data 삭제가 아니라 프로세스만 종료 후 시작
"$ADB" -s "$SERIAL" shell am force-stop "$PKG"
"$ADB" -s "$SERIAL" shell am start -n "$PKG/.MainActivity" > "$OUT/am_start_cold_title.txt"
sleep 15
"$ADB" -s "$SERIAL" shell dumpsys activity top > "$OUT/activity_top_cold_title.txt"
"$ADB" -s "$SERIAL" shell screencap -p /sdcard/galaxy_a24_play_v50_title_cold.png
"$ADB" -s "$SERIAL" pull /sdcard/galaxy_a24_play_v50_title_cold.png "$OUT/galaxy_a24_play_v50_title_cold.png"

# warm title: 종료 없이 다시 foreground 관찰
"$ADB" -s "$SERIAL" shell input keyevent KEYCODE_HOME
sleep 3
"$ADB" -s "$SERIAL" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 > "$OUT/monkey_warm_title.txt"
sleep 15
"$ADB" -s "$SERIAL" shell screencap -p /sdcard/galaxy_a24_play_v50_title_warm.png
"$ADB" -s "$SERIAL" pull /sdcard/galaxy_a24_play_v50_title_warm.png "$OUT/galaxy_a24_play_v50_title_warm.png"
```

### 5-4. gfxinfo / meminfo / CPU / SurfaceFlinger

```bash
"$ADB" -s "$SERIAL" shell dumpsys gfxinfo "$PKG" reset > "$OUT/gfxinfo_reset_before_title.txt"
sleep 60
"$ADB" -s "$SERIAL" shell dumpsys gfxinfo "$PKG" framestats > "$OUT/gfxinfo_framestats_title_60s.txt"
"$ADB" -s "$SERIAL" shell dumpsys gfxinfo "$PKG" > "$OUT/gfxinfo_summary_title_60s.txt"
"$ADB" -s "$SERIAL" shell dumpsys meminfo "$PKG" > "$OUT/meminfo_title_60s.txt"
"$ADB" -s "$SERIAL" shell top -b -n 1 > "$OUT/top_snapshot_title_60s.txt"
"$ADB" -s "$SERIAL" shell dumpsys SurfaceFlinger --list > "$OUT/surfaceflinger_list.txt"
"$ADB" -s "$SERIAL" shell dumpsys SurfaceFlinger > "$OUT/surfaceflinger_dump.txt"
```

SurfaceFlinger latency는 실제 layer 이름 확인 후에만 실행한다:

```bash
LAYER='<surfaceflinger_list.txt에서 확인한 com.jungyoon.zombieschool 관련 layer 이름>'
"$ADB" -s "$SERIAL" shell dumpsys SurfaceFlinger --latency "$LAYER" > "$OUT/surfaceflinger_latency_title.txt"
```

### 5-5. Perfetto 후보

Perfetto는 trace 버퍼와 시간 비용이 있어 실행 가능할 때만 짧게 수집한다. 실패해도 gfxinfo/meminfo baseline을 대체하지 않는다.

```bash
"$ADB" -s "$SERIAL" shell perfetto -o /data/misc/perfetto-traces/galaxy_a24_play_v50_title_20s.perfetto-trace -t 20s sched freq idle am wm gfx view webview
"$ADB" -s "$SERIAL" pull /data/misc/perfetto-traces/galaxy_a24_play_v50_title_20s.perfetto-trace "$OUT/galaxy_a24_play_v50_title_20s.perfetto-trace"
```

## 6. R3F/Rapier stability §6 적용 상태

§6 진단 프로토콜 기준 현재 상태:

1. 재현 조건 고정: **부분 완료** — 대상은 Galaxy A24 / Play v50 / title-only baseline으로 고정했으나 기기 부재로 실제 실행 조건은 미확정.
2. 계측 부착/수집: **미수행** — 실기기 부재.
3. DEV 전용 불변식 삽입: **범위 밖** — 이 카드는 read-only Play v50 baseline이며 source/runtime 변경 금지.
4. 증상 분기: **불가** — 프레임/메모리/CPU/GPU 자료 없음.
5. 최소 재현 축소: **불가** — 기기 실행 자료 없음.
6. 수정 후 회귀 검증: **불가** — 이 카드는 fix 카드가 아니며 baseline이 먼저 필요.

## 7. 최종 판정

- 실기기 baseline: **NO-GO / 미측정**
- 정확한 차단 gate: `adb devices -l`에 `device` 상태의 물리 Android serial이 없음.
- Play v50 installed package identity: **미검증**
- Galaxy A24 device/OS/thermal/battery: **미검증**
- gfxinfo/meminfo/CPU/SurfaceFlinger/Perfetto: **미수집**
- 성능 원인 또는 fix 후보: **판정 금지** — deterministic baseline 부재.

후속 synthesis 카드에는 이 결과를 “launchmini 실기기 baseline 부재 / ADB device not connected”로 반영해야 한다.

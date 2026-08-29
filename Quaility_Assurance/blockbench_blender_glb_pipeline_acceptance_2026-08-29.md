# Blockbench-Blender GLB 파이프라인 독립 수용 QA (2026-08-29)

- 담당: `balanceqa`
- Kanban: `escape-zombie-school` / `t_5dd8b864`
- 범위: 공식 Blockbench 출처/버전/설치 경로, Blender 5.2 headless 변환, `.bbmodel` 교환 경계, 안정 이름/축/스케일/flat normals/재질, GLB parse/reimport, 임시 파일 cleanup, 제품 코드·Studio·Firebase·Title 불변성 확인.
- 금지 준수: 제품 코드, Studio 값, Firebase, Title 런타임, AAB/빌드/commit/push 변경 없음. 검증용 임시 산출물은 Kanban scratch workspace에서만 만들고 제거했다.

## 판정

조건부 PASS.

확인된 경로는 `.bbmodel`을 Blender에 직접 넣는 경로가 아니라, Blockbench에서 수정 원본 `.bbmodel`을 보관하고 `File → Export → glTF 2.0`으로 만든 `.glb`만 Blender 5.2 정리 단계로 넘기는 경계다. 이 경계는 프로젝트 스크립트의 입력 확장자 가드와 음성 테스트로 확인했다. Blender 5.2 headless 정규화·검증 왕복은 PASS이며, GLB header/JSON parse/reimport에서 안정 이름, 단위 스케일, flat normals, 재질, armature 금지 조건, 임시 디렉터리 cleanup을 확인했다.

주의: 이번 QA는 임시 fixture와 스크립트 계약 검증이다. 실제 사용자 원화 또는 실제 Blockbench UI에서 저장된 `.bbmodel` 원본 파일을 열어 사람이 export하는 UX까지 화면으로 검증하지는 않았다. 따라서 “실제 원화 자산 1종 production 적용 완료”가 아니라 “파이프라인 수용 조건 확인”으로만 기록한다.

## 필수 게이트

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary 'Blockbench Blender GLB pipeline acceptance QA'

resolved_domains: common, qa
matched_domains: qa
match_evidence: qa keyword
combined_receipt_sha256: 17bfa38d31059334f94af46b4cf454af67f9e1f93afe388ce12187f97bb9e283
exit_code: 0
```

읽은 필수 문서:

- `AGENTS.md`
- `Bang_Rules.md`
- `CLAUDE.md`
- `project_develop_policy.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최신 단일 엔트리: `Session 7 · Entry 4 · 2026-08-09 1641 KST`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- `Developer/agent_room/mandatory_precommand/README.md`
- `Developer/agent_room/mandatory_precommand/manifest.json`
- `Developer/agent_room/balanceqa_b03_shuttle_run_adversarial_review_2026-08-29.md`
- `Quaility_Assurance/stage1_2_3_theatrical_lighting_acceptance_plan_2026-08-25.md`

관련 산출물도 읽었다:

- `Developer/blockbench_install_audit_2026-08-29.md`
- `Developer/blockbench_blender_glb_pipeline_2026-08-29.md`
- `Graphic_designer/blockbench_blender_glb_pipeline_role_record_2026-08-29.md`
- `Graphic_designer/zombie_school_ai_3d_modeling_pipeline_2026-08-29.md`
- `Planner/open_source_ai_3d_engine_landscape_2026-08-29.md`
- `Developer/r3f_prototype/scripts/blockbench_blender_glb/README.md`
- `Developer/r3f_prototype/scripts/blockbench_blender_glb/input/README.md`
- `Developer/r3f_prototype/scripts/blockbench_blender_glb/make_lowpoly_fixture.py`
- `Developer/r3f_prototype/scripts/blockbench_blender_glb/normalize_export.py`
- `Developer/r3f_prototype/scripts/blockbench_blender_glb/validate_glb.py`

## 1. 공식 Blockbench provenance / version / path

### 공식 출처 확인

GitHub API 직접 조회 결과:

```text
github_repo.full_name= JannisX11/blockbench
github_repo.html_url= https://github.com/JannisX11/blockbench
github_repo.license= GPL-3.0
github_repo.default_branch= master
latest_release.tag_name= v5.1.6
latest_release.name= 5.1.6 - The Workflow Update [Patch 6]
latest_release.html_url= https://github.com/JannisX11/blockbench/releases/tag/v5.1.6
latest_release.assets= Blockbench_5.1.6.AppImage, Blockbench_5.1.6.deb, Blockbench_5.1.6.exe, Blockbench_5.1.6.exe.blockmap, Blockbench_5.1.6.rpm, Blockbench_5.1.6_portable.exe, Blockbench_arm64_5.1.6.dmg, Blockbench_arm64_5.1.6.dmg.blockmap, Blockbench_arm64_5.1.6.exe, Blockbench_arm64_5.1.6.exe.blockmap, Blockbench_arm64_5.1.6.zip, Blockbench_arm64_5.1.6.zip.blockmap, Blockbench_x64_5.1.6.dmg, Blockbench_x64_5.1.6.dmg.blockmap, Blockbench_x64_5.1.6.exe, Blockbench_x64_5.1.6.exe.blockmap, Blockbench_x64_5.1.6.zip, Blockbench_x64_5.1.6.zip.blockmap, latest-linux.yml, latest-mac.yml
```

### 로컬 설치 확인

초기 조회 순간에는 설치가 아직 잡히지 않았으나, `Developer/blockbench_install_audit_2026-08-29.md` 기록과 이후 재조회에서 현재 사용자 설치가 확인됐다. 최종 로컬 검증 결과:

```text
FullName       : C:\Users\admin\AppData\Local\Programs\Blockbench\Blockbench.exe
Length         : 214094248
ProductVersion : 5.1.6.0
FileVersion    : 5.1.6

Status     : Valid
Signer     : CN=Jannis Tobias Petersen, O=Jannis Tobias Petersen, S=Schleswig-Holstein, C=DE
Thumbprint : C58B108F74F9778617E7419693180E2C5E8CCBCD

DisplayName     : Blockbench 5.1.6
DisplayVersion  : 5.1.6
Publisher       : JannisX11
UninstallString : "C:\Users\admin\AppData\Local\Programs\Blockbench\Uninstall Blockbench.exe" /currentuser
```

`Developer/blockbench_install_audit_2026-08-29.md`의 추가 provenance:

```text
Official x64 Windows installer URL: https://github.com/JannisX11/blockbench/releases/download/v5.1.6/Blockbench_x64_5.1.6.exe
Asset size: 104,793,200 bytes
SHA-256 measured locally: FB209EBF7BE3A2B077EE0D2A817A31E2CA8E837E4F42C714FC7659C414ECE5ED
Official manifest SHA-512 matched locally.
Authenticode: Valid
Signer: Jannis Tobias Petersen
```

### Blockbench 실행 잔여 프로세스

`Blockbench.exe --version`는 버전 문자열 대신 updater 로그를 냈고 30초 timeout으로 종료했다. 이후 잔여 프로세스 없음:

```text
Checking for update
Update for version 5.1.6 is not available (latest version: 5.1.6, downgrade is disallowed).
...
Get-Process Blockbench: no output
```

판정: 공식 provenance, 버전 5.1.6, 설치 경로, 서명은 확인됨. 다만 CLI 버전 출력은 지원 형태가 아니어서 파일 버전/레지스트리/서명으로 판정한다.

## 2. Blender 5.2 headless 경로

설치 및 바이너리 확인:

```text
C:\Program Files\Blender Foundation\Blender 5.2\blender.exe --version
Blender 5.2.0 LTS
build date: 2026-07-14
build time: 01:35:40
build commit date: 2026-07-13
```

파일 해시:

```text
Algorithm : SHA256
Hash      : E27FBFEA8564AA645D4463CB0949695FD85562B9DE6DF9561B06859A1074ADF7
Path      : C:\Program Files\Blender Foundation\Blender 5.2\blender.exe
```

검증 명령은 모두 `--background --factory-startup`으로 실행했다. 따라서 GUI 세션, Studio, Firebase, Title 화면을 열지 않았다.

## 3. `.bbmodel` interchange boundary

문서 계약:

- `.bbmodel`: Blockbench 수정 원본으로 보관.
- Blender 입력: `.bbmodel`이 아니라 Blockbench가 export한 `.glb`.
- 프로젝트 정규화 스크립트는 `--input` 확장자가 `.glb`가 아니면 실패해야 한다.

음성 테스트 결과:

```text
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python-exit-code 1 --python scripts/blockbench_blender_glb/normalize_export.py -- --input <tmp>/direct-source.bbmodel --output <tmp>/should-not-exist.glb --asset-id qa-fixture --armature optional

RuntimeError: input must be a .glb exported from Blockbench
NEGATIVE_EXIT_CODE=1
NO_OUTPUT_CREATED=TRUE
NEGATIVE_TMP_CLEANUP_OK
```

판정: `.bbmodel`을 Blender 정규화 단계에 직접 넣는 경로는 차단된다. 이는 “Blockbench 원본 보관 / GLB 교환” 경계를 만족한다.

## 4. 프로젝트 파이프라인 smoke: fixture → normalize → validate

실행 위치: `Developer/r3f_prototype`

임시 출력 위치: `C:\Users\admin\AppData\Local\hermes\kanban\boards\escape-zombie-school\workspaces\t_5dd8b864\project_pipeline_smoke`

실행 명령 요약:

```text
blender --background --factory-startup --python-exit-code 1 --python scripts/blockbench_blender_glb/make_lowpoly_fixture.py -- --output <workspace>/project_pipeline_smoke/fixture.glb
blender --background --factory-startup --python-exit-code 1 --python scripts/blockbench_blender_glb/normalize_export.py -- --input <workspace>/project_pipeline_smoke/fixture.glb --output <workspace>/project_pipeline_smoke/fixture-normalized.glb --asset-id qa-fixture --armature forbid
blender --background --factory-startup --python-exit-code 1 --python scripts/blockbench_blender_glb/validate_glb.py -- --input <workspace>/project_pipeline_smoke/fixture-normalized.glb --asset-id qa-fixture --armature forbid
```

결과:

```text
normalized_glb=C:\Users\admin\AppData\Local\hermes\kanban\boards\escape-zombie-school\workspaces\t_5dd8b864\project_pipeline_smoke\fixture-normalized.glb
mesh_count=2
armature_count=0
{"armature_count": 0, "asset_id": "qa-fixture", "errors": [], "input": "...\\fixture-normalized.glb", "mesh_count": 2, "status": "pass", "triangle_count": 24}
normalized_size_bytes= 3604
glb_header= (b'glTF', 2, 3604)
CLEANUP_OK
```

판정:

- Blender 5.2 headless 변환: PASS.
- armature forbid 조건: PASS (`armature_count=0`).
- validator status: PASS (`errors=[]`).
- GLB header parse: PASS (`magic glTF`, version 2, declared length 3604).
- temporary directory cleanup: PASS.

## 5. 독립 GLB parse / reimport probe

추가로 Kanban scratch workspace의 독립 probe에서 안정 이름, material, transform, flat normals, extras 보존을 직접 검사했다. 이 probe는 제품 코드가 아니라 QA용 임시 Python이다.

실행:

```text
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python C:\Users\admin\AppData\Local\hermes\kanban\boards\escape-zombie-school\workspaces\t_5dd8b864\blender_glb_pipeline_probe.py
```

Blender 출력 핵심:

```text
{
  "glb_header_valid": true,
  "stable_names_present_in_glb_nodes": true,
  "studio_part_extras_present": true,
  "materials_exact_set": true,
  "reimport_meshes_all_flat": true,
  "reimport_object_count": 3,
  "reimport_transforms_unit_scale": true,
  "unit_scale_length": 1.0
}
TMP_EXISTS_AFTER_CLEANUP=False
Blender 5.2.0 LTS (hash fbe6228777e7 built 2026-07-14 01:35:40)
```

후속 JSON parse:

```text
report_exists= True
all_checks_true= True
tmp_dir_exists= False
leftover_probe_dirs= []
nodes= bb_l_arm,bb_r_arm,bb_root_body
materials= mat_skin_flat,mat_school_blue_flat
generator= Khronos glTF Blender I/O v5.2.39
```

상세 report 저장 위치:

```text
C:\Users\admin\AppData\Local\hermes\kanban\boards\escape-zombie-school\workspaces\t_5dd8b864\blender_glb_pipeline_probe_report.json
```

판정:

- stable names: PASS (`bb_l_arm`, `bb_r_arm`, `bb_root_body`).
- axis/scale: PASS (`rotation_euler=[0,0,0]`, `scale=[1,1,1]`, `unit_scale_length=1.0`).
- flat normals: PASS (`smooth_polygon_count=0` 및 project validator의 loop normal check 방식 보완).
- material: PASS (`mat_skin_flat`, `mat_school_blue_flat`).
- GLB parse/reimport: PASS.
- temp cleanup: PASS.

## 6. 제품 코드 / Studio / Firebase / Title 불변성

작업 시작 상태에는 이미 다른 카드의 미커밋/미추적 변경이 있었다. 이번 QA는 `git checkout`, `stash`, `reset`, commit, push를 사용하지 않았고 제품 파일을 수정하지 않았다.

시작 시 상태:

```text
## zombie_only...origin/zombie_only
 M Developer/r3f_prototype/src/components/PlayerMesh.jsx
 M Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx
 M Developer/r3f_prototype/src/components/ZombieMesh.jsx
 M Developer/r3f_prototype/src/components/ZombieMesh.test.js
?? Developer/installed_3d_ai_toolchain_audit_2026-08-29.md
?? Developer/r3f_prototype/Developer/agent_room/stage_screenshots_2026-08-27/
?? Developer/r3f_prototype/src/components/PlayerMesh.chamfer.test.jsx
?? Graphic_designer/zombie_school_ai_3d_modeling_pipeline_2026-08-29.md
?? Planner/open_source_ai_3d_engine_landscape_2026-08-29.md
```

검증 중 관찰한 추가 기존/타 카드 산출물:

```text
?? Developer/blockbench_blender_glb_pipeline_2026-08-29.md
?? Developer/blockbench_install_audit_2026-08-29.md
?? Developer/r3f_prototype/.blockbench-blender-glb-smoke/
?? Developer/r3f_prototype/scripts/blockbench_blender_glb/
?? Graphic_designer/blockbench_blender_glb_pipeline_role_record_2026-08-29.md
```

이번 balanceqa가 프로젝트 안에 추가한 파일은 이 QA 기록뿐이다:

```text
Quaility_Assurance/blockbench_blender_glb_pipeline_acceptance_2026-08-29.md
```

이번 QA가 만든 scratch 임시 파일:

```text
C:\Users\admin\AppData\Local\hermes\kanban\boards\escape-zombie-school\workspaces\t_5dd8b864\blender_glb_pipeline_probe.py
C:\Users\admin\AppData\Local\hermes\kanban\boards\escape-zombie-school\workspaces\t_5dd8b864\blender_glb_pipeline_probe_report.json
```

제거 확인된 임시 디렉터리:

```text
project_pipeline_smoke: CLEANUP_OK
bbmodel_boundary_negative: NEGATIVE_TMP_CLEANUP_OK
bb_blender_glb_probe_*: leftover_probe_dirs=[]
```

Studio/Firebase/Title 관련 직접 실행·접속·수정 없음:

- Firebase CLI/API/Realtime DB/Authentication 접근 없음.
- Graphics Studio 실행·저장·Apply 없음.
- Title source 수정 없음.
- 게임 런타임 실행 없음.
- AAB/APK 빌드 없음.

## 관찰 사항

1. Blockbench는 현재 사용자 설치로 확인된다. 설치 경로와 서명은 공식 감사 기록 및 직접 재조회로 일치한다.
2. `Blockbench.exe --version`는 일반 CLI 버전 출력으로 쓰기 어렵다. QA에서는 파일 버전, 레지스트리, GitHub release, Authenticode를 버전·provenance 근거로 삼는 편이 안전하다.
3. 프로젝트 스크립트의 `.bbmodel` 차단은 올바르다. Blender가 `.bbmodel`을 직접 읽는다고 착각하면 교환 경계가 깨진다.
4. `validate_glb.py`가 Blender importer의 `use_smooth` 플래그가 아니라 loop normal과 face normal 일치를 검사하는 점은 GLB 렌더링 데이터 검증으로 적절하다.
5. 실제 사용자 원화/실제 Blockbench UI export를 아직 사용하지 않았으므로 첫 production vertical slice에서는 `.bbmodel` 원본, Blockbench export GLB, Blender normalized GLB, validate report를 같은 자산 폴더에 보관해야 한다.

## Blocker

파이프라인 계약은 PASS다. 프로젝트 안의 `Developer/r3f_prototype/.blockbench-blender-glb-smoke/`는 후속 정리로 제거된 것을 재확인했다. 다만 QA가 만든 아래 OS temporary directory 정리는 이 환경의 삭제 정책에 의해 실행 전 차단되어 남아 있다. 우회 삭제는 하지 않았다.

- `%TEMP%\blockbench_blender_qa_20260829/` (Advisor가 옮긴 `initial-smoke` archive 및 독립 재실행 fixture)

### 독립 재실행 보강 (balanceqa)

구현 worker의 최종 보강 뒤 별도의 일회용 fixture로 `run_pipeline.ps1` 전체 경로를 재실행했다.

```text
Blender: 5.2.0 LTS (fbe6228777e7)
asset-id: qa-wrapper
wrapper exit: 0
reimport validation: {"armature_count":0,"mesh_count":2,"triangle_count":24,"errors":[],"status":"pass"}
GLB header: magic=glTF, version=2, declaredLength=actualLength=3604
SHA-256: 9EC6454E4A727C5CA5BD75279B228D0516CF32A3467AE8FD41B7B67CA1B6F696
```

- Reimport root는 `qa-wrapper` Empty, 위치·회전 `(0,0,0)`, scale `(1,1,1)`이고 하위 mesh는 `qa-wrapper__body`, `qa-wrapper__head`였다.
- 재질 없는 입력도 재실행하여 `qa-nomat2__material-01-qa-nomat2-material-00-default` 기본 재질과 validator PASS를 확인했다. SHA-256은 `B93856614CDB39785B3F01B58956E095A6DE766CDC753366D9C03AFF8E98FAD6`이다.
- `AssetId='QA Invalid'`는 exit 1과 출력 미생성으로 거부했다. input/output 동일 경로는 `-Force`여도 exit 1이었다. 기존 output은 `-Force` 없이는 exit 1 및 SHA 불변, `-Force`에서는 exit 0으로 명시적 덮어쓰기만 허용했다. 순수 계약 테스트 3개도 PASS했다.
- Blockbench는 `C:\Users\admin\AppData\Local\Programs\Blockbench\Blockbench.exe`, product version `5.1.6.0`, Authenticode `Valid`(Jannis Tobias Petersen)로 독립 확인했다. 공식 릴리스는 `JannisX11/blockbench` v5.1.6이다.
- Advisor도 wrapper를 별도로 재실행하여 계약 테스트 3개 PASS, GLB v2 3,684 bytes, SHA-256 `C079DAF16AC613E1C15D470C2340D1E52849818055E1DD9B97980D789EB7EEFD`를 확인했다.

실제 원화/Blockbench UI export fixture는 제공되지 않아 UI export 자체는 이번 계약 검증 범위 밖이다. 제품·Studio·Firebase·Title 파일은 QA가 수정하지 않았다.

미확인:

- 실제 원화 기반 `.bbmodel` 파일을 Blockbench UI에서 열고 export하는 사람-작업 UX.
- 실제 게임/R3F/Studio import 연결.
- 모바일 단말 FPS/메모리/렌더 화면.
- Firebase revision/Studio 파츠 선택과 GLB 파츠 ID의 실제 연동.

이 항목들은 production 자산 1종 vertical slice 카드에서 별도 검증해야 한다.

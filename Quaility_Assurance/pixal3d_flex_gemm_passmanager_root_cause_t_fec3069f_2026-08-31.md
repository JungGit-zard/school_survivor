# Pixal3D flex_gemm PassManager root-cause QA — t_fec3069f

- 작성: Balance_QA_Mini
- 시각: 2026-08-31 12:21:51
- 범위: `D:/JungSil/2.Minigame_project/school_survivor-3d-modeling-lab/pixal3d-real-run/local-q4`
- 지시 준수: 실제 신규 모델 실행/ComfyUI 재시작/임포트 프로브/패키지 설치/코드 수정은 수행하지 않았다. 기존 산출물과 로그, 소스, 설치 메타데이터만 읽었다.

## 결론

현재 실패의 직접 원인은 Pixal3D/Trellis2-GGUF의 shape latent decode 단계에서 `flex_gemm`의 Triton sparse convolution 커널 컴파일이 Windows `triton-windows 3.3.1.post21` + `torch 2.7.0+cu128` 환경에서 `ConvertTritonGPUToLLVM` MLIR 패스 실패로 중단되는 것이다. 모델 샘플링 자체는 sparse/shape/texture 모두 12/12까지 완료됐고, 마지막 mesh decode 진입 후 `shape_slat_decoder`의 sparse conv에서 실패했다.

실행 성공으로 검증된 상태는 아니다. 이 문서는 원인 좁힘과 후보 수정 제안이다.

## 핵심 증거

### 1) ComfyUI history가 node41 실패를 기록

- 파일: `history_t_3b93c813_a3b1fab1-39a9-4d25-a15f-8f66a20841c4.json`
- 상태: `status_str=error`, `completed=False`
- 실패 노드: `node_id=41`, `node_type=Trellis2MeshWithVoxelGenerator_GGUF`
- 예외: `RuntimeError: PassManager::run failed`
- 현재 입력:
  - `pipeline_type=512`
  - `sparse_structure_steps=12`
  - `shape_steps=12`
  - `texture_steps=12`
  - `max_num_tokens=49152`
  - `sparse_structure_resolution=32`
  - `generate_texture_slat=True`
  - `use_tiled_decoder=True`
  - `sampler=euler`

### 2) 로그상 샘플링은 모두 완료됨

- 파일: `comfyui_8188_persistent_t_ec979f06.stderr.log`
- 확인 라인:
  - `Sampling sparse structure: 100% ... 12/12` at lines 1389–1390
  - `Sampling shape SLat: 100% ... 12/12` at lines 2755–2756
  - `Sampling texture SLat: 100% ... 12/12` at lines 4038–4039
  - 이후 `[ERROR] !!! Exception during processing !!! PassManager::run failed` at line 4419
  - `[INFO] Prompt executed in 409.21 seconds` at line 4584

### 3) 실패 위치는 shape decode path

- 파일: `comfyui_8188_persistent_t_ec979f06.stderr.log`
- 스택:
  - `nodes.py:559` → `pipeline.run(...)`
  - `trellis2_image_to_3d.py:2038` → `out_mesh = self.decode_latent(shape_slat, tex_slat, res, use_tiled=use_tiled)`
  - `trellis2_image_to_3d.py:1584` → `meshes, subs = self.decode_shape_slat(shape_slat, resolution, use_tiled=use_tiled)`
  - `trellis2_image_to_3d.py:1438` → `self.models['shape_slat_decoder'](...)`
  - `fdg_vae.py:94` → `decoded = super().forward(...)`
  - `sparse_unet_vae.py:681` → `h = block(h)`
  - `sparse_unet_vae.py:395` → `h = self.conv(x)`
  - `conv.py:19` → active sparse conv backend forward
  - `conv_flex_gemm.py:46` → `sparse_submanifold_conv3d(...)`
  - `flex_gemm/ops/spconv/submanifold_conv3d.py:166` → `sparse_submanifold_conv_fwd_implicit_gemm_splitk(...)`
  - Triton compile path → `nvidia/compiler.py:359` → `pm.run(mod)` → `RuntimeError: PassManager::run failed`

### 4) MLIR 실패가 Triton pass pipeline임

- 파일: `comfyui_8188_persistent_t_ec979f06.stderr.log`
- lines 4412–4418:
  - `flex_gemm/kernels/triton/spconv/sparse_submanifold_conv_fwd_implicit_gemm.py:15:0: error: Failures have been detected while processing an MLIR pass pipeline`
  - `Pipeline failed while executing [ConvertTritonGPUToLLVM on 'builtin.module' operation]`
- lines 4401–4406의 재현 파이프라인에는 `convert-triton-gpu-to-llvm{compute-capability=75 ptx-version=87}`가 포함된다.

### 5) 현재 sparse backend/algorithm 설정

- `trellis2_gguf/modules/sparse/config.py`
  - line 3: `CONV = 'flex_gemm'`
  - lines 14–21: `SPARSE_CONV_BACKEND` 환경변수가 `none`, `spconv`, `torchsparse`, `flex_gemm` 중 하나면 override 가능
  - line 27: `[SPARSE] Conv backend: {CONV}; Attention backend: {ATTN}` 출력
- 실제 stdout:
  - `[SPARSE] Conv backend: flex_gemm; Attention backend: flash_attn`
- `trellis2_gguf/modules/sparse/conv/config.py`
  - line 2: `FLEX_GEMM_ALGO = 'implicit_gemm_splitk'`
- `conv_flex_gemm.py`
  - line 38: `flex_gemm.ops.spconv.set_algorithm(config.FLEX_GEMM_ALGO)`
  - line 46: `sparse_submanifold_conv3d(...)`
- `flex_gemm/ops/spconv/submanifold_conv3d.py`
  - lines 141–155: `Algorithm.EXPLICIT_GEMM` branch uses torch `zeros/addmm/mm` path, not the Triton implicit kernel
  - lines 157–166: `IMPLICIT_GEMM`/`IMPLICIT_GEMM_SPLITK` branches call Triton kernels

### 6) 설치된 sparse 관련 패키지 상태

`python -m pip show torch triton triton-windows flex-gemm flex_gemm spconv-cu120 spconv spconv-cu118 torchsparse` 결과:

- `torch`: `2.7.0+cu128`
- `triton-windows`: `3.3.1.post21`
- `flex-gemm`: `1.0.0+cu128torch2.7`
- 없음: `spconv`, `spconv-cu118`, `spconv-cu120`, `torchsparse`, `triton` 패키지명

공식 로컬 소스 `official-sources/ComfyUI-Trellis2/README.md`는 Windows Torch270/Torch280 wheel 설치 예시에서 `flex_gemm`와 `o_voxel` wheel만 언급하며, spconv Windows wheel은 이 로컬 공식 README 근거상 기본 설치 경로가 아니다.

## 원인 판단

- 입력 이미지나 sampler 단계의 실패로 보기 어렵다. sparse structure, shape SLat, texture SLat가 모두 12/12 완료됐다.
- texture sampler 완료 후 실패했지만, 실제 call stack은 `decode_shape_slat` → `shape_slat_decoder`에서 끊겼다. 따라서 “texture 생성 자체”보다 “최종 latent decode/mesh 생성 중 shape decoder sparse conv” 실패로 보는 것이 정확하다.
- 실패는 Python 레벨 shape 불일치가 아니라 Triton compiler의 MLIR pass pipeline failure다.
- 현재 설정 `FLEX_GEMM_ALGO='implicit_gemm_splitk'`가 `flex_gemm`의 Triton implicit GEMM kernel path를 강제하고, 해당 path가 이 Windows/CUDA/Triton 조합에서 실패한다.

## 후보 수정안

### 후보 A — 1차 권장: flex_gemm algorithm을 `explicit_gemm`으로 전환

내용:
- `ComfyUI/custom_nodes/ComfyUI-Trellis2-GGUF/trellis2_gguf/modules/sparse/conv/config.py`
- `FLEX_GEMM_ALGO = 'implicit_gemm_splitk'` → `FLEX_GEMM_ALGO = 'explicit_gemm'`

근거:
- `flex_gemm/ops/spconv/submanifold_conv3d.py` lines 141–155의 explicit branch는 torch tensor 연산(`zeros`, `addmm`, `mm`)으로 처리하고, 실패한 Triton implicit kernel path를 회피한다.
- 신규 패키지 설치가 필요 없고 scope가 가장 작다.

리스크:
- explicit im2col 방식은 VRAM/시간 비용이 증가할 수 있다. 현재 입력이 `max_num_tokens=49152`라서 shape decode에서 메모리 증가 가능성이 있다.
- 아직 실제 Pixal3D 재실행 검증은 하지 않았다.

검증 제안:
1. 위 한 줄 변경 후 ComfyUI 프로세스를 재시작한다. sparse config는 import 시점에 읽히므로 이미 떠 있는 프로세스에는 반영되지 않을 수 있다.
2. 동일 history/prompt 또는 동일 입력으로 재실행한다.
3. 성공 판정은 node41 완료 + GLB/mesh output 생성 + stderr에 `PassManager::run failed` 미발생이다.
4. 실패 시 OOM/속도 로그를 별도 수집한다.

### 후보 B — code-level fallback: `PassManager::run failed`일 때 explicit_gemm으로 1회 재시도

내용:
- `conv_flex_gemm.py`의 `sparse_conv3d_forward`에서 `sparse_submanifold_conv3d(...)` 호출을 try/except로 감싸고, `RuntimeError` 메시지에 `PassManager::run failed`가 포함되면 algorithm을 `explicit_gemm`으로 바꿔 동일 op를 1회 재시도한다.

장점:
- 기본 빠른 path는 유지하면서 Windows Triton compiler failure만 우회 가능하다.

리스크:
- runtime 중 algorithm global을 바꾸는 부작용 관리가 필요하다.
- 조용한 fallback은 성능/메모리 문제를 숨길 수 있으므로 warning log가 필수다.
- QA 검증 전에는 권장하지 않는다. 우선 후보 A로 단순 고정 테스트를 먼저 해야 한다.

### 후보 C — `SPARSE_CONV_BACKEND=spconv` 전환

내용:
- 환경변수로 `SPARSE_CONV_BACKEND=spconv` 지정 후 ComfyUI 재시작.

근거:
- 코드상 `trellis2_gguf/modules/sparse/config.py` lines 20–21에서 `spconv` env override를 허용한다.
- `conv_spconv.py`에는 Windows bfloat16 downcast patch가 이미 들어있다(lines 27–40, 83–95).

현재 차단점:
- 현재 venv에 `spconv`/`spconv-cu120`/`spconv-cu118`이 설치되어 있지 않다.
- Windows용 호환 wheel 확보가 필요하다. 이 task 지시상 설치/실행 검증을 하지 않았으므로 아직 실행 가능한 수정안으로 검증되지 않았다.

### 후보 D — 다른 Triton algorithm으로 바꾸기

내용:
- `FLEX_GEMM_ALGO`를 `implicit_gemm`, `masked_implicit_gemm`, `masked_implicit_gemm_splitk` 등으로 바꿔보는 방법.

판단:
- 낮은 우선순위. 모두 Triton kernel path를 타는 구조라 `ConvertTritonGPUToLLVM` 실패를 근본 회피하지 못할 가능성이 크다.
- 특히 현재 stack은 splitk wrapper를 통해 `sparse_submanifold_conv_fwd_implicit_gemm.py`에서 실패했다. `implicit_gemm` 단독도 같은 kernel에 닿을 가능성이 있다.

## 구현자에게 넘길 최소 재현/검증 절차

1. 작업 전 현재 파일 백업 또는 git diff 확인.
2. `trellis2_gguf/modules/sparse/conv/config.py` line 2를 `FLEX_GEMM_ALGO = 'explicit_gemm'`으로 변경.
3. ComfyUI 완전 재시작.
4. 동일 prompt `a3b1fab1-39a9-4d25-a15f-8f66a20841c4` 또는 동일 입력으로 node41 재실행.
5. 확인 포인트:
   - stdout에 `[SPARSE] Conv backend: flex_gemm` 유지
   - node41 `Trellis2MeshWithVoxelGenerator_GGUF` 성공 완료
   - stderr에 `PassManager::run failed`, `ConvertTritonGPUToLLVM`, `sparse_submanifold_conv_fwd_implicit_gemm.py:15:0` 미발생
   - GLB/mesh output 파일 생성 확인
   - VRAM/OOM이 생기면 `max_num_tokens` 또는 texture 옵션을 낮춘 별도 fail-safe profile 검토

## 블로커와 관찰 분리

### 블로커

- 실제 실행 재검증은 task 지시상 금지되어 있어 수행하지 않았다.
- `explicit_gemm` 전환이 실제로 49152 token decode에서 VRAM 내 통과하는지는 미검증이다.
- `spconv` 대안은 현재 패키지가 설치되어 있지 않아 즉시 실행 가능한 상태가 아니다.

### 관찰

- 기존 로그는 모델 세 단계 샘플링이 성공했음을 보여준다.
- 실패 위치는 final decode의 shape decoder sparse conv다.
- 현 sparse backend는 `flex_gemm`, algorithm은 `implicit_gemm_splitk`다.
- 패키지 조합은 `torch 2.7.0+cu128`, `triton-windows 3.3.1.post21`, `flex-gemm 1.0.0+cu128torch2.7`다.

## G-Stack/status 확인

- `~/.claude/skills/gstack/bin`: present
- `hermes kanban --board escape-zombie-school assignees`:
  - `balanceqa`: blocked=21, done=79, running=1, todo=15
  - `threemini`: blocked=61, done=94, running=1, todo=3
  - 전체 주요 상태는 별도 임시 상태 파일에서 확인 후 보고서 작성에 반영했다.
- `hermes kanban --board escape-zombie-school stats`:
  - todo=27, running=2, blocked=159, done=459

## 파일/명령 기록

읽은 주요 파일:
- `comfyui_8188_persistent_t_ec979f06.stdout.log`
- `comfyui_8188_persistent_t_ec979f06.stderr.log`
- `history_t_3b93c813_a3b1fab1-39a9-4d25-a15f-8f66a20841c4.json`
- `ComfyUI/custom_nodes/ComfyUI-Trellis2-GGUF/trellis2_gguf/modules/sparse/config.py`
- `ComfyUI/custom_nodes/ComfyUI-Trellis2-GGUF/trellis2_gguf/modules/sparse/conv/config.py`
- `ComfyUI/custom_nodes/ComfyUI-Trellis2-GGUF/trellis2_gguf/modules/sparse/conv/conv.py`
- `ComfyUI/custom_nodes/ComfyUI-Trellis2-GGUF/trellis2_gguf/modules/sparse/conv/conv_flex_gemm.py`
- `ComfyUI/custom_nodes/ComfyUI-Trellis2-GGUF/trellis2_gguf/modules/sparse/conv/conv_spconv.py`
- `.venv311/Lib/site-packages/flex_gemm/ops/spconv/submanifold_conv3d.py`
- `.venv311/Lib/site-packages/flex_gemm/ops/spconv/__init__.py`
- `official-sources/ComfyUI-Trellis2/README.md`

실행한 주요 확인 명령:
- mandatory precommand checker: pass(exit 0)
- `python -m pip show torch triton triton-windows flex-gemm flex_gemm spconv-cu120 spconv spconv-cu118 torchsparse`
- stderr/stdout 로그 sanitized line extraction
- history JSON read-only parse
- `hermes kanban --board escape-zombie-school assignees`
- `hermes kanban --board escape-zombie-school stats`
- `git status --short --branch`

주의:
- 이 보고서는 근거 기반 후보 제안이며 “수정 완료/검증 완료”가 아니다.

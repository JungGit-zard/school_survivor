# 로컬 3D·AI 도구 체인 읽기 전용 감사

- 일시: 2026-08-29 (Asia/Seoul)
- Kanban 증거: `escape-zombie-school` / `t_e2e6f15b` (madangsue)
- 범위: 실행·설치·업데이트·브라우저·Firebase 접근 없이 Windows 설치 레지스트리, PATH, 일반 설치 폴더, 시작 메뉴, MSIX 목록, 기본 Python/Conda, Blender 사용자 폴더, GPU 드라이버만 읽기 전용 확인.
- 제외: 전체 디스크의 무차별 재귀 검색, 사용자 개인 폴더 전체, 클라우드 계정·웹 서비스 로그인, 실제 모델 생성/렌더링/벤치마크.

## 확인됨

| 항목 | 증거 | 판정 |
| --- | --- | --- |
| Blender | Uninstall 레지스트리: Blender Foundation / `5.2.0`; 실행 파일: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, 제품 버전 `5.2` | 설치 확인 |
| NVIDIA GPU | `nvidia-smi`: NVIDIA GeForce GTX 1660, 드라이버 `581.80`, 총 VRAM `6144 MiB` | CUDA 실행 파일/드라이버 확인 |
| 기본 Python | `C:\Python314\python.exe`, pip | 설치 확인 |

GPU의 WMI `AdapterRAM` 값은 4 GiB로 보고됐지만, NVIDIA 드라이버 도구의 6144 MiB를 VRAM 정본으로 기록했다. CUDA의 정확한 런타임/API 버전, DirectML 패키지 설치, TensorRT 설치 및 실제 AI 모델 가동 여부는 실행하지 않았으므로 확인하지 않았다. GTX 1660은 NVIDIA CUDA 및 Windows DirectML 경로에 일반적으로 사용할 수 있는 하드웨어이나, 모델별 요구 VRAM/연산 정밀도는 별도 검증이 필요하다.

## 미확인 또는 미설치 증거 없음

- Pixel3D / Pixel 3D: 설치 레지스트리, MSIX 패키지, PATH, 시작 메뉴 바로가기, 일반 설치 경로(`Program Files`, `Program Files (x86)`, `%LOCALAPPDATA%`, `%APPDATA%`, `C:\tools`, `C:\AI`, `D:\AI`, `D:\Tools`)에서 제품명·실행 파일·버전을 발견하지 못했다.
- 일반 3D/AI 후보: ComfyUI, Meshy, Tripo, Rodin, Hunyuan3D, Stable Fast 3D, InstantMesh, Wonder3D, Blockbench, MagicaVoxel, MeshLab, Spline, Kaedim, Luma의 설치 레지스트리·MSIX·일반 설치 경로 증거를 발견하지 못했다.
- 기본 Python pip의 `bpy`, `torch`, `diffusers`, `transformers`, `trimesh`, `open3d`, `pytorch3d`, `kaolin`, `comfy*`, `mesh*`, `shap-e`, `instant*`, `wonder*`, `hunyuan*`, `mvdream*` 후보도 발견하지 못했다. Conda 명령/환경도 확인되지 않았다.
- Blender 사용자 폴더의 별도 애드온 경로는 점검 결과 나타나지 않았다. Blender를 실행하지 않았으므로 기본 내장 애드온의 활성화 상태는 확인하지 않았다.

따라서 Pixel3D가 휴대용 압축 파일, 사용자 지정 이름의 폴더, 다른 드라이브/네트워크 위치, 또는 브라우저 전용 서비스로 존재하는 경우에는 이 감사만으로 부재를 단정할 수 없다. 확인하려면 사용자가 해당 제품의 정확한 표시명 또는 설치 위치를 제공해야 한다.

## 사용 적합성 메모

현재 확인된 로컬 기반은 Blender 5.2이다. 좀비 학교 분위기의 로우폴리 캐릭터·소품 제작에는 Blender의 저폴리 모델링, 리깅, 셰이프 키(표정/입 모양) 워크플로가 적합하다. ‘보컬 흉내’는 물리 엔진 기능이 아니라 음성 재생/립싱크 데이터와 입 모양 블렌드셰이프의 조합이므로, 물리 엔진만으로 해결할 수 없다. 실제 도입 후보의 라이선스, GitHub 상태, 생성 품질, 엔진 연동성은 별도 웹 조사에서 판정한다.

## 변경 및 검증

- 변경 파일: 이 감사 기록 1개만 추가.
- 실행하지 않은 것: Blender/다른 앱, 모델 생성, 설치/업데이트, 브라우저, Firebase, Git commit/push.
- 민감정보: 사용자명·계정·토큰·개인 경로는 기록하지 않았다.

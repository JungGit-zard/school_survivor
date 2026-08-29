# 오픈소스 AI 3D 생성·편집 엔진 지형도 — 2026-08-29

## 결론

이 PC의 **GTX 1660 6GB** 기준 주력은 AI 확산 생성기가 아니라 **Blender 5.2 LTS + Python API**, **Blockbench**, 그리고 단순 프랍에는 **Chisel(CSG MCP)** 이다. AI 생성은 **TripoSR만 제한적 실험 후보**로 두고, **Pixal3D·TRELLIS.2는 20~24GB 이상 별도 GPU 또는 클라우드에서 원형을 만들 때만** 사용한다. 이 PC에서 곧바로 게임용 메시를 확정하는 자동 생성기는 없다. 생성 → 사람의 형태·권리 검토 → 저폴리 리토폴로지/UV → 리깅 → 애니메이션 → 충돌체·성능 검증 순서가 필요하다.

이번 조사는 GitHub 전체의 숫자를 확정하는 조사가 아니다. GitHub에는 포크·랩퍼·데모가 계속 생기므로 “전 세계에 총 몇 개”라는 안정된 숫자는 없다. 대신 2026-08-29에 공식 저장소/공식 프로젝트 문서/공식 논문을 기준으로 **대표 공개 생성 프로젝트 18개**를 선별했다. 아래 목록은 그중 모델 가중치 또는 추론 코드가 공개됐거나, 왜 아직 실사용 후보가 아닌지를 판정할 수 있었던 프로젝트다.

### GitHub 검색 규모는 참고치일 뿐이다

| 검색어 조합 | raw 결과 수 | 해석 |
| --- | ---: | --- |
| `text-to-3d` | 1,925 | 포크·논문 코드·UI 래퍼·비관련 저장소가 함께 포함된다. |
| `image-to-3d` | 2,661 | 같은 모델의 ComfyUI/one-click 포장이 대량 중복된다. |
| `blender MCP` | 2,705 | Blender용 MCP 외에 일반 MCP 예제가 다수 섞인다. |
| `text-to-3d` + `image-to-3d` 토픽 교집합 | 44 | 토픽 태깅 여부에 크게 좌우되는 하한 성격의 수치다. |

따라서 위 raw 검색 수를 “사용 가능한 엔진 수”로 쓰지 않고, 공식 코드·가중치·라이선스·출력 경로를 직접 확인한 **curated serious 18개**를 아래 비교 대상으로 삼았다.

### 중요한 구분

- **AI 3D 생성기**는 메시·재질을 만든다. 물리엔진이 아니다.
- **Rapier**는 이미 이 프로젝트의 Three.js/R3F 경로에 맞는 Apache-2.0 물리엔진이며, 충돌체·강체·조인트를 담당한다. 모델을 만들거나 자동 리깅하지는 않는다. [공식 저장소](https://github.com/dimforge/rapier) · [JavaScript 바인딩](https://github.com/dimforge/rapier.js/)
- 사용자의 “보컬 흉내”는 문맥상 **복셀(voxel) 느낌**으로 해석했다. 음성 흉내/보이스 기능을 뜻했다면 이는 3D 모델링이 아니라 오디오 작업이므로 별도 `soundmini` 범위다.
- 아래 생성기 중 공식적으로 게임용 **스켈레톤·스킨 웨이트·애니메이션 클립을 산출한다고 보장하는 후보는 없다.** 리깅과 애니메이션은 Blender 등 후처리 단계가 필수다.

## 공통 판정 기준

| 항목 | 판정 방법 |
| --- | --- |
| 로우폴리/복셀 제어 | “저폴리 스타일”은 프롬프트만으로 보장되지 않는다. 다각형 수, 사각 위주 토폴로지, 복셀 블록 형태를 공식 입력값으로 보장하는 후보만 `직접`으로 표기했다. 그 외는 생성 후 리토폴로지/Decimate/voxel remesh가 필요하다. |
| 자동화 | `로컬`은 공개 Python/CLI/파이프라인이 있어 배치 작업으로 감쌀 수 있음을 뜻한다. 별도 SaaS API는 오픈소스 엔진의 일부가 아니다. |
| 라이선스 | 코드와 가중치를 한 묶음으로 단정하지 않았다. 표기된 경우 분리했으며, 상용 게임 투입 전에는 선택한 **정확한 커밋·가중치 모델 카드·의존성**을 다시 법무 검토한다. |
| 성숙도 | `실용`=공개 가중치·CLI·명확한 출력 경로, `연구`=재현/통합 비용이 큼, `보류`=공식 구현·가중치가 불완전하거나 라이선스 문제가 큼. |

## 후보 18개 비교

| 후보 (공식 1차 근거) | 입력 → 출력 | 메시/재질/리깅·애니메이션 | 저폴리·복셀 | 로컬·자동화 / OS·GPU | 라이선스·성숙도 |
| --- | --- | --- | --- | --- |
| [Microsoft TRELLIS.2](https://github.com/microsoft/trellis.2) | 이미지 → 고해상도 3D 메시와 PBR 속성 | O-Voxel 기반, 복잡한/open/non-manifold 토폴로지와 base color·roughness·metallic·opacity를 표방. 리그/애니메이션 없음. | O-Voxel은 내부 표현이지 게임용 복셀 스타일 제어가 아니다. 생성 후 감면 필요. | Python 파이프라인. 공식 최소 NVIDIA 24GB, Linux 검증(A100/H100); Windows 지원 보장 없음. | 모델·코드 MIT(일부 NVIDIA 의존성 별도). 4B, 공식 추론/가중치 공개, **실용 최상**. |
| [Microsoft TRELLIS](https://github.com/microsoft/TRELLIS) · [CVPR 2025 논문](https://arxiv.org/abs/2412.01506) | 텍스트/이미지 → 3D 표현·메시 | 메시/재질 생성 가능. 리그/애니메이션 없음. | 직접 제어 없음; 후처리 필요. | 로컬 Python/CUDA, 고VRAM 연구 파이프라인. | 모델과 대부분 코드 MIT, 일부 서브모듈 별도. 검증 사례가 많은 **실용**이나 TRELLIS.2보다 구형. |
| [TencentARC Pixal3D](https://github.com/TencentARC/Pixal3D) · [SIGGRAPH 2026 논문](https://arxiv.org/abs/2605.10922) | 단일 이미지 → 고충실도 geometry + PBR texture | pixel-to-3D back-projection 기반 이미지→PBR. 리그/애니메이션 없음. | 직접 제어 없음. thin-shell·구멍·내부 면은 단일뷰 AI 생성에서 깨질 수 있어 원형 검수 전제. | Python 로컬 추론/low-VRAM 모드 코드 존재. 다만 공식 최소 VRAM은 확정 수치가 아니고 24GB GPU에서도 메모리 부족 보고가 있어 고VRAM으로 본다. | 저장소·공개 weights는 MIT로 안내됨. 2026 신생, 품질 원형용 **초안 전용**; 게임 최종 메시로 직행 금지. |
| [Tencent Hunyuan3D-2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) | 이미지 → 메시 → PBR 재질, GLB/OBJ 경로 제공 | Shape 3.3B + Paint 2B; PBR 재질. 리그/애니메이션 없음. | 직접 제어 없음. | Python API/배치 가능. 공식: shape 10GB, texture 21GB, 전체 29GB VRAM; Windows/macOS/Linux 표기. | **Tencent Community License**: EU·UK·대한민국을 Territory에서 제외. 한국에서 사용은 라이선스상 불가이므로 **제외**. |
| [Stable Fast 3D](https://github.com/Stability-AI/stable-fast-3d) | 단일 이미지 → 빠른 textured mesh/GLB 계열 자산 | UV·PBR 재질을 목표로 하나 리그/애니메이션 없음. | 직접 제어 없음. | 로컬 Python 추론·스크립트 자동화. CUDA GPU가 현실적이며 공식 최소 VRAM은 고정 수치로 명시되지 않음. | Stability AI Community License: 연 매출 US$1M 미만의 제한적 상용 사용은 무상이나 자체 허가형 라이선스. 빠른 단일 소품 시안용 **실용**. |
| [OpenAI Shap-E](https://github.com/openai/shap-e) · [논문](https://arxiv.org/abs/2305.02463) | 텍스트/이미지 → implicit 3D/메시 | 기본 형상 생성. 현대 PBR, 깨끗한 게임 토폴로지, 리그/애니메이션은 기대하지 않는다. | 직접 제어 없음. | 로컬 Python, GPU 권장. | 코드·모델 MIT. 기준선/실험용으로는 유용하나 2023 세대, **현행 제작용 우선순위 낮음**. |
| [InstantMesh](https://github.com/TencentARC/InstantMesh) · [논문](https://arxiv.org/abs/2404.07191) | 단일 이미지 → OBJ(기본 vertex color), 선택 시 UV texture map | 피드포워드 메시 복원. 리그/애니메이션 없음. | 직접 제어 없음. | Python CLI/Gradio/Docker. CUDA 12.1+, 다중 GPU도 지원하나 공식 최소 VRAM 미명시. | 코드 Apache-2.0; 사용 가중치와 Zero123++ 의존 라이선스는 별도 확인. **실용 보조 후보**. |
| [OpenLRM](https://github.com/3DTopia/OpenLRM) · [논문](https://arxiv.org/abs/2311.04400) | 이미지 → radiance-field/mesh 계열 복원 | LRM 연구 구현; 리그/애니메이션 없음. | 직접 제어 없음. | 로컬 CUDA 연구 파이프라인. | 코드 Apache-2.0이지만 가중치 CC-BY-NC-4.0 및 NVIDIA 구성요소 제약. **상용 게임 제외**. |
| [MeshAnything V2](https://github.com/buaacyw/MeshAnythingV2) | 입력 메시/법선 점군 → artist-created triangle mesh OBJ | 텍스트/이미지 생성기가 아니라 **메시 재생성·토폴로지 정리기**. 텍스처/리그/애니메이션 없음. | 목표 다각형 수·복셀 스타일을 직접 보장하지는 않음. 단, 생성 메시를 게임형 토폴로지로 정리하는 후단에 적합. | Python/CUDA; 공식 검증 환경 Ubuntu 22.04, CUDA 11.8, A800. | 저장소의 `LICENSE.txt`와 가중치 모델 카드를 선택 시 재확인 필요. **실용 보조 후보**. |
| [PartCrafter](https://github.com/t1seungy/partcrafter) · [논문](https://arxiv.org/abs/2506.05573) | 단일 RGB → 여러 part/object 메시를 한 번에 생성 목표 | 부품 구조가 강점이며 보스의 머리/몸/무기 분리에 유망. 리그/애니메이션 없음. | 직접 제어 없음. | 공식 초기 저장소는 inference·checkpoint·training release를 TODO로 표기했으므로 현재 즉시 운영 자동화 근거 부족. | 라이선스는 저장소 정확본 확인 필요. **연구 관찰**, 즉시 채택 제외. |
| [Step1X-3D](https://github.com/stepfun-ai/Step1X-3D) · [기술보고](https://arxiv.org/abs/2505.07747) | 이미지 → untextured GLB → texture synthesis → textured GLB | geometry 1.3B, texture 3.5B. 메시/텍스처 경계가 명확. 리그/애니메이션 없음. | 내부 `reduce_face` 단계는 있으나 스타일/정확한 폴리곤 예산의 보장은 아니다. | 로컬 Python 파이프라인·Gradio, CUDA 12.4 검증. 모델 총량 6.1B; 실제 VRAM 공식 하한 미명시. | 저장소/모델카드의 현행 라이선스를 다시 확인해야 함. training·LoRA 경로도 있어 **실용 대안**. |
| [CraftsMan3D](https://github.com/HKUST-SAIL/CraftsMan3D) · [논문](https://arxiv.org/abs/2405.14979) | 텍스트/이미지 → coarse mesh → normal 기반 refinement → OBJ | 두 단계 형상 생성과 interactive geometry refine가 핵심. 공개 체크포인트는 단일 이미지 조건 중심; 리그/애니메이션 없음. | 직접 제어 없음. | Python/CUDA; 정련 예시는 GTX 3080에서 수행됐다고만 명시. | MIT. 캐릭터 형상 연구에는 좋지만 재질·게임 준비성은 후처리 의존, **실용 보조**. |
| [TripoSR](https://github.com/VAST-AI-Research/TripoSR) · [논문](https://arxiv.org/abs/2403.02151) | 단일 이미지 → 3D mesh, vertex color 또는 bake texture | 빠른 피드포워드 복원. 리그/애니메이션 없음. | 직접 제어 없음. | Python CLI/Gradio. 공식 기본 단일 입력 약 6GB VRAM, A100에서 0.5초 미만 주장. | 코드·가중치 MIT. 빠른 사물/교실 소품 시안에는 **실용**; 영웅 캐릭터 품질은 상위 후보보다 낮을 수 있음. |
| [TripoSG](https://github.com/VAST-AI-Research/TripoSG) · [논문](https://arxiv.org/abs/2502.06608) | 이미지 → 고충실도 shape mesh | sharp feature/복잡한 topology에 강점을 둔 image-to-3D foundation model. 텍스처, 리그/애니메이션은 별도 단계. | `--faces`로 면 수 상한을 지정할 수 있다. 복셀 스타일은 별도 후처리. | Python/CUDA. 공식 최소 8GB VRAM. | 코드 MIT(가중치 카드도 선택 시 재확인). 만화/스케치도 입력 범위에 포함, **실용 2순위**. |
| [Unique3D](https://github.com/AiuniAI/Unique3D) · [논문](https://arxiv.org/abs/2405.20343) | 단일 이미지 → 메시 | orthographic 정면·rest pose 입력에 특히 유리. 리그/애니메이션 없음. | 직접 제어 없음. | 로컬 Python/CUDA. 공식 정량 최소 VRAM 미명시. | MIT. 깨끗한 정면 캐릭터 컨셉에는 유용하나 가림/회전 조건에 민감, **실용 보조**. |
| [Wonder3D](https://github.com/xxlong0/Wonder3D) · [CVPR 2024 논문](https://arxiv.org/abs/2310.15008) | 단일 이미지 → 일관된 6-view color/normal → 별도 mesh extraction | 메시 추출이 후속 Instant-NSR 단계라 파이프라인이 길다. 리그/애니메이션 없음. | 직접 제어 없음. | Linux와 Windows branch, Python/CUDA; 공식 학습은 8 GPU 예시. | MIT. 멀티뷰 참조 생성용 연구 도구, **신규 파이프라인의 주력 제외**. |
| [LGM](https://github.com/3DTopia/LGM) · [ECCV 2024 논문](https://arxiv.org/abs/2402.05054) | 이미지/텍스트 보조 → 3D Gaussian, 메시 변환은 별도 | Gaussian splat이 핵심이지 게임용 UV mesh가 아니다. 리그/애니메이션 없음. | Gaussian 수 조절은 가능하지만 low-poly mesh 제어가 아니다. | 로컬 Python/CUDA. | MIT. 빠른 프리뷰/배경에는 가능하나 모바일 게임 메시 주력으로는 **제외**. |
| [TripoSplat](https://github.com/VAST-AI-Research/TripoSplat) · [논문](https://arxiv.org/abs/2605.16355) | 단일 이미지 → `.ply`/`.splat` 3D Gaussian | 임의 Gaussian 수(최대 262,144) 조절. 메시·UV·리그·애니메이션 출력이 아니다. | 시각 밀도는 조절하지만 복셀/low-poly 메시가 아님. | 경량 Python 로컬 추론, 모델 다운로드 필요. | 코드·가중치 MIT. 2026 신생·inference 중심, 렌더 실험용; 게임 캐릭터 메시로 **제외**. |

## AI가 직접 조작할 수 있는 모델링 엔진 (현재 PC 우선)

| 엔진 | AI 조작 경로·출력 | 강점/한계 | 라이선스·현재 PC 적합성 |
| --- | --- | --- | --- |
| [Blender 5.2 LTS](https://www.blender.org/releases/5-2/) · [공식 Python API](https://docs.blender.org/api/current/) · [공식 Blender MCP Lab](https://www.blender.org/lab/mcp-server/) | `bpy` Python으로 메시, UV, armature, 애니메이션, GLB를 직접 조작. Blender MCP는 자연어 요청을 Python API 호출로 연결한다. | AI가 생성 결과를 실제로 수정·리토폴로지·리깅할 수 있는 완전한 DCC 도구다. 공식 MCP는 LLM 코드에 보호장치가 없다고 경고하므로, 실제 연결 때는 전용 작업 폴더/가상환경에서만 쓴다. | Blender는 GPL, 자산 산출물의 라이선스는 별도. GTX 1660에서도 수동/스크립트 기반 로우폴리 작업의 **최우선**. |
| [Blockbench](https://github.com/JannisX11/blockbench) | 저폴리 메시·픽셀 텍스처·기본 애니메이션을 편집하고 표준 포맷으로 내보낸다. 플러그인으로 확장 가능. | 블록형/픽셀아트 소품과 단순 좀비 실루엣을 빠르게 통제한다. Blender보다 복잡한 리깅·정리·PBR 작업은 약하다. | 앱 소스 GPL-3.0-or-later, **Blockbench로 만든 모델·텍스처·애니메이션 자산은 제작자 소유**라고 공식 저장소가 명시. GTX 1660에서 **즉시 실무 적합**. |
| [Chisel MCP](https://github.com/EYamanS/chisel) | AI가 primitive, transform, union/subtract/intersect, mirror를 호출하고 4-view CPU render를 본 뒤 GLB/OBJ를 내보낸다. | 확산 AI가 아니라 결정론 CSG라 교실 책상·사물함·문·책·연필·장식 등 단순 프랍을 정확히 재생산한다. 유기적 캐릭터, UV, 리깅에는 맞지 않는다. | MIT, headless·GPU-free·CPU rasterizer. GTX 1660 제약과 무관한 **단순 프랍용**. |

## 좀비 학교에 쓸 실용 후보 5개 (고성능 GPU/클라우드 포함)

| 우선순위 | 후보 | 가장 맞는 작업 | 채택 이유 | 반드시 보완할 점 |
| --- | --- | --- | --- |
| 1 | TRELLIS.2 | 보스, 고유 소품, 최종 품질이 필요한 캐릭터 원형 | MIT, PBR 속성, 복잡한 형상과 sharp feature, 공식 24GB VRAM 기준이 명확하다. | Linux+NVIDIA 24GB 이상 필요. **GTX 1660 6GB에서는 불가**. 생성 메시를 저폴리화하고 UV/리그/성능 예산을 별도로 통과시켜야 한다. |
| 2 | Pixal3D | 이미지 충실도가 필요한 보스·교실 소품의 고품질 원형 | 2026 신생, image→PBR 품질이 강점이며 MIT로 공개됐다. | thin-shell/hole 오류를 시각 검수한다. 공식 최소 VRAM 부재 및 24GB 부족 사례가 있어 **GTX 1660에서는 제외**, 고성능 GPU/클라우드 초안 전용. |
| 3 | TripoSG | 학생 좀비/보스의 실루엣 원형, 만화·스케치 기반 입력 | MIT, 공식 최소 8GB VRAM, cartoon/sketch 입력 범위를 명시해 로우폴리 컨셉 아트에서 출발하기 좋다. | **GTX 1660 6GB에서는 공식 최소치 미달**. shape 중심이므로 texture·리그·애니메이션·폴리곤 예산은 후단에서 만든다. |
| 4 | TripoSR | 책상, 사물함, 연필, 가방, 실험도구 등 대량 소품의 빠른 시안 | MIT, 약 6GB VRAM, CLI와 bake texture가 명확해 반복 자동화에 가장 가볍다. | 공식 기본치가 6GB라 GTX 1660은 **경계선**이다. 실행 성공을 전제하지 않으며, 뒷면·결합부 품질 검수와 최종 retopo가 필요하다. |
| 5 | MeshAnything V2 | 상위 생성기가 만든 과밀한 메시를 게임용에 가깝게 정리하는 후처리 | “새 모델 생성”보다 토폴로지 재생성이 목적이라 저폴리 파이프라인의 빈칸을 메운다. | 텍스처/리그를 만들지 않으며, 폴리곤 수를 정확히 제어하는 일반 retopo 도구와 함께 사용한다. |

## 제외 또는 보류 사유

- **Hunyuan3D-2.1**: 품질·PBR·Windows 지원은 강점이지만, 공식 라이선스가 **대한민국을 사용 허가 Territory에서 제외**한다. 이 프로젝트의 위치 기준으로 후보에서 제외한다.
- **OpenLRM**: 코드가 Apache-2.0이어도 공개 가중치가 CC-BY-NC-4.0이라 상용 게임에는 부적합하다.
- **PartCrafter/MIDI-3D**: 부품/장면 구조는 매력적이지만, 현재 공개물만으로는 일반 제작 자동화의 재현성과 라이선스 근거가 부족하다.
- **LGM/TripoSplat**: Gaussian splat은 메시가 아니므로 Three.js/Rapier 게임 캐릭터의 충돌·외곽선·toon 재질·모바일 성능 경로와 맞지 않는다.
- **Shap-E/Wonder3D/Unique3D/InstantMesh/CraftsMan3D**: 각자 유용한 연구·보조 역할은 있으나, 현행 상위 5개보다 제작 파이프라인, 출력 재질, 라이선스 또는 속도/품질 균형에서 우선도가 낮다.
- **[Roblox Cube/CubePart](https://github.com/Roblox/cube)**: part-controllable 생성 연구는 인상적이나, 현재 공개 CubePart는 기존 메시+부품 스키마를 받는 연구 파이프라인이다. 이 프로젝트의 저폴리 캐릭터 생산 경로로 검증되지 않았으므로 **research-only**, production 후보에서 제외한다.

## 권장 작업 흐름 (적용하지 않은 제안)

1. 이 PC에서는 Blender 5.2 Python API와 Blockbench로 2D 정면·측면·후면 컨셉을 먼저 고정한다. Chisel은 규격화된 교실 프랍에만 사용한다.
2. TripoSR는 6GB VRAM 경계선의 **실험**만 허용한다. Pixal3D/TRELLIS.2/TripoSG는 별도 고성능 GPU 또는 클라우드에서 원형을 만들 때만 고려한다.
3. 생성 결과를 Blender에서 수동 검토하고 목표 폴리곤 예산으로 리토폴로지한다. 복셀처럼 보이게 하려면 voxel remesh 후 수동 면 정리/flat shading을 사용하며, AI 입력 프롬프트만으로 확정하지 않는다.
4. UV/텍스처를 정리하고, Blender 등에서 별도 스켈레톤·스킨 웨이트·걷기/피격/사망 애니메이션을 만든다.
5. 게임에는 GLB와 단순 Rapier collider를 분리해 넣고, `MeshToonMaterial`/외곽선, 인스턴싱, 실제 단말 성능을 검증한다. Rapier는 모델 제작기가 아니라 이 마지막 충돌·물리 단계만 담당한다.

이 문서는 조사 결과만 기록한다. 설치, 모델 다운로드, 실행, 기존 모델·Studio 값·Firebase·런타임 변경은 수행하지 않았다.

## 1차 출처 목록

- [TRELLIS.2 공식 GitHub](https://github.com/microsoft/trellis.2), [TRELLIS 공식 GitHub](https://github.com/microsoft/TRELLIS), [Pixal3D 공식 GitHub](https://github.com/TencentARC/Pixal3D)
- [Hunyuan3D-2.1 공식 GitHub](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1), [공식 라이선스](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE)
- [Stable Fast 3D 공식 GitHub](https://github.com/Stability-AI/stable-fast-3d), [라이선스](https://github.com/Stability-AI/stable-fast-3d/blob/main/LICENSE.md)
- [OpenAI Shap-E 공식 GitHub](https://github.com/openai/shap-e), [InstantMesh 공식 GitHub](https://github.com/TencentARC/InstantMesh), [OpenLRM 공식 GitHub](https://github.com/3DTopia/OpenLRM)
- [MeshAnything V2 공식 GitHub](https://github.com/buaacyw/MeshAnythingV2), [PartCrafter 공식 GitHub](https://github.com/t1seungy/partcrafter), [Step1X-3D 공식 GitHub](https://github.com/stepfun-ai/Step1X-3D)
- [CraftsMan3D 공식 GitHub](https://github.com/HKUST-SAIL/CraftsMan3D), [TripoSR](https://github.com/VAST-AI-Research/TripoSR), [TripoSG](https://github.com/VAST-AI-Research/TripoSG)
- [Unique3D](https://github.com/AiuniAI/Unique3D), [Wonder3D](https://github.com/xxlong0/Wonder3D), [LGM](https://github.com/3DTopia/LGM), [TripoSplat](https://github.com/VAST-AI-Research/TripoSplat)
- [Blender 5.2 LTS](https://www.blender.org/releases/5-2/), [Blender Python API](https://docs.blender.org/api/current/), [Blender MCP Lab](https://www.blender.org/lab/mcp-server/), [Blockbench](https://github.com/JannisX11/blockbench), [Chisel MCP](https://github.com/EYamanS/chisel), [Roblox Cube/CubePart](https://github.com/Roblox/cube)

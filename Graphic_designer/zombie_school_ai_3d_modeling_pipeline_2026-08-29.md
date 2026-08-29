# Escape! zombie school — AI 저폴리·복셀풍 3D 제작 파이프라인

- 작성일: 2026-08-29
- 역할: Three_Mini / 그래픽 리서치
- 범위: Blender와 AI 3D 생성기를 이용한 **향후** 주인공·좀비·보스·학교 소품 제작 기준. 이 문서는 조사·설계 기록이며, 앱 코드·Firebase·Graphics Studio 값·자산·설치를 변경하지 않는다.
- Kanban: `escape-zombie-school` / `t_7d056c1a`, `t_496faa6d`

## 결론

이 게임에는 AI가 만든 메시를 그대로 배포하는 방식보다, **원본 콘셉트 → AI 메시 초안 → Blender에서 저폴리/복셀풍으로 재구성 → 리그·애니메이션 → GLB 검수 → R3F/Studio 연결** 순서가 적합하다. AI는 빠른 형태 초안 도구이고, 게임용 토폴로지(면 연결 구조), 뼈대, 충돌체, Studio 파츠 계층을 보장하는 모델링 엔진은 아니다.

`보컬 흉내`는 문맥상 **복셀(voxel)풍**을 우선 의미하는 것으로 해석한다. 복셀풍은 큐브 단위의 계단형 실루엣·적은 색·평면 음영을 말한다. 만약 실제 말소리/음성 흉내를 뜻한 것이라면 이는 메시 제작이 아니라 사운드 작업이며, `soundmini` 검토가 별도로 필요하다.

AI 후보의 **품질 상위**와 **이 PC에서 바로 실행할 실무 주력**은 구분한다. TRELLIS.2와 Pixal3D는 품질 상위의 이미지→3D 초안 후보이지만, 이 PC의 6GB VRAM 환경에 맞는 로컬 주력으로 지정하지 않는다. 당장 가능한 주력은 **Blender 5.2 + Blockbench(설치 여부 미확인) + Chisel MCP(학교 소품)**로 복셀/픽셀 저폴리 모델을 직접 만들고, AI 단일 이미지 초안은 별도 고성능 GPU 또는 클라우드에서 생성한 뒤 Blender로 정리하는 방식이다.

## 로컬 환경에 따른 실행 구분

- 감사 기준 환경: Blender **5.2.0**, GTX 1660 **6,144 MiB VRAM**, Python **3.14**.
- Pixel3D/Pixal3D 및 기타 3D AI 패키지는 현재 설치되어 있지 않다. 이 문서는 설치를 지시하거나 수행하지 않는다.
- **즉시 실무 주력:** Blender 5.2에서 캐릭터의 리그·애니메이션·GLB export를 담당하고, Blockbench는 설치되어 있다면 복셀/픽셀 저폴리 캐릭터·무기·교실 소품 제작에 쓴다. Chisel MCP는 반복되는 학교 프랍의 빠른 초안에 쓴다.
- **AI 초안 분리:** TripoSR은 6GB VRAM에서 경계선인 실험 후보다. Pixal3D와 TRELLIS.2는 현 PC에 로컬 설치·실행 대상으로 삼지 않으며, 고성능 GPU/클라우드에서 초안 GLB를 만든 뒤 Blender 정리 단계로 가져온다.
- 이 구분은 AI 결과를 바로 게임에 넣는다는 뜻이 아니다. 어떤 초안도 토폴로지·법선·구멍·리그·Studio 파츠 계약 검수 전에는 제작 자산이 아니다.

## 현재 프로젝트 연결 사실

### 현재 런타임

- `Developer/r3f_prototype`는 React Three Fiber, Three.js, `@react-three/rapier`를 사용한다.
- 조사 시점의 `src` 및 `public`에는 `useGLTF`, `GLTFLoader`, `.glb`, `.gltf` 참조가 없다. 현재 적·보스는 `ZombieMesh.jsx`의 JSX/Three primitive 기반 절차형 메시다.
- 공통 외형 연결은 `StudioTunedGroup.jsx`다. 이 컴포넌트는 루트 변환과 파츠 변환, 재질 색·외곽선·발광 조절을 게임 런타임과 Graphics Studio 미리보기에 같이 적용한다.
- Rapier는 `GameCanvas.jsx`의 고정 60 Hz 물리 단계와 바닥/일부 적의 강체·충돌체에 사용된다. 시각 메시를 생성하거나 정리하는 AI 모델링 도구가 아니다.

### GLB를 도입할 때 지켜야 할 Studio 동등성 계약

새 GLB를 실제로 연결하는 작업은 별도 사용자 지시와 구현 카드가 필요하다. 그때에도 아래 계약을 먼저 고정한다.

1. GLB의 루트 기준점, 단위, 앞 방향, 이름, 자식 순서를 Blender에서 고정한다. 파츠를 export 뒤에 재정렬하거나 임의로 합치지 않는다.
2. `StudioTunedGroup itemId`는 기존 ID를 보존한다. 예: B02는 오직 `stage2-boss-v2`, B03는 `zombie-b03-pe-teacher`, B04는 `zombie-b04-chef`다. 폐기된 B02 경로를 참조하거나 복구하지 않는다.
3. 파츠 선택 키는 안정적인 `studioPartId`를 우선으로 한다. GLB의 `extras.studioPartId` 또는 import 직후의 명시적 매핑으로 `Object3D.userData.studioPartId`가 결정적으로 설정되어야 한다. 이것이 불가하면 현재처럼 숫자 자식 경로에 의존하므로 자식 순서를 영구 잠근다.
4. Blender의 export 기준 변환을 파츠의 base transform으로 한 번만 기록한다. 런타임에서는 `position = base + Studio offset`, `rotation = base + Studio offset rotation`, `scale = base × Studio multiplier`만 사용한다. Studio 값을 base에 구워 넣거나 반대로 base를 Studio 값으로 덮어쓰지 않는다.
5. 미리보기와 게임은 같은 GLB, 같은 파츠 ID/계층, 같은 Firebase revision을 사용해 대조한다. 한쪽에만 독자적인 transform 보정, 재질 교체, fallback 모델을 두지 않는다.
6. 외곽선은 메시 안에 중복으로 구워 넣지 않는다. 현행 Studio의 back-face/stencil 외곽선 재질과 충돌하지 않도록, 본체 메시와 외곽선 처리의 소유권을 하나로 정한다.

이 계약은 `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`의 E01 원칙(기존 item ID, 자식 경로/파츠 ID, base + Studio + animation 합성)을 GLB에도 그대로 적용한 것이다.

## 추천 제작 흐름

| 단계 | 산출물 | 반드시 확인할 것 |
| --- | --- | --- |
| 0. 원본 콘셉트 | 정면·측면·후면/색상표/필수 실루엣 메모 | 실제 모델링은 사용자가 제공·승인한 원본 콘셉트가 있을 때만 시작한다. AI가 기존 게임 캐릭터를 추정해 채우지 않는다. |
| 1. AI 초안 | 중립 포즈의 단일 메시 초안 | 배경 없는 정면 또는 3~4면 참조, T/A 포즈, 독립 소품을 입력한다. 한 이미지 생성물은 숨은 면·손·대칭이 틀릴 수 있음을 전제로 한다. |
| 2. Blender 정리 | 깨끗한 저폴리 base mesh | 비매니폴드, 중복 정점, 뒤집힌 법선, 내부 면, 과밀·삼각형 가는 조각을 제거한다. Decimate는 최종 자동화가 아니라 초안 정리 보조다. |
| 3. 아트 스타일화 | 복셀풍/저폴리 mesh + 팔레트 | 큰 큐브 덩어리로 머리·몸·팔·다리·소품 실루엣을 분리하고 Shade Flat을 기본으로 한다. 1~2색 재질 또는 vertex color를 우선한다. |
| 4. 모듈화 | 파츠 계층과 pivot 표 | 머리, 몸, 좌/우 팔, 좌/우 다리, 장비를 독립 객체/안정 이름으로 두고 관절 중심에 origin을 둔다. 의상/도구는 재사용 가능한 분리 메시다. |
| 5. 리그·애니메이션 | 단일 armature와 게임용 클립 | idle, walk/run, attack, hit, death를 우선한다. 스케일 1, apply transform, 비균일 스케일 없음, root bone 원점 고정으로 export한다. |
| 6. GLB export | `asset.glb` + 메타데이터 | glTF 2.0 Binary, 필요한 메시/armature/animation만 포함, 재질 수와 텍스처 해상도 제한, 이름·순서·base transform 스냅샷을 함께 보관한다. |
| 7. R3F/Studio 검수 | game/preview 동등성 캡처 | 실루엣, 스튜디오 파츠 선택, 수치 Apply, 애니메이션, 외곽선, 모바일 프레임 시간, collision separation을 실제 화면에서 대조한다. |

### 복셀풍을 게임에 맞게 만드는 규칙

- `voxel`은 반드시 정육면체를 수천 개 붙이는 뜻은 아니다. 멀리서 읽히는 큰 블록 실루엣과 평면 법선을 우선하면, 적은 삼각형으로도 복셀 인상을 낼 수 있다.
- 피부/교복/눈/무기는 3~5색 팔레트로 제한하고, 더러운 좀비 분위기는 큰 색 블록·찢어진 옷 실루엣·비대칭 소품으로 만든다. 작은 노이즈 텍스처보다 플레이 중 식별성이 높다.
- 일반 좀비는 같은 몸통과 리그를 공유하고, 머리·교복·가방·무기만 교체한다. 보스는 실루엣 차이를 먼저 만들고 세부면은 나중에 더한다.
- 애니메이션으로 휘는 부위는 손가락/얇은 장식 대신 굵은 블록 파츠를 쓴다. 그러면 스킨 웨이트가 깨져도 읽히는 형태를 유지한다.

## 초기 예산(실측 전 가설)

아래는 목표 예산이지 현행 성능 합격 수치가 아니다. 동일 카메라 거리·동시 등장 수·목표 기기에서 측정해 정한다.

| 자산군 | 권장 삼각형 | 재질/텍스처 | 설계 기준 |
| --- | ---: | --- | --- |
| 일반 적 1종 | 1,000–2,500 | 1개, vertex color 또는 256–512px | 공유 리그·변형 중심, 인스턴싱 친화 |
| 주인공 | 3,000–5,000 | 1–2개, 최대 512px | 근접 카메라·애니메이션 안정성 우선 |
| 보스 | 4,000–8,000 | 최대 2개, 최대 1024px | 실루엣/공격 가독성에만 추가 면 사용 |
| 손에 드는 소품 | 150–1,000 | 1개, 대개 vertex color | 충돌은 단순 primitive로 분리 |
| 배경 소품 | 100–800 | atlas 또는 vertex color | 반복 배치·LOD/공유 geometry 우선 |

## 후보 엔진/도구 평가

| 후보 | 강점 | 품질/용도 | 현 PC 적합성 및 주의점 |
| --- | --- | --- | --- |
| **Blender 5.2 + Blockbench + Chisel MCP** | 수동 복셀/저폴리, 정확한 파츠·리그·GLB 제어 | **현 PC 즉시 실무 주력**. 캐릭터는 Blender, Blockbench는 설치되어 있을 때 복셀/픽셀 저폴리, Chisel MCP는 프랍 초안 | Blockbench 설치 여부는 확인되지 않았으므로 설치된 것으로 가정하지 않는다. AI 생성 품질 비교 대상이 아니라 결정적 게임 자산 제작 경로다. |
| **TRELLIS.2** | 이미지→3D, structured O-Voxel, 메시 변환/감면/UV 도구, MIT | **품질 상위 AI 초안 후보** | GTX 1660 6GB의 로컬 주력으로 부적합하다. 고성능 GPU/클라우드에서 초안을 만든 뒤 Blender로 정리한다. [공식 저장소](https://github.com/microsoft/trellis.2) |
| **Pixal3D** | 단일 이미지의 pixel-aligned 고충실도 메시/PBR, 2026년 신규 | **품질 상위 AI 초안 후보** | 공식 TencentARC 저장소는 MIT이나, 얇은 이중 shell·미세 구멍 보고가 있어 초안 전용이다. 6GB 로컬 대상이 아니라 고성능 GPU/클라우드에서 생성 후 Blender 정리가 필요하다. 모델 가중치·의존성 약관은 별도 확인한다. [공식 저장소](https://github.com/TencentARC/Pixal3D), [thin-shell/hole 이슈](https://github.com/TencentARC/Pixal3D/issues/18) |
| **TripoSR** | 단일 이미지에서 빠른 3D 재구성 | 빠른 실루엣/비율 시안 A/B 비교 | 6GB VRAM에서 **경계선 실험 후보**이며 저폴리 완성본이 아니다. 텍스처·숨은 면·리그는 Blender 후처리가 필수다. [공식 저장소](https://github.com/VAST-AI-Research/TripoSR) |
| **InstantMesh** | 단일 이미지 기반 sparse-view 재구성, 텍스처 맵 export 옵션 | 참조 이미지가 한 장뿐일 때의 원격/고사양 후보 | CUDA/PyTorch 환경 의존성이 크며 UV 추출 시간이 길 수 있다. 현 PC 설치 주력으로 삼지 않는다. [공식 저장소](https://github.com/TencentARC/InstantMesh) |
| **Stable Fast 3D** | 빠른 단일 이미지 메시·UV 언래핑 방향 | 빠른 prototype 비교용 | 현 PC 우선순위가 아니며 라이선스가 MIT가 아니므로 상용 배포 전 모델·출력 약관을 별도 검토한다. [공식 저장소](https://github.com/Stability-AI/stable-fast-3d) |
| **Hunyuan3D 2.1** | 이미지→고품질 PBR 3D, GLB/OBJ export | 기술 검증 참고용 | 공개 저장소여도 라이선스가 오픈소스 보증은 아니다. 2026-08-29 기준 해당 커뮤니티 라이선스는 대한민국을 Territory에서 명시적으로 제외하므로, 한국 프로젝트에서는 사용 후보에서 제외한다. [공식 라이선스](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE) |
| **bRigNet / RigNet Blender add-on** | AI 자동 리그 보조 | 리그 초안/실험용 | 5K triangle 이하 권고 및 GPLv3 조건이 있다. 상용 파이프라인 기본값으로 채택하지 않고 Blender 수동 리그를 정본으로 둔다. [저장소](https://github.com/pKrime/brignet) |

도구의 GitHub 공개 여부와 상용 배포 가능 여부는 다르다. 채택 전에는 (1) 코드, (2) 모델 가중치, (3) 입력 이미지 권리, (4) 산출물 권리, (5) 의존성 라이선스를 각각 기록하고 확인한다.

## 모델링 엔진과 물리 엔진의 경계

AI 3D 모델링 엔진은 정적 메시·재질 초안을 만든다. Rapier는 게임 실행 중 충돌, 이동 제한, 넉백을 계산한다. 서로 교체 관계가 아니다.

- 렌더 메시: GLB의 보이는 저폴리 캐릭터/소품.
- 물리 충돌체: Rapier의 단순 `CuboidCollider`, capsule 등. 보이는 메시의 모든 삼각형을 collision mesh로 쓰지 않는다.
- 리그 애니메이션: 스켈레톤이 시각 메시를 움직인다. 충돌체는 필요한 경우 root/공격 판정만 별도로 추적한다.
- 파괴 연출: 일반 적 다수는 현재 풀 기반 시각 경로를 유지하고, Rapier 객체를 무분별하게 추가하지 않는다. 보스/상호작용 소품처럼 실제 물리가 필요한 대상만 최소 강체를 둔다.

## 새 GLB의 수락 기준

1. 사용자 승인 원본 콘셉트와 제작 로그(입력 이미지·AI 모델/버전·seed·라이선스)를 보존한다.
2. Blender에서 zero/one transform, 오류 없는 법선, 불필요한 내부 면 없음, 명시적 파츠 이름/ID, 하나의 armature를 확인한다.
3. 위 예산은 실제 동시 등장 화면에서 CPU/GPU/메모리 측정으로 확인한다. 측정 없이 성능 통과라고 판단하지 않는다.
4. GLB import 후 Studio preview와 게임에서 item ID, 파츠 선택, base/Studio/animation 합성, 재질 튜닝, 외곽선이 같은 revision으로 동일해야 한다.
5. 충돌체는 렌더 메시와 별도임을 확인하고, 이동·피격·사망·재시작에서 Rapier 핸들 오류가 없는지 확인한다.
6. 타이틀 자산/카메라/조명/오디오와 기존 Studio 수치는 사용자가 명시하지 않는 한 변경하지 않는다.

## 다음 실제 제작 단위

첫 실제 적용은 전 캐릭터 교체가 아니라, 사용자가 원본 콘셉트를 제공한 **일반 적 1종의 vertical slice**가 안전하다. 그 한 종을 Blender→GLB→R3F/Graphics Studio→실제 게임에서 같은 revision으로 확인한 뒤, 결과를 사용자가 승인할 때만 보스·다른 적으로 확장한다.

## 조사 근거

- [Microsoft TRELLIS.2 공식 GitHub](https://github.com/microsoft/trellis.2) — 이미지→3D pipeline, O-Voxel, 메시 후처리 도구, MIT 라이선스.
- [VAST TripoSR 공식 GitHub](https://github.com/VAST-AI-Research/TripoSR) — 단일 이미지 기반 빠른 3D 재구성.
- [TencentARC Pixal3D 공식 GitHub](https://github.com/TencentARC/Pixal3D) — 2026년 공개된 pixel-aligned 이미지→3D, 저장소 MIT 및 설치/low-VRAM 정보.
- [Pixal3D thin-shell/hole 공개 이슈](https://github.com/TencentARC/Pixal3D/issues/18) — thin shell 및 미세 구멍의 후처리 위험 근거.
- [TencentARC InstantMesh 공식 GitHub](https://github.com/TencentARC/InstantMesh) — 단일 이미지 기반 메시 생성과 의존성/텍스처 export 정보.
- [Stability AI Stable Fast 3D 공식 GitHub](https://github.com/Stability-AI/stable-fast-3d) — 빠른 이미지 기반 3D 재구성.
- [Tencent Hunyuan3D 2.1 공식 라이선스](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE) — Territory 및 출력 이용 조건.
- [bRigNet 공식 GitHub](https://github.com/pKrime/brignet) — Blender 자동 리그 보조와 5K triangle/GPLv3 주의.

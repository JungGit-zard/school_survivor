# 3D 런타임 리소스 용량 감사 — 2026-07-25

## 범위와 결론

이 게임의 production 3D는 외부 glTF/FBX/OBJ 모델 파일이 아니라 Three.js의 절차적 geometry와 material 조합으로 구현된다. 따라서 “모델 파일 용량”은 **0 B**이며, 실제 런타임 부담은 texture decode, geometry/material 생성, instanced buffer, shader compile과 정적 프롭 mesh mount에서 나온다.

## 파일 기반 용량

| 분류 | 수량/용량 | 해석 |
| --- | ---: | --- |
| 외부 mesh 파일 (`.glb`, `.gltf`, `.fbx`, `.obj`, `.dae`, `.blend`, `.usdz`) | 0개, **0 B** | 외부 3D 모델 payload 없음 |
| 3D runtime texture | 9개, **301,681 B** | floor 3, boss face 4, Matilda face 1, spawn smoke 1 |
| RGBA8 decoded base 추정 | 약 **19.42 MiB** | 이미지 해상도 기준의 이론적 base; 모두 동시 상주한다고 단정하지 않음 |
| RGBA8 mipmap 이론 상한 | 약 **25.90 MiB** | mipmap 생성·지원·실제 상주 조건에 따라 달라짐 |
| procedural 3D production source | 48 files, **520,436 B** | JavaScript/JSX 코드 크기이며 모델 binary payload가 아님 |
| `vendor-three` build chunk | raw **2,795,983 B**, gzip-9 약 **0.91 MiB** | Three.js 엔진 코드이므로 모델 용량에서 제외 |

runtime texture 9개 raw file 합계는 다음과 같다: stage floor/end-wall 3개, B01/B02/B03/B04 face 4개, Matilda face 1개, spawn smoke 1개. 이 합계는 압축 전송 파일 크기가 아니라 repository file bytes다.

## 타이틀의 선행 캐시 범위

타이틀은 B01/B02/B03와 Matilda 모델을 직접 렌더한다 (`src/components/TitleScene3D.jsx:300-320, 603-611`). 따라서 이들이 쓰는 이미지의 네트워크 요청과 CPU image decode는 title 방문 중 브라우저 cache에 존재할 가능성이 높다.

그러나 게임 진입의 새 Game Canvas/WebGL context는 타이틀 Canvas와 GPU texture upload 및 shader program state를 공유하지 않는다. 타이틀에 없는 B04 face는 Stage 4 보스 첫 등장 때 별도 decode/upload/compile 위험이 있다. 이 문서는 가능성과 구조를 기록한 것이며 실제 cache hit와 GPU memory는 기기 계측으로 확인해야 한다.

## 런타임 시각 용량 및 프롭 밀도

ZombieInstanceLayer는 200 슬롯 InstancedMesh를 사용한다. 33 parts body+outline, 6 planes, 12 cue mesh 기준 matrix buffer는 약 **933,888 B (912 KiB)**, alpha attribute는 **4,800 B**, all instance color 생성 시 총 buffer는 약 **1,020,192 B (996.28 KiB)**로 추정된다. geometry, material, texture, shader, driver allocation은 이 추정에 포함하지 않는다.

Stage 1은 desk 18, chair 12, unconscious student 30으로 총 60 placement다. 코드상 StudentBox 20×2×30=1,200, DeskBox 13×2×18=468, ChairBox 19×2×12=456으로 약 2,124 mesh node가 stage mount에서 생성된다. 학생 8×30, 책상 6×18, 의자 6×12의 `toonMat/outlineMat` 기준 material object는 약 420개다. 이는 정적 코드 구조 산출이며 실제 visible draw call이나 GPU memory의 동일값은 아니다.

## 시각 리소스 위험과 권고

`ClassroomFloor.jsx:108-143`은 직접 TextureLoader를 사용하고 Stage 2 end-wall texture도 stageId와 무관하게 만든다. explicit preload/cache/cleanup이 부족하며, stage mount 때 floor material/texture와 shader가 준비될 수 있다. Stage entry 전 prefetch와 hidden renderer warmup, type별 prop geometry/material 공유 및 필요 시 InstancedMesh 전환은 후속 검토 대상이다.

이 감사는 리소스 조사 기록이며 그래픽 변경이나 모델링 적용을 수행하지 않았다.

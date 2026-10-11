# 3D 모델링 워크플로우 리마인더

- 작성일: 2026-10-11
- 작성자/소유: Three_Mini / Graphic_designer
- 목적: 사용자가 최신 대화에서 바로잡은 3D 모델링 방법론을 나중에 이전 메모와 합칠 수 있도록 정확히 보존한다.
- 범위: 문서화 전용. 이 문서는 새 모델 제작, 런타임 적용, Firebase 변경, Graphics Studio 변경, 자산 교체, Git 커밋/푸시를 수행했다는 뜻이 아니다.

## 1. 지금 확정된 최신 사용자 지시

원문 인용:

> 필요한건 로우메시, 토폴로지를 원화를 대고 똑같이 만든다음 블렌더에 가져가서 마무리한는 거야.

이 지시가 이번 문서의 최우선 모델링 순서다.

정확한 해석:

1. 원화를 기준으로 먼저 로우메시와 토폴로지를 만든다.
2. Blender로 가져가기 전에 실루엣, 비율, 부위별 볼륨, 큰 형태가 원화와 맞아야 한다.
3. Blender는 원화 닮음을 처음부터 새로 만드는 주 작업장이 아니라, 이미 원화 기준으로 맞춘 로우메시를 마무리·정리·검수하는 단계다.
4. 절대로 “대충 안 닮은 초안을 만든 뒤 Blender에서 주요 닮음을 만든다”로 설명하지 않는다.

## 2. 빠른 리마인더 문단

필요한 것은 원화를 옆에만 띄우는 것이 아니라, 원화를 기준으로 로우메시와 토폴로지를 먼저 똑같이 맞추는 것이다. Blender에 가져가기 전 단계에서 캐릭터의 실루엣, 비율, 머리·몸·팔·다리·옷·헤어의 부피와 위치가 원화와 맞아야 한다. Blender는 그 뒤의 마무리, 정리, UV/재질/검수, 필요한 보정 단계다. 안 닮은 초안을 Blender에서 처음 닮게 만드는 방식으로 말하면 안 된다.

저장 위치:

`F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/3D_MODELING_WORKFLOW.md`

## 3. 현재 지시로 확정된 작업 순서

### 3.1 원화 기준 로우메시·토폴로지 제작

- 원화의 정면, 측면, 후면 또는 제공된 시점을 기준으로 키, 중심축, 발바닥 기준선, 머리 크기, 어깨/허리/골반 폭, 팔·다리 길이와 굵기를 먼저 맞춘다.
- 실루엣을 만드는 큰 엣지와 링을 우선 배치한다.
- 머리, 몸통, 골반, 위팔, 아래팔, 손, 허벅지, 종아리, 발, 의상, 헤어, 소품은 각각 의미 있는 볼륨과 경계를 가져야 한다.
- 단순히 삼각형 수만 낮은 상태, 상자나 절삭 도형을 붙인 상태, 한 각도에서만 그럴듯한 파편 조합은 원화 기준 로우메시가 아니다.

### 3.2 Blender 가져가기 전 확인

Blender 마무리로 넘기기 전 최소 확인:

- 원화와 정면 실루엣이 맞는가.
- 원화 또는 제공된 자료 기준으로 측면 깊이와 주요 부피가 설명 가능한가.
- 머리/몸/헤어/의상/소품의 큰 덩어리 위치가 맞는가.
- 관절이 필요한 부위에 의미 있는 중심과 접합 구조가 있는가.
- 삭제해도 외형·변형·UV에 영향 없는 불필요한 엣지와 면이 없는가.
- 얼굴과 두상은 헤어를 올리기 전에 온전한 머리 볼륨을 갖는가.

### 3.3 Blender 마무리 단계

Blender 단계의 역할:

- 축, 스케일, 원점, 이름, 계층 정리.
- 원화 오버레이/직교 뷰 비교로 마지막 형태 보정.
- UV, 텍스처, 재질, 법선, toon 표현 준비.
- 관절/웨이트/리깅 또는 파츠 회전축 검수.
- 불필요한 내부 면, 작은 면 군집, 길고 얇은 삼각형 정리.
- GLB/FBX 등 내보내기 후 구조와 렌더 검증.

Blender에서 처음으로 주요 닮음을 만드는 것이 아니라, 원화 기준 로우메시를 마감하는 단계로 취급한다.

## 4. 토폴로지와 엣지 원칙

엣지는 목적이 있어야 한다. 목적 없는 엣지는 삭제 후보이다.

허용되는 목적:

- 실루엣을 만드는 엣지.
- 변형이 일어나는 관절 또는 굽힘 경계.
- UV/텍스처/재질 경계.
- toon 명암 또는 큰 평면 전환.
- 의상, 헤어, 얼굴, 소품의 읽힘을 만드는 형태 경계.

주의:

- 균일함은 모든 삼각형을 같은 크기로 만든다는 뜻이 아니다.
- 넓고 평평한 곳은 적은 면을 쓰고, 관절·굴곡·실루엣에는 필요한 면을 쓴다.
- Decimate는 설계 대신이 아니라 보조 수단이다.
- 쓸모없는 베벨 띠, 가늘고 긴 삼각형, 보이지 않는 내부 면, 작은 면 군집은 피한다.

## 5. 머리, 헤어, 부위 독립성

### 머리와 헤어

- 헤어보다 먼저 온전한 머리/두상 볼륨을 만든다.
- 헤어는 두상을 대체하는 빈 껍데기가 아니라 두상 위에 얹히는 편집 가능한 층이다.
- 헤어를 숨겨도 머리 형태가 성립해야 한다.
- 앞머리, 옆머리, 뒷머리, 정수리 덩어리는 원화의 곡률과 헤어라인을 기준으로 맞춘다.

### 부위 독립성과 제어

- 독립성은 반드시 많은 별도 메시로 쪼개라는 뜻이 아니다.
- 하나의 연결된 스킨 메시여도 토폴로지, 관절 중심, 웨이트, 제어가 명확하면 된다.
- 별도 파츠 방식이면 회전축과 접합이 동작 중에도 유지되어야 한다.
- 중요한 것은 “의미 있는 관절 중심과 제어 가능한 구조”이지 “무조건 많은 분리 메시”가 아니다.

## 6. 얼굴 UV와 과거 PLAYER 문서의 범위

과거 PLAYER 문서의 얼굴 원칙:

- 얼굴은 온전한 두상 위에 실제 UV/직접 head texture로 표현하는 선호가 있었다.
- 별도 눈·눈썹·코·입·홍조 메시나 데칼 평면으로 대체하지 않는 방향이 그 작업에서 중요했다.

단, 이 원칙은 당시 PLAYER 작업 범위의 지시와 학습이다. 새 대상 캐릭터, 새 원화, 새 예산이 없는 현재 대화에서 모든 모델에 무조건 적용되는 새 보편 규칙으로 확대하지 않는다.

## 7. 참고 자료와 확인된 수치

### FBX reference viewer

참고 viewer:

`C:/Users/admin/AppData/Local/hermes/output/lowpoly-fbx-references/viewer.html`

관찰된 수치:

| 파일 | 삼각형 수 | 메시 수 | 메모 |
| --- | ---: | ---: | --- |
| BaseCharacter.fbx | 2,104 | 1 mesh | 기본 chibi 저폴리 인체 참고 |
| Casual_Female.fbx | 6,614 | 1 mesh | 헤어·의상 실루엣 증가 참고 |
| Kimono_Female.fbx | 9,228 | 1 mesh | 긴 의상·헤어·큰 실루엣 참고 |

주의:

- viewer는 정적 표시용이며 원본 텍스처와 애니메이션 재생을 제외한다.
- 따라서 viewer 화면이 “원본 자산에 텍스처/애니메이션이 없다”는 증거는 아니다.
- 위 자료는 비율, 면 분포, 단일 skinned mesh 참고 자료이지, 우리 캐릭터 대체용 승인 자산이 아니다.

### prior collection

기존 학습 문서 묶음:

- `C:/Users/admin/AppData/Local/hermes/output/lowpoly-learning-document-20261010/LOWPOLY_LEARNING_KO.md`
- `C:/Users/admin/AppData/Local/hermes/output/lowpoly-learning-document-20261010/FILE_INDEX.md`
- 해당 폴더의 ZIP/자료 묶음

기억할 점:

- 과거 PLAYER `<=1000 triangles` 목표는 당시 작업 특화 목표다.
- 지금 대화에서는 새 대상 캐릭터, 새 원화, 새 삼각형 예산이 지정되지 않았다.
- 그러므로 `<=1000`을 새 universal mandate로 적지 않는다.

## 8. Graphics Studio / runtime 통합 경계

통합 문서:

`F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`

통합 원칙:

- Studio 연결은 numeric child path와 base transform 규칙을 따른다.
- 모델링 요청을 실제 구현할 때는 사용자 지시에 따라 Graphics Studio에도 함께 적용한다.
- 최초 position/scale/rotation을 base로 저장하고, Studio 입력값은 base에 더하거나 곱해 적용한다.
- semantic `id:*` 추측 경로로 런타임 대상을 찾는 방식은 금지된 레거시 위험이다.
- Graphics Studio 입력값 저장은 Firebase-only 원칙을 따른다.
- 그래픽 표시 여부는 Firebase readiness gate로 숨기지 않는다는 현재 F repo 절대 규칙과, Studio 값은 Firebase 정본만 사용한다는 정책이 함께 존재한다. 작업 시 최신 정책 충돌 여부를 반드시 확인하고 Advisor에게 보고한다.

이 문서 작업에서는 runtime, asset, Firebase, Graphics Studio 파일을 수정하지 않았다.

## 9. 현재 미확정/알 수 없는 것

현재 대화에서 확정되지 않은 항목:

- 새 대상 캐릭터.
- 새 원화 파일.
- 새 삼각형 예산.
- 새 리깅/애니메이션 요구사항.
- 숨겨진 후면/측면/의상 내부 구조.
- 게임 런타임 통합 일정.

따라서 이 문서는 “방법론 저장”이며, 새 모델 제작 착수 문서가 아니다.

## 10. 금지 사항

- 원화와 다르게 만든 rough mesh를 “Blender에서 나중에 닮게 만들 예정”이라고 정본 순서처럼 설명하지 않는다.
- 과거 PLAYER 예산을 새 universal target으로 말하지 않는다.
- viewer의 정적 표시 제한을 자산 자체의 애니메이션/텍스처 부재 증거로 말하지 않는다.
- 모델 변경, 런타임 적용, Firebase 변경, Graphics Studio 입력 변경을 이 문서 작업에 포함했다고 말하지 않는다.
- `GraphicsStudio.jsx`는 Three_Mini 금지 파일이므로 수정하지 않는다.
- Three_Mini는 git commit/push/checkout을 하지 않는다.

## 11. 검증 메모

이 문서는 다음 자료를 읽고 작성했다.

- Three_Mini mandatory startup context 전체.
- `Developer/agent_room/persistent_subagent_lounge_routing_2026-08-29.md`
- `Developer/lowpoly_player_b01_b04_faceted_geometry_implementation_2026-08-23.md`
- Three_Mini TOML `[paths]`, `[learning]`
- Three_Mini knowledge base
- 관련 iteration: `20261010_222849_t_20ae93dc_lowpoly_fbx_reference_study.md`
- 관련 iteration: `20261011_t_efe49b7c_player_blender_correction_chrome_verified.md`
- `LOWPOLY_LEARNING_KO.md`
- `FILE_INDEX.md` 주요 참조 구간
- `ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md`

완료 상태:

- 새 모델 제작 없음.
- 게임 런타임 변경 없음.
- Firebase 변경 없음.
- Git commit/push 없음.

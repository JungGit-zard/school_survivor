# 빛나는 돌 — 승인된 표면 광택 시안

Terry가 Telegram에서 긍정 평가 후 탈출좀비학교 리소스로 보관하라고 명시한 산출물입니다.

- glowing-stone.png: 광택 적용 스틸 이미지
- stone-comparison.png: 기본 돌 / 광택 적용 비교 이미지
- glowing-stone.mp4: 카메라 고정 상태의 빛 흐름 및 시점 회전 시연 영상 (720 × 540, 24fps, 120프레임)
- render_stone.py: 이 산출물을 재생성하는 Python 소스. numpy, Pillow, opencv-python 필요. 파일이 있는 폴더에 결과를 출력하므로 재생성 시 별도 작업 폴더에 복사해서 실행합니다.
- manifest.json: 보관 파일의 SHA-256과 크기

## 표현과 범위
은청색 광택과 금빛 포인트. 절차적 스크롤 패턴, 시점 의존 반사 조회, 가산 색 합성, 약한 표면 블룸을 조합한 소프트웨어 렌더 시안입니다. 주변 입자는 없습니다.

씰온라인 클라이언트 리소스를 추출하거나 원본 셰이더를 복제한 결과가 아닙니다. 3ds Max/GLB 모델, Three.js용 셰이더, 무기 강화 단계별 프리셋을 제공하는 런타임 에셋이 아닙니다.

이번 요청은 리소스 보관만 수행했습니다. 게임 코드, Graphics Studio, Firebase, 타이틀, 빌드, 배포는 변경하지 않았습니다. Git commit/push는 하지 않았습니다.

## 추가: 마우스 조작 3D 보기 및 제작 방법론

- `glowing-stone-viewer.html`: 외부 다운로드 없이 Chrome/Edge에서 파일을 열어 사용하는 실제 삼각형 3D 뷰어. 왼쪽 드래그 회전, 휠 확대, 빛 흐름 정지, 광택 비교 및 PNG 저장.
- 방법론 정본: `Developer/agent_room/glowing_stone_methodology.md` (저장소 루트 기준). 원본 제작 코드를 부록에 그대로 포함.
- 재생성 소스: `Developer/prototypes/glowing_stone/`.
- 검증 기록: `Quaility_Assurance/glowing_stone_viewer/verification.json`.
- 기존 PNG/MP4/원본 코드와 기존 manifest는 그대로 보존. 새 뷰어는 게임/Studio/Firebase와 연결하지 않음.

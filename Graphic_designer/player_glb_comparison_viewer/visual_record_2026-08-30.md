# 독립 GLB 비교 뷰어 UI 기록 (uimini, 2026-08-30)

## 범위

- 산출 위치: `Graphic_designer/player_glb_comparison_viewer/`
- 생성 파일:
  - `index.html`
  - `styles.css`
- 의도적으로 제외한 범위:
  - `Developer/r3f_prototype/` 미수정
  - 게임 코드, Vite 설정, 테스트, GLB, Three.js/vendor 파일 미수정
  - `viewer.js` 미생성/미수정 — threemini 통합자가 연결할 hook만 HTML에 배치

## UI 구성

- 전체 화면 3D 표시 호스트: `#viewer-canvas`
- 접근성:
  - `#viewer-canvas`에 `aria-label`과 키보드 focus용 `tabindex="0"`
  - 상태 영역 `#viewer-status`는 `role="status"`, `aria-live="polite"`
  - 오류 영역 `#viewer-error`는 `role="alert"`, `aria-live="assertive"`, 기본 `hidden`
  - 보기 초기화 버튼 `#reset-view`는 명확한 `aria-label` 포함
- 조작 안내:
  - 마우스 왼쪽 드래그: 회전
  - 휠 스크롤: 확대/축소
  - 마우스 오른쪽 드래그: 화면 이동
  - 방향키 / Shift+방향키는 통합자가 제공할 때의 보조 조작으로 표기
- 반응형:
  - 데스크톱: 캔버스 + 우측 안내 패널
  - 820px 이하: 캔버스 상단, 안내 패널 하단 단일 컬럼
  - 520px 이하: 버튼 100% 폭, 안내 항목 단일 컬럼, safe-area padding 유지

## threemini 연동 hook

- import map placeholder:
  - `three` → `./vendor/three.module.js`
  - `three/addons/` → `./vendor/`
- module script placeholder:
  - `./viewer.js`
- 통합자는 기존/별도 뷰어 로더 구현을 이 hook에 맞춰 연결하면 된다.

## 검증 기준

- HTML 기본 구조 파싱 통과
- 필수 ID 존재 확인:
  - `viewer-canvas`
  - `reset-view`
  - `viewer-status`
  - `viewer-error`
- CSS 중괄호 균형 확인
- `git status --short --branch`로 변경 범위 재확인

# 무기 3종 외형 검증 — 2026-10-05

- Kanban: `t_bb95cd58`, 구현 `threemini`, 최종 diff/렌더 검수 Advisor.
- 텀블러: 하늘색 몸통, 민트 손잡이·빨대. 기존 형상 유지.
- 상어미사일: 둥근 파란 몸통·흰 배, 양쪽 큰 눈·반사광, 열린 입·작은 이빨·분홍 혀, 삼각 지느러미.
- 우산: 보라·라일락·분홍 패널, 흰 꽃·하늘색 물방울. 기존 폭발 색상 유지.

## 검증

`npm test -- src/components/Weapons/Tumbler.test.jsx src/lib/sharkMissileRuntime.test.js src/lib/sharkMissileTargeting.test.js`: 3파일, **23/23 통과**. pretest의 브랜치·B02·대사·Studio/game 연결 검사 통과. `git diff --check` 통과.

추가 실행한 `GraphicsStudioPreview.test.js`는 19/20 통과. 실패 1건은 변경되지 않은 `TitleScene3D.jsx`에서 `playerVisualReady ?` 문자열을 요구하는 기존 검사다. 해당 두 파일의 HEAD 대비 diff가 없음을 확인했다. 타이틀 코드는 수정하지 않았다.

게임과 Studio가 함께 쓰는 실제 모델 exports를 메모리 전용 Vite 미리보기에서 렌더했다. 원격 접속을 CSP로 막았고 브라우저 resource 기록의 외부 요청은 0건이었다. Firebase 정본·revision에 대한 읽기/쓰기나 실제 게임 계정 테스트는 수행하지 않았다. 테스트용 영구 값, 앱 라우트, 소스 파일은 만들지 않았다. 사용한 미리보기 서버 PID 22472와 전용 브라우저 세션은 종료했다. 5173 서버는 조작하지 않았다.

- `models-final.png`: 아이콘과 변경 모델을 나란히 비교.
- `models-front.png`: 정면 눈·입·지느러미, 우산 손잡이 확인.
- `models-game-angle.png`: 반대편 45도 시점 확인.
- 기존 자식 순서: 텀블러 7개 mesh 유지, 상어 기존 18개 자식 유형·순서 유지, 우산 기존 13개 mesh 뒤에만 장식 추가.
- 동일한 `StudioTunedGroup` ID와 기존 공유 모델 import 유지. 실제 계정의 저장된 색상/변형값을 적용한 화면은 이번 격리 미리보기 검증 범위가 아니다.

## 공격 코드 보존 증거

HEAD와 작업 파일에서 다음 시작점 이후의 전체 문자열을 비교해 동일함을 확인했다. SHA-256은 줄바꿈을 LF로 통일한 해당 구간의 값이다.

| 파일 / 시작점 | SHA-256 |
| --- | --- |
| Tumbler.jsx / `export function TumblerOrbit` | `d27a80c6f1cac07470acdfa9304a40671accf6606d4c2548e9c068f52c36b689` |
| SharkMissile.jsx / `export function FlameTrail` | `869db9fce9364037a6707f594025607b350684d4cbbddde60b5414cd2a9b8c8d` |
| UmbrellaGuard.jsx / `function UmbrellaExplosion` | `4961e7eccb05d1bd0c7e45904c46d58cc1f9819b1cc1d02c1eb8cedde5bb8a3f` |

Worker 실행 시 이전 D: 경로가 없어 중단되어, 외부 threemini SOUL.md의 경로 세 곳만 현재 F: 체크아웃으로 수정했다. 필독 절차와 GraphicsStudio.jsx 수정 금지는 유지했다.

# 타이틀 3D 장면 집결 검증 (2026-07-14)

## 자동 검증

- 테스트 우선 실패 확인: Canvas에 `title-intro-scene`이 없어 관련 테스트 1개가 예상대로 실패했다.
- WebGL 폭 회귀 테스트 우선 실패 확인: 장면 keyframe에 scale이 남아 있어 관련 테스트가 예상대로 실패했다.
- 집중 테스트: `TitleScreen.settings.test.jsx`, `TitleScene3D.test.jsx` — 19개 통과.
- 전체 테스트: 111개 파일, 797개 테스트 통과.
- 프로덕션 빌드 통과. 기존 동적 import 및 청크 크기 경고만 유지된다.
- 재사용성·정확성·테스트·유지보수성·효율성·프로젝트 규칙 검토 결과 추가 수정이 필요한 결함은 없었다.

## 브라우저 검증

- 390×844에서 `reducedEffects=true`를 저장한 상태로 실행했다.
- 글자 7개, 좀비 이모지 1개, 3D 장면 집결 레이어 1개가 모두 활성화됨을 확인했다.
- 영상 프레임에서 3D 장면이 화면 밖에 있다가 좀비 정착 뒤 하단에서 들어와 최종 구도에 정착함을 확인했다.
- 게임 시작 버튼은 전 과정에서 노출되고, 브라우저 오류는 없었다.
- Canvas 최종 계산 폭 390px / viewport 390px, 최종 transform `none`을 확인했다.

## 증거

- `Quaility_Assurance/title-scene-gather-390x844-2026-07-14.webm`
- `Quaility_Assurance/title-scene-gather-final-390x844-2026-07-14.png`

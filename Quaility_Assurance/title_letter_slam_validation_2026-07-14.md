# 타이틀 글자 충돌 연출 검증 (2026-07-14)

## 자동 검증

- 테스트 우선: 구현 전 신규 타이틀 모션 테스트 2건이 예상대로 실패하는 것을 확인했다.
- 집중 테스트: `TitleScreen.settings.test.jsx`, `TitleScreen.bgm.test.jsx` 13개 통과.
- 전체 Vitest: 108개 파일, 754개 테스트 통과.
- `npm run build` 통과. 기존 대형 청크·동적 import 경고 외 신규 오류 없음.
- 프로젝트에 별도 lint/typecheck 스크립트는 없다.

## 브라우저 검증

- 375×812, 390×844, 497×761에서 최종 제목이 `탈출!` / `좀비학교 🧟‍♀️` 두 줄로 유지된다.
- 390×844에서 0.9초 글자 충돌 중간 프레임과 2.75초 좀비 진입 중간 프레임을 확인했다.
- 375px에서 제목 `scrollWidth` 241px, 497px에서 297px로 화면 폭 안에 들어온다.
- 세 화면에서 부제와 게임 시작 버튼이 보이며 인트로 중에도 버튼은 존재하고 조작 가능하다.
- 저장된 `reducedEffects: true`에서 글자 모션 클래스 0개, 좀비 모션 클래스 0개, 최종 글자 7개와 이모지 1개가 즉시 표시된다.
- 브라우저의 `prefers-reduced-motion: reduce` 에뮬레이션에서 글자와 이모지의 계산된 `animation-name`이 모두 `none`이다.
- 게임 시작 버튼 중심 좌표의 `elementFromPoint` 결과가 실제 버튼과 일치해 타이틀 레이어가 포인터 입력을 가리지 않는다.
- 브라우저 런타임 오류 없음.

## 최종 리뷰

- 간소화 검토: 재사용 0건, 품질 1건, 효율 2건 반영. 테스트 전용 DOM 상태 제거, 동적 필터 제거, 종료 후 합성 상태 정리를 적용했다.
- 코드 리뷰: 테스트 지적 2건을 반영하고 재검토 결과 findings 0건.
- 정확성, 프로젝트 규칙, 공격적 실패 시나리오, agent-native 검토에서 실행 가능한 findings 없음.
- `docs/solutions/`에는 이번 타이틀 CSS 모션에 직접 적용할 기존 학습 문서가 없었다.

## 증거 파일

- `Quaility_Assurance/title-letter-slam-390x844-2026-07-14.webm`
- `Quaility_Assurance/title-letter-slam-mid-390x844-2026-07-14.png`
- `Quaility_Assurance/title-zombie-scurry-visible-390x844-2026-07-14.png`
- `Quaility_Assurance/title-letter-slam-final-375x812-2026-07-14.png`
- `Quaility_Assurance/title-letter-slam-final-390x844-2026-07-14.png`
- `Quaility_Assurance/title-letter-slam-final-497x761-2026-07-14.png`

## 잔여 위험

- 실제 저사양 Android 기기의 장시간 프레임 안정성은 자동 브라우저 검증만으로 보장하지 않는다.

# Graphics Studio 플레이어 파츠 Apply 검증

- 관련 단위·회귀 테스트: 4개 파일, 72개 통과
- 추가 검증: 최초 애니메이션 중 Apply, 100프레임 A→B→A 변경, 위치·회전·크기 전 축 비누적, 튜닝 제거 원복
- Studio 즉시 전송 관련 기존 테스트를 포함한 추가 묶음: 3개 파일, 53개 통과
- Vite 프로덕션 컴파일: 성공
- 정식 `npm run build`는 이번 수정과 무관한 기존 B02 포렌식 문서가 프로젝트 레거시 금지 게이트에 걸려 중단됐다.
- 수동 확인 뒤 Studio 저장값은 플레이어 23개, 다른 항목 0개, 원문 길이 7847바이트, 검사 파츠 Position Y `-0.08`로 복구했다.
- 실제 R3F Studio/runtime 트리의 17개 고유 deep target은 파츠 객체·base·최종 변형이 모두 일치했다.
- 게임 카메라와 맞춘 Player Studio 프레임을 포함한 관련 테스트는 4개 파일, 73개가 통과했다.
- Apply 직후 일반 `BackSide` 채움 재질이 검정 외곽선으로 오인되지 않는 테스트와 타이틀의 `outline → tuning/part Apply → outline 재적용` 순서 회귀 테스트를 추가했다.
- 최종 관련 테스트: 4개 파일, 75개 통과.
- 최종 Vite 프로덕션 컴파일: 250개 모듈 변환 및 번들 생성 성공.
- 오른팔 복구 revision 3 검증: 전체 23키 유지, 대상 직접 파츠 2개·그룹 2개 중립값, revision 1/2 저장소 승격, 비플레이어 튜닝 보존.
- `graphicsStudioConfig.test.js` 36개 통과, 관련 5개 파일 묶음 111개 통과, Vite 프로덕션 빌드 성공.
- 실제 Chrome localStorage LevelDB에서 revision 3 payload의 오른팔 대상 4개가 위치 0·회전 0·크기 1로 기록된 것을 확인했다.
- Studio authoritative 저장 규칙 검증: 유효한 payload는 오래된/잘못된 revision 표식이 있어도 seed가 덮어쓰지 않으며, 비플레이어 항목과 커스텀 파츠를 그대로 보존한다.
- 잘못 배포된 revision 4 칼라 `-0.28`은 Studio 값 `-0.15`로 1회 복원되며 나머지 22개 플레이어 항목은 동일함을 비교한다.
- 분리 실행 기준 관련 5개 파일, 총 113개 테스트 통과.

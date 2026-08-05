# Stage 1 반장 전용 학생 모델

- 대상 배치: `stage1-student-south-01`
- 모델 타입: `classPresidentStudent`
- 형상: 승인된 `UnconsciousStudentVisual`을 재사용해 기존 쓰러진 학생과 자세·비율을 동일하게 유지한다.
- 교복색: 전용 모델 내부에서 `#c23535`로 고정한다. Firebase 배치 `props`에는 색상을 저장하지 않는다.
- Studio: `stage-object-class-president-student`라는 독립 `StudioTunedGroup`과 Graphics Studio 카탈로그 항목을 사용한다. 일반 학생 Studio 튜닝을 중첩하지 않는다.
- 호환성: 기존 Firebase 오버라이드가 같은 배치 ID를 `unconsciousStudent`와 이전 `uniformColor`로 보내도 위치·회전·크기·누운 자세(`props.variant`)를 유지한 채 전용 모델 타입으로 변환한다.
- 충돌체: 추가하지 않아 기존 학생과 동일하게 통과 가능한 상태를 유지한다.

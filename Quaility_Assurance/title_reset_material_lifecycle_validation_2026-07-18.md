# 타이틀 Reset 머티리얼 수명주기 검증

## 대상

- `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
- `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`

## 자동 검증

- 타이틀 전용 clone 적용
- Reset 전 타이틀 clone 해제
- Studio-owned source material 생존
- 기본값 복원 후 원래 채움색 유지
- 동일 순서 3회 반복
- hydrate에 의한 source material 교체
- 교체된 색과 stencil 재적용

결과: `TitleScene3D.test.jsx` 25개 통과.

프로덕션 Vite 빌드도 통과했다. 브라우저 실제 화면은 서버가 최신 `dist`를 제공하는 상태에서 새로고침 후 확인 대상이다.

## 비관련 실패

`StudioTunedGroup.test.jsx` 전체를 함께 실행하면 mount 테스트 2개가 Firebase Studio hydrate 준비 없이 `loadStudioTunings`를 호출해 실패한다. 이번 수정은 해당 Firebase 준비 상태나 저장 경로를 변경하지 않았다.

# 타이틀 Reset 머티리얼 수명주기 수정

## 증상

Graphics Studio Reset 또는 원격 상태 hydrate 뒤 타이틀 캐릭터의 채움색이 사라지고 검정 실루엣처럼 보였다.

## 원인

`TitleCharacterOutlineGroup`은 Studio 변경 이벤트를 받으면 다음 프레임 재적용 표시만 남겼다. 타이틀 전용 stencil material clone은 mesh에 계속 붙어 있었다.

그 상태에서 `StudioTunedGroup`이 새 tuning을 적용하면 타이틀 clone 뒤에 보관된 Studio-owned source material을 교체 대상으로 판단해 폐기할 수 있었다. 이후 타이틀 cleanup이 폐기된 source material을 mesh에 복원하면서 검정 렌더링이 발생했다.

## 수정

- Studio tuning/storage 이벤트를 받는 즉시 `disposeTitleCharacterOutlines`를 실행한다.
- mesh를 살아 있는 Studio source material로 먼저 복원한다.
- Studio Reset/hydrate가 source에 적용된 다음 다음 frame에서 타이틀 stencil clone을 다시 생성한다.
- Firebase 저장·읽기 경로와 공용 `PlayerMesh` 숫자 파트 경로는 변경하지 않았다.

## 검증

- `TitleScene3D.test.jsx`: 25개 통과
- 신규 회귀 범위: Reset 3회 반복, hydrate material 교체, source material 미폐기, 채움색 및 stencil 재적용
- 프로덕션 빌드 통과
- 별도 `StudioTunedGroup.test.jsx`의 기존 mount 테스트 2개는 Firebase hydrate 준비 없이 실행되어 실패했으며 이번 수정 파일과 무관하다.
